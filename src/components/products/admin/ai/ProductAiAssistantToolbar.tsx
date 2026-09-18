import React from 'react';
import { Globe, Sparkles } from 'lucide-react';
import { ProductWebImageSearchModal } from '../ProductWebImageSearchModal';
import { ProductDescriptionAiModal } from '../ProductDescriptionAiModal';
import { ProdutoGradesResult } from '../../../../types';

export interface ProductAiSearchPhotoButtonProps {
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}

export const ProductAiSearchPhotoButton: React.FC<ProductAiSearchPhotoButtonProps> = ({
  onClick,
  className = '',
  disabled = false,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#0071E3]/10 hover:bg-[#0071E3]/20 text-[#0071E3] dark:text-blue-400 font-extrabold border border-[#0071E3]/30 rounded-xl text-xs cursor-pointer transition-all active:scale-95 shadow-xs disabled:opacity-50 ${className}`}
    title="Buscar fotos deste modelo na internet (Google / Lojas) e salvar diretamente no Supabase"
  >
    <Globe className="h-4 w-4 text-[#0071E3]" />
    <span>🔍 Buscar Foto na Web</span>
  </button>
);

export interface ProductAiDescriptionButtonProps {
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}

export const ProductAiDescriptionButton: React.FC<ProductAiDescriptionButtonProps> = ({
  onClick,
  className = '',
  disabled = false,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`px-2.5 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-lg text-[10px] flex items-center gap-1 shadow-xs cursor-pointer transition-all active:scale-95 disabled:opacity-50 ${className}`}
    title="Sugerir uma descrição rica, persuasiva e limpa para este modelo com IA"
  >
    <Sparkles className="h-3 w-3 text-slate-950" />
    <span>✨ Sugerir Descrição com IA</span>
  </button>
);

export interface ProductAiAssistantModalsProps {
  product: any;
  productId: string;
  editName?: string;
  currentDescription: string;
  gradeInfo?: ProdutoGradesResult | null;
  showWebSearchModal: boolean;
  showAiDescriptionModal: boolean;
  onCloseWebSearch: () => void;
  onCloseAiDescription: () => void;
  onSelectWebImage: (publicUrl: string) => Promise<void> | void;
  onApplyDescription: (newDesc: string) => void;
}

export const ProductAiAssistantModals: React.FC<ProductAiAssistantModalsProps> = ({
  product,
  productId,
  editName,
  currentDescription,
  gradeInfo,
  showWebSearchModal,
  showAiDescriptionModal,
  onCloseWebSearch,
  onCloseAiDescription,
  onSelectWebImage,
  onApplyDescription,
}) => {
  if (!product) return null;

  const effectiveName = editName || product.nome || product.name || product.descricao || '';
  const initialQuery = `${product.marca || ''} ${effectiveName} ${product.referencia || product.referenceCode || ''}`.trim();

  return (
    <>
      {showWebSearchModal && (
        <ProductWebImageSearchModal
          isOpen={showWebSearchModal}
          onClose={onCloseWebSearch}
          productId={productId}
          productName={effectiveName}
          initialQuery={initialQuery}
          onSelectImage={onSelectWebImage}
        />
      )}

      {showAiDescriptionModal && (
        <ProductDescriptionAiModal
          isOpen={showAiDescriptionModal}
          onClose={onCloseAiDescription}
          productId={productId}
          product={{
            ...product,
            nome: effectiveName,
            name: effectiveName,
            color: product.cor || product.color,
          }}
          gradeInfo={gradeInfo}
          currentDescription={currentDescription}
          onApplyDescription={onApplyDescription}
        />
      )}
    </>
  );
};
