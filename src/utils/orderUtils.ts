import { Order, OrderItem, OrderStatus, PaymentStatus, Product } from '../types';
import { Clock, CheckCircle2, Truck, PackageCheck, AlertCircle } from 'lucide-react';

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

// Cálculo da Etapa de Progresso (0 a 4)
export const getOrderProgressStep = (order: Order): number => {
  if (order.status === 'Cancelado') return 0;
  if (order.status === 'Entregue') return 4;
  if (order.status === 'Em Preparação') return 3;
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
