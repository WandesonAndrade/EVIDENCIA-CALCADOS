import React from 'react';
import { Trash2, User, Calendar } from 'lucide-react';
import { Order, OrderStatus } from '../../types';
import { CustomerInfoCard } from './CustomerInfoCard';
import { PaymentInfoCard } from './PaymentInfoCard';
import { ShippingInfoCard } from './ShippingInfoCard';
import { FreightStatusCard } from './FreightStatusCard';
import { OrderItemsGrid } from './OrderItemsGrid';
import { AdminStageSelector } from './AdminStageSelector';
import { AdminStageStepper } from './AdminStageStepper';
import { formatDateBR, formatCurrency } from '../../utils/orderUtils';

interface Props {
  order: Order;
  isDark: boolean;
  editingFreight?: string;
  editingLocalSaleId?: string;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  onFreightChange: (orderId: string, val: string) => void;
  onFreightSave: (orderId: string) => void;
  onLocalSaleIdChange?: (orderId: string, val: string) => void;
  onLocalSaleIdSave?: (orderId: string) => void;
  onDelete: (orderId: string) => void;
}

export const AdminOrderCard: React.FC<Props> = ({
  order, isDark, editingFreight, editingLocalSaleId,
  onStatusChange, onFreightChange, onFreightSave,
  onLocalSaleIdChange, onLocalSaleIdSave, onDelete,
}) => {
  const isStorePickup = order.deliveryType === 'Retirada na Loja';
  const rawNumber = order.orderNumber || order.id;
  const displayOrderNumber = rawNumber.startsWith('#') ? rawNumber : `#${rawNumber}`;

  return (
    <div
      className={`rounded-3xl border p-5 sm:p-6 space-y-5 transition-all duration-200 ${
        isDark
          ? 'bg-[#161617]/90 border-white/[0.08] backdrop-blur-2xl shadow-[0_4px_24px_rgba(0,0,0,0.5)] text-slate-100'
          : 'bg-white border-black/[0.06] shadow-[0_2px_16px_rgba(0,0,0,0.03)] text-slate-900'
      }`}
    >
      {/* Barra Superior do Pedido (macOS Window Header) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-black/[0.04] dark:border-white/[0.06]">
        {/* Identificação do Pedido & Seletor de Etapa Profissional */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] text-slate-800 dark:text-slate-200 border border-black/[0.06] dark:border-white/[0.08]">
            {displayOrderNumber}
          </span>

          {order.localSaleId && (
            <span
              className="font-mono text-xs font-semibold px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 flex items-center space-x-1"
              title="ID da Venda vinculada no Sistema Local / ERP"
            >
              <span>🖥️ ERP: #{order.localSaleId}</span>
            </span>
          )}

          {/* Seletor Customizado de Etapa Apple Style */}
          <AdminStageSelector
            currentStatus={order.status}
            isDark={isDark}
            isStorePickup={isStorePickup}
            onStatusChange={(newStatus) => onStatusChange(order.id, newStatus)}
          />

          {order.sellerName && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-black/[0.03] dark:bg-white/[0.05] text-slate-600 dark:text-slate-300 border border-black/[0.05] dark:border-white/[0.08] flex items-center space-x-1">
              <User className="h-3 w-3 text-slate-400" />
              <span>Vendedor: {order.sellerName}</span>
            </span>
          )}
        </div>

        {/* Total em Destaque, Data & Ação de Excluir */}
        <div className="flex items-center space-x-3.5 text-xs">
          {/* Total do Pedido no Header */}
          <div className="text-right">
            <span className="text-[10px] text-[#86868B] uppercase tracking-wider block font-medium leading-tight">
              Total Pedido
            </span>
            <span className="text-sm sm:text-base font-bold text-[#0071E3] dark:text-[#0A84FF] font-mono tracking-tight">
              R$ {formatCurrency(order.total)}
            </span>
          </div>

          <div className="h-6 w-[1px] bg-black/[0.06] dark:bg-white/[0.08]" />

          <div className="flex items-center space-x-1.5 text-slate-500 dark:text-[#86868B]">
            <Calendar className="h-3.5 w-3.5" />
            <span className="font-normal">{order.createdAt ? formatDateBR(order.createdAt) : 'Hoje'}</span>
          </div>

          <button
            type="button"
            onClick={() => onDelete(order.id)}
            title="Excluir Pedido Permanentemente"
            className="p-1.5 rounded-xl text-slate-400 hover:text-[#FF3B30] dark:hover:text-[#FF453A] hover:bg-[#FF3B30]/10 dark:hover:bg-[#FF453A]/10 transition-colors cursor-pointer flex items-center justify-center"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Régua Interativa de Etapas */}
      <AdminStageStepper
        currentStatus={order.status}
        isDark={isDark}
        isStorePickup={isStorePickup}
        onStatusChange={(newStatus) => onStatusChange(order.id, newStatus)}
      />

      {/* Grid com 4 Micro-Cards Especializados (Altura Balanceada) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 items-stretch">
        <CustomerInfoCard order={order} isDark={isDark} />
        <PaymentInfoCard
          order={order}
          isDark={isDark}
          variant="admin"
          editingLocalSaleId={editingLocalSaleId}
          onEditingLocalSaleIdChange={(val) => onLocalSaleIdChange?.(order.id, val)}
          onSaveLocalSaleId={() => onLocalSaleIdSave?.(order.id)}
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

      {/* Grid de Itens do Pedido */}
      <div className="pt-2 border-t border-black/[0.04] dark:border-white/[0.06]">
        <OrderItemsGrid items={order.items || []} isDark={isDark} variant="admin" />
      </div>
    </div>
  );
};
