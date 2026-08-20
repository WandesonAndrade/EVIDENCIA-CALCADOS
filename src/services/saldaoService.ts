import { Product, SaldaoConfig } from '../types';
import { isNonFootwearProduct } from './moblinkProductsService';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const DEFAULT_SALDAO_CONFIG: SaldaoConfig = {
  enabled: true,
  maxStock: 2,
  discountPercent: 20,
  bannerText: '🔥 SALDÃO DE CALÇADOS - ÚLTIMAS UNIDADES COM DESCONTO EXCLUSIVO!',
  updatedAt: new Date().toISOString(),
};

/**
 * Carrega as configurações do Saldão de Calçados do localStorage ou Firebase Firestore
 */
export async function loadSaldaoConfig(): Promise<SaldaoConfig> {
  const localSaved = localStorage.getItem('evidencia_saldao_config');
  let config: SaldaoConfig = DEFAULT_SALDAO_CONFIG;

  if (localSaved) {
    try {
      config = { ...DEFAULT_SALDAO_CONFIG, ...JSON.parse(localSaved) };
    } catch (e) {
      console.warn('[SaldaoService] Erro ao ler config local do Saldão:', e);
    }
  }

  try {
    const docRef = doc(db, 'settings', 'saldao');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const remoteData = snap.data() as Partial<SaldaoConfig>;
      config = { ...config, ...remoteData };
      localStorage.setItem('evidencia_saldao_config', JSON.stringify(config));
    }
  } catch (err) {
    console.warn('[SaldaoService] Erro ao carregar config do Saldão no Firestore:', err);
  }

  return config;
}

/**
 * Salva as configurações do Saldão no localStorage e Firebase Firestore
 */
export async function saveSaldaoConfig(newConfig: SaldaoConfig): Promise<SaldaoConfig> {
  const updated: SaldaoConfig = {
    ...newConfig,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem('evidencia_saldao_config', JSON.stringify(updated));

  try {
    const docRef = doc(db, 'settings', 'saldao');
    await setDoc(docRef, updated, { merge: true });
    console.log('[SaldaoService] Configurações do Saldão salvas com sucesso no Firestore:', updated);
  } catch (err) {
    console.warn('[SaldaoService] Erro ao salvar config do Saldão no Firestore:', err);
  }

  return updated;
}

/**
 * Verifica se um produto é elegível para o Saldão de Calçados
 */
export function isSaldaoProduct(product: Product, config: SaldaoConfig): boolean {
  if (!config || !config.enabled) return false;
  if (!product || !product.visible) return false;

  // Deve ser um calçado (não bolsa, cinto, viagem, confecção, etc.)
  if (isNonFootwearProduct(product)) return false;

  // Verifica o estoque total disponível do produto
  const totalStock = Number(
    product.stock ?? 
    product.saldo_loja ?? 
    product.moblinkStock ?? 
    (product.stockBySize ? Object.values(product.stockBySize).reduce((a, b) => a + Number(b), 0) : 0)
  );

  // Deve ter estoque baixo registrado (maior que zero e menor ou igual ao limite configurado pelo admin)
  if (totalStock <= 0 || totalStock > config.maxStock) {
    return false;
  }

  return true;
}

/**
 * Retorna as informações financeiras recalculadas do produto quando está no Saldão
 */
export function getSaldaoProductPrice(product: Product, config: SaldaoConfig): {
  isSaldao: boolean;
  price: number;
  originalPrice: number;
  discountPercent: number;
  savedAmount: number;
} {
  const basePrice = Number(product.price || product.preco_venda || 0);

  if (!isSaldaoProduct(product, config) || basePrice <= 0) {
    const promo = Number(product.promoPrice || product.preco_promocao || 0);
    const effective = promo > 0 && promo < basePrice ? promo : basePrice;
    return {
      isSaldao: false,
      price: effective,
      originalPrice: basePrice,
      discountPercent: promo > 0 && promo < basePrice ? Math.round(((basePrice - promo) / basePrice) * 100) : 0,
      savedAmount: promo > 0 && promo < basePrice ? basePrice - promo : 0,
    };
  }

  const discountPercent = Math.min(Math.max(Number(config.discountPercent) || 0, 0), 90);
  const discountFactor = 1 - (discountPercent / 100);
  const calculatedPrice = Math.round(basePrice * discountFactor * 100) / 100;
  const savedAmount = Math.round((basePrice - calculatedPrice) * 100) / 100;

  return {
    isSaldao: true,
    price: calculatedPrice,
    originalPrice: basePrice,
    discountPercent,
    savedAmount,
  };
}
