import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { isPlaceholderUrl, isValidWebPhotoUrl } from '../utils/placeholder';
import { 
  optimizeImageToWebP, 
  generateThumbnailWebP, 
  validateImageFile, 
  OptimizationResult,
  ThumbnailResult,
  MAX_IMAGE_FILE_SIZE,
  DEFAULT_WEBP_QUALITY,
  DEFAULT_THUMBNAIL_SIZE
} from './imageOptimizationService';

/**
 * Garante a preservação total de fotos existentes no banco de dados e links externos anexados.
 * Nenhuma foto válida existente é descartada, e novas URLs são mescladas sem duplicatas.
 */
export function preserveExistingImages(existingImages: any[], newUrls: (string | null | undefined)[]): string[] {
  const result: string[] = [];

  const addUrl = (url: any) => {
    if (typeof url === 'string' && isValidWebPhotoUrl(url)) {
      const clean = url.trim();
      if (!result.includes(clean)) {
        result.push(clean);
      }
    }
  };

  if (Array.isArray(existingImages)) {
    existingImages.forEach(addUrl);
  }

  if (Array.isArray(newUrls)) {
    newUrls.forEach(addUrl);
  }

  return result;
}

// Cache em memória do cliente Supabase para reutilização
let supabaseClientInstance: SupabaseClient | null = null;
let cachedConfigKey = '';

export interface SupabaseStorageConfig {
  url: string;
  anonKey: string;
  bucket: string;
}

/**
 * Obtém a configuração atual do Supabase a partir das variáveis de ambiente (.env) ou localStorage.
 */
export function getSupabaseConfig(): SupabaseStorageConfig {
  const getEnv = (key: string): string => {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return String(process.env[key] || '');
    }
    try {
      if (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.[key]) {
        return String((import.meta as any).env[key] || '');
      }
    } catch {}
    return '';
  };

  const envUrl = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL');
  const envKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_KEY') || getEnv('SUPABASE_ANON_KEY') || getEnv('SUPABASE_KEY');
  const envBucket = getEnv('VITE_SUPABASE_BUCKET') || getEnv('SUPABASE_BUCKET') || 'products';

  const localUrl = typeof localStorage !== 'undefined' ? (localStorage.getItem('supabase_url') || '') : '';
  const localKey = typeof localStorage !== 'undefined' ? (localStorage.getItem('supabase_anon_key') || '') : '';
  const localBucket = typeof localStorage !== 'undefined' ? (localStorage.getItem('supabase_bucket') || '') : '';

  return {
    url: (localUrl || envUrl || '').trim(),
    anonKey: (localKey || envKey || '').trim(),
    bucket: (localBucket || envBucket || 'products').trim(),
  };
}

/**
 * Salva as credenciais do Supabase no localStorage para personalização via Painel Admin
 */
export function saveSupabaseConfig(url: string, anonKey: string, bucket?: string): void {
  if (url) localStorage.setItem('supabase_url', url.trim());
  if (anonKey) localStorage.setItem('supabase_anon_key', anonKey.trim());
  if (bucket) localStorage.setItem('supabase_bucket', bucket.trim());
  supabaseClientInstance = null; // Invalida a instância em cache
}

/**
 * Verifica se as credenciais do Supabase estão configuradas
 */
export function isSupabaseConfigured(): boolean {
  const config = getSupabaseConfig();
  return Boolean(config.url && config.anonKey);
}

/**
 * Inicializa ou retorna a instância ativa do SDK do Supabase
 */
export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) return null;

  const currentKey = `${url}:${anonKey}`;
  if (supabaseClientInstance && cachedConfigKey === currentKey) {
    return supabaseClientInstance;
  }

  try {
    supabaseClientInstance = createClient(url, anonKey);
    cachedConfigKey = currentKey;
    return supabaseClientInstance;
  } catch (err) {
    console.error('[SupabaseStorageService] Erro ao inicializar cliente Supabase:', err);
    return null;
  }
}

/**
 * Converte uma string Data URL Base64 para Blob para permitir o upload no Supabase Storage
 */
function base64ToBlob(base64Data: string): Blob {
  const parts = base64Data.split(';base64,');
  const contentType = parts[0].split(':')[1] || 'image/jpeg';
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
}

export interface UploadImageOptions {
  customFileName?: string;
  folder?: string;
  bucket?: string;
  productId?: string;
  generateThumbnail?: boolean;
  skipOptimization?: boolean;
  quality?: number;
}

/**
 * Faz o upload de uma imagem (File, Blob ou Base64) para o Supabase Storage
 * convertendo automaticamente para WebP (qualidade 80) e gerando miniatura de 150px quando aplicável.
 * Retorna a URL pública gerada para salvar no Firebase Firestore.
 */
