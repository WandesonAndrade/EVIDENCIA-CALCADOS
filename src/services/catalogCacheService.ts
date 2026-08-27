import { Product } from '../types';

const CATALOG_CACHE_KEY = 'evidencia_catalog_cache_v2';
const CATALOG_TIMESTAMP_KEY = 'evidencia_catalog_cache_timestamp';
const DB_NAME = 'EvidenciaCatalogDB';
const DB_VERSION = 1;
const STORE_NAME = 'catalog';

export interface CatalogCacheData {
  products: Product[];
  timestamp: number;
  version: string;
}

// In-memory cache singleton para resposta instantânea (0ms)
let memoryCatalog: Product[] | null = null;

/**
 * Inicializa a conexão com o IndexedDB do navegador
 */
function openCatalogDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject('IndexedDB não suportado');
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Grava o catálogo no IndexedDB (Suporta MBs sem limite de 5MB do LocalStorage)
 */
async function saveToIndexedDB(products: Product[]): Promise<boolean> {
  try {
    const db = await openCatalogDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(products, 'current_catalog');
    store.put(Date.now(), 'timestamp');
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.debug('[CatalogCache] Erro ao gravar no IndexedDB:', err);
    return false;
  }
}

/**
 * Carrega o catálogo do IndexedDB
 */
async function loadFromIndexedDB(): Promise<Product[] | null> {
  try {
    const db = await openCatalogDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get('current_catalog');
    return new Promise((resolve) => {
      req.onsuccess = () => {
        const val = req.result;
        if (Array.isArray(val) && val.length > 0) {
          resolve(val);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Grava no localStorage com tratamento anti-estouro de cota (QuotaExceededError) e limpeza automática
 */
export function safeSetLocalStorage(key: string, value: string): boolean {
  if (typeof localStorage === 'undefined') return false;

  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    // Se estourou a cota do LocalStorage (~5MB), limpa chaves legadas/redundantes e tenta novamente
    if (
      err?.name === 'QuotaExceededError' ||
      err?.code === 22 ||
      err?.code === 1014 ||
      String(err).includes('QuotaExceededError')
    ) {
      try {
        localStorage.removeItem('evidencia_firestore_products_backup');
        localStorage.removeItem('evidencia_local_products');
        localStorage.removeItem('moblink_products_cache');
        localStorage.removeItem('evidencia_moblink_logs');
      } catch {}

      try {
        localStorage.setItem(key, value);
        return true;
      } catch {
        // Se ainda assim o LocalStorage do navegador estiver cheio, falha silenciosamente pois o IndexedDB guarda os dados
        return false;
      }
    }
    return false;
  }
}

/**
 * Compacta a lista de produtos para armazenamento leve em fallback no LocalStorage
 */
function compressProductsForStorage(products: Product[]): Partial<Product>[] {
  return products.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    price: p.price,
    originalPrice: p.originalPrice,
    stock: p.stock,
    saldo_loja: p.saldo_loja,
    category: p.category,
    subcategory: p.subcategory,
    nome_grupo: p.nome_grupo,
    color: p.color,
    sizes: p.sizes,
    visible: p.visible,
    images: Array.isArray(p.images) ? p.images.slice(0, 5) : [],
    imageUrl: p.imageUrl,
    foto_uri: p.foto_uri,
    colorImages: p.colorImages,
    colorImageMap: p.colorImageMap,
  }));
}

/**
 * Obtém o catálogo salvo no cache do navegador do cliente (Síncrono para renderização inicial 0ms)
 */
export function getCachedCatalog(): Product[] | null {
  if (memoryCatalog && memoryCatalog.length > 0) return memoryCatalog;
  if (typeof localStorage === 'undefined') return null;

  try {
    const rawData = localStorage.getItem(CATALOG_CACHE_KEY);
    if (!rawData) return null;

    const parsed: CatalogCacheData = JSON.parse(rawData);
    if (Array.isArray(parsed.products) && parsed.products.length > 0) {
      memoryCatalog = parsed.products;
      return parsed.products;
    }
  } catch (err) {
    console.debug('[CatalogCache] Falha ao ler localStorage:', err);
  }

  return null;
}

/**
 * Obtém o catálogo com suporte assíncrono priorizando IndexedDB (Capacidade Ilimitada)
 */
export async function getCachedCatalogAsync(): Promise<Product[] | null> {
  const syncCached = getCachedCatalog();
  if (syncCached && syncCached.length > 0) return syncCached;

  const idbProducts = await loadFromIndexedDB();
  if (idbProducts && idbProducts.length > 0) {
    memoryCatalog = idbProducts;
    return idbProducts;
  }

  return null;
}

/**
 * Salva o catálogo no cache local (IndexedDB de alta capacidade + LocalStorage seguro de backup)
 */
export function setCachedCatalog(products: Product[]): void {
  if (!Array.isArray(products) || products.length === 0) return;

  // 1. Atualiza cache em memória para acesso 0ms na sessão ativa
  memoryCatalog = products;

  // 2. Grava no IndexedDB (Persistência assíncrona ilimitada sem travar o browser)
  saveToIndexedDB(products).catch(() => {});

  // 3. Grava cópia compacta no LocalStorage com proteção anti-QuotaExceededError
  try {
    const compressed = compressProductsForStorage(products);
    const cachePayload: CatalogCacheData = {
      products: compressed as Product[],
      timestamp: Date.now(),
      version: '2.0.0',
    };
    safeSetLocalStorage(CATALOG_CACHE_KEY, JSON.stringify(cachePayload));
    safeSetLocalStorage(CATALOG_TIMESTAMP_KEY, String(Date.now()));
  } catch (err) {
    console.debug('[CatalogCache] Gravação secundária LocalStorage omitida:', err);
  }
}

/**
 * Mescla o estoque em tempo real do MobLink ERP com os produtos armazenados no cache local
 */
export function mergeStockIntoCachedProducts(
  cachedProducts: Product[],
  liveStockMap: Map<string, number>,
): Product[] {
  if (!Array.isArray(cachedProducts)) return [];
  if (!liveStockMap || liveStockMap.size === 0) return cachedProducts;

  return cachedProducts.map((prod) => {
    const rawId = String(prod.id || prod.moblinkId || '').trim();
    const cleanId = rawId.replace(/^MOB-/i, '');

    const liveStock =
      liveStockMap.get(rawId) ??
      liveStockMap.get(cleanId) ??
      liveStockMap.get(`MOB-${cleanId}`);

    if (liveStock !== undefined) {
      return {
        ...prod,
        stock: liveStock,
        saldo_loja: liveStock,
      };
    }

    return prod;
  });
}
