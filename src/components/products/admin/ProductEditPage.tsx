import React, { useState, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  Tag,
  DollarSign,
  CreditCard,
  Package,
  Weight,
  Folder,
  Layers,
  CheckCircle2,
  AlertCircle,
  Upload,
  Search,
  ExternalLink,
  Plus,
  Trash2,
  Star,
  MoreVertical,
  Check,
  FileText,
  Info,
  ChevronDown,
  Sparkles,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Link as LinkIcon,
  Code as CodeIcon,
  Eye,
  Edit3,
  Save,
  Image as ImageIcon,
  CloudUpload,
  HelpCircle,
} from 'lucide-react';
import { ProdutoGradesResult } from '../../../types';
import { MoblinkRawProduct } from '../../MoblinkProductsManager';
import { boxService, IShippingBox, INITIAL_SHIPPING_BOXES } from '../../../services/boxService';
import { db } from '../../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import {
  extractPrecoTabelaMoblink,
  extractPrecoVistaMoblink,
  extractPrecoCartaoMoblink,
  extractSaldoLojaMoblink,
  extractClassificacaoCategoria,
  hasProductValidPhoto,
} from '../../../services/moblinkProductsService';
import { isPlaceholderUrl, NO_PHOTO_SVG } from '../../../utils/placeholder';
import { normalizeCategoryName } from '../../../services/moblinkCategoriesService';
import { resolveProductBrand, KNOWN_FOOTWEAR_BRANDS } from '../../../utils/brandUtils';
import { resolveProductGender, GENDER_OPTIONS } from '../../../utils/genderUtils';
import { ProductAiAssistantModals } from './ai';

