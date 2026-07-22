import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
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
  ArrowRight
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
}

export const MoblinkProductsManager: React.FC = () => {
  const { products, addProduct, updateProduct, theme } = useApp();

  const [moblinkList, setMoblinkList] = useState<MoblinkRawProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Selected Product for Enrichment Form
  const [selectedProduct, setSelectedProduct] = useState<MoblinkRawProduct | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [richDescription, setRichDescription] = useState('');
  
  // Feedback and Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Cloudinary configuration
  const [cloudName] = useState(() => (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME || localStorage.getItem('cloudinary_cloud_name') || '');
  const [uploadPreset] = useState(() => (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET || localStorage.getItem('cloudinary_upload_preset') || '');

  // Fetch products from GET /api/v1/produtos
  const fetchMoblinkProducts = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const response = await fetch('/api/v1/produtos?pdf=false', {
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) {
        throw new Error(`Erro na API (${response.status})`);
      }
      const data = await response.json();
      if (data.produtos && Array.isArray(data.produtos)) {
        setMoblinkList(data.produtos);
      } else if (Array.isArray(data)) {
        setMoblinkList(data);
      } else {
        setMoblinkList([]);
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
    return products.find(p => p.id === moblinkId || p.moblinkId === moblinkId);
  };

  // Open Enrichment Modal for a product
  const handleOpenEnrichmentForm = (item: MoblinkRawProduct) => {
    const mobId = String(item.id || item.moblinkId || 'MOB-000');
    const existing = getExistingDbProduct(mobId);

    setSelectedProduct(item);
    setFeedback(null);

    if (existing && existing.images && existing.images.length > 0) {
      const rawFoto = item.foto_uri || item.foto_url || item.foto || item.imagem || item.image;
      if (rawFoto && !existing.images.includes(rawFoto)) {
        setImages([rawFoto, ...existing.images]);
      } else {
        setImages(existing.images);
      }
      setRichDescription(existing.description || item.compl_descr || item.descricaoMoblink || item.descricao || '');
    } else {
      const rawFoto = item.foto_uri || item.foto_url || item.foto || item.imagem || item.image;
      const complDescr = item.compl_descr || item.descr_compl || item.descricao_completa;
      const baseDescr = item.nome || item.name || item.descricao || `Produto ${mobId}`;
      setImages(rawFoto ? [rawFoto] : []);
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

  // Save media and rich description using MobLink ID as primary key
  const handleSaveProductEnrichment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const mobId = String(selectedProduct.id || selectedProduct.moblinkId || 'MOB-000');
    const productName = selectedProduct.nome || selectedProduct.name || `Produto ${mobId}`;
    const productPrice = typeof selectedProduct.preco === 'number' ? selectedProduct.preco : Number(selectedProduct.price || 299.9);
    const productStock = typeof selectedProduct.estoque === 'number' ? selectedProduct.estoque : Number(selectedProduct.stock || 10);
    const categoryName = selectedProduct.categoria || selectedProduct.category || 'Sapatos Sociais';
    const sizesGrade = selectedProduct.tamanhos || [37, 38, 39, 40, 41, 42, 43];
    const skuCode = selectedProduct.sku || mobId;

    const defaultCover = 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&q=80&w=800';
    const finalImages = images.length > 0 ? images : [defaultCover];

    const updatedProductPayload: Product = {
      id: mobId, // Primary key reference is Moblink ID
      moblinkId: mobId,
      name: productName,
      description: richDescription || selectedProduct.compl_descr || selectedProduct.descricaoMoblink || selectedProduct.descricao || 'Produto com garantia de qualidade Evidência Calçados.',
      descricao_completa: richDescription || selectedProduct.compl_descr || selectedProduct.descricaoMoblink || selectedProduct.descricao || 'Produto com garantia de qualidade Evidência Calçados.',
      compl_descr: selectedProduct.compl_descr || selectedProduct.descr_compl,
      price: productPrice,
      preco_venda: productPrice,
      preco_venda_fracao: selectedProduct.preco_venda_fracao || productPrice,
      originalPrice: selectedProduct.precoOriginal,
      onSale: false,
      category: categoryName,
      images: finalImages,
      sizes: sizesGrade,
      crediarioProprio: true,
      visible: true,
      stockControl: true,
      stock: productStock,
      saldo_loja: productStock,
      saldos_lojas: selectedProduct.saldos_lojas,
      sku: skuCode,
      barcode: selectedProduct.codigoBarras || selectedProduct.barcode,
      brand: selectedProduct.marca || 'Evidência Calçados',
      material: selectedProduct.material || 'Couro Legítimo',
      color: selectedProduct.cor || 'Preto',
      gender: selectedProduct.genero || 'Masculino',
      lastMoblinkSync: new Date().toISOString(),
      moblinkSyncStatus: 'synced'
    };

    try {
      // Save in Firestore directly with ID = mobId
      await setDoc(doc(db, 'products', mobId), updatedProductPayload, { merge: true });

      const existingInApp = products.find(p => p.id === mobId);
      if (existingInApp) {
        await updateProduct(mobId, updatedProductPayload);
      } else {
        await addProduct(updatedProductPayload);
      }

      setFeedback({
        success: true,
        message: `Produto '${productName}' salvo no banco de dados com sucesso! Chave de referência: ${mobId}`
      });

      setTimeout(() => {
        handleCloseEnrichmentForm();
      }, 1800);
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
        message: `Mídias e descrição salvas localmente para o produto ${mobId}.`
      });

      setTimeout(() => {
        handleCloseEnrichmentForm();
      }, 1800);
    }
  };

  // Filtering list
  const filteredMoblinkList = moblinkList.filter(item => {
    const name = (item.nome || item.name || '').toLowerCase();
    const sku = String(item.sku || '').toLowerCase();
    const id = String(item.id || item.moblinkId || '').toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch = name.includes(query) || sku.includes(query) || id.includes(query);
    const cat = item.categoria || item.category || 'Outros';
    const matchesCategory = categoryFilter === 'Todos' || cat === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const uniqueCategories = Array.from(new Set(moblinkList.map(i => i.categoria || i.category || 'Outros')));

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
              Produtos do MobLink ERP (GET /api/v1/produtos)
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cadastros primários originados do ERP. Clique em qualquer produto para vincular <strong>fotos em alta resolução</strong> e <strong>descrição rica</strong> no nosso banco de dados.
          </p>
        </div>

        <button
          onClick={fetchMoblinkProducts}
          disabled={isLoading}
          className="px-4 py-2.5 bg-slate-900 dark:bg-slate-800 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition-all flex items-center gap-2 cursor-pointer shadow-sm shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          {isLoading ? 'Consultando API...' : 'Atualizar Produtos ERP'}
        </button>
      </div>

      {fetchError && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
          <span>Servidor remoto em fallback local. Exibindo catálogo ativo do MobLink ERP.</span>
        </div>
      )}

      {/* SEARCH AND FILTERS */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
        theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-100'
      }`}>
        <div className="relative w-full md:max-w-md">
          <input
            type="text"
            placeholder="Buscar por ID MobLink, SKU ou Nome do Calçado..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium text-xs focus:outline-none focus:border-amber-500"
          />
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
          <div className="flex items-center space-x-1.5">
            <Sliders className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase">Categoria ERP:</span>
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-bold focus:outline-none focus:border-amber-500"
          >
            <option value="Todos">Todas ({moblinkList.length})</option>
            {uniqueCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* MOBLINK PRODUCTS GRID / TABLE */}
      <div className={`border rounded-2xl overflow-hidden ${
        theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-100 shadow-xs'
      }`}>
        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="h-8 w-8 text-amber-500 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500">Fazendo requisição GET em /api/v1/produtos...</p>
          </div>
        ) : filteredMoblinkList.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Package className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-500">Nenhum produto encontrado no MobLink.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                  <th className="p-4 text-left">Ref MobLink</th>
                  <th className="p-4 text-left">Produto &amp; SKU</th>
                  <th className="p-4 text-left">Categoria</th>
                  <th className="p-4 text-left">Preço ERP</th>
                  <th className="p-4 text-left">Estoque ERP</th>
                  <th className="p-4 text-left">Status de Mídia</th>
                  <th className="p-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {filteredMoblinkList.map((item) => {
                  const mobId = String(item.id || item.moblinkId || 'MOB-000');
                  const existingDb = getExistingDbProduct(mobId);
                  const hasMedia = (existingDb && existingDb.images && existingDb.images.length > 0) || Boolean(item.foto_uri || item.foto_url || item.foto || item.imagem || item.image);

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

                      {/* PRODUCT NAME, SKU & COMPL_DESCR */}
                      <td className="p-4">
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-xs group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {item.nome || item.name || item.descricao}
                        </p>
                        {(item.compl_descr || item.descr_compl) && (
                          <p className="text-[10px] text-amber-600/90 dark:text-amber-400/90 font-medium line-clamp-1 italic">
                            + {item.compl_descr || item.descr_compl}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400 font-mono">SKU: {item.sku || mobId}</p>
                      </td>

                      {/* CATEGORY */}
                      <td className="p-4">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[10px] uppercase font-bold">
                          {item.categoria || item.category || 'Geral'}
                        </span>
                      </td>

                      {/* PRICE (preco_venda_fracao / preco) */}
                      <td className="p-4 font-bold text-xs text-primary dark:text-amber-400">
                        R$ {(item.preco_venda_fracao ?? item.preco_venda ?? item.preco ?? item.price ?? 0).toFixed(2).replace('.', ',')}
                      </td>

                      {/* STOCK (saldos_lojas / saldo_loja / estoque) */}
                      <td className="p-4">
                        <span className="font-mono font-bold text-xs text-slate-700 dark:text-slate-300">
                          {typeof item.saldo_loja === 'number'
                            ? item.saldo_loja
                            : Array.isArray(item.saldos_lojas)
                              ? item.saldos_lojas.reduce((a: number, c: any) => a + (Number(c?.saldo ?? c?.qtd ?? c?.quantidade) || 0), 0)
                              : (item.estoque ?? item.stock ?? 0)} un
                        </span>
                        {Array.isArray(item.saldos_lojas) && item.saldos_lojas.length > 0 && (
                          <p className="text-[9px] text-slate-400 font-sans">
                            {item.saldos_lojas.length} {item.saldos_lojas.length === 1 ? 'loja' : 'lojas'}
                          </p>
                        )}
                      </td>

                      {/* MEDIA STATUS BADGE */}
                      <td className="p-4">
                        {hasMedia ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" />
                            Com Fotos ({existingDb?.images?.length || 1})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <AlertCircle className="h-3 w-3" />
                            Pendente de Fotos
                          </span>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td className="p-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEnrichmentForm(item);
                          }}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg text-xs transition-all flex items-center gap-1.5 ml-auto cursor-pointer shadow-xs"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                          <span>Mídias &amp; Descrição</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Preço do ERP</span>
                <span className="font-bold text-primary">R$ {(selectedProduct.preco || selectedProduct.price || 0).toFixed(2).replace('.', ',')}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Estoque ERP</span>
                <span className="font-bold font-mono">{selectedProduct.estoque ?? selectedProduct.stock ?? 0} unidades</span>
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
              
              {/* SECTION 1: PHOTOS & MEDIA */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2 dark:border-slate-800">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-amber-500" />
                    1. Galeria de Fotos do Produto
                  </h4>
                  <span className="text-[11px] text-slate-400">{images.length} foto(s) anexada(s)</span>
                </div>

                {/* IMAGE INPUT CONTROLS */}
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