export async function uploadImageToSupabase(
  input: File | Blob | string,
  options?: UploadImageOptions
): Promise<string> {
  const supabase = getSupabaseClient();
  const config = getSupabaseConfig();
  const targetBucket = options?.bucket || config.bucket || 'products';

  if (!supabase) {
    throw new Error('Supabase não configurado. Por favor, preencha o URL e a Chave Anon do Supabase nas configurações.');
  }

  // 1. URLs externas pré-existentes são mantidas e preservadas imediatamente sem re-upload
  if (typeof input === 'string') {
    if (input.startsWith('http://') || input.startsWith('https://')) {
      return input;
    }
  }

  let fileBlob: Blob | Buffer;
  let fileExtension = 'webp';
  let mimeType = 'image/webp';
  let rawSource: File | Blob | Buffer;

  if (typeof input === 'string' && input.startsWith('data:image/')) {
    rawSource = base64ToBlob(input);
  } else if (input instanceof File || input instanceof Blob) {
    rawSource = input;
  } else {
    throw new Error('Tipo de imagem não suportado para upload.');
  }

  // 2. Validação de tamanho (Limite de 8MB com compressão adaptativa)
  if (!options?.skipOptimization && 'size' in rawSource) {
    const validation = validateImageFile(rawSource as any);
    if (!validation.valid) {
      throw new Error(validation.error || 'A imagem excede o limite máximo de 8MB.');
    }
  }

  // 3. Otimização automática para formato WebP para alta performance na Web
  if (!options?.skipOptimization) {
    try {
      const optResult = await optimizeImageToWebP(rawSource, {
        quality: options?.quality ?? DEFAULT_WEBP_QUALITY
      });
      fileBlob = optResult.blob || (optResult.buffer ? optResult.buffer : rawSource);
      mimeType = 'image/webp';
      fileExtension = 'webp';
      console.log(`[SupabaseStorageService] Imagem convertida para WebP: de ${(optResult.originalSize / 1024).toFixed(1)}KB para ${(optResult.optimizedSize / 1024).toFixed(1)}KB (${optResult.compressionRatio}% de economia)`);
    } catch (optErr) {
      console.warn('[SupabaseStorageService] Falha na conversão WebP, usando arquivo original:', optErr);
      fileBlob = rawSource;
      mimeType = (rawSource as any).type || 'image/jpeg';
      fileExtension = mimeType.split('/')[1] || 'jpg';
    }
  } else {
    fileBlob = rawSource;
    mimeType = (rawSource as any).type || 'image/png';
    fileExtension = mimeType.split('/')[1] || 'png';
  }

  const folder = options?.folder ? `${options.folder.replace(/\/$/, '')}/` : 'produtos/';
  const randomId = Math.random().toString(36).substring(2, 9);
  const timestamp = Date.now();
  const cleanFileName = options?.customFileName
    ? options.customFileName.toLowerCase().replace(/[^a-z0-9_-]/g, '_')
    : `foto_${timestamp}_${randomId}`;

  const filePath = `${folder}${cleanFileName}.${fileExtension}`;

  // 4. Faz o upload do arquivo WebP para o bucket do Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(targetBucket)
    .upload(filePath, fileBlob, {
      contentType: mimeType,
      cacheControl: '31536000', // Cache imutável de 1 ano
      upsert: true,
    });

  if (uploadError) {
    console.error('[SupabaseStorageService] Erro no upload:', uploadError);
    const msg = uploadError.message || '';
    if (msg.includes('bucket not found') || msg.includes('not found')) {
      throw new Error(`Bucket "${targetBucket}" não encontrado no Supabase Storage. Crie o bucket com acesso público no console do Supabase.`);
    }
    if (msg.includes('row-level security') || msg.includes('policy') || msg.includes('violates')) {
      throw new Error(`O bucket "${targetBucket}" no Supabase requer permissão RLS para upload de fotos. Execute o comando SQL no Supabase: CREATE POLICY "Allow Public Upload" ON storage.objects FOR ALL USING (bucket_id = '${targetBucket}') WITH CHECK (bucket_id = '${targetBucket}');`);
    }
    throw new Error(`Erro no Supabase Storage: ${uploadError.message}`);
  }

  // 5. Gera e envia miniatura (thumbnail) de 150px se solicitado
  if (options?.generateThumbnail && !options?.skipOptimization) {
    try {
      const thumbResult = await generateThumbnailWebP(rawSource, { size: DEFAULT_THUMBNAIL_SIZE });
      const thumbBlob = thumbResult.blob || thumbResult.buffer;
      if (thumbBlob) {
        const thumbPath = `${folder}thumbnails/${cleanFileName}_thumb.webp`;
        await supabase.storage.from(targetBucket).upload(thumbPath, thumbBlob, {
          contentType: 'image/webp',
          cacheControl: '31536000',
          upsert: true,
        });
      }
    } catch (thumbErr) {
      console.warn('[SupabaseStorageService] Aviso: Falha ao gerar miniatura auxiliar:', thumbErr);
    }
  }

  // 6. Obtém a URL pública oficial do objeto no Supabase
  const { data: publicUrlData } = supabase.storage
    .from(targetBucket)
    .getPublicUrl(uploadData?.path || filePath);

  if (!publicUrlData || !publicUrlData.publicUrl) {
    throw new Error('Não foi possível obter a URL pública da imagem no Supabase.');
  }

  console.log(`[SupabaseStorageService] Imagem salva no Supabase com sucesso. URL publica:`, publicUrlData.publicUrl);
  return publicUrlData.publicUrl;
}

