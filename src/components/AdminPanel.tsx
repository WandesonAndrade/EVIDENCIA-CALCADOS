import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Product, Order, OrderStatus, UserProfile, Category, HeroBanner, HomeSectionConfig, AboutConfig, ContactConfig } from '../types';
import { MoblinkIntegrationPanel } from './MoblinkIntegrationPanel';
import { MoblinkProductsManager } from './MoblinkProductsManager';
import { storage, db } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, doc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { 
  Package, DollarSign, Users, RefreshCw, Plus, 
  Trash2, Edit, Save, ToggleLeft, ToggleRight, 
  Upload, Check, AlertCircle, ShoppingBag, Eye,
  BarChart, Layers, MessageSquare, Search, Filter, 
  Settings, ArrowLeft, UserCheck, EyeOff, ChevronRight, 
  Info, Sliders, Zap, Barcode, Image, ArrowUp, ArrowDown,
  BookOpen, PhoneCall, Globe, CheckCircle2, Sparkles, Layout, HelpCircle
} from 'lucide-react';

type AdminTab = 
  | 'overview' 
  | 'inventory' 
  | 'sales' 
  | 'customers' 
  | 'new-product' 
  | 'categories' 
  | 'moblink' 
  | 'banners' 
  | 'home-sections' 
  | 'about-editor' 
  | 'support-contact' 
  | 'settings';

