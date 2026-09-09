import { Product } from '../../../types';
import { extractBaseNameAndVariant } from '../../../services/moblinkProductsService';
import { normalizeCategoryName, normalizeSubcategoryName, isProductInCategory } from '../../../services/moblinkCategoriesService';
import { hasProductValidPhoto } from '../../../utils/photoUtils';

/**
 * Remove acentos e normaliza texto para busca insensível
 */
export function normalizeSearchTerm(str: string = ''): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Extrai o código do grupo pai da classificação ERP (ex: "001" de "001.002")
 */
export function getParentClassificationCode(classificacao?: string | number): string {
  if (!classificacao) return '';
  const clean = String(classificacao).replace(/\s+/g, '').trim();
  if (!clean) return '';
  const parts = clean.split('.');
  return parts[0] ? parts[0].trim() : '';
}

/**
 * Verifica se um produto atende a uma consulta de busca por texto livre (nome, modelo base, SKU, ID, marca, etc.)
 * Essa lógica unificada replica a precisão do painel administrativo.
 */
export function matchProductSearch(item: Product | any, searchQuery: string): boolean {
  if (!searchQuery || !searchQuery.trim()) return true;

  const rawQuery = searchQuery.trim();
  const query = normalizeSearchTerm(rawQuery);
  const rawName = String(item.name || item.nome || item.descricao || '');
  const normName = normalizeSearchTerm(rawName);

  // 1. Nome direto do produto
  if (normName.includes(query)) return true;

  // 2. Modelo Base (ex: "Sound Kids" extraído de "TENIS SOUND KIDS PRETO/VERM")
  try {
    const { baseName } = extractBaseNameAndVariant(rawName);
    if (normalizeSearchTerm(baseName).includes(query)) return true;
  } catch {
    // Fallback silencioso
  }

  // 3. Identificadores SKU, ID MobLink e ID do Firestore
  const sku = normalizeSearchTerm(String(item.sku || ''));
  if (sku && sku.includes(query)) return true;

  const mobId = normalizeSearchTerm(String(item.id || item.moblinkId || ''));
  if (mobId && mobId.includes(query)) return true;

  // 4. Códigos de Referência Pai / Modelo / Barcode
  const modelCode = normalizeSearchTerm(String(item.modelCode || item.referenceCode || item.referencia || ''));
  if (modelCode && modelCode.includes(query)) return true;

  const barcode = normalizeSearchTerm(String(item.barcode || ''));
  if (barcode && barcode.includes(query)) return true;

  // 5. Marca do Produto
  const brand = normalizeSearchTerm(String(item.brand || item.marca || ''));
  if (brand && brand.includes(query)) return true;

  // 6. Descrição e Categorias
  const desc = normalizeSearchTerm(String(item.description || item.compl_descr || item.descricao_completa || ''));
  if (desc && desc.includes(query)) return true;

  const category = normalizeSearchTerm(String(item.category || item.categoria || item.nome_grupo || ''));
  if (category && category.includes(query)) return true;

  const subcategory = normalizeSearchTerm(String(item.subcategory || item.subcategoria || item.nome_subgrupo || ''));
  if (subcategory && subcategory.includes(query)) return true;

  // 7. Código de classificação ERP direto
  const classCode = String(item.classificacao || '').trim();
  if (classCode && classCode.includes(query)) return true;

  // 8. Cor
  const color = normalizeSearchTerm(String(item.color || item.cor || ''));
  if (color && color.includes(query)) return true;

  // 9. Numeração / Tamanho (ex: buscar "37" ou "tam 37")
  if (/^\d{2}$/.test(rawQuery)) {
    const sizeQuery = rawQuery;
    if (Array.isArray(item.sizes) && item.sizes.some((s: any) => String(s).trim() === sizeQuery)) {
      return true;
    }
    if (item.stockBySize && (item.stockBySize[sizeQuery] ?? 0) > 0) {
      return true;
    }
    if (item.sizeStockMap && (item.sizeStockMap[sizeQuery] ?? 0) > 0) {
      return true;
    }
  }

  // 10. Busca multi-palavras / tokens (ex: "tenis olympikus", "rasteira 37")
  const tokens = query.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    const fullText = `${normName} ${sku} ${mobId} ${modelCode} ${brand} ${desc} ${category} ${subcategory} ${color}`;
    const allTokensMatch = tokens.every((token) => {
      if (/^\d{2}$/.test(token)) {
        const sizeMatches = (Array.isArray(item.sizes) && item.sizes.some((s: any) => String(s).trim() === token)) ||
          (item.stockBySize && (item.stockBySize[token] ?? 0) > 0) ||
          (item.sizeStockMap && (item.sizeStockMap[token] ?? 0) > 0);
        if (sizeMatches) return true;
      }
      return fullText.includes(token);
    });
    if (allTokensMatch) return true;
  }

  return false;
}

