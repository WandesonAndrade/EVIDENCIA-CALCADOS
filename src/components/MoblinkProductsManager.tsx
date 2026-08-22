import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp, DEFAULT_CATEGORIES } from '../context/AppContext';
import { Product, ProdutoGradesResult } from '../types';
import { 
  getProdutosMoblink, 
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
  isNonFootwearProduct,
  extractClassificacaoCategoria,
  saveMoblinkCache,
  loadMoblinkCache
} from '../services/moblinkProductsService';
import { moblinkCategoriesService, normalizeCategoryName, normalizeSubcategoryName, isProductInCategory } from '../services/moblinkCategoriesService';
import { getProdutoGradesFromApi } from '../services/moblinkGradesService';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { uploadImageToSupabase, isSupabaseConfigured, deleteImageFromSupabase, auditSupabaseVsFirebasePhotos, PhotoAuditReport, SupabaseAuditItem } from '../services/supabaseStorageService';
import { 
  Package, 
  Search, 
  Image as ImageIcon, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
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
  Hash,
  FolderTree,
  CheckSquare,
  Square,
  Check,
  Tags,
  Folder,
  ExternalLink
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

interface MoblinkRawProduct {
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
  modelCode?: string;
  referencia?: string;
  referenceCode?: string;
  newArrival?: boolean;
  color?: string;
}

export const MoblinkProductsManager: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct, categories, theme } = useApp();

  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; phase: string } | null>(null);

  const [moblinkList, setMoblinkList] = useState<MoblinkRawProduct[]>(() => {
    // 1. Tentar carregar do cache local primeiro
    const cachedItems = loadMoblinkCache();
    if (cachedItems && cachedItems.length > 0) {
      return cachedItems as MoblinkRawProduct[];
    }

    // 2. Fallback para os produtos locais do Firebase
    return (products || []).map(dbProd => {
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
        categoria: dbProd?.category || 'Geral',
        subcategoria: (dbProd as any)?.subcategory || dbProd?.nome_subgrupo,
        nome_grupo: (dbProd as any)?.nome_grupo || dbProd?.category || 'Geral',
        nome_subgrupo: dbProd?.nome_subgrupo || (dbProd as any)?.subcategory,
        category: dbProd?.category || 'Geral',
        tamanhos: Array.isArray(dbProd?.sizes) ? dbProd.sizes : [],
        foto_uri: Array.isArray(dbProd?.images) && dbProd.images.length > 0 ? dbProd.images[0] : ((dbProd as any)?.foto_uri || ''),
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
  const [sortBy, setSortBy] = useState<'nameSku' | 'refMoblink' | 'stockAsc' | 'stockDesc'>('nameSku');
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Paginação da tabela (50 itens por página para suportar 1.800+ itens)
  const PAGE_SIZE = 50;
  const [currentPage, setCurrentPage] = useState(1);

  // Selected Product for Full Edit Form
  const [selectedProduct, setSelectedProduct] = useState<MoblinkRawProduct | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [richDescription, setRichDescription] = useState('');

  // Editable Product Fields State
  const [editName, setEditName] = useState('');
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

  // Sincroniza estado inicial caso a lista do Moblink esteja vazia
  useEffect(() => {
    if ((moblinkList || []).length === 0 && (products || []).length > 0) {
      setMoblinkList((products || []).map(dbProd => {
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
          categoria: dbProd?.category || 'Geral',
          subcategoria: (dbProd as any)?.subcategory || dbProd?.nome_subgrupo,
          nome_grupo: (dbProd as any)?.nome_grupo || dbProd?.category || 'Geral',
          nome_subgrupo: dbProd?.nome_subgrupo || (dbProd as any)?.subcategory,
          category: dbProd?.category || 'Geral',
          tamanhos: Array.isArray(dbProd?.sizes) ? dbProd.sizes : [],
          foto_uri: Array.isArray(dbProd?.images) && dbProd.images.length > 0 ? dbProd.images[0] : ((dbProd as any)?.foto_uri || ''),
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

  // Resetar página ao mudar filtros de busca/categoria/origem/modelo/viewMode/grade
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, subcategoryFilter, syncFilter, baseNameFilter, viewMode, hideOutOfStock, hideNoGrade, gradeFilter, sortBy]);

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
                visible: (estoqueAtual > 0 && itemHasGrade) ? (existingDb?.visible ?? true) : false,
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

          // APLICAÇÃO DA REGRA SOLICITADA:
          // Se estoque > 0 e TEM GRADE => visible = true (Visível nas vitrines da loja virtual)
          // Se estoque > 0 e NÃO TEM GRADE => visible = false (Desmarcado/Oculto nas vitrines da loja virtual)
          const isVisibleInStore = hasGrade;

          if (hasGrade) {
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
            console.warn(`[MoblinkProductsManager] Aviso ao salvar auditoria de grade no Firestore: ${mobId}`, writeErr);
          }
        }));
      }

      setFeedback({
        success: true,
        message: `⚡ Auditoria de Grades Concluída com Sucesso! ${withGradeCount} produtos com Grade Ativa (Visíveis na Vitrine Virtual) e ${noGradeCount} produtos sem Grade (Desmarcados e Ocultos da Vitrine).`
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

  // Open Full Edit Modal for a product
  const handleOpenEnrichmentForm = async (item: MoblinkRawProduct) => {
    if (!item) return;
    const mobId = String(item.id || item.moblinkId || 'MOB-000').trim();
    const existing = getExistingDbProduct(mobId);

    setSelectedProduct(item);
    setFeedback(null);
    setIsLoadingProductGrade(true);

    // Consulta de confirmação em tempo real da grade no ERP
    let itemHasGrade = hasProductValidGrade(item) || Boolean(existing?.hasGrade);
    try {
      const gradeRes = await getProdutoGradesFromApi(mobId);
      setSelectedProductGrade(gradeRes);
      if (gradeRes) {
        itemHasGrade = gradeRes.hasGrade || (Array.isArray(gradeRes.tamanhos) && gradeRes.tamanhos.length > 0) || (Array.isArray(gradeRes.variacoes) && gradeRes.variacoes.length > 0);
      }
    } catch {
      setSelectedProductGrade(null);
    } finally {
      setIsLoadingProductGrade(false);
    }

    // Initialize Edit Form Input States
    const initialName = existing?.name || item.nome || item.name || item.descricao || '';
    const initialSku = existing?.sku || item.sku || item.codigo || mobId;
    const initialModelCode = existing?.modelCode || existing?.referenceCode || (existing as any)?.referencia || item.modelCode || item.referenceCode || item.referencia || '';
    // Preço de tabela (carnê) como preço principal a ser editado
    const initialPrice = existing?.price ?? extractPrecoTabelaMoblink(item) ?? item.preco_venda ?? item.price ?? 0;
    // Preço à vista como originalPrice (referência de desconto)
    const initialOrigPrice = existing?.originalPrice ?? item.precoOriginal ?? '';
    const initialStock = existing?.stock ?? extractSaldoLojaMoblink(item) ?? 0;
    const initialCategory = (existing?.category && existing.category !== 'Geral') ? existing.category : (item.categoria && item.categoria !== 'Geral' ? normalizeCategoryName(item.categoria) : extractClassificacaoCategoria(item).category || 'Calçados');
    
    // REGRA MANDATÓRIA: Se NÃO possui grade (sem desmembramento no ERP), a visibilidade NUNCA é ativada por padrão
    const initialVisible = (initialStock > 0 && itemHasGrade) ? (existing?.visible ?? false) : false;
    const initialSizes = existing?.sizes && Array.isArray(existing.sizes) && existing.sizes.length > 0
      ? existing.sizes.join(', ')
      : (Array.isArray(item.tamanhos) ? item.tamanhos.join(', ') : '37, 38, 39, 40, 41, 42, 43');

    const rawVariant = extractBaseNameAndVariant(item.nome || item.name || item.descricao || '').variant;
    const initialColor = existing?.color || existing?.cor || item.cor || item.color || (rawVariant !== 'Padrão' ? rawVariant : 'Preto');

    // Inicialização da Grade de Estoque por Tamanho
    const initialStockMap: Record<string, number> = existing?.stockBySize || existing?.sizeStockMap || {};
    const parsedSizeArray = initialSizes.split(',').map(s => s.trim()).filter(Boolean);
    const finalStockMap: Record<string, number> = { ...initialStockMap };
    
    // Se não existir mapa detalhado anterior, inicializa com o estoque do MobLink ou distribui para edição
    if (Object.keys(finalStockMap).length === 0 && parsedSizeArray.length > 0) {
      const avgPerSize = Math.floor(initialStock / parsedSizeArray.length);
      let remainder = initialStock % parsedSizeArray.length;
      parsedSizeArray.forEach(sz => {
        finalStockMap[sz] = avgPerSize + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder--;
      });
    }

    const initialNewArrival = Boolean(existing?.newArrival || (item as any)?.newArrival || false);

    setEditName(initialName);
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

    const isPlaceholder = (url: string) => !url || url.includes('unsplash.com') || url.includes('placeholder');
    
    // Coleta TODAS as URLs válidas salvas no documento do Firebase (images[], foto_uri ou imageUrl)
    const existingDbImages: string[] = [];
    if (existing) {
      if (Array.isArray(existing.images)) {
        existing.images.forEach(img => {
          if (img && typeof img === 'string' && img.trim() && !isPlaceholder(img)) {
            const cleanUrl = img.trim();
            if (!existingDbImages.includes(cleanUrl)) existingDbImages.push(cleanUrl);
          }
        });
      }
      if (existing.foto_uri && typeof existing.foto_uri === 'string' && existing.foto_uri.trim() && !isPlaceholder(existing.foto_uri)) {
        const cleanUrl = existing.foto_uri.trim();
        if (!existingDbImages.includes(cleanUrl)) existingDbImages.push(cleanUrl);
      }
      if (existing.imageUrl && typeof existing.imageUrl === 'string' && existing.imageUrl.trim() && !isPlaceholder(existing.imageUrl)) {
        const cleanUrl = existing.imageUrl.trim();
        if (!existingDbImages.includes(cleanUrl)) existingDbImages.push(cleanUrl);
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

    const isPlaceholder = (url: string) => !url || url.includes('unsplash.com') || url.includes('placeholder') || url.includes('via.placeholder');
    
    // Separa fotos reais de fotos modelos genéricas
    const realPhotos = rawImagesList.filter(img => img && !isPlaceholder(img));
    
    // Se o usuário/ERP tiver fotos reais, exclui a foto padrão Unsplash
    const finalImagesList = realPhotos.length > 0 ? realPhotos : rawImagesList;

    setImages(finalImagesList);

    const targetId = String(selectedProduct.id || selectedProduct.moblinkId);
    const updatedProd: Partial<Product> = {
      images: finalImagesList,
      imageUrl: finalImagesList[0] || '',
      foto_uri: finalImagesList[0] || '',
      updatedAt: new Date().toISOString(),
    };

    // 1. Atualiza no contexto da aplicação
    updateProduct(targetId, updatedProd);

    // 2. Salva no Firestore instantaneamente no momento em que a foto é carregada/adicionada
    try {
      const docRef = doc(db, 'products', targetId);
      await setDoc(docRef, updatedProd, { merge: true });
      console.log(`[MoblinkProductsManager] Foto salva no Firebase Firestore instantaneamente para produto ${targetId}:`, finalImagesList);
    } catch (err: any) {
      console.warn(`[MoblinkProductsManager] Falha ao gravar foto no Firestore:`, err);
    }

    return finalImagesList;
  };

  // Add Image URL manualmente (salva no Firestore imediatamente e remove foto modelo padrão)
  const handleAddImageUrl = async () => {
    const url = newImageUrl.trim();
    if (!url) return;
    if (images.includes(url)) {
      setFeedback({ success: false, message: 'Esta imagem já foi adicionada.' });
      return;
    }

    const nextList = [...images, url];
    setNewImageUrl('');
    await syncImageUpdateToFirestore(nextList);

    setFeedback({ success: true, message: 'Foto salva e vinculada no Firebase com sucesso!' });
    setTimeout(() => setFeedback(null), 3000);
  };

  // Remove Image (exclui no estado, salva no Firestore e remove do Supabase Storage se for do Supabase)
  const handleRemoveImage = async (index: number) => {
    const targetUrl = images[index];
    const nextList = images.filter((_, i) => i !== index);
    
    await syncImageUpdateToFirestore(nextList);

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

  // File Upload (Upload no Supabase Storage -> Salva a URL pública no Firebase imediatamente)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFeedback(null);

    try {
      const publicUrl = await uploadImageToSupabase(file, {
        folder: 'produtos',
        customFileName: `produto_${selectedProduct?.id || 'new'}_${Date.now()}`
      });

      const nextList = [...images, publicUrl];
      await syncImageUpdateToFirestore(nextList);

      setFeedback({ success: true, message: 'Foto enviada para o Supabase Storage e salva no Firebase com sucesso!' });
    } catch (err: any) {
      console.warn("Upload no Supabase falhou (RLS ou permissão):", err);
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (typeof reader.result === 'string') {
          const nextList = [...images, reader.result as string];
          await syncImageUpdateToFirestore(nextList);
          setFeedback({ 
            success: false, 
            message: `Atenção: ${err.message || 'Erro no Supabase'}. A foto foi salva no Firebase.` 
          });
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
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

    const finalImages = images.filter(img => img && typeof img === 'string' && img.trim() !== '');

    const refCode = selectedProduct.referencia || selectedProduct.referenceCode || selectedProduct.modelCode || undefined;
    const activeSizes = selectedProductGrade?.tamanhos || (selectedProduct.tamanhos as any) || [];

    // Constrói mapeamento de múltiplas fotos por cor + capa da cor
    const finalColorImages: Record<string, string[]> = {};
    const finalColorImageMap: Record<string, string> = {};

    Object.entries(editColorImages).forEach(([color, urls]) => {
      const validUrls = (urls || []).filter(u => u && finalImages.includes(u));
      if (validUrls.length > 0) {
        finalColorImages[color] = validUrls;
        finalColorImageMap[color] = validUrls[0];
      }
    });

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
      sizes: activeSizes,
      crediarioProprio: true,
      visible: productStock <= 0 ? false : editVisible,
      newArrival: editNewArrival,
      stockControl: true,
      stock: productStock,
      saldo_loja: productStock,
      saldos_lojas: selectedProduct.saldos_lojas,
      barcode: selectedProduct.codigoBarras || selectedProduct.barcode || undefined,
      brand: selectedProduct.marca || selectedProduct.brand || undefined,
      material: selectedProduct.material || undefined,
      color: selectedProduct.cor || selectedProduct.color || undefined,
      cor: selectedProduct.cor || selectedProduct.color || undefined,
      colorImages: finalColorImages,
      colorImageMap: finalColorImageMap,
      gender: selectedProduct.genero || selectedProduct.gender || undefined,
      lastMoblinkSync: new Date().toISOString(),
      moblinkSyncStatus: 'synced',
      referencia: refCode,
      modelCode: refCode,
      referenceCode: refCode,
    };

    try {
      const existingInApp = products.find(p => p.id === mobId);
      // Grava no Firestore apenas se tiver estoque > 0 e se houver alteração real
      if (productStock > 0 && hasProductChanged(existingInApp, updatedProductPayload)) {
        const sanitizedPayload = sanitizeProductForFirestore(updatedProductPayload);
        await setDoc(doc(db, 'products', mobId), sanitizedPayload, { merge: true });
      }

      if (existingInApp) {
        await updateProduct(mobId, updatedProductPayload);
      } else if (productStock > 0) {
        await addProduct(updatedProductPayload);
      }

      // Atualiza também a lista local do MobLink no estado para refletir instantaneamente
      setMoblinkList(prev => prev.map(item => {
        if (String(item.id || item.moblinkId) === mobId) {
          return {
            ...item,
            nome: productName,
            name: productName,
            sku: productSku,
            color: selectedProduct.cor || selectedProduct.color || undefined,
            cor: selectedProduct.cor || selectedProduct.color || undefined,
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

  // Combine Moblink List with manual database products
  const combinedCatalog: MoblinkRawProduct[] = useMemo(() => {
    const catalog: MoblinkRawProduct[] = [...(moblinkList || [])];
    const mobListIds = new Set(
      (moblinkList || []).map(m => String(m?.id || m?.moblinkId || ''))
    );

    (products || []).forEach(dbProd => {
      if (!dbProd) return;
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
      if (!item) return false;
      const mobId = String(item.id || item.moblinkId || 'MOB-000');
      const existingDb = dbProductsMap.get(mobId);
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

      const matchesSearch = !query || 
                            rawName.toLowerCase().includes(query) || 
                            sku.includes(query) || 
                            id.includes(query) || 
                            itemBaseName.toLowerCase().includes(query);

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
        const catInfo = extractClassificacaoCategoria(item);
        const rawClass = catInfo.classificacao || String(item.classificacao || (item as any).id_grupo || '').trim();
        const parts = rawClass.split('.');
        const itemGrupo = (parts[0] !== undefined && parts[0] !== '') ? parts[0].trim() : String((item as any).id_grupo || '').trim();
        const itemSubgrupo = (parts[1] !== undefined && parts[1] !== '') ? parts[1].trim() : String((item as any).id_subgrupo || '').trim();

        let matchesGrupo = true;
        if (gQuery) {
          const itemGNum = parseInt(itemGrupo, 10);
          const qGNum = parseInt(gQuery, 10);
          if (!isNaN(itemGNum) && !isNaN(qGNum)) {
            matchesGrupo = itemGNum === qGNum;
          } else {
            matchesGrupo = itemGrupo.toLowerCase().includes(gQuery.toLowerCase());
          }
        }

        let matchesSubgrupo = true;
        if (sQuery) {
          const itemSNum = parseInt(itemSubgrupo, 10);
          const qSNum = parseInt(sQuery, 10);
          if (!isNaN(itemSNum) && !isNaN(qSNum)) {
            matchesSubgrupo = itemSNum === qSNum;
          } else {
            matchesSubgrupo = itemSubgrupo.toLowerCase().includes(sQuery.toLowerCase());
          }
        }

        matchesClassificacao = matchesGrupo && matchesSubgrupo;
      }

      return matchesSearch && matchesCategory && matchesSubcategory && matchesBaseName && matchesSync && matchesClassificacao;
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
  }, [combinedCatalog, searchQuery, categoryFilter, subcategoryFilter, classificacaoGrupoFilter, classificacaoSubgrupoFilter, baseNameFilter, syncFilter, hideOutOfStock, hideNoGrade, gradeFilter, sortBy, dbProductsMap]);

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

  // Lista de Cores disponíveis extraídas ESTRITAMENTE da Grade / Estoque do Produto no ERP
  const availableColorsForEditModal = useMemo(() => {
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

    // 2. Se a grade do ERP ainda não tiver carregado, carrega da cor cadastrada no produto/modelo
    if (set.size === 0) {
      if (editColor && editColor.trim()) set.add(editColor.trim());
      if (selectedProduct) {
        const prodCor = selectedProduct.cor || selectedProduct.color;
        if (prodCor && prodCor.trim()) set.add(prodCor.trim());

        const { baseName } = extractBaseNameAndVariant(selectedProduct.nome || selectedProduct.name || selectedProduct.descricao || '');
        combinedCatalog.forEach(i => {
          const { baseName: bName, variant } = extractBaseNameAndVariant(i.nome || i.name || i.descricao || '');
          if (bName.toLowerCase() === baseName.toLowerCase() && variant && variant !== 'Padrão') {
            set.add(variant.trim());
          }
        });
      }
    }

    return Array.from(set).sort();
  }, [editColor, selectedProductGrade, selectedProduct, combinedCatalog]);

  // Estrutura Agrupada por Modelo (Nome-Base) para exibição de variações de cores lado a lado
  const groupedList = useMemo(() => {
    const groupedMoblinkMap = filteredMoblinkList.reduce((acc, item) => {
      const mobId = String(item.id || item.moblinkId || 'MOB-000');
      const rawName = item.nome || item.name || item.descricao || '';
      const { baseName, variant } = extractBaseNameAndVariant(rawName);
      
      if (!acc[baseName]) {
        acc[baseName] = {
          baseName,
          category: item.categoria || item.category || 'Geral',
          items: [],
          totalStock: 0,
        };
      }

      const existingDb = dbProductsMap.get(mobId);
      const precoVista = extractPrecoVistaMoblink(item) || Number(item.preco_venda_fracao ?? item.preco_venda ?? item.preco ?? item.price ?? 0);
      const estoqueAtual = extractSaldoLojaMoblink(item);
      const hasEnrichedMedia = Boolean(existingDb && existingDb.images && existingDb.images.length > 0);
      const hasMedia = hasEnrichedMedia || Boolean(item.foto_uri || item.foto_url || item.foto || item.imagem || item.image);

      const itemModelCode = existingDb?.modelCode || existingDb?.referenceCode || (item as any)?.modelCode || (item as any)?.referenceCode;
      if (itemModelCode && !acc[baseName].modelCode) {
        acc[baseName].modelCode = itemModelCode;
      }

      const displayColor = existingDb?.color || existingDb?.cor || item.cor || item.color || variant;

      acc[baseName].items.push({
        item,
        mobId,
        variant: displayColor,
        precoVista,
        estoqueAtual,
        hasMedia,
        hasEnrichedMedia,
        existingDb,
      });

      acc[baseName].totalStock += estoqueAtual;
      return acc;
    }, {} as Record<string, {
      baseName: string;
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

    // Ordenação dinâmica dos grupos de modelos família
    groups.sort((a, b) => {
      if (sortBy === 'refMoblink') {
        const aFirstMobId = a.items[0]?.mobId || '';
        const bFirstMobId = b.items[0]?.mobId || '';
        const aNum = parseInt(aFirstMobId.replace(/\D/g, ''), 10) || 0;
        const bNum = parseInt(bFirstMobId.replace(/\D/g, ''), 10) || 0;
        if (aNum !== bNum) return aNum - bNum;
        return aFirstMobId.localeCompare(bFirstMobId);
      }
      if (sortBy === 'stockAsc') return a.totalStock - b.totalStock;
      if (sortBy === 'stockDesc') return b.totalStock - a.totalStock;
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
        return a.variant.localeCompare(b.variant);
      });
    });

    return groups;
  }, [filteredMoblinkList, sortBy, dbProductsMap]);
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

  return (
    <div className="space-y-6 text-left animate-fade-in font-sans">
      {/* APPLE STUDIO HEADER CONSOLE & STAT CARDS */}
      <div className={`p-6 sm:p-8 rounded-3xl border backdrop-blur-2xl transition-all shadow-md space-y-6 ${
        theme === 'dark' 
          ? 'bg-slate-900/90 border-slate-800 text-white' 
          : 'bg-white/90 border-slate-200/80 text-slate-900 shadow-xs'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-6 border-b border-slate-200/60 dark:border-slate-800/80">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-xl bg-[#0071E3]/10 text-[#0071E3] dark:bg-[#0071E3]/20 dark:text-blue-400">
                <Zap className="h-5 w-5 stroke-[2.5]" />
              </span>
              <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${
                theme === 'dark' ? 'text-white' : 'text-[#003B73]'
              }`}>
                Gestão de Produtos &amp; Estoque (MobLink ERP)
              </h2>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#0071E3]/10 text-[#0071E3] dark:bg-blue-400/20 dark:text-blue-300 border border-[#0071E3]/20">
                Apple Studio
              </span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
              Central oficial de sincronização em tempo real do MobLink ERP. Enriqueça fotos, altere descrições de modelos e gerencie a visibilidade da vitrine.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap shrink-0">
            <button
              onClick={fetchMoblinkProducts}
              disabled={isLoading}
              className="px-5 py-3 bg-[#0071E3] hover:bg-[#00509E] text-white font-extrabold rounded-2xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-white' : ''}`} />
              <span>{isLoading ? 'Sincronizando ERP...' : 'Atualizar Estoque ERP'}</span>
            </button>

            <button
              onClick={handleAuditAndApplyGradesToStockProducts}
              disabled={isLoading}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md active:scale-95 disabled:opacity-50 shadow-emerald-500/20"
              title="Audita saldo e grade de todos os produtos com estoque"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-200" />
              <span>⚡ Auditar &amp; Validar Grades</span>
            </button>

            <button
              onClick={handleRunPhotoAudit}
              disabled={isAuditingPhotos}
              className="px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-2xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md active:scale-95 disabled:opacity-50 shadow-purple-500/20"
              title="Audita fotos no Supabase Storage x URLs no Firebase Firestore"
            >
              <ImageIcon className={`h-4 w-4 text-purple-200 ${isAuditingPhotos ? 'animate-spin' : ''}`} />
              <span>{isAuditingPhotos ? 'Auditando Fotos...' : '🔒 Auditoria de Fotos (Supabase x Firebase)'}</span>
            </button>
          </div>
        </div>

        {/* APPLE KPI STATS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
            theme === 'dark' ? 'bg-slate-800/50 border-slate-700/60' : 'bg-slate-50/80 border-slate-200/70'
          }`}>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              <span>Catálogo Integrado</span>
              <Package className="h-4 w-4 text-[#0071E3]" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className={`text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-[#003B73]'}`}>
                {combinedCatalog.length}
              </span>
              <span className="text-xs text-slate-500 font-medium">SKUs cadastrados</span>
            </div>
          </div>

          <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
            theme === 'dark' ? 'bg-slate-800/50 border-slate-700/60' : 'bg-slate-50/80 border-slate-200/70'
          }`}>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              <span>Unidades em Estoque</span>
              <Layers className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {totalUnitsInStock}
              </span>
              <span className="text-xs text-slate-500 font-medium">pares / produtos</span>
            </div>
          </div>

          <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
            theme === 'dark' ? 'bg-slate-800/50 border-slate-700/60' : 'bg-slate-50/80 border-slate-200/70'
          }`}>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              <span>Modelos Agrupados</span>
              <FolderTree className="h-4 w-4 text-purple-500" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className={`text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-[#003B73]'}`}>
                {groupedList.length}
              </span>
              <span className="text-xs text-slate-500 font-medium">referências pai</span>
            </div>
          </div>

          <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
            theme === 'dark' ? 'bg-slate-800/50 border-slate-700/60' : 'bg-slate-50/80 border-slate-200/70'
          }`}>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              <span>Status MobLink ERP</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                Conectado &amp; Ativo
              </span>
            </div>
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

      {/* SEARCH AND FILTERS CONSOLE (APPLE STUDIO STYLE) */}
      <div className={`p-5 rounded-3xl border flex flex-col space-y-4 backdrop-blur-xl transition-all shadow-sm ${
        theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200/80 shadow-xs'
      }`}>
        {/* APPLE SEGMENTED CONTROL: VIEW MODE SWITCHER & SEARCH */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800/80">
          <div className="flex items-center space-x-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 select-none w-full md:w-auto">
            <button
              type="button"
              onClick={() => { setViewMode('list'); setBaseNameFilter(''); }}
              className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                !isGroupedViewActive
                  ? 'bg-white dark:bg-slate-900 text-[#0071E3] dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <List className="h-4 w-4" />
              <span>Modo Lista ({filteredMoblinkList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grouped')}
              className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                isGroupedViewActive
                  ? 'bg-white dark:bg-slate-900 text-[#0071E3] dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <FolderTree className="h-4 w-4" />
              <span>Agrupado por Modelo ({groupedList.length})</span>
            </button>
          </div>

          {/* SEARCH INPUT */}
          <div className="relative w-full md:max-w-md">
            <input
              type="text"
              placeholder="Buscar por Modelo (ex: Sound Kids), ID MobLink ou SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all shadow-xs"
            />
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          </div>
        </div>

        {/* SELECTS E FILTROS */}
        <div className="flex flex-wrap items-center gap-3">
          {/* FILTRO DE CATEGORIA */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0">Categoria:</span>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setSubcategoryFilter('Todas');
              }}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/80 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all cursor-pointer"
            >
              <option value="Todos">Todas ({uniqueCategories.length})</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* FILTRO DE SUBCATEGORIA */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0">Subcategoria:</span>
            <select
              value={subcategoryFilter}
              onChange={(e) => setSubcategoryFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/80 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all cursor-pointer"
            >
              <option value="Todas">Todas ({uniqueSubcategories.length})</option>
              {uniqueSubcategories.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          {/* FILTRO POR CLASSIFICAÇÃO ERP (GRUPO . SUBGRUPO) */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0">Classificação:</span>
            <div className="flex items-center space-x-1 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl p-1">
              <input
                type="text"
                placeholder="002"
                value={classificacaoGrupoFilter}
                onChange={(e) => setClassificacaoGrupoFilter(e.target.value)}
                className="w-12 px-1 py-0.5 text-xs font-mono font-bold bg-transparent border-0 outline-none text-slate-800 dark:text-blue-400 placeholder:text-slate-400 placeholder:font-normal text-center"
                title="Código do Grupo (número antes do ponto '.')"
              />
              <span className="text-xs font-black text-[#0071E3] font-mono">.</span>
              <input
                type="text"
                placeholder="001"
                value={classificacaoSubgrupoFilter}
                onChange={(e) => setClassificacaoSubgrupoFilter(e.target.value)}
                className="w-12 px-1 py-0.5 text-xs font-mono font-bold bg-transparent border-0 outline-none text-slate-800 dark:text-blue-400 placeholder:text-slate-400 placeholder:font-normal text-center"
                title="Código do Subgrupo (número depois do ponto '.')"
              />
              {(classificacaoGrupoFilter || classificacaoSubgrupoFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setClassificacaoGrupoFilter('');
                    setClassificacaoSubgrupoFilter('');
                  }}
                  className="p-1 text-slate-400 hover:text-rose-500 rounded cursor-pointer transition-colors"
                  title="Limpar filtro de classificação"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* ORDENAÇÃO DE PRODUTOS */}
          <div className="flex items-center space-x-1.5">
            <Filter className="h-3.5 w-3.5 text-[#0071E3] shrink-0" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0">Ordenar Por:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/80 dark:bg-slate-800/90 text-slate-800 dark:text-blue-400 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all cursor-pointer"
            >
              <option value="nameSku">Produto &amp; SKU (A-Z)</option>
              <option value="refMoblink">Ref MobLink (ID Numérico)</option>
              <option value="stockDesc">Estoque Actual (Maior → Menor)</option>
              <option value="stockAsc">Estoque Actual (Menor → Maior)</option>
            </select>
          </div>

          {/* FILTRO SELETIVO DE GRADE */}
          <div className="flex items-center space-x-1.5">
            <Layers className="h-3.5 w-3.5 text-[#0071E3] shrink-0" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0">Grade:</span>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value as any)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/80 dark:bg-slate-800/90 text-slate-800 dark:text-blue-400 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all cursor-pointer"
            >
              <option value="todos">Todas (Com &amp; Sem Grade)</option>
              <option value="com_grade">✓ Apenas Com Grade (Disponível p/ Venda)</option>
              <option value="sem_grade">⚠️ Apenas Sem Grade (Indisponível)</option>
            </select>
          </div>

          {/* TOGGLE OCULTAR ESTOQUE ZERADO */}
          <label className="inline-flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer select-none shrink-0 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={hideOutOfStock}
              onChange={(e) => setHideOutOfStock(e.target.checked)}
              className="w-4 h-4 rounded text-[#0071E3] border-slate-300 focus:ring-[#0071E3] cursor-pointer"
            />
            <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
              Ocultar Estoque Zerado (0)
            </span>
          </label>

          {/* TOGGLE OCULTAR PRODUTOS SEM GRADE */}
          <label className="inline-flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer select-none shrink-0 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Ocultar produtos que não possuem grade de tamanhos cadastrada">
            <input
              type="checkbox"
              checked={hideNoGrade}
              onChange={(e) => setHideNoGrade(e.target.checked)}
              className="w-4 h-4 rounded text-[#0071E3] border-slate-300 focus:ring-[#0071E3] cursor-pointer"
            />
            <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-[#0071E3]" />
              Ocultar Sem Grade
            </span>
          </label>
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
          /* MODO LISTA HIERÁRQUICA AGRUPADA POR NOME-BASE */
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {paginatedGroupedList.map((group) => {
              const isExpanded = expandedModels[group.baseName] ?? true;
              const modelRefCode = group.modelCode || 
                group.items.find(i => i.existingDb?.modelCode || i.existingDb?.referenceCode)?.existingDb?.modelCode ||
                group.items.find(i => i.existingDb?.modelCode || i.existingDb?.referenceCode)?.existingDb?.referenceCode;

              return (
                <div key={group.baseName} className="transition-colors">
                  {/* CABEÇALHO DA LINHA HIERÁRQUICA PAI (MODELO BASE) */}
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
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-amber-500" /> : <ChevronRight className="h-4 w-4" />}
                      </button>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Package className="h-4 w-4 text-amber-500 shrink-0" />
                          <h3 className="font-black text-sm text-slate-800 dark:text-slate-100">
                            {group.baseName}
                          </h3>
                          
                          {modelRefCode && (
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] font-black px-2.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-md">
                              <Hash className="h-3 w-3 text-amber-500" />
                              Ref Pai: {modelRefCode}
                            </span>
                          )}

                          <span className="text-[10px] px-2.5 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-full uppercase">
                            {group.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Modelo Família com {group.items.length} variação(ões) de cores cadastradas no ERP
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
                                  <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                                    {(existingDb?.images?.[0] || item.foto_uri || item.foto_url || item.imagem || item.image) ? (
                                      <img 
                                        src={existingDb?.images?.[0] || item.foto_uri || item.foto_url || item.imagem || item.image} 
                                        alt={variant} 
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <ImageIcon className="h-4 w-4 text-slate-400" />
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
                                      const catInfo = extractClassificacaoCategoria(item);
                                      const classCode = catInfo.classificacao || String(item.classificacao || (item as any).id_grupo || (item as any).cod_classificacao || (item as any).classificacao_erp || '').trim() || (existingDb as any)?.classificacao || '002.001';
                                      const subcategory = resolveProductSubcategory(item, existingDb);
                                      return (
                                        <>
                                          <span className="font-mono text-[9px] font-black px-2 py-0.5 bg-[#0071E3]/10 text-[#0071E3] dark:bg-blue-900/40 dark:text-blue-300 rounded border border-[#0071E3]/20 inline-flex items-center gap-1" title="Classificação no MobLink ERP">
                                            <Layers className="h-2.5 w-2.5 text-[#0071E3] shrink-0" />
                                            <span>Classif: {classCode}</span>
                                          </span>
                                          <span className="text-[9px] font-extrabold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[#003B73] dark:text-slate-200 rounded border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1">
                                            <Tag className="h-2.5 w-2.5 text-[#0071E3] shrink-0" />
                                            <span>Subcat: {subcategory}</span>
                                          </span>
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
                                  {hasMedia ? (
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
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200/60 dark:border-slate-800 text-slate-400 font-extrabold uppercase text-[9px] tracking-wider">
                    <th className="p-4 w-10 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
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
                        className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                        title="Selecionar/Desselecionar todos os produtos desta página"
                      >
                        {paginatedList.length > 0 && paginatedList.every(i => selectedMobIds[String(i.id || i.moblinkId || 'MOB-000')]) ? (
                          <CheckSquare className="h-4 w-4 text-[#0071E3]" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-400" />
                        )}
                      </button>
                    </th>
                    <th className="p-4 text-left">Ref MobLink</th>
                    <th className="p-4 text-left">Produto &amp; SKU</th>
                    <th className="p-4 text-left">Indicador de Sincronização</th>
                    <th className="p-4 text-left">Preço à Vista</th>
                    <th className="p-4 text-left">Estoque Actual</th>
                    <th className="p-4 text-left">Status de Mídia</th>
                    <th className="p-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {paginatedList.map((item) => {
                    const mobId = String(item.id || item.moblinkId || 'MOB-000');
                    const existingDb = getExistingDbProduct(mobId);
                    const isErpSynced = !item.isManual && (item.moblinkId || String(item.id).startsWith('MOB-') || true);
                    const hasEnrichedMedia = Boolean(existingDb && existingDb.images && existingDb.images.length > 0);
                    const hasMedia = hasEnrichedMedia || Boolean(item.foto_uri || item.foto_url || item.foto || item.imagem || item.image);

                    const precoVista = extractPrecoVistaMoblink(item) || Number(item.preco_venda_fracao ?? item.preco_venda ?? item.preco ?? item.price ?? 0);
                    const estoqueAtual = extractSaldoLojaMoblink(item);
                    const isItemSelected = Boolean(selectedMobIds[mobId]);

                    return (
                      <tr 
                        key={mobId}
                        onClick={() => handleOpenEnrichmentForm(item)}
                        className={`transition-all cursor-pointer group ${
                          isItemSelected 
                            ? 'bg-[#0071E3]/10 dark:bg-[#0071E3]/10' 
                            : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        {/* CHECKBOX SELEÇÃO */}
                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isItemSelected}
                            onChange={() => toggleSelectProduct(mobId)}
                            className="w-4 h-4 rounded text-[#0071E3] border-slate-300 focus:ring-[#0071E3] cursor-pointer"
                          />
                        </td>
                        {/* ID MOBLINK PRIMARY KEY */}
                        <td className="p-4">
                          <span className="font-mono font-black text-xs px-3 py-1 bg-slate-100 dark:bg-slate-800 text-[#003B73] dark:text-blue-300 rounded-xl border border-slate-200 dark:border-slate-700">
                            {mobId}
                          </span>
                        </td>

                        {/* PRODUCT NAME, SKU & CATEGORY */}
                        <td className="p-4">
                          <p className="font-bold text-slate-900 dark:text-slate-100 text-xs group-hover:text-[#0071E3] dark:group-hover:text-blue-400 transition-colors">
                            {item.nome || item.name || item.descricao}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[10px] text-slate-400 font-mono">SKU: {item.sku || mobId}</span>
                            {(() => {
                              const catInfo = extractClassificacaoCategoria(item);
                              const classCode = catInfo.classificacao || String(item.classificacao || (item as any).id_grupo || (item as any).cod_classificacao || (item as any).classificacao_erp || '').trim() || (existingDb as any)?.classificacao || '002.001';
                              const subcategory = resolveProductSubcategory(item, existingDb);
                              const rawCat = item.categoria || item.category || item.nome_grupo || existingDb?.category || 'Calçados';
                              const normCat = normalizeCategoryName(rawCat) || 'Calçados';

                              return (
                                <>
                                  <span className="font-mono text-[9px] font-black px-2 py-0.5 bg-[#0071E3]/10 text-[#0071E3] dark:bg-blue-900/40 dark:text-blue-300 rounded-md border border-[#0071E3]/20 inline-flex items-center gap-1" title="Código de Classificação no MobLink ERP (ex: 002.001)">
                                    <Layers className="h-2.5 w-2.5 text-[#0071E3] shrink-0" />
                                    <span>Classif ERP: {classCode}</span>
                                  </span>

                                  <span className="text-[9px] px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800/90 text-[#003B73] dark:text-slate-200 rounded-md font-extrabold border border-slate-200/60 dark:border-slate-700/60 inline-flex items-center gap-1">
                                    <Tag className="h-2.5 w-2.5 text-[#0071E3] shrink-0" />
                                    <span>{normCat}</span>
                                    <span className="text-[#0071E3] dark:text-blue-400 font-black"> › {subcategory}</span>
                                  </span>
                                </>
                              );
                            })()}
                            {(() => {
                              const itemSizesStr = Array.isArray(item.tamanhos) && item.tamanhos.length > 0
                                ? item.tamanhos.join(', ')
                                : (Array.isArray(existingDb?.sizes) && existingDb.sizes.length > 0 ? existingDb.sizes.join(', ') : '');

                              const isExplicitSingle = Boolean(itemSizesStr && ['UN', 'UNICA', 'ÚNICA', 'U', 'TAMANHO ÚNICO', 'UNICO', 'ÚNICO'].includes(itemSizesStr.trim().toUpperCase()));

                              if (isExplicitSingle) {
                                return (
                                  <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-500/20 inline-flex items-center gap-1">
                                    <Sparkles className="h-2.5 w-2.5 text-emerald-500" />
                                    Tamanho Único
                                  </span>
                                );
                              }
                              return null;
                            })()}
                            {Boolean(existingDb?.newArrival || (item as any)?.newArrival || item.newArrival) && (
                              <span className="text-[9px] font-extrabold px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-300 rounded-md border border-purple-500/30 inline-flex items-center gap-1">
                                <Sparkles className="h-2.5 w-2.5 text-purple-500" />
                                Lançamento
                              </span>
                            )}
                            {(() => {
                              const itemHasGrade = hasProductValidGrade(item);

                              if (itemHasGrade) {
                                return (
                                  <span className="text-[9px] font-extrabold px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-500/30 inline-flex items-center gap-1">
                                    <Layers className="h-2.5 w-2.5 text-emerald-500" />
                                    ✓ Grade Ativa
                                  </span>
                                );
                              }
                              return (
                                <span className="text-[9px] font-extrabold px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-md border border-rose-500/30 inline-flex items-center gap-1" title="Produtos sem desmembramento de grade de tamanhos/variações cadastrado no ERP ficam indisponíveis para venda">
                                  <AlertCircle className="h-2.5 w-2.5 text-rose-500" />
                                  ⚠️ Sem Grade (Indisponível p/ Venda)
                                </span>
                              );
                            })()}
                          </div>
                        </td>

                        {/* INDICADOR VISUAL DE SINCRONIZAÇÃO */}
                        <td className="p-4">
                          {hasEnrichedMedia ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/50" title="Preço e estoque sincronizados via ERP com mídias salvas pelo lojista">
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>Sincronizado MobLink + Lojista</span>
                            </span>
                          ) : isErpSynced ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/50" title="Dados direto da API oficial MobLink ERP">
                              <Zap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>Sincronizado MobLink</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200">
                              <Edit3 className="h-3.5 w-3.5 text-[#0071E3]" />
                              <span>Cadastro Manual</span>
                            </span>
                          )}
                        </td>

                        {/* PREÇO À VISTA */}
                        <td className="p-4 font-black text-xs sm:text-sm text-[#003B73] dark:text-white">
                          R$ {precoVista.toFixed(2).replace('.', ',')}
                        </td>

                        {/* ESTOQUE ATUAL (saldo_loja >= 0) */}
                        <td className="p-4">
                          {estoqueAtual > 0 ? (
                            <span className="font-mono font-extrabold text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/80 px-2.5 py-1 rounded-xl border border-emerald-300/50">
                              {estoqueAtual} un
                            </span>
                          ) : (
                            <span className="font-mono font-extrabold text-xs text-rose-800 dark:text-rose-300 bg-rose-100/80 dark:bg-rose-950/80 px-2.5 py-1 rounded-xl border border-rose-300/50">
                              Esgotado (0)
                            </span>
                          )}
                        </td>

                        {/* MEDIA STATUS BADGE */}
                        <td className="p-4">
                          {hasMedia ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-[#DDF1FF] text-[#003B73] dark:bg-blue-950/70 dark:text-blue-200 border border-[#006EDB]/20">
                              <CheckCircle2 className="h-3.5 w-3.5 text-[#006EDB]" />
                              <span>Com Fotos ({existingDb?.images?.length || 1})</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                              <span>Pendente</span>
                            </span>
                          )}
                        </td>

                        {/* ACTIONS */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEnrichmentForm(item);
                              }}
                              className="px-4 py-2 bg-[#0071E3] hover:bg-[#00509E] text-white font-extrabold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 shrink-0"
                              title="Editar nome, preço, estoque, mídias e descrição"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              <span>Editar</span>
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Tem certeza que deseja excluir o produto "${item.nome || item.name || mobId}"?`)) {
                                  deleteProduct(mobId);
                                  setMoblinkList(prev => prev.filter(p => String(p.id || p.moblinkId) !== mobId));
                                }
                              }}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-lg text-xs font-bold transition-all cursor-pointer"
                              title="Excluir produto do catálogo"
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

      {/* FORM MODAL: ADD PHOTOS AND RICH DESCRIPTION FOR MOBLINK PRODUCT */}
      {selectedProduct && (
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

            {/* READ-ONLY ERP DATA SUMMARY — dados diretos da API MobLink, somente leitura */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs">
                {/* Preço de Tabela (carnê/parcelado) */}
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

                {/* Preço de Cartão */}
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
                    {/* ESQUERDA: Nome amigável traduzido */}
                    <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-800 dark:text-slate-100">
                      <Tag className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span>{normalizeCategoryName(selectedProduct.nome_grupo || selectedProduct.categoria || selectedProduct.category || 'Geral')}</span>
                      {(selectedProduct.nome_subgrupo || selectedProduct.subcategoria || selectedProduct.subcategory) && (
                        <span className="text-slate-400 font-medium">
                          {' › '}{normalizeSubcategoryName(selectedProduct.nome_subgrupo || selectedProduct.subcategoria || selectedProduct.subcategory || '')}
                        </span>
                      )}
                    </span>
                    {/* DIREITA: Código bruto ERP (badge) */}
                    {selectedProduct.classificacao && (
                      <span className="font-mono font-black text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-lg shrink-0">
                        {selectedProduct.classificacao}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* BLOCO DA GRADE DO PRODUTO (MOBLINK ERP) — Cores, Tamanhos e Saldo com Saldo > 0 */}
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
                    {/* BADGES RESUMO DE TAMANHOS E CORES COM SALDO > 0 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* TAMANHOS / NUMERAÇÕES COM SALDO */}
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

                      {/* CORES / ACABAMENTOS COM SALDO */}
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

                    {/* TABELA DETALHADA DE VARIAÇÕES (COR x TAMANHO x SALDO) */}
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
                  {/* NOME DO PRODUTO */}
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

                  {/* TOGGLE VISIBILIDADE & MARCAR COMO LANÇAMENTO */}
                  <div className="space-y-2 pt-1">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <label className="inline-flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editVisible}
                          onChange={(e) => setEditVisible(e.target.checked)}
                          disabled={!hasProductValidGrade(selectedProduct) && (!selectedProductGrade || !selectedProductGrade.hasGrade)}
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

                    {(!hasProductValidGrade(selectedProduct) && (!selectedProductGrade || !selectedProductGrade.hasGrade)) && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-2.5 animate-fade-in">
                        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                        <span>⚠️ Produto sem desmembramento de grade cadastrado no ERP. A visibilidade na vitrine foi desativada automaticamente para proteger a loja.</span>
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 flex gap-2">
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

                  <label className="flex items-center justify-center gap-2 px-3 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30 rounded-xl text-xs cursor-pointer transition-all">
                    <Upload className="h-4 w-4 text-amber-500" />
                    <span>{isUploading ? 'Enviando...' : 'Carregar Imagem'}</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>

                {/* IMAGES THUMBNAILS GRID WITH COLOR ASSIGNMENT */}
                {images.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    {images.map((imgUrl, idx) => {
                      // Procura cor atribuída neste mapeamento multi-foto
                      const assignedColor = Object.keys(editColorImages).find(cKey => 
                        Array.isArray(editColorImages[cKey]) && editColorImages[cKey].includes(imgUrl)
                      ) || Object.keys(editColorImageMap).find(cKey => editColorImageMap[cKey] === imgUrl);

                      const matchedDropdownValue = assignedColor
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
                            {assignedColor && (
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

                          {/* VÍNCULO DA FOTO COM A COR DA GRADE DO ESTOQUE (Múltiplas Fotos Por Cor Permitidas) */}
                          <select
                            value={matchedDropdownValue}
                            onChange={(e) => {
                              const selColor = e.target.value;
                              
                              // Atualiza editColorImages (múltiplas fotos por cor)
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

                              // Atualiza editColorImageMap (capa por cor)
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

              {/* SECTION 2: RICH DESCRIPTION */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap items-center justify-between border-b pb-2 dark:border-slate-800 gap-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-amber-500" />
                    2. Descrição Rica e Detalhes de Apresentação
                  </h4>

                  {/* QUICK TEMPLATES */}
                  <div className="flex flex-wrap gap-1.5">
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
        </div>
      )}

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
                        onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100'; }}
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
    </div>
  );
};

