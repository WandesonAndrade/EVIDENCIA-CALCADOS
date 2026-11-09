import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export interface ShippingSettings {
  allowExternalShipping: boolean; // true = envios para fora de Caxias ativos (Melhor Envio); false = apenas Caxias - MA
  externalDisabledNotice?: string;
  updatedAt?: string;
}

const STORAGE_KEY = 'evidencia_shipping_settings';

export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  allowExternalShipping: true,
  externalDisabledNotice: 'Entrega indisponível para o endereço',
  updatedAt: new Date().toISOString(),
};

export const shippingConfigService = {
  /**
   * Obtém a configuração de frete (cache local prioritário com fallback do Firestore)
   */
  async getSettings(): Promise<ShippingSettings> {
    let localConfig: ShippingSettings = DEFAULT_SHIPPING_SETTINGS;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        localConfig = { ...DEFAULT_SHIPPING_SETTINGS, ...JSON.parse(raw) };
      }
    } catch {
      // Ignora erro de JSON
    }

    if (!db) return localConfig;

    try {
      const docRef = doc(db, 'settings', 'shipping');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const remoteData = snap.data() as Partial<ShippingSettings>;
        const merged: ShippingSettings = {
          ...DEFAULT_SHIPPING_SETTINGS,
          ...localConfig,
          ...remoteData,
          allowExternalShipping: remoteData.allowExternalShipping !== undefined ? Boolean(remoteData.allowExternalShipping) : true,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
    } catch (err) {
      console.warn('📌 [shippingConfigService] Erro ao carregar do Firestore, mantendo local:', err);
    }

    return localConfig;
  },

  /**
   * Atualiza e persiste a configuração no Firestore e no localStorage
   */
  async updateSettings(updates: Partial<ShippingSettings>): Promise<ShippingSettings> {
    const current = await this.getSettings();
    const updated: ShippingSettings = {
      ...current,
      ...updates,
      allowExternalShipping: updates.allowExternalShipping !== undefined ? Boolean(updates.allowExternalShipping) : current.allowExternalShipping,
      updatedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignora erro de storage local
    }

    if (db) {
      try {
        const docRef = doc(db, 'settings', 'shipping');
        await setDoc(docRef, updated, { merge: true });
      } catch (err) {
        console.warn('📌 [shippingConfigService] Erro ao salvar no Firestore:', err);
      }
    }

    // Dispara evento customizado para componentes na mesma janela
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('evidencia_shipping_settings_changed', { detail: updated }));
    }

    return updated;
  },

  /**
   * Ouve em tempo real as mudanças no documento de configurações de frete
   */
  subscribeSettings(callback: (settings: ShippingSettings) => void): () => void {
    if (!db) {
      this.getSettings().then(callback);
      return () => {};
    }

    const docRef = doc(db, 'settings', 'shipping');
    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const remoteData = snap.data() as Partial<ShippingSettings>;
          const merged: ShippingSettings = {
            ...DEFAULT_SHIPPING_SETTINGS,
            ...remoteData,
            allowExternalShipping: remoteData.allowExternalShipping !== undefined ? Boolean(remoteData.allowExternalShipping) : true,
          };
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          } catch {}
          callback(merged);
        } else {
          this.getSettings().then(callback);
        }
      },
      (err) => {
        console.warn('📌 [shippingConfigService] Erro no onSnapshot, buscando cache:', err);
        this.getSettings().then(callback);
      }
    );

    return unsubscribe;
  },
};
