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
      if (item.selectedSize !== undefined && item.selectedSize !== null && item.selectedSize !== '') {
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

    if (item.selectedSize !== undefined && item.selectedSize !== null && item.selectedSize !== '') {
      processed.selectedSize = String(item.selectedSize);
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

    if (item.selectedSize !== undefined && item.selectedSize !== null && item.selectedSize !== '') {
      cleanItem.selectedSize = String(item.selectedSize);
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
