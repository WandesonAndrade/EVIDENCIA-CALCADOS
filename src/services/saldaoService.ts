import { Product, SaldaoConfig } from '../types';
import { isNonFootwearProduct } from './moblinkProductsService';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const DEFAULT_SALDAO_CONFIG: SaldaoConfig = {
  enabled: true,
  maxStock: 2,
  discountPercent: 20,
  discountPercentVista: 20,
  discountPercentPrazo: 10,
  bannerText: 'SALDÃO DE CALÇADOS - ÚLTIMAS UNIDADES COM DESCONTO EXCLUSIVO!',
  tagLabel: 'SALDÃO',
  tagColor: '#FF4500',
  tagColorEnd: '#FFA000',
  tagTextColor: '#FFFFFF',
  tagBgPreset: 'orange',
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
 * Suporta descontos diferenciados para À Vista (Pix/Dinheiro) e A Prazo (Cartão/Crediário).
 */
export function getSaldaoProductPrice(product: Product, config: SaldaoConfig): {
  isSaldao: boolean;
  price: number;              // Preço efetivo / a prazo (base para cartões e crediário)
  priceVista: number;         // Preço com desconto especial à vista (Pix)
  pricePrazo: number;         // Preço com desconto especial a prazo (Cartão/Crediário)
  originalPrice: number;      // Preço original de tabela
  discountPercent: number;    // Maior desconto aplicado
  discountPercentVista: number; // Porcentagem de desconto à vista
  discountPercentPrazo: number; // Porcentagem de desconto a prazo
  savedAmount: number;
  savedAmountVista: number;
  savedAmountPrazo: number;
} {
  const basePrice = Number(product.price || product.preco_venda || 0);

  if (!isSaldaoProduct(product, config) || basePrice <= 0) {
    const promo = Number(product.promoPrice || product.preco_promocao || 0);
    const effective = promo > 0 && promo < basePrice ? promo : basePrice;
    const discount = promo > 0 && promo < basePrice ? Math.round(((basePrice - promo) / basePrice) * 100) : 0;
    const saved = promo > 0 && promo < basePrice ? basePrice - promo : 0;
    return {
      isSaldao: false,
      price: effective,
      priceVista: effective,
      pricePrazo: effective,
      originalPrice: basePrice,
      discountPercent: discount,
      discountPercentVista: discount,
      discountPercentPrazo: discount,
      savedAmount: saved,
      savedAmountVista: saved,
      savedAmountPrazo: saved,
    };
  }

  // Descontos configurados para à vista e a prazo (com fallback seguro para discountPercent)
  const fallback = Number(config.discountPercent) || 20;
  const discountPercentVista = Math.min(Math.max(Number(config.discountPercentVista ?? fallback) || 0, 0), 90);
  const discountPercentPrazo = Math.min(Math.max(Number(config.discountPercentPrazo ?? fallback) || 0, 0), 90);

  const priceVista = Math.round(basePrice * (1 - (discountPercentVista / 100)) * 100) / 100;
  const pricePrazo = Math.round(basePrice * (1 - (discountPercentPrazo / 100)) * 100) / 100;

  const savedAmountVista = Math.round((basePrice - priceVista) * 100) / 100;
  const savedAmountPrazo = Math.round((basePrice - pricePrazo) * 100) / 100;

  return {
    isSaldao: true,
    price: pricePrazo, // preço base / parcelado
    priceVista,
    pricePrazo,
    originalPrice: basePrice,
    discountPercent: Math.max(discountPercentVista, discountPercentPrazo),
    discountPercentVista,
    discountPercentPrazo,
    savedAmount: savedAmountVista,
    savedAmountVista,
    savedAmountPrazo,
  };
}
