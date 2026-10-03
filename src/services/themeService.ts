import { StoreThemeId, StoreThemeConfig } from '../types';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const DEFAULT_THEME_CONFIG: StoreThemeConfig = {
  activeTheme: 'outubro-rosa',
  updatedAt: new Date().toISOString(),
};

/**
 * Carrega a configuração de tema da vitrine do localStorage ou Firebase Firestore
 */
export async function loadThemeConfig(): Promise<StoreThemeConfig> {
  const localSaved = localStorage.getItem('evidencia_store_theme_config');
  let config: StoreThemeConfig = DEFAULT_THEME_CONFIG;

  if (localSaved) {
    try {
      config = { ...DEFAULT_THEME_CONFIG, ...JSON.parse(localSaved) };
    } catch (e) {
      console.warn('[ThemeService] Erro ao ler config local do Tema:', e);
    }
  }

  try {
    const docRef = doc(db, 'settings', 'theme');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const remoteData = snap.data() as Partial<StoreThemeConfig>;
      config = { ...config, ...remoteData };
      localStorage.setItem('evidencia_store_theme_config', JSON.stringify(config));
    }
  } catch (err) {
    console.warn('[ThemeService] Erro ao carregar config de Tema no Firestore:', err);
  }

  return config;
}

/**
 * Salva a configuração de tema no localStorage e Firebase Firestore
 */
export async function saveThemeConfig(themeId: StoreThemeId): Promise<StoreThemeConfig> {
  const updated: StoreThemeConfig = {
    activeTheme: themeId,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem('evidencia_store_theme_config', JSON.stringify(updated));

  try {
    const docRef = doc(db, 'settings', 'theme');
    await setDoc(docRef, updated, { merge: true });
    console.log('[ThemeService] Tema da loja salvo com sucesso no Firestore:', updated);
  } catch (err) {
    console.warn('[ThemeService] Erro ao salvar config de Tema no Firestore:', err);
  }

  return updated;
}
