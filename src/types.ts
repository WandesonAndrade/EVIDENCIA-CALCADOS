export interface GradeProduto {
  id: number | string;
  descricao: string;
  descr_linha: string;
  descr_coluna: string;
}

export interface MoblinkProduto {
  id: number | string;
  descricao: string;
  compl_descr?: string;
  descricao_completa?: string;
  preco_venda: number;
  preco_venda_fracao?: number;
  saldo_loja?: number;
  saldos_lojas?: any[];
  foto_uri?: string;
  id_grade?: number | string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  onSale?: boolean;
  category: string;
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
  warrantyOrVolume?: string;
  customAttributes?: { label: string; value: string }[];
  // Moblink ERP specific properties
  foto_uri?: string;
  descricao?: string;
  compl_descr?: string;
  descricao_completa?: string;
  preco_venda?: number;
  preco_venda_fracao?: number;
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
  moblinkStock?: number;
  lastMoblinkSync?: string;
  moblinkSyncStatus?: 'synced' | 'pending' | 'error' | 'not_linked';
}

export interface SincomAuthSession {
  token: string;
  tokenType?: string;
  expiresAt?: string;
  authenticatedAt?: string;
  user?: string;
  status: 'authenticated' | 'unauthenticated' | 'error';
  message?: string;
}

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

export interface MoblinkSyncLog {
  id: string;
  timestamp: string;
  type: 'webhook' | 'manual_api' | 'manual_import' | 'cron';
  status: 'success' | 'warning' | 'error';
  message: string;
  itemsProcessed: number;
  itemsUpdated: number;
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

export interface Order {
  id: string;
  customerEmail: string;
  customerName: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  whatsappUrl: string;
  sellerEmail?: string;
  sellerName?: string;
}

export type UserRole = 'admin' | 'seller' | 'customer';

export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
}

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