/**
 * Upload especializado para fotos de produtos com conversão WebP,
 * thumbnail de 150px e isolamento por pasta do produto.
 */
export async function uploadOptimizedProductPhoto(
  input: File | Blob | string,
  productId: string,
  options?: {
    customFileName?: string;
    bucket?: string;
  }
): Promise<{
  publicUrl: string;
  thumbnailUrl: string;
  stats?: OptimizationResult;
}> {
  const supabase = getSupabaseClient();
  const config = getSupabaseConfig();
  const targetBucket = options?.bucket || config.bucket || 'products';

  if (!supabase) {
    throw new Error('Supabase não configurado. Por favor, preencha as credenciais nas configurações.');
  }

  // Se já for link externo (URL http/https), preserva intacto
  if (typeof input === 'string' && (input.startsWith('http://') || input.startsWith('https://'))) {
    return { publicUrl: input, thumbnailUrl: input };
  }

  let rawSource: File | Blob | Buffer;
  if (typeof input === 'string' && input.startsWith('data:image/')) {
    rawSource = base64ToBlob(input);
  } else if (input instanceof File || input instanceof Blob) {
    rawSource = input;
  } else {
    throw new Error('Formato de imagem não reconhecido.');
  }

  // Validação de tamanho (Limite de 8MB com compressão adaptativa)
  if ('size' in rawSource) {
    const val = validateImageFile(rawSource as any);
    if (!val.valid) {
      throw new Error(val.error || 'A imagem excede o limite máximo de 8MB.');
    }
  }

  const cleanProdId = String(productId || 'geral').replace(/[^a-zA-Z0-9_-]/g, '_');
  const timestamp = Date.now();
  const randomHash = Math.random().toString(36).substring(2, 8);
  const baseName = options?.customFileName || `foto_${timestamp}_${randomHash}`;

  // Otimização para WebP com qualidade 80%
  const optResult = await optimizeImageToWebP(rawSource, { quality: DEFAULT_WEBP_QUALITY });
  const thumbResult = await generateThumbnailWebP(rawSource, { size: DEFAULT_THUMBNAIL_SIZE, quality: 0.75 });

  const mainPath = `produtos/${cleanProdId}/${baseName}.webp`;
  const thumbPath = `produtos/${cleanProdId}/thumbnails/${baseName}_thumb.webp`;

  const mainBlob = optResult.blob || optResult.buffer;
  const thumbBlob = thumbResult.blob || thumbResult.buffer;

  if (!mainBlob || !thumbBlob) {
    throw new Error('Falha ao gerar arquivos WebP');
  }

  // Upload imagem principal WebP
  const { error: mainErr } = await supabase.storage
    .from(targetBucket)
    .upload(mainPath, mainBlob, {
      contentType: 'image/webp',
      cacheControl: '31536000',
      upsert: true,
    });

  if (mainErr) {
    throw new Error(`Erro no upload da foto principal WebP: ${mainErr.message}`);
  }

  // Upload thumbnail 150px WebP
  const { error: thumbErr } = await supabase.storage
    .from(targetBucket)
    .upload(thumbPath, thumbBlob, {
      contentType: 'image/webp',
      cacheControl: '31536000',
      upsert: true,
    });

  if (thumbErr) {
    console.warn('[SupabaseStorageService] Aviso: Erro ao enviar thumbnail:', thumbErr);
  }

  const { data: mainPublic } = supabase.storage.from(targetBucket).getPublicUrl(mainPath);
  const { data: thumbPublic } = supabase.storage.from(targetBucket).getPublicUrl(thumbPath);

  return {
    publicUrl: mainPublic.publicUrl,
    thumbnailUrl: thumbPublic.publicUrl,
    stats: optResult
  };
}

/**
 * Extrai o bucket e o caminho relativo do arquivo a partir de uma URL pública do Supabase Storage
 */
export function extractSupabaseFilePath(publicUrl: string): { bucket: string; filePath: string } | null {
  if (!publicUrl || typeof publicUrl !== 'string') return null;
  const marker = '/storage/v1/object/public/';
  const index = publicUrl.indexOf(marker);

  if (index === -1) {
    const markerAlt = '/storage/v1/object/';
    const indexAlt = publicUrl.indexOf(markerAlt);
    if (indexAlt === -1) return null;

    const remainderAlt = publicUrl.substring(indexAlt + markerAlt.length);
    const partsAlt = remainderAlt.split('/');
    if (partsAlt.length < 2) return null;
    const bucket = partsAlt[0];
    const filePath = partsAlt.slice(1).join('/');
    return { bucket, filePath };
  }

  const remainder = publicUrl.substring(index + marker.length);
  const parts = remainder.split('/');
  if (parts.length < 2) return null;

  const bucket = parts[0];
  const filePath = parts.slice(1).join('/');
  return { bucket, filePath };
}

