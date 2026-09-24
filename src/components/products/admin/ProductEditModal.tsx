import React, { useMemo } from 'react';
import {
  Edit3,
  Save,
  Upload,
  X,
  Trash2,
  ImageIcon,
  FileText,
  Sparkles,
  RefreshCw,
  Tag,
  CheckCircle2,
  AlertCircle,
  Layers,
} from 'lucide-react';
import { ProdutoGradesResult } from '../../../types';
import { MoblinkRawProduct } from '../../MoblinkProductsManager';
import {
  extractPrecoTabelaMoblink,
  extractPrecoVistaMoblink,
  extractPrecoCartaoMoblink,
  extractSaldoLojaMoblink,
  extractClassificacaoCategoria,
  hasProductValidPhoto,
} from '../../../services/moblinkProductsService';
import { isPlaceholderUrl } from '../../../utils/placeholder';
import { normalizeCategoryName, normalizeSubcategoryName } from '../../../services/moblinkCategoriesService';
import { ProductAiDescriptionButton, ProductAiSearchPhotoButton, ProductAiAssistantModals } from './ai';

export interface ProductEditModalProps {
  selectedProduct: MoblinkRawProduct | null;
  selectedProductGrade: ProdutoGradesResult | null;
  isLoadingProductGrade: boolean;
  isSingleRefreshing: boolean;
  editName: string;
  setEditName: (val: string) => void;
  editVisible: boolean;
  setEditVisible: (val: boolean) => void;
  editNewArrival: boolean;
  setEditNewArrival: (val: boolean) => void;
  images: string[];
  setImages: React.Dispatch<React.SetStateAction<string[]>>;
  newImageUrl: string;
  setNewImageUrl: (val: string) => void;
  isUploading: boolean;
  richDescription: string;
  setRichDescription: (val: string) => void;
  editColorImageMap: Record<string, string>;
  setEditColorImageMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  editColorImages: Record<string, string[]>;
  setEditColorImages: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  feedback: { success: boolean; message: string } | null;
  setFeedback: (val: { success: boolean; message: string } | null) => void;
  showWebSearchModal: boolean;
  setShowWebSearchModal: (val: boolean) => void;
  showAiDescriptionModal: boolean;
  setShowAiDescriptionModal: (val: boolean) => void;
  handleCloseEnrichmentForm: () => void;
  handleSaveProductEnrichment: (e: React.FormEvent) => void;
  handleRefreshSingleProduct: () => void;
  handleAddImageUrl: () => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSetMainImage: (index: number) => void;
  handleRemoveImage: (index: number) => void;
  handleInsertTemplate: (type: 'couro' | 'medidas' | 'cuidados') => void;
  preserveExistingImages: (existing: string[], newImgs: string[]) => string[];
  syncImageUpdateToFirestore: (newImageList: string[]) => Promise<string[] | void>;
}

