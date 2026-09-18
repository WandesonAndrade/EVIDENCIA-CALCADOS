import { useState, useCallback } from 'react';
import { ProdutoGradesResult } from '../../../../types';

export interface UseProductAiAssistantOptions {
  productId?: string;
  productName?: string;
  initialImages?: string[];
  initialDescription?: string;
  gradeInfo?: ProdutoGradesResult | null;
  onImagesChange?: (nextImages: string[]) => void | Promise<void>;
  onDescriptionChange?: (nextDesc: string) => void;
  onFeedback?: (feedback: { success: boolean; message: string }) => void;
}

export function useProductAiAssistant(options: UseProductAiAssistantOptions = {}) {
  const [showWebSearchModal, setShowWebSearchModal] = useState(false);
  const [showAiDescriptionModal, setShowAiDescriptionModal] = useState(false);

  const openWebSearch = useCallback(() => setShowWebSearchModal(true), []);
  const closeWebSearch = useCallback(() => setShowWebSearchModal(false), []);

  const openAiDescription = useCallback(() => setShowAiDescriptionModal(true), []);
  const closeAiDescription = useCallback(() => setShowAiDescriptionModal(false), []);

  const handleApplyWebImage = useCallback(async (publicUrl: string) => {
    if (options.onImagesChange) {
      const currentList = options.initialImages || [];
      const updated = currentList.includes(publicUrl) ? currentList : [...currentList, publicUrl];
      await options.onImagesChange(updated);
    }
    if (options.onFeedback) {
      options.onFeedback({
        success: true,
        message: 'Foto encontrada na web aprovada e salva no Supabase Storage com sucesso!',
      });
    }
    closeWebSearch();
  }, [options, closeWebSearch]);

  const handleApplyDescription = useCallback((newDesc: string) => {
    if (options.onDescriptionChange) {
      options.onDescriptionChange(newDesc);
    }
    if (options.onFeedback) {
      options.onFeedback({
        success: true,
        message: 'Nova descrição estruturada com IA aplicada com sucesso!',
      });
    }
    closeAiDescription();
  }, [options, closeAiDescription]);

  return {
    showWebSearchModal,
    setShowWebSearchModal,
    showAiDescriptionModal,
    setShowAiDescriptionModal,
    openWebSearch,
    closeWebSearch,
    openAiDescription,
    closeAiDescription,
    handleApplyWebImage,
    handleApplyDescription,
  };
}
