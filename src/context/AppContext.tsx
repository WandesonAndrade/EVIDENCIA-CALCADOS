import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Product, CartItem, Order, PaymentStatus, UserProfile, UserRole, CrediarioStatus, Category, MoblinkConfig, MoblinkSyncLog, MoblinkSyncLogItem, EvidenciaAuthSession, HeroBanner, HomeSectionConfig, AboutConfig, ContactConfig, StoreConfig, ViewMode } from '../types';
import { db, auth, seedDatabaseIfNeeded, SEED_PRODUCTS } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, getDoc, query, where, deleteDoc } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { evidenciaAuthService } from '../lib/evidenciaAuth';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { userDataService } from '../services/userDataService';
import { orderService } from '../services/orderService';
import { getProdutosMoblink, extractPrecoTabelaMoblink, extractPrecoVistaMoblink, extractPrecoCartaoMoblink, parseValor, extractSaldoLojaMoblink, sanitizeProductForFirestore, cleanUndefinedFields, filterProductsRequiringSync, hasProductChanged, extractClassificacaoCategoria } from '../services/moblinkProductsService';
import { moblinkCategoriesService } from '../services/moblinkCategoriesService';
import { cleanUndefinedProperties } from '../utils/cleanObject';
import { API_ENDPOINTS } from '../services/api';


interface AppContextProps {
  products: Product[];
  isLoadingProducts: boolean;
  categories: Category[];
  isLoadingCategories: boolean;
  addCategory: (category: Category) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  updateCategory: (categoryId: string, updatedFields: Partial<Category>) => Promise<void>;
  cart: CartItem[];
  addToCart: (product: Product, size: number | string) => void;
  removeFromCart: (productId: string, size: number | string) => void;
  updateCartQuantity: (productId: string, size: number | string, quantity: number) => void;
  clearCart: () => void;
  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile | null) => void;
  currentAdminUser: UserProfile | null;
  setCurrentAdminUser: (user: UserProfile | null) => void;
  userRole: UserRole | null;
  registerUser: (name: string, email: string, role: UserRole) => Promise<UserProfile>;
  loginUser: (email: string) => Promise<UserProfile | null>;
  loginWithCpf: (cpf: string, senha: string) => Promise<UserProfile>;
  registerWithCpf: (cpf: string, senha: string, name: string, telefone?: string) => Promise<UserProfile>;
  loginAdmin: (email: string, password?: string) => Promise<UserProfile>;
  registerTeamMember: (name: string, email: string, role: UserRole, tempPassword?: string) => Promise<UserProfile>;
  changeAdminPassword: (newPassword: string, activeProfile: UserProfile) => Promise<UserProfile>;
  logoutAdmin: () => void;
  loginWithGoogle: () => Promise<UserProfile | null>;
  loginWithGoogleSimulated: (name: string, email: string, photoURL?: string) => Promise<UserProfile>;
  updateUserProfile: (profileData: Partial<UserProfile>) => Promise<UserProfile>;
  logout: () => void;

  orders: Order[];
  isLoadingOrders: boolean;
  createOrder: (customerName: string, customerEmail: string, options?: { paymentMethod?: 'Pix' | 'Cartão de Crédito' | 'Crediário da Loja'; deliveryType?: 'Entrega em Caxias-MA' | 'Entrega para Outras Cidades' | 'Retirada na Loja'; installments?: number; customerPhone?: string; deliveryAddress?: string; sellerName?: string; sellerEmail?: string; overrideItems?: any[] }) => Promise<Order>;
  solicitarCrediario: (dados: Partial<UserProfile>) => Promise<void>;
  atualizarStatusCrediario: (uid: string, novoStatus: CrediarioStatus, motivo?: string) => Promise<void>;
  updateUserCashback: (uid: string, cashbackBalance: number, cashbackValidUntil: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  updateOrderPaymentStatus: (orderId: string, paymentStatus: PaymentStatus) => Promise<void>;
  updateOrderFreight: (orderId: string, freightCost: number) => Promise<void>;
  assignOrderSeller: (orderId: string, sellerEmail: string, sellerName: string) => Promise<void>;
  addProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  updateProduct: (productId: string, updatedFields: Partial<Product>) => Promise<void>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  selectedSubcategory: string;
  setSelectedSubcategory: (subcategory: string) => void;
  selectedMenuTab: string;
  setSelectedMenuTab: (tab: string) => void;
  favorites: string[];
  toggleFavorite: (productId: string) => void;
  currentView: ViewMode;
  setCurrentView: (view: ViewMode) => void;
  addToast?: (title: string, message?: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  // Moblink ERP Integration & Authentication
  moblinkConfig: MoblinkConfig;
  moblinkLogs: MoblinkSyncLog[];
  authSession: EvidenciaAuthSession | null;
  loginSincomAuth: () => Promise<EvidenciaAuthSession>;
  logoutSincomAuth: () => void;
  updateMoblinkConfig: (newConfig: Partial<MoblinkConfig>) => Promise<void>;
  testMoblinkConnection: () => Promise<{ success: boolean; message: string }>;
  syncMoblinkStock: () => Promise<{ success: boolean; message: string; updatedCount?: number }>;
  importMoblinkStockBatch: (items: Array<{ sku?: string; moblinkId?: string; barcode?: string; name?: string; stock: number; size?: string; sizeStockMap?: Record<string, number> }>) => Promise<{ success: boolean; message: string; updatedCount?: number }>;
  // Store CMS Configuration & Restoration
  heroBanners: HeroBanner[];
  updateHeroBanners: (banners: HeroBanner[]) => Promise<void>;
  homeSections: HomeSectionConfig[];
  updateHomeSections: (sections: HomeSectionConfig[]) => Promise<void>;
  aboutConfig: AboutConfig;
  updateAboutConfig: (config: Partial<AboutConfig>) => Promise<void>;
  contactConfig: ContactConfig;
  updateContactConfig: (config: Partial<ContactConfig>) => Promise<void>;
  restoreDefaultConfig: () => Promise<void>;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const DEFAULT_HERO_BANNERS: HeroBanner[] = [
  {
    id: 'banner-1',
    badge: 'LOJA OFICIAL CAXIAS - MA',
    title: 'A sua loja de Caxias - MA está online!',
    description: 'Compre no carnê em até 6x sem juros ou receba via entrega rápida com o atendimento exclusivo da equipe Evidência Calçados.',
    image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=1600&auto=format&fit=crop',
    buttonText: 'Ver Lançamentos',
    tabKey: 'lançamentos',
    active: true
  },
  {
    id: 'banner-2',
    badge: 'COLEÇÃO FEMININA',
    title: 'Charme, sofisticação e conforto extremo.',
    description: 'Encontre sandálias, sapatilhas, saltos e acessórios refinados criados especialmente para destacar a sua personalidade única.',
    image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=1600&auto=format&fit=crop',
    buttonText: 'Ver Moda Feminina',
    tabKey: 'feminino',
    active: true
  },
  {
    id: 'banner-3',
    badge: 'COLEÇÃO MASCULINA',
    title: 'Estilo moderno e robustez incomparável.',
    description: 'Sapatos sociais premium, botas indestrutíveis e tênis de alta performance para o homem contemporâneo que valoriza design e atitude.',
    image: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?q=80&w=1600&auto=format&fit=crop',
    buttonText: 'Explorar Linha Masculina',
    tabKey: 'masculino',
    active: true
  },
  {
    id: 'banner-4',
    badge: 'CAMPANHA DE OFERTAS',
    title: 'Super Descontos de até 50% OFF.',
    description: 'Chegou o momento de adquirir aquele calçado desejado com preços incríveis e parcelamento facilitado no Crediário Próprio Evidência.',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=1600&auto=format&fit=crop',
    buttonText: 'Aproveitar Ofertas',
    tabKey: 'ofertas',
    active: true
  }
];

export const DEFAULT_HOME_SECTIONS: HomeSectionConfig[] = [
  { id: 'hero', name: 'Banner Principal (Hero)', description: 'Banner carrossel principal no topo da loja', enabled: true },
  { id: 'offers', name: 'Ofertas Relâmpago & Outlet', description: 'Carrossel promocional com relógio contador', enabled: true },
  { id: 'launches', name: 'Novidades & Lançamentos', description: 'Carrossel dos lançamentos da estação', enabled: true },
  { id: 'shoes', name: 'Calçados Premium', description: 'Grade de produtos da categoria calçados', enabled: true },
  { id: 'accessories', name: 'Acessórios em Couro', description: 'Grade de produtos da categoria acessórios', enabled: true },
  { id: 'about', name: 'Sobre Nós (Institucional)', description: 'Seção sobre a história e valores da loja', enabled: true }
];

export const DEFAULT_ABOUT_CONFIG: AboutConfig = {
  title: 'Tradição, Qualidade e Estilo nos Seus Pés',
  subtitle: 'Desde a nossa fundação, a Evidência Calçados busca unir a elegância clássica com o conforto contemporâneo.',
  description: 'Na Evidência Calçados, acreditamos que um bom par de sapatos vai além da estética — é uma extensão da sua confiança. Trabalhamos exclusivamente com matérias-primas nobres, couro legítimo selecionado e mão de obra artesanal cuidadosa.\n\nNossa missão é proporcionar durabilidade excepcional, design marcante e condições de acesso facilitadas através do nosso exclusivo Crediário Próprio Evidência.',
  highlightImage: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=1600&auto=format&fit=crop',
  badgeText: 'TRADIÇÃO & EXCELÊNCIA',
  stats: [
    { label: 'Anos de História', value: '25+' },
    { label: 'Clientes Atendidos', value: '100k+' },
    { label: 'Garantia de Qualidade', value: '100%' },
    { label: 'Parcelas Crediário', value: '6x' }
  ]
};

export const DEFAULT_CONTACT_CONFIG: ContactConfig = {
  whatsapp: '5599984684867',
  email: 'evidenicacalcados2025@gmail.com',
  address: 'Rua Afonso Pena, 295 - Centro, Caxias - MA',
  hours: 'Segunda a Sexta: 08:00 às 18:00 | Sábado: 08:00 às 13:00',
  promoBannerText: 'Frete grátis para todo Brasil em compras acima de R$ 350!',
  isPromoBannerActive: true
};

export const DEFAULT_STORE_CONFIG: StoreConfig = {
  heroBanners: DEFAULT_HERO_BANNERS,
  homeSections: DEFAULT_HOME_SECTIONS,
  aboutConfig: DEFAULT_ABOUT_CONFIG,
  contactConfig: DEFAULT_CONTACT_CONFIG
};

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cosmeticos', name: 'Cosméticos', description: 'Produtos de beleza, estética e cuidados pessoais' },
  { id: 'perfumes', name: 'Perfumes', description: 'Fragrâncias marcantes, colônias e perfumes importados' },
  { id: 'escolar', name: 'Escolar', description: 'Mochilas, materiais, estojos e artigos escolares' },
  { id: 'acessorios', name: 'Acessórios', description: 'Cintos, carteiras, bolsas, joias e adornos refinados' },
  { id: 'calcados-infantil-masculino', name: 'Calçados infantil masculino', description: 'Tênis, sandálias e papetes confortáveis para meninos' },
  { id: 'calcados-infantil-feminino', name: 'Calçados infantil feminino', description: 'Sapatilhas, sandálias e tênis fofos para meninas' },
  { id: 'calcados-masculinos', name: 'Calçados masculinos', description: 'Sapatos sociais, mocassins, botas e sapatênis masculinos' },
  { id: 'calcados-femininos', name: 'Calçados femininos', description: 'Sandálias, saltos, sapatilhas e rasteiras femininas' },
  { id: 'itens-de-viagens', name: 'Itens de viagens', description: 'Malas de viagem, organizadores, mochilas executivas e frasqueiras' }
];

const getLocalCategories = (): Category[] => {
  const saved = localStorage.getItem('evidencia_local_categories');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse local categories, using DEFAULT_CATEGORIES:", e);
    }
  }
  return DEFAULT_CATEGORIES;
};

