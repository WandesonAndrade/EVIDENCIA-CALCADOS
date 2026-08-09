export interface GradeProduto {
  id: number | string;
  descricao: string;
  descr_linha: string;
  descr_coluna: string;
}

export interface ProdutoGradeVariacao {
  id?: string;
  tamanho: string;
  cor: string;
  saldo_loja: number;
  cod_barras?: string;
  pos_grade?: string;
}

export interface ProdutoGradesResult {
  id_produto: string;
  hasGrade: boolean;
  descr_linha?: string;
  descr_coluna?: string;
  tamanhos: string[];
  cores: string[];
  variacoes: ProdutoGradeVariacao[];
}

export interface MoblinkPrecoTabela {
  nome_tab_preco?: string;  // Ex: "A VISTA", "CREDIARIO", "CARTAO"
  tabela?: string;
  tipo?: string;
  nome?: string;
  preco?: number;
  valor?: number;
  preco_venda?: number;
  price?: number;
}

export interface MoblinkProduto {
  id: number | string;
  moblinkId?: string;
  descricao: string;
  descr_compl?: string;
  nome?: string;
  name?: string;
  sku?: string;
  compl_descr?: string;
  descricao_completa?: string;
  /** Código de classificação da categoria no ERP (ex: "002.004") */
  classificacao?: string | number;
  preco_venda: number;
  /** Preço promocional (quando houver) */
  preco_promocao?: number;
  preco_venda_fracao?: number;
  preco_vista?: number;
  precoVista?: number;
  preco_cartao?: number;
  precoCartao?: number;
  precos?: MoblinkPrecoTabela[];
  saldo_loja?: number;
  saldos_lojas?: any[];
  foto_uri?: string;
  id_grade?: number | string;
  tamanhos?: (number | string)[];
  categoria?: string;
  category?: string;
  subcategoria?: string;
  subcategory?: string;
  nome_grupo?: string;
  nome_subgrupo?: string;
  id_grupo?: string | number;
  id_subgrupo?: string | number;
  id_pai?: string | number;
  barcode?: string;
  referencia?: string;
  referenceCode?: string;
  marca?: string;
  brand?: string;
  material?: string;
  cor?: string;
  genero?: string;
  gender?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  price: number;
  promoPrice?: number | null;
  precoVista?: number;
  precoCartao?: number;
  preco_cartao?: number;
  originalPrice?: number;
  updatedAt?: string;
  onSale?: boolean;
  category: string;
  subcategory?: string;
  nome_grupo?: string;
  nome_subgrupo?: string;
  id_grupo?: string | number;
  id_subgrupo?: string | number;
  id_pai?: string | number;
  images: string[];
  sizes: (number | string)[];
  crediarioProprio: boolean;
  visible: boolean;
  stockControl: boolean;
  stock: number;
  newArrival?: boolean;
  productType?: 'calçados' | 'roupas' | 'acessórios' | 'perfumes' | 'eletrônicos' | 'geral';
  brand?: string;
  gender?: string;
  material?: string;
  color?: string;
  modelOrSku?: string;
  referencia?: string;
  warrantyOrVolume?: string;
  customAttributes?: { label: string; value: string }[];
  // Moblink ERP specific properties
  foto_uri?: string;
  descricao?: string;
  compl_descr?: string;
  descricao_completa?: string;
  /** Código de classificação do ERP (ex: "002.004") */
  classificacao?: string | number;
  preco_venda?: number;
  preco_venda_fracao?: number;
  preco_vista?: number;
  /** Preço promocional vindo do ERP */
  preco_promocao?: number;
  saldo_loja?: number;
  saldos_lojas?: any;
  id_grade?: number | string;
  gradeId?: number | string;
  grade?: GradeProduto;
  // Moblink ERP Integration fields
  moblinkId?: string;
  sku?: string;
  barcode?: string;
  sizeStockMap?: Record<string, number>;
  stockBySize?: Record<string, number>;
  moblinkStock?: number;
  lastMoblinkSync?: string;
  moblinkSyncStatus?: 'synced' | 'pending' | 'error' | 'not_linked';
  modelCode?: string;
  referenceCode?: string;
  cor?: string;
}

export interface EvidenciaAuthSession {
  token: string;
  expiresAt?: string;
  authenticatedAt?: string;
  status: 'authenticated' | 'unauthenticated' | 'error';
  message?: string;
}

/** @deprecated Use EvidenciaAuthSession */
export type SincomAuthSession = EvidenciaAuthSession;

export interface MoblinkConfig {
  id: string;
  enabled: boolean;
  apiUrl: string;
  apiToken: string;
  apiUser?: string;
  apiPassword?: string;
  accessToken?: string;
  tokenExpiresAt?: string;
  authStatus?: 'authenticated' | 'unauthenticated' | 'error';
  empresaId: string;
  filialId: string;
  webhookSecret: string;
  autoSyncEnabled: boolean;
  syncIntervalMinutes: number;
  lastSyncAt?: string;
  stockMatchKey: 'sku' | 'moblinkId' | 'barcode' | 'name';
  autoCreateMissingProducts?: boolean;
}