/**
 * Exclui uma imagem e sua respectiva miniatura (thumbnail) do Supabase Storage a partir da sua URL pública.
 * Se for uma URL externa (link de outro servidor), ignora com segurança sem gerar erro.
 */
export async function deleteImageFromSupabase(publicUrl: string): Promise<boolean> {
  if (!publicUrl || typeof publicUrl !== 'string') return false;

  const parsed = extractSupabaseFilePath(publicUrl);
  if (!parsed) {
    // Link externo ou CDN que não pertence ao bucket do Supabase. Retorna true com segurança.
    console.log('[SupabaseStorageService] URL externa preservada. Ignorando deleção no bucket:', publicUrl);
    return true;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn('[SupabaseStorageService] Supabase não configurado para exclusão.');
    return false;
  }

  const { bucket, filePath } = parsed;

  // 1. Identifica os caminhos do arquivo principal e da miniatura correspondente
  const pathsToDelete = [filePath];

  const lastSlashIndex = filePath.lastIndexOf('/');
  const dir = lastSlashIndex !== -1 ? filePath.substring(0, lastSlashIndex) : '';
  const fileName = lastSlashIndex !== -1 ? filePath.substring(lastSlashIndex + 1) : filePath;
  const dotIndex = fileName.lastIndexOf('.');
  const baseName = dotIndex !== -1 ? fileName.substring(0, dotIndex) : fileName;
  const ext = dotIndex !== -1 ? fileName.substring(dotIndex) : '.webp';

  if (!baseName.endsWith('_thumb')) {
    // Arquivo principal -> busca remover miniatura correspondente (na subpasta thumbnails ou direto)
    if (dir) {
      pathsToDelete.push(`${dir}/thumbnails/${baseName}_thumb.webp`);
      pathsToDelete.push(`${dir}/${baseName}_thumb.webp`);
    } else {
      pathsToDelete.push(`thumbnails/${baseName}_thumb.webp`);
      pathsToDelete.push(`${baseName}_thumb.webp`);
    }
  } else {
    // Caso a URL passada seja de uma miniatura -> remove também o arquivo principal
    const cleanBase = baseName.replace(/_thumb$/, '');
    const parentDir = dir.endsWith('/thumbnails') ? dir.replace(/\/thumbnails$/, '') : dir;
    if (parentDir) {
      pathsToDelete.push(`${parentDir}/${cleanBase}${ext}`);
    } else {
      pathsToDelete.push(`${cleanBase}${ext}`);
    }
  }

  console.log(`[SupabaseStorageService] Deletando arquivo(s) "${pathsToDelete.join(', ')}" do bucket "${bucket}"...`);

  const { data, error } = await supabase.storage
    .from(bucket)
    .remove(pathsToDelete);

  if (error) {
    console.error(`[SupabaseStorageService] Erro ao deletar arquivo(s) do Supabase Storage:`, error);
    return false;
  }

  console.log(`[SupabaseStorageService] Arquivo(s) deletado(s) com sucesso do Supabase Storage:`, data);
  return true;
}

export interface SupabaseAuditItem {
  name: string;
  publicUrl: string;
  filePath: string;
  bucket: string;
  isOrphan: boolean;
  linkedProductId?: string;
  linkedProductName?: string;
  createdAt?: string;
}

export interface PhotoAuditReport {
  totalSupabaseFiles: number;
  totalFirestoreProducts: number;
  totalLinkedPhotos: number;
  totalOrphanPhotos: number;
  items: SupabaseAuditItem[];
}

/**
 * Realiza uma auditoria de segurança entre os arquivos no Supabase Storage e o banco Firebase Firestore.
 * Identifica fotos órfãs (arquivos no Supabase cujas URLs NÃO estão salvas no Firebase).
 */