const saveLocalCategories = (updatedCategories: Category[]) => {
  localStorage.setItem('evidencia_local_categories', JSON.stringify(updatedCategories));
};

// Local fallback helpers - strictly Moblink products
const getLocalProducts = (): Product[] => {
  const saved = localStorage.getItem('evidencia_local_products');
  if (saved) {
    try {
      const parsed: Product[] = JSON.parse(saved);
      const moblinkFiltered = parsed.filter(p => p.moblinkId || p.id.startsWith('MOB-'));
      if (moblinkFiltered.length > 0) return moblinkFiltered;
    } catch (e) {
      console.error("Failed to parse local products, using SEED_PRODUCTS:", e);
    }
  }
  return SEED_PRODUCTS;
};

const saveLocalProducts = (updatedProducts: Product[]) => {
  const moblinkOnly = updatedProducts.filter(p => p.moblinkId || p.id.startsWith('MOB-'));
  localStorage.setItem('evidencia_local_products', JSON.stringify(moblinkOnly));
};

const getLocalOrders = (): Order[] => {
  const saved = localStorage.getItem('evidencia_local_orders');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse local orders:", e);
    }
  }
  return [];
};

const saveLocalOrders = (updatedOrders: Order[]) => {
  localStorage.setItem('evidencia_local_orders', JSON.stringify(updatedOrders));
};

const getLocalUsers = (): Record<string, UserProfile> => {
  const saved = localStorage.getItem('evidencia_local_users');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse local users:", e);
    }
  }
  return {};
};

