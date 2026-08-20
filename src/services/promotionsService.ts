import { db } from '../lib/firebase';
import { collection, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { Product, PromoCampaign } from '../types';

export const PROMOTIONS_COLLECTION = 'promotions';
export const PROMOTIONS_LOCAL_STORAGE_KEY = 'evidencia_promotions_cache';

export const DEFAULT_PROMOTIONS: PromoCampaign[] = [];

/**
 * Carrega promoções salvas no localStorage como fallback rápido
 */
export const loadPromotionsFromLocalStorage = (): PromoCampaign[] => {
  if (typeof window === 'undefined') return DEFAULT_PROMOTIONS;
  try {
    const cached = localStorage.getItem(PROMOTIONS_LOCAL_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (error) {
    console.warn('[PromotionsService] Erro ao carregar promoções do localStorage:', error);
  }
  return DEFAULT_PROMOTIONS;
};

/**
 * Salva a lista de promoções no localStorage
 */
export const savePromotionsToLocalStorage = (promotions: PromoCampaign[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROMOTIONS_LOCAL_STORAGE_KEY, JSON.stringify(promotions));
  } catch (error) {
    console.warn('[PromotionsService] Erro ao salvar promoções no localStorage:', error);
  }
};

/**
 * Salva ou atualiza uma promoção no Firestore e no cache local
 */
export const savePromotionToFirestore = async (campaign: PromoCampaign): Promise<PromoCampaign> => {
  const updatedCampaign: PromoCampaign = {
    ...campaign,
    updatedAt: new Date().toISOString(),
    createdAt: campaign.createdAt || new Date().toISOString(),
  };

  try {
    const ref = doc(db, PROMOTIONS_COLLECTION, updatedCampaign.id);
    await setDoc(ref, updatedCampaign, { merge: true });
  } catch (error) {
    console.warn('[PromotionsService] Firestore sem permissão, mantendo salvamento local:', error);
  }

  // Atualiza cache local
  const currentList = loadPromotionsFromLocalStorage();
  const index = currentList.findIndex(p => p.id === updatedCampaign.id);
  if (index > -1) {
    currentList[index] = updatedCampaign;
  } else {
    currentList.unshift(updatedCampaign);
  }
  savePromotionsToLocalStorage(currentList);

  return updatedCampaign;
};

/**
 * Deleta uma promoção do Firestore e do cache local
 */
export const deletePromotionFromFirestore = async (campaignId: string): Promise<void> => {
  try {
    const ref = doc(db, PROMOTIONS_COLLECTION, campaignId);
    await deleteDoc(ref);
  } catch (error) {
    console.warn('[PromotionsService] Erro ao deletar no Firestore:', error);
  }

  const currentList = loadPromotionsFromLocalStorage();
  const updated = currentList.filter(p => p.id !== campaignId);
  savePromotionsToLocalStorage(updated);
};

/**
 * Parse seguro de string de data ("YYYY-MM-DD" ou ISO) para Date no fuso horário local
 */
export const parseLocalDate = (dateStr: string, isEndOfDay = false): Date | null => {
  if (!dateStr) return null;

  try {
    const cleanStr = dateStr.trim();
    // Se for no formato simples "YYYY-MM-DD"
    if (cleanStr.length === 10 && cleanStr.includes('-')) {
      const [year, month, day] = cleanStr.split('-').map(Number);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        if (isEndOfDay) {
          return new Date(year, month - 1, day, 23, 59, 59, 999);
        }
        return new Date(year, month - 1, day, 0, 0, 0, 0);
      }
    }

    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      if (isEndOfDay && dateStr.length <= 10) {
        d.setHours(23, 59, 59, 999);
      }
      return d;
    }
  } catch (err) {
    console.warn('[PromotionsService] Erro ao converter data:', dateStr, err);
  }

  return null;
};

/**
 * Determina o status atual da campanha promocional:
 * - 'disabled': desativada pelo administrador
 * - 'scheduled': agendada para o futuro (startDate > agora)
 * - 'expired': vencida (endDate < agora)
 * - 'active': ativa e dentro do período de vigência
 */
export const getCampaignStatus = (campaign: PromoCampaign): 'disabled' | 'scheduled' | 'expired' | 'active' => {
  if (!campaign.active) return 'disabled';

  const now = new Date();
  
  if (campaign.startDate) {
    const start = parseLocalDate(campaign.startDate, false);
    if (start && now < start) {
      return 'scheduled';
    }
  }

  if (campaign.endDate) {
    const end = parseLocalDate(campaign.endDate, true);
    if (end && now > end) {
      return 'expired';
    }
  }

  return 'active';
};

/**
 * Verifica se a promoção está estritamente ativa e em vigência
 */
export const isCampaignActive = (campaign: PromoCampaign): boolean => {
  return getCampaignStatus(campaign) === 'active';
};

/**
 * Calcula o preço promocional de um produto para uma campanha específica
 */
export const calculateCampaignPrice = (originalPrice: number, campaign: PromoCampaign): number => {
  if (originalPrice <= 0) return 0;

  if (campaign.discountType === 'percentage') {
    const percent = Math.min(100, Math.max(0, campaign.discountValue));
    const discounted = originalPrice * (1 - percent / 100);
    return Math.round(discounted * 100) / 100;
  } else {
    // Desconto em valor fixo R$
    const discounted = Math.max(0, originalPrice - campaign.discountValue);
    return Math.round(discounted * 100) / 100;
  }
};

/**
 * Retorna a melhor promoção ativa aplicável ao produto (se houver)
 */
export const getApplicablePromotion = (product: Product, promotions: PromoCampaign[]): {
  campaign: PromoCampaign;
  promoPrice: number;
  discountLabel: string;
  originalPrice: number;
} | null => {
  if (!product || !promotions || !Array.isArray(promotions) || promotions.length === 0) return null;

  const prodIdStr = String(product.id || '').trim();
  const mobIdStr = product.moblinkId ? String(product.moblinkId).trim() : '';

  // Filtra apenas campanhas ativas que incluem este produto
  const activeMatchingCampaigns = promotions.filter(c => {
    if (!isCampaignActive(c)) return false;
    if (!Array.isArray(c.productIds) || c.productIds.length === 0) return false;
    
    return c.productIds.some(id => {
      const sId = String(id).trim();
      return (prodIdStr !== '' && sId === prodIdStr) || (mobIdStr !== '' && sId === mobIdStr);
    });
  });

  if (activeMatchingCampaigns.length === 0) return null;

  // Ordena para selecionar a promoção que oferece o menor preço final
  const sorted = [...activeMatchingCampaigns].sort((a, b) => {
    const priceA = calculateCampaignPrice(product.price, a);
    const priceB = calculateCampaignPrice(product.price, b);
    return priceA - priceB;
  });

  const chosenCampaign = sorted[0];
  const originalBasePrice = product.price;
  const promoPrice = calculateCampaignPrice(originalBasePrice, chosenCampaign);

  const discountLabel = chosenCampaign.discountType === 'percentage'
    ? `-${chosenCampaign.discountValue}%`
    : `-R$ ${chosenCampaign.discountValue.toFixed(2).replace('.', ',')}`;

  return {
    campaign: chosenCampaign,
    promoPrice,
    discountLabel,
    originalPrice: originalBasePrice,
  };
};