export interface MoblinkSyncLogItem {
  sku?: string;
  moblinkId?: string;
  productName?: string;
  size?: string;
  oldStock?: number;
  newStock?: number;
  status: 'updated' | 'created' | 'not_found' | 'error';
  message?: string;
}

export type ViewMode = 'home' | 'cart' | 'admin' | 'admin-login' | 'login' | 'orders' | 'product-detail' | 'portfolio-case' | 'category-page' | 'about' | 'support' | 'favorites' | 'meu-crediario';

export interface MoblinkSyncLog {
  id: string;
  timestamp: string;
  type: 'webhook' | 'manual_api' | 'manual_import' | 'cron';
  source?: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  itemsProcessed?: number;
  itemsUpdated?: number;
  itemCount?: number;
  items?: any[];
  details?: MoblinkSyncLogItem[];
}

export interface CartItem {
  product: Product;
  selectedSize: number | string;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  selectedSize: number | string;
  image: string;
}

export type OrderStatus = 'Pendente' | 'Confirmado' | 'Cancelado' | 'Entregue';

export type PaymentStatus = 'Pendente' | 'Confirmado' | 'Em Análise' | 'Recusado';

export interface Order {
  id: string;
  orderNumber?: string;
  userId?: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  city?: string;
  deliveryAddress?: string;
  deliveryType?: 'Entrega em Caxias-MA' | 'Entrega para Outras Cidades' | 'Retirada na Loja';
  items: OrderItem[];
  subtotal?: number;
  freightCost?: number;
  cashbackDiscount?: number;
  total: number;
  paymentMethod?: 'Pix' | 'Cartão de Crédito' | 'Crediário da Loja';
  paymentStatus?: PaymentStatus;
  installments?: number;
  status: OrderStatus;
  createdAt: string;
  whatsappUrl: string;
  sellerEmail?: string;
  sellerName?: string;
}

export type UserRole = 'admin' | 'seller' | 'customer';

export interface Subcategory {
  id: string;
  name: string;
  subCode?: string;
  parentId?: string;
  id_subgrupo?: string | number;
  id_pai?: string | number;
  description?: string;
  visible?: boolean;
  active?: boolean;
}

export interface Category {
  id: string;
  code?: string;
  name: string;
  description?: string;
  subcategories?: Subcategory[];
  id_grupo?: string | number;
  createdAt?: string;
  updatedAt?: string;
  active?: boolean;
  visible?: boolean;
}

export type CrediarioStatus = 'NaoSolicitado' | 'EmAnalise' | 'Aprovado' | 'Rejeitado';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt?: string;
  photoURL?: string;
  rg?: string;
  cpf?: string;
  nomePai?: string;
  nomeMae?: string;
  dataNascimento?: string;
  naturalidade?: string;
  endereco?: string;
  telefone?: string;
  cep?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  complemento?: string;
  pontoReferencia?: string;
  // Professional & Emergency Contacts for Store Credit
  profissao?: string;
  rendaMensal?: string;
  referenciaPessoal?: string;
  // Crediário Status & MobLink ERP fields
  solicitarCrediario?: boolean;
  crediarioStatus?: CrediarioStatus;
  crediarioSolicitadoEm?: string;
  crediarioAnalisadoEm?: string;
  crediarioMotivoRejeicao?: string;
  moblinkId?: string;
  isErpCustomer?: boolean;
  sit_cred?: string;
  limite_cred?: number;
  valor_vencido?: number;
  valor_vencer?: number;
  // CRM, Intent Tags & Cashback fields
  isProfileComplete?: boolean;
  cartItemsCount?: number;
  favoriteItemsCount?: number;
  favoriteIds?: string[];
  favorites?: string[];
  cartItems?: Array<{ productId: string; name: string; price: number; selectedSize: number | string; quantity: number }>;
  cart?: Array<{ productId: string; name: string; price: number; selectedSize: number | string; quantity: number }>;
  cashbackBalance?: number;
  cashbackValidUntil?: string;
  requiresPasswordChange?: boolean;
  tempPassword?: string;
  isSeller?: boolean;
  isAuthorizedCollaborator?: boolean;
}


export interface HeroBanner {
  id: string;
  badge: string;
  title: string;
  description: string;
  image: string;
  buttonText: string;
  tabKey: string;
  active: boolean;
}

export interface HomeSectionConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface AboutConfig {
  title: string;
  subtitle: string;
  description: string;
  highlightImage: string;
  badgeText: string;
  stats?: { label: string; value: string }[];
}

export interface ContactConfig {
  whatsapp: string;
  email: string;
  address: string;
  hours: string;
  promoBannerText: string;
  isPromoBannerActive: boolean;
}

export interface StoreConfig {
  heroBanners: HeroBanner[];
  homeSections: HomeSectionConfig[];
  aboutConfig: AboutConfig;
  contactConfig: ContactConfig;
}