export async function auditSupabaseVsFirebasePhotos(
  firestoreProducts: any[]
): Promise<PhotoAuditReport> {
  const supabase = getSupabaseClient();
  const config = getSupabaseConfig();
  const targetBucket = config.bucket || 'products';

  if (!supabase) {
    throw new Error('Supabase Storage não está configurado. Preencha a URL e Anon Key nas configurações.');
  }

  // 1. Mapeia todas as URLs cadastradas nos produtos do Firebase Firestore
  const registeredUrlsMap = new Map<string, { id: string; name: string }>();

  firestoreProducts.forEach(prod => {
    const prodId = String(prod.id || prod.moblinkId || '');
    const prodName = String(prod.name || prod.nome || 'Sem Nome');

    const urlsToRegister: string[] = [];
    if (Array.isArray(prod.images)) {
      prod.images.forEach((img: any) => {
        if (typeof img === 'string' && img.trim()) urlsToRegister.push(img.trim());
      });
    }
    if (prod.imageUrl && typeof prod.imageUrl === 'string') urlsToRegister.push(prod.imageUrl.trim());
    if (prod.foto_uri && typeof prod.foto_uri === 'string') urlsToRegister.push(prod.foto_uri.trim());
    if (prod.thumbnailUrl && typeof prod.thumbnailUrl === 'string') urlsToRegister.push(prod.thumbnailUrl.trim());

    // Protege fotos mapeadas por variação de cor
    if (prod.colorImages && typeof prod.colorImages === 'object') {
      Object.values(prod.colorImages).forEach((list: any) => {
        if (Array.isArray(list)) {
          list.forEach(u => {
            if (typeof u === 'string' && u.trim()) urlsToRegister.push(u.trim());
          });
        }
      });
    }

    if (prod.colorImageMap && typeof prod.colorImageMap === 'object') {
      Object.values(prod.colorImageMap).forEach((u: any) => {
        if (typeof u === 'string' && u.trim()) urlsToRegister.push(u.trim());
      });
    }

    urlsToRegister.forEach(url => {
      registeredUrlsMap.set(url, { id: prodId, name: prodName });
    });
  });

  // 2. Lista os arquivos do bucket no Supabase (pastas 'produtos' e raiz)
  const foldersToScan = ['produtos', 'banners', 'sobre', ''];
  const allBucketFiles: Array<{ name: string; folder: string; createdAt?: string }> = [];

  for (const folder of foldersToScan) {
    try {
      const { data, error } = await supabase.storage.from(targetBucket).list(folder, {
        limit: 500,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
      });

      if (!error && Array.isArray(data)) {
        data.forEach(item => {
          if (item.name && item.id) {
            allBucketFiles.push({
              name: item.name,
              folder,
              createdAt: item.created_at,
            });
          }
        });
      }
    } catch (err) {
      console.warn(`[SupabaseAudit] Erro ao listar pasta "${folder}":`, err);
    }
  }

  // 3. Cruza os arquivos do Supabase com o mapa de URLs do Firebase
  let totalLinked = 0;
  let totalOrphan = 0;
  const items: SupabaseAuditItem[] = [];

  allBucketFiles.forEach(file => {
    const filePath = file.folder ? `${file.folder}/${file.name}` : file.name;
    const { data: publicUrlData } = supabase.storage.from(targetBucket).getPublicUrl(filePath);
    const publicUrl = publicUrlData?.publicUrl || '';

    let linkedInfo = registeredUrlsMap.get(publicUrl);

    // Fallback: Tenta casamento flexível de caminho se o host mudar ligeiramente
    if (!linkedInfo) {
      for (const [regUrl, info] of registeredUrlsMap.entries()) {
        if (regUrl.includes(filePath) || publicUrl.includes(regUrl)) {
          linkedInfo = info;
          break;
        }
      }
    }

    const isOrphan = !linkedInfo;
    if (isOrphan) {
      totalOrphan++;
    } else {
      totalLinked++;
    }

    items.push({
      name: file.name,
      filePath,
      bucket: targetBucket,
      publicUrl,
      isOrphan,
      linkedProductId: linkedInfo?.id,
      linkedProductName: linkedInfo?.name,
      createdAt: file.createdAt,
    });
  });

  return {
    totalSupabaseFiles: allBucketFiles.length,
    totalFirestoreProducts: firestoreProducts.length,
    totalLinkedPhotos: totalLinked,
    totalOrphanPhotos: totalOrphan,
    items,
  };
}

export interface ProductPhotoBackupItem {
  id: string;
  name: string;
  images: string[];
  imageUrl?: string;
  foto_uri?: string;
  colorImages?: Record<string, string[]>;
  colorImageMap?: Record<string, string>;
  description?: string;
  sku?: string;
  referencia?: string;
  updatedAt: string;
}

export interface ProductPhotosBackupPayload {
  version: string;
  timestamp: string;
  totalProducts: number;
  totalPhotos: number;
  products: Record<string, ProductPhotoBackupItem>;
}

/**
 * Salva os metadados enriquecidos de um produto individual no Supabase DB
 */
export async function syncProductMediaToSupabase(product: Partial<any>): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    const id = String(product.id || product.moblinkId || '').trim();
    if (!id) return;

    const validImages = preserveExistingImages(product.images, [product.imageUrl, product.foto_uri]);

    const payload = {
      id,
      name: product.name || product.descricao || '',
      images: validImages,
      imageUrl: validImages[0] || (isValidWebPhotoUrl(product.imageUrl) ? product.imageUrl : ''),
      foto_uri: validImages[0] || (isValidWebPhotoUrl(product.foto_uri) ? product.foto_uri : ''),
      colorImages: product.colorImages || {},
      colorImageMap: product.colorImageMap || {},
      description: product.description || '',
      updated_at: new Date().toISOString()
    };

    await supabase.from('products_media').upsert(payload, { onConflict: 'id' });
  } catch (err: any) {
    console.warn('[SupabaseStorageService] Sync products_media info:', err?.message);
  }
}

