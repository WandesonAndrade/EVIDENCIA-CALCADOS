import { Order, OrderItem, OrderStatus, PaymentStatus, Product } from '../types';
import { Clock, CheckCircle2, Truck, PackageCheck, AlertCircle } from 'lucide-react';

// Formatacao
export const formatCurrency = (value: number | undefined | null): string =>
  (value || 0).toFixed(2).replace('.', ',');

export const formatDateBR = (isoStr: string): string => {
  try {
    const date = new Date(isoStr);
    if (isNaN(date.getTime())) return isoStr;
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
};

// Calculo da etapa visual (0-4)
export const getOrderProgressStep = (order: Order): number => {
  if (order.status === 'Cancelado') return 0;
  if (order.status === 'Entregue') return 4;
  if (order.status === 'Em Preparação') return 3;
  if (order.status === 'Confirmado' || order.paymentStatus === 'Confirmado') return 2;
  return 1;
};

// Badge de status do pedido (para o cliente)
export const getStatusBadge = (status: OrderStatus, isDark: boolean) => {
  switch (status) {
    case 'Confirmado':
      return {
        label: 'Pagamento Confirmado',
        style: isDark
          ? 'bg-[#006EDB]/20 text-[#DDF1FF] border-[#006EDB]/40'
          : 'bg-[#DDF1FF] text-[#003B73] border-[#006EDB]/30',
        icon: CheckCircle2,
      };
    case 'Em Preparação':
      return {
        label: 'Em Preparação / Envio',
        style: isDark
          ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
          : 'bg-sky-50 text-sky-800 border-sky-200',
        icon: Truck,
      };
    case 'Entregue':
      return {
        label: 'Entregue',
        style: isDark
          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
          : 'bg-emerald-50 text-emerald-800 border-emerald-200',
        icon: PackageCheck,
      };
    case 'Cancelado':
      return {
        label: 'Cancelado',
        style: isDark
          ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
          : 'bg-rose-50 text-rose-700 border-rose-200',
        icon: AlertCircle,
      };
    default:
      return {
        label: status || 'Pedido Recebido',
        style: isDark
          ? 'bg-amber-400/20 text-amber-400 border-amber-400/40'
          : 'bg-amber-50 text-amber-900 border-amber-200',
        icon: Clock,
      };
  }
};

// Estilo do badge de status para o admin (dark-first)
export const getAdminStatusStyle = (status: OrderStatus): string => {
  switch (status) {
    case 'Confirmado':    return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
    case 'Em Preparação': return 'bg-sky-500/20 text-sky-400 border border-sky-500/30';
    case 'Entregue':      return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    case 'Cancelado':     return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
    default:              return 'bg-amber-400/20 text-amber-400 border border-amber-400/30';
  }
};

// Estilo do badge de pagamento (client ou admin variant)
export const getPaymentStatusStyle = (
  status: PaymentStatus | undefined,
  variant: 'client' | 'admin' = 'client'
): string => {
  if (variant === 'admin') {
    switch (status) {
      case 'Confirmado':  return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      case 'Em Análise':  return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
      case 'Recusado':    return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
      default:            return 'bg-amber-400/20 text-amber-400 border border-amber-400/30';
    }
  }
  switch (status) {
    case 'Confirmado':  return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'Em Análise':  return 'bg-purple-50 text-purple-800 border-purple-200';
    case 'Recusado':    return 'bg-rose-50 text-rose-700 border-rose-200';
    default:            return 'bg-amber-50 text-amber-800 border-amber-200';
  }
};

// WhatsApp
export const sanitizePhone = (phone: string): string => phone.replace(/\D/g, '');

export const buildWhatsAppUrl = (phone: string, message?: string): string => {
  const clean = sanitizePhone(phone);
  const base = 'https://wa.me/55' + clean;
  return message ? base + '?text=' + encodeURIComponent(message) : base;
};

// Produto fallback para navegação por item do pedido
export const createFallbackProduct = (item: OrderItem): Product => ({
  id: item.productId || item.name,
  name: item.name,
  price: item.price || 0,
  originalPrice: item.originalPrice || item.price || 0,
  images: item.image ? [item.image] : [],
  imageUrl: item.image,
  category: 'Calçados',
  stock: 0,
  visible: true,
  description: '',
  sizes: [],
  crediarioProprio: false,
  stockControl: false,
  updatedAt: new Date().toISOString(),
});
