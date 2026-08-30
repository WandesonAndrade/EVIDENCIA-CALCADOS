import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Product, Order, OrderStatus, PaymentStatus, UserProfile, Category, HeroBanner, HomeSectionConfig, AboutConfig, ContactConfig, SaldaoConfig, PromoCampaign } from '../types';
import { MoblinkIntegrationPanel } from './MoblinkIntegrationPanel';
import { MoblinkProductsManager } from './MoblinkProductsManager';
import { MoblinkClientsManager } from './MoblinkClientsManager';
import { ErrorBoundary } from './ErrorBoundary';
import { AuthScreen } from './AuthScreen';
import { TeamManagement } from './TeamManagement';
import { SellersManager } from './SellersManager';
import { checkIsProfileComplete } from '../App';
import { storage, db, auth, app } from '../lib/firebase';
import { moblinkClientesService } from '../services/moblinkClientesService';
import { FinancialDashboard } from './FinancialDashboard';
import { uploadImageToSupabase } from '../services/supabaseStorageService';
import { isSaldaoProduct, getSaldaoProductPrice } from '../services/saldaoService';
import { getCampaignStatus, isCampaignActive, calculateCampaignPrice } from '../services/promotionsService';
import { NO_PHOTO_SVG } from '../utils/placeholder';



import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, doc, getDocs, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { 
  Package, DollarSign, Users, User, RefreshCw, Plus, 
  Trash2, Edit, Save, ToggleLeft, ToggleRight, 
  Upload, Check, AlertCircle, ShoppingBag, Eye,
  BarChart, Layers, MessageSquare, Search, Filter, 
  Settings, ArrowLeft, UserCheck, EyeOff, ChevronRight, 
  Info, Sliders, Zap, Barcode, Image, ArrowUp, ArrowDown,
  BookOpen, PhoneCall, Globe, CheckCircle2, Sparkles, Layout, HelpCircle,
  FileText, Briefcase, MapPin, Gift, Heart, ShoppingCart, Cake, AlertTriangle, LogOut, Shield,
  FolderTree, Tag, X, ExternalLink
} from 'lucide-react';
import { AdminOrdersList } from './orders/AdminOrdersList';
import { moblinkCategoriesService, normalizeCategoryName, normalizeSubcategoryName } from '../services/moblinkCategoriesService';

type AdminTab = 
  | 'overview' 
  | 'financeiro'
  | 'inventory' 
  | 'sales' 
  | 'crediario'
  | 'customers' 
  | 'vendedores'
  | 'new-product' 
  | 'categories' 
  | 'moblink' 
  | 'banners' 
  | 'home-sections' 
  | 'about-editor' 
  | 'support-contact' 
  | 'settings'
  | 'saldao'
  | 'promotions'
  | 'team';

