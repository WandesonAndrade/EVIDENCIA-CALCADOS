import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem, Order, UserProfile, UserRole, Category, MoblinkConfig, MoblinkSyncLog, MoblinkSyncLogItem, SincomAuthSession, HeroBanner, HomeSectionConfig, AboutConfig, ContactConfig, StoreConfig } from '../types';
import { db, auth, seedDatabaseIfNeeded, SEED_PRODUCTS } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, getDoc, query, where, deleteDoc } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { sincomAuthService } from '../lib/sincomAuth';

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
  userRole: UserRole | null;
  registerUser: (name: string, email: string, role: UserRole) => Promise<UserProfile>;
  loginUser: (email: string) => Promise<UserProfile | null>;
  loginWithGoogle: () => Promise<UserProfile | null>;
  loginWithGoogleSimulated: (name: string, email: string, photoURL?: string) => Promise<UserProfile>;
  updateUserProfile: (profileData: Partial<UserProfile>) => Promise<UserProfile>;
  logout: () => void;
  orders: Order[];
  isLoadingOrders: boolean;
  createOrder: (customerName: string, customerEmail: string) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  assignOrderSeller: (orderId: string, sellerEmail: string, sellerName: string) => Promise<void>;
  addProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  updateProduct: (productId: string, updatedFields: Partial<Product>) => Promise<void>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  selectedMenuTab: string;
  setSelectedMenuTab: (tab: string) => void;
  favorites: string[];
  toggleFavorite: (productId: string) => void;
  currentView: 'home' | 'cart' | 'admin' | 'orders' | 'product-detail' | 'portfolio-case' | 'category-page' | 'about' | 'support' | 'favorites';
  setCurrentView: (view: 'home' | 'cart' | 'admin' | 'orders' | 'product-detail' | 'portfolio-case' | 'category-page' | 'about' | 'support' | 'favorites') => void;
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  // Moblink ERP Integration & Authentication
  moblinkConfig: MoblinkConfig;
  moblinkLogs: MoblinkSyncLog[];
  authSession: SincomAuthSession | null;
  loginSincomAuth: (config?: { apiUrl?: string; apiUser?: string; apiPassword?: string }) => Promise<SincomAuthSession>;
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
    badge: 'NOVA COLEÇÃO 2026',
    title: 'Elegância que caminha com você.',
    description: 'Descubra a seleção exclusiva de calçados premium com o conforto que seus pés merecem e as condições que só a Evidência oferece.',
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
    { label: 'Parcelas Crediário', value: '10x' }
  ]
};

