import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import { 
  getProdutosMoblink, 
  extractPrecoVistaMoblink, 
  extractSaldoLojaMoblink, 
  sanitizeProductForFirestore,
  extractBaseNameAndVariant 
} from '../services/moblinkProductsService';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
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
  X,
  Layers,
  ArrowRight,
  ShieldCheck,
  Palette,
  Grid,
  List,
  Filter
} from 'lucide-react';

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
  preco_venda?: number;
  preco_venda_fracao?: number;
  precos?: any[];
  precoOriginal?: number;
  estoque?: number;
  stock?: number;
  saldo_loja?: number;
  saldos_lojas?: any;
  id_grade?: number | string;
  categoria?: string;
  category?: string;
  tamanhos?: (number | string)[];
  codigoBarras?: string;
  barcode?: string;
  marca?: string;
  material?: string;
  cor?: string;
  genero?: string;
  foto_uri?: string;
  foto_url?: string;
  foto?: string;
  imagem?: string;
  image?: string;
  isManual?: boolean;
}

export const MoblinkProductsManager: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct, categories, theme } = useApp();

  const [moblinkList, setMoblinkList] = useState<MoblinkRawProduct[]>(() => {
    return (products || []).map(dbProd => {
      const dbId = String(dbProd?.id || `PROD-${Math.random()}`);
      return {
        id: dbId,
        moblinkId: dbProd?.moblinkId,
        sku: dbProd?.sku || dbProd?.modelOrSku || dbId,
        nome: dbProd?.name || 'Produto sem nome',
        name: dbProd?.name || 'Produto sem nome',
        descricao: dbProd?.description || dbProd?.name || 'Sem descrição',
        preco_venda: typeof dbProd?.price === 'number' ? dbProd.price : 0,
        price: typeof dbProd?.price === 'number' ? dbProd.price : 0,
        saldo_loja: typeof dbProd?.stock === 'number' ? Math.max(0, dbProd.stock) : 0,
        estoque: typeof dbProd?.stock === 'number' ? Math.max(0, dbProd.stock) : 0,
        categoria: dbProd?.category || 'Geral',
        category: dbProd?.category || 'Geral',
        tamanhos: Array.isArray(dbProd?.sizes) ? dbProd.sizes : [],
        foto_uri: Array.isArray(dbProd?.images) && dbProd.images.length > 0 ? dbProd.images[0] : (dbProd?.foto_uri || ''),
        isManual: !dbProd?.moblinkId && !dbId.startsWith('MOB-')
      };
    });
  });

  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [baseNameFilter, setBaseNameFilter] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');
  const [syncFilter, setSyncFilter] = useState<'todos' | 'erp' | 'manual'>('todos');
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
  const [editPrice, setEditPrice] = useState<number | string>('');
  const [editOriginalPrice, setEditOriginalPrice] = useState<number | string>('');
  const [editStock, setEditStock] = useState<number | string>('');
  const [editCategory, setEditCategory] = useState('');
  const [editVisible, setEditVisible] = useState(true);
  const [editSizes, setEditSizes] = useState('');
  
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
          preco_venda: typeof dbProd?.price === 'number' ? dbProd.price : 0,
          price: typeof dbProd?.price === 'number' ? dbProd.price : 0,
          saldo_loja: typeof dbProd?.stock === 'number' ? Math.max(0, dbProd.stock) : 0,
          estoque: typeof dbProd?.stock === 'number' ? Math.max(0, dbProd.stock) : 0,
          categoria: dbProd?.category || 'Geral',
          category: dbProd?.category || 'Geral',
          tamanhos: Array.isArray(dbProd?.sizes) ? dbProd.sizes : [],
          foto_uri: Array.isArray(dbProd?.images) && dbProd.images.length > 0 ? dbProd.images[0] : (dbProd?.foto_uri || ''),
          isManual: !dbProd?.moblinkId && !dbId.startsWith('MOB-')
        };
      }));
    }
  }, [products]);

  // Resetar página ao mudar filtros de busca/categoria/origem/modelo/viewMode
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, syncFilter, baseNameFilter, viewMode]);

  // Fetch products from GET /api/v1/produtos
  const fetchMoblinkProducts = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const items = await getProdutosMoblink();
      if (Array.isArray(items) && items.length > 0) {
        setMoblinkList(items);
      }
    } catch (err: any) {
      console.warn('Fallback local para produtos do Moblink:', err);
      setFetchError(err.message || 'Erro ao comunicar com a API do MobLink');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMoblinkProducts();
  }, []);

  // Check if a Moblink product is already in our database
  const getExistingDbProduct = (moblinkId: string): Product | undefined => {
    if (!moblinkId) return undefined;
    return (products || []).find(p => p && (p.id === moblinkId || p.moblinkId === moblinkId));
  };

  // Open Full Edit Modal for a product
  const handleOpenEnrichmentForm = (item: MoblinkRawProduct) => {
    if (!item) return;
    const mobId = String(item.id || item.moblinkId || 'MOB-000');
    const existing = getExistingDbProduct(mobId);

    setSelectedProduct(item);
    setFeedback(null);

    // Initialize Edit Form Input States
    const initialName = existing?.name || item.nome || item.name || item.descricao || '';
    const initialSku = existing?.sku || item.sku || item.codigo || mobId;
    const initialPrice = existing?.price ?? extractPrecoVistaMoblink(item) ?? item.preco_venda ?? item.price ?? 0;
    const initialOrigPrice = existing?.originalPrice ?? item.precoOriginal ?? '';
    const initialStock = existing?.stock ?? extractSaldoLojaMoblink(item) ?? 0;
    const initialCategory = existing?.category || item.categoria || item.category || 'Geral';
    const initialVisible = existing?.visible !== undefined ? (initialStock <= 0 ? false : existing.visible) : initialStock > 0;
    const initialSizes = existing?.sizes && Array.isArray(existing.sizes) && existing.sizes.length > 0
      ? existing.sizes.join(', ')
      : (Array.isArray(item.tamanhos) ? item.tamanhos.join(', ') : '37, 38, 39, 40, 41, 42, 43');

    setEditName(initialName);
    setEditSku(initialSku);
    setEditPrice(initialPrice);
    setEditOriginalPrice(initialOrigPrice || '');
    setEditStock(initialStock);
    setEditCategory(initialCategory);
    setEditVisible(initialVisible);
    setEditSizes(initialSizes);

    if (existing && Array.isArray(existing.images) && existing.images.length > 0) {
      const rawFoto = item.foto_uri || item.foto_url || item.foto || item.imagem || item.image;
      if (rawFoto && typeof rawFoto === 'string' && !existing.images.includes(rawFoto)) {
        setImages([rawFoto, ...existing.images]);
      } else {
        setImages(existing.images);
      }
      setRichDescription(existing.description || item.compl_descr || item.descricaoMoblink || item.descricao || '');
    } else {
      const rawFoto = item.foto_uri || item.foto_url || item.foto || item.imagem || item.image;
      const complDescr = item.compl_descr || item.descr_compl || item.descricao_completa;
      const baseDescr = initialName || `Produto ${mobId}`;
      setImages(rawFoto && typeof rawFoto === 'string' ? [rawFoto] : []);
      setRichDescription(
        complDescr 
          ? `<p><strong>${baseDescr}</strong></p>\n<p>${complDescr}</p>`
          : item.descricaoMoblink || item.descricao || 
          `<h3>${baseDescr}</h3>\n<p>Produto importado do sistema MobLink ERP. Feito com materiais nobres e acabamento impecável.</p>\n<ul>\n  <li>Garantia de Qualidade Evidência</li>\n  <li>Acabamento em Couro Premium</li>\n</ul>`
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
    setEditPrice('');
    setEditOriginalPrice('');
    setEditStock('');
    setEditCategory('');
    setEditVisible(true);
    setEditSizes('');
    setFeedback(null);
  };

  // Add Image URL manually
  const handleAddImageUrl = () => {
    const url = newImageUrl.trim();
    if (!url) return;
    if (images.includes(url)) {
      setFeedback({ success: false, message: 'Esta imagem já foi adicionada.' });
      return;
    }
    setImages(prev => [...prev, url]);
    setNewImageUrl('');
    setFeedback({ success: true, message: 'Imagem adicionada à galeria!' });
    setTimeout(() => setFeedback(null), 3000);
  };

  // Remove Image
  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // Set image as main cover
  const handleSetMainImage = (index: number) => {
    if (index === 0) return;
    setImages(prev => {
      const copy = [...prev];
      const selected = copy.splice(index, 1)[0];
      return [selected, ...copy];
    });
  };

  // File Upload (Cloudinary / Base64 Data URL)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFeedback(null);

    try {
      if (cloudName && uploadPreset) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          if (data.secure_url) {
            setImages(prev => [...prev, data.secure_url]);
            setFeedback({ success: true, message: 'Foto enviada com sucesso para o Cloudinary!' });
          }
        } else {
          throw new Error('Falha no upload Cloudinary');
        }
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setImages(prev => [...prev, reader.result as string]);
            setFeedback({ success: true, message: 'Foto local carregada com sucesso!' });
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      setFeedback({ success: false, message: err.message || 'Erro ao carregar arquivo de imagem.' });
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

  // Save full product details (name, sku, price, stock, category, sizes, media & description)
  const handleSaveProductEnrichment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const mobId = String(selectedProduct.id || selectedProduct.moblinkId || 'MOB-000');
    const productName = editName.trim() || selectedProduct.nome || selectedProduct.name || `Produto ${mobId}`;
    const productSku = editSku.trim() || mobId;
    const productPrice = Math.max(0, Number(editPrice) || 0);
    const productOriginalPrice = Number(editOriginalPrice) > 0 ? Number(editOriginalPrice) : undefined;
    const productStock = Math.max(0, Number(editStock) || 0);
    const categoryName = editCategory.trim() || 'Geral';
    const parsedSizes = editSizes.split(',').map(s => s.trim()).filter(s => s !== '');

    const defaultCover = 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&q=80&w=800';
    const finalImages = images.length > 0 ? images : [defaultCover];

    const updatedProductPayload: Product = {
      id: mobId,
      moblinkId: mobId,
      name: productName,
      descricao: productName,
      sku: productSku,
      description: richDescription || selectedProduct.compl_descr || selectedProduct.descricaoMoblink || selectedProduct.descricao || 'Produto com garantia de qualidade Evidência Calçados.',
      descricao_completa: richDescription || selectedProduct.compl_descr || selectedProduct.descricaoMoblink || selectedProduct.descricao || 'Produto com garantia de qualidade Evidência Calçados.',
      compl_descr: selectedProduct.compl_descr || selectedProduct.descr_compl,
      price: productPrice,
      preco_venda: productPrice,
      preco_venda_fracao: productPrice,
      originalPrice: productOriginalPrice,
      onSale: Boolean(productOriginalPrice && productOriginalPrice > productPrice),
      category: categoryName,
      images: finalImages,
      sizes: parsedSizes.length > 0 ? parsedSizes : [37, 38, 39, 40, 41, 42, 43],
      crediarioProprio: true,
      visible: productStock <= 0 ? false : editVisible,
      stockControl: true,
      stock: productStock,
      saldo_loja: productStock,
      saldos_lojas: selectedProduct.saldos_lojas,
      barcode: selectedProduct.codigoBarras || selectedProduct.barcode,
      brand: selectedProduct.marca || 'Evidência Calçados',
      material: selectedProduct.material || 'Couro Legítimo',
      color: selectedProduct.cor || 'Preto',
      gender: selectedProduct.genero || 'Masculino',
      lastMoblinkSync: new Date().toISOString(),
      moblinkSyncStatus: 'synced'
    };

    try {
      // Save in Firestore directly with ID = mobId (Mesclagem Não-Destrutiva Persistente Sanitizada)
      const sanitizedPayload = sanitizeProductForFirestore(updatedProductPayload);
      await setDoc(doc(db, 'products', mobId), sanitizedPayload, { merge: true });

      const existingInApp = products.find(p => p.id === mobId);
      if (existingInApp) {
        await updateProduct(mobId, updatedProductPayload);
      } else {
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
            preco_venda: productPrice,
            price: productPrice,
            saldo_loja: productStock,
            estoque: productStock,
            categoria: categoryName,
            category: categoryName,
            tamanhos: parsedSizes
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

  // Combine Moblink List with manual database products
  const combinedCatalog: MoblinkRawProduct[] = [...(moblinkList || [])];
  
  // Add manual products that do not exist in moblinkList
  (products || []).forEach(dbProd => {
    if (!dbProd) return;
    const dbId = String(dbProd.id || '');
    const isAlreadyInMoblinkList = (moblinkList || []).some(m => String(m?.id || m?.moblinkId || '') === dbId || (dbProd.moblinkId && String(m?.id || m?.moblinkId || '') === String(dbProd.moblinkId)));
    if (!isAlreadyInMoblinkList) {
      const dbImages = Array.isArray(dbProd.images) ? dbProd.images : [];
      combinedCatalog.push({
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

  // Extrai lista única de Nomes-Base (Modelos Principais) para o filtro inteligente
  const allBaseNames = Array.from(
    new Set(
      (combinedCatalog || []).map(item => {
        const rawName = item.nome || item.name || item.descricao || '';
        return extractBaseNameAndVariant(rawName).baseName;
      }).filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  // Filtering list com busca inteligente por ID, SKU, Nome Completo ou Modelo Principal
  const filteredMoblinkList = (combinedCatalog || []).filter(item => {
    if (!item) return false;
    const rawName = String(item.nome || item.name || item.descricao || '');
    const { baseName: itemBaseName } = extractBaseNameAndVariant(rawName);
    const sku = String(item.sku || '').toLowerCase();
    const id = String(item.id || item.moblinkId || '').toLowerCase();
    const query = String(searchQuery || '').toLowerCase();

    const matchesSearch = rawName.toLowerCase().includes(query) || 
                          sku.includes(query) || 
                          id.includes(query) || 
                          itemBaseName.toLowerCase().includes(query);

    const cat = item.categoria || item.category || 'Outros';
    const matchesCategory = categoryFilter === 'Todos' || cat === categoryFilter;

    const matchesBaseName = !baseNameFilter || itemBaseName.toLowerCase() === baseNameFilter.toLowerCase();

    const isErpItem = Boolean(item.moblinkId || String(item.id || '').startsWith('MOB-') || !item.isManual);
    const matchesSync = syncFilter === 'todos' || (syncFilter === 'erp' && isErpItem) || (syncFilter === 'manual' && !isErpItem);

    return matchesSearch && matchesCategory && matchesBaseName && matchesSync;
  });

  // Categorias oficiais da loja (unificadas com o Firestore/CMS e catálogo)
  const storeCategories = Array.from(
    new Set([
      ...(categories || []).map(c => c?.name).filter(Boolean),
      ...(products || []).map(p => p?.category).filter(Boolean),
      'Sapatos Sociais',
      'Mocassins',
      'Botas',
      'Sapatênis',
      'Sandálias & Chinelos',
      'Cintos & Carteiras',
      'Acessórios',
      'Geral'
    ])
  ).filter((c): c is string => Boolean(c && typeof c === 'string' && c.trim() !== ''));

  const uniqueCategories = Array.from(
    new Set([
      ...storeCategories,
      ...combinedCatalog.map(i => i?.categoria || i?.category || 'Outros')
    ])
  ).filter(Boolean);

  // Estrutura Agrupada por Modelo (Nome-Base) para exibição de variações de cores lado a lado
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

    const existingDb = getExistingDbProduct(mobId);
    const precoVista = extractPrecoVistaMoblink(item) || Number(item.preco_venda_fracao ?? item.preco_venda ?? item.preco ?? item.price ?? 0);
    const estoqueAtual = extractSaldoLojaMoblink(item);
    const hasEnrichedMedia = Boolean(existingDb && existingDb.images && existingDb.images.length > 0);
    const hasMedia = hasEnrichedMedia || Boolean(item.foto_uri || item.foto_url || item.foto || item.imagem || item.image);

    acc[baseName].items.push({
      item,
      mobId,
      variant,
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

  const groupedList = Object.values(groupedMoblinkMap);
  const isGroupedViewActive = viewMode === 'grouped' || Boolean(baseNameFilter);

  const totalPages = isGroupedViewActive 
    ? Math.max(1, Math.ceil(groupedList.length / PAGE_SIZE))
    : Math.max(1, Math.ceil(filteredMoblinkList.length / PAGE_SIZE));

  const currentPageSafe = Math.min(currentPage, totalPages);

  const paginatedList = filteredMoblinkList.slice((currentPageSafe - 1) * PAGE_SIZE, currentPageSafe * PAGE_SIZE);
  const paginatedGroupedList = groupedList.slice((currentPageSafe - 1) * PAGE_SIZE, currentPageSafe * PAGE_SIZE);

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* HEADER console */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
        theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-100 shadow-xs'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500 fill-amber-500/20" />
            <h2 className="text-lg font-black tracking-tight text-slate-800 dark:text-slate-100">
              Gestão de Produtos &amp; Estoque (MobLink ERP)
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Listagem oficial em tempo real da API do MobLink ERP. Filtre por <strong>modelo principal</strong> para visualizar todas as <strong>cores lado a lado</strong>.
          </p>
        </div>

        <button
          onClick={fetchMoblinkProducts}
          disabled={isLoading}
          className="px-4 py-2.5 bg-slate-900 dark:bg-slate-800 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition-all flex items-center gap-2 cursor-pointer shadow-sm shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          {isLoading ? 'Sincronizando ERP...' : 'Atualizar Estoque ERP'}
        </button>
      </div>

      {fetchError && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
          <span>Servidor remoto em fallback local. Exibindo catálogo ativo do MobLink ERP.</span>
        </div>
      )}

      {/* SEARCH AND FILTERS */}
      <div className={`p-4 rounded-xl border flex flex-col space-y-3 ${
        theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-100'
      }`}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* SEARCH INPUT */}
          <div className="relative w-full md:max-w-md">
            <input
              type="text"
              placeholder="Buscar por Modelo (ex: Sound Kids), ID MobLink ou SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium text-xs focus:outline-none focus:border-amber-500"
            />
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          </div>

          {/* VIEW MODE TOGGLE BUTTONS */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'list' && !baseNameFilter
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Exibir listagem individual de itens em tabela"
              >
                <List className="h-3.5 w-3.5" />
                <span>Lista Tabela</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('grouped')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'grouped' || baseNameFilter
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Agrupar produtos por modelo principal e exibir cores lado a lado"
              >
                <Grid className="h-3.5 w-3.5" />
                <span>Agrupar Cores</span>
              </button>
            </div>
          </div>
        </div>

        {/* SECUNDARY FILTERS ROW */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          {/* FILTRO POR NOME-BASE (MODELO PRINCIPAL) */}
          <div className="flex items-center space-x-1.5 flex-1 min-w-[240px]">
            <Palette className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Modelo Base:</span>
            <select
              value={baseNameFilter}
              onChange={(e) => setBaseNameFilter(e.target.value)}
              className="w-full p-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-bold focus:outline-none focus:border-amber-500 truncate"
            >
              <option value="">Todos os Modelos Principais ({allBaseNames.length})</option>
              {allBaseNames.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* FILTRO DE ORIGEM DA SINCRONIZAÇÃO */}
            <div className="flex items-center space-x-1.5">
              <Sliders className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase">Origem:</span>
              <select
                value={syncFilter}
                onChange={(e) => setSyncFilter(e.target.value as any)}
                className="p-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-bold focus:outline-none focus:border-amber-500"
              >
                <option value="todos">Todos os Itens ({combinedCatalog.length})</option>
                <option value="erp">Sincronizados MobLink ERP</option>
                <option value="manual">Cadastro Manual</option>
              </select>
            </div>

            {/* FILTRO DE CATEGORIA */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="p-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-bold focus:outline-none focus:border-amber-500"
            >
              <option value="Todos">Todas Categorias ({uniqueCategories.length})</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
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
          /* MODO AGRUPADO POR MODELO (VARIAÇÕES DE CORES LADO A LADO) */
          <div className="p-4 space-y-5">
            {paginatedGroupedList.map((group) => (
              <div 
                key={group.baseName}
                className={`p-5 rounded-2xl border ${
                  theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/50 border-slate-200/80 shadow-xs'
                }`}
              >
                {/* HEADER DO MODELO PRINCIPAL */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b dark:border-slate-800 gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-amber-500" />
                      <h3 className="font-black text-sm text-slate-800 dark:text-slate-100">
                        {group.baseName}
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-full uppercase">
                        {group.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {group.items.length} variação(ões) de cor para este modelo
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-xl">
                      Estoque Total: <strong>{group.totalStock} un</strong>
                    </span>
                  </div>
                </div>

                {/* GRID DE VARIAÇÕES DE COR LADO A LADO */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                  {group.items.map(({ item, mobId, variant, precoVista, estoqueAtual, hasMedia, existingDb }) => (
                    <div 
                      key={mobId}
                      onClick={() => handleOpenEnrichmentForm(item)}
                      className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 cursor-pointer transition-all hover:border-amber-500/50 ${
                        theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200/80 shadow-xs'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* THUMBNAIL DA COR */}
                        <div className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                          {(existingDb?.images?.[0] || item.foto_uri || item.foto_url || item.imagem || item.image) ? (
                            <img 
                              src={existingDb?.images?.[0] || item.foto_uri || item.foto_url || item.imagem || item.image} 
                              alt={variant} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="h-6 w-6 text-slate-400" />
                          )}
                        </div>

                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-black text-xs text-slate-800 dark:text-slate-100 truncate">
                              Cor: <span className="text-amber-600 dark:text-amber-400">{variant}</span>
                            </span>
                            <span className="font-mono text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded border border-slate-200 dark:border-slate-700">
                              {mobId}
                            </span>
                          </div>

                          <p className="text-[10px] text-slate-400 font-mono truncate">
                            SKU: {item.sku || mobId}
                          </p>

                          <div className="flex items-center gap-2 pt-1">
                            <span className="font-bold text-xs text-slate-900 dark:text-amber-400">
                              R$ {precoVista.toFixed(2).replace('.', ',')}
                            </span>
                            
                            {estoqueAtual > 0 ? (
                              <span className="font-mono font-bold text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                                {estoqueAtual} un
                              </span>
                            ) : (
                              <span className="font-mono font-bold text-[10px] text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20">
                                Esgotado
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* BOTÕES DE AÇÃO */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
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

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEnrichmentForm(item);
                            }}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-md text-[10px] flex items-center gap-1 cursor-pointer transition-all"
                            title="Editar esta cor"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>Editar Cor</span>
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
                            className="p-1 text-rose-500 hover:bg-rose-500/10 rounded border border-rose-500/20 text-[10px] cursor-pointer"
                            title="Excluir variação"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
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

                    return (
                      <tr 
                        key={mobId}
                        onClick={() => handleOpenEnrichmentForm(item)}
                        className="hover:bg-amber-500/5 dark:hover:bg-slate-800/40 transition-all cursor-pointer group"
                      >
                        {/* ID MOBLINK PRIMARY KEY */}
                        <td className="p-4">
                          <span className="font-mono font-black text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-amber-400 rounded-lg border border-slate-200 dark:border-slate-700">
                            {mobId}
                          </span>
                        </td>

                        {/* PRODUCT NAME, SKU & CATEGORY */}
                        <td className="p-4">
                          <p className="font-bold text-slate-800 dark:text-slate-100 text-xs group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            {item.nome || item.name || item.descricao}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-400 font-mono">SKU: {item.sku || mobId}</span>
                            <span className="text-[9px] px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded uppercase font-bold">
                              {item.categoria || item.category || 'Geral'}
                            </span>
                          </div>
                        </td>

                        {/* INDICADOR VISUAL DE SINCRONIZAÇÃO */}
                        <td className="p-4">
                          {hasEnrichedMedia ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" title="Preço e estoque sincronizados via ERP com mídias salvas pelo lojista">
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                              Sincronizado MobLink + Lojista
                            </span>
                          ) : isErpSynced ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20" title="Dados direto da API oficial MobLink ERP">
                              <Zap className="h-3.5 w-3.5 text-amber-500" />
                              Sincronizado MobLink
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              <Edit3 className="h-3.5 w-3.5 text-blue-500" />
                              Cadastro Manual
                            </span>
                          )}
                        </td>

                        {/* PREÇO À VISTA */}
                        <td className="p-4 font-bold text-xs text-slate-900 dark:text-amber-400">
                          R$ {precoVista.toFixed(2).replace('.', ',')}
                        </td>

                        {/* ESTOQUE ATUAL (saldo_loja >= 0) */}
                        <td className="p-4">
                          {estoqueAtual > 0 ? (
                            <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              {estoqueAtual} un
                            </span>
                          ) : (
                            <span className="font-mono font-bold text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                              Esgotado (0)
                            </span>
                          )}
                        </td>

                        {/* MEDIA STATUS BADGE */}
                        <td className="p-4">
                          {hasMedia ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                              Com Fotos ({existingDb?.images?.length || 1})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <AlertCircle className="h-3 w-3 text-amber-500" />
                              Pendente de Fotos
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
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
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
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-amber-500 text-slate-950 text-xs font-black font-mono">
                    ID Ref: {selectedProduct.id || selectedProduct.moblinkId}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Dados do MobLink ERP</span>
                </div>
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
                  {selectedProduct.nome || selectedProduct.name}
                </h3>
              </div>

              <button
                type="button"
                onClick={handleCloseEnrichmentForm}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* READ-ONLY MOB LINK PARAMETERS SUMMARY */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Preço à Vista</span>
                <span className="font-bold text-primary dark:text-amber-400">R$ {(extractPrecoVistaMoblink(selectedProduct) || selectedProduct.preco_venda || selectedProduct.preco || selectedProduct.price || 0).toFixed(2).replace('.', ',')}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Estoque ERP</span>
                <span className="font-bold font-mono">{extractSaldoLojaMoblink(selectedProduct)} unidades</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">SKU</span>
                <span className="font-bold font-mono">{selectedProduct.sku || selectedProduct.id}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Categoria</span>
                <span className="font-bold">{selectedProduct.categoria || selectedProduct.category || 'Geral'}</span>
              </div>
            </div>

            <form onSubmit={handleSaveProductEnrichment} className="space-y-6">
              
              {/* SECTION 1: MAIN PRODUCT DETAILS */}
              <div className="space-y-4 border-b pb-5 dark:border-slate-800">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-amber-500" />
                  1. Informações Cadastrais &amp; Estoque da Loja
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* NOME DO PRODUTO */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                      Nome do Calçado / Produto
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Ex: Sapato Social Oxford Couro Legítimo..."
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* SKU / CÓDIGO */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                      SKU / Código do Produto
                    </label>
                    <input
                      type="text"
                      value={editSku}
                      onChange={(e) => setEditSku(e.target.value)}
                      placeholder="Ex: SAP-OXF-41"
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-mono font-semibold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* CATEGORIA DO E-COMMERCE (VINCULADO ÀS CATEGORIAS DA LOJA) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-between">
                      <span>Categoria do E-commerce</span>
                      <span className="text-[10px] text-amber-500 font-extrabold">Categorias da Loja</span>
                    </label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      {Array.from(new Set([editCategory, ...storeCategories])).filter(Boolean).map((catName) => (
                        <option key={catName} value={catName}>
                          {catName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* PREÇO À VISTA */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                      Preço à Vista / Venda (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      placeholder="299,90"
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-amber-400 text-xs font-mono font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* PREÇO DE TABELA / ORIGINAL */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                      Preço Original de Tabela R$ (Opcional - Promoção)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editOriginalPrice}
                      onChange={(e) => setEditOriginalPrice(e.target.value)}
                      placeholder="Ex: 389,90 (deixa preço de corte 'De R$ 389 por R$ 299')"
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-mono font-semibold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* ESTOQUE EM LOJA */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                      Estoque Atual (Unidades)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editStock}
                      onChange={(e) => setEditStock(e.target.value)}
                      placeholder="Ex: 15"
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-emerald-400 text-xs font-mono font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* GRADE DE TAMANHOS */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                      Grade de Tamanhos (Separados por Vírgula)
                    </label>
                    <input
                      type="text"
                      value={editSizes}
                      onChange={(e) => setEditSizes(e.target.value)}
                      placeholder="Ex: 37, 38, 39, 40, 41, 42, 43"
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-mono font-semibold focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* TOGGLE VISIBILIDADE */}
                <div className="pt-2">
                  <label className="inline-flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editVisible}
                      onChange={(e) => setEditVisible(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 border-slate-300 focus:ring-amber-500"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Exibir produto visível nas vitrines da loja virtual
                    </span>
                  </label>
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

                {/* IMAGES THUMBNAILS GRID */}
                {images.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 pt-2">
                    {images.map((imgUrl, idx) => (
                      <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 aspect-square">
                        <img src={imgUrl} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                        {idx === 0 && (
                          <span className="absolute top-1 left-1 bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded shadow-xs">
                            Capa
                          </span>
                        )}
                        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
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
                    ))}
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
    </div>
  );
};