export const AdminPanel: React.FC = () => {
  const { 
    products, 
    orders, 
    currentUser,
    currentAdminUser,
    registerTeamMember,
    logoutAdmin, 
    setCurrentView,
    addProduct,
    deleteProduct,
    updateProduct,
    updateOrderStatus,
    updateOrderPaymentStatus,
    updateOrderFreight,
    assignOrderSeller,
    deleteOrder,
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
    restoreDefaultConfig,
    saldaoConfig,
    updateSaldaoConfig,
    promotions = [],
    sellers = [],
    savePromotion,
    deletePromotion,
    togglePromotionStatus,
    atualizarStatusCrediario,
    updateUserCashback
  } = useApp();

  // Estados de Gerenciamento de Ofertas & Promoções
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCampaign | null>(null);

  const [promoTitle, setPromoTitle] = useState('');
  const [promoDescription, setPromoDescription] = useState('');
  const [promoStartDate, setPromoStartDate] = useState('');
  const [promoEndDate, setPromoEndDate] = useState('');
  const [promoDiscountType, setPromoDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [promoDiscountValue, setPromoDiscountValue] = useState<number>(15);
  const [promoProductIds, setPromoProductIds] = useState<string[]>([]);
  const [promoActive, setPromoActive] = useState(true);

  const [promoProductSearch, setPromoProductSearch] = useState('');
  const [promoCategoryFilter, setPromoCategoryFilter] = useState('TODAS');

  const handleOpenNewPromoModal = () => {
    setEditingPromo(null);
    setPromoTitle('');
    setPromoDescription('');
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setPromoStartDate(today);
    setPromoEndDate(nextWeek);
    setPromoDiscountType('percentage');
    setPromoDiscountValue(15);
    setPromoProductIds([]);
    setPromoActive(true);
    setPromoProductSearch('');
    setPromoCategoryFilter('TODAS');
    setIsPromoModalOpen(true);
  };

  const handleOpenEditPromoModal = (campaign: PromoCampaign) => {
    setEditingPromo(campaign);
    setPromoTitle(campaign.title);
    setPromoDescription(campaign.description || '');
    setPromoStartDate(campaign.startDate ? campaign.startDate.split('T')[0] : '');
    setPromoEndDate(campaign.endDate ? campaign.endDate.split('T')[0] : '');
    setPromoDiscountType(campaign.discountType || 'percentage');
    setPromoDiscountValue(campaign.discountValue || 10);
    setPromoProductIds(campaign.productIds || []);
    setPromoActive(campaign.active !== false);
    setPromoProductSearch('');
    setPromoCategoryFilter('TODAS');
    setIsPromoModalOpen(true);
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoTitle.trim()) {
      alert('Por favor, informe o título da promoção.');
      return;
    }
    if (!promoStartDate || !promoEndDate) {
      alert('Por favor, defina a data inicial e final da promoção.');
      return;
    }
    if (promoProductIds.length === 0) {
      alert('Por favor, selecione ao menos 1 produto participante.');
      return;
    }

    const campaignId = editingPromo ? editingPromo.id : `promo_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const campaign: PromoCampaign = {
      id: campaignId,
      title: promoTitle.trim(),
      description: promoDescription.trim(),
      startDate: promoStartDate,
      endDate: promoEndDate,
      discountType: promoDiscountType,
      discountValue: Number(promoDiscountValue) || 0,
      productIds: promoProductIds,
      active: promoActive,
      createdAt: editingPromo?.createdAt || new Date().toISOString(),
    };

    await savePromotion(campaign);
    setIsPromoModalOpen(false);
  };

  const handleToggleProductInPromo = (prodId: string) => {
    setPromoProductIds(prev => 
      prev.includes(prodId) ? prev.filter(id => id !== prodId) : [...prev, prodId]
    );
  };

  const activeAdminUser = currentAdminUser || currentUser;
  const isAdmin = true; // Todo colaborador autenticado no painel possui privilégio total de Administrador
  const isSeller = false;

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isSyncingCategories, setIsSyncingCategories] = useState(false);
  const [catSyncFeedback, setCatSyncFeedback] = useState<string | null>(null);

  const handleSyncCategoriesFromERP = async () => {
    setIsSyncingCategories(true);
    setCatSyncFeedback(null);
    try {
      const updatedTree = await moblinkCategoriesService.syncCategoriesToFirestore(products);
      setCatSyncFeedback(`⚡ Sincronização concluída! ${updatedTree.length} categoria(s) e subcategoria(s) traduzidas salvas.`);
      addToast("Categorias Atualizadas", "Árvore de categorias e subcategorias do ERP sincronizada com sucesso!");
    } catch (err: any) {
      setCatSyncFeedback(`Falha ao sincronizar categorias: ${err.message || 'Erro de conexão'}`);
      addToast("Erro na Sincronização", err.message || "Não foi possível sincronizar categorias com o ERP", "error");
    } finally {
      setIsSyncingCategories(false);
    }
  };

  // Tratamento rigoroso das categorias para exibir APENAS nomes legíveis e traduzidos
  const cleanCategories = useMemo(() => {
    const map = new Map<string, Category>();

    (categories || []).forEach(cat => {
      if (!cat || !cat.name) return;
      const rawName = cat.name.trim();

      // Ignora códigos numéricos brutos (ex: 002.003) ou 'Geral' isolado
      if (rawName === 'Geral' || /^\d+(\.\d+)?$/.test(rawName)) return;

      const normCatName = normalizeCategoryName(rawName);
      if (!normCatName || normCatName === 'Geral') return;

      const catKey = normCatName.toUpperCase();

      // Trata e normaliza a lista de subcategorias
      const cleanSubs = (cat.subcategories || [])
        .map(sub => {
          if (!sub || !sub.name) return null;
          const normSubName = normalizeSubcategoryName(sub.name);
          if (!normSubName || /^\d+(\.\d+)?$/.test(normSubName)) return null;
          return {
            ...sub,
            name: normSubName
          };
        })
        .filter(Boolean) as any[];

      // Remove subcategorias duplicadas pelo nome normalizado
      const uniqueSubsMap = new Map<string, any>();
      cleanSubs.forEach(s => {
        uniqueSubsMap.set(s.name.toUpperCase(), s);
      });

      if (!map.has(catKey)) {
        map.set(catKey, {
          ...cat,
          name: normCatName,
          subcategories: Array.from(uniqueSubsMap.values())
        });
      } else {
        const existing = map.get(catKey)!;
        (existing.subcategories || []).forEach(s => uniqueSubsMap.set(s.name.toUpperCase(), s));
        existing.subcategories = Array.from(uniqueSubsMap.values());
      }
    });

    return Array.from(map.values());
  }, [categories]);





  // Team Registration Modal State
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [teamNameInput, setTeamNameInput] = useState('');
  const [teamEmailInput, setTeamEmailInput] = useState('');
  const [teamRoleInput, setTeamRoleInput] = useState<'admin' | 'seller'>('seller');
  const [teamTempPassInput, setTeamTempPassInput] = useState('evidencia2026');


  // Toast Notification System State
  const [toasts, setToasts] = useState<Array<{ id: string; title: string; message: string; type: 'success' | 'error' | 'info' }>>([]);

  const addToast = (title: string, message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3800);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleRegisterTeamMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamNameInput.trim() || !teamEmailInput.trim() || !teamTempPassInput.trim()) {
      addToast("Campos Obrigatórios", "Por favor preencha todos os campos do pré-cadastro.", "error");
      return;
    }

    try {
      await registerTeamMember(teamNameInput.trim(), teamEmailInput.trim(), teamRoleInput, teamTempPassInput.trim());
      addToast("Membro Cadastrado!", `${teamNameInput} registrado como ${teamRoleInput.toUpperCase()}.`, "success");
      setIsTeamModalOpen(false);
      setTeamNameInput('');
      setTeamEmailInput('');
      setTeamTempPassInput('evidencia2026');
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      addToast("Erro no Cadastro", err.message || "Não foi possível cadastrar o usuário.", "error");
    }
  };


  // Home Section Editing Modal State
  const [editingSection, setEditingSection] = useState<HomeSectionConfig | null>(null);
  const [sectionNameInput, setSectionNameInput] = useState('');
  const [sectionDescInput, setSectionDescInput] = useState('');
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);

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

  // Saldão de Calçados Form State
  const [saldaoEnabledInput, setSaldaoEnabledInput] = useState(saldaoConfig?.enabled ?? true);
  const [saldaoMaxStockInput, setSaldaoMaxStockInput] = useState(saldaoConfig?.maxStock ?? 2);
  const [saldaoDiscountInput, setSaldaoDiscountInput] = useState(saldaoConfig?.discountPercent ?? 20);
  const [saldaoBannerInput, setSaldaoBannerInput] = useState(saldaoConfig?.bannerText || '🔥 SALDÃO DE CALÇADOS - ÚLTIMAS UNIDADES COM DESCONTO EXCLUSIVO!');
  const [isSavingSaldao, setIsSavingSaldao] = useState(false);

  useEffect(() => {
    if (saldaoConfig) {
      setSaldaoEnabledInput(saldaoConfig.enabled);
      setSaldaoMaxStockInput(saldaoConfig.maxStock ?? 2);
      setSaldaoDiscountInput(saldaoConfig.discountPercent ?? 20);
      setSaldaoBannerInput(saldaoConfig.bannerText || '🔥 SALDÃO DE CALÇADOS - ÚLTIMAS UNIDADES COM DESCONTO EXCLUSIVO!');
    }
  }, [saldaoConfig]);

  const handleSaveSaldaoSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSaldao(true);

    try {
      await updateSaldaoConfig({
        enabled: saldaoEnabledInput,
        maxStock: Number(saldaoMaxStockInput) || 2,
        discountPercent: Number(saldaoDiscountInput) || 20,
        bannerText: saldaoBannerInput.trim(),
      });

      addToast("Saldão Atualizado!", "As regras do Saldão de Calçados foram salvas e aplicadas na loja com sucesso.", "success");
    } catch (err: any) {
      console.error(err);
      addToast("Erro ao Salvar", err.message || "Não foi possível salvar as configurações do Saldão.", "error");
    } finally {
      setIsSavingSaldao(false);
    }
  };

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
  const [contactEmail, setContactEmail] = useState(contactConfig?.email || 'evidenicacalcados2025@gmail.com');
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
  const [ordersPaymentFilter, setOrdersPaymentFilter] = useState<'Todos' | PaymentStatus>('Todos');
  const [ordersSellerFilter, setOrdersSellerFilter] = useState<string>('Todos');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [editingFreightMap, setEditingFreightMap] = useState<{ [orderId: string]: string }>({});


  // Users Management States
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersSearch, setUsersSearch] = useState('');
  const [birthdayFilter, setBirthdayFilter] = useState<'Todos' | 'Dia' | 'Semana' | 'Mês'>('Todos');
  const [registrationFilter, setRegistrationFilter] = useState<'Todos' | 'Completo' | 'Incompleto'>('Todos');
  const [editingCashbackMap, setEditingCashbackMap] = useState<{ [uid: string]: { balance: string; validUntil: string } }>({});

  // ERP MobLink Clientes Sync State
  const [isSyncingMoblinkClientes, setIsSyncingMoblinkClientes] = useState(false);
  const [syncMoblinkClientesProgress, setSyncMoblinkClientesProgress] = useState('');

  const handleSyncMoblinkClientes = async () => {
    try {
      setIsSyncingMoblinkClientes(true);
      setSyncMoblinkClientesProgress('Iniciando conexão com API do MobLink ERP...');
      const moblinkList = await moblinkClientesService.fetchMoblinkClientesDirect();
      addToast(
        'Base de Clientes Carregada!',
        `${moblinkList.length} clientes carregados em tempo real do MobLink ERP (0 gravações no Firebase).`,
        'success'
      );
    } catch (err: any) {
      console.error("Erro na sincronização de clientes MobLink:", err);
      addToast('Erro na Sincronização', err.message || 'Falha ao conectar com a API de clientes MobLink.', 'error');
    } finally {
      setIsSyncingMoblinkClientes(false);
      setSyncMoblinkClientesProgress('');
    }
  };

  // Fetch users collection from Firestore for Crediário Analysis
  const fetchUsers = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const fetched: UserProfile[] = [];
      snap.forEach(docSnap => {
        fetched.push({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
      });
      setUsers(fetched);
    } catch (e) {
      console.warn("Could not fetch users from Firestore, using local fallback:", e);
      const saved = localStorage.getItem('evidencia_local_users');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setUsers(Object.values(parsed));
        } catch (_) {}
      }
    }
  };

  useEffect(() => {
    fetchUsers();

    // Real-time listener for users engagement (cart & favorites)
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const fetched: UserProfile[] = [];
      snapshot.forEach(docSnap => {
        fetched.push({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
      });
      if (fetched.length > 0) {
        setUsers(fetched);
      }
    }, (err) => {
      console.warn("Firestore users listener warning:", err);
    });

    return () => unsubscribe();
  }, []);

  const isBirthdayMatch = (userDateStr: string | undefined, filter: 'Dia' | 'Semana' | 'Mês'): boolean => {
    if (!userDateStr) return false;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();

    let bMonth = -1;
    let bDay = -1;

    if (userDateStr.includes('-')) {
      const parts = userDateStr.split('-');
      if (parts.length >= 3) {
        bMonth = parseInt(parts[1], 10) - 1;
        bDay = parseInt(parts[2], 10);
      }
    } else if (userDateStr.includes('/')) {
      const parts = userDateStr.split('/');
      if (parts.length >= 3) {
        bDay = parseInt(parts[0], 10);
        bMonth = parseInt(parts[1], 10) - 1;
      }
    }

    if (bMonth === -1 || bDay === -1 || isNaN(bMonth) || isNaN(bDay)) return false;

    if (filter === 'Dia') {
      return bMonth === currentMonth && bDay === currentDay;
    }

    if (filter === 'Mês') {
      return bMonth === currentMonth;
    }

    if (filter === 'Semana') {
      if (bMonth !== currentMonth) return false;
      const diffDays = Math.abs(bDay - currentDay);
      return diffDays <= 3;
    }

    return false;
  };

  const handleAprovarCrediario = async (user: UserProfile) => {
    try {
      setUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, crediarioStatus: 'Aprovado', crediarioAnalisadoEm: new Date().toISOString() } : u));
      await atualizarStatusCrediario(user.uid, 'Aprovado');
      addToast('Crediário Aprovado!', `O crediário de ${user.name} foi aprovado com sucesso.`, 'success');
      fetchUsers();
    } catch (err) {
      addToast('Erro na Aprovação', 'Não foi possível atualizar o status do crediário.', 'error');
    }
  };

  const handleRejeitarCrediario = async (user: UserProfile) => {
    try {
      setUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, crediarioStatus: 'Rejeitado', crediarioAnalisadoEm: new Date().toISOString() } : u));
      await atualizarStatusCrediario(user.uid, 'Rejeitado');
      addToast('Crediário Recusado', `O crediário de ${user.name} foi recusado.`, 'info');
      fetchUsers();
    } catch (err) {
      addToast('Erro ao Rejeitar', 'Não foi possível atualizar o status do crediário.', 'error');
    }
  };

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
      addToast('Campos Obrigatórios', 'Por favor, preencha o Título e a URL da Imagem do Banner.', 'error');
      return;
    }

    try {
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
      addToast('Banner Salvo!', 'O banner hero foi atualizado e sincronizado no Firestore.');
    } catch (err: any) {
      console.error("Erro ao salvar banner no Firestore:", err);
      addToast('Erro ao Salvar', 'Permissão negada ou erro de conexão com o Firestore. Tente novamente.', 'error');
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este banner?')) return;
    try {
      const updated = (heroBanners || []).filter(b => b.id !== id);
      await updateHeroBanners(updated);
      addToast('Banner Removido!', 'O banner foi excluído do carrossel principal.');
    } catch (err: any) {
      console.error("Erro ao deletar banner no Firestore:", err);
      addToast('Erro ao Salvar', 'Permissão negada ou erro de conexão com o Firestore.', 'error');
    }
  };

  const handleToggleBannerActive = async (id: string) => {
    try {
      const updated = (heroBanners || []).map(b => b.id === id ? { ...b, active: !b.active } : b);
      await updateHeroBanners(updated);
      addToast('Status Atualizado!', 'A visibilidade do banner foi alterada.');
    } catch (err: any) {
      console.error("Erro ao alterar status do banner:", err);
      addToast('Erro ao Salvar', 'Permissão negada ou erro de conexão com o Firestore.', 'error');
    }
  };

  // --- CMS 2: HOME SECTIONS REORDERING & EDITING ---
  // Sincroniza dinamicamente todas as categorias atuais cadastradas na lista de seções da Home
  const effectiveHomeSections = useMemo(() => {
    const list = [...(homeSections || [])];

    // Garante que 'launches' (Novidades & Lançamentos) é o destaque principal fixado no topo
    const launchesIdx = list.findIndex((s) => s.id === 'launches');
    if (launchesIdx === -1) {
      list.unshift({
        id: 'launches',
        name: 'Novidades & Lançamentos',
        description: 'Carrossel dos lançamentos da estação (Destaque Principal Fixado)',
        enabled: true,
      });
    } else if (launchesIdx > 0) {
      const [launchesSec] = list.splice(launchesIdx, 1);
      list.unshift(launchesSec);
    }

    // Extrai todas as categorias/grupos atuais ativas no sistema (do ERP e do banco)
    const activeCatNames = new Set<string>();

    (categories || []).filter((c) => c && c.active !== false && c.name).forEach((c) => {
      const norm = normalizeCategoryName(c.name);
      if (norm && norm !== 'Geral' && !/^\d+(\.\d+)?$/.test(norm)) {
        activeCatNames.add(norm);
      }
    });

    (products || []).forEach((p) => {
      const raw = p.nome_grupo || p.category || '';
      if (raw && !/^\d+(\.\d+)?$/.test(raw)) {
        const norm = normalizeCategoryName(raw);
        if (norm && norm !== 'Geral' && !/^\d+(\.\d+)?$/.test(norm)) {
          activeCatNames.add(norm);
        }
      }
    });

    // Para cada categoria atual, garante que exista uma seção correspondente
    activeCatNames.forEach((catName) => {
      const catId = catName.toLowerCase().replace(/\s+/g, '-');
      const upperName = catName.toUpperCase();

      const exists = list.some(
        (s) =>
          s.id === catId ||
          s.name.toUpperCase() === upperName ||
          s.id.toUpperCase() === upperName ||
          normalizeCategoryName(s.name).toUpperCase() === upperName
      );

      if (!exists) {
        list.push({
          id: catId,
          name: catName,
          description: `Grade de produtos da categoria ${catName}`,
          enabled: true,
        });
      }
    });

    return list;
  }, [homeSections, categories, products]);

  const handleMoveSection = async (index: number, direction: 'up' | 'down') => {
    try {
      const list = [...effectiveHomeSections];
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      if (targetIdx <= 0 || targetIdx >= list.length || index <= 0) return; // Lançamentos fica fixo em #1
      const temp = list[index];
      list[index] = list[targetIdx];
      list[targetIdx] = temp;
      await updateHomeSections(list);
      addToast('Seções Reordenadas!', 'A nova sequência de seções foi salva no Firestore.');
    } catch (err: any) {
      console.error("Erro ao reordenar seções:", err);
      addToast('Erro ao Salvar', 'Permissão negada ou erro de conexão com o Firestore.', 'error');
    }
  };

  const handleSaveHomeSectionsOrder = async () => {
    try {
      await updateHomeSections(effectiveHomeSections);
      addToast('Ordem salva com sucesso!', 'A nova ordem exata das seções da Home foi enviada para o Firestore.');
    } catch (err: any) {
      console.error("Erro ao salvar ordem das seções:", err);
      addToast('Erro ao Salvar', 'Permissão negada ou erro de conexão com o Firestore.', 'error');
    }
  };

  const handleToggleSectionEnabled = async (id: string) => {
    try {
      const list = effectiveHomeSections.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s);
      await updateHomeSections(list);
      addToast('Visibilidade Alterada!', 'O status da seção foi sincronizado com a loja.');
    } catch (err: any) {
      console.error("Erro ao alterar visibilidade da seção:", err);
      addToast('Erro ao Salvar', 'Permissão negada ou erro de conexão com o Firestore.', 'error');
    }
  };

  const handleOpenEditSection = (sec: HomeSectionConfig) => {
    setEditingSection(sec);
    setSectionNameInput(sec.name);
    setSectionDescInput(sec.description);
    setIsSectionModalOpen(true);
  };

  const handleSaveSectionEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection) return;
    try {
      const updatedList = effectiveHomeSections.map(s =>
        s.id === editingSection.id ? { ...s, name: sectionNameInput, description: sectionDescInput } : s
      );
      await updateHomeSections(updatedList);
      setIsSectionModalOpen(false);
      addToast('Seção Atualizada!', `A seção "${sectionNameInput}" foi salva no Firestore.`);
    } catch (err: any) {
      console.error("Erro ao editar seção:", err);
      addToast('Erro ao Salvar', 'Permissão negada ou erro de conexão com o Firestore.', 'error');
    }
  };

  // --- CMS 3: ABOUT US SAVE ---
  const handleSaveAbout = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateAboutConfig({
        title: aboutTitle,
        subtitle: aboutSubtitle,
        description: aboutDescription,
        highlightImage: aboutImage,
        badgeText: aboutBadge
      });
      addToast('Conteúdo Institucional!', 'As informações do "Sobre Nós" foram salvas no Firestore.');
    } catch (err: any) {
      console.error("Erro ao salvar Sobre Nós:", err);
      addToast('Erro ao Salvar', 'Permissão negada ou erro de conexão com o Firestore.', 'error');
    }
  };

  // --- CMS 4: CONTACT SAVE ---
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateContactConfig({
        whatsapp: contactWhatsApp,
        email: contactEmail,
        address: contactAddress,
        hours: contactHours,
        promoBannerText: promoText,
        isPromoBannerActive: isPromoActive
      });
      addToast('Suporte & Contatos!', 'Os contatos e o banner promocional foram atualizados no Firestore.');
    } catch (err: any) {
      console.error("Erro ao salvar contatos:", err);
      addToast('Erro ao Salvar', 'Permissão negada ou erro de conexão com o Firestore.', 'error');
    }
  };

  // Cloudinary Upload Handler with File Security Validations
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField?: 'product' | 'banner' | 'about') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Security Validation 1: MIME Type Restriction (image/png, image/jpeg, image/webp)
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedMimeTypes.includes(file.type.toLowerCase())) {
      addToast('Arquivo Inválido', 'Por favor, selecione apenas imagens nos formatos PNG, JPG, JPEG ou WEBP.', 'error');
      return;
    }

    // Security Validation 2: Maximum File Size Limit (5MB)
    const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE_BYTES) {
      addToast('Arquivo Muito Grande', 'O tamanho máximo da imagem permitida é de 5MB.', 'error');
      return;
    }

    setIsUploading(true);
    setUploadFeedback('Enviando imagem para o Supabase Storage...');

    try {
      const folder = targetField === 'banner' ? 'banners' : targetField === 'about' ? 'sobre' : 'produtos';
      const url = await uploadImageToSupabase(file, { folder });

      if (targetField === 'banner') setBannerImage(url);
      else if (targetField === 'about') setAboutImage(url);
      else setNewProdImages(prev => [...prev, url]);

      setUploadFeedback('Imagem enviada com sucesso para o Supabase!');
      addToast('Upload Concluído', 'Imagem armazenada no Supabase e vinculada.', 'success');
    } catch (err: any) {
      console.error("Erro no envio para Supabase Storage:", err);
      const reader = new FileReader();
      reader.onloadend = () => {
        const url = reader.result as string;
        if (targetField === 'banner') setBannerImage(url);
        else if (targetField === 'about') setAboutImage(url);
        else setNewProdImages(prev => [...prev, url]);
        setUploadFeedback('Imagem carregada localmente.');
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadFeedback(''), 4000);
    }
  };

  // Guarda de Segurança: Exige login administrativo se o usuário não for gestor
  if (!currentUser || currentUser.role !== 'admin') {
    return <AuthScreen mode="admin" />;
  }

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
                onClick={() => setActiveTab('financeiro')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'financeiro'
                    ? isDark ? 'bg-[#007aff]/15 text-[#007aff] border border-[#007aff]/30' : 'bg-[#007aff] text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <DollarSign className="h-4 w-4 text-[#007aff]" />
                <span>Dashboard Financeiro</span>
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
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'customers' || activeTab === 'crediario'
                    ? isDark ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30' : 'bg-slate-900 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Users className="h-4 w-4" />
                  <span>Base de Clientes & CRM</span>
                </div>
                {users.filter(u => u.crediarioStatus === 'EmAnalise').length > 0 && (
                  <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-black animate-pulse" title="Análises de crediário pendentes">
                    {users.filter(u => u.crediarioStatus === 'EmAnalise').length} pendente(s)
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('vendedores')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'vendedores'
                    ? isDark ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30' : 'bg-slate-900 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <UserCheck className="h-4 w-4 text-emerald-500" />
                  <span>Vendedores (Cadastros)</span>
                </div>
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

            {/* GROUP 3: GESTOR DE CONTEÚDO (CMS DA LOJA - APENAS ADMIN) */}
            {isAdmin && (
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

                <button
                  onClick={() => setActiveTab('saldao')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'saldao'
                      ? isDark ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' : 'bg-slate-900 text-white shadow-sm'
                      : isDark ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Tag className="h-4 w-4 text-rose-500" />
                    <span>Saldão de Calçados</span>
                  </div>
                  {saldaoConfig?.enabled && (
                    <span className="px-1.5 py-0.5 text-[9px] font-black rounded-md bg-rose-500 text-white uppercase">
                      Ativo
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('promotions')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'promotions'
                      ? isDark ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30' : 'bg-slate-900 text-white shadow-sm'
                      : isDark ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Gift className="h-4 w-4 text-amber-500" />
                    <span>Ofertas & Promoções</span>
                  </div>
                  {promotions.filter(p => isCampaignActive(p)).length > 0 && (
                    <span className="px-1.5 py-0.5 text-[9px] font-black rounded-md bg-amber-500 text-slate-950 uppercase">
                      {promotions.filter(p => isCampaignActive(p)).length}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* GROUP 4: CONFIGURAÇÕES & SEGURANÇA (APENAS ADMIN) */}
            {isAdmin && (
              <div className="space-y-1">
                <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase px-3">SISTEMA</span>
                
                <button
                  onClick={() => setActiveTab('team')}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'team'
                      ? isDark ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30' : 'bg-slate-900 text-white shadow-sm'
                      : isDark ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Shield className="h-4 w-4 text-amber-400" />
                  <span>Gestão de Equipe & Colaboradores</span>
                </button>


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
            )}

          </nav>
        </div>

        {/* User Info & Admin Logout Button */}
        <div className="p-4 border-t border-slate-800/40">
          {activeAdminUser && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 px-1 truncate">
                <div className={`w-8 h-8 rounded-full font-black flex items-center justify-center text-xs shrink-0 ${
                  isAdmin ? 'bg-amber-400 text-slate-950' : 'bg-sky-400 text-slate-950'
                }`}>
                  {activeAdminUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 truncate">
                  <p className="text-xs font-bold truncate">{activeAdminUser.name}</p>
                  <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block ${
                    isAdmin ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30' : 'bg-sky-400/20 text-sky-400 border border-sky-400/30'
                  }`}>
                    {isAdmin ? 'Administrador' : 'Vendedor'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  logoutAdmin();
                  setCurrentView('home');
                }}
                className="p-2 rounded-xl border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-colors cursor-pointer shrink-0"
                title="Encerrar Sessão da Gestão"
              >
                <LogOut className="h-4 w-4" />
              </button>
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

        {/* TAB FINANCEIRO: DASHBOARD FINANCEIRO */}
        {activeTab === 'financeiro' && (
          <FinancialDashboard />
        )}

        {/* TAB 1: VISÃO GERAL */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black tracking-tight">Visão Geral do E-commerce</h2>
                <p className="text-xs text-slate-400">Resumo de desempenho, inventário e pedidos</p>
              </div>
              <button
                onClick={() => setActiveTab('financeiro')}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-black bg-[#007aff] text-white hover:bg-[#0066d6] shadow-sm transition-all cursor-pointer shrink-0"
              >
                <DollarSign className="h-4 w-4" />
                <span>Dashboard Financeiro</span>
              </button>
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
                <p className="text-2xl font-black">R$ {(totalRevenue || 0).toFixed(2).replace('.', ',')}</p>
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

        {/* TAB 2: VENDAS & PEDIDOS DOS CLIENTES */}
        {activeTab === 'sales' && <AdminOrdersList isDark={isDark} />}


        {/* TAB: BASE DE CLIENTES & CRM MOBLINK ERP (GESTÃO UNIFICADA) */}

        {/* TAB: BASE DE CLIENTES & CRM MOBLINK ERP */}
        {activeTab === 'customers' && (
          <MoblinkClientsManager isDark={isDark} />
        )}

        {/* TAB: CADASTRO DE VENDEDORES */}
        {activeTab === 'vendedores' && (
          <SellersManager theme={theme} />
        )}

        {/* TAB: GESTÃO DE EQUIPE & SEGURANÇA */}

        {activeTab === 'team' && (
          isAdmin ? (
            <TeamManagement
              users={users}
              currentAdminUser={activeAdminUser}
              isDark={isDark}
              onRefreshUsers={fetchUsers}
              addToast={addToast}
            />
          ) : (
            <div className="p-10 text-center space-y-4 rounded-3xl border border-amber-500/20 bg-amber-500/5 max-w-lg mx-auto my-12 backdrop-blur-xl">
              <Shield className="h-12 w-12 text-amber-500 mx-auto" />
              <h3 className="text-xl font-black">Acesso Restrito ao Administrador</h3>
              <p className="text-xs text-slate-400">Esta área de Gestão de Equipe & Permissões é de acesso exclusivo para administradores da loja.</p>
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="px-5 py-2.5 rounded-2xl bg-amber-400 text-slate-950 font-black text-xs hover:bg-amber-300 transition-all shadow-md cursor-pointer inline-flex items-center space-x-2"
              >
                <span>Voltar ao Dashboard</span>
              </button>
            </div>
          )
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
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight flex items-center space-x-2">
                  <Sliders className="h-6 w-6 text-amber-400" />
                  <span>Ordenação de Seções da Página Inicial</span>
                </h2>
                <p className="text-xs text-slate-400">Altere a ordem de exibição e ative/desative seções da loja dinamicamente com os botões de setas</p>
              </div>

              <button
                type="button"
                onClick={handleSaveHomeSectionsOrder}
                className="px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center space-x-2 shrink-0"
              >
                <Save className="h-4 w-4" />
                <span>Salvar Ordem das Seções</span>
              </button>
            </div>

            <div className="space-y-4">
              {effectiveHomeSections.map((sec, index) => {
                const isLaunches = sec.id === 'launches';

                return (
                  <div
                    key={sec.id}
                    className={`p-5 rounded-2xl border backdrop-blur-xl flex items-center justify-between transition-all ${
                      isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                    } ${!sec.enabled ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center space-x-4">
                      <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs border ${
                        isLaunches 
                          ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                          : 'bg-amber-400/10 text-amber-400 border-amber-400/30'
                      }`}>
                        #{index + 1}
                      </span>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-black">{sec.name}</h3>
                          {isLaunches && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-400 border border-amber-400/30">
                              ✨ Destaque Principal Fixado
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{sec.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleOpenEditSection(sec)}
                        className="p-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-amber-400 cursor-pointer flex items-center space-x-1.5 text-xs font-bold"
                        title="Editar título e subtítulo"
                      >
                        <Edit className="h-4 w-4" />
                        <span className="hidden sm:inline">Editar</span>
                      </button>

                      <button
                        onClick={() => handleMoveSection(index, 'up')}
                        disabled={index <= 1 || isLaunches}
                        className="p-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
                        title="Mover para cima"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handleMoveSection(index, 'down')}
                        disabled={index === 0 || index === effectiveHomeSections.length - 1 || isLaunches}
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
                );
              })}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleSaveHomeSectionsOrder}
                className="px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg transition-all cursor-pointer flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>Salvar Seções e Ordem no Firestore</span>
              </button>
            </div>

            {/* Edit Section Modal */}
            {isSectionModalOpen && editingSection && (
              <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                <div className={`w-full max-w-lg p-6 sm:p-8 rounded-3xl border shadow-2xl space-y-6 ${
                  isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <h3 className="text-lg font-black">Editar Seção da Home</h3>
                    <button onClick={() => setIsSectionModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                  </div>

                  <form onSubmit={handleSaveSectionEdit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-300">Título da Seção *</label>
                      <input
                        type="text"
                        value={sectionNameInput}
                        onChange={(e) => setSectionNameInput(e.target.value)}
                        placeholder="Ex: Ofertas Relâmpago & Outlet"
                        required
                        className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                          isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-300">Subtítulo / Descrição</label>
                      <textarea
                        value={sectionDescInput}
                        onChange={(e) => setSectionDescInput(e.target.value)}
                        placeholder="Ex: Descontos exclusivos por tempo limitado"
                        rows={3}
                        className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                          isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                        }`}
                      />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setIsSectionModalOpen(false)}
                        className="px-5 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs hover:bg-amber-300 transition-all shadow-md cursor-pointer flex items-center space-x-2"
                      >
                        <Save className="h-4 w-4" />
                        <span>Salvar Alterações</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
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
                    placeholder="Ex: evidenicacalcados2025@gmail.com"
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
          <ErrorBoundary fallbackTitle="Gestão de Produtos & Estoque (MobLink ERP)">
            <MoblinkProductsManager />
          </ErrorBoundary>
        )}

        {/* TAB 8: CATEGORIES MANAGER */}
        {activeTab === 'categories' && (
          <div className="space-y-6 max-w-4xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                  <FolderTree className="h-6 w-6 text-amber-400" />
                  <span>Categorias da Loja</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Taxonomia oficial traduzida do e-commerce (exibindo apenas categorias e subcategorias tratadas)
                </p>
              </div>

              <button
                type="button"
                onClick={handleSyncCategoriesFromERP}
                disabled={isSyncingCategories}
                className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl flex items-center gap-2 transition-all shadow-xs shrink-0 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncingCategories ? 'animate-spin' : ''}`} />
                <span>{isSyncingCategories ? 'Sincronizando ERP...' : 'Sincronizar do ERP (MobLink)'}</span>
              </button>
            </div>

            {catSyncFeedback && (
              <div className={`p-4 rounded-xl text-xs flex items-center gap-3 ${
                catSyncFeedback.includes('Falha')
                  ? 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                  : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              }`}>
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{catSyncFeedback}</span>
              </div>
            )}

            {/* ADICIONAR NOVA CATEGORIA MANUAL */}
            <div className={`p-6 rounded-3xl border backdrop-blur-xl space-y-4 ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Plus className="h-4 w-4 text-amber-500" />
                Adicionar Nova Categoria Manual
              </h3>
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
                  type="button"
                  onClick={() => {
                    if (newCatName.trim()) {
                      const norm = normalizeCategoryName(newCatName.trim());
                      addCategory({ id: norm.toLowerCase().replace(/\s+/g, '-'), name: norm });
                      setNewCatName('');
                      addToast("Categoria Adicionada", `Categoria "${norm}" criada com sucesso!`);
                    }
                  }}
                  className="px-5 py-3 rounded-xl bg-amber-400 text-slate-950 font-black text-xs hover:bg-amber-300 cursor-pointer shadow-xs"
                >
                  Adicionar
                </button>
              </div>
            </div>

            {/* GRID DE CATEGORIAS E SUBCATEGORIAS TRADUZIDAS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {cleanCategories.length > 0 ? (
                cleanCategories.map((cat) => {
                  const isCatVisible = cat.visible !== false && cat.active !== false;

                  return (
                    <div key={cat.id} className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 transition-all shadow-xs ${
                      isDark ? 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}>
                      <div className="space-y-3">
                        {/* Cabeçalho da Categoria Traduzida */}
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`p-2 rounded-xl border shrink-0 ${
                              isCatVisible 
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' 
                                : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
                            }`}>
                              <FolderTree className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <h3 className={`font-extrabold text-sm truncate ${
                                isCatVisible ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500 line-through'
                              }`}>
                                {cat.name}
                              </h3>
                              <span className="text-[10px] text-slate-400 font-mono block">
                                {cat.subcategories?.length || 0} subcategoria(s)
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Toggle / Check Button de Visibilidade da Categoria */}
                            <label
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-extrabold cursor-pointer transition-all ${
                                isCatVisible
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                                  : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                              }`}
                              title={isCatVisible ? "Clique para ocultar esta categoria na loja" : "Clique para exibir esta categoria na loja"}
                            >
                              <input
                                type="checkbox"
                                checked={isCatVisible}
                                onChange={() => {
                                  const nextVisible = !isCatVisible;
                                  updateCategory(cat.id, { visible: nextVisible, active: nextVisible });
                                  addToast(
                                    nextVisible ? "Categoria Visível" : "Categoria Ocultada",
                                    `A categoria "${cat.name}" agora está ${nextVisible ? "visível" : "ocultada"} na loja.`
                                  );
                                }}
                                className="w-3.5 h-3.5 rounded text-amber-500 border-slate-300 focus:ring-amber-500 cursor-pointer"
                              />
                              {isCatVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                              <span>{isCatVisible ? 'Visível' : 'Oculta'}</span>
                            </label>

                            <button
                              type="button"
                              onClick={() => {
                                deleteCategory(cat.id);
                                addToast("Categoria Removida", `Categoria ${cat.name} foi excluída.`);
                              }}
                              title="Excluir Categoria"
                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Lista de Subcategorias Traduzidas */}
                        <div className="space-y-2 pt-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Subcategorias (Marque para exibir na loja):
                          </span>
                          
                          {cat.subcategories && cat.subcategories.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {cat.subcategories.map((sub: any) => {
                                const isSubVisible = sub.visible !== false && sub.active !== false;

                                return (
                                  <label
                                    key={sub.id || sub.name}
                                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border flex items-center gap-1.5 cursor-pointer transition-all ${
                                      isSubVisible
                                        ? isDark 
                                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20' 
                                          : 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100'
                                        : isDark 
                                          ? 'bg-slate-800/40 border-slate-800 text-slate-500 line-through hover:bg-slate-800/60' 
                                          : 'bg-slate-100 border-slate-200 text-slate-400 line-through hover:bg-slate-200'
                                    }`}
                                    title={isSubVisible ? `Subcategoria "${sub.name}" visível na loja` : `Subcategoria "${sub.name}" oculta na loja`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSubVisible}
                                      onChange={() => {
                                        const nextSubVisible = !isSubVisible;
                                        const updatedSubs = (cat.subcategories || []).map((s: any) => {
                                          if ((s.id && s.id === sub.id) || s.name === sub.name) {
                                            return { ...s, visible: nextSubVisible, active: nextSubVisible };
                                          }
                                          return s;
                                        });
                                        updateCategory(cat.id, { subcategories: updatedSubs });
                                        addToast(
                                          nextSubVisible ? "Subcategoria Visível" : "Subcategoria Ocultada",
                                          `A subcategoria "${sub.name}" agora está ${nextSubVisible ? "visível" : "ocultada"} na loja.`
                                        );
                                      }}
                                      className="w-3.5 h-3.5 rounded text-amber-500 border-slate-300 focus:ring-amber-500 cursor-pointer"
                                    />
                                    <Tag className={`h-3 w-3 ${isSubVisible ? 'text-amber-500' : 'text-slate-400'} shrink-0`} />
                                    <span>{sub.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">
                              Nenhuma subcategoria vinculada.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full p-8 rounded-2xl border text-center space-y-3 bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800">
                  <FolderTree className="h-8 w-8 text-amber-500 mx-auto" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Nenhuma categoria traduzida cadastrada. Clique no botão "Sincronizar do ERP (MobLink)" para importar a árvore tratada!
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 10: SALDÃO DE CALÇADOS (DESCONTO DE ESTOQUE BAIXO) */}
        {activeTab === 'saldao' && (
          <div className="space-y-8 max-w-5xl">
            <div>
              <div className="flex items-center space-x-3 mb-1">
                <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  <Tag className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight flex items-center space-x-2">
                    <span>Saldão de Calçados (Últimas Unidades)</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Defina o limite de estoque baixo e a porcentagem de desconto automática para impulsionar a venda de últimos pares de calçados.
                  </p>
                </div>
              </div>
            </div>

            {/* Painel de Controle de Regras do Saldão */}
            <form onSubmit={handleSaveSaldaoSettings} className={`p-6 sm:p-8 rounded-3xl border backdrop-blur-xl space-y-6 ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800/40">
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-rose-400 flex items-center space-x-2">
                    <Sparkles className="h-4 w-4" />
                    <span>Status da Promoção de Saldão</span>
                  </h3>
                  <p className="text-xs text-slate-400">Ative ou desative o desconto automático de saldão na vitrine.</p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={saldaoEnabledInput}
                    onChange={(e) => setSaldaoEnabledInput(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                  <span className="ml-3 text-xs font-bold text-slate-300">
                    {saldaoEnabledInput ? 'Saldão ATIVO na Loja' : 'Saldão Desativado'}
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-300">
                    Estoque Máximo para Entrar no Saldão (Unidades)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={saldaoMaxStockInput}
                      onChange={(e) => setSaldaoMaxStockInput(Number(e.target.value))}
                      className={`w-full p-3.5 rounded-xl text-sm border font-bold focus:outline-none focus:border-rose-500 ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                      }`}
                      placeholder="Ex: 2"
                    />
                    <span className="absolute right-3 top-3.5 text-xs text-slate-500 font-medium">pares ou menos</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Produtos de calçados com estoque ≤ este número entrarão automaticamente no Saldão.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-300">
                    Desconto em Porcentagem (%) sobre o Preço de Venda
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="80"
                      value={saldaoDiscountInput}
                      onChange={(e) => setSaldaoDiscountInput(Number(e.target.value))}
                      className={`w-full p-3.5 rounded-xl text-sm border font-black text-rose-500 focus:outline-none focus:border-rose-500 ${
                        isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'
                      }`}
                      placeholder="Ex: 20"
                    />
                    <span className="absolute right-3 top-3.5 text-xs text-slate-500 font-bold">% OFF</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Ex: Um calçado de R$ 200,00 com 20% OFF será vendido por R$ 160,00.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-300">
                  Texto do Banner / Chamada do Saldão
                </label>
                <input
                  type="text"
                  value={saldaoBannerInput}
                  onChange={(e) => setSaldaoBannerInput(e.target.value)}
                  className={`w-full p-3.5 rounded-xl text-xs border focus:outline-none focus:border-rose-500 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                  }`}
                  placeholder="Ex: 🔥 SALDÃO DE CALÇADOS - ÚLTIMAS UNIDADES COM ATÉ 20% OFF!"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800/40">
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <Info className="h-4 w-4 text-amber-400" />
                  <span>O desconto é aplicado instantaneamente para todos os clientes.</span>
                </div>

                <button
                  type="submit"
                  disabled={isSavingSaldao}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold text-xs shadow-lg shadow-rose-950/40 transition-all flex items-center space-x-2 cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSavingSaldao ? 'Salvando...' : 'Salvar e Aplicar Regras do Saldão'}</span>
                </button>
              </div>
            </form>

            {/* Resumo de Calçados no Saldão */}
            {(() => {
              const currentConfig: SaldaoConfig = {
                enabled: saldaoEnabledInput,
                maxStock: Number(saldaoMaxStockInput) || 2,
                discountPercent: Number(saldaoDiscountInput) || 20,
              };

              const saldaoProds = products.filter(p => isSaldaoProduct(p, currentConfig));

              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-black tracking-tight flex items-center space-x-2">
                        <span>Produtos Elegíveis no Saldão ({saldaoProds.length})</span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Lista em tempo real dos calçados com estoque ≤ {currentConfig.maxStock} pares.
                      </p>
                    </div>
                  </div>

                  {saldaoProds.length === 0 ? (
                    <div className={`p-8 text-center rounded-3xl border ${
                      isDark ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}>
                      <Package className="h-10 w-10 mx-auto mb-2 opacity-40 text-rose-500" />
                      <p className="text-sm font-bold">Nenhum calçado encontrado com estoque ≤ {currentConfig.maxStock} unidades.</p>
                      <p className="text-xs opacity-75 mt-1">Aumente o limite de estoque nas configurações acima se desejar incluir mais calçados.</p>
                    </div>
                  ) : (
                    <div className={`rounded-3xl border overflow-hidden backdrop-blur-xl ${
                      isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                    }`}>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${
                              isDark ? 'bg-slate-950/80 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                            }`}>
                              <th className="p-4">Produto</th>
                              <th className="p-4 text-center">Estoque Atual</th>
                              <th className="p-4 text-right">Preço De</th>
                              <th className="p-4 text-right">Preço Saldão ({currentConfig.discountPercent}% OFF)</th>
                              <th className="p-4 text-right">Economia Cliente</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/40 text-xs">
                            {saldaoProds.map(prod => {
                              const calc = getSaldaoProductPrice(prod, currentConfig);
                              const totalStock = Number(prod.stock ?? prod.saldo_loja ?? 0);
                              return (
                                <tr key={prod.id} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                                  <td className="p-4">
                                    <div className="flex items-center space-x-3">
                                      <img
                                        src={prod.images?.[0] || prod.imageUrl || prod.foto_uri || NO_PHOTO_SVG}
                                        alt={prod.name}
                                        className="w-10 h-10 rounded-xl object-cover border border-slate-700/40 shrink-0"
                                      />
                                      <div>
                                        <div className="font-bold line-clamp-1">{prod.name}</div>
                                        <div className="text-[10px] text-slate-500">COD/ID: {prod.moblinkId || prod.id}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-4 text-center">
                                    <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                      {totalStock} {totalStock === 1 ? 'par' : 'pares'}
                                    </span>
                                  </td>
                                  <td className="p-4 text-right text-slate-400 line-through font-medium">
                                    R$ {(calc.originalPrice || 0).toFixed(2).replace('.', ',')}
                                  </td>
                                  <td className="p-4 text-right font-black text-emerald-400 text-sm">
                                    R$ {(calc.price || 0).toFixed(2).replace('.', ',')}
                                  </td>
                                  <td className="p-4 text-right font-bold text-amber-400">
                                    - R$ {(calc.savedAmount || 0).toFixed(2).replace('.', ',')}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 8.5: GERENCIAMENTO DE OFERTAS & PROMOÇÕES */}
        {activeTab === 'promotions' && (
          <div className="space-y-8 max-w-6xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight flex items-center space-x-2">
                  <Gift className="h-6 w-6 text-amber-500 animate-pulse" />
                  <span>Gerenciamento de Ofertas e Campanhas Promocionais</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Crie e gerencie campanhas de ofertas com período de vigência, porcentagem ou valor de desconto e selecione os produtos participantes.
                </p>
              </div>

              <button
                onClick={handleOpenNewPromoModal}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center space-x-2 cursor-pointer shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>Nova Oferta Promocional</span>
              </button>
            </div>

            {/* Cards de Métricas e Estatísticas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`p-5 rounded-3xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">Total de Campanhas</span>
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                    <Gift className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-black mt-2">{promotions.length}</div>
                <div className="text-[10px] text-slate-500 mt-1">Ofertas cadastradas no sistema</div>
              </div>

              <div className={`p-5 rounded-3xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">Em Andamento</span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-emerald-400 mt-2">
                  {promotions.filter(p => getCampaignStatus(p) === 'active').length}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Vigentes e ativas no site agora</div>
              </div>

              <div className={`p-5 rounded-3xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">Agendadas</span>
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                    <Tag className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-amber-400 mt-2">
                  {promotions.filter(p => getCampaignStatus(p) === 'scheduled').length}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Aguardando início do período</div>
              </div>

              <div className={`p-5 rounded-3xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">Produtos Ofertados</span>
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-purple-400 mt-2">
                  {Array.from(new Set(promotions.filter(p => getCampaignStatus(p) === 'active').flatMap(p => p.productIds))).length}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Itens em oferta no catálogo</div>
              </div>
            </div>

            {/* Lista de Promoções Cadastradas */}
            <div className={`p-6 sm:p-8 rounded-3xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-6`}>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black tracking-tight text-white flex items-center space-x-2">
                  <Tag className="h-4 w-4 text-amber-400" />
                  <span>Campanhas Promocionais</span>
                </h3>
              </div>

              {promotions.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <Gift className="h-12 w-12 text-slate-500 mx-auto opacity-50" />
                  <h4 className="text-base font-bold">Nenhuma oferta promocional criada</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Crie campanhas como "Semana do Consumidor" ou "Ofertas de Inverno" definindo desconto e produtos participantes.
                  </p>
                  <button
                    onClick={handleOpenNewPromoModal}
                    className="px-4 py-2 bg-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer hover:bg-amber-400 transition-colors"
                  >
                    + Criar Primeira Oferta
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {promotions.map((promo) => {
                    const status = getCampaignStatus(promo);
                    const matchingProducts = products.filter(p => promo.productIds.includes(String(p.id)) || (p.moblinkId && promo.productIds.includes(String(p.moblinkId))));

                    return (
                      <div
                        key={promo.id}
                        className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 transition-all ${
                          isDark ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 shadow-xs'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                  status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse' :
                                  status === 'scheduled' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                  status === 'expired' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                                  'bg-slate-800 text-slate-400'
                                }`}>
                                  {status === 'active' ? '🟢 Em Andamento' :
                                   status === 'scheduled' ? '🟡 Agendada' :
                                   status === 'expired' ? '🔴 Expirada' :
                                   '⚪ Inativa'}
                                </span>

                                <span className="text-[10px] font-black uppercase text-amber-400 px-2 py-0.5 bg-amber-400/10 rounded-md border border-amber-400/20">
                                  {promo.discountType === 'percentage' ? `-${promo.discountValue}% OFF` : `-R$ ${(promo.discountValue || 0).toFixed(2).replace('.', ',')}`}
                                </span>
                              </div>

                              <h4 className="text-base font-black text-white mt-1.5 line-clamp-1">{promo.title}</h4>
                              {promo.description && (
                                <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{promo.description}</p>
                              )}
                            </div>

                            <div className="flex items-center space-x-1 shrink-0">
                              <button
                                onClick={() => handleOpenEditPromoModal(promo)}
                                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                                title="Editar Oferta"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => deletePromotion(promo.id)}
                                className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                                title="Excluir Oferta"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="text-xs text-slate-400 space-y-1 bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
                            <div className="flex items-center justify-between">
                              <span className="font-bold">Período de Vigência:</span>
                              <span className="font-medium text-slate-200">
                                {promo.startDate ? promo.startDate : 'Início imediato'} até {promo.endDate ? promo.endDate : 'Indefinido'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="font-bold">Produtos Participantes:</span>
                              <span className="font-black text-amber-400">
                                {promo.productIds.length} {promo.productIds.length === 1 ? 'produto' : 'produtos'}
                              </span>
                            </div>
                          </div>

                          {/* Miniaturas de Produtos Participantes */}
                          {matchingProducts.length > 0 && (
                            <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                              {matchingProducts.slice(0, 5).map(p => (
                                <div key={p.id} className="w-9 h-9 rounded-lg border border-slate-800 bg-white p-0.5 shrink-0 overflow-hidden" title={p.name}>
                                  <img src={p.images?.[0] || p.imageUrl || p.foto_uri} alt={p.name} className="w-full h-full object-contain" />
                                </div>
                              ))}
                              {matchingProducts.length > 5 && (
                                <span className="text-[10px] font-extrabold text-slate-400 shrink-0">
                                  +{matchingProducts.length - 5} outros
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                          <span className="text-[11px] text-slate-400">
                            Status no E-commerce:
                          </span>
                          <button
                            onClick={() => togglePromotionStatus(promo.id)}
                            className={`px-3 py-1 rounded-full text-xs font-black cursor-pointer transition-all ${
                              promo.active
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                            }`}
                          >
                            {promo.active ? 'Ativa' : 'Desativada'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 9: SETTINGS & DANGER ZONE (RESET LAYOUT) */}
        {activeTab === 'settings' && (
          isAdmin ? (
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
          ) : (
            <div className="p-10 text-center space-y-4 rounded-3xl border border-amber-500/20 bg-amber-500/5 max-w-lg mx-auto my-12 backdrop-blur-xl">
              <Shield className="h-12 w-12 text-amber-500 mx-auto" />
              <h3 className="text-xl font-black">Acesso Restrito ao Administrador</h3>
              <p className="text-xs text-slate-400">Esta área de Configurações Gerais do Sistema é de acesso exclusivo para administradores da loja.</p>
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="px-5 py-2.5 rounded-2xl bg-amber-400 text-slate-950 font-black text-xs hover:bg-amber-300 transition-all shadow-md cursor-pointer inline-flex items-center space-x-2"
              >
                <span>Voltar ao Dashboard</span>
              </button>
            </div>
          )
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
                  addToast('Configurações Restauradas!', 'Todas as seções, banners e textos retornaram ao padrão de fábrica no Firestore.', 'info');
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

      {/* MODAL: CADASTRO DE NOVO MEMBRO DA EQUIPE (ADMIN / VENDEDOR) */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 sm:p-8 rounded-3xl border shadow-2xl space-y-6 animate-in fade-in zoom-in duration-200 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white shadow-black/80' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black">Cadastrar Usuário da Equipe</h3>
                  <p className="text-[11px] text-slate-400">Pré-cadastro de administradores e vendedores</p>
                </div>
              </div>
              <button
                onClick={() => setIsTeamModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterTeamMemberSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 block">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={teamNameInput}
                  onChange={(e) => setTeamNameInput(e.target.value)}
                  placeholder="Ex: Carlos Andrade"
                  className={`w-full px-4 py-2.5 text-xs border rounded-xl focus:outline-none transition-all ${
                    isDark 
                      ? 'bg-slate-950/80 border-slate-800 text-white placeholder-slate-500 focus:border-amber-400' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-800'
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 block">
                  E-mail de Acesso
                </label>
                <input
                  type="email"
                  required
                  value={teamEmailInput}
                  onChange={(e) => setTeamEmailInput(e.target.value)}
                  placeholder="vendedor@evidencia.com"
                  className={`w-full px-4 py-2.5 text-xs border rounded-xl focus:outline-none transition-all ${
                    isDark 
                      ? 'bg-slate-950/80 border-slate-800 text-white placeholder-slate-500 focus:border-amber-400' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-800'
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 block">
                  Perfil de Acesso (Permissão)
                </label>
                <select
                  value={teamRoleInput}
                  onChange={(e) => setTeamRoleInput(e.target.value as 'admin' | 'seller')}
                  className={`w-full px-4 py-2.5 text-xs border rounded-xl focus:outline-none transition-all ${
                    isDark 
                      ? 'bg-slate-950/80 border-slate-800 text-white focus:border-amber-400' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-800'
                  }`}
                >
                  <option value="seller">Vendedor (Atendimento & Vendas)</option>
                  <option value="admin">Administrador (Acesso Total)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 block">
                  Senha Temporária
                </label>
                <input
                  type="text"
                  required
                  value={teamTempPassInput}
                  onChange={(e) => setTeamTempPassInput(e.target.value)}
                  placeholder="evidencia2026"
                  className={`w-full px-4 py-2.5 text-xs border rounded-xl font-mono focus:outline-none transition-all ${
                    isDark 
                      ? 'bg-slate-950/80 border-slate-800 text-amber-400 focus:border-amber-400' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-800'
                  }`}
                />
                <p className="text-[10px] text-slate-400 italic">
                  * O usuário será obrigado a redefinir esta senha no primeiro login.
                </p>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(false)}
                  className="flex-1 py-3 px-4 text-xs font-bold rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 text-xs font-black uppercase tracking-wider rounded-xl bg-amber-400 text-slate-950 hover:bg-amber-300 transition-all shadow-md cursor-pointer"
                >
                  Salvar Cadastro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CRIAR / EDITAR OFERTA PROMOCIONAL */}
      {isPromoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className={`w-full max-w-3xl rounded-3xl border shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] flex flex-col ${
            isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-black flex items-center space-x-2 text-amber-400">
                  <Gift className="h-5 w-5" />
                  <span>{editingPromo ? 'Editar Oferta Promocional' : 'Nova Oferta Promocional'}</span>
                </h3>
                <p className="text-xs text-slate-400">Configure os detalhes, o desconto e os produtos que participarão da campanha.</p>
              </div>
              <button
                onClick={() => setIsPromoModalOpen(false)}
                className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSavePromo} className="space-y-5 overflow-y-auto pr-1 flex-1">
              {/* Título & Descrição */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-300">Título da Promoção *</label>
                  <input
                    type="text"
                    required
                    value={promoTitle}
                    onChange={(e) => setPromoTitle(e.target.value)}
                    placeholder="Ex: Semana do Consumidor, Oferta de Inverno"
                    className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-300">Descrição / Chamada (Opcional)</label>
                  <input
                    type="text"
                    value={promoDescription}
                    onChange={(e) => setPromoDescription(e.target.value)}
                    placeholder="Ex: Até 20% de desconto em produtos selecionados!"
                    className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                    }`}
                  />
                </div>
              </div>

              {/* Datas de Vigência & Regra de Desconto */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-300">Data Inicial *</label>
                  <input
                    type="date"
                    required
                    value={promoStartDate}
                    onChange={(e) => setPromoStartDate(e.target.value)}
                    className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-300">Data Final *</label>
                  <input
                    type="date"
                    required
                    value={promoEndDate}
                    onChange={(e) => setPromoEndDate(e.target.value)}
                    className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-300">Tipo de Desconto</label>
                  <select
                    value={promoDiscountType}
                    onChange={(e) => setPromoDiscountType(e.target.value as any)}
                    className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                    }`}
                  >
                    <option value="percentage">Porcentagem (%)</option>
                    <option value="fixed">Valor Fixo (R$)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-300">
                    {promoDiscountType === 'percentage' ? 'Desconto (%) *' : 'Desconto (R$) *'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    step={promoDiscountType === 'percentage' ? '1' : '0.5'}
                    required
                    value={promoDiscountValue}
                    onChange={(e) => setPromoDiscountValue(Number(e.target.value))}
                    className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                    }`}
                  />
                </div>
              </div>

              {/* SELEÇÃO DE PRODUTOS PARTICIPANTES */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="block text-xs font-black text-amber-400 uppercase tracking-wider">
                      Produtos Participantes ({promoProductIds.length} selecionados)
                    </label>
                    <p className="text-[11px] text-slate-400">Marque os produtos que terão o desconto desta oferta.</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        const matchingIds = products.filter(p => p.visible).map(p => String(p.id));
                        setPromoProductIds(Array.from(new Set([...promoProductIds, ...matchingIds])));
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 font-bold text-[10px] uppercase border border-amber-500/30 cursor-pointer hover:bg-amber-500/30"
                    >
                      Selecionar Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setPromoProductIds([])}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 font-bold text-[10px] uppercase border border-slate-700 cursor-pointer hover:bg-slate-700"
                    >
                      Limpar Seleção
                    </button>
                  </div>
                </div>

                {/* Filtro de Busca de Produtos dentro da Modal */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={promoProductSearch}
                      onChange={(e) => setPromoProductSearch(e.target.value)}
                      placeholder="Buscar produto por nome, código ou SKU..."
                      className={`w-full pl-9 pr-3 py-2 text-xs border rounded-xl focus:outline-none ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                      }`}
                    />
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  </div>

                  <select
                    value={promoCategoryFilter}
                    onChange={(e) => setPromoCategoryFilter(e.target.value)}
                    className={`w-full p-2 text-xs border rounded-xl focus:outline-none ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                    }`}
                  >
                    <option value="TODAS">Todas as Categorias</option>
                    <option value="CALÇADOS">Calçados</option>
                    <option value="CONFECÇÕES">Confecções</option>
                    <option value="ACESSÓRIOS">Acessórios</option>
                    <option value="DIVERSOS">Diversos</option>
                  </select>
                </div>

                {/* Grid de Seleção de Produtos */}
                <div className="max-h-60 overflow-y-auto border border-slate-800 rounded-2xl p-3 space-y-2 bg-slate-900/40">
                  {products.filter(prod => {
                    if (!prod.visible) return false;
                    if (promoCategoryFilter !== 'TODAS') {
                      const catUpper = (prod.category || prod.nome_grupo || '').toUpperCase();
                      if (!catUpper.includes(promoCategoryFilter.toUpperCase())) return false;
                    }
                    if (promoProductSearch) {
                      const q = promoProductSearch.toLowerCase().trim();
                      const matchName = prod.name.toLowerCase().includes(q);
                      const matchCode = String(prod.id).includes(q) || (prod.sku && prod.sku.toLowerCase().includes(q));
                      if (!matchName && !matchCode) return false;
                    }
                    return true;
                  }).map(prod => {
                    const isSelected = promoProductIds.includes(String(prod.id)) || (prod.moblinkId && promoProductIds.includes(String(prod.moblinkId)));
                    const calcPrice = calculateCampaignPrice(prod.price, {
                      id: '', title: '', startDate: '', endDate: '',
                      discountType: promoDiscountType,
                      discountValue: promoDiscountValue,
                      productIds: [], active: true
                    });

                    return (
                      <div
                        key={prod.id}
                        onClick={() => handleToggleProductInPromo(String(prod.id))}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/40 text-white'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="h-4 w-4 text-amber-500 rounded border-slate-700 focus:ring-amber-400"
                          />
                          <div className="w-8 h-8 rounded-lg bg-white p-0.5 overflow-hidden shrink-0 border border-slate-800">
                            <img src={prod.images?.[0] || prod.imageUrl || prod.foto_uri} alt={prod.name} className="w-full h-full object-contain" />
                          </div>
                          <div>
                            <div className="text-xs font-bold line-clamp-1">{prod.name}</div>
                            <div className="text-[10px] text-slate-500">{prod.category} • SKU: {prod.sku || prod.id}</div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-black text-amber-400">R$ {(calcPrice || 0).toFixed(2).replace('.', ',')}</div>
                          <div className="text-[10px] text-slate-500 line-through">De: R$ {(prod.price || 0).toFixed(2).replace('.', ',')}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPromoModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
                >
                  {editingPromo ? 'Salvar Alterações' : 'Criar Promoção'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FLOATING TOAST NOTIFICATION CONTAINER */}

      <div className="fixed top-6 right-6 z-50 flex flex-col space-y-3 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl border backdrop-blur-2xl shadow-2xl flex items-start space-x-3 transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
              toast.type === 'success' ? 'bg-slate-900/95 border-emerald-500/50 text-white shadow-emerald-950/50' :
              toast.type === 'error' ? 'bg-slate-900/95 border-rose-500/50 text-white shadow-rose-950/50' :
              'bg-slate-900/95 border-amber-500/50 text-white shadow-amber-950/50'
            }`}
          >
            <div className={`p-2 rounded-xl shrink-0 ${
              toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
              toast.type === 'error' ? 'bg-rose-500/20 text-rose-400' :
              'bg-amber-500/20 text-amber-400'
            }`}>
              {toast.type === 'success' && <CheckCircle2 className="h-5 w-5" />}
              {toast.type === 'error' && <AlertCircle className="h-5 w-5" />}
              {toast.type === 'info' && <Sparkles className="h-5 w-5" />}
            </div>

            <div className="flex-1 space-y-0.5 pt-0.5">
              <h4 className="text-xs font-black tracking-wide">{toast.title}</h4>
              <p className="text-[11px] text-slate-300 font-medium leading-snug">{toast.message}</p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
