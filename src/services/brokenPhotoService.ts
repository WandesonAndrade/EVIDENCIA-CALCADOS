import { isPlaceholderUrl, isValidWebPhotoUrl } from '../utils/placeholder';

const STORAGE_KEY = 'evidencia_broken_photos_map';

// Cache em memória de URLs testadas para evitar chamadas repetitivas
const testedUrlCache = new Map<string, boolean>();

// Mapa de produtos com fotos quebradas: { [productId]: urlComErro }
let brokenPhotosMap: Record<string, string> = {};

// Carrega dados salvos do localStorage
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      brokenPhotosMap = JSON.parse(raw);
    }
  }
} catch (e) {
  console.warn('[brokenPhotoService] Erro ao carregar fotos quebradas do cache:', e);
}

// Lista de ouvintes para atualização de estado reativo
type Listener = (map: Record<string, string>) => void;
const listeners = new Set<Listener>();

function notifyListeners() {
  const copy = { ...brokenPhotosMap };
  listeners.forEach((fn) => {
    try {
      fn(copy);
    } catch {}
  });
}

function persistMap() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(brokenPhotosMap));
    }
  } catch (e) {
    console.warn('[brokenPhotoService] Erro ao salvar fotos quebradas:', e);
  }
  notifyListeners();
}

/**
 * Normaliza o ID para busca universal (com e sem prefixo MOB-)
 */
export function normalizeProductId(id: string | number): string {
  return String(id || '').trim();
}

/**
 * Testa se uma URL de imagem é válida e acessível (não retorna 404 / NoSuchKey)
 */
export function testImageUrl(url: string, timeoutMs = 4500): Promise<boolean> {
  if (!url || typeof url !== 'string' || !isValidWebPhotoUrl(url) || isPlaceholderUrl(url)) {
    return Promise.resolve(false);
  }

  const cleanUrl = url.trim();
  if (testedUrlCache.has(cleanUrl)) {
    return Promise.resolve(testedUrlCache.get(cleanUrl)!);
  }

  return new Promise((resolve) => {
    let settled = false;
    const img = new Image();

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        testedUrlCache.set(cleanUrl, false);
        resolve(false);
      }
    }, timeoutMs);

    img.onload = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        testedUrlCache.set(cleanUrl, true);
        resolve(true);
      }
    };

    img.onerror = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        testedUrlCache.set(cleanUrl, false);
        resolve(false);
      }
    };

    img.src = cleanUrl;
  });
}

/**
 * Registra um produto que teve sua foto quebrada (ex: capturado pelo onError do <img>)
 */
export function recordBrokenPhoto(productId: string | number, photoUrl: string): void {
  const normId = normalizeProductId(productId);
  if (!normId || !photoUrl || isPlaceholderUrl(photoUrl)) return;

  const cleanId = normId.replace(/^MOB-/i, '');
  const mobKey = `MOB-${cleanId}`;

  let changed = false;
  [normId, cleanId, mobKey].forEach((key) => {
    if (key && brokenPhotosMap[key] !== photoUrl) {
      brokenPhotosMap[key] = photoUrl;
      changed = true;
    }
  });

  testedUrlCache.set(photoUrl.trim(), false);

  if (changed) {
    persistMap();
  }
}

/**
 * Remove o registro de erro quando a foto de um produto for corrigida ou redefinida
 */
export function clearBrokenPhoto(productId: string | number, newValidUrl?: string): void {
  const normId = normalizeProductId(productId);
  if (!normId) return;

  const cleanId = normId.replace(/^MOB-/i, '');
  const mobKey = `MOB-${cleanId}`;

  let changed = false;
  [normId, cleanId, mobKey].forEach((key) => {
    if (key && brokenPhotosMap[key]) {
      const oldBrokenUrl = brokenPhotosMap[key];
      if (oldBrokenUrl) {
        testedUrlCache.delete(oldBrokenUrl.trim());
      }
      delete brokenPhotosMap[key];
      changed = true;
    }
  });

  if (newValidUrl && typeof newValidUrl === 'string' && newValidUrl.trim()) {
    testedUrlCache.set(newValidUrl.trim(), true);
  }

  if (changed) {
    persistMap();
  }
}

