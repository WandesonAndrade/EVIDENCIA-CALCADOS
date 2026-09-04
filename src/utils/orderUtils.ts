import { Order, OrderItem, OrderStatus, PaymentStatus, Product } from '../types';
import { Clock, CheckCircle2, Truck, PackageCheck, AlertCircle, Package } from 'lucide-react';

// Formatação Monetária Apple Style (precisa, sem espaços em excesso)
export const formatCurrency = (value: number | undefined | null): string =>
  (value || 0).toFixed(2).replace('.', ',');

// Formatação de Data Compacta & Elegante
export const formatDateBR = (isoStr: string): string => {
  try {
    const date = new Date(isoStr);
    if (isNaN(date.getTime())) return isoStr;
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).replace(' de ', ' ').replace(' de ', ', ');
  } catch {
    return isoStr;
  }
};

// Mapeamento infalível de UF por faixa de prefixo de CEP no Brasil
export const getUfFromCep = (cep: string | undefined | null): string => {
  const clean = (cep || '').replace(/\D/g, '');
  if (!clean || clean.length < 2) return 'MA';
  const p2 = parseInt(clean.substring(0, 2), 10);
  if (p2 >= 1 && p2 <= 19) return 'SP';
  if (p2 >= 20 && p2 <= 28) return 'RJ';
  if (p2 === 29) return 'ES';
  if (p2 >= 30 && p2 <= 39) return 'MG';
  if (p2 >= 40 && p2 <= 48) return 'BA';
  if (p2 === 49) return 'SE';
  if (p2 >= 50 && p2 <= 56) return 'PE';
  if (p2 === 57) return 'AL';
  if (p2 === 58) return 'PB';
  if (p2 === 59) return 'RN';
  if (p2 >= 60 && p2 <= 63) return 'CE';
  if (p2 === 64) return 'PI'; // Teresina / Piauí
  if (p2 === 65) return 'MA'; // Caxias / Maranhão
  if (p2 >= 66 && p2 <= 68) return 'PA';
  if (p2 === 69) return 'AM';
  if (p2 >= 70 && p2 <= 72) return 'DF';
  if (p2 >= 73 && p2 <= 76) return 'GO';
  if (p2 === 77) return 'TO';
  if (p2 >= 78 && p2 <= 79) return 'MT';
  if (p2 >= 80 && p2 <= 87) return 'PR';
  if (p2 >= 88 && p2 <= 89) return 'SC';
  if (p2 >= 90 && p2 <= 99) return 'RS';
  return 'MA';
};

// Cálculo da Etapa de Progresso (0 a 5)
export const getOrderProgressStep = (order: Order): number => {
  if (order.status === 'Cancelado') return 0;
  if (order.status === 'Entregue' || order.labelStatus === 'entregue') return 5;
  if (order.status === 'Em Trânsito' || order.labelStatus === 'em_transito' || order.labelStatus === 'postado') return 4;
  if (
    order.status === 'Em Preparação' || 
    order.labelStatus === 'gerada' || 
    order.labelStatus === 'impressa' || 
    order.labelStatus === 'liberada' ||
    Boolean(order.melhorEnvioId)
  ) return 3;
  if (order.status === 'Confirmado' || order.paymentStatus === 'Confirmado') return 2;
  return 1;
};

// Badges de Status com Identidade Visual Apple (Translucidez, Dot Color & Hairline Borders)
export const getStatusBadge = (status: OrderStatus, isDark: boolean) => {
  switch (status) {
    case 'Confirmado':
      return {
        label: 'Pagamento Aprovado',
        style: isDark
          ? 'bg-[#30D158]/15 text-[#30D158] border-[#30D158]/25'
          : 'bg-[#34C759]/10 text-[#248A3D] border-[#34C759]/20',
        dotColor: isDark ? 'bg-[#30D158]' : 'bg-[#34C759]',
        icon: CheckCircle2,
      };
    case 'Em Preparação':
      return {
        label: 'Em Preparação',
        style: isDark
          ? 'bg-[#AF52DE]/15 text-[#AF52DE] border-[#AF52DE]/25'
          : 'bg-[#AF52DE]/10 text-[#8944AB] border-[#AF52DE]/20',
        dotColor: isDark ? 'bg-[#AF52DE]' : 'bg-[#8944AB]',
        icon: Package,
      };
    case 'Em Trânsito':
      return {
        label: 'Em Trânsito',
        style: isDark
          ? 'bg-[#0A84FF]/15 text-[#0A84FF] border-[#0A84FF]/25'
          : 'bg-[#0071E3]/10 text-[#0071E3] border-[#0071E3]/20',
        dotColor: isDark ? 'bg-[#0A84FF]' : 'bg-[#0071E3]',
        icon: Truck,
      };
    case 'Entregue':
      return {
        label: 'Entregue',
        style: isDark
          ? 'bg-[#30D158]/20 text-[#30D158] border-[#30D158]/30'
          : 'bg-[#34C759]/15 text-[#1E7231] border-[#34C759]/25',
        dotColor: isDark ? 'bg-[#30D158]' : 'bg-[#34C759]',
        icon: PackageCheck,
      };
    case 'Cancelado':
      return {
        label: 'Cancelado',
        style: isDark
          ? 'bg-[#FF453A]/15 text-[#FF453A] border-[#FF453A]/25'
          : 'bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/20',
        dotColor: isDark ? 'bg-[#FF453A]' : 'bg-[#FF3B30]',
        icon: AlertCircle,
      };
    default:
      return {
        label: status || 'Pedido Recebido',
        style: isDark
          ? 'bg-[#FF9F0A]/15 text-[#FF9F0A] border-[#FF9F0A]/25'
          : 'bg-[#FF9500]/10 text-[#C97700] border-[#FF9500]/20',
        dotColor: isDark ? 'bg-[#FF9F0A]' : 'bg-[#FF9500]',
        icon: Clock,
      };
  }
};

// Estilo do Badge de Status do Administrador (Refined Apple HIG)
export const getAdminStatusStyle = (status: OrderStatus): string => {
  switch (status) {
    case 'Confirmado':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
    case 'Em Preparação':
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20';
    case 'Em Trânsito':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
    case 'Entregue':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30';
    case 'Cancelado':
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
    default:
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20';
  }
};

// Estilo do Badge de Pagamento Apple HIG
export const getPaymentStatusStyle = (
  status: PaymentStatus | undefined,
  _variant: 'client' | 'admin' = 'client'
): string => {
  switch (status) {
    case 'Confirmado':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
    case 'Em Análise':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
    case 'Recusado':
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
    default:
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20';
  }
};

// WhatsApp Helpers
export const sanitizePhone = (phone: string): string => phone.replace(/\D/g, '');

export const buildWhatsAppUrl = (phone: string, message?: string): string => {
  const clean = sanitizePhone(phone);
  const base = 'https://wa.me/55' + clean;
  return message ? base + '?text=' + encodeURIComponent(message) : base;
};

// Fallback de Produto
export const createFallbackProduct = (item: OrderItem): Product => ({
  id: item.productId || item.name,
  name: item.name,
  price: item.price || 0,
  originalPrice: item.originalPrice || item.price || 0,
  images: item.image ? [item.image] : [],
  imageUrl: item.image,
  category: 'Calçados',
  sizes: item.selectedSize ? [item.selectedSize] : [36, 37, 38, 39, 40],
  stockControl: false,
  crediarioProprio: false,
  stock: 0,
  visible: true,
  description: '',
  updatedAt: new Date().toISOString(),
});