/**
 * Validação de Categoria com suporte à taxonomia ERP e Firestore
 */
export function matchProductCategory(
  product: Product,
  selectedCategory: string,
  dbCategories: any[] = []
): boolean {
  if (!selectedCategory || selectedCategory === 'TODOS' || selectedCategory === 'Todos') {
    return true;
  }

  const target = selectedCategory.trim().toUpperCase();
  let targetCode = '';

  const matchedCat = (dbCategories || []).find(
    (c) =>
      c.id === target ||
      (c.code && c.code === target) ||
      c.name.toUpperCase().trim() === target ||
      normalizeCategoryName(c.name).toUpperCase().trim() === normalizeCategoryName(target)
  );

  if (matchedCat) {
    targetCode = matchedCat.code || matchedCat.id;
  } else if (/^\d+$/.test(target)) {
    targetCode = target;
  }

  const pParentCode = getParentClassificationCode(product.classificacao);
  if (targetCode && pParentCode && pParentCode === targetCode) {
    return true;
  }

  return isProductInCategory(product, selectedCategory);
}

/**
 * Validação de Subcategoria com normalização flexível
 */
export function matchProductSubcategory(
  product: Product,
  selectedSubcategory: string
): boolean {
  if (!selectedSubcategory || selectedSubcategory === 'TODAS' || selectedSubcategory === 'TODOS' || selectedSubcategory === 'Todas') {
    return true;
  }

  const targetSub = selectedSubcategory.trim().toUpperCase();
  const normTargetSub = normalizeSubcategoryName(targetSub).toUpperCase();

  const subgrupoRaw = String(product.nome_subgrupo || product.subcategory || '').toUpperCase().trim();
  const normSubRaw = normalizeSubcategoryName(subgrupoRaw).toUpperCase();
  const nameRaw = String(product.name || '').toUpperCase();

  return subgrupoRaw.includes(targetSub) || normSubRaw.includes(normTargetSub) || nameRaw.includes(targetSub);
}

export interface StorefrontFilterOptions {
  searchQuery?: string;
  selectedCategory?: string;
  selectedSubcategory?: string;
  sortBy?: 'relevant' | 'price-asc' | 'price-desc' | 'launches';
  dbCategories?: any[];
}

/**
 * Executa a filtragem completa dos produtos para a vitrine/loja com verificação de estoque e fotos reais
 */
export function filterStorefrontProducts(
  products: Product[] = [],
  options: StorefrontFilterOptions = {}
): Product[] {
  const {
    searchQuery = '',
    selectedCategory = 'TODOS',
    selectedSubcategory = 'TODAS',
    sortBy = 'relevant',
    dbCategories = [],
  } = options;

  const filtered = products.filter((prod) => {
    if (!prod) return false;

    // Regra rígida do e-commerce: apenas produtos visíveis, com estoque real e foto válida
    const isAvailable = prod.stock !== undefined ? prod.stock > 0 : (prod.saldo_loja ?? 0) > 0;
    if (!prod.visible || !isAvailable || !hasProductValidPhoto(prod)) {
      return false;
    }

    // Busca textual inteligente (nome, modelo base, SKU, marca, etc.)
    if (!matchProductSearch(prod, searchQuery)) {
      return false;
    }

    // Filtro de Categoria
    if (!matchProductCategory(prod, selectedCategory, dbCategories)) {
      return false;
    }

    // Filtro de Subcategoria
    if (!matchProductSubcategory(prod, selectedSubcategory)) {
      return false;
    }

    return true;
  });

  // Ordenação dos itens resultantes
  if (sortBy === 'price-asc') {
    return filtered.sort((a, b) => a.price - b.price);
  }
  if (sortBy === 'price-desc') {
    return filtered.sort((a, b) => b.price - a.price);
  }
  if (sortBy === 'launches') {
    return filtered.sort((a, b) => (b.newArrival ? 1 : 0) - (a.newArrival ? 1 : 0));
  }

  return filtered;
}