/**
 * Limpa todos os registros de fotos quebradas (para reiniciar auditoria)
 */
export function resetBrokenPhotos(): void {
  brokenPhotosMap = {};
  testedUrlCache.clear();
  persistMap();
}

/**
 * Retorna o mapa atual de fotos quebradas
 */
export function getBrokenPhotosMap(): Record<string, string> {
  return { ...brokenPhotosMap };
}

/**
 * Verifica se o produto está marcado com foto quebrada
 */
export function isProductPhotoBroken(productId: string | number): boolean {
  const normId = normalizeProductId(productId);
  if (!normId) return false;

  const cleanId = normId.replace(/^MOB-/i, '');
  const mobKey = `MOB-${cleanId}`;

  return Boolean(
    brokenPhotosMap[normId] || 
    brokenPhotosMap[cleanId] || 
    brokenPhotosMap[mobKey]
  );
}

/**
 * Inscreve um componente para receber atualizações reativas do mapa de erros
 */
export function subscribeToBrokenPhotos(callback: Listener): () => void {
  listeners.add(callback);
  callback({ ...brokenPhotosMap });
  return () => {
    listeners.delete(callback);
  };
}

export interface PhotoAuditProgress {
  checked: number;
  total: number;
  brokenCount: number;
  currentProduct?: string;
}

/**
 * Executa auditoria em lote nas fotos de todos os produtos fornecidos.
 * Executa com concorrência controlada para alta velocidade sem sobrecarregar a rede.
 */
export async function auditProductsPhotos(
  products: any[],
  onProgress?: (progress: PhotoAuditProgress) => void,
  concurrency = 12
): Promise<{
  totalAudited: number;
  brokenCount: number;
  brokenMap: Record<string, string>;
}> {
  // Filtra apenas produtos que têm alguma URL de foto cadastrada
  const itemsToCheck: Array<{ id: string; name: string; url: string }> = [];

  products.forEach((prod) => {
    const rawId = String(prod.id || prod.moblinkId || '').trim();
    if (!rawId) return;

    let targetUrl = '';
    if (Array.isArray(prod.images) && prod.images.length > 0) {
      const firstValid = prod.images.find((u: any) => typeof u === 'string' && u.trim() && !isPlaceholderUrl(u));
      if (firstValid) targetUrl = firstValid;
    }

    if (!targetUrl) {
      const candidates = [prod.foto_uri, prod.imageUrl, prod.foto_url, prod.foto, prod.imagem, prod.image];
      for (const c of candidates) {
        if (typeof c === 'string' && c.trim() && !isPlaceholderUrl(c)) {
          targetUrl = c.trim();
          break;
        }
      }
    }

    if (targetUrl && isValidWebPhotoUrl(targetUrl)) {
      itemsToCheck.push({
        id: rawId,
        name: String(prod.name || prod.nome || prod.descricao || rawId),
        url: targetUrl,
      });
    }
  });

  const total = itemsToCheck.length;
  let checked = 0;
  let brokenCount = Object.keys(brokenPhotosMap).length;

  // Processamento em fila concorrente
  let index = 0;
  async function worker() {
    while (index < itemsToCheck.length) {
      const current = itemsToCheck[index++];
      if (!current) break;

      const isValid = await testImageUrl(current.url);
      checked++;

      if (!isValid) {
        recordBrokenPhoto(current.id, current.url);
        brokenCount++;
      } else {
        // Se era marcada como quebrada e agora funciona, remove
        if (isProductPhotoBroken(current.id)) {
          clearBrokenPhoto(current.id);
          brokenCount = Math.max(0, brokenCount - 1);
        }
      }

      if (onProgress) {
        onProgress({
          checked,
          total,
          brokenCount,
          currentProduct: current.name,
        });
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker());
  await Promise.all(workers);

  return {
    totalAudited: total,
    brokenCount: Object.keys(brokenPhotosMap).length,
    brokenMap: { ...brokenPhotosMap },
  };
}
