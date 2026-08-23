import { Product } from '../types';

const CATALOG_CACHE_KEY = 'evidencia_catalog_cache_v2';
const CATALOG_TIMESTAMP_KEY = 'evidencia_catalog_cache_timestamp';

export interface CatalogCacheData {
  products: Product[];
  timestamp: number;
  version: string;
}

/**
 * Obtém o catálogo salvo no cache do navegador do cliente
 */
export function getCachedCatalog(): Product[] | null {
  if (typeof localStorage === 'undefined') return null;

  try {
    const rawData = localStorage.getItem(CATALOG_CACHE_KEY);
    if (!rawData) return null;

    const parsed: CatalogCacheData = JSON.parse(rawData);
    if (Array.isArray(parsed.products) && parsed.products.length > 0) {
      console.log(`⚡ [CatalogCache] Catálogo carregado do cache do navegador (${parsed.products.length} produtos). Zero leituras no Firebase.`);
      return parsed.products;
    }
  } catch (err) {
    console.warn('[CatalogCache] Erro ao ler cache local:', err);
  }

  return null;
}

/**
 * Salva o catálogo enriquecido com fotos do Supabase no cache local do navegador
 */
export function setCachedCatalog(products: Product[]): void {
  if (typeof localStorage === 'undefined' || !Array.isArray(products) || products.length === 0) return;

  try {
    const cachePayload: CatalogCacheData = {
      products,
      timestamp: Date.now(),
      version: '2.0.0',
    };
    localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(cachePayload));
    localStorage.setItem(CATALOG_TIMESTAMP_KEY, String(Date.now()));
    console.log(`💾 [CatalogCache] Catálogo atualizado no cache do navegador (${products.length} itens).`);
  } catch (err) {
    console.warn('[CatalogCache] Erro ao salvar no cache local:', err);
  }
}

/**
 * Mescla o estoque em tempo real do MobLink ERP com os produtos armazenados no cache local
 */
export function mergeStockIntoCachedProducts(cachedProducts: Product[], liveStockMap: Map<string, number>): Product[] {
  if (!Array.isArray(cachedProducts)) return [];
  if (!liveStockMap || liveStockMap.size === 0) return cachedProducts;

  return cachedProducts.map(prod => {
    const rawId = String(prod.id || prod.moblinkId || '').trim();
    const cleanId = rawId.replace(/^MOB-/i, '');

    const liveStock = liveStockMap.get(rawId) ?? liveStockMap.get(cleanId) ?? liveStockMap.get(`MOB-${cleanId}`);

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
