import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useApp, DEFAULT_CATEGORIES } from '../context/AppContext';
import { Product, ProdutoGradesResult } from '../types';
import { 
  getProdutosMoblink, 
  getSingleProdutoMoblink,
  getSingleProdutoMoblinkFromApi,
  extractPrecoTabelaMoblink,
  extractPrecoVistaMoblink,
  extractPrecoCartaoMoblink,
  extractSaldoLojaMoblink, 
  sanitizeProductForFirestore,
  mergeErpSyncWithExistingDbProduct,
  extractBaseNameAndVariant,
  hasProductChanged,
  hasProductValidGrade,
  hasProductValidPhoto,
  isNonFootwearProduct,
  extractClassificacaoCategoria,
  isIgnoredClassification,
  saveMoblinkCache,
  loadMoblinkCache
} from '../services/moblinkProductsService';
import { moblinkCategoriesService, normalizeCategoryName, normalizeSubcategoryName, isProductInCategory } from '../services/moblinkCategoriesService';
import { getProdutoGradesFromApi } from '../services/moblinkGradesService';
import { generateProductsExcelReport } from '../services/excelReportService';
import { 
  AdminProductsTable, 
  ProductAiSearchPhotoButton, 
  ProductAiDescriptionButton, 
  ProductAiAssistantModals,
  ProductEditModal,
  ProductEditPage,
} from './products';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { 
  uploadImageToSupabase, 
  uploadOptimizedProductPhoto,
  preserveExistingImages,
  isSupabaseConfigured, 
  deleteImageFromSupabase, 
  auditSupabaseVsFirebasePhotos, 
  PhotoAuditReport, 
  SupabaseAuditItem, 
  syncProductMediaToSupabase, 
  autoLinkSupabasePhotosToFirestore,
  backupAllProductPhotosToSupabase,
  restoreAllProductPhotosFromSupabase
} from '../services/supabaseStorageService';
import { validateImageFile } from '../services/imageOptimizationService';
import { NO_PHOTO_SVG, isPlaceholderUrl, isValidWebPhotoUrl } from '../utils/placeholder';
import { 
  getBrokenPhotosMap, 
  subscribeToBrokenPhotos, 
  auditProductsPhotos, 
  recordBrokenPhoto, 
  clearBrokenPhoto,
  resetBrokenPhotos, 
  PhotoAuditProgress 
} from '../services/brokenPhotoService';
import { resolveProductBrand } from '../utils/brandUtils';
import { resolveProductGender } from '../utils/genderUtils';
import { ProductImage } from './products/atomic/ProductImage';
import { 
  Package, 
  Search, 
  FileSpreadsheet,
  Image as ImageIcon, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Plus, 
  Trash2, 
  Upload, 
  RefreshCw, 
  Zap, 
  Sparkles, 
  Barcode, 
  Tag, 
  Save, 
  Edit3, 
  Sliders, 
  Eye,
  EyeOff, 
  X,
  Layers,
  ArrowRight,
  ShieldCheck,
  Palette,
  Grid,
  List,
  Filter,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ChevronLeft,
  Boxes,
  Database,
  Wifi,
  LayoutGrid,
  Hash,
  FolderTree,
  CheckSquare,
  Square,
  Check,
  Tags,
  Folder,
  ExternalLink,
  Globe
} from 'lucide-react';

const resolveProductSubcategory = (item: any, existingDb?: Product | null): string => {
  const catInfo = extractClassificacaoCategoria(item);
  const rawSub = item?.subcategoria || item?.subcategory || item?.nome_subgrupo || item?.subgrupo || existingDb?.subcategory || catInfo?.subcategory || '';
  const normSub = normalizeSubcategoryName(rawSub);
  if (normSub && normSub.toUpperCase() !== 'GERAL' && normSub.toUpperCase() !== 'OUTROS') {
    return normSub;
  }

  const name = String(item?.nome || item?.name || item?.descricao || existingDb?.name || '').toUpperCase();
  if (name.includes('BABUCH')) return 'Babuche';
  if (name.includes('SANDALIA') || name.includes('SANDÁLIA')) return 'Sandálias';
  if (name.includes('TENIS') || name.includes('TÊNIS') || name.includes('SNEAKER')) return 'Tênis';
  if (name.includes('SAPATILHA')) return 'Sapatilhas';
  if (name.includes('SAPATO') || name.includes('MOCASSIM') || name.includes('LOAFER')) return 'Sapatos';
  if (name.includes('RASTEIRA') || name.includes('RASTEIRINHA')) return 'Rasteiras';
  if (name.includes('SALTO') || name.includes('SCARPIN') || name.includes('MULE')) return 'Saltos';
  if (name.includes('BOTA') || name.includes('BOOT')) return 'Botas';
  if (name.includes('PAPETE')) return 'Papetes';
  if (name.includes('CHINELO') || name.includes('SLIDE')) return 'Chinelos & Slides';
  if (name.includes('BOLSA') || name.includes('CARTEIRA') || name.includes('CINTO')) return 'Bolsas & Acessórios';

  return 'Infantil / Casual';
};

export interface MoblinkRawProduct {
  id: string | number;
  moblinkId?: string;
  sku?: string;
  codigo?: string;
  nome?: string;
  name?: string;
  descricaoMoblink?: string;
  descricao?: string;
  compl_descr?: string;
  descr_compl?: string;
  descricao_completa?: string;
  preco?: number;
  price?: number;
  /** Preço de tabela (carnê / parcelado) */
  preco_venda?: number;
  preco_venda_fracao?: number;
  /** Preço à vista vindo do array precos (nome_tab_preco === 'A VISTA') */
  preco_vista?: number;
  precoVista?: number;
  /** Preço promocional opcional */
  preco_promocao?: number;
  /** Código de classificação ERP (ex: '002.004' ou 'CALCADOS') */
  classificacao?: string | number;
  precos?: Array<{
    nome_tab_preco?: string;
    tabela?: string;
    tipo?: string;
    nome?: string;
    preco?: number;
    valor?: number;
    preco_venda?: number;
    price?: number;
  }>;
  precoOriginal?: number;
  estoque?: number;
  stock?: number;
  saldo_loja?: number;
  saldos_lojas?: any;
  id_grade?: number | string;
  categoria?: string;
  subcategoria?: string;
  nome_grupo?: string;
  nome_subgrupo?: string;
  category?: string;
  tamanhos?: (number | string)[];
  codigoBarras?: string;
  barcode?: string;
  marca?: string;
  brand?: string;
  material?: string;
  cor?: string;
  genero?: string;
  gender?: string;
  subcategory?: string;
  foto_uri?: string;
  foto_url?: string;
  foto?: string;
  imagem?: string;
  image?: string;
  isManual?: boolean;
  id_grupo?: string | number;
  id_subgrupo?: string | number;
  cod_classificacao?: string;
  codigo_classificacao?: string;
  classificacao_erp?: string;
  modelCode?: string;
  referencia?: string;
  referenceCode?: string;
  newArrival?: boolean;
  color?: string;
}

const extractProductClassification = (item: any, existingDb?: any): { grupo: string; subgrupo: string; raw: string } => {
  let raw = String(
    item?.classificacao ||
    existingDb?.classificacao ||
    item?.codigo_classificacao ||
    existingDb?.codigo_classificacao ||
    item?.cod_classificacao ||
    existingDb?.cod_classificacao ||
    item?.classificacao_erp ||
    existingDb?.classificacao_erp ||
    ''
  ).trim();

  const gId = item?.id_grupo ?? existingDb?.id_grupo;
  const sId = item?.id_subgrupo ?? existingDb?.id_subgrupo;
  if (!raw && gId !== undefined && gId !== null && String(gId).trim() !== '') {
    raw = (sId !== undefined && sId !== null && String(sId).trim() !== '') 
      ? `${String(gId).trim()}.${String(sId).trim()}` 
      : String(gId).trim();
  }

  if (!raw) {
    const catInfo = extractClassificacaoCategoria(existingDb || item);
    if (catInfo.classificacao) {
      raw = catInfo.classificacao.trim();
    }
  }

  if (!raw) {
    const cat = item?.category || item?.categoria || existingDb?.category || existingDb?.categoria || '';
    const sub = item?.subcategory || item?.subcategoria || item?.nome_subgrupo || existingDb?.subcategory || existingDb?.subcategoria || existingDb?.nome_subgrupo || '';
    const reverseCode = moblinkCategoriesService.findClassificacaoByCategory(cat, sub);
    if (reverseCode) {
      raw = reverseCode;
    }
  }

  let grupo = '';
  let subgrupo = '';
  if (raw) {
    const parts = raw.split('.');
    grupo = (parts[0] || '').trim();
    subgrupo = (parts[1] || '').trim();
  } else {
    grupo = gId !== undefined && gId !== null ? String(gId).trim() : '';
    subgrupo = sId !== undefined && sId !== null ? String(sId).trim() : '';
  }

  return { grupo, subgrupo, raw };
};

const extractBestRealPhoto = (prod: any): string => {
  if (!prod) return '';

  if (Array.isArray(prod.images)) {
    for (const img of prod.images) {
      if (img && typeof img === 'string' && !isPlaceholderUrl(img)) {
        return img.trim();
      }
    }
  }

  if (prod.imageUrl && typeof prod.imageUrl === 'string' && !isPlaceholderUrl(prod.imageUrl)) {
    return prod.imageUrl.trim();
  }

  if (prod.colorImages && typeof prod.colorImages === 'object') {
    for (const urls of Object.values(prod.colorImages)) {
      if (Array.isArray(urls)) {
        for (const u of urls) {
          if (u && typeof u === 'string' && !isPlaceholderUrl(u as string)) {
            return (u as string).trim();
          }
        }
      }
    }
  }

  if (prod.colorImageMap && typeof prod.colorImageMap === 'object') {
    for (const u of Object.values(prod.colorImageMap)) {
      if (u && typeof u === 'string' && !isPlaceholderUrl(u as string)) {
        return (u as string).trim();
      }
    }
  }

  if (prod.foto_uri && typeof prod.foto_uri === 'string' && !isPlaceholderUrl(prod.foto_uri)) {
    return prod.foto_uri.trim();
  }

  return '';
};

export interface MoblinkProductsManagerProps {
  onBack?: () => void;
}

