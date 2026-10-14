import { InstallmentDiscountConfig } from '../types';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const DEFAULT_INSTALLMENT_DISCOUNT_CONFIG: InstallmentDiscountConfig = {
  active: true,
  percentage: 10,
  cutoffHour: '22:00',
  bannerTitle: 'Desconto de Pontualidade Evidência',
  bannerSubtitle: 'Pague até a data do vencimento e economize na sua parcela!',
  financeWhatsApp: '5599984125572',
  updatedAt: new Date().toISOString(),
};

const LOCAL_STORAGE_KEY = 'evidencia_installment_discount_config';
const FIRESTORE_DOC_PATH = ['settings', 'installmentDiscount'] as const;

/**
 * Carrega a configuração do Desconto de Pontualidade do localStorage ou Firestore
 */
export async function loadInstallmentDiscountConfig(): Promise<InstallmentDiscountConfig> {
  let config: InstallmentDiscountConfig = DEFAULT_INSTALLMENT_DISCOUNT_CONFIG;

  const localSaved = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (localSaved) {
    try {
      config = { ...DEFAULT_INSTALLMENT_DISCOUNT_CONFIG, ...JSON.parse(localSaved) };
    } catch (e) {
      console.warn('[InstallmentDiscountService] Erro ao ler config local:', e);
    }
  }

  try {
    const docRef = doc(db, FIRESTORE_DOC_PATH[0], FIRESTORE_DOC_PATH[1]);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const remoteData = snap.data() as Partial<InstallmentDiscountConfig>;
      config = { ...config, ...remoteData };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
    }
  } catch (err) {
    console.warn('[InstallmentDiscountService] Erro ao carregar config no Firestore:', err);
  }

  return config;
}

/**
 * Salva a configuração do Desconto de Pontualidade no localStorage e Firestore
 */
export async function saveInstallmentDiscountConfig(
  newConfig: InstallmentDiscountConfig
): Promise<InstallmentDiscountConfig> {
  const updated: InstallmentDiscountConfig = {
    ...newConfig,
    percentage: Math.max(0, Math.min(100, Number(newConfig.percentage) || 0)),
    cutoffHour: newConfig.cutoffHour || '22:00',
    financeWhatsApp: (newConfig.financeWhatsApp || '5599984125572').replace(/\D/g, ''),
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));

  try {
    const docRef = doc(db, FIRESTORE_DOC_PATH[0], FIRESTORE_DOC_PATH[1]);
    await setDoc(docRef, updated, { merge: true });
    console.log('[InstallmentDiscountService] Configurações de desconto salvas com sucesso:', updated);
  } catch (err) {
    console.warn('[InstallmentDiscountService] Erro ao salvar config no Firestore:', err);
  }

  return updated;
}

export interface EligibilityResult {
  isEligible: boolean;
  isDueToday: boolean;
  isPastCutoffToday: boolean;
  isOverdue: boolean;
  cutoffDate: Date | null;
  formattedCutoffHour: string;
}

/**
 * Analisa a elegibilidade da parcela para o desconto de pontualidade.
 * Regra: Válido até o horário limite (padrão 22:00) do dia do vencimento.
 */
export function checkInstallmentDiscountEligibility(
  rawDueDate: string | null | undefined,
  config?: InstallmentDiscountConfig,
  isPaid?: boolean
): EligibilityResult {
  const cutoffTime = config?.cutoffHour || '22:00';
  const [cutoffH, cutoffM] = cutoffTime.split(':').map((v) => parseInt(v, 10) || 0);

  const fallbackResult: EligibilityResult = {
    isEligible: false,
    isDueToday: false,
    isPastCutoffToday: false,
    isOverdue: false,
    cutoffDate: null,
    formattedCutoffHour: cutoffTime,
  };

  if (!config || !config.active || config.percentage <= 0 || isPaid || !rawDueDate) {
    return fallbackResult;
  }

  try {
    const cleanDate = String(rawDueDate).trim().split('T')[0].split(' ')[0];
    let year = 0;
    let month = 0;
    let day = 0;

    if (cleanDate.includes('-')) {
      const parts = cleanDate.split('-').map(Number);
      if (parts.length === 3) {
        year = parts[0];
        month = parts[1] - 1;
        day = parts[2];
      }
    } else if (cleanDate.includes('/')) {
      const parts = cleanDate.split('/').map(Number);
      if (parts.length === 3) {
        day = parts[0];
        month = parts[1] - 1;
        year = parts[2];
      }
    }

    if (!year || isNaN(month) || !day) {
      return fallbackResult;
    }

    const cutoffDate = new Date(year, month, day, cutoffH, cutoffM, 0, 0);
    const now = new Date();

    const isSameDay =
      now.getFullYear() === year &&
      now.getMonth() === month &&
      now.getDate() === day;

    const isPastCutoff = now.getTime() > cutoffDate.getTime();
    const isDueToday = isSameDay;
    const isPastCutoffToday = isDueToday && isPastCutoff;

    // Se já passou das 22h do dia do vencimento, ou se a data do vencimento já passou
    const isOverdue = now.getTime() > new Date(year, month, day, 23, 59, 59).getTime();

    // Elegível apenas se agora <= cutoffDate (22:00 do dia do vencimento)
    const isEligible = now.getTime() <= cutoffDate.getTime();

    return {
      isEligible,
      isDueToday,
      isPastCutoffToday,
      isOverdue,
      cutoffDate,
      formattedCutoffHour: cutoffTime,
    };
  } catch (err) {
    console.warn('[InstallmentDiscountService] Erro ao validar data de vencimento:', err);
    return fallbackResult;
  }
}