/**
 * Busca todos os produtos enriquecidos com mídia a partir do Supabase DB
 */
export async function fetchProductMediaFromSupabase(): Promise<any[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase.from('products_media').select('*');
    if (error || !Array.isArray(data)) return [];
    return data;
  } catch (err) {
    return [];
  }
}

/**
 * Realiza backup integral de todas as fotos e links de produtos no Supabase
 * (salva em arquivo JSON no Storage Bucket 'backups/photos_backup_latest.json' e na tabela products_media do Supabase DB)
 */
export async function backupAllProductPhotosToSupabase(
  productsList: any[]
): Promise<{ backedUpCount: number; timestamp: string; publicUrl?: string; error?: string }> {
  const supabase = getSupabaseClient();
  const config = getSupabaseConfig();
  const targetBucket = config.bucket || 'products';

  if (!Array.isArray(productsList) || productsList.length === 0) {
    return { backedUpCount: 0, timestamp: new Date().toISOString() };
  }

  // Filtra apenas produtos com fotos válidas
  const productsWithPhotos = productsList.filter(p => {
    if (!p) return false;
    const hasImages = Array.isArray(p.images) && p.images.some((u: any) => isValidWebPhotoUrl(u));
    const hasCover = isValidWebPhotoUrl(p.imageUrl) || isValidWebPhotoUrl(p.foto_uri);
    const hasColorPhotos = p.colorImages && typeof p.colorImages === 'object' && Object.values(p.colorImages).flat().some((u: any) => isValidWebPhotoUrl(u));
    return hasImages || hasCover || Boolean(hasColorPhotos);
  });

  const timestamp = new Date().toISOString();
  const backupMap: Record<string, ProductPhotoBackupItem> = {};
  let totalPhotos = 0;

  productsWithPhotos.forEach(p => {
    const rawId = String(p.id || p.moblinkId || '').trim();
    if (!rawId) return;

    const validImages = preserveExistingImages(p.images, [p.imageUrl, p.foto_uri]);
    totalPhotos += validImages.length;

    const item: ProductPhotoBackupItem = {
      id: rawId,
      name: p.name || p.descricao || '',
      images: validImages,
      imageUrl: validImages[0] || (isValidWebPhotoUrl(p.imageUrl) ? p.imageUrl : ''),
      foto_uri: validImages[0] || (isValidWebPhotoUrl(p.foto_uri) ? p.foto_uri : ''),
      colorImages: p.colorImages || {},
      colorImageMap: p.colorImageMap || {},
      description: p.description || '',
      sku: p.sku || p.codigo,
      referencia: p.referencia || p.referenceCode || p.modelCode,
      updatedAt: timestamp,
    };

    backupMap[rawId] = item;
    if (rawId.startsWith('MOB-')) {
      backupMap[rawId.replace(/^MOB-/, '')] = item;
    } else {
      backupMap[`MOB-${rawId}`] = item;
    }
  });

  const payload: ProductPhotosBackupPayload = {
    version: '1.0',
    timestamp,
    totalProducts: productsWithPhotos.length,
    totalPhotos,
    products: backupMap,
  };

  const payloadStr = JSON.stringify(payload, null, 2);

  // 1. Salva cópia de contingência no localStorage
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('evidencia_supabase_photos_backup', payloadStr);
      localStorage.setItem('evidencia_supabase_photos_backup_time', timestamp);
    }
  } catch {}

  if (!supabase) {
    return {
      backedUpCount: productsWithPhotos.length,
      timestamp,
      error: 'Supabase não configurado. O backup foi salvo apenas localmente.',
    };
  }

  let publicBackupUrl = '';

  // 2. Salva o arquivo JSON de backup no bucket do Supabase Storage
  try {
    const blob = new Blob([payloadStr], { type: 'application/json' });
    const latestPath = 'backups/photos_backup_latest.json';
    const timestampPath = `backups/photos_backup_${Date.now()}.json`;

    await supabase.storage.from(targetBucket).upload(latestPath, blob, {
      contentType: 'application/json',
      cacheControl: '0',
      upsert: true,
    });

    try {
      await supabase.storage.from(targetBucket).upload(timestampPath, blob, {
        contentType: 'application/json',
        cacheControl: '31536000',
        upsert: true,
      });
    } catch {}

    const { data: pubData } = supabase.storage.from(targetBucket).getPublicUrl(latestPath);
    publicBackupUrl = pubData?.publicUrl || '';
  } catch (storageErr: any) {
    console.warn('[SupabaseStorageService] Aviso no upload do JSON de backup para o Storage:', storageErr?.message);
  }

  // 3. Salva também na tabela products_media no Supabase DB (batch de 50)
  try {
    const rows = productsWithPhotos.map(p => {
      const rawId = String(p.id || p.moblinkId || '').trim();
      const validImages = preserveExistingImages(p.images, [p.imageUrl, p.foto_uri]);
      return {
        id: rawId,
        name: p.name || p.descricao || '',
        images: validImages,
        imageUrl: validImages[0] || (isValidWebPhotoUrl(p.imageUrl) ? p.imageUrl : ''),
        foto_uri: validImages[0] || (isValidWebPhotoUrl(p.foto_uri) ? p.foto_uri : ''),
        colorImages: p.colorImages || {},
        colorImageMap: p.colorImageMap || {},
        description: p.description || '',
        updated_at: timestamp,
      };
    });

    const chunkSize = 50;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      await supabase.from('products_media').upsert(chunk, { onConflict: 'id' });
    }
  } catch (dbErr: any) {
    console.warn('[SupabaseStorageService] Aviso no upsert do products_media DB:', dbErr?.message);
  }

  return {
    backedUpCount: productsWithPhotos.length,
    timestamp,
    publicUrl: publicBackupUrl,
  };
}

