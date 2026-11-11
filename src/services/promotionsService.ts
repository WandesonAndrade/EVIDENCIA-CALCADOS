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
 * Calcula o preço promocional de um produto para uma campanha específica.
 * Suporta o tipo 'vista' (À Vista), 'prazo' (A Prazo) ou 'default'.
 */
export const calculateCampaignPrice = (
  originalPrice: number,
  campaign: PromoCampaign,
  targetMode: 'vista' | 'prazo' | 'default' = 'default'
): number => {
  if (originalPrice <= 0) return 0;

  const fallback = Number(campaign.discountValue) || 0;
  let val = fallback;

  if (targetMode === 'vista') {
    val = campaign.discountValueVista !== undefined ? Number(campaign.discountValueVista) : fallback;
  } else if (targetMode === 'prazo') {
    val = campaign.discountValuePrazo !== undefined ? Number(campaign.discountValuePrazo) : fallback;
  }

  if (campaign.discountType === 'percentage') {
    const percent = Math.min(100, Math.max(0, val));
    const discounted = originalPrice * (1 - percent / 100);
    return Math.round(discounted * 100) / 100;
  } else {
    // Desconto em valor fixo R$
    const discounted = Math.max(0, originalPrice - val);
    return Math.round(discounted * 100) / 100;
  }
};

/**
 * Retorna os rótulos de desconto para à vista e a prazo de uma campanha
 */
export const getCampaignDiscountLabels = (campaign: PromoCampaign): {
  vistaLabel: string;
  prazoLabel: string;
  generalLabel: string;
} => {
  const isPercent = campaign.discountType === 'percentage';
  const fallback = Number(campaign.discountValue) || 0;
  const valVista = campaign.discountValueVista !== undefined ? Number(campaign.discountValueVista) : fallback;
  const valPrazo = campaign.discountValuePrazo !== undefined ? Number(campaign.discountValuePrazo) : fallback;

  const formatVal = (v: number) => isPercent ? `${v}%` : `R$ ${v.toFixed(2).replace('.', ',')}`;

  const vistaLabel = isPercent ? `-${valVista}%` : `-R$ ${valVista.toFixed(2).replace('.', ',')}`;
  const prazoLabel = isPercent ? `-${valPrazo}%` : `-R$ ${valPrazo.toFixed(2).replace('.', ',')}`;

  const generalLabel = valVista !== valPrazo
    ? `${formatVal(valVista)} À Vista • ${formatVal(valPrazo)} A Prazo`
    : `${formatVal(valVista)} OFF`;

  return { vistaLabel, prazoLabel, generalLabel };
};

export interface ApplicablePromotionResult {
  campaign: PromoCampaign;
  promoPrice: number;            // Preço a prazo / base para parcelamento
  priceVista: number;            // Preço especial à vista (Pix)
  pricePrazo: number;            // Preço especial a prazo (Cartão/Crediário)
  originalPrice: number;
  discountLabel: string;         // Rótulo geral ou do maior desconto
  discountLabelVista: string;
  discountLabelPrazo: string;
  tagLabel: string;
  tagColor?: string;
  tagColorEnd?: string;
  tagTextColor?: string;
}

/**
 * Retorna o estoque total disponível do produto (saldo em unidades)
 */
export const getProductTotalStock = (product: Product): number => {
  if (!product) return 0;
  const anyP = product as any;
  if (anyP.tamanhos_estoque && typeof anyP.tamanhos_estoque === 'object') {
    const sum: number = Object.values(anyP.tamanhos_estoque).reduce(
      (acc: number, val: any) => acc + (Number(val) || 0),
      0
    ) as number;
    if (sum > 0) return sum;
  }
  return Number(
    product.stock ?? 
    product.saldo_loja ?? 
    product.moblinkStock ?? 
    (product.stockBySize ? Object.values(product.stockBySize).reduce((a: number, b: any) => a + Number(b), 0) : 0)
  );
};

/**
 * Retorna a melhor promoção ativa aplicável ao produto (se houver)
 */
export const getApplicablePromotion = (
  product: Product,
  promotions: PromoCampaign[]
): ApplicablePromotionResult | null => {
  if (!product || !promotions || !Array.isArray(promotions) || promotions.length === 0) return null;

  const prodIdStr = String(product.id || '').trim();
  const mobIdStr = product.moblinkId ? String(product.moblinkId).trim() : '';

  // Filtra apenas campanhas ativas que incluem este produto
  const activeMatchingCampaigns = promotions.filter(c => {
    if (!isCampaignActive(c)) return false;

    // Se a campanha tiver limite de saldo / estoque máximo configurado (como no Saldão)
    if (c.maxStock !== undefined && c.maxStock !== null && Number(c.maxStock) > 0) {
      const stock = getProductTotalStock(product);
      if (stock <= 0 || stock > Number(c.maxStock)) {
        return false;
      }
    }

    const hasSpecificProducts = Array.isArray(c.productIds) && c.productIds.length > 0;
    if (hasSpecificProducts) {
      return c.productIds.some(id => {
        const sId = String(id).trim();
        return (prodIdStr !== '' && sId === prodIdStr) || (mobIdStr !== '' && sId === mobIdStr);
      });
    }

    // Se não tiver productIds definidos, mas tiver maxStock configurado (modo automático por saldo, igual ao Saldão)
    if (c.maxStock !== undefined && c.maxStock !== null && Number(c.maxStock) > 0) {
      return true;
    }

    return false;
  });

  if (activeMatchingCampaigns.length === 0) return null;

  // Ordena para selecionar a promoção que oferece o menor preço final à vista
  const sorted = [...activeMatchingCampaigns].sort((a, b) => {
    const priceA = calculateCampaignPrice(product.price, a, 'vista');
    const priceB = calculateCampaignPrice(product.price, b, 'vista');
    return priceA - priceB;
  });

  const chosenCampaign = sorted[0];
  const originalBasePrice = product.price;
  const priceVista = calculateCampaignPrice(originalBasePrice, chosenCampaign, 'vista');
  const pricePrazo = calculateCampaignPrice(originalBasePrice, chosenCampaign, 'prazo');
  const labels = getCampaignDiscountLabels(chosenCampaign);

  const tagLabel = chosenCampaign.tagLabel?.trim() || chosenCampaign.headerLabel?.trim() || 'OFERTA';

  return {
    campaign: chosenCampaign,
    promoPrice: pricePrazo, // compatibilidade com código existente que consome promoPrice
    priceVista,
    pricePrazo,
    originalPrice: originalBasePrice,
    discountLabel: labels.vistaLabel,
    discountLabelVista: labels.vistaLabel,
    discountLabelPrazo: labels.prazoLabel,
    tagLabel,
    tagColor: chosenCampaign.tagColor,
    tagColorEnd: chosenCampaign.tagColorEnd,
    tagTextColor: chosenCampaign.tagTextColor,
  };
};