export const ProductEditModal: React.FC<ProductEditModalProps> = ({
  selectedProduct,
  selectedProductGrade,
  isLoadingProductGrade,
  isSingleRefreshing,
  editName,
  setEditName,
  editVisible,
  setEditVisible,
  editNewArrival,
  setEditNewArrival,
  images,
  newImageUrl,
  setNewImageUrl,
  isUploading,
  richDescription,
  setRichDescription,
  editColorImageMap,
  setEditColorImageMap,
  editColorImages,
  setEditColorImages,
  feedback,
  setFeedback,
  showWebSearchModal,
  setShowWebSearchModal,
  showAiDescriptionModal,
  setShowAiDescriptionModal,
  handleCloseEnrichmentForm,
  handleSaveProductEnrichment,
  handleRefreshSingleProduct,
  handleAddImageUrl,
  handleFileUpload,
  handleSetMainImage,
  handleRemoveImage,
  handleInsertTemplate,
  preserveExistingImages,
  syncImageUpdateToFirestore,
}) => {
  if (!selectedProduct) return null;

  // Indica se o produto possui desmembramento de grade de variações (cores e tamanhos) ativo no ERP
  const hasDesmembramentoGrade = useMemo(() => {
    return Boolean(
      selectedProductGrade &&
      selectedProductGrade.hasGrade &&
      Array.isArray(selectedProductGrade.variacoes) &&
      selectedProductGrade.variacoes.length > 0
    );
  }, [selectedProductGrade]);

  // Lista de Cores disponíveis extraídas ESTRITAMENTE da Grade / Estoque do Produto no ERP
  const availableColorsForEditModal = useMemo(() => {
    if (!hasDesmembramentoGrade) {
      return [];
    }

    const set = new Set<string>();

    if (selectedProductGrade?.cores && selectedProductGrade.cores.length > 0) {
      selectedProductGrade.cores.forEach(c => {
        if (c && c.trim()) set.add(c.trim());
      });
    }

    if (selectedProductGrade?.variacoes && selectedProductGrade.variacoes.length > 0) {
      selectedProductGrade.variacoes.forEach(v => {
        if (v.cor && v.cor.trim()) set.add(v.cor.trim());
      });
    }

    return Array.from(set).sort();
  }, [hasDesmembramentoGrade, selectedProductGrade]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6 animate-scale-in">
        
        {/* MODAL HEADER */}
        <div className="flex items-start justify-between border-b pb-4 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500 text-slate-950 text-xs font-black font-mono">
                ID Ref: {selectedProduct.id || selectedProduct.moblinkId}
              </span>
              {(() => {
                const catInfo = extractClassificacaoCategoria(selectedProduct);
                const classCode = catInfo.classificacao || String(selectedProduct.classificacao || (selectedProduct as any).id_grupo || '').trim();
                if (!classCode) return null;
                return (
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-black font-mono inline-flex items-center gap-1">
                    <Layers className="h-3 w-3 text-blue-500 shrink-0" />
                    <span>Classificação ERP: {classCode}</span>
                  </span>
                );
              })()}
              {(selectedProduct.referencia || selectedProduct.referenceCode) && (
                <span className="px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-black font-mono">
                  Ref ERP: {selectedProduct.referencia || selectedProduct.referenceCode}
                </span>
              )}
              <span className="text-[10px] uppercase font-bold text-slate-400">Dados do MobLink ERP</span>
            </div>
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
              {selectedProduct.nome || selectedProduct.name}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefreshSingleProduct}
              disabled={isSingleRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title="Buscar dados mais recentes de preço, estoque e grade deste produto diretamente no MobLink ERP"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSingleRefreshing ? 'animate-spin' : ''}`} />
              <span>{isSingleRefreshing ? 'Atualizando...' : 'Atualizar este Produto no ERP'}</span>
            </button>

            <button
              type="button"
              onClick={handleCloseEnrichmentForm}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* READ-ONLY ERP DATA SUMMARY */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs">
            {/* Preço Tabela */}
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Preço Tabela (Carnê)</span>
              <span className="font-black text-sm text-slate-800 dark:text-slate-100 font-mono">
                R$ {extractPrecoTabelaMoblink(selectedProduct).toFixed(2).replace('.', ',')}
              </span>
            </div>

            {/* Preço à Vista */}
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Preço à Vista (PIX)</span>
              <span className="font-black text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                R$ {extractPrecoVistaMoblink(selectedProduct).toFixed(2).replace('.', ',')}
              </span>
              {selectedProduct.preco_promocao && Number(selectedProduct.preco_promocao) > 0 && (
                <span className="text-[9px] text-amber-500 font-bold block">Promo: R$ {Number(selectedProduct.preco_promocao).toFixed(2).replace('.', ',')}</span>
              )}
            </div>

            {/* Preço Cartão */}
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Preço Cartão</span>
              <span className="font-black text-sm text-blue-600 dark:text-blue-400 font-mono">
                R$ {extractPrecoCartaoMoblink(selectedProduct).toFixed(2).replace('.', ',')}
              </span>
            </div>

            {/* Estoque ERP */}
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Estoque ERP</span>
              <span className={`font-black text-sm font-mono ${
                extractSaldoLojaMoblink(selectedProduct) > 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-500 dark:text-rose-400'
              }`}>
                {extractSaldoLojaMoblink(selectedProduct)} un
              </span>
            </div>

            {/* Classificação ERP */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Categoria / Classificação</span>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  <Tag className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  {(() => {
                    const rawCat = selectedProduct.category || selectedProduct.nome_grupo || selectedProduct.categoria || '';
                    const isUnclass = rawCat === 'Sem Classificação Definida' || (!rawCat && !selectedProduct.classificacao);
                    if (isUnclass) {
                      return (
                        <span className="text-amber-600 dark:text-amber-400 font-extrabold">
                          Sem Classificação Definida
                        </span>
                      );
                    }
                    return (
                      <>
                        <span>{normalizeCategoryName(rawCat || 'Geral')}</span>
                        {(selectedProduct.nome_subgrupo || selectedProduct.subcategoria || selectedProduct.subcategory) && (
                          <span className="text-slate-400 font-medium">
                            {' › '}{normalizeSubcategoryName(selectedProduct.nome_subgrupo || selectedProduct.subcategoria || selectedProduct.subcategory || '')}
                          </span>
                        )}
                      </>
                    );
                  })()}
                </span>
                {selectedProduct.classificacao && (
                  <span className="font-mono font-black text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-lg shrink-0">
                    {selectedProduct.classificacao}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* BLOCO DA GRADE DO PRODUTO (MOBLINK ERP) */}
          <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-amber-500 shrink-0" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  Grade de Produto no ERP (Cores &amp; Tamanhos com Saldo)
                </h4>
              </div>
              {selectedProduct.id_grade && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  ID Grade: {selectedProduct.id_grade}
                </span>
              )}
            </div>

            {isLoadingProductGrade ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 py-3 animate-pulse">
                <RefreshCw className="h-4 w-4 animate-spin text-amber-500" />
                <span>Consultando variações e saldos da grade no ERP MobLink...</span>
              </div>
            ) : selectedProductGrade && selectedProductGrade.hasGrade && selectedProductGrade.variacoes.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Numerações Disponíveis (Saldo &gt; 0)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedProductGrade.tamanhos.map(sz => (
                        <span key={sz} className="px-2 py-0.5 rounded-md text-[11px] font-black bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-mono">
                          {sz}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Cores Disponíveis (Saldo &gt; 0)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedProductGrade.cores.map(cr => (
                        <span key={cr} className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                          {cr}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2 px-3">Tamanho</th>
                        <th className="py-2 px-3">Cor / Acabamento</th>
                        <th className="py-2 px-3 text-center">Saldo em Loja</th>
                        <th className="py-2 px-3 text-right">Cód. Barras / Posição</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900/50">
                      {selectedProductGrade.variacoes.map((v, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-2 px-3 font-mono font-black text-slate-800 dark:text-slate-100">
                            {v.tamanho || '-'}
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-700 dark:text-slate-300">
                            {v.cor || '-'}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">
                              {v.saldo_loja} un
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-[10px] text-slate-400">
                            {v.cod_barras || v.pos_grade || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
                <span>Produto possui saldo de estoque único ({extractSaldoLojaMoblink(selectedProduct)} un) sem desmembramento de grade cadastrado no ERP.</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  Estoque Global
                </span>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSaveProductEnrichment} className="space-y-6">
          
          {/* SECTION 1: NOME DO PRODUTO & VISIBILIDADE */}
          <div className="space-y-4 border-b pb-5 dark:border-slate-800">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-amber-500" />
              1. Apresentação &amp; Visibilidade na Vitrine
            </h4>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                  Nome Comercial do Produto (Exibido na Loja Virtual)
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Ex: Sapato Social, Bolsa Transversal Couro, Cinto Social..."
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <label className="inline-flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editVisible}
                      onChange={(e) => setEditVisible(e.target.checked)}
                      disabled={!hasProductValidPhoto(selectedProduct) && !images.some(img => img && !isPlaceholderUrl(img))}
                      className="w-4 h-4 rounded text-amber-500 border-slate-300 focus:ring-amber-500 cursor-pointer disabled:opacity-50"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Exibir produto visível nas vitrines da loja virtual
                    </span>
                  </label>

                  <label className="inline-flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editNewArrival}
                      onChange={(e) => setEditNewArrival(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 border-slate-300 focus:ring-purple-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                      <span>Marcar como Lançamento / Novidade</span>
                    </span>
                  </label>
                </div>

                {(!hasProductValidPhoto(selectedProduct) && !images.some(img => img && !isPlaceholderUrl(img))) && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-2.5 animate-fade-in">
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>⚠️ Produto sem foto real cadastrada. Faça o upload de uma foto do produto na Seção 2 abaixo para ativar a visibilidade na loja virtual.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: PHOTOS & MEDIA */}
          <div className="space-y-3 pt-2 border-b pb-5 dark:border-slate-800">
            <div className="flex items-center justify-between pb-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-amber-500" />
                2. Galeria de Fotos em Alta Resolução
              </h4>
              <span className="text-[11px] text-slate-400">{images.length} foto(s) anexada(s)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-6 flex gap-2">
                <input
                  type="url"
                  placeholder="Cole a URL da imagem (ex: https://...)"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  className="flex-1 p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-xs font-medium"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="px-3 py-2.5 bg-slate-900 dark:bg-slate-700 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                >
                  + Anexar URL
                </button>
              </div>

              <div className="sm:col-span-6 flex gap-2">
                <ProductAiSearchPhotoButton
                  onClick={() => setShowWebSearchModal(true)}
                  className="flex-1"
                />

                <label className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30 rounded-xl text-xs cursor-pointer transition-all shrink-0">
                  <Upload className="h-4 w-4 text-amber-500" />
                  <span>{isUploading ? 'Enviando...' : 'Carregar Imagem'}</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>

            {/* IMAGES THUMBNAILS GRID WITH COLOR ASSIGNMENT */}
            {images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {images.map((imgUrl, idx) => {
                  const assignedColor = hasDesmembramentoGrade ? (
                    Object.keys(editColorImages).find(cKey => 
                      Array.isArray(editColorImages[cKey]) && editColorImages[cKey].includes(imgUrl)
                    ) || Object.keys(editColorImageMap).find(cKey => editColorImageMap[cKey] === imgUrl)
                  ) : undefined;

                  const matchedDropdownValue = (hasDesmembramentoGrade && assignedColor)
                    ? availableColorsForEditModal.find(c => c.trim().toLowerCase() === assignedColor.trim().toLowerCase()) || assignedColor
                    : '';

                  return (
                    <div key={idx} className="flex flex-col space-y-1">
                      <div className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 aspect-square">
                        <img src={imgUrl} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                        {idx === 0 && (
                          <span className="absolute top-1 left-1 bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded shadow-xs z-10">
                            Capa
                          </span>
                        )}
                        {assignedColor && hasDesmembramentoGrade && (
                          <span className="absolute bottom-1 left-1 bg-sky-500 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded shadow-xs z-10 truncate max-w-[85%]" title={`Cor: ${assignedColor}`}>
                            {assignedColor}
                          </span>
                        )}
                        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1 z-20">
                          {idx !== 0 && (
                            <button
                              type="button"
                              onClick={() => handleSetMainImage(idx)}
                              className="p-1 bg-amber-500 text-slate-950 rounded text-[9px] font-bold cursor-pointer"
                              title="Tornar imagem principal"
                            >
                              Capa
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="p-1 bg-red-600 text-white rounded text-[9px] font-bold cursor-pointer"
                            title="Remover foto"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {hasDesmembramentoGrade && availableColorsForEditModal.length > 0 && (
                        <select
                          value={matchedDropdownValue}
                          onChange={(e) => {
                            const selColor = e.target.value;
                            
                            setEditColorImages(prev => {
                              const copy: Record<string, string[]> = {};
                              Object.entries(prev).forEach(([cKey, urls]) => {
                                copy[cKey] = (urls || []).filter(u => u !== imgUrl);
                              });
                              if (selColor) {
                                if (!copy[selColor]) copy[selColor] = [];
                                if (!copy[selColor].includes(imgUrl)) {
                                  copy[selColor].push(imgUrl);
                                }
                              }
                              return copy;
                            });

                            setEditColorImageMap(prev => {
                              const copy = { ...prev };
                              if (selColor && !copy[selColor]) {
                                copy[selColor] = imgUrl;
                              }
                              return copy;
                            });
                          }}
                          className="w-full p-1 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-[10px] font-bold focus:outline-none focus:border-amber-500"
                        >
                          <option value="">-- Cor da foto --</option>
                          {availableColorsForEditModal.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-center space-y-1 bg-slate-50/50 dark:bg-slate-800/30">
                <ImageIcon className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-500">Nenhuma foto adicionada ainda.</p>
                <p className="text-[10px] text-slate-400">Adicione URLs ou faça upload para exibir este calçado no catálogo.</p>
              </div>
            )}
          </div>

          {/* SECTION 3: RICH DESCRIPTION */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-wrap items-center justify-between border-b pb-2 dark:border-slate-800 gap-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-500" />
                3. Descrição Rica e Detalhes de Apresentação
              </h4>

              <div className="flex flex-wrap items-center gap-1.5">
                <ProductAiDescriptionButton
                  onClick={() => setShowAiDescriptionModal(true)}
                />

                <button
                  type="button"
                  onClick={() => handleInsertTemplate('couro')}
                  className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold cursor-pointer"
                >
                  + Espec. Couro
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertTemplate('medidas')}
                  className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold cursor-pointer"
                >
                  + Tab. Tamanhos
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertTemplate('cuidados')}
                  className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold cursor-pointer"
                >
                  + Conservação
                </button>
              </div>
            </div>

            <textarea
              rows={8}
              value={richDescription}
              onChange={(e) => setRichDescription(e.target.value)}
              placeholder="Escreva ou edite a descrição rica do produto..."
              className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-xs font-mono leading-relaxed focus:outline-none focus:border-amber-500"
            />
          </div>

          {feedback && (
            <div className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
              feedback.success
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
            }`}>
              {feedback.success ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> : <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* SAVE BUTTON */}
          <div className="flex items-center justify-end gap-3 border-t pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={handleCloseEnrichmentForm}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition-all flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>Salvar Fotos e Descrição no Banco</span>
            </button>
          </div>

        </form>
      </div>

      {/* MODAIS COMPONENTIZADOS DE IA (BUSCA DE FOTOS E SUGESTÃO DE DESCRIÇÃO) */}
      <ProductAiAssistantModals
        product={selectedProduct}
        productId={String(selectedProduct?.id || selectedProduct?.moblinkId || '')}
        editName={editName}
        currentDescription={richDescription}
        showWebSearchModal={showWebSearchModal}
        showAiDescriptionModal={showAiDescriptionModal}
        onCloseWebSearch={() => setShowWebSearchModal(false)}
        onCloseAiDescription={() => setShowAiDescriptionModal(false)}
        onSelectWebImage={async (publicUrl) => {
          const nextList = preserveExistingImages(images, [publicUrl]);
          await syncImageUpdateToFirestore(nextList);
          setFeedback({
            success: true,
            message: 'Foto encontrada na web aprovada e salva no Supabase Storage com sucesso!',
          });
          setTimeout(() => setFeedback(null), 4000);
        }}
        onApplyDescription={(newDesc) => {
          setRichDescription(newDesc);
          setFeedback({
            success: true,
            message: 'Descrição rica com inteligência comercial aplicada ao produto!',
          });
          setTimeout(() => setFeedback(null), 4000);
        }}
      />
    </div>
  );
};