/**
 * Busca o backup consolidado do Supabase (unindo arquivo JSON do Storage, tabela do DB e localStorage)
 */
export async function fetchSupabasePhotosBackup(): Promise<ProductPhotosBackupPayload | null> {
  const supabase = getSupabaseClient();
  const config = getSupabaseConfig();
  const targetBucket = config.bucket || 'products';

  // 1. Tenta baixar o arquivo JSON mais recente do Supabase Storage
  if (supabase) {
    try {
      const { data, error } = await supabase.storage.from(targetBucket).download('backups/photos_backup_latest.json');
      if (!error && data) {
        const text = await data.text();
        const parsed = JSON.parse(text) as ProductPhotosBackupPayload;
        if (parsed && parsed.products && Object.keys(parsed.products).length > 0) {
          return parsed;
        }
      }
    } catch {}
  }

  // 2. Fallback: busca da tabela products_media do Supabase DB
  if (supabase) {
    try {
      const mediaList = await fetchProductMediaFromSupabase();
      if (Array.isArray(mediaList) && mediaList.length > 0) {
        const productsMap: Record<string, ProductPhotoBackupItem> = {};
        mediaList.forEach(m => {
          if (!m.id) return;
          const rawId = String(m.id).trim();
          const validImages = preserveExistingImages(m.images, [m.imageUrl, m.foto_uri]);
          productsMap[rawId] = {
            id: rawId,
            name: m.name || '',
            images: validImages,
            imageUrl: validImages[0] || m.imageUrl || '',
            foto_uri: validImages[0] || m.foto_uri || '',
            colorImages: m.colorImages || {},
            colorImageMap: m.colorImageMap || {},
            description: m.description || '',
            updatedAt: m.updated_at || new Date().toISOString(),
          };
        });
        return {
          version: '1.0',
          timestamp: new Date().toISOString(),
          totalProducts: Object.keys(productsMap).length,
          totalPhotos: Object.values(productsMap).reduce((acc, p) => acc + p.images.length, 0),
          products: productsMap,
        };
      }
    } catch {}
  }

  // 3. Fallback: localStorage
  if (typeof localStorage !== 'undefined') {
    const local = localStorage.getItem('evidencia_supabase_photos_backup');
    if (local) {
      try {
        return JSON.parse(local) as ProductPhotosBackupPayload;
      } catch {}
    }
  }

  return null;
}

/**
 * Mapeia automaticamente todas as fotos do Supabase Storage e do Backup no Supabase:
 * Exemplo: produto_1998_1787273728 -> liga ao produto ID 1998 e MOB-1998
 */