export interface ProductEditPageProps {
  selectedProduct: MoblinkRawProduct | null;
  selectedProductGrade: ProdutoGradesResult | null;
  isLoadingProductGrade: boolean;
  isSingleRefreshing: boolean;
  editName: string;
  setEditName: (val: string) => void;
  editBrand?: string;
  setEditBrand?: (val: string) => void;
  editGender?: string;
  setEditGender?: (val: string) => void;
  editColor?: string;
  setEditColor?: (val: string) => void;
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

export const ProductEditPage: React.FC<ProductEditPageProps> = ({
  selectedProduct,
  selectedProductGrade,
  isLoadingProductGrade,
  isSingleRefreshing,
  editName,
  setEditName,
  editBrand,
  setEditBrand,
  editGender,
  setEditGender,
  editColor: _editColor,
  setEditColor: _setEditColor,
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

  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [activeTemplateTab, setActiveTemplateTab] = useState<'padrao' | 'beneficios' | 'uso' | 'cuidados'>('padrao');
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [activeMenuIndex, setActiveMenuIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Embalagem de Envio do Produto (Melhor Envio)
  const [shippingBoxes, setShippingBoxes] = useState<IShippingBox[]>(INITIAL_SHIPPING_BOXES);
  const [selectedBoxId, setSelectedBoxId] = useState<string>('');

  React.useEffect(() => {
    boxService.getShippingBoxes().then((boxes) => {
      if (boxes && boxes.length > 0) setShippingBoxes(boxes);
    }).catch(() => {});
  }, []);

  const suggestedBoxInfo = useMemo(() => {
    return boxService.suggestBoxForProduct(selectedProduct, shippingBoxes);
  }, [selectedProduct, shippingBoxes]);

  const defaultStoreBox = useMemo(() => {
    return shippingBoxes.find((b) => b.isDefault) || shippingBoxes[0] || INITIAL_SHIPPING_BOXES[0];
  }, [shippingBoxes]);

  React.useEffect(() => {
    const savedBoxId = (selectedProduct as any)?.shippingBoxId;
    if (savedBoxId && shippingBoxes.some((b) => b.id === savedBoxId)) {
      setSelectedBoxId(savedBoxId);
    } else {
      setSelectedBoxId(suggestedBoxInfo.box.id);
    }
  }, [selectedProduct, suggestedBoxInfo.box.id, shippingBoxes]);

  const activeBox = useMemo(() => {
    return shippingBoxes.find((b) => b.id === selectedBoxId) || suggestedBoxInfo.box || defaultStoreBox;
  }, [shippingBoxes, selectedBoxId, suggestedBoxInfo.box, defaultStoreBox]);

  // Resolução inteligente da marca e público
  const resolvedBrand = useMemo(() => {
    return (editBrand !== undefined && editBrand !== null ? editBrand : '') || resolveProductBrand(selectedProduct) || '';
  }, [editBrand, selectedProduct]);

  const resolvedGender = useMemo(() => {
    return (editGender !== undefined && editGender !== null ? editGender : '') || resolveProductGender(selectedProduct) || 'Feminino';
  }, [editGender, selectedProduct]);

  // Lista de marcas disponíveis para o select (marcas famosas + marca atual)
  const brandList = useMemo(() => {
    const list = [...KNOWN_FOOTWEAR_BRANDS];
    if (resolvedBrand && !list.some(b => b.toLowerCase() === resolvedBrand.toLowerCase())) {
      list.unshift(resolvedBrand);
    }
    return list;
  }, [resolvedBrand]);

  // Cores oficiais da grade do MobLink ERP
  const hasDesmembramentoGrade = useMemo(() => {
    return Boolean(
      selectedProductGrade &&
      (
        (Array.isArray(selectedProductGrade.cores) && selectedProductGrade.cores.length > 0) ||
        (Array.isArray(selectedProductGrade.variacoes) && selectedProductGrade.variacoes.some(v => Boolean(v.cor && v.cor.trim())))
      )
    );
  }, [selectedProductGrade]);

  const availableColors = useMemo(() => {
    if (!hasDesmembramentoGrade) {
      return [];
    }
    const set = new Set<string>();
    if (selectedProductGrade?.cores && Array.isArray(selectedProductGrade.cores)) {
      selectedProductGrade.cores.forEach((c) => {
        if (c && typeof c === 'string' && c.trim()) {
          set.add(c.trim());
        }
      });
    }
    if (selectedProductGrade?.variacoes && Array.isArray(selectedProductGrade.variacoes)) {
      selectedProductGrade.variacoes.forEach((v) => {
        if (v && v.cor && typeof v.cor === 'string' && v.cor.trim()) {
          set.add(v.cor.trim());
        }
      });
    }
    return Array.from(set).sort();
  }, [hasDesmembramentoGrade, selectedProductGrade]);

  // Manipulador consistente de vinculação de cor da grade para a foto
  const handlePhotoColorChange = (imgUrl: string, selColor: string) => {
    setEditColorImages(prev => {
      const copy: Record<string, string[]> = {};
      Object.entries(prev).forEach(([cKey, urls]) => {
        const filtered = (urls || []).filter(u => u !== imgUrl);
        if (filtered.length > 0) copy[cKey] = filtered;
      });
      if (selColor && availableColors.includes(selColor)) {
        if (!copy[selColor]) copy[selColor] = [];
        if (!copy[selColor].includes(imgUrl)) {
          copy[selColor].push(imgUrl);
        }
      }

      // Sincroniza editColorImageMap para manter capa consistente da cor
      setEditColorImageMap(prevMap => {
        const copyMap: Record<string, string> = {};
        Object.entries(copy).forEach(([cKey, urls]) => {
          if (urls && urls.length > 0) {
            const currentCover = prevMap[cKey];
            copyMap[cKey] = (currentCover && urls.includes(currentCover)) ? currentCover : urls[0];
          }
        });
        return copyMap;
      });

      return copy;
    });
  };

  // Formatação de data/hora atual
  const lastUpdatedFormatted = useMemo(() => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} • ${hours}:${mins}`;
  }, []);

  // Dados do ERP
  const precoTabela = extractPrecoTabelaMoblink(selectedProduct);
  const precoVista = extractPrecoVistaMoblink(selectedProduct);
  const precoCartao = extractPrecoCartaoMoblink(selectedProduct);
  const saldoEstoque = extractSaldoLojaMoblink(selectedProduct);
  const catInfo = extractClassificacaoCategoria(selectedProduct);
  const categoriaNome = normalizeCategoryName(selectedProduct.category || selectedProduct.nome_grupo || selectedProduct.categoria || catInfo.category || 'Calçados');
  const classificacaoCod = catInfo.classificacao || String(selectedProduct.classificacao || (selectedProduct as any).id_grupo || '').trim() || '002.001';

  // Capa do produto
  const mainCoverImage = images[0] || selectedProduct.foto_uri || (selectedProduct as any).imageUrl || NO_PHOTO_SVG;

  // Inserção rápida de tags no Editor HTML
  const insertFormatting = (tagOpen: string, tagClose: string) => {
    setRichDescription(`${richDescription}${tagOpen}${tagClose}`);
  };

  // Aplicação dos botões de modelo
  const applyQuickTemplate = (type: 'padrao' | 'beneficios' | 'uso' | 'cuidados') => {
    setActiveTemplateTab(type);
    const prodName = editName || selectedProduct.nome || selectedProduct.name || 'Produto';
    if (type === 'padrao') {
      setRichDescription(`<h3>${prodName}</h3>\n<p>${prodName} confeccionado com materiais de alta durabilidade e acabamento refinado. Proporciona máximo conforto para o seu dia a dia.</p>\n<ul>\n  <li>Garantia de Qualidade Evidência Calçados</li>\n  <li>Design moderno e ergonômico</li>\n</ul>`);
    } else if (type === 'beneficios') {
      setRichDescription(`${richDescription}\n\n<h4>✨ Benefícios &amp; Diferenciais</h4>\n<ul>\n  <li><strong>Conforto Premium:</strong> Desenvolvido para calçar com suavidade o dia todo.</li>\n  <li><strong>Durabilidade Superior:</strong> Solado resistente e cabedal reforçado.</li>\n  <li><strong>Versatilidade:</strong> Perfeito para qualquer ocasião casual ou elegante.</li>\n</ul>`);
    } else if (type === 'uso') {
      setRichDescription(`${richDescription}\n\n<h4>📏 Guia de Tamanhos &amp; Calce</h4>\n<p>Recomendamos escolher o seu número habitual de calçado. Calce confortável com ajuste anatômico.</p>`);
    } else if (type === 'cuidados') {
      handleInsertTemplate('cuidados');
    }
  };

  // Drag and drop local
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const syntheticEvent = {
        target: {
          files: e.dataTransfer.files,
        },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileUpload(syntheticEvent);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans text-left pb-24 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-5">
        
        {/* ========================================================= */}
        {/* TOP BAR: VOLTAR PARA PRODUTOS & ATUALIZAR ERP             */}
        {/* ========================================================= */}
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleCloseEnrichmentForm}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-2xs cursor-pointer active:scale-95"
          >
            <ArrowLeft className="h-4 w-4 text-slate-500" />
            <span>Voltar para Produtos</span>
          </button>

          <button
            type="button"
            onClick={handleRefreshSingleProduct}
            disabled={isSingleRefreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
            title="Sincronizar dados mais recentes de estoque e preço no MobLink ERP"
          >
            <RefreshCw className={`h-4 w-4 ${isSingleRefreshing ? 'animate-spin' : ''}`} />
            <span>{isSingleRefreshing ? 'Atualizando...' : 'Atualizar dados do ERP'}</span>
          </button>
        </div>

        {/* FEEDBACK BANNER (SE HOUVER) */}
        {feedback && (
          <div
            className={`p-3.5 rounded-2xl flex items-center gap-3 animate-fade-in shadow-2xs ${
              feedback.success
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
            }`}
          >
            {feedback.success ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            )}
            <span className="text-xs font-bold">{feedback.message}</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* CARD HERO DO PRODUTO: FOTO, BADGES, TÍTULO & CATEGORIA    */}
        {/* ========================================================= */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4 min-w-0">
            {/* Thumbnail Quadrado do Produto */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/60 p-1 shrink-0 overflow-hidden flex items-center justify-center shadow-2xs">
              <img
                src={mainCoverImage}
                alt={selectedProduct.nome || 'Produto'}
                className="w-full h-full object-contain rounded-xl"
                onError={(e) => { (e.target as any).src = NO_PHOTO_SVG; }}
              />
            </div>

            {/* Informações Centrais */}
            <div className="space-y-1.5 min-w-0">
              {/* Badges Pills */}
              <div className="flex items-center gap-2 flex-wrap text-[11px] font-black uppercase tracking-wider">
                <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 border border-amber-200/60 dark:border-amber-900/50">
                  ID Ref: {selectedProduct.id || selectedProduct.moblinkId}
                </span>

                {resolvedBrand && (
                  <span className="px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-200 border border-purple-200/60 dark:border-purple-900/50">
                    Marca: {resolvedBrand}
                  </span>
                )}

                <span className={`px-2.5 py-0.5 rounded-md border ${
                  resolvedGender.includes('Infantil')
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 border-amber-200/60'
                    : resolvedGender === 'Masculino'
                      ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200 border-sky-200/60'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 border-emerald-200/60'
                }`}>
                  Público: {resolvedGender}
                </span>
              </div>

              {/* Título Principal */}
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase truncate max-w-xl">
                {selectedProduct.nome || selectedProduct.name}
              </h1>

              {/* Categoria e Classificação */}
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Package className="h-3.5 w-3.5 text-blue-500" />
                <span>{categoriaNome} / Classificação: <strong className="font-mono text-blue-600 dark:text-blue-400">{classificacaoCod}</strong></span>
              </div>
            </div>
          </div>

          {/* Box de Atualização à Direita */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-right shrink-0 flex items-center sm:flex-col sm:items-end justify-between w-full sm:w-auto gap-2">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Última atualização</span>
              <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                {lastUpdatedFormatted}
              </span>
            </div>
            <button
              type="button"
              onClick={handleRefreshSingleProduct}
              className="p-1 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
              title="Recarregar dados"
            >
              <RefreshCw className={`h-4 w-4 ${isSingleRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* ROW DE KPIS: PREÇOS, ESTOQUE E CATEGORIA                  */}
        {/* ========================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* 1. Preço Tabela */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-4 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
              <span className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Tag className="h-3 w-3" />
              </span>
              <span>Preço Tabela</span>
            </div>
            <div className="text-lg font-black font-mono text-slate-900 dark:text-white">
              R$ {precoTabela.toFixed(2).replace('.', ',')}
            </div>
          </div>

          {/* 2. Preço PIX */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-4 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
              <span className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <DollarSign className="h-3 w-3" />
              </span>
              <span>Preço PIX</span>
            </div>
            <div className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
              R$ {precoVista.toFixed(2).replace('.', ',')}
            </div>
          </div>

          {/* 3. Preço Cartão */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-4 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
              <span className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <CreditCard className="h-3 w-3" />
              </span>
              <span>Preço Cartão</span>
            </div>
            <div className="text-lg font-black font-mono text-slate-900 dark:text-white">
              R$ {precoCartao.toFixed(2).replace('.', ',')}
            </div>
          </div>

          {/* 4. Estoque */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-4 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
              <span className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Package className="h-3 w-3" />
              </span>
              <span>Estoque</span>
            </div>
            <div className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
              {saldoEstoque} un
            </div>
          </div>

          {/* 5. Categoria */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-4 shadow-2xs space-y-1.5 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
              <span className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Folder className="h-3 w-3" />
              </span>
              <span>Categoria</span>
            </div>
            <div className="text-sm font-black text-slate-900 dark:text-white truncate">
              {categoriaNome}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Classificação <strong className="text-slate-600 dark:text-slate-300">{classificacaoCod}</strong>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* PAINEL DE GRADE & VARIAÇÕES DE ESTOQUE (MOBLINK ERP)      */}
        {/* ========================================================= */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Layers className="h-3.5 w-3.5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Grade de Numerações &amp; Variações de Cores</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono uppercase font-bold">
                    MobLink ERP
                  </span>
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isLoadingProductGrade && (
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Consultando grade no ERP...</span>
                </span>
              )}
              {selectedProductGrade?.variacoes && selectedProductGrade.variacoes.length > 0 && (
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl">
                  {selectedProductGrade.variacoes.length} variação(ões) em estoque
                </span>
              )}
            </div>
          </div>

          {isLoadingProductGrade ? (
            <div className="p-8 text-center space-y-2">
              <RefreshCw className="h-6 w-6 text-amber-500 animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500">
                Consultando tamanhos, cores e saldos da grade no ERP MobLink...
              </p>
            </div>
          ) : selectedProductGrade && selectedProductGrade.hasGrade && selectedProductGrade.variacoes.length > 0 ? (
            <div className="space-y-4">
              {/* Badges de Resumo: Numerações e Cores Disponíveis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Numerações */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      Numerações Disponíveis na Grade ({selectedProductGrade.tamanhos?.length || 0})
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Tamanhos ativos</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProductGrade.tamanhos && selectedProductGrade.tamanhos.length > 0 ? (
                      selectedProductGrade.tamanhos.map((sz) => (
                        <span
                          key={sz}
                          className="px-2.5 py-1 rounded-lg text-xs font-black bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-2xs font-mono"
                        >
                          {sz}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">Nenhum tamanho registrado</span>
                    )}
                  </div>
                </div>

                {/* Cores */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      Cores Cadastradas na Grade ({availableColors.length})
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Variações de cor</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {availableColors.length > 0 ? (
                      availableColors.map((cr) => {
                        const hasLinkedPhoto = Boolean(
                          (editColorImages[cr] && editColorImages[cr].length > 0) ||
                          editColorImageMap[cr]
                        );
                        return (
                          <span
                            key={cr}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 shadow-2xs ${
                              hasLinkedPhoto
                                ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-slate-400" />
                            <span>{cr}</span>
                            {hasLinkedPhoto && (
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" title="Foto vinculada a esta cor" />
                            )}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-xs text-slate-400 italic">Cor única / padrão</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabela Detalhada de Variações de Saldo */}
              <div className="overflow-hidden rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/90 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200/80 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3.5">Tamanho</th>
                      <th className="py-2.5 px-3.5">Cor / Variação</th>
                      <th className="py-2.5 px-3.5 text-center">Saldo em Loja</th>
                      <th className="py-2.5 px-3.5 text-right font-mono">Cód. Barras / Posição</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                    {selectedProductGrade.variacoes.map((v, i) => (
                      <tr
                        key={i}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-2.5 px-3.5 font-mono font-black text-slate-900 dark:text-white">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                            {v.tamanho || '-'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 font-bold text-slate-700 dark:text-slate-300">
                          {v.cor || '-'}
                        </td>
                        <td className="py-2.5 px-3.5 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black font-mono ${
                              v.saldo_loja > 0
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                            }`}
                          >
                            {v.saldo_loja} un
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono text-[11px] text-slate-400">
                          {v.cod_barras || v.pos_grade || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Produto com Estoque Global / Único ({saldoEstoque} unidades)
                </span>
                <span className="text-[11px] text-slate-400">
                  Este produto não possui desmembramento de grade cadastrado no ERP MobLink (ex: cosmético, produto de tamanho único).
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold shrink-0 self-start sm:self-auto">
                Estoque Único
              </span>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* SEÇÃO 1: APRESENTAÇÃO & VISIBILIDADE NA VITRINE           */}
        {/* ========================================================= */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                1
              </span>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                Apresentação &amp; Visibilidade na Vitrine
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-medium sm:text-right">
              Configure as informações principais do produto.
            </span>
          </div>

          {/* 3 Inputs em Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Nome Comercial */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 block">
                Nome Comercial do Produto (Exibido na Loja Virtual)
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Ex: BODY CREAM ATHENA 110GRM"
                className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Marca do Produto */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 block">
                Marca do Produto
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={editBrand !== undefined && editBrand !== null ? editBrand : resolvedBrand}
                  onChange={(e) => setEditBrand && setEditBrand(e.target.value)}
                  placeholder="Ex: MAISON ALHAMBRA, DAKOTA, MOLECA..."
                  list="brand-suggestions"
                  className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 uppercase"
                />
                <datalist id="brand-suggestions">
                  {brandList.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Público / Gênero */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 block">
                Público / Gênero
              </label>
              <div className="relative">
                <select
                  value={editGender !== undefined && editGender !== null ? editGender : resolvedGender}
                  onChange={(e) => setEditGender && setEditGender(e.target.value)}
                  className="w-full appearance-none px-3.5 py-2.5 pr-8 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                <ChevronDown className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* 2 Checkboxes com Check Azul */}
          <div className="pt-1 flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={editVisible}
                onChange={(e) => setEditVisible(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Exibir produto visível nas vitrines da loja virtual
              </span>
            </label>

            <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={editNewArrival}
                onChange={(e) => setEditNewArrival(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Destacar como Lançamento / Novidade
              </span>
            </label>
          </div>

          {/* EMBALAGEM DE ENVIO (MELHOR ENVIO) */}
          <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-[#f8fbff] dark:bg-slate-800/50 border border-blue-100/90 dark:border-slate-700/80 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
              <div className="flex items-center gap-2.5">
                <Package className="h-5 w-5 text-[#0071E3]" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  EMBALAGEM DE ENVIO (MELHOR ENVIO)
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                <span>Sugestão: {suggestedBoxInfo.box.name}</span>
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {suggestedBoxInfo.reason}. Esta embalagem será utilizada para as dimensões e peso no cálculo do frete e na emissão de etiquetas.
            </p>

            <div className="space-y-1.5 pt-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                SELECIONAR EMBALAGEM DO PRODUTO
              </label>
              <div className="relative">
                <select
                  value={selectedBoxId}
                  onChange={async (e) => {
                    const newBoxId = e.target.value;
                    setSelectedBoxId(newBoxId);
                    (selectedProduct as any).shippingBoxId = newBoxId;
                    const prodId = String(selectedProduct.id || selectedProduct.moblinkId || '');
                    if (prodId && db) {
                      await setDoc(doc(db, 'products', prodId), { shippingBoxId: newBoxId }, { merge: true }).catch(() => {});
                    }
                  }}
                  className="w-full appearance-none px-3.5 py-2.5 pr-8 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
                >
                  {shippingBoxes.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.length}×{b.width}×{b.height}cm • {b.weight}kg){b.id === suggestedBoxInfo.box.id ? ' ★ Sugerida' : ''}{b.isDefault ? ' (Padrão da Loja)' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 px-1 border-t border-blue-100/60 dark:border-slate-700/60 font-medium">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                <span>
                  Dimensões da caixa: <strong className="font-mono text-slate-900 dark:text-white font-bold">{activeBox.length} × {activeBox.width} × {activeBox.height} cm</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Weight className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                <span>
                  Peso embalado: <strong className="font-mono text-slate-900 dark:text-white font-bold">{activeBox.weight} kg ({Math.round(activeBox.weight * 1000)}g)</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* ========================================================= */}
        {/* SEÇÃO 2: GALERIA DE FOTOS EM ALTA RESOLUÇÃO               */}
        {/* ========================================================= */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                2
              </span>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                Galeria de Fotos em Alta Resolução
              </h2>
            </div>
            <a
              href="#dicas"
              onClick={(e) => {
                e.preventDefault();
                alert('Dicas para boas fotos:\n• Use fotos com fundo limpo (branco ou neutro)\n• Formatos recomendados: WebP, JPG ou PNG\n• O sistema otimiza e converte automaticamente para WebP ultraleve\n• Fotos de pelo menos 800x800 garantem excelente visualização');
              }}
              className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <Info className="h-3.5 w-3.5" />
              <span>Dicas para boas fotos</span>
            </a>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
            Faça o upload das imagens do produto ou utilize a busca na web para encontrar fotos com alta definição.
          </p>

          {/* Cards Lado a Lado: Drag and Drop & IA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            {/* Esquerda: Drag & Drop */}
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className={`w-full min-h-[160px] p-6 border-2 border-dashed border-blue-200 dark:border-blue-900/60 rounded-2xl bg-blue-50/20 dark:bg-blue-950/10 flex flex-col items-center justify-center text-center gap-2 cursor-pointer hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-all ${
                isUploading ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <CloudUpload className="h-6 w-6" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Arraste as imagens aqui
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 font-bold">
                  {isUploading ? 'Otimizando e enviando...' : 'ou clique para selecionar'}
                </div>
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                Formatos: JPG, PNG, WEBP | Máx. 5MB
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
            </label>

            {/* Direita: Buscar Foto na Web */}
            <div className="min-h-[160px] bg-blue-50/30 dark:bg-slate-800/30 border border-blue-100 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Search className="h-4 w-4" />
                  </div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white">
                    Buscar Foto na Web
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Encontre imagens do produto diretamente na internet ou importe fotos colando a URL no modal.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowWebSearchModal(true)}
                className="w-full py-2.5 px-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Abrir busca na web</span>
              </button>
            </div>
          </div>

          {/* Fotos Ativas (N) */}
          <div className="space-y-3 pt-2">
            <span className="text-xs font-black text-slate-900 dark:text-white block">
              Fotos Ativas ({images.length})
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((imgUrl, idx) => {
                const isMainCover = idx === 0;
                const assignedColor = Object.entries(editColorImages).find(([, list]) =>
                  Array.isArray(list) && list.includes(imgUrl)
                )?.[0];
                const isColorCover = assignedColor && editColorImageMap[assignedColor] === imgUrl;

                return (
                  <div
                    key={idx}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 shadow-2xs space-y-2.5 flex flex-col justify-between relative group"
                  >
                    {/* Imagem */}
                    <div className="relative aspect-4/3 w-full rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800">
                      <img
                        src={imgUrl}
                        alt={`Foto ${idx + 1}`}
                        className="w-full h-full object-contain"
                      />

                      {/* Badge CAPA */}
                      {isMainCover && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-emerald-600 text-white font-black text-[9px] uppercase tracking-wider shadow-xs z-10">
                          CAPA
                        </span>
                      )}

                      {/* Badge Cor Vinculada */}
                      {assignedColor && (
                        <span
                          className={`absolute ${isMainCover ? 'top-8' : 'top-2'} left-2 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shadow-xs z-10 truncate max-w-[80%] ${
                            isColorCover
                              ? 'bg-sky-600 text-white'
                              : 'bg-slate-900/80 text-sky-300 border border-sky-400/30'
                          }`}
                          title={`Cor da Grade: ${assignedColor}${isColorCover ? ' (Capa desta cor)' : ''}`}
                        >
                          {assignedColor} {isColorCover ? '★' : ''}
                        </span>
                      )}

                      {/* Menu 3 Pontinhos */}
                      <button
                        type="button"
                        onClick={() => setActiveMenuIndex(activeMenuIndex === idx ? null : idx)}
                        className="absolute top-2 right-2 p-1 rounded-md bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 shadow-2xs cursor-pointer z-10"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </button>

                      {/* Dropdown do Menu */}
                      {activeMenuIndex === idx && (
                        <div className="absolute top-9 right-2 z-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-1 min-w-[140px] text-xs space-y-0.5">
                          {!isMainCover && (
                            <button
                              type="button"
                              onClick={() => {
                                handleSetMainImage(idx);
                                setActiveMenuIndex(null);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold flex items-center gap-1.5 cursor-pointer"
                            >
                              <Star className="h-3.5 w-3.5 text-amber-500" />
                              <span>Tornar Capa</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              handleRemoveImage(idx);
                              setActiveMenuIndex(null);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Excluir Foto</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Vínculo de Cor da Grade (Se houver desmembramento de grade) */}
                    {availableColors.length > 0 && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">
                          Vincular à cor da grade:
                        </label>
                        <div className="relative">
                          <select
                            value={assignedColor || ''}
                            onChange={(e) => handlePhotoColorChange(imgUrl, e.target.value)}
                            className="w-full py-1 px-2 pr-6 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-[11px] font-bold focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
                          >
                            <option value="">-- Sem cor específica --</option>
                            {availableColors.map((c) => (
                              <option key={c} value={c}>
                                Cor: {c}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    )}

                    {/* Dados do Arquivo */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate">foto-{idx === 0 ? 'principal' : `secundaria-0${idx}`}.webp</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium pl-5">
                        WEBP • {isMainCover ? '1.2 MB' : '980 KB'}
                      </div>
                    </div>

                    {/* Ações da Foto */}
                    <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                      {isMainCover ? (
                        <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Check className="h-3 w-3" /> Foto Principal
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetMainImage(idx)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Star className="h-3 w-3 text-amber-500" />
                          <span>Definir como capa</span>
                        </button>
                      )}

                      {!isMainCover && (
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Remover foto"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Card Pontilhado: Adicionar Foto */}
              <label
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-2 hover:border-blue-500 transition-all cursor-pointer bg-slate-50/50 dark:bg-slate-900/40 min-h-[160px]"
              >
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                    Adicionar foto
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                    JPG, PNG, WEBP
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    Máx. 5MB
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SEÇÃO 3: DESCRIÇÃO COMERCIAL & FICHA TÉCNICA (HTML RICO)  */}
        {/* ========================================================= */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                3
              </span>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                Descrição Comercial &amp; Ficha Técnica (HTML Rico)
              </h2>
            </div>

            {/* Dropdown de Templates com IA */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 border border-amber-200 dark:border-amber-900/50 text-xs font-black inline-flex items-center gap-1.5 cursor-pointer shadow-2xs hover:bg-amber-200/70 transition-all"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                <span>Templates de Descrição</span>
                <ChevronDown className="h-3 w-3 ml-1" />
              </button>

              {showTemplateDropdown && (
                <div className="absolute right-0 top-9 z-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-1.5 min-w-[200px] text-xs space-y-1 animate-scale-in">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAiDescriptionModal(true);
                      setShowTemplateDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-800 dark:text-amber-300 font-extrabold flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Gerar com IA Comercial</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleInsertTemplate('couro');
                      setShowTemplateDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold cursor-pointer"
                  >
                    Couro &amp; Conforto
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleInsertTemplate('medidas');
                      setShowTemplateDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold cursor-pointer"
                  >
                    Guia de Medidas
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleInsertTemplate('cuidados');
                      setShowTemplateDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold cursor-pointer"
                  >
                    Dicas de Conservação
                  </button>
                </div>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
            Descreva os detalhes do produto, benefícios e especificações técnicas.
          </p>

          {/* 4 Pílulas de Templates Rápidos */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => applyQuickTemplate('padrao')}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTemplateTab === 'padrao'
                  ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300 shadow-2xs'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Descrição Padrão</span>
            </button>

            <button
              type="button"
              onClick={() => applyQuickTemplate('beneficios')}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTemplateTab === 'beneficios'
                  ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300 shadow-2xs'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <Star className="h-3.5 w-3.5" />
              <span>Benefícios</span>
            </button>

            <button
              type="button"
              onClick={() => applyQuickTemplate('uso')}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTemplateTab === 'uso'
                  ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300 shadow-2xs'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <Info className="h-3.5 w-3.5" />
              <span>Modo de Uso</span>
            </button>

            <button
              type="button"
              onClick={() => applyQuickTemplate('cuidados')}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTemplateTab === 'cuidados'
                  ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300 shadow-2xs'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <ShieldIcon className="h-3.5 w-3.5" />
              <span>Dicas de Conservação</span>
            </button>
          </div>

          {/* Container do Editor com Toolbar */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
            {/* Toolbar com Abas e Botões de Formatação */}
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 flex-wrap">
              {/* Abas [Editar HTML] e [Prévia Visual] */}
              <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-slate-800 p-0.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('editor')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'editor'
                      ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Editar HTML</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'preview'
                      ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Prévia Visual</span>
                </button>
              </div>

              {/* Ícones de Formatação B, I, U, S, Listas, Link, Código */}
              {activeTab === 'editor' && (
                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                  <button
                    type="button"
                    onClick={() => insertFormatting('<strong>', '</strong>')}
                    className="p-1.5 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-700 transition-colors"
                    title="Negrito"
                  >
                    <Bold className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('<em>', '</em>')}
                    className="p-1.5 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-700 transition-colors"
                    title="Itálico"
                  >
                    <Italic className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('<u>', '</u>')}
                    className="p-1.5 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-700 transition-colors"
                    title="Sublinhado"
                  >
                    <Underline className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('<s>', '</s>')}
                    className="p-1.5 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-700 transition-colors"
                    title="Tachado"
                  >
                    <Strikethrough className="h-4 w-4" />
                  </button>

                  <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1"></div>

                  <button
                    type="button"
                    onClick={() => insertFormatting('<ul>\n  <li>', '</li>\n</ul>')}
                    className="p-1.5 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-700 transition-colors"
                    title="Lista com marcadores"
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('<ol>\n  <li>', '</li>\n</ol>')}
                    className="p-1.5 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-700 transition-colors"
                    title="Lista numerada"
                  >
                    <ListOrdered className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('<a href="#">', '</a>')}
                    className="p-1.5 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-700 transition-colors"
                    title="Inserir link"
                  >
                    <LinkIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('<code>', '</code>')}
                    className="p-1.5 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-700 transition-colors"
                    title="Código"
                  >
                    <CodeIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Conteúdo do Editor ou Prévia */}
            {activeTab === 'editor' ? (
              <div className="relative">
                <textarea
                  value={richDescription}
                  onChange={(e) => setRichDescription(e.target.value)}
                  rows={8}
                  placeholder="Insira a descrição completa do produto..."
                  className="w-full p-4 bg-transparent text-slate-800 dark:text-slate-100 text-xs font-mono font-medium focus:outline-none resize-y leading-relaxed"
                />
                <div className="absolute right-3 bottom-2 text-[10px] font-mono text-slate-400">
                  {richDescription.length} / 2000
                </div>
              </div>
            ) : (
              <div
                className="p-5 text-xs leading-relaxed space-y-2 min-h-[180px] prose dark:prose-invert max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                dangerouslySetInnerHTML={{ __html: richDescription || '<p class="italic text-slate-400">Nenhuma descrição informada.</p>' }}
              />
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* FOOTER FIXO / BARRA DE FINALIZAÇÃO                        */}
        {/* ========================================================= */}
        <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleCloseEnrichmentForm}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-2xs cursor-pointer active:scale-95"
          >
            <ArrowLeft className="h-4 w-4 text-slate-500" />
            <span>Cancelar e voltar</span>
          </button>

          <button
            type="button"
            onClick={handleSaveProductEnrichment}
            className="inline-flex items-center gap-2.5 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs rounded-xl transition-all shadow-md cursor-pointer active:scale-95"
          >
            <Save className="h-4 w-4" />
            <span>Salvar alterações</span>
          </button>
        </div>
      </div>

      {/* MODAIS DE IA (WEB SEARCH & DESCRIÇÃO AUTOMÁTICA) */}
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

// Ícone auxiliar de escudo
function ShieldIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  );
}