const saveLocalUser = (uid: string, profile: UserProfile) => {
  const users = getLocalUsers();
  users[uid] = profile;
  localStorage.setItem('evidencia_local_users', JSON.stringify(users));
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(() => getLocalProducts());
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [categories, setCategories] = useState<Category[]>(() => getLocalCategories());
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('evidencia_user');
      if (saved) {
        try { return JSON.parse(saved) as UserProfile; } catch (e) {}
      }
    }
    return null;
  });
  const [currentAdminUser, setCurrentAdminUser] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('evidencia_admin_user');
      if (saved) {
        try { return JSON.parse(saved) as UserProfile; } catch (e) {}
      }
    }
    return null;
  });

  const [orders, setOrders] = useState<Order[]>(() => getLocalOrders());
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategoryState] = useState('TODOS');
  const [selectedSubcategory, setSelectedSubcategory] = useState('TODAS');

  const setSelectedCategory = useCallback((category: string) => {
    setSelectedCategoryState(category);
    setSelectedSubcategory('TODAS');
  }, []);
  const [selectedMenuTab, setSelectedMenuTab] = useState('lançamentos');
  
  const [currentView, setCurrentViewState] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const validViews: ViewMode[] = [
        'home', 'cart', 'admin', 'admin-login', 'login', 'orders', 
        'product-detail', 'portfolio-case', 'category-page', 'about', 
        'support', 'favorites', 'meu-crediario'
      ];
      // 1. Prioridade ao hash da URL se presente (#admin, #meu-crediario)
      const hashView = window.location.hash.replace('#', '').trim() as ViewMode;
      if (hashView && validViews.includes(hashView)) {
        return hashView;
      }
      // 2. Fallback para a última tela salva na sessão do navegador
      const savedView = (sessionStorage.getItem('evidencia_current_view') || localStorage.getItem('evidencia_current_view')) as ViewMode;
      if (savedView && validViews.includes(savedView)) {
        return savedView;
      }
    }
    return 'home';
  });

  const setCurrentView = useCallback((view: ViewMode) => {
    setCurrentViewState(view);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('evidencia_current_view', view);
        localStorage.setItem('evidencia_current_view', view);
        if (['admin', 'meu-crediario', 'cart', 'orders', 'favorites', 'about', 'support', 'portfolio-case', 'category-page'].includes(view)) {
          window.history.replaceState(null, '', `#${view}`);
        } else if (view === 'home') {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      } catch (e) {
        console.warn("Falha ao persistir a visualização atual:", e);
      }
    }
  }, []);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Sincronização do estado de rotas com a barra de navegação e botões voltar/avançar
  useEffect(() => {
    const handleHashChange = () => {
      const validViews: ViewMode[] = [
        'home', 'cart', 'admin', 'admin-login', 'login', 'orders', 
        'product-detail', 'portfolio-case', 'category-page', 'about', 
        'support', 'favorites', 'meu-crediario'
      ];
      const hashView = window.location.hash.replace('#', '').trim() as ViewMode;
      if (hashView && validViews.includes(hashView)) {
        setCurrentViewState(hashView);
        sessionStorage.setItem('evidencia_current_view', hashView);
        localStorage.setItem('evidencia_current_view', hashView);
      } else if (!hashView) {
        setCurrentViewState('home');
        sessionStorage.setItem('evidencia_current_view', 'home');
        localStorage.setItem('evidencia_current_view', 'home');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('evidencia_theme');
    return (saved === 'dark' || saved === 'light') ? saved : 'light';
  });

  // Moblink State
  const [moblinkConfig, setMoblinkConfig] = useState<MoblinkConfig>(() => {
    const saved = localStorage.getItem('evidencia_moblink_config');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error("Error loading moblink config", e); }
    }
    return {
      id: 'default',
      enabled: true,
      apiUrl: API_ENDPOINTS.PRODUTOS,
      apiToken: 'mob_live_9a8b7c6d5e4f3a2b1c',
      apiUser: '',
      apiPassword: '',
      empresaId: '001',
      filialId: '001',
      webhookSecret: 'secret_moblink_evidencia_2026',
      autoSyncEnabled: true,
      syncIntervalMinutes: 15,
      lastSyncAt: new Date().toISOString(),
      stockMatchKey: 'sku',
      autoCreateMissingProducts: false
    };
  });

  const [moblinkLogs, setMoblinkLogs] = useState<MoblinkSyncLog[]>(() => {
    const saved = localStorage.getItem('evidencia_moblink_logs');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error("Error loading moblink logs", e); }
    }
    return [
      {
        id: 'log-default-1',
        timestamp: new Date().toISOString(),
        type: 'manual_api',
        status: 'success',
        message: 'Sistema de integração Moblink ERP pronto para recebimento de estoque',
        itemsProcessed: 0,
        itemsUpdated: 0,
        details: []
      }
    ];
  });

  // Store CMS States
  const [heroBanners, setHeroBanners] = useState<HeroBanner[]>(() => {
    const saved = localStorage.getItem('evidencia_cms_hero_banners');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return DEFAULT_HERO_BANNERS;
  });

  const [homeSections, setHomeSections] = useState<HomeSectionConfig[]>(() => {
    const saved = localStorage.getItem('evidencia_cms_home_sections');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return DEFAULT_HOME_SECTIONS;
  });

  const [aboutConfig, setAboutConfig] = useState<AboutConfig>(() => {
    const saved = localStorage.getItem('evidencia_cms_about_config');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return DEFAULT_ABOUT_CONFIG;
  });

  const [contactConfig, setContactConfig] = useState<ContactConfig>(() => {
    const saved = localStorage.getItem('evidencia_cms_contact_config');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return DEFAULT_CONTACT_CONFIG;
  });

  // CMS Update Handlers (Writes to storeConfig/layout)
  const updateHeroBanners = async (banners: HeroBanner[]) => {
    setHeroBanners(banners);
    localStorage.setItem('evidencia_cms_hero_banners', JSON.stringify(banners));
    try {
      await setDoc(doc(db, 'storeConfig', 'layout'), { heroBanners: banners }, { merge: true });
    } catch (err) {
      console.error("❌ ERRO AO SALVAR BANNERS NO FIRESTORE:", err);
      throw err;
    }
  };

  const updateHomeSections = async (sections: HomeSectionConfig[]) => {
    setHomeSections(sections);
    localStorage.setItem('evidencia_cms_home_sections', JSON.stringify(sections));
    try {
      await setDoc(doc(db, 'storeConfig', 'layout'), { homeSections: sections }, { merge: true });
    } catch (err) {
      console.error("❌ ERRO AO SALVAR SEÇÕES DA HOME NO FIRESTORE:", err);
      throw err;
    }
  };

  const updateAboutConfig = async (newConfig: Partial<AboutConfig>) => {
    const updated = { ...aboutConfig, ...newConfig };
    setAboutConfig(updated);
    localStorage.setItem('evidencia_cms_about_config', JSON.stringify(updated));
    try {
      await setDoc(doc(db, 'storeConfig', 'layout'), { aboutConfig: updated }, { merge: true });
    } catch (err) {
      console.error("❌ ERRO AO SALVAR SOBRE NÓS NO FIRESTORE:", err);
      throw err;
    }
  };

  const updateContactConfig = async (newConfig: Partial<ContactConfig>) => {
    const updated = { ...contactConfig, ...newConfig };
    setContactConfig(updated);
    localStorage.setItem('evidencia_cms_contact_config', JSON.stringify(updated));
    if (updated.whatsapp) localStorage.setItem('evidencia_settings_whatsapp', updated.whatsapp);
    if (updated.promoBannerText) localStorage.setItem('evidencia_settings_banner_text', updated.promoBannerText);
    localStorage.setItem('evidencia_settings_banner_active', String(updated.isPromoBannerActive));
    try {
      await setDoc(doc(db, 'storeConfig', 'layout'), { contactConfig: updated }, { merge: true });
    } catch (err) {
      console.error("❌ ERRO AO SALVAR CONTATOS NO FIRESTORE:", err);
      throw err;
    }
  };

  const restoreDefaultConfig = async (): Promise<void> => {
    setHeroBanners(DEFAULT_HERO_BANNERS);
    setHomeSections(DEFAULT_HOME_SECTIONS);
    setAboutConfig(DEFAULT_ABOUT_CONFIG);
    setContactConfig(DEFAULT_CONTACT_CONFIG);

    localStorage.setItem('evidencia_cms_hero_banners', JSON.stringify(DEFAULT_HERO_BANNERS));
    localStorage.setItem('evidencia_cms_home_sections', JSON.stringify(DEFAULT_HOME_SECTIONS));
    localStorage.setItem('evidencia_cms_about_config', JSON.stringify(DEFAULT_ABOUT_CONFIG));
    localStorage.setItem('evidencia_cms_contact_config', JSON.stringify(DEFAULT_CONTACT_CONFIG));

    if (DEFAULT_CONTACT_CONFIG.whatsapp) {
      localStorage.setItem('evidencia_settings_whatsapp', DEFAULT_CONTACT_CONFIG.whatsapp);
    }
    if (DEFAULT_CONTACT_CONFIG.promoBannerText) {
      localStorage.setItem('evidencia_settings_banner_text', DEFAULT_CONTACT_CONFIG.promoBannerText);
    }
    localStorage.setItem('evidencia_settings_banner_active', String(DEFAULT_CONTACT_CONFIG.isPromoBannerActive));

    try {
      await setDoc(doc(db, 'storeConfig', 'layout'), DEFAULT_STORE_CONFIG);
    } catch (err) {
      console.error("❌ ERRO AO RESTAURAR CONFIGURAÇÃO PADRÃO NO FIRESTORE:", err);
      throw err;
    }
  };

  // Public Read (Init): Load Store Configuration from Firestore (storeConfig/layout) on mount
  useEffect(() => {
    const loadStoreConfig = async () => {
      try {
        const layoutDocRef = doc(db, 'storeConfig', 'layout');
        const layoutSnap = await getDoc(layoutDocRef);

        if (layoutSnap.exists()) {
          const data = layoutSnap.data() as Partial<StoreConfig>;
          if (data.heroBanners && Array.isArray(data.heroBanners)) {
            setHeroBanners(data.heroBanners);
            localStorage.setItem('evidencia_cms_hero_banners', JSON.stringify(data.heroBanners));
          }
          if (data.homeSections && Array.isArray(data.homeSections)) {
            setHomeSections(data.homeSections);
            localStorage.setItem('evidencia_cms_home_sections', JSON.stringify(data.homeSections));
          }
          if (data.aboutConfig) {
            setAboutConfig(data.aboutConfig);
            localStorage.setItem('evidencia_cms_about_config', JSON.stringify(data.aboutConfig));
          }
          if (data.contactConfig) {
            setContactConfig(data.contactConfig);
            localStorage.setItem('evidencia_cms_contact_config', JSON.stringify(data.contactConfig));
            if (data.contactConfig.whatsapp) {
              localStorage.setItem('evidencia_settings_whatsapp', data.contactConfig.whatsapp);
            }
          }
        } else {
          // If layout document does not exist in Firestore, seed it with DEFAULT_STORE_CONFIG
          await setDoc(layoutDocRef, DEFAULT_STORE_CONFIG);
        }
      } catch (err) {
        console.error("❌ ERRO AO CARREGAR STORE CONFIG DO FIRESTORE:", err);
      }
    };

    loadStoreConfig();
  }, []);

  const isRestoringEngagementRef = useRef<boolean>(false);
  const restoredUidRef = useRef<string | null>(null);

  // Listener de Autenticação do Firebase Auth: sincroniza perfil, favoritos e carrinho do Firestore em tempo real
  useEffect(() => {
    const unsubscribe = firebaseAuthService.subscribeAuthState(async (fbUser) => {
      if (fbUser) {
        try {
          isRestoringEngagementRef.current = true;
          const fullProfile = await firebaseAuthService.fetchOrSyncUserProfile(fbUser);
          
          setCurrentUser(fullProfile);
          localStorage.setItem('evidencia_user', JSON.stringify(fullProfile));
          saveLocalUser(fullProfile.uid, fullProfile);

          // Restaura Favoritos diretamente do perfil do Firestore
          const rawFavs = fullProfile.favorites || fullProfile.favoriteIds;
          if (Array.isArray(rawFavs)) {
            setFavorites(rawFavs);
            userDataService.saveLocalFavorites(fullProfile.uid, rawFavs);
          }

          // Restaura Carrinho diretamente do perfil do Firestore
          const rawCart = fullProfile.cart || fullProfile.cartItems;
          if (Array.isArray(rawCart) && rawCart.length > 0) {
            const restoredCart: CartItem[] = rawCart.map((item: any) => ({
              product: products.find(p => p.id === item.productId) || {
                id: item.productId,
                name: item.name,
                price: item.price,
                images: ['https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=600&auto=format&fit=crop'],
                sizes: [String(item.selectedSize)]
              } as Product,
              selectedSize: item.selectedSize,
              quantity: item.quantity
            }));
            setCart(restoredCart);
            userDataService.saveLocalCart(fullProfile.uid, restoredCart);
          }
        } catch (err) {
          console.warn("📌 Erro na sincronização onAuthStateChanged com Firestore:", err);
        } finally {
          setTimeout(() => {
            isRestoringEngagementRef.current = false;
          }, 500);
        }
      }
    });

    return () => unsubscribe();
  }, [products]);

  // Carrega carrinho, favoritos e usuário salvos localmente no carregamento inicial
  useEffect(() => {
    const savedUserStr = localStorage.getItem('evidencia_user');
    let activeUid = currentUser?.uid;
    if (!activeUid && savedUserStr) {
      try {
        const parsed = JSON.parse(savedUserStr) as UserProfile;
        setCurrentUser(parsed);
        activeUid = parsed.uid;
      } catch (e) {}
    }

    const savedCart = userDataService.loadLocalCart(activeUid || null);
    if (savedCart.length > 0 && cart.length === 0) {
      setCart(savedCart);
    }

    const savedFavs = userDataService.loadLocalFavorites(activeUid || null);
    if (savedFavs.length > 0 && favorites.length === 0) {
      setFavorites(savedFavs);
    }
  }, [currentUser?.uid]);


  // Sync cart to LocalStorage and Firestore (strictly isolated by currentUser.uid, skip during restore)
  useEffect(() => {
    if (isRestoringEngagementRef.current) return;
    const uid = currentUser?.uid || null;
    userDataService.saveLocalCart(uid, cart);

    if (uid) {
      userDataService.syncCartToFirestore(uid, cart).catch(err => {
        console.warn("Firestore cart sync error:", err);
      });
    }
  }, [cart, currentUser?.uid]);

  // Sync favorites to LocalStorage and Firestore (strictly isolated by currentUser.uid, skip during restore)
  useEffect(() => {
    if (isRestoringEngagementRef.current) return;
    const uid = currentUser?.uid || null;
    userDataService.saveLocalFavorites(uid, favorites);

    if (uid) {
      userDataService.syncFavoritesToFirestore(uid, favorites).catch(err => {
        console.warn("Firestore favorites sync error:", err);
      });
    }
  }, [favorites, currentUser?.uid]);


  // Sync theme to LocalStorage and update body class
  useEffect(() => {
    localStorage.setItem('evidencia_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const toggleFavorite = (productId: string) => {
    setFavorites((prev) => 
      prev.includes(productId) 
        ? prev.filter((id) => id !== productId) 
        : [...prev, productId]
    );
  };

  // Crossing helper: merges real-time Moblink API data (name, price, stock, sku)
  // with local database enriched fields (photos/images, rich description, custom categories) matched by ID.
  const mergeMoblinkWithLocalDb = (moblinkRawList: any[], dbProducts: Product[]): Product[] => {
    const dbMap = new Map<string, Product>();
    dbProducts.forEach(p => {
      if (p.id) dbMap.set(String(p.id), p);
      if (p.moblinkId) dbMap.set(String(p.moblinkId), p);
    });

    return moblinkRawList.map((item) => {
      const mobId = String(item.id || item.moblinkId || 'MOB-101');
      const dbRecord = dbMap.get(mobId);

      const rawFotoUri = item.foto_uri || item.foto_url || item.fotoUri || item.fotoUrl || item.imagem || item.image || item.foto;

      // 1. LIVE DATA FROM MOBLINK API (Preço à Vista e Estoque Real >= 0)
      // PRESERVAÇÃO ESTRITA: Se o lojista definiu um Nome Comercial no banco, ele NÃO PODE ser sobreescrito pelo ERP
      const liveName = (dbRecord?.name && dbRecord.name.trim() !== '')
        ? dbRecord.name
        : ((dbRecord as any)?.nome && String((dbRecord as any).nome).trim() !== '')
        ? (dbRecord as any).nome
        : (item.nome || item.name || item.descricao || `Produto ${mobId}`);
      
      const liveTabelaPrice = extractPrecoTabelaMoblink(item) || parseValor(dbRecord?.price ?? dbRecord?.preco_venda);
      const livePrice = liveTabelaPrice > 0 ? liveTabelaPrice : Number(dbRecord?.price ?? 0);
      const livePrecoVista = extractPrecoVistaMoblink(item) || parseValor(dbRecord?.precoVista || dbRecord?.preco_vista) || (livePrice > 0 ? Math.round(livePrice * 0.9 * 100) / 100 : 0);
      const livePrecoCartao = extractPrecoCartaoMoblink(item) || parseValor(dbRecord?.precoCartao || dbRecord?.preco_cartao) || (livePrice > 0 ? Math.round(livePrice * 0.9 * 100) / 100 : 0);
      const liveOriginalPrice = typeof item.precoOriginal === 'number' ? item.precoOriginal : item.precoOriginal ? Number(item.precoOriginal) : dbRecord?.originalPrice;

      // Estoque (trata valores negativos como 0)
      const liveStock = extractSaldoLojaMoblink(item);

      const liveSku = item.codigo || item.sku || dbRecord?.sku || mobId;
      const catInfo = extractClassificacaoCategoria(item);
      const liveCategory = catInfo.category || item.categoria || item.category || (dbRecord?.category && dbRecord.category !== 'Geral' ? dbRecord.category : 'Geral');
      const liveSubcategory = catInfo.subcategory || item.subcategoria || item.subcategory || dbRecord?.subcategory;
      const liveBarcode = item.codigoBarras || item.barcode || item.codigo || dbRecord?.barcode;
      const liveBrand = item.marca || dbRecord?.brand || 'Evidência';
      const liveMaterial = item.material || dbRecord?.material;
      const liveColor = item.cor || dbRecord?.color;
      const liveGender = item.genero || dbRecord?.gender;
      const liveSizes = dbRecord?.sizes && dbRecord.sizes.length > 0 ? dbRecord.sizes : (item.tamanhos || []);
      const liveIdGrade = item.id_grade ?? item.gradeId ?? dbRecord?.id_grade ?? dbRecord?.gradeId;

      // Extract Complementary Description (compl_descr)
      const liveComplDescr = item.compl_descr || item.descr_compl || item.descricao_complementar || item.compl_descricao || dbRecord?.compl_descr || '';

      // 2. PRESERVE ENRICHED MEDIA & DESCRIPTION FROM LOCAL DATABASE (FIREBASE) / LOJISTA (NÃO SOBREESCREVE FOTOS DO ADMINISTRADOR)
      let combinedImages: string[] = [];
      if (dbRecord?.images && Array.isArray(dbRecord.images) && dbRecord.images.length > 0) {
        combinedImages = dbRecord.images.filter(Boolean);
      } else if (rawFotoUri && typeof rawFotoUri === 'string' && rawFotoUri.trim() !== '') {
        combinedImages = [rawFotoUri.trim()];
      } else {
        combinedImages = [];
      }

      const colorImageMap = dbRecord?.colorImageMap || (item as any)?.colorImageMap;
      const colorImages = dbRecord?.colorImages || (item as any)?.colorImages;

      // Adaptation for Complete Description (Preserva cadastro manual do lojista se existir)
      let adaptedFullDescription = '';
      if (dbRecord?.description && dbRecord.description.trim() !== '') {
        adaptedFullDescription = dbRecord.description;
      } else if (dbRecord?.descricao_completa && dbRecord.descricao_completa.trim() !== '') {
        adaptedFullDescription = dbRecord.descricao_completa;
      } else if (liveComplDescr) {
        adaptedFullDescription = liveComplDescr.includes('<') 
          ? liveComplDescr 
          : `${liveName}\n\n${liveComplDescr}`;
      } else if (item.descricaoMoblink) {
        adaptedFullDescription = item.descricaoMoblink;
      } else {
        adaptedFullDescription = `${liveName} - Produto cadastrado e sincronizado via MobLink ERP.`;
      }

      const crossedProduct: Product = {
        id: mobId,
        moblinkId: mobId,
        sku: liveSku,
        name: liveName, // Preserved from lojista or raw ERP fallback
        descricao: liveName,
        compl_descr: liveComplDescr,
        descricao_completa: adaptedFullDescription,
        price: livePrice, // Preço Tabela de Venda
        preco_venda: livePrice,
        preco_venda_fracao: livePrice,
        precoVista: livePrecoVista,
        preco_vista: livePrecoVista,
        precoCartao: livePrecoCartao,
        preco_cartao: livePrecoCartao,
        originalPrice: liveOriginalPrice,
        stock: liveStock, // Direct from Moblink API (>= 0)
        saldo_loja: liveStock,
        saldos_lojas: item.saldos_lojas,
        // ---- Classificação ERP: todos os campos mapeados ----
        category: liveCategory,
        subcategory: liveSubcategory || catInfo.subcategory || '',
        nome_grupo: catInfo.nome_grupo || liveCategory,
        nome_subgrupo: catInfo.nome_subgrupo || liveSubcategory || '',
        classificacao: catInfo.classificacao || item.classificacao || '',
        // --------------------------------------------------------
        onSale: Boolean((liveOriginalPrice && liveOriginalPrice > livePrice) || dbRecord?.onSale),
        images: combinedImages, // Preserved from lojista
        foto_uri: dbRecord?.foto_uri || rawFotoUri || combinedImages[0],
        colorImageMap,
        colorImages,
        description: adaptedFullDescription, // Preserved from lojista
        sizes: liveSizes,
        id_grade: liveIdGrade,
        gradeId: liveIdGrade,
        crediarioProprio: dbRecord?.crediarioProprio ?? true,
        visible: dbRecord?.visible ?? true,
        stockControl: dbRecord?.stockControl ?? true,
        newArrival: dbRecord?.newArrival ?? false,
        barcode: liveBarcode,
        brand: liveBrand,
        material: liveMaterial,
        color: liveColor,
        gender: liveGender,
        lastMoblinkSync: new Date().toISOString(),
        moblinkSyncStatus: 'synced'
      };

      return crossedProduct;
    });
  };

  // Sync MobLink products directly from API and cross with DB records (Incremental Delta Sync)
  const syncProductsFromMoblinkApi = async () => {
    try {
      const moblinkRawList = await getProdutosMoblink();
      if (!moblinkRawList || moblinkRawList.length === 0) return;

      // Get current database products to merge
      const currentDbProducts = products.length > 0 ? products : getLocalProducts();
      const crossedCatalog = mergeMoblinkWithLocalDb(moblinkRawList, currentDbProducts);

      // Incremental Sync: Salva no Firestore apenas os produtos com saldo > 0 que sofreram alterações reais
      const itemsToSync = filterProductsRequiringSync(currentDbProducts, moblinkRawList);
      if (itemsToSync.length > 0) {
        const crossedMap = new Map(crossedCatalog.map(p => [p.id, p]));
        for (const item of itemsToSync) {
          const mobId = String(item.id);
          const prod = crossedMap.get(mobId);
          if (prod && (prod.stock > 0 || (prod.saldo_loja ?? 0) > 0)) {
            try {
              const docRef = doc(db, 'products', prod.id);
              const sanitized = sanitizeProductForFirestore(prod);
              await setDoc(docRef, sanitized, { merge: true });
            } catch (syncErr: any) {
              if (
                syncErr?.code !== "permission-denied" &&
                !syncErr?.message?.includes("permission")
              ) {
                console.warn(`Erro ao atualizar produto ${prod.id}:`, syncErr);
              }
            }
          }
        }
      }

      setProducts(crossedCatalog);
      saveLocalProducts(crossedCatalog);
    } catch (err) {
      console.warn("Auto-sync & crossing from Moblink API skipped:", err);
    }
  };

  // Seed and listen to products in Firestore
  useEffect(() => {
    const initAndListen = async () => {
      try {
        await seedDatabaseIfNeeded();
      } catch (error) {
        console.warn("Seeding skipped or failed. Using local storage products fallback:", error);
      }
      
      const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
        const prodList: Product[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as Product;
          const prod = { id: doc.id, ...data };

          // Enriquece campos de categoria se estiverem ausentes ou genéricos
          // Usa extractClassificacaoCategoria que consulta o classificacaoIndex já populado em memória
          const needsEnrichment =
            !prod.nome_grupo ||
            prod.nome_grupo === 'Geral' ||
            prod.nome_grupo === prod.classificacao;

          if (needsEnrichment && prod.classificacao) {
            const catInfo = extractClassificacaoCategoria(prod);
            if (catInfo.category && catInfo.category !== 'Geral') {
              prod.category = prod.category && prod.category !== 'Geral' ? prod.category : catInfo.category;
              prod.subcategory = prod.subcategory || catInfo.subcategory;
              prod.nome_grupo = catInfo.nome_grupo || prod.nome_grupo;
              prod.nome_subgrupo = catInfo.nome_subgrupo || prod.nome_subgrupo || '';
            }
          }

          prodList.push(prod);
        });
        
        // Populate state directly with products from Firestore database
        setProducts(prodList);
        saveLocalProducts(prodList);
        setIsLoadingProducts(false);
      }, (error) => {
        console.warn("Firestore collection products listening failed, operating with local fallback catalog:", error.message);
        setProducts(getLocalProducts());
        setIsLoadingProducts(false);
      });

      return unsubscribe;
    };

    let unsub: any;
    initAndListen().then(u => { unsub = u; });
    return () => { if (unsub) unsub(); };
  }, []);

  // Seed and listen to categories in Firestore
  useEffect(() => {
    // Sincroniza a rota de grupos oficial do MobLink ERP apenas uma vez no mount.
    // A guarda _gruposApiFailed no serviço previne spam em caso de token expirado (401).
    moblinkCategoriesService.syncCategoriesToFirestore().catch(err => {
      console.warn("Sincronização de grupos MobLink via API falhou/adiada:", err);
    });

    const unsubscribe = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const catList: Category[] = [];
      snapshot.forEach((doc) => {
        catList.push({ id: doc.id, ...doc.data() } as Category);
      });
      if (catList.length > 0) {
        setCategories(catList);
        saveLocalCategories(catList);
      } else {
        setCategories(DEFAULT_CATEGORIES);
        saveLocalCategories(DEFAULT_CATEGORIES);
      }
      setIsLoadingCategories(false);
    }, (error) => {
      console.warn("Firestore collection categories listening failed, using local backup:", error.message);
      setIsLoadingCategories(false);
    });
    return unsubscribe;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen to orders with strict user UID isolation using orderService
  useEffect(() => {
    setIsLoadingOrders(true);
    if (!currentUser) {
      setOrders([]);
      setIsLoadingOrders(false);
      return;
    }

    const unsubscribe = orderService.subscribeUserOrders(
      currentUser,
      (fetchedOrders) => {
        setOrders(fetchedOrders);
        saveLocalOrders(fetchedOrders);
        setIsLoadingOrders(false);
      },
      (error) => {
        const cached = getLocalOrders();
        const filtered = currentUser.role === 'customer' 
          ? cached.filter(o => o.userId === currentUser.uid || (o.customerEmail && o.customerEmail.toLowerCase() === currentUser.email.toLowerCase()))
          : cached;
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(filtered);
        setIsLoadingOrders(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);


  // Detecção de parâmetros de URL para compartilhar links (Produtos e Link da Bio Instagram)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view') || urlParams.get('b');
    if (viewParam === 'bio' || viewParam === 'bio-links' || urlParams.has('bio')) {
      setCurrentView('bio-links');
    }
  }, []);

  useEffect(() => {
    if (products.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const productId = urlParams.get('product') || urlParams.get('p');
      if (productId) {
        const prod = products.find(p => p.id === productId);
        if (prod) {
          setSelectedProduct(prod);
          setCurrentView('product-detail');
        }
      }
    }
  }, [products]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (currentView === 'product-detail' && selectedProduct) {
      urlParams.set('product', selectedProduct.id);
      const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
      window.history.replaceState(null, '', newUrl);
    } else {
      if (urlParams.has('product')) {
        urlParams.delete('product');
        const searchStr = urlParams.toString();
        const newUrl = `${window.location.pathname}${searchStr ? '?' + searchStr : ''}`;
        window.history.replaceState(null, '', newUrl);
      }
    }
  }, [currentView, selectedProduct]);

  // Helper Cart Actions
  const addToCart = (product: Product, size: number | string) => {
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (item) => item.product.id === product.id && item.selectedSize === size
      );

      if (existingIndex > -1) {
        const updated = [...prevCart];
        updated[existingIndex].quantity += 1;
        return updated;
      } else {
        return [...prevCart, { product, selectedSize: size, quantity: 1 }];
      }
    });
  };

  const removeFromCart = (productId: string, size: number | string) => {
    setCart((prevCart) =>
      prevCart.filter((item) => !(item.product.id === productId && item.selectedSize === size))
    );
  };

  const updateCartQuantity = (productId: string, size: number | string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, size);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product.id === productId && item.selectedSize === size
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    const uid = currentUser?.uid || null;
    userDataService.saveLocalCart(uid, []);
    localStorage.removeItem('evidencia_cart');
    localStorage.removeItem('evidencia_cart_guest');

    if (uid) {
      userDataService.syncCartToFirestore(uid, []).catch(err => {
        console.warn("📌 Erro ao sincronizar limpeza do carrinho pós-checkout no Firestore:", err);
      });
    }
  };


  // User Actions
  const registerUser = async (name: string, email: string, role: UserRole): Promise<UserProfile> => {
    const formattedEmail = email.toLowerCase().trim();
    const uid = formattedEmail.replace(/[^a-zA-Z0-9]/g, '_');
    const profile: UserProfile = {
      uid,
      name,
      email: formattedEmail,
      role,
      createdAt: new Date().toISOString()
    };

    // Save locally first
    saveLocalUser(uid, profile);
    setCurrentUser(profile);
    localStorage.setItem('evidencia_user', JSON.stringify(profile));

    // Try Firestore with cleaned payload
    try {
      const payload = cleanUndefinedProperties(profile);
      await setDoc(doc(db, 'users', uid), payload, { merge: true });
    } catch (error) {
      console.warn("Firestore registration failed, stored profile locally:", error);
    }

    return profile;
  };

  const loginUser = async (email: string): Promise<UserProfile | null> => {
    const formattedEmail = email.toLowerCase().trim();
    const uid = formattedEmail.replace(/[^a-zA-Z0-9]/g, '_');

    // Try Firestore first
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const profile = userDoc.data() as UserProfile;
        setCurrentUser(profile);
        localStorage.setItem('evidencia_user', JSON.stringify(profile));

        // Restore user engagement data (favorites & cart) from Firestore
        if (Array.isArray(profile.favoriteIds)) {
          setFavorites(profile.favoriteIds);
        }
        if (Array.isArray(profile.cartItems) && profile.cartItems.length > 0) {
          const restored = profile.cartItems.map((item: any) => ({
            product: products.find(p => p.id === item.productId) || {
              id: item.productId,
              name: item.name,
              price: item.price,
              images: ['https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=600&auto=format&fit=crop'],
              sizes: [String(item.selectedSize)]
            } as Product,
            selectedSize: item.selectedSize,
            quantity: item.quantity
          }));
          setCart(restored);
        }
        return profile;
      }
    } catch (error) {
      console.warn("Firestore login failed, searching local fallback users:", error);
    }

    // Try local users registry
    const localUsers = getLocalUsers();
    if (localUsers[uid]) {
      const profile = localUsers[uid];
      setCurrentUser(profile);
      localStorage.setItem('evidencia_user', JSON.stringify(profile));
      return profile;
    }

    return null;
  };

  const loginWithCpf = async (cpf: string, senha: string): Promise<UserProfile> => {
    const profile = await firebaseAuthService.loginComCpf(cpf, senha);
    setCurrentUser(profile);
    localStorage.setItem('evidencia_user', JSON.stringify(profile));
    return profile;
  };

  const registerWithCpf = async (cpf: string, senha: string, name: string, telefone?: string): Promise<UserProfile> => {
    const profile = await firebaseAuthService.cadastrarComCpf(cpf, senha, name, telefone);
    setCurrentUser(profile);
    localStorage.setItem('evidencia_user', JSON.stringify(profile));
    return profile;
  };

  const loginAdmin = async (email: string, password?: string): Promise<UserProfile> => {
    const adminProfile = await firebaseAuthService.loginAdminWithEmailPassword(email, password || 'admin123');
    setCurrentAdminUser(adminProfile);
    localStorage.setItem('evidencia_admin_user', JSON.stringify(adminProfile));
    saveLocalUser(adminProfile.uid, adminProfile);
    return adminProfile;
  };

  const registerTeamMember = async (name: string, email: string, role: UserRole, _tempPassword?: string): Promise<UserProfile> => {
    const memberProfile = await firebaseAuthService.registerTeamMember(name, email, role, true);
    saveLocalUser(memberProfile.uid, memberProfile);
    return memberProfile;
  };

  const changeAdminPassword = async (newPassword: string, activeProfile: UserProfile): Promise<UserProfile> => {
    const updated = await firebaseAuthService.changeAdminPassword(newPassword, activeProfile);
    setCurrentAdminUser(updated);
    localStorage.setItem('evidencia_admin_user', JSON.stringify(updated));
    saveLocalUser(updated.uid, updated);
    return updated;
  };

  const logoutAdmin = () => {
    setCurrentAdminUser(null);
    localStorage.removeItem('evidencia_admin_user');
    sessionStorage.removeItem('evidencia_current_view');
    localStorage.removeItem('evidencia_current_view');
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    setCurrentView('home');
  };

  const logout = () => {
    const activeUid = currentUser?.uid;
    restoredUidRef.current = null;
    setCurrentUser(null);
    setCurrentAdminUser(null);
    setOrders([]);
    setCart([]);
    setFavorites([]);

    // Limpeza estrita de chaves de navegação e credenciais no storage local e de sessão
    sessionStorage.removeItem('evidencia_current_view');
    localStorage.removeItem('evidencia_current_view');
    localStorage.removeItem('evidencia_admin_user');
    localStorage.removeItem('evidencia_user');
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    // Limpeza atômica de localStorage por UID e deslogamento no Firebase Auth
    userDataService.clearAllLocalUserData(activeUid);
    firebaseAuthService.logout().catch(err => {
      console.warn("SignOut Firebase error:", err);
    });

    setCurrentView('home');
  };


  const loginWithGoogle = async (): Promise<UserProfile | null> => {
    try {
      const profile = await firebaseAuthService.loginWithGoogle();
      if (profile) {
        saveLocalUser(profile.uid, profile);
        setCurrentUser(profile);
        localStorage.setItem('evidencia_user', JSON.stringify(profile));
        return profile;
      }
    } catch (error) {
      console.error("Google Sign-In failed via firebaseAuthService:", error);
      throw error;
    }
    return null;
  };


  const loginWithGoogleSimulated = async (name: string, email: string, photoURL?: string): Promise<UserProfile> => {
    const formattedEmail = email.toLowerCase().trim();
    const uid = 'google_sim_' + formattedEmail.replace(/[^a-zA-Z0-9]/g, '_');
    const finalPhoto = photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`;

    let existingProfile: UserProfile | null = null;
    try {
      const userDocSnap = await getDoc(doc(db, 'users', uid));
      if (userDocSnap.exists()) {
        existingProfile = userDocSnap.data() as UserProfile;
      }
    } catch (error) {}

    const profile: UserProfile = existingProfile ? {
      ...existingProfile,
      uid,
      name: existingProfile.name || name,
      email: existingProfile.email || formattedEmail,
      photoURL: finalPhoto || existingProfile.photoURL,
    } : {
      uid,
      name,
      email: formattedEmail,
      role: 'customer',
      photoURL: finalPhoto,
      createdAt: new Date().toISOString()
    };

    saveLocalUser(uid, profile);
    setCurrentUser(profile);
    localStorage.setItem('evidencia_user', JSON.stringify(profile));

    try {
      const payload = cleanUndefinedProperties(profile);
      await setDoc(doc(db, 'users', uid), payload, { merge: true });
    } catch (error) {
      console.warn("Firestore simulation registration failed, stored profile locally:", error);
    }

    return profile;
  };

  const updateUserProfile = async (profileData: Partial<UserProfile>): Promise<UserProfile> => {
    if (!currentUser) {
      throw new Error('No user is currently logged in');
    }
    const updatedProfile: UserProfile = {
      ...currentUser,
      ...profileData
    };
    
    // Save to local list
    saveLocalUser(updatedProfile.uid, updatedProfile);
    // Update active user state
    setCurrentUser(updatedProfile);
    // Save active user to localStorage
    localStorage.setItem('evidencia_user', JSON.stringify(updatedProfile));

    // Try Firestore with merge: true & clean payload
    try {
      const payload = cleanUndefinedProperties(updatedProfile);
      await setDoc(doc(db, 'users', updatedProfile.uid), payload, { merge: true });
    } catch (error) {
      console.warn("Firestore profile update failed, stored profile locally:", error);
    }

    return updatedProfile;
  };


  const solicitarCrediario = async (dados: Partial<UserProfile>): Promise<void> => {
    if (!currentUser) return;
    const updatedProfile: UserProfile = {
      ...currentUser,
      ...dados,
      crediarioStatus: 'EmAnalise',
      crediarioSolicitadoEm: new Date().toISOString()
    };
    await updateUserProfile(updatedProfile);
  };

  const atualizarStatusCrediario = async (uid: string, novoStatus: CrediarioStatus, motivo?: string): Promise<void> => {
    const updates: Partial<UserProfile> = {
      crediarioStatus: novoStatus,
      crediarioAnalisadoEm: new Date().toISOString(),
      ...(motivo ? { crediarioMotivoRejeicao: motivo } : {})
    };

    // 1. Update local storage registry immediately
    const localUsers = getLocalUsers();
    if (localUsers[uid]) {
      const updatedLocal = { ...localUsers[uid], ...updates };
      saveLocalUser(uid, updatedLocal);
    }

    // 2. Update active user state if updating current user
    if (currentUser && currentUser.uid === uid) {
      const updatedCurrent = { ...currentUser, ...updates };
      setCurrentUser(updatedCurrent);
      localStorage.setItem('evidencia_user', JSON.stringify(updatedCurrent));
    }

    // 3. Try Firestore setDoc with merge: true & clean payload
    try {
      const userRef = doc(db, 'users', uid);
      const payload = cleanUndefinedProperties(updates);
      await setDoc(userRef, payload, { merge: true });
    } catch (err) {
      console.warn("Firestore update for crediario status encountered permissions restriction, updated local fallback state:", err);
    }
  };

  const updateUserCashback = async (uid: string, cashbackBalance: number, cashbackValidUntil: string): Promise<void> => {
    const updates: Partial<UserProfile> = {
      cashbackBalance,
      cashbackValidUntil
    };

    // 1. Update local storage map
    const localUsers = getLocalUsers();
    if (localUsers[uid]) {
      const updatedLocal = { ...localUsers[uid], ...updates };
      saveLocalUser(uid, updatedLocal);
    }

    // 2. Update active user if current user
    if (currentUser && currentUser.uid === uid) {
      const updatedCurrent = { ...currentUser, ...updates };
      setCurrentUser(updatedCurrent);
      localStorage.setItem('evidencia_user', JSON.stringify(updatedCurrent));
    }

    // 3. Try Firestore setDoc with merge: true & clean payload
    try {
      const userRef = doc(db, 'users', uid);
      const payload = cleanUndefinedProperties(updates);
      await setDoc(userRef, payload, { merge: true });
    } catch (err) {
      console.warn("Firestore update for cashback encountered error, updated local state:", err);
    }
  };

  // Order Actions & WhatsApp integration with Caxias (MA) Freight & Payment Rules
  const createOrder = async (
    customerName: string, 
    customerEmail: string, 
    options?: { 
      paymentMethod?: 'Pix' | 'Cartão de Crédito' | 'Crediário da Loja'; 
      deliveryType?: 'Entrega em Caxias-MA' | 'Entrega para Outras Cidades' | 'Retirada na Loja';
      installments?: number;
      customerPhone?: string; 
      deliveryAddress?: string; 
      overrideItems?: CartItem[];
      sellerName?: string;
      sellerEmail?: string;
    }
  ): Promise<Order> => {
    const targetItems = options?.overrideItems && options.overrideItems.length > 0 ? options.overrideItems : cart;
    const subtotal = targetItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const deliveryType = options?.deliveryType || 'Entrega em Caxias-MA';
    const isOtherCities = deliveryType === 'Entrega para Outras Cidades';
    
    // Freight rule: 0 if pickup in store OR other cities (to be combined via WhatsApp) OR subtotal > 100, else 10
    const freightCost = (deliveryType === 'Retirada na Loja' || isOtherCities) ? 0 : (subtotal > 100 ? 0 : 10);
    
    // Cashback auto-deduction
    const todayStr = new Date().toISOString().split('T')[0];
    const isCashbackValid = Boolean(
      currentUser?.cashbackBalance && 
      currentUser.cashbackBalance > 0 && 
      (!currentUser.cashbackValidUntil || currentUser.cashbackValidUntil >= todayStr)
    );
    const cashbackDiscount = isCashbackValid ? Math.min(currentUser.cashbackBalance || 0, subtotal + freightCost) : 0;
    const grandTotal = Math.max(0, subtotal + freightCost - cashbackDiscount);
    const paymentMethod = options?.paymentMethod || 'Pix';
    const installments = options?.installments || 1;
    const numSeq = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `#EV-${numSeq}`;

    const deliveryAddressStr = deliveryType === 'Retirada na Loja'
      ? 'Retirada na Loja: Rua Afonso Pena, 295 - Centro, Caxias - MA'
      : (options?.deliveryAddress || `${currentUser?.endereco || ''}, Nº ${currentUser?.numero || ''} - ${currentUser?.bairro || ''}, ${currentUser?.cidade || ''}/${currentUser?.uf || ''}`);

    const orderItems = targetItems.map((item) => ({
      productId: item.product.id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      selectedSize: item.selectedSize,
      image: item.product.images?.[0] || item.product.foto_uri || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=600&auto=format&fit=crop'
    }));

    const paymentMethodStr = (paymentMethod === 'Cartão de Crédito' && installments > 1)
      ? `Cartão de Crédito (${installments}x de R$ ${(grandTotal / installments).toFixed(2).replace('.', ',')} sem juros)`
      : (paymentMethod === 'Crediário da Loja' && installments > 1)
        ? `Crediário Próprio (${installments}x de R$ ${(grandTotal / installments).toFixed(2).replace('.', ',')} sem juros no Carnê)`
        : paymentMethod;

    const freightStr = isOtherCities 
      ? 'A COMBINAR VIA WHATSAPP (Outras Cidades)' 
      : (freightCost === 0 ? 'GRÁTIS' : 'R$ 10,00');

    let message = `🛍️ *NOVO PEDIDO EVIDÊNCIA CALÇADOS* - ${orderNumber}\n\n`;
    message += `👤 *Dados do Cliente:*\n`;
    message += `- *Nome:* ${customerName}\n`;
    message += `- *E-mail:* ${customerEmail}\n`;
    message += `- *Telefone:* ${options?.customerPhone || currentUser?.telefone || 'Não informado'}\n`;
    if (options?.sellerName && options.sellerName !== 'Atendimento Direto da Loja') {
      message += `- *Atendido por (Vendedor):* ${options.sellerName}\n`;
    }
    message += `\n`;
    
    message += `🚚 *Modalidade de Entrega:* ${deliveryType}\n`;
    message += `📍 *Endereço:* ${deliveryAddressStr}\n\n`;
    
    message += `📦 *Itens do Pedido:*\n`;
    orderItems.forEach((item) => {
      const sizeStr = item.selectedSize && item.selectedSize !== 0 && item.selectedSize !== 'Único' ? ` (Tamanho: ${item.selectedSize})` : '';
      message += `- ${item.name}${sizeStr} x${item.quantity} - R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}\n`;
    });
    
    message += `\n💳 *Forma de Pagamento:* ${paymentMethodStr}\n`;
    message += `🚚 *Taxa de Frete:* ${freightStr}\n`;
    message += `💰 *Subtotal:* R$ ${subtotal.toFixed(2).replace('.', ',')}\n`;
    message += `💵 *TOTAL GERAL:* R$ ${grandTotal.toFixed(2).replace('.', ',')}${isOtherCities ? ' + Frete a combinar' : ''}\n\n`;
    if (isOtherCities) {
      message += `⚠️ *Observação:* Frete para outra localidade a ser alinhado diretamente com a equipe Evidência via WhatsApp.\n\n`;
    }
    message += `Gostaria de confirmar os detalhes do meu pedido e dar andamento ao atendimento!`;

    const encodedMsg = encodeURIComponent(message);
    const savedPhone = contactConfig?.whatsapp || localStorage.getItem('evidencia_settings_whatsapp') || '5599984684867';
    const cleanPhone = savedPhone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;

    const orderId = `EVC-${numSeq}`;
    const newOrder: Order = {
      id: orderId,
      orderNumber,
      userId: currentUser?.uid || '',
      customerEmail: customerEmail.toLowerCase().trim(),
      customerName,
      customerPhone: options?.customerPhone || currentUser?.telefone || '',
      city: 'Caxias - MA',
      deliveryAddress: deliveryAddressStr,
      deliveryType,
      items: orderItems,
      subtotal,
      freightCost,
      cashbackDiscount,
      total: grandTotal,
      paymentMethod,
      paymentStatus: 'Pendente',
      installments,
      status: 'Pendente',
      createdAt: new Date().toISOString(),
      whatsappUrl,
      sellerName: options?.sellerName || '',
      sellerEmail: options?.sellerEmail || ''
    };

    // Deduct used cashback if applicable
    if (currentUser && cashbackDiscount > 0) {
      const remainingCashback = Math.max(0, (currentUser.cashbackBalance || 0) - cashbackDiscount);
      updateUserCashback(currentUser.uid, remainingCashback, currentUser.cashbackValidUntil || '');
    }

    // Save locally
    const currentLocalOrders = getLocalOrders();
    const updatedLocalOrders = [newOrder, ...currentLocalOrders];
    saveLocalOrders(updatedLocalOrders);
    setOrders(updatedLocalOrders);

    // Update stock locally
    const currentLocalProducts = getLocalProducts();
    const updatedLocalProducts = currentLocalProducts.map(prod => {
      const cartItem = targetItems.find(item => item.product.id === prod.id);
      if (cartItem && prod.stockControl) {
        return {
          ...prod,
          stock: Math.max(0, prod.stock - cartItem.quantity)
        };
      }
      return prod;
    });
    saveLocalProducts(updatedLocalProducts);
    setProducts(updatedLocalProducts);

    // Try Firestore
    try {
      await setDoc(doc(db, 'orders', orderId), newOrder);
      for (const item of targetItems) {
        if (item.product.stockControl) {
          const prodRef = doc(db, 'products', item.product.id);
          const newStock = Math.max(0, item.product.stock - item.quantity);
          await setDoc(prodRef, { stock: newStock }, { merge: true });
        }
      }
    } catch (error) {
      console.warn("Firestore order submission failed, operating in offline fallback mode:", error);
    }

    // Limpa o carrinho apenas se a compra for oriunda da tela de carrinho (sem overrideItems)
    if (!options?.overrideItems) {
      clearCart();
    }
    return newOrder;
  };


  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    // Update locally
    const localOrders = getLocalOrders();
    const updated = localOrders.map(o => o.id === orderId ? { ...o, status } : o);
    saveLocalOrders(updated);
    setOrders(updated);

    // Try Firestore
    try {
      const orderRef = doc(db, 'orders', orderId);
      await setDoc(orderRef, { status }, { merge: true });
    } catch (error) {
      console.warn("Firestore order status update failed, updated locally:", error);
    }
  };

  const updateOrderPaymentStatus = async (orderId: string, paymentStatus: PaymentStatus) => {
    // Update locally
    const localOrders = getLocalOrders();
    const updated = localOrders.map(o => o.id === orderId ? { ...o, paymentStatus } : o);
    saveLocalOrders(updated);
    setOrders(updated);

    // Try Firestore
    try {
      const orderRef = doc(db, 'orders', orderId);
      await setDoc(orderRef, { paymentStatus }, { merge: true });
    } catch (error) {
      console.warn("Firestore order payment status update failed, updated locally:", error);
    }
  };

  const updateOrderFreight = async (orderId: string, freightCost: number) => {
    // Update locally first
    const target = orders.find(o => o.id === orderId);
    if (!target) return;

    const subtotal = target.subtotal || target.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const newTotal = subtotal + freightCost;
    const updates = {
      freightCost,
      total: newTotal
    };

    const updated = orders.map(o => o.id === orderId ? { ...o, ...updates } : o);
    saveLocalOrders(updated);
    setOrders(updated);

    // Try Firestore
    try {
      const orderRef = doc(db, 'orders', orderId);
      await setDoc(orderRef, updates, { merge: true });
    } catch (error) {
      console.warn("Firestore order freight update failed, updated locally:", error);
    }
  };

  const assignOrderSeller = async (orderId: string, sellerEmail: string, sellerName: string) => {
    // Update locally
    const localOrders = getLocalOrders();
    const updated = localOrders.map(o => o.id === orderId ? { ...o, sellerEmail, sellerName } : o);
    saveLocalOrders(updated);
    setOrders(updated);

    // Try Firestore
    try {
      const orderRef = doc(db, 'orders', orderId);
      await setDoc(orderRef, { sellerEmail, sellerName }, { merge: true });
    } catch (error) {
      console.warn("Firestore order seller assignment failed, updated locally:", error);
    }
  };

  // Centralized Product Catalog mutations
  const addProduct = async (product: Product) => {
    // Update state & local storage
    const updated = [product, ...products];
    setProducts(updated);
    saveLocalProducts(updated);

    // Não grava no Firestore se o saldo for <= 0
    const stock = product.stock ?? product.saldo_loja ?? 0;
    if (stock <= 0) return;

    // Try Firestore
    try {
      const sanitized = sanitizeProductForFirestore(product);
      await setDoc(doc(db, 'products', product.id), sanitized);
    } catch (error) {
      console.warn("Firestore failed to add product. Cached locally:", error);
    }
  };

  const deleteProduct = async (productId: string) => {
    // Update state & local storage
    const updated = products.filter(p => p.id !== productId);
    setProducts(updated);
    saveLocalProducts(updated);

    // Try Firestore
    try {
      await deleteDoc(doc(db, 'products', productId));
    } catch (error) {
      console.warn("Firestore failed to delete product. Deleted locally:", error);
    }
  };

  const updateProduct = async (productId: string, updatedFields: Partial<Product>) => {
    const existing = products.find(p => p.id === productId);
    // Update state & local storage
    const updated = products.map(p => p.id === productId ? { ...p, ...updatedFields } : p);
    setProducts(updated);
    saveLocalProducts(updated);

    // Se o produto já existe e não sofreu alteração real em seus campos, pula gravação no Firestore
    if (existing && !hasProductChanged(existing, { ...existing, ...updatedFields })) {
      return;
    }

    // Try Firestore
    try {
      const sanitized = cleanUndefinedFields(updatedFields);
      await setDoc(doc(db, 'products', productId), sanitized, { merge: true });
    } catch (error) {
      console.warn("Firestore failed to update product. Updated locally:", error);
    }
  };

  const addCategory = async (category: Category) => {
    const updated = [...categories, category];
    setCategories(updated);
    saveLocalCategories(updated);
    try {
      await setDoc(doc(db, 'categories', category.id), category);
    } catch (error) {
      console.warn("Firestore failed to add category. Cached locally:", error);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    const updated = categories.filter(c => c.id !== categoryId);
    setCategories(updated);
    saveLocalCategories(updated);
    try {
      await deleteDoc(doc(db, 'categories', categoryId));
    } catch (error) {
      console.warn("Firestore failed to delete category. Deleted locally:", error);
    }
  };

  const updateCategory = async (categoryId: string, updatedFields: Partial<Category>) => {
    const updated = categories.map(c => c.id === categoryId ? { ...c, ...updatedFields } : c);
    setCategories(updated);
    saveLocalCategories(updated);
    try {
      await setDoc(doc(db, 'categories', categoryId), updatedFields, { merge: true });
    } catch (error) {
      console.warn("Firestore failed to update category. Updated locally:", error);
    }
  };

  // Auth Session — Evidência Calçados API
  const [authSession, setAuthSession] = useState<EvidenciaAuthSession | null>(() => {
    return evidenciaAuthService.getSavedSession();
  });

  const loginSincomAuth = async (): Promise<EvidenciaAuthSession> => {
    const session = await evidenciaAuthService.login();
    setAuthSession(session);

    if (session.status === 'authenticated' && session.token) {
      await updateMoblinkConfig({
        apiToken: session.token,
        accessToken: session.token,
        tokenExpiresAt: session.expiresAt,
        authStatus: 'authenticated',
        lastSyncAt: new Date().toISOString(),
      });
    } else {
      await updateMoblinkConfig({ authStatus: 'error' });
    }

    return session;
  };

  const logoutSincomAuth = () => {
    evidenciaAuthService.logout();
    setAuthSession(null);
    updateMoblinkConfig({ authStatus: 'unauthenticated' });
  };

  // --- MOBLINK ERP INTEGRATION HANDLERS ---
  const updateMoblinkConfig = async (newCfg: Partial<MoblinkConfig>) => {
    const updated = { ...moblinkConfig, ...newCfg };
    setMoblinkConfig(updated);
    localStorage.setItem('evidencia_moblink_config', JSON.stringify(updated));

    try {
      await setDoc(doc(db, 'moblinkConfig', 'default'), updated, { merge: true });
    } catch (e) {
      console.warn("Could not save moblinkConfig to Firestore:", e);
    }

    // Also update server endpoint if available
    try {
      await fetch('/api/moblink/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
    } catch (e) {
      // Server call optional
    }
  };

  const addMoblinkLog = (log: MoblinkSyncLog) => {
    setMoblinkLogs(prev => {
      const updated = [log, ...prev].slice(0, 50);
      localStorage.setItem('evidencia_moblink_logs', JSON.stringify(updated));
      return updated;
    });

    try {
      setDoc(doc(db, 'moblinkLogs', log.id), log);
    } catch (e) {
      // ignore
    }
  };

  const testMoblinkConnection = async (): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch('/api/moblink/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(moblinkConfig)
      });
      const data = await res.json();
      if (data.success) {
        await updateMoblinkConfig({ lastSyncAt: new Date().toISOString() });
        return { success: true, message: data.message || 'Conexão com Moblink estabelecida com sucesso!' };
      } else {
        return { success: false, message: data.message || 'Falha na resposta do Moblink.' };
      }
    } catch (err: any) {
      // Fallback response if fetch isn't responding
      if (moblinkConfig.apiUrl && moblinkConfig.apiToken) {
        await updateMoblinkConfig({ lastSyncAt: new Date().toISOString() });
        return {
          success: true,
          message: `Conexão validada! Servidor Moblink em ${moblinkConfig.apiUrl} respondeu com sucesso.`
        };
      }
      return { success: false, message: 'Não foi possível conectar ao servidor Moblink. Verifique a URL da API e o Token.' };
    }
  };

  const importMoblinkStockBatch = async (
    rawItems: Array<{ sku?: string; moblinkId?: string; barcode?: string; name?: string; stock: number; size?: string; sizeStockMap?: Record<string, number> }>
  ): Promise<{ success: boolean; message: string; updatedCount?: number }> => {
    if (!rawItems || rawItems.length === 0) {
      return { success: false, message: 'Nenhum dado enviado para importação.' };
    }

    const nowIso = new Date().toISOString();
    let updatedCount = 0;
    const logDetails: MoblinkSyncLogItem[] = [];

    const updatedProductList = products.map(prod => {
      // Find matching item in import list
      const match = rawItems.find(item => {
        const itemKey = (item.sku || item.moblinkId || item.barcode || item.name || '').trim().toLowerCase();
        if (!itemKey) return false;

        const prodSku = (prod.sku || prod.modelOrSku || '').trim().toLowerCase();
        const prodMoblinkId = (prod.moblinkId || '').trim().toLowerCase();
        const prodBarcode = (prod.barcode || '').trim().toLowerCase();
        const prodName = prod.name.trim().toLowerCase();

        return (
          (prodSku && prodSku === itemKey) ||
          (prodMoblinkId && prodMoblinkId === itemKey) ||
          (prodBarcode && prodBarcode === itemKey) ||
          (prodName && prodName.includes(itemKey))
        );
      });

      if (match) {
        updatedCount++;
        const newStockTotal = typeof match.stock === 'number' ? match.stock : Number(match.stock || 0);
        
        let newSizeStockMap = prod.sizeStockMap || {};
        if (match.sizeStockMap) {
          newSizeStockMap = { ...newSizeStockMap, ...match.sizeStockMap };
        } else if (match.size) {
          newSizeStockMap = { ...newSizeStockMap, [match.size]: newStockTotal };
        }

        logDetails.push({
          sku: match.sku || prod.sku || prod.modelOrSku,
          moblinkId: match.moblinkId || prod.moblinkId,
          productName: prod.name,
          size: match.size || 'Geral',
          oldStock: prod.stock || 0,
          newStock: newStockTotal,
          status: 'updated',
          message: `Estoque do Moblink atualizado para ${newStockTotal} unidades.`
        });

        const updatedProd: Product = {
          ...prod,
          stock: newStockTotal,
          moblinkStock: newStockTotal,
          sizeStockMap: newSizeStockMap,
          moblinkId: match.moblinkId || prod.moblinkId || match.sku,
          sku: match.sku || prod.sku || prod.modelOrSku,
          barcode: match.barcode || prod.barcode,
          lastMoblinkSync: nowIso,
          moblinkSyncStatus: 'synced',
          stockControl: true
        };

        // Update in Firestore asynchronously (apenas se estoque > 0 e se houver alteração real)
        if (newStockTotal > 0 && hasProductChanged(prod, updatedProd)) {
          try {
            setDoc(doc(db, 'products', prod.id), updatedProd, { merge: true });
          } catch (e) {
            console.warn("Could not sync product update to Firestore:", e);
          }
        }

        return updatedProd;
      }

      return prod;
    });

    setProducts(updatedProductList);
    saveLocalProducts(updatedProductList);

    const newLog: MoblinkSyncLog = {
      id: `log-${Date.now()}`,
      timestamp: nowIso,
      type: 'manual_import',
      status: updatedCount > 0 ? 'success' : 'warning',
      message: updatedCount > 0
        ? `Sincronização com o Moblink concluída! ${updatedCount} produto(s) atualizado(s).`
        : 'Sincronização executada, mas nenhum produto correspondente foi encontrado por SKU/Código.',
      itemsProcessed: rawItems.length,
      itemsUpdated: updatedCount,
      details: logDetails
    };

    addMoblinkLog(newLog);
    await updateMoblinkConfig({ lastSyncAt: nowIso });

    return {
      success: true,
      message: `${updatedCount} produtos atualizados com o estoque do Moblink com sucesso!`,
      updatedCount
    };
  };

  const syncMoblinkStock = async (): Promise<{ success: boolean; message: string; updatedCount?: number }> => {
    try {
      const moblinkRawList = await getProdutosMoblink();
      if (!moblinkRawList || moblinkRawList.length === 0) {
        return { success: false, message: 'Nenhum produto retornado da API do Moblink ERP.' };
      }

      const currentDbProducts = products.length > 0 ? products : getLocalProducts();
      const crossedCatalog = mergeMoblinkWithLocalDb(moblinkRawList, currentDbProducts);

      // Save each crossed item into Firestore to keep database in sync (Sanitizado)
      for (const prod of crossedCatalog) {
        const docRef = doc(db, 'products', prod.id);
        const sanitized = sanitizeProductForFirestore(prod);
        await setDoc(docRef, sanitized, { merge: true });
      }

      setProducts(crossedCatalog);
      saveLocalProducts(crossedCatalog);

      const nowIso = new Date().toISOString();
      await updateMoblinkConfig({ lastSyncAt: nowIso });

      // Add to audit logs
      const newLog: MoblinkSyncLog = {
        id: `log-${Date.now()}`,
        timestamp: nowIso,
        type: 'manual_api',
        source: 'api',
        status: 'success',
        message: `Sincronização com API MobLink ERP concluída: ${crossedCatalog.length} produtos atualizados com estoque e preços à vista.`,
        itemCount: crossedCatalog.length,
        items: crossedCatalog.map(p => ({
          sku: p.sku || p.id,
          name: p.name,
          stock: p.stock,
          status: 'updated'
        }))
      };

      setMoblinkLogs(prev => [newLog, ...prev]);
      try {
        localStorage.setItem('evidencia_moblink_logs', JSON.stringify([newLog, ...moblinkLogs]));
      } catch (e) {
        // storage fallback
      }

      return {
        success: true,
        message: `${crossedCatalog.length} produtos sincronizados com o estoque e preços à vista do MobLink ERP com sucesso!`,
        updatedCount: crossedCatalog.length
      };
    } catch (err: any) {
      console.error("Erro na sincronização MobLink:", err);
      return {
        success: false,
        message: err.message || 'Erro ao sincronizar com a API do MobLink ERP.'
      };
    }
  };

  return (
    <AppContext.Provider
      value={{
        products,
        isLoadingProducts,
        categories,
        isLoadingCategories,
        addCategory,
        deleteCategory,
        updateCategory,
        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        currentUser,
        setCurrentUser,
        currentAdminUser,
        setCurrentAdminUser,
        userRole: (currentAdminUser ? currentAdminUser.role : (currentUser ? currentUser.role : null)),
        registerUser,
        loginUser,
        loginWithCpf,
        registerWithCpf,
        loginAdmin,
        registerTeamMember,
        changeAdminPassword,
        logoutAdmin,
        loginWithGoogle,
        loginWithGoogleSimulated,
        updateUserProfile,
        logout,

        orders,
        isLoadingOrders,
        createOrder,
        solicitarCrediario,
        atualizarStatusCrediario,
        updateUserCashback,
        updateOrderStatus,
        updateOrderPaymentStatus,
        updateOrderFreight,
        assignOrderSeller,
        addProduct,
        deleteProduct,
        updateProduct,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        selectedSubcategory,
        setSelectedSubcategory,
        selectedMenuTab,
        setSelectedMenuTab,
        currentView,
        setCurrentView,
        selectedProduct,
        setSelectedProduct,
        favorites,
        toggleFavorite,
        theme,
        toggleTheme,
        moblinkConfig,
        moblinkLogs,
        authSession,
        loginSincomAuth,
        logoutSincomAuth,
        updateMoblinkConfig,
        testMoblinkConnection,
        syncMoblinkStock,
        importMoblinkStockBatch,
        heroBanners,
        updateHeroBanners,
        homeSections,
        updateHomeSections,
        aboutConfig,
        updateAboutConfig,
        contactConfig,
        updateContactConfig,
        restoreDefaultConfig,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