export const MoblinkProductsManager: React.FC<MoblinkProductsManagerProps> = ({ onBack }) => {
  const { products, addProduct, updateProduct, deleteProduct, deleteProductsBatch, categories, theme, goBack } = useApp();

  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; phase: string } | null>(null);

  const [moblinkList, setMoblinkList] = useState<MoblinkRawProduct[]>(() => {
    // PLANO B: A tabela do gerenciador reflete estritamente os produtos cadastrados e aprovados no e-commerce.
    // REGRA MANDATÓRIA: Produtos com classificação 001.001 NUNCA aparecem no catálogo do e-commerce.
    return (products || [])
      .filter(dbProd => !isIgnoredClassification(dbProd))
      .map(dbProd => {
        const dbId = String(dbProd?.id || `PROD-${Math.random()}`);
      return {
        id: dbId,
        moblinkId: dbProd?.moblinkId,
        sku: dbProd?.sku || dbProd?.modelOrSku || dbId,
        nome: dbProd?.name || 'Produto sem nome',
        name: dbProd?.name || 'Produto sem nome',
        descricao: dbProd?.description || dbProd?.name || 'Sem descrição',
        compl_descr: (dbProd as any)?.compl_descr,
        preco_venda: typeof dbProd?.price === 'number' ? dbProd.price : 0,
        price: typeof dbProd?.price === 'number' ? dbProd.price : 0,
        preco_vista: typeof (dbProd as any)?.precoVista === 'number' ? (dbProd as any).precoVista : (dbProd as any)?.preco_vista,
        precoVista: typeof (dbProd as any)?.precoVista === 'number' ? (dbProd as any).precoVista : undefined,
        preco_promocao: (dbProd as any)?.preco_promocao,
        saldo_loja: typeof dbProd?.stock === 'number' ? Math.max(0, dbProd.stock) : 0,
        estoque: typeof dbProd?.stock === 'number' ? Math.max(0, dbProd.stock) : 0,
        /** Classificação ERP — preservada do Firebase */
        classificacao: (dbProd as any)?.classificacao,
        id_grupo: (dbProd as any)?.id_grupo,
        id_subgrupo: (dbProd as any)?.id_subgrupo,
        cod_classificacao: (dbProd as any)?.cod_classificacao || (dbProd as any)?.codigo_classificacao,
        codigo_classificacao: (dbProd as any)?.codigo_classificacao || (dbProd as any)?.cod_classificacao,
        classificacao_erp: (dbProd as any)?.classificacao_erp,
        categoria: dbProd?.category || 'Geral',
        subcategoria: (dbProd as any)?.subcategory || dbProd?.nome_subgrupo,
        nome_grupo: (dbProd as any)?.nome_grupo || dbProd?.category || 'Geral',
        nome_subgrupo: dbProd?.nome_subgrupo || (dbProd as any)?.subcategory,
        category: dbProd?.category || 'Geral',
        tamanhos: Array.isArray(dbProd?.sizes) ? dbProd.sizes : [],
        foto_uri: extractBestRealPhoto(dbProd),
        modelCode: dbProd?.modelCode || dbProd?.referenceCode,
        referenceCode: dbProd?.referenceCode || dbProd?.modelCode,
        cor: (dbProd as any)?.cor || dbProd?.color,
        color: dbProd?.color || (dbProd as any)?.cor,
        marca: (dbProd as any)?.brand || (dbProd as any)?.marca,
        material: dbProd?.material,
        genero: (dbProd as any)?.gender || (dbProd as any)?.genero,
        barcode: dbProd?.barcode,
        newArrival: dbProd?.newArrival,
        isManual: !dbProd?.moblinkId && !dbId.startsWith('MOB-')
      };
    });
  });

  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [subcategoryFilter, setSubcategoryFilter] = useState('Todas');
  const [classificacaoGrupoFilter, setClassificacaoGrupoFilter] = useState('');
  const [classificacaoSubgrupoFilter, setClassificacaoSubgrupoFilter] = useState('');
  const [baseNameFilter, setBaseNameFilter] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');
  const [syncFilter, setSyncFilter] = useState<'todos' | 'erp' | 'manual'>('todos');
  const [hideOutOfStock, setHideOutOfStock] = useState(false);
  const [hideNoGrade, setHideNoGrade] = useState(false);
  const [gradeFilter, setGradeFilter] = useState<'todos' | 'com_grade' | 'sem_grade'>('todos');
  const [visibilityFilter, setVisibilityFilter] = useState<'todos' | 'visivel' | 'oculto'>('todos');
  const [photoFilter, setPhotoFilter] = useState<'todos' | 'com_foto' | 'sem_foto' | 'com_erro'>('todos');
  const [brokenPhotoMap, setBrokenPhotoMap] = useState<Record<string, string>>(getBrokenPhotosMap());
  const [isCheckingBrokenPhotos, setIsCheckingBrokenPhotos] = useState<boolean>(false);
  const [brokenAuditProgress, setBrokenAuditProgress] = useState<PhotoAuditProgress | null>(null);
  const [sortBy, setSortBy] = useState<'nameSku' | 'refMoblink' | 'stockAsc' | 'stockDesc'>('nameSku');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    try {
      const cacheStr = localStorage.getItem("moblink_products_cache");
      if (cacheStr) {
        const data = JSON.parse(cacheStr);
        if (data?.cachedAt) {
          const d = new Date(data.cachedAt);
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          const hours = String(d.getHours()).padStart(2, '0');
          const minutes = String(d.getMinutes()).padStart(2, '0');
          return `${day}/${month}/${year} • ${hours}:${minutes}`;
        }
      }
    } catch (e) {}
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} • ${hours}:${minutes}`;
  });

  const updateLastSyncTimestamp = useCallback(() => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    setLastSyncTime(`${day}/${month}/${year} • ${hours}:${minutes}`);
  }, []);

  // Inscreve para atualizações em tempo real do mapa de fotos com erro (404)
  useEffect(() => {
    const unsubscribe = subscribeToBrokenPhotos((map) => {
      setBrokenPhotoMap(map);
    });
    return unsubscribe;
  }, []);

  // Paginação da tabela (50 itens por página para suportar 1.800+ itens)
  const PAGE_SIZE = 50;
  const [currentPage, setCurrentPage] = useState(1);

  // Selected Product for Full Edit Form
  const [selectedProduct, setSelectedProduct] = useState<MoblinkRawProduct | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [richDescription, setRichDescription] = useState('');
  const [showWebSearchModal, setShowWebSearchModal] = useState(false);
  const [showAiDescriptionModal, setShowAiDescriptionModal] = useState(false);

  // Editable Product Fields State
  const [editName, setEditName] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editSku, setEditSku] = useState('');
  const [editModelCode, setEditModelCode] = useState('');
  const [editPrice, setEditPrice] = useState<number | string>('');
  const [editOriginalPrice, setEditOriginalPrice] = useState<number | string>('');
  const [editStock, setEditStock] = useState<number | string>('');
  const [editCategory, setEditCategory] = useState('');
  const [editVisible, setEditVisible] = useState(true);
  const [editNewArrival, setEditNewArrival] = useState(false);
  const [editSizes, setEditSizes] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editStockBySize, setEditStockBySize] = useState<Record<string, number>>({});
  const [editColorImageMap, setEditColorImageMap] = useState<Record<string, string>>({});
  const [editColorImages, setEditColorImages] = useState<Record<string, string[]>>({});

  // Estado para armazenar dados de Grade do Produto buscados do ERP
  const [selectedProductGrade, setSelectedProductGrade] = useState<ProdutoGradesResult | null>(null);
  const [isLoadingProductGrade, setIsLoadingProductGrade] = useState(false);

  // Consulta automática de Grade de Produto (MobLink ERP) com filtro de saldo > 0 ao abrir o modal
  const [isAuditingPhotos, setIsAuditingPhotos] = useState(false);
  const [photoAuditReport, setPhotoAuditReport] = useState<PhotoAuditReport | null>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditTab, setAuditTab] = useState<'all' | 'orphan' | 'linked'>('orphan');

  const handleRunPhotoAudit = async () => {
    setIsAuditingPhotos(true);
    try {
      const report = await auditSupabaseVsFirebasePhotos(products);
      setPhotoAuditReport(report);
      setShowAuditModal(true);
      setFeedback({
        success: true,
        message: `Auditoria concluída com sucesso! ${report.totalOrphanPhotos} foto(s) órfã(s) encontrada(s) no Supabase Storage.`,
      });
    } catch (err: any) {
      setFeedback({
        success: false,
        message: `Erro na auditoria de fotos: ${err.message || 'Falha ao conectar com o Supabase Storage.'}`,
      });
    } finally {
      setIsAuditingPhotos(false);
    }
  };

  const [isLinkingSupabase, setIsLinkingSupabase] = useState(false);

  const handleAutoLinkSupabasePhotos = async () => {
    setIsLinkingSupabase(true);
    try {
      const { updatedCount } = await autoLinkSupabasePhotosToFirestore(products);
      setFeedback({
        success: true,
        message: `🎉 Vinculação concluída! ${updatedCount} produto(s) tiveram suas fotos do Supabase salvas e atreladas por ID.`,
      });
    } catch (err: any) {
      setFeedback({
        success: false,
        message: `Erro ao vincular fotos do Supabase: ${err.message || 'Falha na varredura.'}`,
      });
    } finally {
      setIsLinkingSupabase(false);
    }
  };

  /**
   * Sincronização Unificada de Mídias (Supabase Storage):
   * Vincula fotos por ID e abre o relatório de auditoria de fotos em 1 clique
   */
  const handleUnifiedSupabaseSync = async () => {
    setIsLinkingSupabase(true);
    setIsAuditingPhotos(true);
    try {
      const { updatedCount } = await autoLinkSupabasePhotosToFirestore(products);
      const report = await auditSupabaseVsFirebasePhotos(products);
      setPhotoAuditReport(report);
      setShowAuditModal(true);
      setFeedback({
        success: true,
        message: `🎉 Vinculação & Auditoria do Supabase concluídas! ${updatedCount} produto(s) vinculados e ${report.totalOrphanPhotos} foto(s) órfã(s) identificadas.`,
      });
    } catch (err: any) {
      setFeedback({
        success: false,
        message: `Erro na sincronização do Supabase Storage: ${err.message || 'Falha ao conectar.'}`,
      });
    } finally {
      setIsLinkingSupabase(false);
      setIsAuditingPhotos(false);
    }
  };

  const [isBackingUpPhotos, setIsBackingUpPhotos] = useState(false);
  const [isRestoringPhotos, setIsRestoringPhotos] = useState(false);

  /**
   * Salva um backup consolidado de todos os links de fotos no Supabase Storage e Supabase DB
   */
  const handleBackupPhotosToSupabase = async () => {
    setIsBackingUpPhotos(true);
    try {
      const result = await backupAllProductPhotosToSupabase(products);
      if (result.error) {
        setFeedback({
          success: true,
          message: `⚠️ Backup local concluído para ${result.backedUpCount} produto(s). ${result.error}`,
        });
      } else {
        setFeedback({
          success: true,
          message: `🛡️ Backup no Supabase concluído com sucesso! ${result.backedUpCount} produto(s) com fotos e links protegidos na nuvem.`,
        });
      }
    } catch (err: any) {
      setFeedback({
        success: false,
        message: `Erro ao realizar backup no Supabase: ${err.message || 'Falha na gravação.'}`,
      });
    } finally {
      setIsBackingUpPhotos(false);
    }
  };

  /**
   * Restaura todas as fotos a partir do backup do Supabase
   */
  const handleRestorePhotosFromSupabase = async () => {
    setIsRestoringPhotos(true);
    try {
      const result = await restoreAllProductPhotosFromSupabase(products);
      setFeedback({
        success: true,
        message: `🎉 Restauração concluída! ${result.updatedCount} produto(s) recuperaram suas fotos salvas a partir do backup do Supabase.`,
      });
    } catch (err: any) {
      setFeedback({
        success: false,
        message: `Erro ao restaurar fotos do Supabase: ${err.message || 'Falha na recuperação.'}`,
      });
    } finally {
      setIsRestoringPhotos(false);
    }
  };

  // Automação: Varre o banco de dados e salva automaticamente visible: true para todos os produtos com foto real
  const [isAutoActivatingVisible, setIsAutoActivatingVisible] = useState(false);

  const handleAutoSetVisibleForProductsWithPhotos = async (silent: boolean = false) => {
    if (!products || products.length === 0) return;

    const targets = products.filter(p => {
      const stock = (p.stock !== undefined ? p.stock : (p.saldo_loja ?? 0));
      if (stock <= 0) return false;
      const catInfo = extractClassificacaoCategoria(p);
      if (catInfo.category === 'Sem Classificação Definida' || !catInfo.isDefined) return false;
      const hasPhoto = hasProductValidPhoto(p);
      return hasPhoto && p.visible !== true;
    });

    if (targets.length === 0) {
      if (!silent) {
        setFeedback({
          success: true,
          message: 'Todos os produtos com foto já estão salvos e visíveis no banco de dados!',
        });
        setTimeout(() => setFeedback(null), 4000);
      }
      return;
    }

    setIsAutoActivatingVisible(true);
    if (!silent) {
      setFeedback({
        success: true,
        message: `Automatizando: Salvando visibilidade no banco de dados para ${targets.length} produto(s) com foto...`,
      });
    }

    let updatedCount = 0;
    try {
      const chunkSize = 15;
      for (let i = 0; i < targets.length; i += chunkSize) {
        const chunk = targets.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (prod) => {
            const id = String(prod.id || prod.moblinkId).trim();
            if (!id) return;

            const updatedFields = {
              visible: true,
              updatedAt: new Date().toISOString(),
            };

            updateProduct(id, updatedFields);

            try {
              await setDoc(doc(db, 'products', id), updatedFields, { merge: true });
              updatedCount++;
            } catch (e) {
              console.warn(`[AutoVisible] Falha ao salvar visibilidade para produto ${id}:`, e);
            }
          })
        );
      }

      if (!silent) {
        setFeedback({
          success: true,
          message: `✅ Sucesso! ${updatedCount} produto(s) com foto foram ativados e salvos no banco de dados automaticamente!`,
        });
        setTimeout(() => setFeedback(null), 5000);
      }
    } catch (err: any) {
      console.warn('[AutoVisible] Erro na automação de salvamento de visibilidade:', err);
    } finally {
      setIsAutoActivatingVisible(false);
    }
  };

  // Executa a automação silenciosamente em segundo plano ao carregar os produtos
  const hasAutoRunRef = useRef(false);
  useEffect(() => {
    if (products && products.length > 0 && !hasAutoRunRef.current) {
      hasAutoRunRef.current = true;
      handleAutoSetVisibleForProductsWithPhotos(true).catch(() => {});
    }
  }, [products]);

  // Auditoria em lote de fotos quebradas (404 / NoSuchKey no Supabase Storage)
  const handleAuditBrokenPhotos = async () => {
    setIsCheckingBrokenPhotos(true);
    const catalogToAudit = combinedCatalog && combinedCatalog.length > 0 ? combinedCatalog : moblinkList;
    setBrokenAuditProgress({ checked: 0, total: catalogToAudit.length, brokenCount: 0 });

    try {
      setFeedback({
        success: true,
        message: `🔍 Iniciando auditoria de fotos em lote... Testando integridade das imagens contra erros 404...`,
      });

      const result = await auditProductsPhotos(catalogToAudit, (prog) => {
        setBrokenAuditProgress(prog);
      });

      setBrokenPhotoMap(result.brokenMap);

      if (result.brokenCount > 0) {
        setPhotoFilter('com_erro');
        setFeedback({
          success: false,
          message: `⚠️ Auditoria concluída! Encontrados ${result.brokenCount} produto(s) com fotos quebradas (404 / NoSuchKey). O filtro foi ativado!`,
        });
      } else {
        setFeedback({
          success: true,
          message: `✅ Perfeito! Todas as ${result.totalAudited} fotos auditadas estão íntegras e funcionando!`,
        });
      }
      setTimeout(() => setFeedback(null), 8000);
    } catch (err: any) {
      setFeedback({
        success: false,
        message: `Falha ao auditar fotos: ${err.message || 'Erro inesperado'}`,
      });
    } finally {
      setIsCheckingBrokenPhotos(false);
      setBrokenAuditProgress(null);
    }
  };

  // Sincronização de UM ÚNICO produto por ID (Solicitado pelo Administrador)
  const [singleSyncId, setSingleSyncId] = useState('');
  const [showSingleSyncModal, setShowSingleSyncModal] = useState(false);
  const [isSyncingSingle, setIsSyncingSingle] = useState(false);

  const handleSyncSingleProduct = async (targetIdInput?: string) => {
    const rawTarget = targetIdInput || singleSyncId;
    const targetId = rawTarget.trim().replace(/^MOB-/i, '');
    if (!targetId) {
      setFeedback({ success: false, message: 'Por favor, informe um ID de produto válido para sincronizar.' });
      return;
    }

    setIsSyncingSingle(true);
    setFetchError(null);
    setFeedback(null);
    setSyncProgress({ current: 1, total: 1, phase: `Consultando produto ID ${targetId} no ERP MobLink...` });

    try {
      const erpItem = await getSingleProdutoMoblink(targetId);

      if (!erpItem) {
        setFeedback({
          success: false,
          message: `❌ Produto com ID "${targetId}" não foi localizado no ERP MobLink.`
        });
        return;
      }

      const mobId = String(erpItem.id || targetId);
      const existingDb = getExistingDbProduct(mobId);

      const precoTabela = extractPrecoTabelaMoblink(erpItem);
      const precoVista = extractPrecoVistaMoblink(erpItem);
      const estoqueAtual = extractSaldoLojaMoblink(erpItem);
      const itemHasGrade = hasProductValidGrade(erpItem);
      const itemHasPhoto = hasProductValidPhoto(erpItem) || hasProductValidPhoto(existingDb);

      const updatedProductPayload: any = {
        id: mobId,
        moblinkId: mobId,
        name: erpItem.nome || erpItem.name || erpItem.descricao,
        descricao: erpItem.descricao || erpItem.nome,
        description: existingDb?.description || erpItem.compl_descr || erpItem.descricao || '',
        price: precoTabela,
        preco_venda: precoTabela,
        precoVista: precoVista,
        preco_vista: precoVista,
        preco_promocao: erpItem.preco_promocao,
        classificacao: erpItem.classificacao,
        category: (erpItem.categoria && erpItem.categoria !== 'Geral') ? erpItem.categoria : (existingDb?.category || erpItem.categoria || erpItem.category || 'Geral'),
        subcategory: erpItem.subcategoria || existingDb?.subcategory || '',
        nome_grupo: erpItem.nome_grupo || existingDb?.nome_grupo || '',
        nome_subgrupo: erpItem.nome_subgrupo || existingDb?.nome_subgrupo || '',
        foto_uri: erpItem.foto_uri,
        images: (existingDb?.images && existingDb.images.length > 0) ? existingDb.images : (erpItem.foto_uri ? [erpItem.foto_uri] : []),
        sizes: existingDb?.sizes || (Array.isArray(erpItem.tamanhos) ? erpItem.tamanhos : []),
        crediarioProprio: true,
        hasGrade: itemHasGrade,
        visible: (estoqueAtual > 0 && itemHasPhoto) ? (existingDb?.visible ?? true) : false,
        stockControl: true,
        stock: estoqueAtual,
        saldo_loja: estoqueAtual,
        stockBySize: existingDb?.stockBySize || existingDb?.sizeStockMap,
        sizeStockMap: existingDb?.sizeStockMap || existingDb?.stockBySize,
        lastMoblinkSync: new Date().toISOString(),
        moblinkSyncStatus: 'synced',
        modelCode: existingDb?.modelCode || existingDb?.referenceCode,
        referenceCode: existingDb?.referenceCode || existingDb?.modelCode,
        color: existingDb?.color || erpItem.cor || undefined,
        cor: existingDb?.cor || erpItem.cor || undefined,
      };

      try {
        const sanitizedPayload = sanitizeProductForFirestore(updatedProductPayload);
        await setDoc(doc(db, 'products', mobId), sanitizedPayload, { merge: true });

        if (existingDb) {
          await updateProduct(mobId, updatedProductPayload);
        } else {
          await addProduct(updatedProductPayload);
        }
      } catch (writeErr) {
        console.warn(`[MoblinkProductsManager] Aviso ao salvar produto individual no Firestore: ${mobId}`, writeErr);
        if (existingDb) {
          try { await updateProduct(mobId, updatedProductPayload); } catch {}
        }
      }

      setMoblinkList(prev => {
        const exists = prev.some(p => String(p.id || p.moblinkId) === mobId);
        if (exists) {
          return prev.map(p => String(p.id || p.moblinkId) === mobId ? { ...p, ...erpItem } : p);
        } else {
          return [erpItem, ...prev];
        }
      });

      setFeedback({
        success: true,
        message: `⚡ Produto ID ${mobId} ("${erpItem.nome || erpItem.descricao}") sincronizado com sucesso!`
      });
      setShowSingleSyncModal(false);
      setSingleSyncId('');
    } catch (err: any) {
      setFeedback({
        success: false,
        message: `Falha ao sincronizar produto ID "${targetId}": ${err.message || 'Erro de conexão'}`
      });
    } finally {
      setSyncProgress(null);
      setIsSyncingSingle(false);
    }
  };

  const handleDeleteAuditOrphan = async (item: SupabaseAuditItem) => {
    try {
      const success = await deleteImageFromSupabase(item.publicUrl);
      if (success) {
        setPhotoAuditReport(prev => {
          if (!prev) return null;
          const updatedItems = prev.items.filter(i => i.publicUrl !== item.publicUrl);
          return {
            ...prev,
            totalSupabaseFiles: Math.max(0, prev.totalSupabaseFiles - 1),
            totalOrphanPhotos: Math.max(0, prev.totalOrphanPhotos - 1),
            items: updatedItems,
          };
        });
        setFeedback({ success: true, message: `Foto "${item.name}" excluída do Supabase Storage.` });
      }
    } catch (err: any) {
      setFeedback({ success: false, message: `Falha ao excluir foto: ${err.message}` });
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (selectedProduct) {
      const mobId = String(selectedProduct.id || (selectedProduct as any).moblinkId || '');
      if (mobId) {
        setIsLoadingProductGrade(true);
        getProdutoGradesFromApi(mobId)
          .then(res => {
            if (isMounted) {
              setSelectedProductGrade(res);
              setIsLoadingProductGrade(false);
            }
          })
          .catch(() => {
            if (isMounted) {
              setSelectedProductGrade(null);
              setIsLoadingProductGrade(false);
            }
          });
      }
    } else {
      setSelectedProductGrade(null);
      setIsLoadingProductGrade(false);
    }
    return () => { isMounted = false; };
  }, [selectedProduct]);

  // Estado para controle de Sanfona / Expansão Hierárquica por Modelo
  const [expandedModels, setExpandedModels] = useState<Record<string, boolean>>({});

  // Estado para Seleção por Checkbox e Edição em Lote da Ref Pai e Categoria
  const [selectedMobIds, setSelectedMobIds] = useState<Record<string, boolean>>({});
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchModelCode, setBatchModelCode] = useState('');
  const [isSavingBatch, setIsSavingBatch] = useState(false);

  // Estado para Edição em Lote de Categoria
  const [isBatchCategoryModalOpen, setIsBatchCategoryModalOpen] = useState(false);
  const [batchCategory, setBatchCategory] = useState('');
  const [isSavingBatchCategory, setIsSavingBatchCategory] = useState(false);

  // Estado para Edição em Lote de Visibilidade nas Vitrines
  const [isBatchVisibilityModalOpen, setIsBatchVisibilityModalOpen] = useState(false);
  const [batchVisibilityValue, setBatchVisibilityValue] = useState<boolean>(true);
  const [isSavingBatchVisibility, setIsSavingBatchVisibility] = useState(false);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);

  const selectedIdsList = Object.keys(selectedMobIds).filter(id => selectedMobIds[id]);

  const toggleSelectProduct = useCallback((mobId: string) => {
    setSelectedMobIds(prev => ({
      ...prev,
      [mobId]: !prev[mobId]
    }));
  }, []);

  const toggleSelectGroup = useCallback((groupItems: Array<{ mobId: string }>) => {
    const groupMobIds = groupItems.map(i => i.mobId);
    setSelectedMobIds(prev => {
      const allSelected = groupMobIds.every(id => prev[id]);
      const next = { ...prev };
      groupMobIds.forEach(id => {
        if (allSelected) {
          delete next[id];
        } else {
          next[id] = true;
        }
      });
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedMobIds({});
  }, []);

  const toggleModelExpand = useCallback((baseName: string) => {
    setExpandedModels(prev => ({
      ...prev,
      [baseName]: prev[baseName] !== undefined ? !prev[baseName] : false
    }));
  }, []);
  
  // Feedback and Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Cloudinary configuration
  const [cloudName] = useState(() => (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME || localStorage.getItem('cloudinary_cloud_name') || '');
  const [uploadPreset] = useState(() => (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET || localStorage.getItem('cloudinary_upload_preset') || '');

  // PLANO B: Sincroniza o estado da tabela sempre que o catálogo de produtos (products) for atualizado
  // REGRA MANDATÓRIA: Produtos com classificação 001.001 NUNCA aparecem no catálogo do e-commerce
  useEffect(() => {
    if (products) {
      setMoblinkList(products
        .filter(dbProd => !isIgnoredClassification(dbProd))
        .map(dbProd => {
          const dbId = String(dbProd?.id || `PROD-${Math.random()}`);
        return {
          id: dbId,
          moblinkId: dbProd?.moblinkId,
          sku: dbProd?.sku || dbProd?.modelOrSku || dbId,
          nome: dbProd?.name || 'Produto sem nome',
          name: dbProd?.name || 'Produto sem nome',
          descricao: dbProd?.description || dbProd?.name || 'Sem descrição',
          compl_descr: (dbProd as any)?.compl_descr,
          preco_venda: typeof dbProd?.price === 'number' ? dbProd.price : 0,
          price: typeof dbProd?.price === 'number' ? dbProd.price : 0,
          preco_vista: (dbProd as any)?.preco_vista ?? (dbProd as any)?.precoVista,
          precoVista: (dbProd as any)?.precoVista,
          preco_promocao: (dbProd as any)?.preco_promocao,
          saldo_loja: typeof dbProd?.stock === 'number' ? Math.max(0, dbProd.stock) : 0,
          estoque: typeof dbProd?.stock === 'number' ? Math.max(0, dbProd.stock) : 0,
          classificacao: (dbProd as any)?.classificacao,
          id_grupo: (dbProd as any)?.id_grupo,
          id_subgrupo: (dbProd as any)?.id_subgrupo,
          cod_classificacao: (dbProd as any)?.cod_classificacao || (dbProd as any)?.codigo_classificacao,
          codigo_classificacao: (dbProd as any)?.codigo_classificacao || (dbProd as any)?.cod_classificacao,
          classificacao_erp: (dbProd as any)?.classificacao_erp,
          categoria: dbProd?.category || 'Geral',
          subcategoria: (dbProd as any)?.subcategory || dbProd?.nome_subgrupo,
          nome_grupo: (dbProd as any)?.nome_grupo || dbProd?.category || 'Geral',
          nome_subgrupo: dbProd?.nome_subgrupo || (dbProd as any)?.subcategory,
          category: dbProd?.category || 'Geral',
          tamanhos: Array.isArray(dbProd?.sizes) ? dbProd.sizes : [],
          foto_uri: extractBestRealPhoto(dbProd),
          modelCode: dbProd?.modelCode || dbProd?.referenceCode,
          referenceCode: dbProd?.referenceCode || dbProd?.modelCode,
          cor: (dbProd as any)?.cor || dbProd?.color,
          color: dbProd?.color || (dbProd as any)?.cor,
          marca: (dbProd as any)?.brand || (dbProd as any)?.marca,
          material: dbProd?.material,
          genero: (dbProd as any)?.gender || (dbProd as any)?.genero,
          barcode: dbProd?.barcode,
          newArrival: dbProd?.newArrival,
          isManual: !dbProd?.moblinkId && !dbId.startsWith('MOB-')
        };
      }));
    }
  }, [products]);

  // Migração suave e transparente: garante que qualquer produto existente com fotos receba managedPhotos: true no Firestore
  const hasAutoTaggedPhotosRef = useRef(false);
  useEffect(() => {
    if (hasAutoTaggedPhotosRef.current || !products || products.length === 0) return;
    hasAutoTaggedPhotosRef.current = true;

    const needsTagging = products.filter(p => hasProductValidPhoto(p) && p.managedPhotos !== true);
    if (needsTagging.length > 0) {
      console.log(`[MoblinkProductsManager] Blindando ${needsTagging.length} produtos existentes com managedPhotos: true no Firestore...`);
      needsTagging.forEach(p => {
        const targetId = String(p.id || p.moblinkId);
        if (targetId) {
          setDoc(doc(db, 'products', targetId), { managedPhotos: true }, { merge: true }).catch(() => {});
        }
      });
    }
  }, [products]);

  // Resetar página ao mudar filtros de busca/categoria/origem/modelo/viewMode/grade/classificação
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, subcategoryFilter, classificacaoGrupoFilter, classificacaoSubgrupoFilter, syncFilter, baseNameFilter, viewMode, hideOutOfStock, hideNoGrade, gradeFilter, sortBy]);

  // Sincronização manual por acionamento direto do botão [Atualizar Estoque ERP]
  const fetchMoblinkProducts = async () => {
    setIsLoading(true);
    setFetchError(null);
    setFeedback(null);
    setSyncProgress({ current: 0, total: 100, phase: 'Consultando produtos no ERP MobLink...' });
    
    try {
      // 0. Sincroniza e pré-carrega as categorias (grupos do ERP) sem abortar o fluxo principal caso falhe
      setSyncProgress({ current: 0, total: 100, phase: 'Sincronizando grupos e categorias (ERP)...' });
      try {
        await moblinkCategoriesService.syncCategoriesToFirestore();
      } catch (catErr) {
        console.warn('Pré-sincronização de categorias ignorada ou usando fallback local:', catErr);
      }

      // 1. Busca todos os produtos paginados do ERP Moblink (em paralelo de 5 em 5)
      const items = await getProdutosMoblink((current, total, phase) => {
        setSyncProgress({ current, total, phase });
      });

      if (Array.isArray(items) && items.length > 0) {
        setMoblinkList(items);

        // 2. Filtra produtos com alterações reais comparando com o cache/Firestore (Delta Check)
        setSyncProgress({ current: 0, total: items.length, phase: 'Analisando alterações nos produtos...' });
        
        const changedItems = items.filter(item => {
          const mobId = String(item.id || item.moblinkId || '');
          if (!mobId) return false;
          const estoque = extractSaldoLojaMoblink(item);
          // Produtos com 0 ou menos de saldo não são gravados no Firebase
          if (estoque <= 0) return false;
          const existingDb = getExistingDbProduct(mobId);
          return hasProductChanged(existingDb, item);
        });

        const totalToSync = changedItems.length;
        let successCount = 0;

        if (totalToSync > 0) {
          // 3. Salva no Firestore em blocos/lotes de 15 em paralelo (amigável com plano gratuito)
          const chunkSize = 15;
          for (let i = 0; i < totalToSync; i += chunkSize) {
            const chunk = changedItems.slice(i, i + chunkSize);
            setSyncProgress({
              current: i,
              total: totalToSync,
              phase: `Gravando alterações no Firestore (${i}/${totalToSync})...`
            });

            await Promise.all(chunk.map(async (item) => {
              const mobId = String(item.id || item.moblinkId || '');
              const existingDb = getExistingDbProduct(mobId);
              
              const precoTabela = extractPrecoTabelaMoblink(item);
              const precoVista = extractPrecoVistaMoblink(item);
              const estoqueAtual = extractSaldoLojaMoblink(item);
              const itemHasGrade = hasProductValidGrade(item);
              const itemHasPhoto = hasProductValidPhoto(item) || hasProductValidPhoto(existingDb);

              const updatedProductPayload: any = {
                id: mobId,
                moblinkId: mobId,
                name: item.nome || item.name || item.descricao,
                descricao: item.descricao || item.nome,
                description: existingDb?.description || item.compl_descr || item.descricao || '',
                price: precoTabela,
                preco_venda: precoTabela,
                precoVista: precoVista,
                preco_vista: precoVista,
                preco_promocao: item.preco_promocao,
                classificacao: item.classificacao,
                category: (item.categoria && item.categoria !== 'Geral') ? item.categoria : (existingDb?.category || item.categoria || item.category || 'Geral'),
                subcategory: item.subcategoria || existingDb?.subcategory || '',
                nome_grupo: item.nome_grupo || existingDb?.nome_grupo || '',
                nome_subgrupo: item.nome_subgrupo || existingDb?.nome_subgrupo || '',
                foto_uri: item.foto_uri,
                images: (existingDb?.images && existingDb.images.length > 0) ? existingDb.images : (item.foto_uri ? [item.foto_uri] : []),
                sizes: existingDb?.sizes || (Array.isArray(item.tamanhos) ? item.tamanhos : []),
                crediarioProprio: true,
                hasGrade: itemHasGrade,
                visible: (estoqueAtual > 0 && itemHasPhoto) ? (existingDb?.visible ?? true) : false,
                stockControl: true,
                stock: estoqueAtual,
                saldo_loja: estoqueAtual,
                stockBySize: existingDb?.stockBySize || existingDb?.sizeStockMap,
                sizeStockMap: existingDb?.sizeStockMap || existingDb?.stockBySize,
                lastMoblinkSync: new Date().toISOString(),
                moblinkSyncStatus: 'synced',
                modelCode: existingDb?.modelCode || existingDb?.referenceCode,
                referenceCode: existingDb?.referenceCode || existingDb?.modelCode,
                color: existingDb?.color || item.cor || undefined,
                cor: existingDb?.cor || item.cor || undefined,
              };

              try {
                if (estoqueAtual > 0 && hasProductChanged(existingDb, updatedProductPayload)) {
                  const sanitizedPayload = sanitizeProductForFirestore(updatedProductPayload);
                  await setDoc(doc(db, 'products', mobId), sanitizedPayload, { merge: true });
                }
                
                if (existingDb) {
                  await updateProduct(mobId, updatedProductPayload);
                } else if (estoqueAtual > 0) {
                  await addProduct(updatedProductPayload);
                }
              } catch (writeErr) {
                console.warn(`[MoblinkProductsManager] Aviso ao salvar no Firestore (mantido local): ${mobId}`, writeErr);
                if (existingDb) {
                  try { await updateProduct(mobId, updatedProductPayload); } catch {}
                }
              }
              successCount++;
            }));
          }
        }

        // 4. Salva a lista inteira no cache local de 30min
        saveMoblinkCache(items);
        updateLastSyncTimestamp();

        setFeedback({
          success: true,
          message: totalToSync > 0
            ? `⚡ Sincronização concluída! ${successCount} produto(s) atualizado(s) de ${items.length} verificados.`
            : `⚡ Sincronização concluída! Todos os ${items.length} produtos já estão atualizados.`
        });
      }
    } catch (err: any) {
      console.warn('Fallback local para produtos do Moblink:', err);
      setFetchError(err.message || 'Erro ao comunicar com a API do MobLink ERP');
      setFeedback({
        success: false,
        message: `Falha ao consultar MobLink ERP: ${err.message || 'Servidor temporariamente indisponível'}`
      });
    } finally {
      setSyncProgress(null);
      setIsLoading(false);
    }
  };

  /**
   * REGRA EXPLICITA SOLICITADA PELO USUÁRIO:
   * Pega todos os IDs dos produtos com saldo de estoque positivo (> 0),
   * verifica se existe grade (localmente ou via API de grades do Moblink ERP /produtos/{id}/grades).
   * 
   * - Caso TENHA grade: atribui tag "Grade Ativa" e ativa visible = true (Visível nas vitrines da loja virtual).
   * - Caso NÃO TENHA grade: atribui tag "Sem Grade (Indisponível p/ Venda)" e desmarca/desativa visible = false (Oculto das vitrines da loja virtual).
   */
  const handleAuditAndApplyGradesToStockProducts = async () => {
    setIsLoading(true);
    setFetchError(null);
    setSyncProgress({ current: 0, total: 100, phase: 'Iniciando auditoria de grades para produtos com estoque positivo...' });

    try {
      // 1. Seleciona todos os produtos com saldo de estoque positivo (> 0)
      const stockItems = (combinedCatalog || []).filter(item => {
        const mobId = String(item.id || item.moblinkId || '');
        const existingDb = dbProductsMap.get(mobId);
        const estoque = existingDb?.stock ?? extractSaldoLojaMoblink(item);
        return estoque > 0;
      });

      const totalToAudit = stockItems.length;
      if (totalToAudit === 0) {
        setSyncProgress(null);
        setIsLoading(false);
        alert('Nenhum produto com saldo em estoque positivo (> 0) foi encontrado.');
        return;
      }

      let withGradeCount = 0;
      let noGradeCount = 0;

      // 2. Processa os produtos em lotes de 10
      const chunkSize = 10;
      for (let i = 0; i < totalToAudit; i += chunkSize) {
        const chunk = stockItems.slice(i, i + chunkSize);
        setSyncProgress({
          current: i,
          total: totalToAudit,
          phase: `Auditando e aplicando visibilidade no Firestore (${i}/${totalToAudit})...`
        });

        await Promise.all(chunk.map(async (item) => {
          const mobId = String(item.id || item.moblinkId || '');
          const existingDb = dbProductsMap.get(mobId);
          const estoqueAtual = existingDb?.stock ?? extractSaldoLojaMoblink(item);

          // Verifica se possui grade válida no objeto local
          let hasGrade = hasProductValidGrade(item);

          // Se a verificação rápida local for falsa, realiza chamada remota de confirmação na API de grades
          if (!hasGrade && mobId) {
            try {
              const gradeResult = await getProdutoGradesFromApi(mobId);
              if (gradeResult && (gradeResult.hasGrade || (Array.isArray(gradeResult.tamanhos) && gradeResult.tamanhos.length > 0) || (Array.isArray(gradeResult.variacoes) && gradeResult.variacoes.length > 0))) {
                hasGrade = true;
                if (Array.isArray(gradeResult.tamanhos) && gradeResult.tamanhos.length > 0) {
                  item.tamanhos = gradeResult.tamanhos;
                }
              }
            } catch {
              // Mantém resultado local
            }
          }

          // APLICAÇÃO DA REGRA DE VISIBILIDADE POR FOTOS & CLASSIFICAÇÃO:
          // Se estoque > 0, TEM FOTO REAL e CLASSIFICAÇÃO DEFINIDA => visible = true
          // Caso contrário => visible = false (Desmarcado/Oculto nas vitrines da loja virtual)
          const catInfoSync = extractClassificacaoCategoria(existingDb || item);
          const isUnclassifiedSync = catInfoSync.category === 'Sem Classificação Definida' || !catInfoSync.isDefined;
          const itemHasPhoto = hasProductValidPhoto(item) || (existingDb ? hasProductValidPhoto(existingDb) : false);
          const isVisibleInStore = !isUnclassifiedSync && estoqueAtual > 0 && itemHasPhoto;

          if (isVisibleInStore) {
            withGradeCount++;
          } else {
            noGradeCount++;
          }

          const precoTabela = extractPrecoTabelaMoblink(item) || existingDb?.price || 0;
          const precoVista = extractPrecoVistaMoblink(item) || existingDb?.precoVista || precoTabela;

          const updatedPayload: any = {
            id: mobId,
            moblinkId: mobId,
            name: item.nome || item.name || item.descricao,
            descricao: item.descricao || item.nome,
            description: existingDb?.description || item.compl_descr || item.descricao || '',
            price: precoTabela,
            preco_venda: precoTabela,
            precoVista: precoVista,
            preco_vista: precoVista,
            category: (item.categoria && item.categoria !== 'Geral') ? normalizeCategoryName(item.categoria) : (existingDb?.category && existingDb.category !== 'Geral' ? existingDb.category : extractClassificacaoCategoria(item).category || 'Calçados'),
            subcategory: item.subcategoria || existingDb?.subcategory || '',
            foto_uri: item.foto_uri || existingDb?.foto_uri,
            images: (existingDb?.images && existingDb.images.length > 0) ? existingDb.images : (item.foto_uri ? [item.foto_uri] : []),
            sizes: item.tamanhos || existingDb?.sizes || [],
            hasGrade: hasGrade,
            visible: isVisibleInStore,
            stockControl: true,
            stock: estoqueAtual,
            saldo_loja: estoqueAtual,
            lastMoblinkSync: new Date().toISOString(),
            moblinkSyncStatus: 'synced',
          };

          try {
            const sanitizedPayload = sanitizeProductForFirestore(updatedPayload);
            await setDoc(doc(db, 'products', mobId), sanitizedPayload, { merge: true });
            if (existingDb) {
              await updateProduct(mobId, updatedPayload);
            }
          } catch (writeErr) {
            console.warn(`[MoblinkProductsManager] Aviso ao salvar auditoria de visibilidade no Firestore: ${mobId}`, writeErr);
          }
        }));
      }

      setFeedback({
        success: true,
        message: `⚡ Auditoria Concluída com Sucesso! ${withGradeCount} produtos com foto real e estoque positivo ativos e visíveis na vitrine virtual, e ${noGradeCount} produtos sem foto (ocultos da vitrine).`
      });
    } catch (err: any) {
      console.error('Erro na auditoria de grades:', err);
      setFetchError(err.message || 'Falha ao auditar grades do estoque');
    } finally {
      setSyncProgress(null);
      setIsLoading(false);
    }
  };

  // Indexador em tempo constante O(1) para produtos do Firestore
  const dbProductsMap = useMemo(() => {
    const map = new Map<string, Product>();
    (products || []).forEach(p => {
      if (!p) return;
      if (p.id) {
        const cleanId = String(p.id).trim();
        map.set(cleanId, p);
        map.set(cleanId.toLowerCase(), p);
      }
      if (p.moblinkId) {
        const cleanMob = String(p.moblinkId).trim();
        map.set(cleanMob, p);
        map.set(cleanMob.toLowerCase(), p);
      }
    });
    return map;
  }, [products]);

  // Check if a Moblink product is already in our database
  const getExistingDbProduct = useCallback((moblinkId: string): Product | undefined => {
    if (!moblinkId) return undefined;
    const clean = String(moblinkId).trim();
    return dbProductsMap.get(clean) || dbProductsMap.get(clean.toLowerCase());
  }, [dbProductsMap]);

  // Toggle product visibility directly from the table list
  const handleToggleVisibility = useCallback(async (mobId: string, currentVisibleState: boolean) => {
    const cleanId = String(mobId).trim();
    const existingDb = getExistingDbProduct(cleanId);
    const targetItem = moblinkList.find(p => String(p.id || p.moblinkId || 'MOB-000').trim() === cleanId);
    const catInfo = extractClassificacaoCategoria(existingDb || targetItem);
    const isUnclassified = catInfo.category === 'Sem Classificação Definida' || !catInfo.isDefined;

    if (isUnclassified && !currentVisibleState) {
      alert('Atenção: Este produto possui "Sem Classificação Definida" no ERP. Produtos sem classificação válida não podem ser publicados no site. Atualize a classificação no ERP ou no cadastro.');
      return;
    }

    const nextVisible = isUnclassified ? false : !currentVisibleState;

    try {
      if (existingDb) {
        await updateProduct(cleanId, { ...existingDb, visible: nextVisible });
      } else if (targetItem) {
        const sanitized = sanitizeProductForFirestore({ ...targetItem, visible: nextVisible } as any);
        await updateProduct(cleanId, sanitized as Product);
      }
    } catch (err) {
      console.error('Erro ao alternar visibilidade do produto:', err);
    }
  }, [getExistingDbProduct, moblinkList, updateProduct]);

  // Open Full Edit Modal for a product
  const handleOpenEnrichmentForm = async (item: MoblinkRawProduct) => {
    if (!item) return;
    const mobId = String(item.id || item.moblinkId || 'MOB-000').trim();
    const existing = getExistingDbProduct(mobId);

    setSelectedProduct(item);
    setFeedback(null);
    setIsLoadingProductGrade(true);

    // Consulta de confirmação 100% em tempo real direto da API do MobLink ERP
    let liveErpItem: MoblinkRawProduct | null = null;
    let liveGradeRes: ProdutoGradesResult | null = null;

    try {
      const [freshErp, gradeRes] = await Promise.all([
        getSingleProdutoMoblinkFromApi(mobId),
        getProdutoGradesFromApi(mobId).catch(() => null),
      ]);

      if (freshErp) {
        liveErpItem = freshErp;
        const merged = mergeErpSyncWithExistingDbProduct(existing || item, freshErp) as Product;
        setSelectedProduct(merged as any);

        // Apenas realiza escrita no Firestore se o estoque ou preço REALMENTE sofreu alteração no ERP
        if (hasProductChanged(existing, freshErp)) {
          const sanitized = sanitizeProductForFirestore(merged);
          setDoc(doc(db, 'products', mobId), sanitized, { merge: true }).catch(() => {});
        }
      }

      if (gradeRes) {
        liveGradeRes = gradeRes;
        setSelectedProductGrade(gradeRes);
      }
    } catch (err) {
      console.warn('[MoblinkProductsManager] Consulta em tempo real MobLink:', err);
    } finally {
      setIsLoadingProductGrade(false);
    }

    const currentItem = liveErpItem || item;

    // Initialize Edit Form Input States com valores em tempo real do ERP
    const initialName = existing?.name || currentItem.nome || currentItem.name || currentItem.descricao || '';
    const initialSku = existing?.sku || currentItem.sku || currentItem.codigo || mobId;
    const initialModelCode = existing?.modelCode || existing?.referenceCode || (existing as any)?.referencia || currentItem.modelCode || currentItem.referenceCode || currentItem.referencia || '';
    
    // Preço e Estoque em Tempo Real consultados no MobLink ERP
    const liveStockVal = liveErpItem ? extractSaldoLojaMoblink(liveErpItem) : (existing?.stock ?? extractSaldoLojaMoblink(currentItem));
    const livePriceVal = liveErpItem ? extractPrecoTabelaMoblink(liveErpItem) : (existing?.price ?? extractPrecoTabelaMoblink(currentItem));

    const initialPrice = livePriceVal > 0 ? livePriceVal : (currentItem.preco_venda ?? currentItem.price ?? 0);
    const initialOrigPrice = existing?.originalPrice ?? currentItem.precoOriginal ?? '';
    const initialStock = liveStockVal;

    const initialCategory = (existing?.category && existing.category !== 'Geral') 
      ? existing.category 
      : (currentItem.categoria && currentItem.categoria !== 'Geral' 
        ? normalizeCategoryName(currentItem.categoria) 
        : extractClassificacaoCategoria(currentItem).category || 'Calçados');
    
    const itemHasPhoto = hasProductValidPhoto(currentItem) || hasProductValidPhoto(existing) || Boolean(existing?.imageUrl) || Boolean(currentItem.foto_uri) || (Array.isArray(existing?.images) && existing.images.length > 0);
    const modalCatInfo = extractClassificacaoCategoria(existing || currentItem);
    const isModalUnclassified = modalCatInfo.category === 'Sem Classificação Definida' || !modalCatInfo.isDefined;
    const initialVisible = isModalUnclassified
      ? false
      : (existing && typeof existing.visible === 'boolean')
        ? existing.visible
        : (initialStock > 0 && itemHasPhoto);
    
    const initialSizes = liveGradeRes && liveGradeRes.tamanhos && liveGradeRes.tamanhos.length > 0
      ? liveGradeRes.tamanhos.join(', ')
      : (existing?.sizes && Array.isArray(existing.sizes) && existing.sizes.length > 0
        ? existing.sizes.join(', ')
        : (Array.isArray(currentItem.tamanhos) ? currentItem.tamanhos.join(', ') : '37, 38, 39, 40, 41, 42, 43'));

    const rawVariant = extractBaseNameAndVariant(currentItem.nome || currentItem.name || currentItem.descricao || '').variant;
    const initialColor = existing?.color || existing?.cor || currentItem.cor || currentItem.color || (rawVariant !== 'Padrão' ? rawVariant : 'Preto');

    // Inicialização da Grade de Estoque por Tamanho
    const initialStockMap: Record<string, number> = existing?.stockBySize || existing?.sizeStockMap || {};
    const parsedSizeArray = initialSizes.split(',').map(s => s.trim()).filter(Boolean);
    const finalStockMap: Record<string, number> = { ...initialStockMap };
    
    if (Object.keys(finalStockMap).length === 0 && parsedSizeArray.length > 0) {
      const avgPerSize = Math.floor(initialStock / parsedSizeArray.length);
      let remainder = initialStock % parsedSizeArray.length;
      parsedSizeArray.forEach(sz => {
        finalStockMap[sz] = avgPerSize + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder--;
      });
    }

    const initialNewArrival = Boolean(existing?.newArrival || (currentItem as any)?.newArrival || false);
    const initialBrand = existing?.brand || (existing as any)?.marca || (currentItem as any)?.brand || (currentItem as any)?.marca || resolveProductBrand(currentItem) || '';
    const initialGender = existing?.gender || (existing as any)?.genero || (currentItem as any)?.gender || (currentItem as any)?.genero || resolveProductGender(currentItem) || '';

    setEditName(initialName);
    setEditBrand(initialBrand);
    setEditGender(initialGender);
    setEditSku(initialSku);
    setEditModelCode(initialModelCode);
    setEditPrice(initialPrice);
    setEditOriginalPrice(initialOrigPrice || '');
    setEditStock(initialStock);
    setEditCategory(initialCategory);
    setEditVisible(initialVisible);
    setEditNewArrival(initialNewArrival);
    setEditSizes(initialSizes);
    setEditColor(initialColor);
    setEditStockBySize(finalStockMap);
    const initialColorMap = existing?.colorImageMap || (item as any)?.colorImageMap || {};
    const initialColorImages: Record<string, string[]> = { ...(existing?.colorImages || (item as any)?.colorImages || {}) };
    Object.entries(initialColorMap).forEach(([color, url]) => {
      const urlStr = String(url || '');
      if (urlStr) {
        if (!initialColorImages[color]) {
          initialColorImages[color] = [urlStr];
        } else if (!initialColorImages[color].includes(urlStr)) {
          initialColorImages[color].push(urlStr);
        }
      }
    });
    setEditColorImageMap(initialColorMap as Record<string, string>);
    setEditColorImages(initialColorImages);

    // Coleta TODAS as URLs válidas salvas no documento do Firebase (images[], foto_uri ou imageUrl)
    const existingDbImages: string[] = [];
    if (existing) {
      if (Array.isArray(existing.images)) {
        existing.images.forEach(img => {
          if (img && typeof img === 'string' && img.trim() && !isPlaceholderUrl(img)) {
            const cleanUrl = img.trim();
            if (!existingDbImages.includes(cleanUrl)) existingDbImages.push(cleanUrl);
          }
        });
      }
      if (existing.foto_uri && typeof existing.foto_uri === 'string' && existing.foto_uri.trim() && !isPlaceholderUrl(existing.foto_uri)) {
        const cleanUrl = existing.foto_uri.trim();
        if (!existingDbImages.includes(cleanUrl)) existingDbImages.push(cleanUrl);
      }
      if (existing.imageUrl && typeof existing.imageUrl === 'string' && existing.imageUrl.trim() && !isPlaceholderUrl(existing.imageUrl)) {
        const cleanUrl = existing.imageUrl.trim();
        if (!existingDbImages.includes(cleanUrl)) existingDbImages.push(cleanUrl);
      }
      if (existing.colorImages && typeof existing.colorImages === 'object') {
        Object.values(existing.colorImages).forEach(urls => {
          if (Array.isArray(urls)) {
            urls.forEach(u => {
              if (u && typeof u === 'string' && u.trim() && !isPlaceholderUrl(u)) {
                const cleanUrl = u.trim();
                if (!existingDbImages.includes(cleanUrl)) existingDbImages.push(cleanUrl);
              }
            });
          }
        });
      }
      if (existing.colorImageMap && typeof existing.colorImageMap === 'object') {
        Object.values(existing.colorImageMap).forEach(u => {
          if (u && typeof u === 'string' && u.trim() && !isPlaceholderUrl(u)) {
            const cleanUrl = String(u).trim();
            if (!existingDbImages.includes(cleanUrl)) existingDbImages.push(cleanUrl);
          }
        });
      }
    }

    // Se o produto não possui preferência de visibilidade salva no Firestore, ativa por padrão caso tenha foto e estoque
    if (!existing || typeof existing.visible !== 'boolean') {
      const hasAnyRealPhoto = itemHasPhoto || existingDbImages.length > 0;
      if (hasAnyRealPhoto && initialStock > 0 && !isModalUnclassified) {
        setEditVisible(true);
      }
    }

    if (existingDbImages.length > 0) {
      setImages(existingDbImages);
      setRichDescription(existing?.description || item.compl_descr || item.descricaoMoblink || item.descricao || '');
    } else {
      // REGRA ABSOLUTA: Produtos sem foto no Firebase Firestore possuem array de fotos VAZIO []
      setImages([]);
      const complDescr = item.compl_descr || item.descr_compl || item.descricao_completa;
      const baseDescr = initialName || `Produto ${mobId}`;
      setRichDescription(
        existing?.description ||
        (complDescr 
          ? `<p><strong>${baseDescr}</strong></p>\n<p>${complDescr}</p>`
          : item.descricaoMoblink || item.descricao || 
          `<h3>${baseDescr}</h3>\n<p>Produto importado do sistema MobLink ERP. Feito com materiais nobres e acabamento impecável.</p>\n<ul>\n  <li>Garantia de Qualidade Evidência</li>\n  <li>Acabamento em Couro Premium</li>\n</ul>`)
      );
    }
  };

  const handleCloseEnrichmentForm = () => {
    setSelectedProduct(null);
    setImages([]);
    setRichDescription('');
    setNewImageUrl('');
    setEditName('');
    setEditBrand('');
    setEditGender('');
    setEditSku('');
    setEditModelCode('');
    setEditPrice('');
    setEditOriginalPrice('');
    setEditStock('');
    setEditCategory('');
    setEditVisible(true);
    setEditSizes('');
    setEditColor('');
    setEditStockBySize({});
    setShowWebSearchModal(false);
    setShowAiDescriptionModal(false);
    setFeedback(null);
  };

  const [isSingleRefreshing, setIsSingleRefreshing] = useState(false);

  // Re-sincronizar um único produto diretamente da API do ERP
  const handleRefreshSingleProduct = async () => {
    if (!selectedProduct) return;
    const targetId = String(selectedProduct.id || selectedProduct.moblinkId);
    setIsSingleRefreshing(true);
    try {
      // 1. Busca dados atualizados do produto no ERP
      const updated = await getSingleProdutoMoblinkFromApi(targetId);
      if (updated) {
        const existing = getExistingDbProduct(targetId) || selectedProduct;
        const merged = mergeErpSyncWithExistingDbProduct(existing, updated) as Product;
        const sanitized = sanitizeProductForFirestore(merged);

        setSelectedProduct(merged);

        // Atualiza a lista local no estado reativamente para atualizar a listagem e o modal imediatamente
        setMoblinkList(prev => prev.map(item => {
          const itemMobId = String(item.id || item.moblinkId || '');
          if (itemMobId === targetId) {
            return { ...item, ...merged };
          }
          return item;
        }));

        updateProduct(String(sanitized.id), sanitized as Product);

        // 2. Recarrega as informações de grade em tempo real
        const updatedGrades = await getProdutoGradesFromApi(targetId);
        setSelectedProductGrade(updatedGrades);

        // 3. Atualiza os campos do formulário de edição mantendo os dados protegidos do lojista
        setEditName(merged.name);
        if (merged.description) setRichDescription(merged.description);
        if (merged.images && merged.images.length > 0) setImages(merged.images);
        if (merged.colorImageMap) setEditColorImageMap(merged.colorImageMap);
        setEditPrice(merged.price);
        setEditCategory(merged.category);

        // 4. Salva a atualização no Firestore
        await setDoc(doc(db, 'products', String(sanitized.id)), sanitized, { merge: true });

        setFeedback({
          success: true,
          message: `Produto ID ${targetId} ("${updated.nome || updated.name}") re-sincronizado com sucesso a partir do MobLink ERP!`,
        });
      } else {
        setFeedback({
          success: false,
          message: `Não foi possível consultar atualizações para o produto ID ${targetId} no ERP.`,
        });
      }
    } catch (err: any) {
      setFeedback({
        success: false,
        message: `Erro ao atualizar produto ID ${targetId}: ${err.message || 'Falha de comunicação'}`,
      });
    } finally {
      setIsSingleRefreshing(false);
    }
  };

  // Alteração de Estoque por Tamanho Individual com Limite Máximo do Estoque Atual
  const handleSizeStockChange = (size: string, qty: number) => {
    const requestedQty = Math.max(0, isNaN(qty) ? 0 : qty);
    const maxStockLimit = Number(editStock) || 0;

    const activeSizes = editSizes.split(',').map(s => s.trim()).filter(Boolean);

    // Calcular a soma das outras numerações ativas (exceto a numeração atual sendo editada)
    const otherSizesSum = activeSizes
      .filter(s => s !== size)
      .reduce((acc, s) => acc + (Number(editStockBySize[s]) || 0), 0);

    const maxAllowedForThisSize = Math.max(0, maxStockLimit - otherSizesSum);

    let finalQty = requestedQty;
    if (requestedQty > maxAllowedForThisSize) {
      finalQty = maxAllowedForThisSize;
      setFeedback({
        success: false,
        message: `⚠️ A soma das numerações não pode ultrapassar o Estoque Atual de ${maxStockLimit} unidades!`
      });
    } else {
      setFeedback(null);
    }

    const updatedMap = {
      ...editStockBySize,
      [size]: finalQty
    };

    setEditStockBySize(updatedMap);
  };

  // Atualizar Grade de Tamanhos e Zerar a Soma de Pontuações Removidas ou Apagadas
  const handleEditSizesChange = (newSizesStr: string) => {
    setEditSizes(newSizesStr);
    const activeSizes = newSizesStr.split(',').map(s => s.trim()).filter(Boolean);

    setEditStockBySize(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(sz => {
        if (!activeSizes.includes(sz)) {
          updated[sz] = 0; // Zerado o valor da soma para pontuações apagadas
        }
      });
      return updated;
    });
  };

  // Persiste a lista de fotos no Firebase Firestore instantaneamente ao carregar/adicionar
  // e remove automaticamente qualquer foto modelo padrão (Unsplash / Placeholder)
  const syncImageUpdateToFirestore = async (rawImagesList: string[]) => {
    if (!selectedProduct) return rawImagesList;

    // Separa fotos reais de fotos modelos genéricas
    const realPhotos = rawImagesList.filter(img => img && !isPlaceholderUrl(img));
    
    // Se o usuário/ERP tiver fotos reais, exclui a foto padrão Unsplash
    const finalImagesList = realPhotos.length > 0 ? realPhotos : rawImagesList;

    setImages(finalImagesList);

    const targetId = String(selectedProduct.id || selectedProduct.moblinkId);
    const updatedProd: Partial<Product> = {
      images: finalImagesList,
      managedPhotos: finalImagesList.length > 0,
      imageUrl: finalImagesList[0] || '',
      foto_uri: finalImagesList[0] || '',
      visible: editVisible,
      updatedAt: new Date().toISOString(),
    };

    // 1. Atualiza no contexto da aplicação
    updateProduct(targetId, updatedProd);

    // 2. Se adicionou foto válida, limpa o status de foto quebrada imediatamente
    if (finalImagesList.length > 0) {
      clearBrokenPhoto(targetId);
      const cleanId = targetId.replace(/^MOB-/i, '');
      clearBrokenPhoto(cleanId);
      clearBrokenPhoto(`MOB-${cleanId}`);
      setBrokenPhotoMap(prev => {
        const copy = { ...prev };
        delete copy[targetId];
        delete copy[cleanId];
        delete copy[`MOB-${cleanId}`];
        return copy;
      });
    }

    // 3. Salva no Firestore instantaneamente no momento em que a foto é carregada/adicionada
    try {
      const docRef = doc(db, 'products', targetId);
      await setDoc(docRef, updatedProd, { merge: true });
      console.log(`[MoblinkProductsManager] Foto salva no Firebase Firestore instantaneamente para produto ${targetId}:`, finalImagesList);
    } catch (err: any) {
      console.warn(`[MoblinkProductsManager] Falha ao gravar foto no Firestore:`, err);
    }

    return finalImagesList;
  };

  // Add Image URL manualmente (salva no Firestore imediatamente, preserva fotos anteriores e links externos)
  const handleAddImageUrl = async () => {
    const url = newImageUrl.trim();
    if (!url) return;
    if (images.includes(url)) {
      setFeedback({ success: false, message: 'Esta imagem já foi adicionada.' });
      return;
    }

    // Preserva todas as fotos existentes e adiciona a nova URL de link externo
    const nextList = preserveExistingImages(images, [url]);
    setNewImageUrl('');
    await syncImageUpdateToFirestore(nextList);

    setFeedback({ success: true, message: 'Foto por link salva e vinculada com sucesso!' });
    setTimeout(() => setFeedback(null), 3000);
  };

  // Remove Image (exclui no estado, salva no Firestore, desvincula de cores e remove do Supabase Storage com thumbnail)
  const handleRemoveImage = async (index: number) => {
    const targetUrl = images[index];
    const nextList = images.filter((_, i) => i !== index);
    
    // 1. Desvincula imediatamente a foto deletada de qualquer variação de cor
    if (targetUrl) {
      setEditColorImages(prev => {
        const copy: Record<string, string[]> = {};
        let changed = false;
        Object.entries(prev).forEach(([cKey, list]) => {
          if (Array.isArray(list) && list.includes(targetUrl)) {
            copy[cKey] = list.filter(u => u !== targetUrl);
            changed = true;
          } else {
            copy[cKey] = list;
          }
        });
        return changed ? copy : prev;
      });

      setEditColorImageMap(prev => {
        const copy = { ...prev };
        let changed = false;
        Object.keys(copy).forEach(cKey => {
          if (copy[cKey] === targetUrl) {
            delete copy[cKey];
            changed = true;
          }
        });
        return changed ? copy : prev;
      });
    }

    // 2. Atualiza no Firestore e no estado local imediatamente
    await syncImageUpdateToFirestore(nextList);

    setFeedback({ success: true, message: 'Foto removida com sucesso!' });
    setTimeout(() => setFeedback(null), 3000);

    // 3. Exclui do Supabase Storage (foto principal + miniatura de 150px)
    if (targetUrl) {
      deleteImageFromSupabase(targetUrl).catch(err => {
        console.warn('Falha ao remover arquivo do Supabase Storage:', err);
      });
    }
  };

  // Set image as main cover (salva no Firestore imediatamente)
  const handleSetMainImage = async (index: number) => {
    if (index === 0) return;
    const copy = [...images];
    const selected = copy.splice(index, 1)[0];
    const nextList = [selected, ...copy];
    await syncImageUpdateToFirestore(nextList);
  };

  // File Upload (Converte para WebP 80% + Thumbnail 150px -> Upload Supabase -> Salva Firebase preservando fotos e links)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Validação de tamanho (máximo 5MB) e formato
    const val = validateImageFile(file);
    if (!val.valid) {
      setFeedback({ success: false, message: val.error || 'Arquivo inválido.' });
      if (e.target) e.target.value = '';
      return;
    }

    setIsUploading(true);
    setFeedback({ success: true, message: 'Otimizando imagem para formato WebP e gerando miniaturas...' });

    const prodId = String(selectedProduct?.id || selectedProduct?.moblinkId || 'novo');

    try {
      // Converte para WebP com qualidade 80% e gera miniatura 150px
      const result = await uploadOptimizedProductPhoto(file, prodId);

      // Preserva rigorosamente todas as fotos já existentes no banco e adiciona a nova foto WebP
      const nextList = preserveExistingImages(images, [result.publicUrl]);
      await syncImageUpdateToFirestore(nextList);

      const statsMsg = result.stats
        ? ` (${(result.stats.optimizedSize / 1024).toFixed(0)}KB, -${result.stats.compressionRatio}%)`
        : '';

      setFeedback({ 
        success: true, 
        message: `Foto convertida para WebP${statsMsg} e salva no Supabase Storage com sucesso!` 
      });
    } catch (err: any) {
      console.warn("Upload otimizado falhou (tentando fallback local):", err);
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (typeof reader.result === 'string') {
          const nextList = preserveExistingImages(images, [reader.result as string]);
          await syncImageUpdateToFirestore(nextList);
          setFeedback({ 
            success: false, 
            message: `Atenção: ${err.message || 'Erro no Supabase'}. A foto foi preservada no Firebase.` 
          });
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  // Pre-built Rich Description Templates
  const handleInsertTemplate = (templateType: 'couro' | 'medidas' | 'cuidados') => {
    if (templateType === 'couro') {
      setRichDescription(prev => prev + `\n\n<h4>✨ Especificações de Couro &amp; Conforto</h4>\n<ul>\n  <li><strong>Material do Cabedal:</strong> 100% Couro Vacum Legítimo selecionado.</li>\n  <li><strong>Forro Interno:</strong> Couro de pelica macia com alta absorção de umidade.</li>\n  <li><strong>Palmilha:</strong> Gel Anatômico anti-impacto revestido de couro.</li>\n  <li><strong>Solado:</strong> Borracha antiderrapante ou Couro Laqueado Nobre.</li>\n</ul>`);
    } else if (templateType === 'medidas') {
      setRichDescription(prev => prev + `\n\n<h4>📏 Guia de Tamanhos (Comprimento do Pé)</h4>\n<ul>\n  <li>Nº 38 - 25,5 cm</li>\n  <li>Nº 39 - 26,2 cm</li>\n  <li>Nº 40 - 27,0 cm</li>\n  <li>Nº 41 - 27,7 cm</li>\n  <li>Nº 42 - 28,4 cm</li>\n  <li>Nº 43 - 29,1 cm</li>\n</ul>`);
    } else if (templateType === 'cuidados') {
      setRichDescription(prev => prev + `\n\n<h4>🛡️ Dicas de Conservação e Cuidados</h4>\n<p>Limpe utilizando pano levemente umedecido em água. Deixe secar sempre à sombra e aplique creme hidratante neutro para calçados de couro a cada 30 dias.</p>`);
    }
  };

  // Save full product details (name, images, rich description & visibility)
  const handleSaveProductEnrichment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const mobId = String(selectedProduct.id || selectedProduct.moblinkId || 'MOB-000');
    const productName = editName.trim() || selectedProduct.nome || selectedProduct.name || `Produto ${mobId}`;
    const productSku = selectedProduct.sku || (selectedProduct as any).codigo || mobId;
    const productPrice = extractPrecoTabelaMoblink(selectedProduct);
    const productVista = extractPrecoVistaMoblink(selectedProduct);
    const productCartao = extractPrecoCartaoMoblink(selectedProduct);
    const productStock = extractSaldoLojaMoblink(selectedProduct);
    const categoryName = normalizeCategoryName(selectedProduct.nome_grupo || selectedProduct.categoria || selectedProduct.category || 'Geral');

    // As fotos ativas gerenciadas no formulário (images) são a lista canônica atualizada (respeitando exclusões do usuário)
    const finalImages = images.filter(img => img && typeof img === 'string' && img.trim() !== '' && !isPlaceholderUrl(img));

    // Garante que qualquer foto anexada a uma cor também seja incluída em finalImages
    Object.values(editColorImages).forEach(urls => {
      if (Array.isArray(urls)) {
        urls.forEach(u => {
          if (u && typeof u === 'string' && u.trim() && !isPlaceholderUrl(u)) {
            const cleanUrl = u.trim();
            if (!finalImages.includes(cleanUrl)) finalImages.push(cleanUrl);
          }
        });
      }
    });

    Object.values(editColorImageMap).forEach(u => {
      if (u && typeof u === 'string' && u.trim() && !isPlaceholderUrl(u)) {
        const cleanUrl = String(u).trim();
        if (!finalImages.includes(cleanUrl)) finalImages.push(cleanUrl);
      }
    });

    const refCode = selectedProduct.referencia || selectedProduct.referenceCode || selectedProduct.modelCode || undefined;
    const activeSizes = selectedProductGrade?.tamanhos || (selectedProduct.tamanhos as any) || [];

    // Constrói mapeamento de múltiplas fotos por cor + capa da cor (estritamente das cores da grade do ERP)
    const finalColorImages: Record<string, string[]> = {};
    const finalColorImageMap: Record<string, string> = {};

    Object.entries(editColorImages).forEach(([color, urls]) => {
      const cleanColor = String(color || '').trim();
      if (!cleanColor) return;
      if (availableColorsForEditModal.length > 0 && !availableColorsForEditModal.includes(cleanColor)) {
        return;
      }
      const validUrls = (urls || []).filter(u => u && typeof u === 'string' && u.trim() && !isPlaceholderUrl(u));
      if (validUrls.length > 0) {
        finalColorImages[cleanColor] = validUrls;
        finalColorImageMap[cleanColor] = (editColorImageMap[cleanColor] && validUrls.includes(editColorImageMap[cleanColor]))
          ? editColorImageMap[cleanColor]
          : validUrls[0];
      }
    });

    Object.entries(editColorImageMap).forEach(([color, url]) => {
      const cleanColor = String(color || '').trim();
      const cleanUrl = String(url || '').trim();
      if (cleanColor && cleanUrl && !isPlaceholderUrl(cleanUrl)) {
        if (availableColorsForEditModal.length > 0 && !availableColorsForEditModal.includes(cleanColor)) {
          return;
        }
        if (!finalColorImageMap[cleanColor]) {
          finalColorImageMap[cleanColor] = cleanUrl;
        }
        if (!finalColorImages[cleanColor]) {
          finalColorImages[cleanColor] = [cleanUrl];
        } else if (!finalColorImages[cleanColor].includes(cleanUrl)) {
          finalColorImages[cleanColor].push(cleanUrl);
        }
      }
    });

    const primaryCoverUrl = finalImages[0] || '';
    const cleanEditColor = editColor.trim();
    const savedColor = (availableColorsForEditModal.length > 0 && availableColorsForEditModal.includes(cleanEditColor))
      ? cleanEditColor
      : (availableColorsForEditModal.length > 0 ? (availableColorsForEditModal.find(c => c.toLowerCase() === (selectedProduct.cor || selectedProduct.color || '').toLowerCase()) || availableColorsForEditModal[0]) : (selectedProduct.cor || selectedProduct.color || undefined));

    const updatedProductPayload: Product = {
      id: mobId,
      moblinkId: mobId,
      name: productName,
      descricao: productName,
      sku: productSku,
      description: richDescription || selectedProduct.compl_descr || selectedProduct.descricaoMoblink || selectedProduct.descricao || 'Produto com garantia de qualidade Evidência Calçados.',
      descricao_completa: richDescription || selectedProduct.compl_descr || selectedProduct.descricaoMoblink || selectedProduct.descricao || 'Produto com garantia de qualidade Evidência Calçados.',
      compl_descr: selectedProduct.compl_descr || selectedProduct.descr_compl,
      /** Preços sincronizados com o ERP */
      price: productPrice,
      preco_venda: productPrice,
      precoVista: productVista,
      preco_vista: productVista,
      precoCartao: productCartao,
      preco_cartao: productCartao,
      preco_promocao: selectedProduct.preco_promocao,
      preco_venda_fracao: productPrice,
      category: categoryName,
      /** Classificação ERP — preservar sempre da API */
      classificacao: selectedProduct.classificacao,
      subcategory: selectedProduct.subcategoria,
      nome_grupo: selectedProduct.nome_grupo,
      nome_subgrupo: selectedProduct.nome_subgrupo,
      images: finalImages,
      managedPhotos: finalImages.length > 0,
      imageUrl: primaryCoverUrl,
      foto_uri: primaryCoverUrl,
      sizes: activeSizes,
      crediarioProprio: true,
      visible: productStock <= 0 ? false : editVisible,
      newArrival: editNewArrival,
      stockControl: true,
      stock: productStock,
      saldo_loja: productStock,
      saldos_lojas: selectedProduct.saldos_lojas,
      barcode: selectedProduct.codigoBarras || selectedProduct.barcode || undefined,
      brand: editBrand.trim() || selectedProduct.marca || selectedProduct.brand || resolveProductBrand(selectedProduct) || undefined,
      ...( (editBrand.trim() || selectedProduct.marca || selectedProduct.brand) ? { marca: editBrand.trim() || selectedProduct.marca || selectedProduct.brand } : {} ) as any,
      material: selectedProduct.material || undefined,
      color: savedColor,
      cor: savedColor,
      colorImages: finalColorImages,
      colorImageMap: finalColorImageMap,
      gender: editGender.trim() || selectedProduct.genero || selectedProduct.gender || resolveProductGender(selectedProduct) || undefined,
      genero: editGender.trim() || selectedProduct.genero || selectedProduct.gender || resolveProductGender(selectedProduct) || undefined,
      lastMoblinkSync: new Date().toISOString(),
      moblinkSyncStatus: 'synced',
      referencia: refCode,
      modelCode: refCode,
      referenceCode: refCode,
    };

    try {
      const existingInApp = products.find(p => p.id === mobId);
      // Grava no Firestore se houver alteração real (incluindo fotos, cores ou managedPhotos)
      if (hasProductChanged(existingInApp, updatedProductPayload)) {
        const sanitizedPayload = sanitizeProductForFirestore(updatedProductPayload, { allowEmptyPhotos: true });
        await setDoc(doc(db, 'products', mobId), sanitizedPayload, { merge: true });
      }

      if (existingInApp) {
        await updateProduct(mobId, updatedProductPayload);
      } else if (productStock > 0) {
        await addProduct(updatedProductPayload);
      }

      syncProductMediaToSupabase(updatedProductPayload).catch(() => {});

      setSelectedProduct(prev => prev ? {
        ...prev,
        ...updatedProductPayload,
        color: savedColor,
        cor: savedColor,
        colorImages: finalColorImages,
        colorImageMap: finalColorImageMap,
      } : null);

      // Atualiza também a lista local do MobLink no estado para refletir instantaneamente
      setMoblinkList(prev => prev.map(item => {
        if (String(item.id || item.moblinkId) === mobId) {
          return {
            ...item,
            nome: productName,
            name: productName,
            sku: productSku,
            color: savedColor,
            cor: savedColor,
            colorImages: finalColorImages,
            colorImageMap: finalColorImageMap,
            referencia: refCode,
            modelCode: refCode,
            referenceCode: refCode,
            preco_venda: productPrice,
            price: productPrice,
            saldo_loja: productStock,
            estoque: productStock,
            categoria: categoryName,
            category: categoryName,
            tamanhos: activeSizes,
            newArrival: editNewArrival
          };
        }
        return item;
      }));

      // Se o produto foi salvo e possui fotos válidas, remove do mapa de fotos com erro
      if (finalImages.length > 0) {
        clearBrokenPhoto(mobId);
        const cleanId = mobId.replace(/^MOB-/i, '');
        clearBrokenPhoto(cleanId);
        clearBrokenPhoto(`MOB-${cleanId}`);
        setBrokenPhotoMap(prev => {
          const copy = { ...prev };
          delete copy[mobId];
          delete copy[cleanId];
          delete copy[`MOB-${cleanId}`];
          return copy;
        });
      }

      setFeedback({
        success: true,
        message: `Produto "${productName}" (Ref: ${mobId}) atualizado com sucesso!`
      });

      setTimeout(() => {
        handleCloseEnrichmentForm();
      }, 1500);
    } catch (err: any) {
      console.warn('Erro ao salvar no Firestore, salvando localmente:', err);
      const existingInApp = products.find(p => p.id === mobId);
      if (existingInApp) {
        await updateProduct(mobId, updatedProductPayload);
      } else {
        await addProduct(updatedProductPayload);
      }

      setFeedback({
        success: true,
        message: `Dados salvos localmente para o produto ${mobId}.`
      });

      setTimeout(() => {
        handleCloseEnrichmentForm();
      }, 1500);
    }
  };

  // Salvar Referência Pai em Lote para os produtos selecionados
  const handleSaveBatchModelCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIdsList.length === 0) return;

    const codeToApply = batchModelCode.trim() || undefined;
    setIsSavingBatch(true);
    setFeedback(null);

    try {
      let successCount = 0;

      for (const mobId of selectedIdsList) {
        const rawItem = combinedCatalog.find(i => String(i.id || i.moblinkId) === mobId);
        const existingDb = getExistingDbProduct(mobId);

        const productName = existingDb?.name || rawItem?.nome || rawItem?.name || rawItem?.descricao || `Produto ${mobId}`;
        const productSku = existingDb?.sku || rawItem?.sku || mobId;
        const productPrice = existingDb?.price ?? extractPrecoVistaMoblink(rawItem) ?? 0;
        const productStock = existingDb?.stock ?? extractSaldoLojaMoblink(rawItem) ?? 0;
        const categoryName = existingDb?.category || rawItem?.categoria || rawItem?.category || 'Geral';
        const rawFoto = rawItem?.foto_uri || rawItem?.foto_url || rawItem?.imagem || rawItem?.image || '';
        const validImages = (existingDb?.images && existingDb.images.length > 0) ? existingDb.images : (rawFoto ? [rawFoto] : []);

        const updatedProductPayload: Product = {
          id: mobId,
          moblinkId: mobId,
          name: productName,
          descricao: productName,
          sku: productSku,
          description: existingDb?.description || rawItem?.compl_descr || rawItem?.descricao || 'Produto Evidência Calçados',
          descricao_completa: existingDb?.description || rawItem?.compl_descr || rawItem?.descricao || 'Produto Evidência Calçados',
          price: productPrice,
          preco_venda: productPrice,
          category: categoryName,
          images: validImages,
          sizes: existingDb?.sizes || (Array.isArray(rawItem?.tamanhos) ? rawItem.tamanhos : [37, 38, 39, 40, 41, 42, 43]),
          crediarioProprio: true,
          visible: productStock <= 0 ? false : (existingDb?.visible ?? true),
          stockControl: true,
          stock: productStock,
          saldo_loja: productStock,
          lastMoblinkSync: new Date().toISOString(),
          moblinkSyncStatus: 'synced',
          modelCode: codeToApply,
          referenceCode: codeToApply,
        };

        if (productStock > 0 && hasProductChanged(existingDb, updatedProductPayload)) {
          const sanitizedPayload = sanitizeProductForFirestore(updatedProductPayload);
          await setDoc(doc(db, 'products', mobId), sanitizedPayload, { merge: true });
        }

        if (existingDb) {
          await updateProduct(mobId, updatedProductPayload);
        } else if (productStock > 0) {
          await addProduct(updatedProductPayload);
        }

        successCount++;
      }

      setMoblinkList(prev => prev.map(item => {
        const mobId = String(item.id || item.moblinkId);
        if (selectedIdsList.includes(mobId)) {
          return {
            ...item,
            modelCode: codeToApply,
            referenceCode: codeToApply
          };
        }
        return item;
      }));

      setFeedback({
        success: true,
        message: `⚡ Sucesso! Código de Referência Pai "${codeToApply || 'Nenhum'}" aplicado a ${successCount} produto(s) simultaneamente!`
      });

      setSelectedMobIds({});
      setIsBatchModalOpen(false);
      setBatchModelCode('');
    } catch (err: any) {
      console.error('[MoblinkProductsManager] Erro ao salvar referência em lote:', err);
      setFeedback({
        success: false,
        message: `Falha ao salvar lote: ${err.message || 'Erro inesperado'}`
      });
    } finally {
      setIsSavingBatch(false);
    }
  };

  // Salvar Categoria em Lote para os produtos selecionados
  const handleSaveBatchCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIdsList.length === 0 || !batchCategory.trim()) return;

    const newCat = normalizeCategoryName(batchCategory.trim());
    setIsSavingBatchCategory(true);
    setFeedback(null);

    try {
      let successCount = 0;

      for (const mobId of selectedIdsList) {
        const rawItem = combinedCatalog.find(i => String(i.id || i.moblinkId) === mobId);
        const existingDb = getExistingDbProduct(mobId);

        const productName = existingDb?.name || rawItem?.nome || rawItem?.name || rawItem?.descricao || `Produto ${mobId}`;
        const productSku = existingDb?.sku || rawItem?.sku || mobId;
        const productPrice = existingDb?.price ?? extractPrecoVistaMoblink(rawItem) ?? 0;
        const productStock = existingDb?.stock ?? extractSaldoLojaMoblink(rawItem) ?? 0;
        const rawFoto = rawItem?.foto_uri || rawItem?.foto_url || rawItem?.imagem || rawItem?.image || '';
        const validImages = (existingDb?.images && existingDb.images.length > 0) ? existingDb.images : (rawFoto ? [rawFoto] : []);

        const updatedProductPayload: Product = {
          id: mobId,
          moblinkId: mobId,
          name: productName,
          descricao: productName,
          sku: productSku,
          description: existingDb?.description || rawItem?.compl_descr || rawItem?.descricao || 'Produto Evidência Calçados',
          descricao_completa: existingDb?.description || rawItem?.compl_descr || rawItem?.descricao || 'Produto Evidência Calçados',
          price: productPrice,
          preco_venda: productPrice,
          category: newCat,
          images: validImages,
          sizes: existingDb?.sizes || (Array.isArray(rawItem?.tamanhos) ? rawItem.tamanhos : [37, 38, 39, 40, 41, 42, 43]),
          crediarioProprio: true,
          visible: productStock <= 0 ? false : (existingDb?.visible ?? true),
          stockControl: true,
          stock: productStock,
          saldo_loja: productStock,
          stockBySize: existingDb?.stockBySize || existingDb?.sizeStockMap,
          sizeStockMap: existingDb?.sizeStockMap || existingDb?.stockBySize,
          lastMoblinkSync: new Date().toISOString(),
          moblinkSyncStatus: 'synced',
          modelCode: existingDb?.modelCode || existingDb?.referenceCode,
          referenceCode: existingDb?.referenceCode || existingDb?.modelCode,
          color: existingDb?.color || rawItem?.cor || 'Preto',
          cor: existingDb?.cor || rawItem?.cor || 'Preto',
        };

        if (productStock > 0 && hasProductChanged(existingDb, updatedProductPayload)) {
          const sanitizedPayload = sanitizeProductForFirestore(updatedProductPayload);
          await setDoc(doc(db, 'products', mobId), sanitizedPayload, { merge: true });
        }

        if (existingDb) {
          await updateProduct(mobId, updatedProductPayload);
        } else if (productStock > 0) {
          await addProduct(updatedProductPayload);
        }

        successCount++;
      }

      setMoblinkList(prev => prev.map(item => {
        const mobId = String(item.id || item.moblinkId);
        if (selectedIdsList.includes(mobId)) {
          return {
            ...item,
            categoria: newCat,
            category: newCat
          };
        }
        return item;
      }));

      setFeedback({
        success: true,
        message: `⚡ Sucesso! Categoria "${newCat}" aplicada a ${successCount} produto(s) simultaneamente!`
      });

      setSelectedMobIds({});
      setIsBatchCategoryModalOpen(false);
      setBatchCategory('');
    } catch (err: any) {
      console.error('[MoblinkProductsManager] Erro ao alterar categoria em lote:', err);
      setFeedback({
        success: false,
        message: `Falha ao alterar categoria em lote: ${err.message || 'Erro inesperado'}`
      });
    } finally {
      setIsSavingBatchCategory(false);
    }
  };

  // Salvar Visibilidade nas Vitrines da Loja Virtual em Lote
  const handleSaveBatchVisibility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIdsList.length === 0) return;

    const targetVisibility = batchVisibilityValue;
    setIsSavingBatchVisibility(true);
    setFeedback(null);

    try {
      let successCount = 0;

      for (const mobId of selectedIdsList) {
        const rawItem = combinedCatalog.find(i => String(i.id || i.moblinkId) === mobId);
        const existingDb = getExistingDbProduct(mobId);

        const productName = existingDb?.name || rawItem?.nome || rawItem?.name || rawItem?.descricao || `Produto ${mobId}`;
        const productSku = existingDb?.sku || rawItem?.sku || mobId;
        const productPrice = existingDb?.price ?? extractPrecoVistaMoblink(rawItem) ?? 0;
        const productStock = existingDb?.stock ?? extractSaldoLojaMoblink(rawItem) ?? 0;
        const categoryName = existingDb?.category || rawItem?.categoria || rawItem?.category || 'Geral';
        const rawFoto = rawItem?.foto_uri || rawItem?.foto_url || rawItem?.imagem || rawItem?.image || '';
        const validImages = (existingDb?.images && existingDb.images.length > 0) ? existingDb.images : (rawFoto ? [rawFoto] : []);

        const updatedProductPayload: Product = {
          id: mobId,
          moblinkId: mobId,
          name: productName,
          descricao: productName,
          sku: productSku,
          description: existingDb?.description || rawItem?.compl_descr || rawItem?.descricao || 'Produto Evidência Calçados',
          descricao_completa: existingDb?.description || rawItem?.compl_descr || rawItem?.descricao || 'Produto Evidência Calçados',
          price: productPrice,
          preco_venda: productPrice,
          category: categoryName,
          images: validImages,
          sizes: existingDb?.sizes || (Array.isArray(rawItem?.tamanhos) ? rawItem.tamanhos : [37, 38, 39, 40, 41, 42, 43]),
          crediarioProprio: true,
          visible: productStock <= 0 ? false : targetVisibility,
          stockControl: true,
          stock: productStock,
          saldo_loja: productStock,
          stockBySize: existingDb?.stockBySize || existingDb?.sizeStockMap,
          sizeStockMap: existingDb?.sizeStockMap || existingDb?.stockBySize,
          lastMoblinkSync: new Date().toISOString(),
          moblinkSyncStatus: 'synced',
          modelCode: existingDb?.modelCode || existingDb?.referenceCode,
          referenceCode: existingDb?.referenceCode || existingDb?.modelCode,
          color: existingDb?.color || rawItem?.cor || 'Preto',
          cor: existingDb?.cor || rawItem?.cor || 'Preto',
        };

        if (productStock > 0 && hasProductChanged(existingDb, updatedProductPayload)) {
          const sanitizedPayload = sanitizeProductForFirestore(updatedProductPayload);
          await setDoc(doc(db, 'products', mobId), sanitizedPayload, { merge: true });
        }

        if (existingDb) {
          await updateProduct(mobId, updatedProductPayload);
        } else if (productStock > 0) {
          await addProduct(updatedProductPayload);
        }

        successCount++;
      }

      setMoblinkList(prev => prev.map(item => {
        const mobId = String(item.id || item.moblinkId);
        if (selectedIdsList.includes(mobId)) {
          return {
            ...item,
            visible: targetVisibility
          };
        }
        return item;
      }));

      setFeedback({
        success: true,
        message: `⚡ Visibilidade em Lote Atualizada! ${successCount} produto(s) agora estão ${targetVisibility ? 'VISÍVEIS nas vitrines da loja' : 'OCULTOS da loja virtual'}.`
      });

      setSelectedMobIds({});
      setIsBatchVisibilityModalOpen(false);
    } catch (err: any) {
      console.error('[MoblinkProductsManager] Erro ao salvar visibilidade em lote:', err);
      setFeedback({
        success: false,
        message: `Falha ao atualizar visibilidade em lote: ${err.message || 'Erro inesperado'}`
      });
    } finally {
      setIsSavingBatchVisibility(false);
    }
  };

  // Exclusão de Produtos em Lote
  const handleBatchDeleteProducts = async () => {
    if (selectedIdsList.length === 0 || isDeletingBatch) return;

    const count = selectedIdsList.length;
    if (!window.confirm(`Tem certeza que deseja excluir os ${count} produto(s) selecionado(s)? Esta ação removerá os cadastros do banco de dados.`)) {
      return;
    }

    try {
      setIsDeletingBatch(true);
      setFeedback({
        success: true,
        message: `⏳ Excluindo ${count} produto(s) em lote... Aguarde.`
      });

      // 1. Executa exclusão em lote atômica com writeBatch no Firestore e limpa estado/localstorage de uma só vez
      await deleteProductsBatch(selectedIdsList);

      // 2. Atualiza a tabela local de forma instantânea
      const selectedSet = new Set<string>();
      selectedIdsList.forEach(id => {
        const s = String(id).trim();
        selectedSet.add(s);
        selectedSet.add(s.replace(/^MOB-/, ''));
        if (!s.startsWith('MOB-')) selectedSet.add(`MOB-${s}`);
      });
      setMoblinkList(prev => prev.filter(p => {
        const pId = String(p.id || '').trim();
        const mobId = String(p.moblinkId || '').trim();
        return !selectedSet.has(pId) && (!mobId || !selectedSet.has(mobId));
      }));

      // 3. Limpa seleção
      clearSelection();

      setFeedback({
        success: true,
        message: `🗑️ Sucesso! ${count} produto(s) excluído(s) da aplicação e do banco de dados.`
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      console.error('[MoblinkProductsManager] Erro ao excluir produtos em lote:', err);
      setFeedback({
        success: false,
        message: `Falha ao excluir produtos em lote: ${err.message || 'Erro inesperado'}`
      });
    } finally {
      setIsDeletingBatch(false);
    }
  };

  // Combine Moblink List with manual database products
  const combinedCatalog: MoblinkRawProduct[] = useMemo(() => {
    const catalog: MoblinkRawProduct[] = [...(moblinkList || [])];
    const mobListIds = new Set(
      (moblinkList || []).map(m => String(m?.id || m?.moblinkId || ''))
    );

    (products || []).forEach(dbProd => {
      if (!dbProd || isIgnoredClassification(dbProd)) return;
      const dbId = String(dbProd.id || '');
      const mobId = dbProd.moblinkId ? String(dbProd.moblinkId) : '';
      const isAlreadyInMoblinkList = mobListIds.has(dbId) || (mobId !== '' && mobListIds.has(mobId));
      if (!isAlreadyInMoblinkList) {
        const dbImages = Array.isArray(dbProd.images) ? dbProd.images : [];
        catalog.push({
          id: dbId || `PROD-${Math.random()}`,
          moblinkId: dbProd.moblinkId,
          sku: dbProd.sku || dbProd.modelOrSku || dbId,
          nome: dbProd.name || 'Produto sem nome',
          name: dbProd.name || 'Produto sem nome',
          descricao: dbProd.description || dbProd.name || 'Sem descrição',
          preco_venda: typeof dbProd.price === 'number' ? dbProd.price : 0,
          price: typeof dbProd.price === 'number' ? dbProd.price : 0,
          saldo_loja: typeof dbProd.stock === 'number' ? Math.max(0, dbProd.stock) : 0,
          estoque: typeof dbProd.stock === 'number' ? Math.max(0, dbProd.stock) : 0,
          classificacao: (dbProd as any)?.classificacao,
          id_grupo: (dbProd as any)?.id_grupo,
          id_subgrupo: (dbProd as any)?.id_subgrupo,
          cod_classificacao: (dbProd as any)?.cod_classificacao || (dbProd as any)?.codigo_classificacao,
          codigo_classificacao: (dbProd as any)?.codigo_classificacao || (dbProd as any)?.cod_classificacao,
          classificacao_erp: (dbProd as any)?.classificacao_erp,
          categoria: dbProd.category || 'Geral',
          category: dbProd.category || 'Geral',
          tamanhos: Array.isArray(dbProd.sizes) ? dbProd.sizes : [],
          foto_uri: dbImages.length > 0 ? dbImages[0] : (dbProd.foto_uri || ''),
          isManual: !dbProd.moblinkId && !dbId.startsWith('MOB-')
        });
      }
    });

    return catalog;
  }, [moblinkList, products]);

  // Extrai lista única de Nomes-Base (Modelos Principais) para o filtro inteligente
  const allBaseNames = useMemo(() => {
    return Array.from(
      new Set(
        (combinedCatalog || []).map(item => {
          const rawName = item.nome || item.name || item.descricao || '';
          return extractBaseNameAndVariant(rawName).baseName;
        }).filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [combinedCatalog]);

  // Filtering list com busca inteligente por ID, SKU, Nome Completo ou Modelo Principal
  const filteredMoblinkList = useMemo(() => {
    const query = String(searchQuery || '').toLowerCase();

    const filtered = (combinedCatalog || []).filter(item => {
      if (!item || isIgnoredClassification(item)) return false;
      const mobId = String(item.id || item.moblinkId || 'MOB-000');
      const existingDb = dbProductsMap.get(mobId);
      if (isIgnoredClassification(existingDb)) return false;
      const estoque = existingDb?.stock ?? extractSaldoLojaMoblink(item);

      // Ignorar produtos com estoque zerado quando a opção estiver ativa
      if (hideOutOfStock && estoque <= 0) return false;

      // Checagem de Grade de Produto (Grade de Tamanhos/Numerações/Variações)
      const itemHasGrade = hasProductValidGrade(item);

      // Ocultar produtos sem grade se o filtro 'hideNoGrade' estiver ativo ou conforme 'gradeFilter'
      if (hideNoGrade && !itemHasGrade) return false;
      if (gradeFilter === 'com_grade' && !itemHasGrade) return false;
      if (gradeFilter === 'sem_grade' && itemHasGrade) return false;

      const rawName = String(item.nome || item.name || item.descricao || '');
      const { baseName: itemBaseName } = extractBaseNameAndVariant(rawName);
      const sku = String(item.sku || '').toLowerCase();
      const id = mobId.toLowerCase();

      const { raw: rawClassSearchVal } = extractProductClassification(item, existingDb);
      const rawClassSearch = rawClassSearchVal.toLowerCase();

      const matchesSearch = !query || 
                            rawName.toLowerCase().includes(query) || 
                            sku.includes(query) || 
                            id.includes(query) || 
                            itemBaseName.toLowerCase().includes(query) ||
                            rawClassSearch.includes(query);

      const rawCat = item.categoria || item.category || item.nome_grupo || 'Geral';
      const normCat = normalizeCategoryName(rawCat);
      const matchesCategory = categoryFilter === 'Todos' || isProductInCategory(item as any, categoryFilter) || normCat.toUpperCase() === categoryFilter.toUpperCase() || rawCat.toUpperCase() === categoryFilter.toUpperCase();

      const rawSub = String((item as any).nome_subgrupo || (item as any).subgrupo || (item as any).subcategory || (item as any).subcategoria || '').trim();
      const normSub = normalizeSubcategoryName(rawSub);
      const upperName = rawName.toUpperCase();
      const subUpper = subcategoryFilter.toUpperCase();
      const matchesSubcategory = subcategoryFilter === 'Todas' ||
        normSub.toUpperCase() === subUpper ||
        rawSub.toUpperCase().includes(subUpper) ||
        upperName.includes(subUpper);

      const matchesBaseName = !baseNameFilter || itemBaseName.toLowerCase() === baseNameFilter.toLowerCase();

      const isErpItem = Boolean(item.moblinkId || String(item.id || '').startsWith('MOB-') || !item.isManual);
      const matchesSync = syncFilter === 'todos' || (syncFilter === 'erp' && isErpItem) || (syncFilter === 'manual' && !isErpItem);

      // Filtro por Classificação ERP (Grupo antes do "." e Subgrupo depois do ".")
      let matchesClassificacao = true;
      const gQuery = classificacaoGrupoFilter.trim();
      const sQuery = classificacaoSubgrupoFilter.trim();

      if (gQuery || sQuery) {
        const { grupo, subgrupo, raw } = extractProductClassification(item, existingDb);
        const catInfo = extractClassificacaoCategoria(existingDb || item);

        // Se o usuário digitou ou colou o código completo com ponto (ex: "002.001" ou "2.1")
        if (gQuery.includes('.')) {
          const [qG, qS] = gQuery.split('.');
          const qGNum = parseInt(qG, 10);
          const qSNum = parseInt(qS, 10);
          const itemGNum = parseInt(grupo, 10);
          const itemSNum = parseInt(subgrupo, 10);

          const matchesG = !isNaN(qGNum) && !isNaN(itemGNum) 
            ? qGNum === itemGNum 
            : grupo.toLowerCase().includes(qG.toLowerCase());
          const matchesS = !qS 
            ? true 
            : (!isNaN(qSNum) && !isNaN(itemSNum) ? qSNum === itemSNum : subgrupo.toLowerCase().includes(qS.toLowerCase()));

          matchesClassificacao = (raw === gQuery || raw.includes(gQuery)) || (matchesG && matchesS);
        } else {
          let matchesGrupo = true;
          if (gQuery) {
            const itemGNum = parseInt(grupo, 10);
            const qGNum = parseInt(gQuery, 10);
            if (!isNaN(itemGNum) && !isNaN(qGNum)) {
              matchesGrupo = itemGNum === qGNum;
            } else {
              matchesGrupo = grupo.toLowerCase().includes(gQuery.toLowerCase()) ||
                             (catInfo.nome_grupo && catInfo.nome_grupo.toLowerCase().includes(gQuery.toLowerCase())) ||
                             (catInfo.category && catInfo.category.toLowerCase().includes(gQuery.toLowerCase()));
            }
          }

          let matchesSubgrupo = true;
          if (sQuery) {
            const itemSNum = parseInt(subgrupo, 10);
            const qSNum = parseInt(sQuery, 10);
            if (!isNaN(itemSNum) && !isNaN(qSNum)) {
              matchesSubgrupo = itemSNum === qSNum;
            } else {
              matchesSubgrupo = subgrupo.toLowerCase().includes(sQuery.toLowerCase()) ||
                                (catInfo.nome_subgrupo && catInfo.nome_subgrupo.toLowerCase().includes(sQuery.toLowerCase())) ||
                                (catInfo.subcategory && catInfo.subcategory.toLowerCase().includes(sQuery.toLowerCase()));
            }
          }

          matchesClassificacao = matchesGrupo && matchesSubgrupo;
        }
      }

      // Filtro Seletivo de Fotos (Com Foto vs Sem Foto vs Com Erro 404)
      let matchesPhoto = true;
      // Dá precedência absoluta às fotos enriquecidas/gerenciadas no banco de dados (existingDb) sobre os dados brutos da lista Moblink
      const photoUrl = extractBestRealPhoto(existingDb) || extractBestRealPhoto(item);
      const hasRealPhoto = Boolean(photoUrl && !isPlaceholderUrl(photoUrl));
      const cleanMobId = mobId.replace(/^MOB-/i, '');
      const recordedBrokenUrl = brokenPhotoMap[mobId] || 
                                brokenPhotoMap[cleanMobId] || 
                                (existingDb?.id && brokenPhotoMap[String(existingDb.id)]) ||
                                '';
      // O produto só é considerado com foto quebrada se houver registro de erro E a foto atual for a mesma que quebrou
      const isPhotoBroken = Boolean(
        recordedBrokenUrl && (!photoUrl || recordedBrokenUrl === photoUrl)
      );

      if (photoFilter === 'com_foto') {
        matchesPhoto = hasRealPhoto && !isPhotoBroken;
      } else if (photoFilter === 'sem_foto') {
        matchesPhoto = !hasRealPhoto;
      } else if (photoFilter === 'com_erro') {
        matchesPhoto = hasRealPhoto && isPhotoBroken;
      }

      // Filtro Seletivo de Status no Site (Visível vs Oculto)
      let matchesVisibility = true;
      const catInfoVis = extractClassificacaoCategoria(existingDb || item);
      const isUnclassifiedVis = catInfoVis.category === 'Sem Classificação Definida' || !catInfoVis.isDefined;
      const isManuallyActiveVis = existingDb ? existingDb.visible !== false : ((item as any).visible !== false);
      const isVisibleOnSite = !isUnclassifiedVis && isManuallyActiveVis && estoque > 0 && hasRealPhoto && !isPhotoBroken;

      if (visibilityFilter === 'visivel') {
        matchesVisibility = isVisibleOnSite;
      } else if (visibilityFilter === 'oculto') {
        matchesVisibility = !isVisibleOnSite;
      }

      return matchesSearch && matchesCategory && matchesSubcategory && matchesBaseName && matchesSync && matchesClassificacao && matchesPhoto && matchesVisibility;
    });

    // Ordenação dinâmica da lista individual
    filtered.sort((a, b) => {
      const aMobId = String(a.id || a.moblinkId || '');
      const bMobId = String(b.id || b.moblinkId || '');
      const aDb = dbProductsMap.get(aMobId);
      const bDb = dbProductsMap.get(bMobId);
      const aStock = aDb?.stock ?? extractSaldoLojaMoblink(a);
      const bStock = bDb?.stock ?? extractSaldoLojaMoblink(b);

      if (sortBy === 'refMoblink') {
        const aNum = parseInt(aMobId.replace(/\D/g, ''), 10) || 0;
        const bNum = parseInt(bMobId.replace(/\D/g, ''), 10) || 0;
        if (aNum !== bNum) return aNum - bNum;
        return aMobId.localeCompare(bMobId);
      }

      if (sortBy === 'stockAsc') return aStock - bStock;
      if (sortBy === 'stockDesc') return bStock - aStock;

      // Default: 'nameSku' (Produto & SKU A-Z)
      const aName = a.nome || a.name || a.descricao || '';
      const bName = b.nome || b.name || b.descricao || '';
      return aName.localeCompare(bName);
    });

    return filtered;
  }, [combinedCatalog, searchQuery, categoryFilter, subcategoryFilter, classificacaoGrupoFilter, classificacaoSubgrupoFilter, baseNameFilter, syncFilter, photoFilter, brokenPhotoMap, visibilityFilter, hideOutOfStock, hideNoGrade, gradeFilter, sortBy, dbProductsMap]);

  // Taxonomia oficial lida diretamente da coleção 'categories' do Firebase Firestore
  const storeCategoryTree = useMemo(() => {
    const tree = new Map<string, Set<string>>();
    const firebaseCategories = (categories && categories.length > 0) ? categories : DEFAULT_CATEGORIES;

    firebaseCategories.forEach(cat => {
      if (!cat || !cat.name || cat.visible === false || cat.active === false) return;
      const normCat = normalizeCategoryName(cat.name);
      if (!normCat || normCat === 'Geral') return;

      if (!tree.has(normCat)) {
        tree.set(normCat, new Set());
      }

      (cat.subcategories || []).forEach(sub => {
        if (sub && sub.name && sub.visible !== false && sub.active !== false) {
          const normSub = normalizeSubcategoryName(sub.name);
          if (normSub) {
            tree.get(normCat)!.add(normSub);
          }
        }
      });
    });

    return tree;
  }, [categories]);

  // Lista ESTRITA de Categorias exibidas no dropdown (apenas Categorias da Loja)
  const uniqueCategories = useMemo(() => {
    return Array.from(storeCategoryTree.keys()).sort();
  }, [storeCategoryTree]);

  // Lista ESTRITA de Subcategorias exibidas no dropdown (apenas Subcategorias das Categorias da Loja)
  const uniqueSubcategories = useMemo(() => {
    if (categoryFilter !== 'Todos' && storeCategoryTree.has(categoryFilter)) {
      return Array.from(storeCategoryTree.get(categoryFilter)!).sort();
    }

    const allSubs = new Set<string>();
    storeCategoryTree.forEach(subsSet => {
      subsSet.forEach(sub => allSubs.add(sub));
    });

    return Array.from(allSubs).sort();
  }, [categoryFilter, storeCategoryTree]);

  // Indica se o produto possui desmembramento de grade de variações (cores e tamanhos) ativo no ERP
  const hasDesmembramentoGrade = useMemo(() => {
    return Boolean(
      selectedProductGrade &&
      (
        (Array.isArray(selectedProductGrade.cores) && selectedProductGrade.cores.length > 0) ||
        (Array.isArray(selectedProductGrade.variacoes) && selectedProductGrade.variacoes.some(v => Boolean(v.cor && v.cor.trim())))
      )
    );
  }, [selectedProductGrade]);

  // Lista de Cores disponíveis extraídas ESTRITAMENTE da Grade / Estoque do Produto no ERP
  const availableColorsForEditModal = useMemo(() => {
    // Se o produto NÃO possui desmembramento de grade no ERP, não há cores de grade para seleção
    if (!hasDesmembramentoGrade) {
      return [];
    }

    const set = new Set<string>();

    // 1. Extrai cores diretamente da Grade de Estoque do ERP (Tabela de Saldo por Tamanho/Cor)
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

  // Estrutura Agrupada por Classificação ERP (Número do Grupo antes do ponto '.', ex: 001, 002)
  const groupedList = useMemo(() => {
    const groupedMoblinkMap = filteredMoblinkList.reduce((acc, item) => {
      const mobId = String(item.id || item.moblinkId || 'MOB-000');
      const existingDb = dbProductsMap.get(mobId);
      const { raw: rawClass, grupo: rawGrupoNum } = extractProductClassification(item, existingDb);
      const grupoCode = rawGrupoNum ? rawGrupoNum.padStart(3, '0') : '';
      const catInfo = extractClassificacaoCategoria(existingDb || item);
      
      const isUnclassified = catInfo.category === 'Sem Classificação Definida' || (!catInfo.isDefined && !rawClass);
      const rawCatName = isUnclassified
        ? 'Sem Classificação Definida'
        : (catInfo.category || item.categoria || item.category || item.nome_grupo || 'Sem Classificação Definida');
      const groupKey = isUnclassified
        ? 'Sem Classificação Definida'
        : (grupoCode ? `Grupo ${grupoCode} (${rawCatName.toUpperCase()})` : 'Sem Classificação Definida');

      if (!acc[groupKey]) {
        acc[groupKey] = {
          baseName: groupKey,
          grupoCode: grupoCode || '---',
          category: rawCatName,
          items: [],
          totalStock: 0,
        };
      }

      const precoVista = extractPrecoVistaMoblink(item) || Number(item.preco_venda_fracao ?? item.preco_venda ?? item.preco ?? item.price ?? 0);
      const estoqueAtual = extractSaldoLojaMoblink(item);
      const hasEnrichedMedia = Boolean(existingDb && existingDb.images && existingDb.images.length > 0);
      const hasMedia = hasEnrichedMedia || Boolean(item.foto_uri || item.foto_url || item.foto || item.imagem || item.image);

      const itemModelCode = existingDb?.modelCode || existingDb?.referenceCode || (item as any)?.modelCode || (item as any)?.referenceCode;
      if (itemModelCode && !acc[groupKey].modelCode) {
        acc[groupKey].modelCode = itemModelCode;
      }

      const rawName = item.nome || item.name || item.descricao || '';
      const { variant } = extractBaseNameAndVariant(rawName);
      const displayColor = existingDb?.color || existingDb?.cor || item.cor || item.color || variant;

      acc[groupKey].items.push({
        item,
        mobId,
        variant: displayColor,
        precoVista,
        estoqueAtual,
        hasMedia,
        hasEnrichedMedia,
        existingDb,
      });

      acc[groupKey].totalStock += estoqueAtual;
      return acc;
    }, {} as Record<string, {
      baseName: string;
      grupoCode: string;
      category: string;
      modelCode?: string;
      items: Array<{
        item: MoblinkRawProduct;
        mobId: string;
        variant: string;
        precoVista: number;
        estoqueAtual: number;
        hasMedia: boolean;
        hasEnrichedMedia: boolean;
        existingDb: Product | undefined;
      }>;
      totalStock: number;
    }>);

    const groups = Object.values(groupedMoblinkMap);

    // Ordenação dos grupos pela numeração da Classificação ERP (001, 002, 003...)
    groups.sort((a, b) => {
      const aNum = parseInt(a.grupoCode, 10) || 0;
      const bNum = parseInt(b.grupoCode, 10) || 0;
      if (aNum !== bNum) return aNum - bNum;
      return a.baseName.localeCompare(b.baseName);
    });

    // Ordenar variações internas de cada grupo
    groups.forEach(group => {
      group.items.sort((a, b) => {
        if (sortBy === 'refMoblink') {
          const aNum = parseInt(a.mobId.replace(/\D/g, ''), 10) || 0;
          const bNum = parseInt(b.mobId.replace(/\D/g, ''), 10) || 0;
          if (aNum !== bNum) return aNum - bNum;
          return a.mobId.localeCompare(b.mobId);
        }
        if (sortBy === 'stockAsc') return a.estoqueAtual - b.estoqueAtual;
        if (sortBy === 'stockDesc') return b.estoqueAtual - a.estoqueAtual;
        return (a.item.nome || '').localeCompare(b.item.nome || '');
      });
    });

    return groups;
  }, [filteredMoblinkList, dbProductsMap, sortBy]);
  const isGroupedViewActive = viewMode === 'grouped' || Boolean(baseNameFilter);

  const totalPages = isGroupedViewActive 
    ? Math.max(1, Math.ceil(groupedList.length / PAGE_SIZE))
    : Math.max(1, Math.ceil(filteredMoblinkList.length / PAGE_SIZE));

  const currentPageSafe = Math.min(currentPage, totalPages);

  const paginatedList = filteredMoblinkList.slice((currentPageSafe - 1) * PAGE_SIZE, currentPageSafe * PAGE_SIZE);
  const paginatedGroupedList = groupedList.slice((currentPageSafe - 1) * PAGE_SIZE, currentPageSafe * PAGE_SIZE);

  // Métricas agregadas no padrão Apple Studio
  const totalUnitsInStock = useMemo(() => {
    return (moblinkList || []).reduce((acc, item) => acc + (extractSaldoLojaMoblink(item) || 0), 0);
  }, [moblinkList]);

  const zeroStockCount = useMemo(() => {
    return (combinedCatalog || []).filter(item => {
      const mobId = String(item.id || item.moblinkId || '');
      const existingDb = dbProductsMap.get(mobId);
      const estoque = existingDb?.stock ?? extractSaldoLojaMoblink(item) ?? 0;
      return estoque <= 0;
    }).length;
  }, [combinedCatalog, dbProductsMap]);

  // Contagem dinâmica e precisa de fotos com erro (apenas se a foto atual do produto ainda for a que quebrou)
  const activeBrokenPhotosCount = useMemo(() => {
    if (!brokenPhotoMap || Object.keys(brokenPhotoMap).length === 0) return 0;
    const brokenIds = new Set<string>();

    (combinedCatalog || []).forEach(item => {
      const mobId = String(item.id || item.moblinkId || '');
      const cleanId = mobId.replace(/^MOB-/i, '');
      const existingDb = dbProductsMap.get(mobId);
      const photoUrl = extractBestRealPhoto(existingDb) || extractBestRealPhoto(item);
      const recorded = brokenPhotoMap[mobId] || 
                       brokenPhotoMap[cleanId] || 
                       (existingDb?.id && brokenPhotoMap[String(existingDb.id)]) ||
                       '';
      if (recorded && (!photoUrl || recorded === photoUrl)) {
        brokenIds.add(mobId);
      }
    });

    return brokenIds.size;
  }, [combinedCatalog, dbProductsMap, brokenPhotoMap]);

  // Exportar Relatório em Excel com base nos produtos filtrados
  const handleExportExcelReport = useCallback(() => {
    if (!filteredMoblinkList || filteredMoblinkList.length === 0) {
      setFeedback({
        success: false,
        message: 'Nenhum produto encontrado com os filtros atuais para exportar.',
      });
      setTimeout(() => setFeedback(null), 4000);
      return;
    }

    try {
      generateProductsExcelReport(filteredMoblinkList, dbProductsMap, resolveProductSubcategory, brokenPhotoMap);
      setFeedback({
        success: true,
        message: `Relatório em Excel gerado com sucesso para ${filteredMoblinkList.length} produtos filtrados!`,
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      console.error('Erro ao gerar relatório Excel:', err);
      setFeedback({
        success: false,
        message: 'Falha ao exportar relatório em Excel.',
      });
      setTimeout(() => setFeedback(null), 4000);
    }
  }, [filteredMoblinkList, dbProductsMap]);

  // SE HOUVER PRODUTO SELECIONADO PARA EDIÇÃO, EXIBE EM PÁGINA INTEIRA COM VISÃO EXPANDIDA
  if (selectedProduct) {
    return (
      <ProductEditPage
        selectedProduct={selectedProduct}
        selectedProductGrade={selectedProductGrade}
        isLoadingProductGrade={isLoadingProductGrade}
        isSingleRefreshing={isSingleRefreshing}
        editName={editName}
        setEditName={setEditName}
        editBrand={editBrand}
        setEditBrand={setEditBrand}
        editGender={editGender}
        setEditGender={setEditGender}
        editColor={editColor}
        setEditColor={setEditColor}
        editVisible={editVisible}
        setEditVisible={setEditVisible}
        editNewArrival={editNewArrival}
        setEditNewArrival={setEditNewArrival}
        images={images}
        setImages={setImages}
        newImageUrl={newImageUrl}
        setNewImageUrl={setNewImageUrl}
        isUploading={isUploading}
        richDescription={richDescription}
        setRichDescription={setRichDescription}
        editColorImageMap={editColorImageMap}
        setEditColorImageMap={setEditColorImageMap}
        editColorImages={editColorImages}
        setEditColorImages={setEditColorImages}
        feedback={feedback}
        setFeedback={setFeedback}
        showWebSearchModal={showWebSearchModal}
        setShowWebSearchModal={setShowWebSearchModal}
        showAiDescriptionModal={showAiDescriptionModal}
        setShowAiDescriptionModal={setShowAiDescriptionModal}
        handleCloseEnrichmentForm={handleCloseEnrichmentForm}
        handleSaveProductEnrichment={handleSaveProductEnrichment}
        handleRefreshSingleProduct={handleRefreshSingleProduct}
        handleAddImageUrl={handleAddImageUrl}
        handleFileUpload={handleFileUpload}
        handleSetMainImage={handleSetMainImage}
        handleRemoveImage={handleRemoveImage}
        handleInsertTemplate={handleInsertTemplate}
        preserveExistingImages={preserveExistingImages}
        syncImageUpdateToFirestore={syncImageUpdateToFirestore}
      />
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-in font-sans">
      {/* BREADCRUMB */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (onBack) onBack();
            else if (goBack) goBack();
          }}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#0071E3] transition-colors cursor-pointer group"
        >
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Produtos</span>
        </button>
      </div>

      {/* TOP HEADER: ICON, TITLE, SUBTITLE & MOBLINK STATUS CONSOLE */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* LEFT: ICON + TITLE + BADGE + DESCRIPTION */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center text-[#0071E3] shadow-xs shrink-0">
            <Boxes className="h-6 w-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Gestão de Produtos &amp; Estoque
              </h1>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0071E3] dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                Apple Studio
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Central oficial de sincronização em tempo real do MobLink ERP. Enriqueça fotos, altere descrições de modelos e gerencie a visibilidade da vitrine.
            </p>
          </div>
        </div>

        {/* RIGHT: MOBLINK ERP STATUS PILL / CONSOLE */}
        <div className="flex items-center gap-4 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl px-4 py-2.5 shadow-xs shrink-0 self-start lg:self-auto">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
              <span>MobLink ERP</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                Conectado &amp; Ativo
              </span>
              <button
                type="button"
                onClick={fetchMoblinkProducts}
                disabled={isLoading}
                className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                title="Atualizar conexão com MobLink ERP"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
              </button>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />

          <div className="space-y-0.5 text-right">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Última sincronização
            </div>
            <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
              {lastSyncTime}
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO: AÇÕES DE SINCRONIZAÇÃO */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all shadow-xs space-y-3 ${
        theme === 'dark' ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white/95 border-slate-200/80 text-slate-900'
      }`}>
        {/* HEADER DA SEÇÃO */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#0071E3] dark:text-blue-400 shrink-0">
              <RefreshCw className="h-4 w-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className={`text-sm sm:text-base font-black tracking-tight ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>
                Ações de Sincronização
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Mantenha seus produtos sempre atualizados e sincronizados com o MobLink ERP.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
            className="px-3 py-1 rounded-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-[#0071E3] dark:text-blue-300 font-bold text-[11px] flex items-center gap-1.5 self-start sm:self-center transition-all cursor-pointer border border-blue-200/50 dark:border-blue-800/50 shrink-0"
          >
            <Zap className="h-3 w-3" />
            <span>Ações rápidas</span>
            {isQuickActionsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        {/* CONTEÚDO DOS CARDS DE AÇÃO */}
        {isQuickActionsOpen && (
          <div className="space-y-2.5 pt-0.5 animate-fade-in">
            {/* ROW 1: 4 CARDS COLORIDOS PRINCIPAIS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* CARD 1: Sincronizar 1 Produto (por ID) */}
              <button
                type="button"
                onClick={() => setShowSingleSyncModal(true)}
                disabled={isLoading || isSyncingSingle}
                className="p-3 rounded-xl bg-[#0071E3] hover:bg-[#005bb5] text-white flex items-center justify-between text-left transition-all group shadow-xs active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                title="Sincroniza apenas 1 produto específico digitando o ID cadastrado no MobLink ERP"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                    <RefreshCw className={`h-4 w-4 text-white ${isSyncingSingle ? 'animate-spin' : ''}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-white truncate">
                      Sincronizar 1 Produto
                    </div>
                    <div className="text-[10px] text-blue-100 font-medium truncate">
                      Atualiza apenas o ID informado
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-white/70 group-hover:text-white group-hover:translate-x-0.5 transition-transform shrink-0 ml-1.5" />
              </button>

              {/* CARD 2: Sincronizar & Auditar Fotos (Supabase) */}
              <button
                type="button"
                onClick={handleUnifiedSupabaseSync}
                disabled={isAuditingPhotos || isLinkingSupabase}
                className="p-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white flex items-center justify-between text-left transition-all group shadow-xs active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                title="Vincula fotos salvas no Supabase Storage pelo ID e abre a auditoria completa de mídias"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                    <ImageIcon className={`h-4 w-4 text-white ${isAuditingPhotos || isLinkingSupabase ? 'animate-spin' : ''}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-white truncate">
                      Sincronizar &amp; Auditar Fotos
                    </div>
                    <div className="text-[10px] text-purple-100 font-medium truncate">
                      Verifica e corrige fotos no Supabase
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-white/70 group-hover:text-white group-hover:translate-x-0.5 transition-transform shrink-0 ml-1.5" />
              </button>

              {/* CARD 3: Fazer Backup Fotos (Supabase) */}
              <button
                type="button"
                onClick={handleBackupPhotosToSupabase}
                disabled={isBackingUpPhotos || isLoading}
                className="p-3 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white flex items-center justify-between text-left transition-all group shadow-xs active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                title="Salva um backup completo de todas as fotos e links de produtos no Supabase Storage e Supabase DB"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                    <Save className={`h-4 w-4 text-white ${isBackingUpPhotos ? 'animate-spin' : ''}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-white truncate">
                      Fazer Backup Fotos
                    </div>
                    <div className="text-[10px] text-sky-100 font-medium truncate">
                      Cria backup das fotos no Supabase
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-white/70 group-hover:text-white group-hover:translate-x-0.5 transition-transform shrink-0 ml-1.5" />
              </button>

              {/* CARD 4: Restaurar Fotos (Supabase) */}
              <button
                type="button"
                onClick={handleRestorePhotosFromSupabase}
                disabled={isRestoringPhotos || isLoading}
                className="p-3 rounded-xl bg-[#059669] hover:bg-[#047857] text-white flex items-center justify-between text-left transition-all group shadow-xs active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                title="Restaura todas as fotos de produtos a partir do backup salvo no Supabase"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                    <Upload className={`h-4 w-4 text-white ${isRestoringPhotos ? 'animate-spin' : ''}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-white truncate">
                      Restaurar Fotos
                    </div>
                    <div className="text-[10px] text-emerald-100 font-medium truncate">
                      Restaura fotos de backup anterior
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-white/70 group-hover:text-white group-hover:translate-x-0.5 transition-transform shrink-0 ml-1.5" />
              </button>
            </div>

            {/* ROW 2: 3 CARDS SECUNDÁRIOS / OUTLINE */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* CARD 5: Fotos com Erro (N) */}
              <button
                type="button"
                onClick={() => {
                  setPhotoFilter('com_erro');
                  if (Object.keys(brokenPhotoMap).length === 0 && !isCheckingBrokenPhotos) {
                    handleAuditBrokenPhotos();
                  }
                }}
                className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/90 dark:border-rose-900/50 hover:bg-rose-100/70 text-left flex items-center justify-between transition-all group active:scale-[0.99] cursor-pointer"
                title="Visualize e corrija os produtos com fotos com problemas"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <AlertTriangle className={`h-4 w-4 ${isCheckingBrokenPhotos ? 'animate-spin' : ''}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-rose-600 dark:text-rose-400 truncate">
                      Fotos com Erro ({activeBrokenPhotosCount})
                    </div>
                    <div className="text-[10px] text-rose-600/75 dark:text-rose-400/80 font-medium truncate">
                      Visualize e corrija fotos com problemas
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-rose-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-transform shrink-0 ml-1.5" />
              </button>

              {/* CARD 6: Salvar Visível (Todos com Foto) */}
              <button
                type="button"
                onClick={() => handleAutoSetVisibleForProductsWithPhotos(false)}
                disabled={isAutoActivatingVisible || isLoading}
                className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/90 dark:border-amber-900/50 hover:bg-amber-100/70 text-left flex items-center justify-between transition-all group active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                title="Deixa todos os produtos visíveis com foto"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Eye className={`h-4 w-4 ${isAutoActivatingVisible ? 'animate-spin' : ''}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-amber-600 dark:text-amber-400 truncate">
                      Salvar Visível (Com Foto)
                    </div>
                    <div className="text-[10px] text-amber-600/75 dark:text-amber-400/80 font-medium truncate">
                      Ativa todos os produtos com foto no site
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-amber-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-transform shrink-0 ml-1.5" />
              </button>

              {/* CARD 7: Exportar Excel (N) */}
              <button
                type="button"
                onClick={handleExportExcelReport}
                disabled={isLoading || filteredMoblinkList.length === 0}
                className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/90 dark:border-emerald-900/50 hover:bg-emerald-100/70 text-left flex items-center justify-between transition-all group active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                title="Baixe a listagem completa dos produtos em Excel"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <FileSpreadsheet className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-emerald-700 dark:text-emerald-400 truncate">
                      Exportar Excel ({filteredMoblinkList.length})
                    </div>
                    <div className="text-[10px] text-emerald-700/75 dark:text-emerald-400/80 font-medium truncate">
                      Baixe a listagem completa dos produtos
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-emerald-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-transform shrink-0 ml-1.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* KPI STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: Catálogo Integrado */}
        <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all shadow-xs flex items-center justify-between ${
          theme === 'dark' ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white/95 border-slate-200/80 text-slate-900'
        }`}>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              CATÁLOGO INTEGRADO
            </div>
            <div className={`text-2xl font-black mt-0.5 ${theme === 'dark' ? 'text-white' : 'text-[#003B73]'}`}>
              {combinedCatalog.length}
            </div>
            <div className="text-[11px] font-semibold text-slate-400">
              SKUs cadastrados
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#0071E3] dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/50">
            <Package className="h-4 w-4" />
          </div>
        </div>

        {/* KPI 2: Unidades em Estoque */}
        <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all shadow-xs flex items-center justify-between ${
          theme === 'dark' ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white/95 border-slate-200/80 text-slate-900'
        }`}>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              UNIDADES EM ESTOQUE
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {totalUnitsInStock}
            </div>
            <div className="text-[11px] font-semibold text-slate-400">
              pares / produtos
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/50">
            <Layers className="h-4 w-4" />
          </div>
        </div>

        {/* KPI 3: Modelos Agrupados */}
        <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all shadow-xs flex items-center justify-between ${
          theme === 'dark' ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white/95 border-slate-200/80 text-slate-900'
        }`}>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              MODELOS AGRUPADOS
            </div>
            <div className={`text-2xl font-black mt-0.5 ${theme === 'dark' ? 'text-white' : 'text-[#003B73]'}`}>
              {groupedList.length}
            </div>
            <div className="text-[11px] font-semibold text-slate-400">
              referências pai
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-100 dark:border-purple-900/50">
            <LayoutGrid className="h-4 w-4" />
          </div>
        </div>

        {/* KPI 4: Status MobLink ERP */}
        <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all shadow-xs flex items-center justify-between ${
          theme === 'dark' ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white/95 border-slate-200/80 text-slate-900'
        }`}>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              STATUS MOBLINK ERP
            </div>
            <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
              <span>Conectado &amp; Ativo</span>
            </div>
            <div className="text-[11px] font-semibold text-slate-400">
              Sincronização em tempo real
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/50 relative">
            <Wifi className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          </div>
        </div>
      </div>

      {/* BARRA DE PROGRESSO DE SINCRONIZAÇÃO ERP */}
      {syncProgress && (
        <div className={`p-4 rounded-2xl border space-y-2 animate-fade-in ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-200">
            <span className="flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5 text-[#0071E3] animate-spin" />
              {syncProgress.phase}
            </span>
            <span className="font-mono text-[#0071E3] font-black">
              {syncProgress.total > 0 
                ? `${Math.round((syncProgress.current / syncProgress.total) * 100)}%` 
                : 'Processando...'}
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-[#0071E3] h-2.5 rounded-full transition-all duration-300 ease-out" 
              style={{ 
                width: `${syncProgress.total > 0 ? (syncProgress.current / syncProgress.total) * 100 : 0}%` 
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-semibold uppercase">
            <span>Início</span>
            <span>{syncProgress.current} / {syncProgress.total}</span>
          </div>
        </div>
      )}

      {fetchError && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
          <span>Servidor remoto em fallback local. Exibindo catálogo ativo do MobLink ERP.</span>
        </div>
      )}

      {/* SEÇÃO: FILTROS E PESQUISA */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all shadow-xs space-y-3.5 ${
        theme === 'dark' ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white/95 border-slate-200/80 text-slate-900'
      }`}>
        {/* HEADER DA SEÇÃO */}
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#0071E3] dark:text-blue-400 shrink-0">
            <Filter className="h-4 w-4 stroke-[2.5]" />
          </div>
          <div>
            <h2 className={`text-sm sm:text-base font-black tracking-tight ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>
              Filtros e Pesquisa
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Encontre e gerencie seus produtos de forma rápida e eficiente.
            </p>
          </div>
        </div>

        {/* TOP ROW: VIEW MODE SWITCHER + SEARCH + EXCEL BUTTON */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-2.5 pt-0.5">
          {/* VIEW MODE SWITCHER */}
          <div className="flex items-center space-x-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 select-none w-full lg:w-auto">
            <button
              type="button"
              onClick={() => { setViewMode('list'); setBaseNameFilter(''); }}
              className={`flex-1 lg:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                !isGroupedViewActive
                  ? 'bg-[#0071E3] text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>Modo Lista ({filteredMoblinkList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grouped')}
              className={`flex-1 lg:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                isGroupedViewActive
                  ? 'bg-[#0071E3] text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Agrupado ({groupedList.length})</span>
            </button>
          </div>

          {/* SEARCH INPUT */}
          <div className="relative w-full lg:flex-1 lg:max-w-xl">
            <input
              type="text"
              placeholder="Buscar por Modelo (ex: Sound Kids), ID MobLink..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all shadow-xs"
            />
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* EXPORTAR EXCEL BUTTON */}
          <button
            type="button"
            onClick={handleExportExcelReport}
            disabled={isLoading || filteredMoblinkList.length === 0}
            className="w-full lg:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 shrink-0"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Exportar Excel ({filteredMoblinkList.length})</span>
          </button>
        </div>

        {/* FILTER FIELDS GRID */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* ROW 1: Categoria, Subcategoria, Classificação, Ordenar por */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Categoria */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                Categoria
              </label>
              <div className="relative">
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setSubcategoryFilter('Todas');
                  }}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all cursor-pointer appearance-none pr-8"
                >
                  <option value="Todos">Todas ({uniqueCategories.length})</option>
                  {uniqueCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Subcategoria */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                Subcategoria
              </label>
              <div className="relative">
                <select
                  value={subcategoryFilter}
                  onChange={(e) => setSubcategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all cursor-pointer appearance-none pr-8"
                >
                  <option value="Todas">Todas ({uniqueSubcategories.length})</option>
                  {uniqueSubcategories.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Classificação */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                Classificação
              </label>
              <div className="flex items-center space-x-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5">
                <input
                  type="text"
                  placeholder="002"
                  value={classificacaoGrupoFilter}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    if (val.includes('.')) {
                      const [g, s] = val.split('.');
                      setClassificacaoGrupoFilter(g);
                      setClassificacaoSubgrupoFilter(s || '');
                    } else {
                      setClassificacaoGrupoFilter(val);
                    }
                  }}
                  className="w-14 px-1 text-xs font-mono font-bold bg-transparent border-0 outline-none text-slate-800 dark:text-blue-400 placeholder:text-slate-400 text-center"
                  title="Código do Grupo (número antes do ponto '.')"
                />
                <span className="text-xs font-black text-[#0071E3] font-mono">.</span>
                <input
                  type="text"
                  placeholder="001"
                  value={classificacaoSubgrupoFilter}
                  onChange={(e) => setClassificacaoSubgrupoFilter(e.target.value.trim())}
                  className="w-14 px-1 text-xs font-mono font-bold bg-transparent border-0 outline-none text-slate-800 dark:text-blue-400 placeholder:text-slate-400 text-center"
                  title="Código do Subgrupo (número depois do ponto '.')"
                />
                {(classificacaoGrupoFilter || classificacaoSubgrupoFilter) && (
                  <button
                    type="button"
                    onClick={() => {
                      setClassificacaoGrupoFilter('');
                      setClassificacaoSubgrupoFilter('');
                    }}
                    className="p-0.5 text-slate-400 hover:text-rose-500 rounded cursor-pointer"
                    title="Limpar classificação"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Ordenar por */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                Ordenar por
              </label>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all cursor-pointer appearance-none pr-8"
                >
                  <option value="nameSku">Produto &amp; SKU (A-Z)</option>
                  <option value="refMoblink">Ref MobLink (ID Numérico)</option>
                  <option value="stockDesc">Estoque (Maior → Menor)</option>
                  <option value="stockAsc">Estoque (Menor → Maior)</option>
                </select>
                <ChevronDown className="absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* ROW 2: Fotos + Botão Erro, Grade, Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            {/* Fotos */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                Fotos
              </label>
              <div className="relative">
                <select
                  value={photoFilter}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setPhotoFilter(val);
                    if (val === 'com_erro' && Object.keys(brokenPhotoMap).length === 0 && !isCheckingBrokenPhotos) {
                      handleAuditBrokenPhotos();
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all cursor-pointer appearance-none pr-8"
                >
                  <option value="todos">Todos (Com &amp; Sem Foto)</option>
                  <option value="com_foto">📸 Apenas Com Foto Válida</option>
                  <option value="sem_foto">🚫 Apenas Sem Foto</option>
                  <option value="com_erro">
                    ⚠️ Fotos com Erro / 404 {activeBrokenPhotosCount > 0 ? `(${activeBrokenPhotosCount})` : ''}
                  </option>
                </select>
                <ChevronDown className="absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Botão Fotos com Erro */}
            <div>
              <button
                type="button"
                onClick={() => {
                  setPhotoFilter('com_erro');
                  if (activeBrokenPhotosCount === 0 && !isCheckingBrokenPhotos) {
                    handleAuditBrokenPhotos();
                  }
                }}
                disabled={isCheckingBrokenPhotos}
                className={`w-full py-2 px-3 rounded-xl border text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  activeBrokenPhotosCount > 0
                    ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/30 dark:border-rose-900/60 dark:text-rose-400'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                }`}
              >
                <AlertTriangle className={`h-4 w-4 ${isCheckingBrokenPhotos ? 'animate-spin' : activeBrokenPhotosCount > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`} />
                <span>
                  {isCheckingBrokenPhotos ? 'Auditando...' : `${activeBrokenPhotosCount} com Erro`}
                </span>
              </button>
            </div>

            {/* Grade */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                Grade
              </label>
              <div className="relative">
                <select
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all cursor-pointer appearance-none pr-8"
                >
                  <option value="todos">Todas (Com &amp; Sem Grade)</option>
                  <option value="com_grade">✓ Com Grade</option>
                  <option value="sem_grade">⚠️ Sem Grade</option>
                </select>
                <ChevronDown className="absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                Status
              </label>
              <div className="relative">
                <select
                  value={visibilityFilter}
                  onChange={(e) => setVisibilityFilter(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all cursor-pointer appearance-none pr-8"
                >
                  <option value="todos">Todos (Visíveis &amp; Ocultos)</option>
                  <option value="visivel">🟢 Apenas Visíveis no Site</option>
                  <option value="oculto">🔴 Apenas Ocultos no Site</option>
                </select>
                <ChevronDown className="absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* ROW 3: Checkbox Estoque Zerado + Limpar Filtros */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hideOutOfStock}
                onChange={(e) => setHideOutOfStock(e.target.checked)}
                className="w-4 h-4 rounded text-[#0071E3] border-slate-300 focus:ring-[#0071E3] cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Ocultar Estoque Zerado ({zeroStockCount})
              </span>
            </label>

            {(categoryFilter !== 'Todos' || subcategoryFilter !== 'Todas' || photoFilter !== 'todos' || gradeFilter !== 'todos' || visibilityFilter !== 'todos' || hideOutOfStock || hideNoGrade || classificacaoGrupoFilter || classificacaoSubgrupoFilter || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter('Todos');
                  setSubcategoryFilter('Todas');
                  setPhotoFilter('todos');
                  setGradeFilter('todos');
                  setVisibilityFilter('todos');
                  setHideOutOfStock(false);
                  setHideNoGrade(false);
                  setClassificacaoGrupoFilter('');
                  setClassificacaoSubgrupoFilter('');
                  setSearchQuery('');
                  setBaseNameFilter('');
                }}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 text-xs font-extrabold rounded-xl border border-rose-200 dark:border-rose-900/60 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer transition-all"
              >
                <X className="h-3.5 w-3.5" />
                <span>Limpar Filtros</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MOBLINK PRODUCTS GRID / TABLE */}
      <div className={`border rounded-2xl overflow-hidden ${
        theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-100 shadow-xs'
      }`}>
        {isLoading && combinedCatalog.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="h-8 w-8 text-amber-500 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500">Consultando API oficial GET /api/v1/produtos do MobLink...</p>
          </div>
        ) : filteredMoblinkList.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Package className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-500">Nenhum produto encontrado.</p>
          </div>
        ) : isGroupedViewActive ? (
          /* MODO LISTA HIERÁRQUICA AGRUPADA POR CLASSIFICAÇÃO ERP */
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {paginatedGroupedList.map((group) => {
              const isExpanded = expandedModels[group.baseName] ?? true;
              const modelRefCode = group.modelCode || 
                group.items.find(i => i.existingDb?.modelCode || i.existingDb?.referenceCode)?.existingDb?.modelCode ||
                group.items.find(i => i.existingDb?.modelCode || i.existingDb?.referenceCode)?.existingDb?.referenceCode;

              return (
                <div key={group.baseName} className="transition-colors">
                  {/* CABEÇALHO DA CLASSIFICAÇÃO ERP (GRUPO) */}
                  <div 
                    onClick={() => toggleModelExpand(group.baseName)}
                    className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none transition-all ${
                      theme === 'dark' 
                        ? 'bg-slate-900/80 hover:bg-slate-800/80' 
                        : 'bg-slate-50/80 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button 
                        type="button" 
                        className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition-transform"
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-[#0071E3]" /> : <ChevronRight className="h-4 w-4" />}
                      </button>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <FolderTree className="h-4 w-4 text-[#0071E3] shrink-0" />
                          <h3 className="font-black text-sm text-slate-800 dark:text-slate-100">
                            Classificação {group.baseName}
                          </h3>
                          
                          <span className="text-[10px] px-2.5 py-0.5 bg-[#0071E3]/10 text-[#0071E3] dark:bg-blue-400/20 dark:text-blue-300 font-black rounded-full uppercase">
                            {group.items.length} produto(s)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Grupo de Classificação ERP com total de {group.totalStock} pares/unidades em estoque
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 flex-wrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const firstItem = group.items[0]?.item;
                          if (firstItem) {
                            handleOpenEnrichmentForm(firstItem);
                          }
                        }}
                        className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold rounded-lg text-[10px] border border-amber-500/20 flex items-center gap-1 cursor-pointer transition-all"
                        title="Editar dados da família e definir Código de Referência Pai"
                      >
                        <Edit3 className="h-3 w-3 text-amber-500" />
                        <span>{modelRefCode ? `Ref Pai: ${modelRefCode}` : '+ Definir Ref Pai'}</span>
                      </button>

                      <span className="text-xs font-bold px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-xl">
                        Estoque Acumulado: <strong>{group.totalStock} un</strong>
                      </span>

                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        {isExpanded ? 'Recolher Variações' : 'Expandir Variações'} ({group.items.length})
                      </span>
                    </div>
                  </div>

                  {/* VARIAÇÕES EXPANDIDAS DE CORES E IDS DO MOBLINK COM NOME ORIGINAL PRESERVADO */}
                  {isExpanded && (
                    <div className="bg-white dark:bg-[#0f172a] border-t border-slate-100 dark:border-slate-800/80 overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/70 dark:bg-slate-900/40 text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-100 dark:border-slate-800/50">
                            <th className="py-2.5 px-3 w-8 text-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSelectGroup(group.items);
                                }}
                                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                                title="Selecionar/Desselecionar todas as cores desta família"
                              >
                                {group.items.every(i => selectedMobIds[i.mobId]) ? (
                                  <CheckSquare className="h-4 w-4 text-amber-500" />
                                ) : (
                                  <Square className="h-4 w-4 text-slate-400" />
                                )}
                              </button>
                            </th>
                            <th className="py-2.5 px-4">Mídia</th>
                            <th className="py-2.5 px-4">Nome Completo Original (ERP MobLink) &amp; Cor</th>
                            <th className="py-2.5 px-4">ID MobLink / SKU / Ref Pai</th>
                            <th className="py-2.5 px-4">Preço à Vista</th>
                            <th className="py-2.5 px-4">Estoque</th>
                            <th className="py-2.5 px-4">Status</th>
                            <th className="py-2.5 px-4 text-right">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                          {group.items.map(({ item, mobId, variant, precoVista, estoqueAtual, hasMedia, existingDb }) => {
                            const fullOriginalName = item.nome || item.name || item.descricao || item.descricao_completa || group.baseName;
                            const itemRefCode = existingDb?.modelCode || existingDb?.referenceCode || (item as any)?.modelCode || (item as any)?.referenceCode;
                            const sizesList = Array.isArray(item.tamanhos) && item.tamanhos.length > 0
                              ? item.tamanhos.join(', ')
                              : (Array.isArray(existingDb?.sizes) ? existingDb.sizes.join(', ') : undefined);
                            const isItemSelected = Boolean(selectedMobIds[mobId]);
                            const cleanMobId = mobId.replace(/^MOB-/i, '');
                            const currentPhotoUrl = extractBestRealPhoto(existingDb) || extractBestRealPhoto(item);
                            const recBrokenUrl = brokenPhotoMap[mobId] || 
                                                brokenPhotoMap[cleanMobId] || 
                                                (existingDb?.id && brokenPhotoMap[String(existingDb.id)]) ||
                                                '';
                            const isBroken = Boolean(
                              recBrokenUrl && (!currentPhotoUrl || recBrokenUrl === currentPhotoUrl)
                            );

                            return (
                              <tr 
                                key={mobId}
                                onClick={() => handleOpenEnrichmentForm(item)}
                                className={`transition-colors cursor-pointer group/row ${
                                  isItemSelected 
                                    ? 'bg-amber-500/10 dark:bg-amber-500/10' 
                                    : 'hover:bg-amber-500/5 dark:hover:bg-slate-800/30'
                                }`}
                              >
                                {/* CHECKBOX SELEÇÃO */}
                                <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={isItemSelected}
                                    onChange={() => toggleSelectProduct(mobId)}
                                    className="w-4 h-4 rounded text-amber-500 border-slate-300 focus:ring-amber-500 cursor-pointer"
                                  />
                                </td>

                                {/* THUMBNAIL DA FOTO DA COR */}
                                <td className="py-3 px-4">
                                  <div className="relative w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                                    <ProductImage
                                      product={existingDb || item}
                                      variant="thumb"
                                      containerClassName="w-10 h-10"
                                      onImageError={(failedUrl) => recordBrokenPhoto(mobId, failedUrl)}
                                    />
                                    {isBroken && (
                                      <span 
                                        className="absolute -top-1 -right-1 bg-rose-600 text-white p-0.5 rounded-full shadow-md animate-bounce ring-1 ring-white dark:ring-slate-900"
                                        title="Foto com erro 404 / NoSuchKey"
                                      >
                                        <AlertTriangle className="h-2.5 w-2.5" />
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* NOME COMPLETO ORIGINAL DO ERP & COR */}
                                <td className="py-3 px-4">
                                  <p className="font-bold text-xs text-slate-800 dark:text-slate-100 group-hover/row:text-amber-600 dark:group-hover/row:text-amber-400 transition-colors leading-snug">
                                    {fullOriginalName}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className="text-[10px] font-black px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-md border border-amber-500/20">
                                      Cor: {variant}
                                    </span>
                                    {(() => {
                                      const isExplicitSingle = Boolean(sizesList && ['UN', 'UNICA', 'ÚNICA', 'U', 'TAMANHO ÚNICO', 'UNICO', 'ÚNICO'].includes(sizesList.trim().toUpperCase()));

                                      if (isExplicitSingle) {
                                        return (
                                          <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded border border-emerald-500/20 inline-flex items-center gap-1">
                                            <Sparkles className="h-2.5 w-2.5 text-emerald-500" />
                                            Tamanho Único
                                          </span>
                                        );
                                      }
                                      return sizesList ? (
                                        <span className="text-[9px] font-mono px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded font-semibold">
                                          Tam: {sizesList}
                                        </span>
                                      ) : null;
                                    })()}

                                    {Boolean(existingDb?.newArrival || (item as any)?.newArrival || item.newArrival) && (
                                      <span className="text-[9px] font-extrabold px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-300 rounded border border-purple-500/30 inline-flex items-center gap-1">
                                        <Sparkles className="h-2.5 w-2.5 text-purple-500" />
                                        Lançamento
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* ID MOBLINK / SKU / REF PAI */}
                                <td className="py-3 px-4 space-y-0.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-mono font-black text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-amber-400 rounded border border-slate-200 dark:border-slate-700">
                                      {mobId}
                                    </span>
                                    {(() => {
                                      const { raw: classCode } = extractProductClassification(item, existingDb);
                                      const catInfo = extractClassificacaoCategoria(existingDb || item);
                                      const isUnclass = catInfo.category === 'Sem Classificação Definida' || (!catInfo.isDefined && !classCode);
                                      const subcategory = isUnclass ? '' : resolveProductSubcategory(item, existingDb);
                                      return (
                                        <>
                                          {classCode && (
                                            <span className="font-mono text-[9px] font-black px-2 py-0.5 bg-[#0071E3]/10 text-[#0071E3] dark:bg-blue-900/40 dark:text-blue-300 rounded border border-[#0071E3]/20 inline-flex items-center gap-1" title="Classificação no MobLink ERP">
                                              <Layers className="h-2.5 w-2.5 text-[#0071E3] shrink-0" />
                                              <span>Classif: {classCode}</span>
                                            </span>
                                          )}
                                          {isUnclass ? (
                                            <span className="text-[9px] font-extrabold px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded border border-amber-500/20 inline-flex items-center gap-1" title="Classificação não definida nas categorias do ERP">
                                              <Tag className="h-2.5 w-2.5 text-amber-500 shrink-0" />
                                              <span>Sem Classificação Definida</span>
                                            </span>
                                          ) : subcategory ? (
                                            <span className="text-[9px] font-extrabold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[#003B73] dark:text-slate-200 rounded border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1">
                                              <Tag className="h-2.5 w-2.5 text-[#0071E3] shrink-0" />
                                              <span>Subcat: {subcategory}</span>
                                            </span>
                                          ) : null}
                                        </>
                                      );
                                    })()}
                                    {itemRefCode && (
                                      <span className="font-mono text-[9px] font-black px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded border border-amber-500/20">
                                        Ref Pai: {itemRefCode}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[9px] text-slate-400 font-mono">SKU: {item.sku || mobId}</p>
                                </td>

                                {/* PREÇO À VISTA */}
                                <td className="py-3 px-4 font-bold text-xs text-slate-900 dark:text-amber-400">
                                  R$ {precoVista.toFixed(2).replace('.', ',')}
                                </td>

                                {/* ESTOQUE */}
                                <td className="py-3 px-4">
                                  {estoqueAtual > 0 ? (
                                    <span className="font-mono font-bold text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                      {estoqueAtual} un
                                    </span>
                                  ) : (
                                    <span className="font-mono font-bold text-[10px] text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                                      Esgotado
                                    </span>
                                  )}
                                </td>

                                {/* STATUS DE MÍDIA */}
                                <td className="py-3 px-4">
                                  {isBroken ? (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-600 dark:text-rose-400">
                                      <AlertTriangle className="h-3 w-3 text-rose-500" />
                                      Erro 404
                                    </span>
                                  ) : hasMedia ? (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                      Com Fotos
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-600 dark:text-amber-400">
                                      <AlertCircle className="h-3 w-3 text-amber-500" />
                                      Pendente
                                    </span>
                                  )}
                                </td>

                                {/* AÇÃO */}
                                <td className="py-3 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenEnrichmentForm(item);
                                      }}
                                      className="px-3.5 py-1.5 bg-[#0071E3] hover:bg-[#00509E] text-white font-extrabold rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-xs active:scale-95 shrink-0"
                                      title="Editar variação e fotos"
                                    >
                                      <Edit3 className="h-3.5 w-3.5" />
                                      <span>Editar</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm(`Excluir a cor "${variant}" da referência ${mobId}?`)) {
                                          deleteProduct(mobId);
                                          setMoblinkList(prev => prev.filter(p => String(p.id || p.moblinkId) !== mobId));
                                        }
                                      }}
                                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-800/40 text-[10px] cursor-pointer transition-all"
                                      title="Excluir variação"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div>
            <AdminProductsTable
              products={paginatedList}
              selectedMobIds={selectedMobIds}
              onToggleSelectProduct={toggleSelectProduct}
              onToggleSelectAll={() => {
                const pageMobIds = paginatedList.map(i => String(i.id || i.moblinkId || 'MOB-000'));
                const allSelected = pageMobIds.length > 0 && pageMobIds.every(id => selectedMobIds[id]);
                setSelectedMobIds(prev => {
                  const next = { ...prev };
                  pageMobIds.forEach(id => {
                    if (allSelected) {
                      delete next[id];
                    } else {
                      next[id] = true;
                    }
                  });
                  return next;
                });
              }}
              onEditProduct={handleOpenEnrichmentForm}
              onDeleteProduct={(mobId) => {
                const item = paginatedList.find(p => String(p.id || p.moblinkId) === mobId);
                if (window.confirm(`Tem certeza que deseja excluir o produto "${item?.nome || item?.name || mobId}"?`)) {
                  deleteProduct(mobId);
                  setMoblinkList(prev => prev.filter(p => String(p.id || p.moblinkId) !== mobId));
                }
              }}
              getExistingDbProduct={getExistingDbProduct}
              resolveSubcategory={resolveProductSubcategory}
              onToggleVisibility={handleToggleVisibility}
              brokenPhotoMap={brokenPhotoMap}
              onImageError={(mobId, url) => recordBrokenPhoto(mobId, url)}
            />

            {/* CONTROLES DE PAGINAÇÃO DA TABELA */}
            {totalPages > 1 && (
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-slate-500">
                  Página <strong className="text-slate-800 dark:text-slate-200">{currentPageSafe}</strong> de <strong className="text-slate-800 dark:text-slate-200">{totalPages}</strong> ({filteredMoblinkList.length} produtos filtrados)
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPageSafe === 1}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer shadow-xs"
                  >
                    Anterior
                  </button>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPageSafe === totalPages}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer shadow-xs"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>



      {/* BARRA FLUTUANTE DE AÇÕES EM LOTE (ESTILO APPLE FLOATING DOCK) */}
      {selectedIdsList.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#1C1C1E]/95 dark:bg-slate-900/95 text-white px-6 py-3.5 rounded-full shadow-2xl border border-white/20 flex items-center gap-4 backdrop-blur-2xl animate-slide-up">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0071E3] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#0071E3]"></span>
            </span>
            <span className="text-xs font-black tracking-wide text-white">
              {selectedIdsList.length} variação(ões) selecionada(s)
            </span>
          </div>

          <div className="h-4 w-px bg-white/20"></div>

          <button
            type="button"
            onClick={() => {
              setBatchVisibilityValue(true);
              setIsBatchVisibilityModalOpen(true);
            }}
            className="px-4 py-2 bg-[#0071E3] hover:bg-[#0077ED] text-white font-extrabold rounded-full text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer active:scale-95"
          >
            <Eye className="h-4 w-4" />
            <span>Visibilidade Vitrine (Lote)</span>
          </button>

          <button
            type="button"
            onClick={handleBatchDeleteProducts}
            disabled={isDeletingBatch}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold rounded-full text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer active:scale-95"
            title="Excluir todos os produtos selecionados"
          >
            {isDeletingBatch ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Excluindo...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>Excluir Selecionados ({selectedIdsList.length})</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={clearSelection}
            className="px-3 py-2 text-slate-400 hover:text-white font-bold text-xs cursor-pointer transition-colors"
          >
            Desmarcar
          </button>
        </div>
      )}

      {/* MODAL DE ALTERAÇÃO DE VISIBILIDADE EM LOTE */}
      {isBatchVisibilityModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-sky-500" />
                <h3 className="font-black text-sm text-slate-800 dark:text-slate-100">
                  Exibir nas Vitrines da Loja Virtual (Lote)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchVisibilityModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBatchVisibility} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Escolha o status de exibição para os produtos selecionados:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBatchVisibilityValue(true)}
                    className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                      batchVisibilityValue
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-black shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    <Eye className="h-6 w-6 text-emerald-500" />
                    <span className="text-xs">Visível nas Vitrines</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBatchVisibilityValue(false)}
                    className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                      !batchVisibilityValue
                        ? 'bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400 font-black shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    <EyeOff className="h-6 w-6 text-rose-500" />
                    <span className="text-xs">Oculto das Vitrines</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 pt-1">
                  Esta alteração afetará <strong className="text-amber-500">{selectedIdsList.length} produto(s) selecionado(s)</strong> no banco de dados e refletirá instantaneamente nas vitrines da loja virtual.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBatchVisibilityModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingBatchVisibility}
                  className="px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-black text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-md disabled:opacity-50"
                >
                  {isSavingBatchVisibility ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Atualizando Lote...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Aplicar a {selectedIdsList.length} Produto(s)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE AUDITORIA DE FOTOS (SUPABASE STORAGE x FIREBASE FIRESTORE) */}
      {showAuditModal && photoAuditReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white dark:bg-[#0f172a] rounded-3xl max-w-3xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-4 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-800 dark:text-slate-100">
                    Auditoria de Fotos (Supabase Storage x Firebase)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Verificação de segurança entre fotos armazenadas no bucket e URLs no banco de dados.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
              <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-300">
                <div className="text-xs font-bold uppercase tracking-wider mb-1">Arquivos no Supabase</div>
                <div className="text-2xl font-black">{photoAuditReport.totalSupabaseFiles}</div>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                <div className="text-xs font-bold uppercase tracking-wider mb-1">Vinculadas no Firebase</div>
                <div className="text-2xl font-black">{photoAuditReport.totalLinkedPhotos}</div>
              </div>
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300">
                <div className="text-xs font-bold uppercase tracking-wider mb-1">Fotos Órfãs (Sem Firebase)</div>
                <div className="text-2xl font-black">{photoAuditReport.totalOrphanPhotos}</div>
              </div>
            </div>

            {/* Tabs Filter */}
            <div className="flex items-center gap-2 border-b dark:border-slate-800 pb-2 shrink-0">
              <button
                type="button"
                onClick={() => setAuditTab('orphan')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  auditTab === 'orphan'
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Fotos Órfãs ({photoAuditReport.totalOrphanPhotos})
              </button>
              <button
                type="button"
                onClick={() => setAuditTab('linked')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  auditTab === 'linked'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Fotos Vinculadas ({photoAuditReport.totalLinkedPhotos})
              </button>
              <button
                type="button"
                onClick={() => setAuditTab('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  auditTab === 'all'
                    ? 'bg-slate-800 text-white shadow-md'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Todas ({photoAuditReport.totalSupabaseFiles})
              </button>
            </div>

            {/* Items List */}
            <div className="overflow-y-auto space-y-3 flex-1 pr-2">
              {photoAuditReport.items
                .filter(item => {
                  if (auditTab === 'orphan') return item.isOrphan;
                  if (auditTab === 'linked') return !item.isOrphan;
                  return true;
                })
                .map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
                      item.isOrphan
                        ? 'bg-rose-500/5 border-rose-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={item.publicUrl}
                        alt={item.name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-700/40 shrink-0 bg-slate-100"
                        onError={(e) => { (e.target as any).src = NO_PHOTO_SVG; }}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          Caminho: <code className="text-purple-400">{item.filePath}</code>
                        </div>
                        {item.linkedProductName ? (
                          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 truncate">
                            ✓ Vinculada ao produto: {item.linkedProductName} ({item.linkedProductId})
                          </div>
                        ) : (
                          <div className="text-[11px] font-bold text-rose-500 truncate">
                            ⚠️ Órfã: NENHUM produto no Firebase utiliza esta foto.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={item.publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 transition-all text-xs font-bold"
                        title="Abrir no Supabase"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      {item.isOrphan && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAuditOrphan(item)}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-600 hover:bg-rose-500 hover:text-white transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                          title="Excluir arquivo do Supabase Storage"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Excluir</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-4 border-t dark:border-slate-800 shrink-0">
              <span className="text-xs text-slate-400 font-medium">
                Sincronização em tempo real de fotos ativas.
              </span>
              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Fechar Auditoria
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SINCRONIZAÇÃO DE PRODUTO ÚNICO POR ID */}
      {showSingleSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-[#0f172a] rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    Sincronizar 1 Produto por ID
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sincronize estoque e dados de um produto específico do MobLink ERP.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSingleSyncModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSyncSingleProduct();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-500 dark:text-slate-400 mb-2">
                  ID ou Código do Produto no ERP MobLink
                </label>
                <input
                  type="text"
                  value={singleSyncId}
                  onChange={(e) => setSingleSyncId(e.target.value)}
                  placeholder="Ex: 1250 ou MOB-1250"
                  autoFocus
                  required
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Informe o ID retornado pelo sistema ERP. O produto terá seu estoque, tabela de preço e cadastro sincronizados sem a necessidade de atualizar o catálogo inteiro.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSingleSyncModal(false)}
                  disabled={isSyncingSingle}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-extrabold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSyncingSingle || !singleSyncId.trim()}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncingSingle ? 'animate-spin' : ''}`} />
                  <span>{isSyncingSingle ? 'Sincronizando...' : 'Sincronizar Produto'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

