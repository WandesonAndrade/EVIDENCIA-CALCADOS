import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { isPlaceholderUrl } from '../utils/placeholder';

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
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_KEY || '';
  const envBucket = (import.meta as any).env?.VITE_SUPABASE_BUCKET || 'products';

  const localUrl = localStorage.getItem('supabase_url') || '';
  const localKey = localStorage.getItem('supabase_anon_key') || '';
  const localBucket = localStorage.getItem('supabase_bucket') || '';

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

/**
 * Faz o upload de uma imagem (File, Blob ou Base64) para o Supabase Storage e retorna a URL pública gerada.
 * Esta URL deve ser salva no Firebase Firestore.
 */
export async function uploadImageToSupabase(
  input: File | Blob | string,
  options?: {
    customFileName?: string;
    folder?: string;
    bucket?: string;
  }
): Promise<string> {
  const supabase = getSupabaseClient();
  const config = getSupabaseConfig();
  const targetBucket = options?.bucket || config.bucket || 'products';

  if (!supabase) {
    throw new Error('Supabase não configurado. Por favor, preencha o URL e a Chave Anon do Supabase nas configurações.');
  }

  let fileBlob: Blob;
  let fileExtension = 'png';
  let mimeType = 'image/png';

  if (typeof input === 'string') {
    if (input.startsWith('data:image/')) {
      fileBlob = base64ToBlob(input);
      const matchedMime = input.match(/data:(image\/[a-zA-Z0-9.+]+);base64,/);
      if (matchedMime && matchedMime[1]) {
        mimeType = matchedMime[1];
        fileExtension = mimeType.split('/')[1] || 'png';
      }
    } else {
      // Já é uma URL HTTP externa válida
      return input;
    }
  } else if (input instanceof File) {
    fileBlob = input;
    mimeType = input.type || 'image/png';
    const nameParts = input.name.split('.');
    if (nameParts.length > 1) {
      fileExtension = nameParts.pop() || 'png';
    }
  } else {
    fileBlob = input;
    mimeType = input.type || 'image/png';
  }

  const folder = options?.folder ? `${options.folder.replace(/\/$/, '')}/` : 'produtos/';
  const randomId = Math.random().toString(36).substring(2, 9);
  const timestamp = Date.now();
  const cleanFileName = options?.customFileName
    ? options.customFileName.toLowerCase().replace(/[^a-z0-9_-]/g, '_')
    : `foto_${timestamp}_${randomId}`;

  const filePath = `${folder}${cleanFileName}.${fileExtension}`;

  // 1. Faz o upload do arquivo para o bucket do Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(targetBucket)
    .upload(filePath, fileBlob, {
      contentType: mimeType,
      cacheControl: '3600',
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

  // 2. Obtém a URL pública oficial do objeto no Supabase
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
 * Exclui uma imagem do Supabase Storage a partir da sua URL pública
 */
export async function deleteImageFromSupabase(publicUrl: string): Promise<boolean> {
  if (!publicUrl || typeof publicUrl !== 'string') return false;

  const parsed = extractSupabaseFilePath(publicUrl);
  if (!parsed) {
    console.log('[SupabaseStorageService] URL não pertence ao Supabase Storage. Ignorando remoção remota:', publicUrl);
    return false;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn('[SupabaseStorageService] Supabase não configurado para exclusão.');
    return false;
  }

  const { bucket, filePath } = parsed;

  console.log(`[SupabaseStorageService] Deletando arquivo "${filePath}" do bucket "${bucket}"...`);

  const { data, error } = await supabase.storage
    .from(bucket)
    .remove([filePath]);

  if (error) {
    console.error(`[SupabaseStorageService] Erro ao deletar arquivo do Supabase Storage:`, error);
    return false;
  }

  console.log(`[SupabaseStorageService] Arquivo deletado com sucesso do Supabase Storage:`, data);
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

/**
 * Salva os metadados enriquecidos do produto (fotos por cor, imagens, descricao) no Supabase DB
 */
export async function syncProductMediaToSupabase(product: Partial<any>): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    const id = String(product.id || product.moblinkId || '').trim();
    if (!id) return;

    const payload = {
      id,
      name: product.name || product.descricao || '',
      images: Array.isArray(product.images) ? product.images : [],
      imageUrl: product.imageUrl || product.foto_uri || '',
      foto_uri: product.foto_uri || product.imageUrl || '',
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
 * Mapeia automaticamente todas as fotos do Supabase Storage identificadas pelo ID no nome do arquivo:
 * Exemplo: produto_1998_1787273728 -> liga ao produto ID 1998 e MOB-1998
 */
export async function fetchSupabaseStoragePhotosMap(): Promise<Map<string, string[]>> {
  const supabase = getSupabaseClient();
  const config = getSupabaseConfig();
  const photoMap = new Map<string, string[]>();

  if (!supabase) return photoMap;

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
            if (!publicUrl) return;

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
 * Varre todo o Supabase Storage e salva/atualiza as URLs no Firestore para todos os produtos correspondentes por ID
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
      const existingImages = Array.isArray(prod.images) ? prod.images.filter((u: any) => u && typeof u === 'string' && !isPlaceholderUrl(u)) : [];
      
      const newImages = [...existingImages];
      supabasePhotos.forEach(url => {
        if (!newImages.includes(url)) newImages.push(url);
      });

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