export async function fetchSupabaseStoragePhotosMap(): Promise<Map<string, string[]>> {
  const supabase = getSupabaseClient();
  const config = getSupabaseConfig();
  const photoMap = new Map<string, string[]>();

  // 1. Incorpora fotos do arquivo JSON de backup do Supabase e da tabela products_media
  try {
    const backup = await fetchSupabasePhotosBackup();
    if (backup && backup.products) {
      Object.entries(backup.products).forEach(([key, item]) => {
        if (!key || !item) return;
        const validImages = preserveExistingImages(item.images, [item.imageUrl, item.foto_uri]);
        if (validImages.length > 0) {
          const cleanKey = key.replace(/^MOB-/i, '');
          const mobKey = `MOB-${cleanKey}`;

          [key, cleanKey, mobKey].forEach(k => {
            if (!k) return;
            const list = photoMap.get(k) || [];
            validImages.forEach(u => {
              if (!list.includes(u)) list.push(u);
            });
            photoMap.set(k, list);
          });
        }
      });
    }
  } catch {}

  if (!supabase) return photoMap;

  // 2. Varre os buckets do Supabase Storage para arquivos enviados diretamente
  const configuredBucket = config.bucket || 'products';
  const bucketsToScan = Array.from(new Set([configuredBucket, 'products', 'produtos', 'evidenciacalcados', 'evidencia-calcados', 'evidencia']));
  const foldersToScan = ['', 'produtos', 'produtos_moblink', 'fotos', 'images', 'public'];

  for (const bucketName of bucketsToScan) {
    for (const folder of foldersToScan) {
      try {
        const { data, error } = await supabase.storage.from(bucketName).list(folder, {
          limit: 1000,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' },
        });

        if (!error && Array.isArray(data)) {
          data.forEach(item => {
            if (!item.name || item.name.startsWith('.')) return;

            const filePath = folder ? `${folder}/${item.name}` : item.name;
            const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
            const publicUrl = publicUrlData?.publicUrl;
            if (!publicUrl || !isValidWebPhotoUrl(publicUrl)) return;

            // Extrai o ID entre os underline (_): ex: produto_1998_1787273728 -> 1998
            let extractedId = '';
            const matchNamed = item.name.match(/(?:produto|foto|img|image)_([a-zA-Z0-9-]+)(?:_|\.|$)/i);
            if (matchNamed && matchNamed[1]) {
              extractedId = matchNamed[1].trim();
            } else {
              const matchDirect = item.name.match(/^([a-zA-Z0-9-]+)_/);
              if (matchDirect && matchDirect[1]) {
                extractedId = matchDirect[1].trim();
              }
            }

            if (extractedId) {
              const cleanId = extractedId.replace(/^MOB-/i, '');
              const mobIdKey = `MOB-${cleanId}`;

              [cleanId, mobIdKey, extractedId].forEach(key => {
                if (!key) return;
                const list = photoMap.get(key) || [];
                if (!list.includes(publicUrl)) {
                  list.push(publicUrl);
                  photoMap.set(key, list);
                }
              });
            }
          });
        }
      } catch (err) {
        // Silently scan next bucket/folder combination
      }
    }
  }

  return photoMap;
}

/**
 * Varre todo o Supabase Storage e o backup do Supabase e salva/atualiza as URLs no Firestore para todos os produtos correspondentes por ID
 */
export async function autoLinkSupabasePhotosToFirestore(productsList: any[]): Promise<{ updatedCount: number; matchedMap: Map<string, string[]> }> {
  const photoMap = await fetchSupabaseStoragePhotosMap();
  let updatedCount = 0;

  if (!photoMap || photoMap.size === 0 || !Array.isArray(productsList)) {
    return { updatedCount: 0, matchedMap: photoMap };
  }

  for (const prod of productsList) {
    const rawId = String(prod.id || prod.moblinkId || '').trim();
    if (!rawId) continue;

    const possibleKeys = Array.from(new Set([
      rawId,
      rawId.replace(/^MOB-/i, ''),
      `MOB-${rawId.replace(/^MOB-/i, '')}`,
      String(prod.sku || ''),
      String(prod.codigo || ''),
      String(prod.referencia || ''),
      String(prod.modelCode || ''),
      String(prod.referenceCode || '')
    ].filter(k => k && k.trim() !== '')));

    let supabasePhotos: string[] = [];
    for (const key of possibleKeys) {
      const found = photoMap.get(key);
      if (Array.isArray(found) && found.length > 0) {
        found.forEach(url => {
          if (!supabasePhotos.includes(url)) supabasePhotos.push(url);
        });
      }
    }

    if (supabasePhotos.length > 0) {
      const existingImages = preserveExistingImages(prod.images, [prod.imageUrl, prod.foto_uri]);
      const newImages = preserveExistingImages(existingImages, supabasePhotos);

      const coverUrl = newImages[0];
      const stockVal = prod.stock !== undefined ? prod.stock : (prod.saldo_loja ?? 0);
      try {
        const prodRef = doc(db, 'products', rawId);
        await setDoc(prodRef, {
          images: newImages,
          imageUrl: coverUrl,
          foto_uri: coverUrl,
          visible: stockVal > 0 ? true : false,
          hasMedia: true,
          hasCustomData: true,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        prod.images = newImages;
        prod.imageUrl = coverUrl;
        prod.foto_uri = coverUrl;
        prod.visible = stockVal > 0 ? true : false;
        prod.hasMedia = true;
        updatedCount++;
      } catch (e) {
        console.warn(`[AutoLinkSupabase] Erro ao atualizar Firestore para produto ${rawId}:`, e);
      }
    }
  }

  // Atualiza backups do localStorage
  if (typeof localStorage !== 'undefined') {
    ['evidencia_local_products', 'evidencia_firestore_products_backup'].forEach(key => {
      try {
        localStorage.setItem(key, JSON.stringify(productsList));
      } catch {}
    });
  }

  return { updatedCount, matchedMap: photoMap };
}

/**
 * Restaura todas as fotos de produtos a partir do backup do Supabase para o Firestore
 */
export async function restoreAllProductPhotosFromSupabase(
  currentProducts: any[]
): Promise<{ updatedCount: number; matchedMap: Map<string, string[]> }> {
  return autoLinkSupabasePhotosToFirestore(currentProducts);
}


