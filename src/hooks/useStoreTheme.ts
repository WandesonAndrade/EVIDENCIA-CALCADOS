import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { getStoreThemeTokens, StoreThemeTokens } from '../theme/storeThemes';
import { StoreThemeId } from '../types';

export interface UseStoreThemeResult {
  storeTheme: StoreThemeId;
  tokens: StoreThemeTokens;
  isDefault: boolean;
  isOutubroRosa: boolean;
  isBlackFriday: boolean;
  updateStoreTheme: (themeId: StoreThemeId) => Promise<void>;
}

export function useStoreTheme(): UseStoreThemeResult {
  const { storeTheme, updateStoreTheme } = useApp();

  const tokens = useMemo(() => {
    return getStoreThemeTokens(storeTheme);
  }, [storeTheme]);

  return {
    storeTheme,
    tokens,
    isDefault: tokens.isDefault,
    isOutubroRosa: tokens.isOutubroRosa,
    isBlackFriday: tokens.isBlackFriday,
    updateStoreTheme,
  };
}

