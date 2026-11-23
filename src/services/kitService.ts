import { db } from '../lib/firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { KitProduct, KitItemComponent, Product } from '../types';

export const KITS_COLLECTION = 'kits';

/**
 * Calcula o estoque disponível de um Kit baseado no estoque dos produtos componentes.
 * Regra:
 *  - Se o item tem tamanho fixo (selectedSize), busca em stockBySize / sizeStockMap.
 *  - Caso contrário, busca em product.stock (ou saldo_loja).
 *  - Estoque do Kit = menor floor(estoqueDisponível / quantidadeNecessária) entre todos os itens.
 *  - Se algum produto não existir ou tiver estoque insuficiente para formar ao menos 1 kit, retorna 0.
 */
export function computeKitStock(
  kit: KitProduct,
  productsMap: Map<string, Product> | Record<string, Product>
): {
  stock: number;
  itemDetails: Array<{
    productId: string;
    productName: string;
    requiredQty: number;
    availableStock: number;
    possibleKits: number;
    size?: string | number;
    hasStock: boolean;
  }>;
} {
  if (!kit.items || kit.items.length === 0) {
    return { stock: 0, itemDetails: [] };
  }

  const getProduct = (id: string): Product | undefined => {
    if (productsMap instanceof Map) {
      return productsMap.get(id);
    }
    return productsMap[id];
  };

  const itemDetails: Array<{
    productId: string;
    productName: string;
    requiredQty: number;
    availableStock: number;
    possibleKits: number;
    size?: string | number;
    hasStock: boolean;
  }> = [];

  let minKits = Infinity;

  for (const item of kit.items) {
    const prod = getProduct(item.productId);
    const requiredQty = item.quantity > 0 ? item.quantity : 1;
    let availableStock = 0;

    if (prod) {
      if (!item.allowCustomerSize && item.selectedSize !== undefined && item.selectedSize !== null && item.selectedSize !== '') {
        const sizeKey = String(item.selectedSize);
        // Se o produto possui grade ou mapa de tamanhos, o tamanho selecionado DEVE existir
        const hasSizeMaps = Boolean(prod.stockBySize || prod.sizeStockMap);
        const sizeStock = prod.stockBySize?.[sizeKey] ?? prod.sizeStockMap?.[sizeKey];
        if (typeof sizeStock === 'number') {
          availableStock = Math.max(0, sizeStock);
        } else if (hasSizeMaps) {
          // O produto gerencia tamanhos mas não possui este tamanho específico em estoque
          availableStock = 0;
        } else {
          availableStock = Math.max(0, prod.stock ?? prod.saldo_loja ?? 0);
        }
      } else {
        // Sem tamanho fixo ou com escolha livre de tamanho pelo cliente na vitrine
        availableStock = Math.max(0, prod.stock ?? prod.saldo_loja ?? 0);
      }
    }

    const possibleKits = Math.floor(availableStock / requiredQty);
    if (possibleKits < minKits) {
      minKits = possibleKits;
    }

    itemDetails.push({
      productId: item.productId,
      productName: prod?.name || item.productName || 'Produto não encontrado',
      requiredQty,
      availableStock,
      possibleKits,
      size: item.selectedSize,
      hasStock: possibleKits > 0
    });
  }

  const stock = minKits === Infinity ? 0 : Math.max(0, minKits);
  return { stock, itemDetails };
}

/**
 * Calcula os preços de um Kit baseado nos modos suportados:
 * - 'sum_with_discount': soma simples com desconto geral (%)
 * - 'item_discounts': cada produto tem seu desconto unitário (%) e o total é a soma deles
 * - 'fixed_price': valor final definido manualmente pelo admin
 */