export const AdminPanel: React.FC = () => {
  const { 
    products, 
    orders, 
    currentUser, 
    setCurrentView,
    addProduct,
    deleteProduct,
    updateProduct,
    updateOrderStatus,
    assignOrderSeller,
    theme,
    toggleTheme,
    categories,
    addCategory,
    deleteCategory,
    updateCategory,
    heroBanners,
    updateHeroBanners,
    homeSections,
    updateHomeSections,
    aboutConfig,
    updateAboutConfig,
    contactConfig,
    updateContactConfig,
    restoreDefaultConfig
  } = useApp();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);

  // Category management Form States
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryFeedback, setCategoryFeedback] = useState('');
  
  // New Product Form States
  const [newProdName, setNewProdName] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdOriginalPrice, setNewProdOriginalPrice] = useState('');
  const [newProdOnSale, setNewProdOnSale] = useState(false);
  const [newProdCategory, setNewProdCategory] = useState('Sapatos Sociais');
  const [newProdProductType, setNewProdProductType] = useState<'calçados' | 'roupas' | 'acessórios' | 'perfumes' | 'eletrônicos' | 'geral'>('calçados');
  const [newProdSizes, setNewProdSizes] = useState<(number | string)[]>([35, 36, 37, 38, 39, 40]);
  const [customSizeInput, setCustomSizeInput] = useState('');
  
  // Dynamic Product Attributes
  const [newProdBrand, setNewProdBrand] = useState('');
  const [newProdGender, setNewProdGender] = useState('');
  const [newProdMaterial, setNewProdMaterial] = useState('');
  const [newProdColor, setNewProdColor] = useState('');
  const [newProdModelOrSku, setNewProdModelOrSku] = useState('');
  const [newProdWarrantyOrVolume, setNewProdWarrantyOrVolume] = useState('');
  const [newProdCustomAttrs, setNewProdCustomAttrs] = useState<{ label: string; value: string }[]>([]);

  const [newProdImages, setNewProdImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newProdCrediario, setNewProdCrediario] = useState(true);
  const [newProdVisible, setNewProdVisible] = useState(true);
  const [newProdStockControl, setNewProdStockControl] = useState(true);
  const [newProdStock, setNewProdStock] = useState('10');
  
  // Cloudinary States
  const [cloudinaryCloudName, setCloudinaryCloudName] = useState(
    (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME || localStorage.getItem('cloudinary_cloud_name') || ''
  );
  const [cloudinaryUploadPreset, setCloudinaryUploadPreset] = useState(
    (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET || localStorage.getItem('cloudinary_upload_preset') || ''
  );

  // CMS 1: Hero Banners State & Form
  const [editingBanner, setEditingBanner] = useState<HeroBanner | null>(null);
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [bannerBadge, setBannerBadge] = useState('');
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerDesc, setBannerDesc] = useState('');
  const [bannerImage, setBannerImage] = useState('');
  const [bannerBtnText, setBannerBtnText] = useState('');
  const [bannerTabKey, setBannerTabKey] = useState('lançamentos');
  const [bannerActive, setBannerActive] = useState(true);
  const [cmsFeedback, setCmsFeedback] = useState('');

  // CMS 2: About Us State & Form
  const [aboutTitle, setAboutTitle] = useState(aboutConfig?.title || '');
  const [aboutSubtitle, setAboutSubtitle] = useState(aboutConfig?.subtitle || '');
  const [aboutDescription, setAboutDescription] = useState(aboutConfig?.description || '');
  const [aboutImage, setAboutImage] = useState(aboutConfig?.highlightImage || '');
  const [aboutBadge, setAboutBadge] = useState(aboutConfig?.badgeText || '');

  // CMS 3: Contact & Support State & Form
  const [contactWhatsApp, setContactWhatsApp] = useState(contactConfig?.whatsapp || '5599984684867');
  const [contactEmail, setContactEmail] = useState(contactConfig?.email || 'contato@evidencia.com.br');
  const [contactAddress, setContactAddress] = useState(contactConfig?.address || 'Rua Afonso Pena, 295 - Centro, Caxias - MA');
  const [contactHours, setContactHours] = useState(contactConfig?.hours || 'Segunda a Sexta: 08:00 às 18:00 | Sábado: 08:00 às 13:00');
  const [promoText, setPromoText] = useState(contactConfig?.promoBannerText || 'Frete grátis para todo Brasil em compras acima de R$ 350!');
  const [isPromoActive, setIsPromoActive] = useState(contactConfig?.isPromoBannerActive ?? true);

  // Sync state when props update
  useEffect(() => {
    if (aboutConfig) {
      setAboutTitle(aboutConfig.title);
      setAboutSubtitle(aboutConfig.subtitle);
      setAboutDescription(aboutConfig.description);
      setAboutImage(aboutConfig.highlightImage);
      setAboutBadge(aboutConfig.badgeText);
    }
  }, [aboutConfig]);

  useEffect(() => {
    if (contactConfig) {
      setContactWhatsApp(contactConfig.whatsapp);
      setContactEmail(contactConfig.email);
      setContactAddress(contactConfig.address);
      setContactHours(contactConfig.hours);
      setPromoText(contactConfig.promoBannerText);
      setIsPromoActive(contactConfig.isPromoBannerActive);
    }
  }, [contactConfig]);

  // Upload & Feedback States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState('');
  const [formFeedback, setFormFeedback] = useState('');

  // Catalog Filters States
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('Todos');
  const [catalogVisibilityFilter, setCatalogVisibilityFilter] = useState('Todos');

  // Orders Filters States
  const [ordersSearch, setOrdersSearch] = useState('');
  const [ordersStatusFilter, setOrdersStatusFilter] = useState<'Todos' | OrderStatus>('Todos');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Users Management States
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersSearch, setUsersSearch] = useState('');

  // Inline Quick Stock edit variables
  const [inlineStockValue, setInlineStockValue] = useState<{ [key: string]: number }>({});

  const isDark = theme === 'dark';

  // --- CMS 1: BANNER ACTIONS ---
  const handleOpenAddBanner = () => {
    setEditingBanner(null);
    setBannerBadge('NOVA COLEÇÃO 2026');
    setBannerTitle('');
    setBannerDesc('');
    setBannerImage('');
    setBannerBtnText('Ver Lançamentos');
    setBannerTabKey('lançamentos');
    setBannerActive(true);
    setIsBannerModalOpen(true);
  };

  const handleOpenEditBanner = (b: HeroBanner) => {
    setEditingBanner(b);
    setBannerBadge(b.badge);
    setBannerTitle(b.title);
    setBannerDesc(b.description);
    setBannerImage(b.image);
    setBannerBtnText(b.buttonText);
    setBannerTabKey(b.tabKey);
    setBannerActive(b.active);
    setIsBannerModalOpen(true);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerTitle || !bannerImage) {
      setCmsFeedback('Por favor, preencha o Título e a URL da Imagem do Banner.');
      return;
    }

    let updatedBanners = [...(heroBanners || [])];
    if (editingBanner) {
      updatedBanners = updatedBanners.map(b => 
        b.id === editingBanner.id 
          ? { ...b, badge: bannerBadge, title: bannerTitle, description: bannerDesc, image: bannerImage, buttonText: bannerBtnText, tabKey: bannerTabKey, active: bannerActive } 
          : b
      );
    } else {
      const newB: HeroBanner = {
        id: `banner-${Date.now()}`,
        badge: bannerBadge || 'DESTAQUE',
        title: bannerTitle,
        description: bannerDesc,
        image: bannerImage,
        buttonText: bannerBtnText || 'Explorar Coleção',
        tabKey: bannerTabKey || 'lançamentos',
        active: bannerActive
      };
      updatedBanners.push(newB);
    }

    await updateHeroBanners(updatedBanners);
    setIsBannerModalOpen(false);
    setCmsFeedback('Banner salvo com sucesso!');
    setTimeout(() => setCmsFeedback(''), 3000);
  };

  const handleDeleteBanner = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este banner?')) return;
    const updated = (heroBanners || []).filter(b => b.id !== id);
    await updateHeroBanners(updated);
    setCmsFeedback('Banner removido.');
    setTimeout(() => setCmsFeedback(''), 3000);
  };

  const handleToggleBannerActive = async (id: string) => {
    const updated = (heroBanners || []).map(b => b.id === id ? { ...b, active: !b.active } : b);
    await updateHeroBanners(updated);
  };

  const handleMoveBanner = async (index: number, direction: 'up' | 'down') => {
    const list = [...(heroBanners || [])];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    await updateHeroBanners(list);
  };

  // --- CMS 2: HOME SECTIONS REORDERING ---
  const handleMoveSection = async (index: number, direction: 'up' | 'down') => {
    const list = [...(homeSections || [])];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    await updateHomeSections(list);
    setCmsFeedback('Ordem das seções atualizada em tempo real na Home!');
    setTimeout(() => setCmsFeedback(''), 3000);
  };

  const handleToggleSectionEnabled = async (id: string) => {
    const list = (homeSections || []).map(s => s.id === id ? { ...s, enabled: !s.enabled } : s);
    await updateHomeSections(list);
  };

  // --- CMS 3: ABOUT US SAVE ---
  const handleSaveAbout = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateAboutConfig({
      title: aboutTitle,
      subtitle: aboutSubtitle,
      description: aboutDescription,
      highlightImage: aboutImage,
      badgeText: aboutBadge
    });
    setCmsFeedback('Conteúdo institucional "Sobre Nós" atualizado!');
    setTimeout(() => setCmsFeedback(''), 3000);
  };

  // --- CMS 4: CONTACT SAVE ---
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateContactConfig({
      whatsapp: contactWhatsApp,
      email: contactEmail,
      address: contactAddress,
      hours: contactHours,
      promoBannerText: promoText,
      isPromoBannerActive: isPromoActive
    });
    setCmsFeedback('Informações de contato e suporte salvas com sucesso!');
    setTimeout(() => setCmsFeedback(''), 3000);
  };

  // Cloudinary Upload Handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField?: 'product' | 'banner' | 'about') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadFeedback('Enviando imagem...');

    try {
      const file = files[0];
      if (cloudinaryCloudName && cloudinaryUploadPreset) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', cloudinaryUploadPreset);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`, {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          const url = data.secure_url;
          if (targetField === 'banner') setBannerImage(url);
          else if (targetField === 'about') setAboutImage(url);
          else setNewProdImages(prev => [...prev, url]);

          setUploadFeedback('Imagem enviada com sucesso!');
        } else {
          throw new Error('Falha no upload via Cloudinary');
        }
      } else {
        // Fallback: Storage / Base64 Data URL
        const reader = new FileReader();
        reader.onloadend = () => {
          const url = reader.result as string;
          if (targetField === 'banner') setBannerImage(url);
          else if (targetField === 'about') setAboutImage(url);
          else setNewProdImages(prev => [...prev, url]);
          setUploadFeedback('Imagem carregada com sucesso!');
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      setUploadFeedback(`Erro no envio da imagem: ${err.message}`);
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadFeedback(''), 4000);
    }
  };

  // Calculate Overview Stats
  const totalRevenue = orders.reduce((sum, order) => sum + (order.status !== 'Cancelado' ? order.total : 0), 0);
  const totalProductsCount = products.length;
  const outOfStockCount = products.filter(p => p.stockControl && p.stock === 0).length;

  return (
    <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-300 font-sans ${
      isDark ? 'bg-[#0B0F19] text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>
      
      {/* SIDEBAR NAVIGATION (Modern SaaS CMS Style) */}
      <aside className={`w-full md:w-72 shrink-0 border-r border-b md:border-b-0 backdrop-blur-2xl flex flex-col justify-between z-30 transition-all ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'
      }`}>
        <div className="p-5 space-y-6">
          
          {/* Logo & Store Return Link */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/40">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center font-black text-lg shadow-lg">
                EC
              </div>
              <div>
                <h1 className="text-sm font-black tracking-tight leading-none">EVIDÊNCIA CMS</h1>
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Painel Gestor</span>
              </div>
            </div>

            <button
              onClick={() => setCurrentView('home')}
              className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
              title="Ir para a loja"
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>

          {/* Navigation Groups */}
          <nav className="space-y-6">
            
            {/* GROUP 1: DASHBOARD & OPERAÇÃO */}
            <div className="space-y-1">
              <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase px-3">DASHBOARD & VENDAS</span>
              
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'overview'
                    ? isDark ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30' : 'bg-slate-900 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <BarChart className="h-4 w-4" />
                <span>Visão Geral & Métricas</span>
              </button>

              <button
                onClick={() => setActiveTab('sales')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'sales'
                    ? isDark ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30' : 'bg-slate-900 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <ShoppingBag className="h-4 w-4" />
                  <span>Vendas & Pedidos</span>
                </div>
                {orders.length > 0 && (
                  <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-black">
                    {orders.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('customers')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'customers'
                    ? isDark ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30' : 'bg-slate-900 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Clientes & Crediário</span>
              </button>
            </div>

            {/* GROUP 2: CATÁLOGO DE PRODUTOS */}
            <div className="space-y-1">
              <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase px-3">CATÁLOGO & ESTOQUE</span>
              
              <button
                onClick={() => setActiveTab('inventory')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'inventory'
                    ? isDark ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30' : 'bg-slate-900 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Package className="h-4 w-4" />
                <span>Gestão de Estoque</span>
              </button>

              <button
                onClick={() => setActiveTab('new-product')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'new-product'
                    ? isDark ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30' : 'bg-slate-900 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Plus className="h-4 w-4" />
                <span>Adicionar Produto</span>
              </button>

              <button
                onClick={() => setActiveTab('categories')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'categories'
                    ? isDark ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30' : 'bg-slate-900 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Layers className="h-4 w-4" />
                <span>Categorias da Loja</span>
              </button>

              <button
                onClick={() => setActiveTab('moblink')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'moblink'
                    ? isDark ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30' : 'bg-slate-900 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <span>Integrador MobLink ERP</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </button>
            </div>

            {/* GROUP 3: GESTOR DE CONTEÚDO (CMS DA LOJA) */}
            <div className="space-y-1">
              <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase px-3 flex items-center space-x-1">
                <Sparkles className="h-3 w-3" />
                <span>CMS & VITRINE</span>
              </span>

              <button
                onClick={() => setActiveTab('banners')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'banners'
                    ? isDark ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30' : 'bg-slate-900 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Image className="h-4 w-4" />
                <span>Banners Principais (Hero)</span>
              </button>

              <button
                onClick={() => setActiveTab('home-sections')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'home-sections'
                    ? isDark ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30' : 'bg-slate-900 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Sliders className="h-4 w-4" />
                <span>Ordem das Seções</span>
              </button>

              <button
                onClick={() => setActiveTab('about-editor')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'about-editor'
                    ? isDark ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30' : 'bg-slate-900 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <BookOpen className="h-4 w-4" />
                <span>Editor "Sobre Nós"</span>
              </button>

              <button
                onClick={() => setActiveTab('support-contact')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'support-contact'
                    ? isDark ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30' : 'bg-slate-900 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <PhoneCall className="h-4 w-4" />
                <span>Suporte & Contatos</span>
              </button>
            </div>

            {/* GROUP 4: CONFIGURAÇÕES */}
            <div className="space-y-1">
              <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase px-3">SISTEMA</span>
              
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'settings'
                    ? isDark ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30' : 'bg-slate-900 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Settings className="h-4 w-4" />
                <span>Configurações Gerais</span>
              </button>
            </div>

          </nav>
        </div>

        {/* User Info & Theme Toggle */}
        <div className="p-4 border-t border-slate-800/40 space-y-3">
          {currentUser && (
            <div className="flex items-center space-x-3 px-2">
              <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center text-xs">
                {currentUser.name.charAt(0)}
              </div>
              <div className="flex-1 truncate">
                <p className="text-xs font-bold truncate">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400 capitalize">{currentUser.role}</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
        
        {/* Global CMS Notification Banner */}
        {cmsFeedback && (
          <div className="p-4 rounded-2xl bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-between shadow-lg animate-bounce">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>{cmsFeedback}</span>
            </div>
            <button onClick={() => setCmsFeedback('')} className="text-slate-950 hover:opacity-75">✕</button>
          </div>
        )}

        {/* TAB 1: VISÃO GERAL */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-tight">Visão Geral do E-commerce</h2>
                <p className="text-xs text-slate-400">Resumo de desempenho, inventário e pedidos</p>
              </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className={`p-6 rounded-3xl border backdrop-blur-xl space-y-3 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center justify-between text-amber-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Faturamento Total</span>
                  <DollarSign className="h-5 w-5" />
                </div>
                <p className="text-2xl font-black">R$ {totalRevenue.toFixed(2).replace('.', ',')}</p>
                <p className="text-[11px] text-slate-400">Baseado em {orders.length} pedido(s)</p>
              </div>

              <div className={`p-6 rounded-3xl border backdrop-blur-xl space-y-3 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center justify-between text-emerald-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Total de Produtos</span>
                  <Package className="h-5 w-5" />
                </div>
                <p className="text-2xl font-black">{totalProductsCount}</p>
                <p className="text-[11px] text-slate-400">Cadastrados no catálogo</p>
              </div>

              <div className={`p-6 rounded-3xl border backdrop-blur-xl space-y-3 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center justify-between text-rose-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Fora de Estoque</span>
                  <AlertCircle className="h-5 w-5" />
                </div>
                <p className="text-2xl font-black">{outOfStockCount}</p>
                <p className="text-[11px] text-slate-400">Itens com 0 unidades</p>
              </div>

              <div className={`p-6 rounded-3xl border backdrop-blur-xl space-y-3 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center justify-between text-blue-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Banners Ativos</span>
                  <Image className="h-5 w-5" />
                </div>
                <p className="text-2xl font-black">{(heroBanners || []).filter(b => b.active).length}</p>
                <p className="text-[11px] text-slate-400">Carrossel Hero Principal</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GERENCIADOR DE BANNERS HERO (NEW CMS FEATURE) */}
        {activeTab === 'banners' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight flex items-center space-x-2">
                  <Image className="h-6 w-6 text-amber-400" />
                  <span>Gerenciador de Banners (Hero)</span>
                </h2>
                <p className="text-xs text-slate-400">Adicione, edite, ordene e ative os banners do carrossel principal da home</p>
              </div>

              <button
                onClick={handleOpenAddBanner}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-amber-400 text-slate-950 font-black text-xs hover:bg-amber-300 transition-all shadow-md cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Adicionar Novo Banner</span>
              </button>
            </div>

            {/* List of Banners */}
            <div className="grid grid-cols-1 gap-6">
              {(heroBanners || []).map((banner, index) => (
                <div 
                  key={banner.id}
                  className={`p-6 rounded-3xl border backdrop-blur-xl flex flex-col md:flex-row items-center gap-6 transition-all ${
                    isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  } ${!banner.active ? 'opacity-50 grayscale' : ''}`}
                >
                  {/* Banner Image Preview */}
                  <div className="w-full md:w-64 h-36 rounded-2xl overflow-hidden relative shrink-0 border border-slate-800">
                    <img src={banner.image} alt={banner.title} className="w-full h-full object-cover" />
                    <span className="absolute top-2 left-2 bg-slate-950/80 text-amber-400 text-[10px] font-black px-2.5 py-1 rounded-full border border-amber-400/30">
                      #{index + 1}
                    </span>
                  </div>

                  {/* Banner Info */}
                  <div className="flex-1 space-y-2 text-center md:text-left">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase text-amber-400 bg-amber-400/10 border border-amber-400/30">
                        {banner.badge}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        banner.active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        {banner.active ? 'Ativo na Home' : 'Inativo'}
                      </span>
                    </div>

                    <h3 className="text-lg font-black">{banner.title}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2">{banner.description}</p>
                    
                    <div className="pt-2 text-xs font-semibold text-amber-400 flex items-center space-x-2">
                      <span>CTA: "{banner.buttonText}"</span>
                      <span>•</span>
                      <span>Destino: #{banner.tabKey}</span>
                    </div>
                  </div>

                  {/* Banner Actions */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => handleMoveBanner(index, 'up')}
                      disabled={index === 0}
                      className="p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
                      title="Mover para cima"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleMoveBanner(index, 'down')}
                      disabled={index === (heroBanners || []).length - 1}
                      className="p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
                      title="Mover para baixo"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleToggleBannerActive(banner.id)}
                      className={`p-2.5 rounded-xl border font-bold text-xs cursor-pointer ${
                        banner.active ? 'bg-amber-400/20 text-amber-400 border-amber-400/40' : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                      title={banner.active ? "Desativar" : "Ativar"}
                    >
                      <Eye className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleOpenEditBanner(banner)}
                      className="p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-amber-400 cursor-pointer"
                      title="Editar Banner"
                    >
                      <Edit className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteBanner(banner.id)}
                      className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                      title="Excluir Banner"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add / Edit Banner Modal */}
            {isBannerModalOpen && (
              <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                <div className={`w-full max-w-xl p-6 sm:p-8 rounded-3xl border shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto ${
                  isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <h3 className="text-lg font-black">
                      {editingBanner ? 'Editar Banner Hero' : 'Adicionar Novo Banner Hero'}
                    </h3>
                    <button onClick={() => setIsBannerModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                  </div>

                  <form onSubmit={handleSaveBanner} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-300">Badge Tag (Texto da Etiqueta)</label>
                      <input
                        type="text"
                        value={bannerBadge}
                        onChange={(e) => setBannerBadge(e.target.value)}
                        placeholder="Ex: NOVA COLEÇÃO 2026"
                        className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                          isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-300">Título Principal *</label>
                      <input
                        type="text"
                        value={bannerTitle}
                        onChange={(e) => setBannerTitle(e.target.value)}
                        placeholder="Ex: Elegância que caminha com você."
                        required
                        className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                          isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-300">Subtítulo / Descrição</label>
                      <textarea
                        value={bannerDesc}
                        onChange={(e) => setBannerDesc(e.target.value)}
                        placeholder="Descubra a seleção exclusiva de calçados..."
                        rows={3}
                        className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                          isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-300">URL da Imagem do Banner *</label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={bannerImage}
                          onChange={(e) => setBannerImage(e.target.value)}
                          placeholder="https://images.unsplash.com/..."
                          required
                          className={`flex-1 p-3 rounded-xl text-xs border focus:outline-none ${
                            isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                          }`}
                        />
                        <label className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-amber-400 cursor-pointer hover:bg-slate-700 flex items-center space-x-1">
                          <Upload className="h-4 w-4" />
                          <span>Upload</span>
                          <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'banner')} className="hidden" />
                        </label>
                      </div>
                      {bannerImage && (
                        <div className="mt-2 h-28 rounded-xl overflow-hidden border border-slate-800">
                          <img src={bannerImage} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold mb-1 text-slate-300">Texto do Botão (CTA)</label>
                        <input
                          type="text"
                          value={bannerBtnText}
                          onChange={(e) => setBannerBtnText(e.target.value)}
                          placeholder="Ex: Ver Lançamentos"
                          className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                            isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1 text-slate-300">Link / Aba de Destino</label>
                        <select
                          value={bannerTabKey}
                          onChange={(e) => setBannerTabKey(e.target.value)}
                          className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                            isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                          }`}
                        >
                          <option value="lançamentos">Lançamentos</option>
                          <option value="feminino">Feminino</option>
                          <option value="masculino">Masculino</option>
                          <option value="ofertas">Ofertas</option>
                          <option value="sapatos-sociais">Sapatos Sociais</option>
                          <option value="botas">Botas</option>
                          <option value="acessorios">Acessórios</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                      <input
                        type="checkbox"
                        id="bannerActive"
                        checked={bannerActive}
                        onChange={(e) => setBannerActive(e.target.checked)}
                        className="rounded accent-amber-400 w-4 h-4"
                      />
                      <label htmlFor="bannerActive" className="text-xs font-bold text-slate-300">
                        Banner Ativo na Vitrine Principal
                      </label>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setIsBannerModalOpen(false)}
                        className="px-5 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs hover:bg-amber-300 transition-all shadow-md cursor-pointer"
                      >
                        Salvar Banner
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ORDENAÇÃO DE SEÇÕES DA HOME (NEW CMS FEATURE) */}
        {activeTab === 'home-sections' && (
          <div className="space-y-6 max-w-4xl">
            <div>
              <h2 className="text-2xl font-black tracking-tight flex items-center space-x-2">
                <Sliders className="h-6 w-6 text-amber-400" />
                <span>Ordenação de Seções da Página Inicial</span>
              </h2>
              <p className="text-xs text-slate-400">Altere a ordem de exibição e ative/desative seções da loja dinamicamente com os botões de setas</p>
            </div>

            <div className="space-y-4">
              {(homeSections || []).map((sec, index) => (
                <div
                  key={sec.id}
                  className={`p-5 rounded-2xl border backdrop-blur-xl flex items-center justify-between transition-all ${
                    isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                  } ${!sec.enabled ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center space-x-4">
                    <span className="w-8 h-8 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/30 flex items-center justify-center font-black text-xs">
                      #{index + 1}
                    </span>
                    <div>
                      <h3 className="text-sm font-black">{sec.name}</h3>
                      <p className="text-xs text-slate-400">{sec.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleMoveSection(index, 'up')}
                      disabled={index === 0}
                      className="p-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
                      title="Mover para cima"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleMoveSection(index, 'down')}
                      disabled={index === (homeSections || []).length - 1}
                      className="p-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
                      title="Mover para baixo"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>

                    <label className="flex items-center space-x-2 cursor-pointer border border-slate-700 px-3 py-1.5 rounded-xl bg-slate-800">
                      <input
                        type="checkbox"
                        checked={sec.enabled}
                        onChange={() => handleToggleSectionEnabled(sec.id)}
                        className="rounded accent-amber-400 w-4 h-4"
                      />
                      <span className="text-xs font-bold text-slate-300">
                        {sec.enabled ? 'Exibido' : 'Oculto'}
                      </span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: EDITOR "SOBRE NÓS" (NEW CMS FEATURE) */}
        {activeTab === 'about-editor' && (
          <div className="space-y-6 max-w-4xl">
            <div>
              <h2 className="text-2xl font-black tracking-tight flex items-center space-x-2">
                <BookOpen className="h-6 w-6 text-amber-400" />
                <span>Editor da Seção "Sobre Nós"</span>
              </h2>
              <p className="text-xs text-slate-400">Atualize os textos, imagens e dados institucionais da marca Evidência Calçados</p>
            </div>

            <form onSubmit={handleSaveAbout} className={`p-6 sm:p-8 rounded-3xl border backdrop-blur-xl space-y-6 ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-300">Etiqueta Badge</label>
                  <input
                    type="text"
                    value={aboutBadge}
                    onChange={(e) => setAboutBadge(e.target.value)}
                    placeholder="Ex: TRADIÇÃO & EXCELÊNCIA"
                    className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-300">Título Institucional</label>
                  <input
                    type="text"
                    value={aboutTitle}
                    onChange={(e) => setAboutTitle(e.target.value)}
                    placeholder="Ex: Evidência Calçados"
                    className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-300">Subtítulo / Slogan</label>
                <input
                  type="text"
                  value={aboutSubtitle}
                  onChange={(e) => setAboutSubtitle(e.target.value)}
                  placeholder="Ex: Tradição, Qualidade e Estilo nos Seus Pés"
                  className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-300">Texto Descritivo Completo</label>
                <textarea
                  value={aboutDescription}
                  onChange={(e) => setAboutDescription(e.target.value)}
                  rows={6}
                  placeholder="Escreva a história da empresa..."
                  className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-300">URL da Imagem de Destaque</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={aboutImage}
                    onChange={(e) => setAboutImage(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className={`flex-1 p-3 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                    }`}
                  />
                  <label className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-amber-400 cursor-pointer hover:bg-slate-700 flex items-center space-x-1">
                    <Upload className="h-4 w-4" />
                    <span>Upload</span>
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'about')} className="hidden" />
                  </label>
                </div>
                {aboutImage && (
                  <div className="mt-2 h-36 rounded-xl overflow-hidden border border-slate-800 max-w-sm">
                    <img src={aboutImage} alt="About Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  className="px-7 py-3 rounded-xl bg-amber-400 text-slate-950 font-black text-xs hover:bg-amber-300 transition-all shadow-md cursor-pointer flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>Salvar Conteúdo Institucional</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 5: SUPORTE E CONTATO (NEW CMS FEATURE) */}
        {activeTab === 'support-contact' && (
          <div className="space-y-6 max-w-4xl">
            <div>
              <h2 className="text-2xl font-black tracking-tight flex items-center space-x-2">
                <PhoneCall className="h-6 w-6 text-amber-400" />
                <span>Suporte, Contatos & Barra Promocional</span>
              </h2>
              <p className="text-xs text-slate-400">Gerencie o WhatsApp de atendimento, e-mail, endereço físico e mensagem promocional do topo</p>
            </div>

            <form onSubmit={handleSaveContact} className={`p-6 sm:p-8 rounded-3xl border backdrop-blur-xl space-y-6 ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-300">Número do WhatsApp (com DDD)</label>
                  <input
                    type="text"
                    value={contactWhatsApp}
                    onChange={(e) => setContactWhatsApp(e.target.value)}
                    placeholder="Ex: 5599984684867"
                    className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-300">E-mail de Atendimento</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="Ex: contato@evidencia.com.br"
                    className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-300">Endereço Físico Completo</label>
                <input
                  type="text"
                  value={contactAddress}
                  onChange={(e) => setContactAddress(e.target.value)}
                  placeholder="Ex: Rua Afonso Pena, 295 - Centro, Caxias - MA"
                  className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-300">Horário de Funcionamento</label>
                <input
                  type="text"
                  value={contactHours}
                  onChange={(e) => setContactHours(e.target.value)}
                  placeholder="Ex: Segunda a Sexta: 08:00 às 18:00 | Sábado: 08:00 às 13:00"
                  className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                  }`}
                />
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-4">
                <h3 className="text-sm font-black text-amber-400">Barra Promocional no Topo</h3>
                
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-300">Texto do Anúncio Promocional</label>
                  <input
                    type="text"
                    value={promoText}
                    onChange={(e) => setPromoText(e.target.value)}
                    placeholder="Ex: Frete grátis para todo Brasil em compras acima de R$ 350!"
                    className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                    }`}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isPromoActive"
                    checked={isPromoActive}
                    onChange={(e) => setIsPromoActive(e.target.checked)}
                    className="rounded accent-amber-400 w-4 h-4"
                  />
                  <label htmlFor="isPromoActive" className="text-xs font-bold text-slate-300">
                    Exibir Barra Promocional no Topo da Loja
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  className="px-7 py-3 rounded-xl bg-amber-400 text-slate-950 font-black text-xs hover:bg-amber-300 transition-all shadow-md cursor-pointer flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>Salvar Dados de Contato</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 6: MOBLINK ERP INTEGRATOR */}
        {activeTab === 'moblink' && (
          <MoblinkIntegrationPanel />
        )}

        {/* TAB 7: INVENTORY MANAGEMENT */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight">Gestão de Produtos & Estoque</h2>
                <p className="text-xs text-slate-400">Gerencie catálogo, preços, estoque e controle de visibilidade</p>
              </div>

              <button
                onClick={() => setActiveTab('new-product')}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-amber-400 text-slate-950 font-black text-xs hover:bg-amber-300 transition-all shadow-md cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Adicionar Novo Produto</span>
              </button>
            </div>

            {/* Inventory Table */}
            <div className={`rounded-3xl border backdrop-blur-xl overflow-hidden ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${
                      isDark ? 'border-slate-800 bg-slate-950/50 text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-600'
                    }`}>
                      <th className="p-4">Produto</th>
                      <th className="p-4">Preço</th>
                      <th className="p-4">Estoque</th>
                      <th className="p-4">Visibilidade</th>
                      <th className="p-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-xs font-semibold">
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="p-4 flex items-center space-x-3">
                          <img
                            src={product.images?.[0] || product.foto_uri || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=600&auto=format&fit=crop'}
                            alt={product.name}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-700"
                          />
                          <div>
                            <p className="font-bold">{product.name}</p>
                            <p className="text-[10px] text-slate-400">{product.category} • SKU: {product.sku || product.id}</p>
                          </div>
                        </td>
                        <td className="p-4 font-black">R$ {product.price.toFixed(2).replace('.', ',')}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                            product.stock === 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {product.stock} un
                          </span>
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => updateProduct(product.id, { visible: !product.visible })}
                            className="cursor-pointer"
                          >
                            {product.visible ? (
                              <span className="text-emerald-400 flex items-center space-x-1"><Eye className="h-4 w-4" /><span>Visível</span></span>
                            ) : (
                              <span className="text-slate-500 flex items-center space-x-1"><EyeOff className="h-4 w-4" /><span>Oculto</span></span>
                            )}
                          </button>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => deleteProduct(product.id)}
                            className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
                            title="Excluir produto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: CATEGORIES MANAGER */}
        {activeTab === 'categories' && (
          <div className="space-y-6 max-w-4xl">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Categorias da Loja</h2>
              <p className="text-xs text-slate-400">Gerencie subcategorias e taxonomias do e-commerce</p>
            </div>

            <div className={`p-6 rounded-3xl border backdrop-blur-xl space-y-4 ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <h3 className="text-sm font-black">Adicionar Nova Categoria</h3>
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Nome da categoria (Ex: Mocassins)"
                  className={`flex-1 p-3 rounded-xl text-xs border focus:outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                  }`}
                />
                <button
                  onClick={() => {
                    if (newCatName) {
                      addCategory({ id: newCatName.toLowerCase().replace(/\s+/g, '-'), name: newCatName });
                      setNewCatName('');
                    }
                  }}
                  className="px-5 py-3 rounded-xl bg-amber-400 text-slate-950 font-black text-xs hover:bg-amber-300 cursor-pointer"
                >
                  Adicionar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categories.map((cat) => (
                <div key={cat.id} className={`p-4 rounded-2xl border flex items-center justify-between ${
                  isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div>
                    <p className="font-bold text-sm">{cat.name}</p>
                    <p className="text-[10px] text-slate-400">ID: {cat.id}</p>
                  </div>
                  <button
                    onClick={() => deleteCategory(cat.id)}
                    className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-xl"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 9: SETTINGS & DANGER ZONE (RESET LAYOUT) */}
        {activeTab === 'settings' && (
          <div className="space-y-8 max-w-4xl">
            <div>
              <h2 className="text-2xl font-black tracking-tight flex items-center space-x-2">
                <Settings className="h-6 w-6 text-amber-400" />
                <span>Configurações Gerais do E-commerce</span>
              </h2>
              <p className="text-xs text-slate-400">Preferências do sistema, chaves de integração e restauração de fábrica</p>
            </div>

            {/* Cloudinary Integration Settings */}
            <div className={`p-6 sm:p-8 rounded-3xl border backdrop-blur-xl space-y-4 ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <h3 className="text-sm font-black text-amber-400 flex items-center space-x-2">
                <Upload className="h-4 w-4" />
                <span>Integração com Cloudinary (Upload de Imagens)</span>
              </h3>
              <p className="text-xs text-slate-400">Configure suas chaves para armazenar imagens de produtos e banners diretamente na nuvem.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-300">Cloud Name</label>
                  <input
                    type="text"
                    value={cloudinaryCloudName}
                    onChange={(e) => {
                      setCloudinaryCloudName(e.target.value);
                      localStorage.setItem('cloudinary_cloud_name', e.target.value);
                    }}
                    placeholder="Ex: dxy12345"
                    className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-300">Upload Preset (Unsigned)</label>
                  <input
                    type="text"
                    value={cloudinaryUploadPreset}
                    onChange={(e) => {
                      setCloudinaryUploadPreset(e.target.value);
                      localStorage.setItem('cloudinary_upload_preset', e.target.value);
                    }}
                    placeholder="Ex: evidencia_preset"
                    className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* DANGER ZONE: FACTORY RESET */}
            <div className="p-6 sm:p-8 rounded-3xl border border-rose-500/30 bg-rose-950/20 backdrop-blur-xl space-y-4">
              <div className="flex items-center space-x-3 text-rose-500">
                <AlertCircle className="h-6 w-6 shrink-0 animate-pulse" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider">Zona de Segurança & Restauração</h3>
                  <p className="text-xs text-rose-300/80">Restaure o layout, banners e conteúdos originais entregues de fábrica.</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Se alguma alteração de banners, ordem de seções ou textos desconfigurar a vitrine da loja, você pode restaurar todos os padrões estéticos e originais da <strong>Evidência Calçados</strong> a qualquer momento.
              </p>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsRestoreModalOpen(true)}
                  className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg shadow-rose-950/50 transition-all cursor-pointer flex items-center space-x-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Restaurar Layout Original da Loja</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* CONFIRMATION MODAL FOR FACTORY RESET */}
      {isRestoreModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 sm:p-8 rounded-3xl border shadow-2xl space-y-6 text-center animate-in fade-in zoom-in duration-200 ${
            isDark ? 'bg-slate-900 border-rose-500/40 text-white shadow-black/80' : 'bg-white border-rose-200 text-slate-900'
          }`}>
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 mx-auto flex items-center justify-center shadow-lg">
              <AlertCircle className="h-8 w-8 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-rose-500">Restaurar Layout Original?</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Atenção: Tem certeza que deseja restaurar o layout padrão? Todas as suas alterações de banners hero, ordem de seções, textos do "Sobre Nós" e contatos serão desfeitas e substituídas pelas configurações originais de fábrica. Essa ação não pode ser desfeita.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsRestoreModalOpen(false)}
                className="flex-1 px-5 py-3 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800 cursor-pointer transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={async () => {
                  await restoreDefaultConfig();
                  setIsRestoreModalOpen(false);
                  setCmsFeedback('Layout e dados padrão restaurados com sucesso!');
                  setTimeout(() => setCmsFeedback(''), 4000);
                }}
                className="flex-1 px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg shadow-rose-950/50 cursor-pointer flex items-center justify-center space-x-2 transition-all"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Sim, Restaurar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
