export interface FeatureFlags {
  newBankEnabled: boolean;
  newBankRolloutPercentage: number; // 0 a 100
  pixPollingIntervalMs: number; // ex.: 4000 (4 segundos)
  enableDebitCard: boolean;
}

const getEnvPercentage = (key: string, defaultValue: number): number => {
  const val = (import.meta as any).env?.[key];
  if (val !== undefined && val !== null && val !== '') {
    const parsed = Number(val);
    if (!isNaN(parsed)) return Math.max(0, Math.min(100, parsed));
  }
  return defaultValue;
};

export const featureFlags: FeatureFlags = {
  newBankEnabled: false, // Por enquanto mantido falso (Mercado Pago mantido)
  newBankRolloutPercentage: getEnvPercentage('VITE_FEATURE_FLAG_NEW_BANK', 0),
  pixPollingIntervalMs: 4000,
  enableDebitCard: true,
};

/**
 * Avalia se o novo banco deve ser utilizado para um dado usuário/sessão (Rollout Gradual)
 */
export function isNewBankActiveForUser(userIdOrSession?: string): boolean {
  if (!featureFlags.newBankEnabled || featureFlags.newBankRolloutPercentage <= 0) {
    return false;
  }

  if (featureFlags.newBankRolloutPercentage >= 100) {
    return true;
  }

  if (!userIdOrSession) return false;

  // Hash determinístico simples para distribuir de 0 a 99
  let hash = 0;
  for (let i = 0; i < userIdOrSession.length; i++) {
    hash = (hash << 5) - hash + userIdOrSession.charCodeAt(i);
    hash |= 0;
  }
  const userBucket = Math.abs(hash) % 100;
  return userBucket < featureFlags.newBankRolloutPercentage;
}