export function calculateKitPricing(
  items: KitItemComponent[],
  pricingMode: KitProduct['pricingMode'],
  totalDiscountPercent: number = 0,
  manualFixedPrice: number = 0
): {
  originalTotal: number;
  finalPrice: number;
  totalDiscountAmount: number;
  effectiveDiscountPercent: number;
  processedItems: KitItemComponent[];
} {
  let originalTotal = 0;
  let discountedTotalFromItems = 0;

  const processedItems: KitItemComponent[] = items.map((item) => {
    const unitPrice = item.unitPrice || 0;
    const qty = item.quantity || 1;
    const subtotal = unitPrice * qty;
    originalTotal += subtotal;

    let itemDiscountPercent = item.itemDiscountPercent || 0;
    if (itemDiscountPercent < 0) itemDiscountPercent = 0;
    if (itemDiscountPercent > 100) itemDiscountPercent = 100;

    const discountAmount = subtotal * (itemDiscountPercent / 100);
    const itemPrice = Math.max(0, subtotal - discountAmount);
    discountedTotalFromItems += itemPrice;

    const processed: KitItemComponent = {
      productId: String(item.productId || ''),
      productName: item.productName || 'Produto',
      productImage: item.productImage || '',
      quantity: qty,
      unitPrice,
      itemDiscountPercent,
      itemPrice
    };

    if (item.allowCustomerSize) {
      processed.allowCustomerSize = true;
    }
    if (item.selectedSize !== undefined && item.selectedSize !== null && item.selectedSize !== '') {
      processed.selectedSize = String(item.selectedSize);
    }
    if (item.customerSelectedSize !== undefined && item.customerSelectedSize !== null && item.customerSelectedSize !== '') {
      processed.customerSelectedSize = String(item.customerSelectedSize);
    }

    return processed;
  });

  let finalPrice = 0;

  if (pricingMode === 'fixed_price') {
    finalPrice = Math.max(0, manualFixedPrice);
  } else if (pricingMode === 'item_discounts') {
    finalPrice = Math.max(0, discountedTotalFromItems);
  } else {
    // 'sum_with_discount' (padrão)
    let discount = totalDiscountPercent || 0;
    if (discount < 0) discount = 0;
    if (discount > 100) discount = 100;
    const discountAmount = originalTotal * (discount / 100);
    finalPrice = Math.max(0, originalTotal - discountAmount);
  }

  const totalDiscountAmount = Math.max(0, originalTotal - finalPrice);
  const effectiveDiscountPercent =
    originalTotal > 0 ? (totalDiscountAmount / originalTotal) * 100 : 0;

  return {
    originalTotal,
    finalPrice,
    totalDiscountAmount,
    effectiveDiscountPercent,
    processedItems
  };
}

/**
 * Remove recursivamente todas as propriedades com valor `undefined` de um objeto ou array,
 * evitando rejeição do Firestore ("Unsupported field value: undefined").
 */
