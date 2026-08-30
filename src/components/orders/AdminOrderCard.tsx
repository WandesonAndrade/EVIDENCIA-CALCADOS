import React from 'react';
import { Trash2, User } from 'lucide-react';
import { Order, OrderStatus, PaymentStatus } from '../../types';
import { CustomerInfoCard } from './CustomerInfoCard';
import { PaymentInfoCard } from './PaymentInfoCard';
import { ShippingInfoCard } from './ShippingInfoCard';
import { FreightStatusCard } from './FreightStatusCard';
import { OrderItemsGrid } from './OrderItemsGrid';
import { getAdminStatusStyle, formatDateBR } from '../../utils/orderUtils';

interface Props {
  order: Order;
  isDark: boolean;
  editingFreight?: string;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  onPaymentConfirm: (orderId: string) => void;
  onFreightChange: (orderId: string, val: string) => void;
  onFreightSave: (orderId: string) => void;
  onDelete: (orderId: string) => void;
}

export const AdminOrderCard: React.FC<Props> = ({
  order, isDark, editingFreight,
  onStatusChange, onPaymentConfirm, onFreightChange, onFreightSave, onDelete,
}) => {
  return (
    <div
      className={`p-6 rounded-3xl border backdrop-blur-xl space-y-4 transition-all shadow-md ${
        isDark ? 'bg-slate-900/80 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}
    >
      {/* Card Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 border-slate-800/50">
        <div className="flex items-center space-x-3">
          <span className="font-mono text-sm font-black text-amber-400">{order.orderNumber || order.id}</span>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${getAdminStatusStyle(order.status)}`}>
            {order.status || 'Pendente'}
          </span>
          {order.sellerName && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/10 text-amber-400 border border-amber-400/30 flex items-center space-x-1">
              <User className="h-3 w-3" />
              <span>Vendedor: {order.sellerName}</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center space-x-4 text-xs font-semibold gap-2">
          <span className="text-slate-400">
            Data: {order.createdAt ? formatDateBR(order.createdAt) : 'Hoje'}
          </span>

          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Etapa do Pedido:</span>
            <select
              value={order.status}
              onChange={(e) => onStatusChange(order.id, e.target.value as OrderStatus)}
              className={`p-1.5 rounded-lg text-xs font-bold border focus:outline-none cursor-pointer ${
                isDark ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-slate-100 border-slate-300 text-slate-900'
              }`}
            >
              <option value="Pendente">1. Pedido Recebido</option>
              <option value="Confirmado">2. Pagamento OK</option>
              <option value="Em Preparação">3. Em Preparação</option>
              <option value="Entregue">4. Entregue</option>
              <option value="Cancelado">❌ Cancelado</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => onDelete(order.id)}
            title="Excluir Pedido"
            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all cursor-pointer flex items-center justify-center"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 4-Column Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        <CustomerInfoCard order={order} isDark={isDark} />
        <PaymentInfoCard
          order={order}
          isDark={isDark}
          variant="admin"
          onConfirmPayment={() => onPaymentConfirm(order.id)}
        />
        <ShippingInfoCard order={order} isDark={isDark} variant="admin" />
        <FreightStatusCard
          order={order}
          isDark={isDark}
          variant="admin"
          editingFreight={editingFreight}
          onEditingChange={(val) => onFreightChange(order.id, val)}
          onSaveFreight={() => onFreightSave(order.id)}
        />
      </div>

      {/* Order Items */}
      <OrderItemsGrid items={order.items || []} isDark={isDark} variant="admin" />
    </div>
  );
};