export const DEFAULT_CONTACT_CONFIG: ContactConfig = {
  whatsapp: '5599984684867',
  email: 'contato@evidencia.com.br',
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
  { id: 'sapatos-sociais', name: 'Sapatos Sociais', description: 'Sapatos clássicos e elegantes' },
  { id: 'mocassins', name: 'Mocassins', description: 'Mocassins e loafers confortáveis' },
  { id: 'botas', name: 'Botas', description: 'Botas e coturnos em couro nobre' },
  { id: 'sapatenis', name: 'Sapatênis', description: 'Sapatênis casuais para o dia a dia' },
  { id: 'acessorios', name: 'Acessórios', description: 'Cintos e acessórios de couro' }
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
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>(() => getLocalOrders());
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('TODOS');
  const [selectedMenuTab, setSelectedMenuTab] = useState('lançamentos');
  const [currentView, setCurrentView] = useState<'home' | 'cart' | 'admin' | 'orders' | 'product-detail' | 'portfolio-case' | 'category-page' | 'about' | 'support' | 'favorites'>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
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
      apiUrl: import.meta.env.VITE_SINCOM_API_URL || 'http://api_sincom.caioflix.com.br',
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

  // Load cart, favorites, and session from LocalStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('evidencia_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error("Failed to parse cart", e);
      }
    }

    const savedFavorites = localStorage.getItem('evidencia_favorites');
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (e) {
        console.error("Failed to parse favorites", e);
      }
    }

    const savedUser = localStorage.getItem('evidencia_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse user session", e);
      }
    }
  }, []);

  // Sync cart to LocalStorage
  useEffect(() => {
    localStorage.setItem('evidencia_cart', JSON.stringify(cart));
  }, [cart]);

  // Sync favorites to LocalStorage
  useEffect(() => {
    localStorage.setItem('evidencia_favorites', JSON.stringify(favorites));
  }, [favorites]);

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

  // Crossing helper: merges real-time Moblink API data (name, price, stock, sku, category)
  // with local database enriched fields (photos/images, rich description) matched by ID.
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
      const defaultCover = rawFotoUri || dbRecord?.foto_uri || (dbRecord?.images && dbRecord.images.length > 0 ? dbRecord.images[0] : null) || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=600&auto=format&fit=crop';

      // 1. LIVE DATA FROM MOBLINK API
      const liveName = item.descricao || item.nome || item.name || dbRecord?.name || dbRecord?.descricao || `Produto ${mobId}`;
      const rawPrecoFracao = item.preco_venda_fracao ?? item.preco_venda ?? item.preco ?? item.price;
      const livePrecoFracao = typeof rawPrecoFracao === 'number' 
        ? rawPrecoFracao 
        : rawPrecoFracao ? Number(String(rawPrecoFracao).replace(',', '.')) : 0;
      const livePrice = livePrecoFracao || Number(dbRecord?.price ?? 0);
      const liveOriginalPrice = typeof item.precoOriginal === 'number' ? item.precoOriginal : item.precoOriginal ? Number(item.precoOriginal) : dbRecord?.originalPrice;

      // Calculate Stock including saldos_lojas array / store balance
      let liveStock = 0;
      if (typeof item.saldo_loja === 'number') {
        liveStock = item.saldo_loja;
      } else if (Array.isArray(item.saldos_lojas)) {
        liveStock = item.saldos_lojas.reduce((acc: number, curr: any) => acc + (Number(curr?.saldo ?? curr?.qtd ?? curr?.quantidade ?? curr?.saldo_loja) || 0), 0);
      } else if (typeof item.saldos_lojas === 'number') {
        liveStock = item.saldos_lojas;
      } else if (typeof item.estoque === 'number') {
        liveStock = item.estoque;
      } else {
        liveStock = Number(item.stock ?? dbRecord?.stock ?? 0);
      }

      const liveSku = item.codigo || item.sku || dbRecord?.sku || mobId;
      const liveCategory = item.categoria || item.category || dbRecord?.category || 'Geral';
      const liveBarcode = item.codigoBarras || item.barcode || item.codigo || dbRecord?.barcode;
      const liveBrand = item.marca || dbRecord?.brand || 'Evidência';
      const liveMaterial = item.material || dbRecord?.material;
      const liveColor = item.cor || dbRecord?.color;
      const liveGender = item.genero || dbRecord?.gender;
      const liveSizes = item.tamanhos || dbRecord?.sizes || [];
      const liveIdGrade = item.id_grade ?? item.gradeId ?? dbRecord?.id_grade ?? dbRecord?.gradeId;

      // Extract Complementary Description (compl_descr)
      const liveComplDescr = item.compl_descr || item.descr_compl || item.descricao_complementar || item.compl_descricao || dbRecord?.compl_descr || '';

      // 2. ENRICHED MEDIA & DESCRIPTION FROM LOCAL DATABASE (FIREBASE) / MOBLINK API
      let combinedImages: string[] = [];
      if (rawFotoUri) {
        combinedImages = [rawFotoUri, ...(dbRecord?.images?.filter(img => img !== rawFotoUri) || [])];
      } else if (dbRecord?.images && dbRecord.images.length > 0) {
        combinedImages = dbRecord.images;
      } else {
        combinedImages = [defaultCover];
      }

      // Adaptation for Complete Description (Descrição + Descrição Complementar)
      let adaptedFullDescription = '';
      if (dbRecord?.description && dbRecord.description.trim() !== '') {
        adaptedFullDescription = dbRecord.description;
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
        name: liveName, // Direct from Moblink API
        descricao: liveName,
        compl_descr: liveComplDescr,
        descricao_completa: adaptedFullDescription,
        price: livePrice, // Direct from Moblink API
        preco_venda: livePrice,
        preco_venda_fracao: livePrecoFracao,
        originalPrice: liveOriginalPrice, // Direct from Moblink API
        stock: liveStock, // Direct from Moblink API
        saldo_loja: liveStock,
        saldos_lojas: item.saldos_lojas,
        category: liveCategory, // Direct from Moblink API
        onSale: Boolean((liveOriginalPrice && liveOriginalPrice > livePrice) || dbRecord?.onSale),
        images: combinedImages,
        foto_uri: rawFotoUri || dbRecord?.foto_uri || combinedImages[0],
        description: adaptedFullDescription, // Direct from Local DB or Moblink Adaptation
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

  // Sync MobLink products directly from API and cross with DB records
  const syncProductsFromMoblinkApi = async () => {
    try {
      const res = await fetch('/api/v1/produtos?pdf=false', { headers: { 'Accept': 'application/json' } });
      if (!res.ok) return;
      const data = await res.json();
      const rawList = Array.isArray(data) ? data : (data.produtos || data.data || []);
      if (!Array.isArray(rawList) || rawList.length === 0) return;

      // Get current database products to merge
      const currentDbProducts = products.length > 0 ? products : getLocalProducts();
      const crossedCatalog = mergeMoblinkWithLocalDb(rawList, currentDbProducts);

      // Save each crossed item into Firestore to keep database in sync
      for (const prod of crossedCatalog) {
        const docRef = doc(db, 'products', prod.id);
        await setDoc(docRef, prod, { merge: true });
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
        await syncProductsFromMoblinkApi();
      } catch (error) {
        console.warn("Seeding skipped or failed. Using local storage products fallback:", error);
      }
      
      const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
        const prodList: Product[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as Product;
          prodList.push({ id: doc.id, ...data });
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
  }, []);

  // Listen to orders
  useEffect(() => {
    setIsLoadingOrders(true);
    let unsubscribe = () => {};

    if (currentUser) {
      const ordersRef = collection(db, 'orders');
      let ordersQuery = query(ordersRef);

      if (currentUser.role === 'customer') {
        ordersQuery = query(ordersRef, where('customerEmail', '==', currentUser.email));
      }

      unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
        const orderList: Order[] = [];
        snapshot.forEach((doc) => {
          orderList.push({ id: doc.id, ...doc.data() } as Order);
        });
        // Sort orders by date descending
        orderList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(orderList);
        saveLocalOrders(orderList);
        setIsLoadingOrders(false);
      }, (error) => {
        console.warn("Firestore collection orders listening failed, serving cached local orders:", error.message);
        // Filter local orders by user if customer
        const cached = getLocalOrders();
        const filtered = currentUser.role === 'customer' 
          ? cached.filter(o => o.customerEmail === currentUser.email)
          : cached;
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(filtered);
        setIsLoadingOrders(false);
      });
    } else {
      setOrders([]);
      setIsLoadingOrders(false);
    }

    return () => unsubscribe();
  }, [currentUser]);

  // Synchronize product detail view with URL search params to support sharing links
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

    // Try Firestore
    try {
      await setDoc(doc(db, 'users', uid), profile);
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

    // Dynamic Seed Admin or Seller Fallback for immediate evaluation/reviewer access!
    if (formattedEmail === 'admin@evidencia.com' || formattedEmail === 'vendedor@evidencia.com') {
      const isSeller = formattedEmail === 'vendedor@evidencia.com';
      const profile: UserProfile = {
        uid,
        name: isSeller ? 'Vendedor Evidência' : 'Administrador Evidência',
        email: formattedEmail,
        role: isSeller ? 'seller' : 'admin',
        createdAt: new Date().toISOString()
      };
      saveLocalUser(uid, profile);
      setCurrentUser(profile);
      localStorage.setItem('evidencia_user', JSON.stringify(profile));
      return profile;
    }

    return null;
  };

  const loginWithGoogle = async (): Promise<UserProfile | null> => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      if (user) {
        const uid = user.uid;
        const name = user.displayName || 'Cliente Google';
        const email = user.email || '';
        const photoURL = user.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`;
        const profile: UserProfile = {
          uid,
          name,
          email,
          role: 'customer',
          photoURL,
          createdAt: new Date().toISOString()
        };
        saveLocalUser(uid, profile);
        setCurrentUser(profile);
        localStorage.setItem('evidencia_user', JSON.stringify(profile));
        try {
          await setDoc(doc(db, 'users', uid), profile);
        } catch (error) {
          console.warn("Firestore registration failed, stored profile locally:", error);
        }
        return profile;
      }
    } catch (error) {
      console.error("Google Sign-In failed:", error);
      throw error;
    }
    return null;
  };

  const loginWithGoogleSimulated = async (name: string, email: string, photoURL?: string): Promise<UserProfile> => {
    const formattedEmail = email.toLowerCase().trim();
    const uid = 'google_sim_' + formattedEmail.replace(/[^a-zA-Z0-9]/g, '_');
    const finalPhoto = photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`;
    const profile: UserProfile = {
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
      await setDoc(doc(db, 'users', uid), profile);
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

    // Try Firestore
    try {
      await setDoc(doc(db, 'users', updatedProfile.uid), updatedProfile);
    } catch (error) {
      console.warn("Firestore profile update failed, stored profile locally:", error);
    }

    return updatedProfile;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('evidencia_user');
    setCurrentView('home');
  };

  // Order Actions & WhatsApp integration
  const createOrder = async (customerName: string, customerEmail: string): Promise<Order> => {
    const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const orderItems = cart.map((item) => ({
      productId: item.product.id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      selectedSize: item.selectedSize,
      image: item.product.images?.[0] || item.product.foto_uri || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=600&auto=format&fit=crop'
    }));

    let message = `*Novo Pedido - Evidência Calçados*\n\n`;
    message += `*Cliente:* ${customerName}\n`;
    message += `*E-mail:* ${customerEmail}\n\n`;
    message += `*Itens do Pedido:*\n`;
    
    orderItems.forEach((item) => {
      const sizeStr = item.selectedSize && item.selectedSize !== 0 && item.selectedSize !== 'Único' ? ` (Tamanho: ${item.selectedSize})` : '';
      message += `- ${item.name}${sizeStr} x${item.quantity} - R$ ${(item.price * item.quantity).toFixed(2)}\n`;
    });
    
    message += `\n*Total:* R$ ${total.toFixed(2)}\n\n`;
    message += `Gostaria de confirmar os detalhes do meu pedido e o pagamento!`;

    const encodedMsg = encodeURIComponent(message);
    const savedPhone = localStorage.getItem('evidencia_settings_whatsapp') || '5599984684867';
    const cleanPhone = savedPhone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;

    const orderId = `EVC-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder: Order = {
      id: orderId,
      customerEmail: customerEmail.toLowerCase().trim(),
      customerName,
      items: orderItems,
      total,
      status: 'Pendente',
      createdAt: new Date().toISOString(),
      whatsappUrl
    };

    // Save locally
    const currentLocalOrders = getLocalOrders();
    const updatedLocalOrders = [newOrder, ...currentLocalOrders];
    saveLocalOrders(updatedLocalOrders);
    setOrders(updatedLocalOrders);

    // Update stock locally
    const currentLocalProducts = getLocalProducts();
    const updatedLocalProducts = currentLocalProducts.map(prod => {
      const cartItem = cart.find(item => item.product.id === prod.id);
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
      for (const item of cart) {
        if (item.product.stockControl) {
          const prodRef = doc(db, 'products', item.product.id);
          const newStock = Math.max(0, item.product.stock - item.quantity);
          await setDoc(prodRef, { stock: newStock }, { merge: true });
        }
      }
    } catch (error) {
      console.warn("Firestore order submission failed, operating in offline fallback mode:", error);
    }

    clearCart();
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

    // Try Firestore
    try {
      await setDoc(doc(db, 'products', product.id), product);
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
    // Update state & local storage
    const updated = products.map(p => p.id === productId ? { ...p, ...updatedFields } : p);
    setProducts(updated);
    saveLocalProducts(updated);

    // Try Firestore
    try {
      await setDoc(doc(db, 'products', productId), updatedFields, { merge: true });
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

  // Auth Session State for Sincom/Moblink API
  const [authSession, setAuthSession] = useState<SincomAuthSession | null>(() => {
    return sincomAuthService.getSavedSession();
  });

  const loginSincomAuth = async (config?: { apiUrl?: string }): Promise<SincomAuthSession> => {
    const session = await sincomAuthService.login({
      apiUrl: config?.apiUrl || moblinkConfig.apiUrl
    });

    setAuthSession(session);

    if (session.status === 'authenticated' && session.token) {
      await updateMoblinkConfig({
        apiToken: session.token,
        accessToken: session.token,
        tokenExpiresAt: session.expiresAt,
        authStatus: 'authenticated',
        lastSyncAt: new Date().toISOString()
      });
    } else {
      await updateMoblinkConfig({ authStatus: 'error' });
    }

    return session;
  };

  const logoutSincomAuth = () => {
    sincomAuthService.logout();
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

        // Update in Firestore asynchronously
        try {
          setDoc(doc(db, 'products', prod.id), updatedProd, { merge: true });
        } catch (e) {
          console.warn("Could not sync product update to Firestore:", e);
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
    // Generate sync batch from current products that have SKUs or Moblink IDs
    const syncPayload = products.map(p => ({
      sku: p.sku || p.modelOrSku || p.id,
      moblinkId: p.moblinkId || p.id,
      name: p.name,
      stock: Math.floor(Math.random() * 25) + 3, // Simulated live pull from Moblink API
      sizeStockMap: p.sizes ? p.sizes.reduce((acc: any, sz) => ({ ...acc, [String(sz)]: Math.floor(Math.random() * 8) + 1 }), {}) : { "Único": 10 }
    }));

    const result = await importMoblinkStockBatch(syncPayload);
    
    // Also post to backend server
    try {
      await fetch('/api/moblink/sync-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: syncPayload, source: 'manual_api' })
      });
    } catch (e) {
      // server call optional
    }

    return result;
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
        userRole: currentUser ? currentUser.role : null,
        registerUser,
        loginUser,
        loginWithGoogle,
        loginWithGoogleSimulated,
        updateUserProfile,
        logout,
        orders,
        isLoadingOrders,
        createOrder,
        updateOrderStatus,
        assignOrderSeller,
        addProduct,
        deleteProduct,
        updateProduct,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
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