export function removeUndefinedDeep<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => removeUndefinedDeep(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefinedDeep(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

/**
 * Sanitiza e prepara o payload de um Kit para gravação no Firestore,
 * garantindo valores padrão, tipos válidos e eliminando qualquer campo undefined.
 */
export function prepareKitPayloadForFirestore(
  kit: Partial<KitProduct> & { name: string; items?: KitItemComponent[] }
): KitProduct {
  const kitId = kit.id || `kit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const cleanedItems: KitItemComponent[] = (kit.items || []).map((item) => {
    const cleanItem: KitItemComponent = {
      productId: String(item.productId || ''),
      productName: item.productName || 'Produto',
      productImage: item.productImage || '',
      quantity: item.quantity > 0 ? item.quantity : 1,
      unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
      itemDiscountPercent: typeof item.itemDiscountPercent === 'number' ? item.itemDiscountPercent : 0,
      itemPrice: typeof item.itemPrice === 'number' ? item.itemPrice : 0
    };

    if (item.allowCustomerSize) {
      cleanItem.allowCustomerSize = true;
    }
    if (item.selectedSize !== undefined && item.selectedSize !== null && item.selectedSize !== '') {
      cleanItem.selectedSize = String(item.selectedSize);
    }
    if (item.customerSelectedSize !== undefined && item.customerSelectedSize !== null && item.customerSelectedSize !== '') {
      cleanItem.customerSelectedSize = String(item.customerSelectedSize);
    }

    return cleanItem;
  });

  const rawPayload: KitProduct = {
    id: kitId,
    name: (kit.name || '').trim(),
    description: (kit.description || '').trim(),
    images: Array.isArray(kit.images) ? kit.images.filter((img) => typeof img === 'string' && img.trim() !== '') : [],
    items: cleanedItems,
    pricingMode: kit.pricingMode || 'sum_with_discount',
    totalDiscountPercent: typeof kit.totalDiscountPercent === 'number' ? kit.totalDiscountPercent : 0,
    originalTotal: typeof kit.originalTotal === 'number' ? kit.originalTotal : 0,
    price: typeof kit.price === 'number' ? kit.price : 0,
    category: kit.category || 'Kits & Combos',
    subcategory: kit.subcategory || '',
    visible: kit.visible !== false,
    createdAt: kit.createdAt || now,
    updatedAt: now
  };

  return removeUndefinedDeep(rawPayload);
}

/**
 * Salva ou atualiza um Kit no Firestore na coleção `kits`
 */
export async function saveKit(kit: Partial<KitProduct> & { name: string; items: KitItemComponent[] }): Promise<string> {
  const payload = prepareKitPayloadForFirestore(kit);
  await setDoc(doc(db, KITS_COLLECTION, payload.id), payload, { merge: true });
  return payload.id;
}

/**
 * Converte um KitProduct em um objeto Product virtual para integração fluida com
 * a vitrine, busca, carrinhos, filtros e páginas de detalhe sem alterar o catálogo do ERP.
 */
export function kitToProduct(
  kit: KitProduct,
  productsMap: Map<string, Product> | Record<string, Product>
): Product {
  const stockResult = computeKitStock(kit, productsMap);
  const pricingResult = calculateKitPricing(
    kit.items || [],
    kit.pricingMode,
    kit.totalDiscountPercent,
    kit.price
  );

  let finalImages = (kit.images || []).filter((img) => typeof img === 'string' && img.trim() !== '');
  if (finalImages.length === 0) {
    const getProduct = (id: string): Product | undefined => {
      if (productsMap instanceof Map) return productsMap.get(id);
      return productsMap[id];
    };
    for (const item of kit.items || []) {
      const p = getProduct(item.productId);
      const itemImg = p?.images?.[0] || p?.imageUrl || (p as any)?.foto_uri || item.productImage;
      if (itemImg && !finalImages.includes(itemImg)) {
        finalImages.push(itemImg);
      }
    }
  }

  const finalPrice = pricingResult.finalPrice;
  const originalPrice = pricingResult.originalTotal > finalPrice ? pricingResult.originalTotal : undefined;

  return {
    id: kit.id,
    name: kit.name,
    description: kit.description || '',
    price: finalPrice,
    originalPrice,
    precoVista: finalPrice,
    preco_vista: finalPrice,
    precoCartao: finalPrice,
    preco_cartao: finalPrice,
    category: kit.category || 'Kits & Combos',
    subcategory: kit.subcategory || '',
    images: finalImages,
    stock: stockResult.stock,
    saldo_loja: stockResult.stock,
    stockControl: true,
    visible: kit.visible !== false,
    crediarioProprio: false,
    classificacao: 'KIT.001',
    isKit: true,
    kitItems: pricingResult.processedItems,
    kitPricingMode: kit.pricingMode,
    kitTotalDiscountPercent: kit.totalDiscountPercent,
    kitOriginalTotal: pricingResult.originalTotal,
    sizes: ['Kit'],
    createdAt: kit.createdAt,
    updatedAt: kit.updatedAt
  };
}

/**
 * Verifica se um produto ou identificador representa um Kit
 */
export function isKitProduct(item: any): boolean {
  if (!item) return false;
  return Boolean(item.isKit || String(item.id || '').toLowerCase().startsWith('kit_'));
}

/**
 * Formata o nome cru do produto vindo do ERP para um formato comercial elegante e legível (Title Case)
 * Ex: "MALA COM RODAS ALCAS 17 EMILY VICK COLLEGE 1 - 21110" -> { title: "Mala com Rodas e Alças 17 Emily Vick College 1", reference: "21110" }
 */
export function formatKitItemDisplayName(rawName: string = ''): { title: string; reference?: string } {
  if (!rawName) return { title: 'Produto' };

  let clean = rawName.trim();
  let reference: string | undefined = undefined;

  // Extrai código de referência no final (ex: " - 21110" ou " REF 1234")
  const refMatch = clean.match(/\s+[-/]\s*(\d{4,8})\b\s*$/i);
  if (refMatch) {
    reference = refMatch[1];
    clean = clean.replace(refMatch[0], '').trim();
  }

  // Se o nome estiver predominantemente em MAIÚSCULAS, converte para Title Case inteligente
  if (clean === clean.toUpperCase() && clean.length > 3) {
    const minorWords = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'com', 'para', 'por', 'sem', 'ou', 'a', 'o']);
    const specialTokens: Record<string, string> = {
      'alcas': 'Alças',
      'alca': 'Alça',
      'tenis': 'Tênis',
      'sandalia': 'Sandália',
      'sandalias': 'Sandálias',
      'calcado': 'Calçado',
      'calcados': 'Calçados',
      'lancheira': 'Lancheira',
      'estojo': 'Estojo',
      'mala': 'Mala',
      'mochila': 'Mochila',
      'bolsa': 'Bolsa',
      'box': 'Box',
      'college': 'College',
      'kids': 'Kids',
      'baby': 'Baby',
      'scarpin': 'Scarpin',
      'rasteira': 'Rasteira',
      'papete': 'Papete',
      'bota': 'Bota',
      'chinelo': 'Chinelo',
      'mocassim': 'Mocassim',
      'sapato': 'Sapato'
    };

    const words = clean.toLowerCase().split(/\s+/);
    const formattedWords = words.map((w, index) => {
      const lower = w.toLowerCase();
      if (specialTokens[lower]) {
        return specialTokens[lower];
      }
      if (index > 0 && minorWords.has(lower)) {
        return lower;
      }
      if (/^\d/.test(w)) {
        return w.toUpperCase();
      }
      return w.charAt(0).toUpperCase() + w.slice(1);
    });

    clean = formattedWords.join(' ');
  }

  return { title: clean, reference };
}

/**
 * Deleta um kit do Firestore
 */
export async function deleteKit(kitId: string): Promise<void> {
  if (!kitId) return;
  await deleteDoc(doc(db, KITS_COLLECTION, kitId));
}

/**
 * Atualiza status de visibilidade de um kit
 */
export async function toggleKitVisibility(kitId: string, visible: boolean): Promise<void> {
  if (!kitId) return;
  await setDoc(
    doc(db, KITS_COLLECTION, kitId),
    { visible, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}

/**
 * Lista todos os kits cadastrados
 */
export async function fetchAllKits(): Promise<KitProduct[]> {
  try {
    const q = query(collection(db, KITS_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as KitProduct));
  } catch (err) {
    console.warn('[kitService] Fallback na consulta sem ordenação:', err);
    const snapshot = await getDocs(collection(db, KITS_COLLECTION));
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as KitProduct));
  }
}

/**
 * Listener em tempo real para os kits
 */
export function subscribeToKits(callback: (kits: KitProduct[]) => void): () => void {
  const colRef = collection(db, KITS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const kits = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as KitProduct));
      callback(kits);
    },
    (error) => {
      console.error('[kitService] Erro no snapshot de kits:', error);
      callback([]);
    }
  );
}
