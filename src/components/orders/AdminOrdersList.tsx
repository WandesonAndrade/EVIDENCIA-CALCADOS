import React, { useState, useEffect } from 'react';
import { ShoppingBag, Search, User, CheckCircle2, ShieldCheck, ArrowUpRight, X, Layers, ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { OrderStatus, PaymentStatus } from '../../types';
import { AdminOrderCard } from './AdminOrderCard';
import { formatCurrency } from '../../utils/orderUtils';
import { ShippingTrackerService } from '../../services/shipping/shippingTracker';

interface Props {
  isDark: boolean;
}

export const AdminOrdersList: React.FC<Props> = ({ isDark }) => {
  const {
    orders,
    sellers = [],
    updateOrderStatus,
    updateOrderData,
    updateOrderPaymentStatus,
    updateOrderFreight,
    updateOrderLocalSaleId,
    deleteOrder,
    addToast,
  } = useApp();

  const [ordersSearch, setOrdersSearch] = useState('');
  const [ordersStatusFilter, setOrdersStatusFilter] = useState<'Todos' | OrderStatus>('Todos');
  const [ordersPaymentFilter, setOrdersPaymentFilter] = useState<'Todos' | PaymentStatus>('Todos');
  const [ordersSellerFilter, setOrdersSellerFilter] = useState<string>('Todos');
  const [editingFreightMap, setEditingFreightMap] = useState<{ [orderId: string]: string }>({});
  const [editingLocalSaleIdMap, setEditingLocalSaleIdMap] = useState<{ [orderId: string]: string }>({});

  // Sincroniza em background pedidos pendentes que possuem código de rastreamento
  useEffect(() => {
    if (orders && orders.length > 0) {
      ShippingTrackerService.syncPendingOrders(orders, 2, (orderId, updates) => {
        updateOrderData(orderId, updates);
      });
    }
  }, [orders?.length]);

  const sellersList = Array.from(
    new Set([
      ...sellers.filter((s) => s.active).map((s) => s.name),
      ...orders.map((o) => o.sellerName).filter((s): s is string => Boolean(s && s.trim())),
    ])
  ).filter(Boolean);

  const filteredOrders = orders
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .filter((o) => {
      const q = ordersSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        o.customerName?.toLowerCase().includes(q) ||
        o.customerEmail?.toLowerCase().includes(q) ||
        o.customerPhone?.includes(q) ||
        o.orderNumber?.toLowerCase().includes(q) ||
        o.id?.toLowerCase().includes(q) ||
        o.localSaleId?.toLowerCase().includes(q);
      const matchesStatus = ordersStatusFilter === 'Todos' || o.status === ordersStatusFilter;
      const matchesPayment = ordersPaymentFilter === 'Todos' || o.paymentStatus === ordersPaymentFilter;
      const matchesSeller = ordersSellerFilter === 'Todos' || o.sellerName === ordersSellerFilter;
      return matchesSearch && matchesStatus && matchesPayment && matchesSeller;
    });

  const totalFaturado = orders
    .filter((o) => o.paymentStatus === 'Confirmado' || o.status === 'Entregue')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    await updateOrderStatus(orderId, newStatus);
    const o = orders.find((x) => x.id === orderId);
    if (['Confirmado', 'Em Preparação', 'Entregue'].includes(newStatus) && o?.paymentStatus !== 'Confirmado') {
      await updateOrderPaymentStatus(orderId, 'Confirmado');
    } else if (newStatus === 'Cancelado') {
      await updateOrderPaymentStatus(orderId, 'Recusado');
    }
    // Se o filtro de etapa atual for diferente do novo status, voltamos para 'Todos' para o pedido permanecer na tela
    if (ordersStatusFilter !== 'Todos' && ordersStatusFilter !== newStatus) {
      setOrdersStatusFilter('Todos');
    }
    addToast('Etapa Atualizada', `O pedido foi alterado para "${newStatus}".`, 'success');
  };

  const handlePaymentConfirm = async (orderId: string) => {
    const o = orders.find((x) => x.id === orderId);
    await updateOrderPaymentStatus(orderId, 'Confirmado');
    // Se o filtro ativo era 'Pendente' ou 'Em Análise', voltamos para 'Todos' para o pedido não sumir da visualização
    if (ordersPaymentFilter !== 'Todos' && ordersPaymentFilter !== 'Confirmado') {
      setOrdersPaymentFilter('Todos');
    }
    addToast('Pagamento Aprovado', `O pagamento do pedido #${o?.orderNumber || orderId} foi confirmado.`, 'success');
  };

  const handleFreightSave = async (orderId: string) => {
    const val = parseFloat(editingFreightMap[orderId] ?? '0');
    await updateOrderFreight(orderId, isNaN(val) ? 0 : val);
    const o = orders.find((x) => x.id === orderId);
    addToast('Frete Atualizado', `O valor do frete do pedido #${o?.orderNumber || orderId} foi salvo.`, 'success');
  };

  const handleLocalSaleIdSave = async (orderId: string) => {
    const val = editingLocalSaleIdMap[orderId] ?? '';
    await updateOrderLocalSaleId(orderId, val.trim());
    const o = orders.find((x) => x.id === orderId);
    addToast('Sistema Local', `ID do ERP vinculado ao pedido #${o?.orderNumber || orderId}.`, 'success');
  };

  const handleDelete = async (orderId: string) => {
    const o = orders.find((x) => x.id === orderId);
    if (window.confirm(`Tem certeza que deseja excluir permanentemente o pedido #${o?.orderNumber || orderId}?`)) {
      await deleteOrder(orderId);
      addToast('Pedido Excluído', `O pedido #${o?.orderNumber || orderId} foi removido.`, 'info');
    }
  };

  const resetFilters = () => {
    setOrdersSearch('');
    setOrdersStatusFilter('Todos');
    setOrdersPaymentFilter('Todos');
    setOrdersSellerFilter('Todos');
  };

  const hasActiveFilters =
    Boolean(ordersSearch) ||
    ordersStatusFilter !== 'Todos' ||
    ordersPaymentFilter !== 'Todos' ||
    ordersSellerFilter !== 'Todos';

  return (
    <div className="space-y-8">
      {/* Header Apple Pro */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 pb-2">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Vendas &amp; Pedidos
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-black/[0.04] dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-black/[0.05] dark:border-white/[0.08]">
              {orders.length}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#86868B] font-normal">
            Acompanhe métricas em tempo real, etapas de entrega e controle de pagamentos com precisão.
          </p>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-xs font-medium text-slate-600 dark:text-slate-300 border border-black/[0.05] dark:border-white/[0.08] transition-colors self-start md:self-auto"
          >
            <X className="h-3.5 w-3.5" />
            <span>Limpar Filtros</span>
          </button>
        )}
      </div>

      {/* Cards de Métricas (Apple Health / Stocks Style) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-5 rounded-3xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#161617]/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] backdrop-blur-xl space-y-1">
          <div className="flex items-center justify-between text-[#86868B]">
            <span className="text-[11px] font-medium uppercase tracking-wider">Volume Total</span>
            <Layers className="h-4 w-4 opacity-70" />
          </div>
          <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {orders.length}
          </p>
          <span className="text-[11px] text-slate-400 dark:text-[#86868B] block pt-0.5">
            Pedidos registrados
          </span>
        </div>

        <div className="p-5 rounded-3xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#161617]/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] backdrop-blur-xl space-y-1">
          <div className="flex items-center justify-between text-[#86868B]">
            <span className="text-[11px] font-medium uppercase tracking-wider">Concluídos</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500 opacity-80" />
          </div>
          <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-emerald-600 dark:text-emerald-400">
            {orders.filter((o) => o.status === 'Entregue').length}
          </p>
          <span className="text-[11px] text-slate-400 dark:text-[#86868B] block pt-0.5">
            Entregues ao cliente
          </span>
        </div>

        <div className="p-5 rounded-3xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#161617]/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] backdrop-blur-xl space-y-1">
          <div className="flex items-center justify-between text-[#86868B]">
            <span className="text-[11px] font-medium uppercase tracking-wider">Aprovados</span>
            <ShieldCheck className="h-4 w-4 text-[#0071E3] dark:text-[#0A84FF] opacity-80" />
          </div>
          <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#0071E3] dark:text-[#0A84FF]">
            {orders.filter((o) => o.paymentStatus === 'Confirmado').length}
          </p>
          <span className="text-[11px] text-slate-400 dark:text-[#86868B] block pt-0.5">
            Pagamentos validados
          </span>
        </div>

        <div className="p-5 rounded-3xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#161617]/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] backdrop-blur-xl space-y-1">
          <div className="flex items-center justify-between text-[#86868B]">
            <span className="text-[11px] font-medium uppercase tracking-wider">Receita Total</span>
            <ArrowUpRight className="h-4 w-4 text-emerald-500 opacity-80" />
          </div>
          <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white font-mono">
            R$ {formatCurrency(totalFaturado)}
          </p>
          <span className="text-[11px] text-slate-400 dark:text-[#86868B] block pt-0.5">
            Faturamento acumulado
          </span>
        </div>
      </div>

      {/* Barra de Controles: Spotlight Search & macOS Segmented Filters */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-[#161617]/80 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_10px_rgba(0,0,0,0.02)] backdrop-blur-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Spotlight Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#86868B]" />
          <input
            type="text"
            value={ordersSearch}
            onChange={(e) => setOrdersSearch(e.target.value)}
            placeholder="Buscar por cliente, e-mail, tel ou nº do pedido..."
            className="w-full pl-9.5 pr-8 py-2 rounded-xl text-xs font-normal bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#86868B] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/30 transition-all"
          />
          {ordersSearch && (
            <button
              type="button"
              onClick={() => setOrdersSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Segmented Selectors */}
        {/* Segmented Selectors */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Etapa */}
          <div className="relative flex items-center px-3 py-1 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] hover:border-black/[0.12] dark:hover:border-white/[0.15] transition-colors">
            <span className="text-[10px] text-[#86868B] font-medium uppercase tracking-wider mr-1.5 shrink-0">
              Etapa:
            </span>
            <select
              value={ordersStatusFilter}
              onChange={(e) => setOrdersStatusFilter(e.target.value as any)}
              className="appearance-none bg-transparent text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer py-1 pr-5"
            >
              <option value="Todos">Todas</option>
              <option value="Pendente">1. Pedido Recebido</option>
              <option value="Confirmado">2. Pagamento Aprovado</option>
              <option value="Em Preparação">3. Em Preparação</option>
              <option value="Entregue">4. Entregue</option>
              <option value="Cancelado">Cancelado</option>
            </select>
            <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Pagamento */}
          <div className="relative flex items-center px-3 py-1 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] hover:border-black/[0.12] dark:hover:border-white/[0.15] transition-colors">
            <span className="text-[10px] text-[#86868B] font-medium uppercase tracking-wider mr-1.5 shrink-0">
              Pagamento:
            </span>
            <select
              value={ordersPaymentFilter}
              onChange={(e) => setOrdersPaymentFilter(e.target.value as any)}
              className="appearance-none bg-transparent text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer py-1 pr-5"
            >
              <option value="Todos">Todos</option>
              <option value="Pendente">Pendente</option>
              <option value="Em Análise">Em Análise</option>
              <option value="Confirmado">Aprovado</option>
              <option value="Recusado">Recusado</option>
            </select>
            <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Vendedor */}
          <div className="relative flex items-center px-3 py-1 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] hover:border-black/[0.12] dark:hover:border-white/[0.15] transition-colors">
            <span className="text-[10px] text-[#86868B] font-medium uppercase tracking-wider mr-1.5 shrink-0">
              Vendedor:
            </span>
            <select
              value={ordersSellerFilter}
              onChange={(e) => setOrdersSellerFilter(e.target.value)}
              className="appearance-none bg-transparent text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer py-1 pr-5"
            >
              <option value="Todos">Todos</option>
              {sellersList.map((sellerName) => (
                <option key={sellerName} value={sellerName}>
                  {sellerName}
                </option>
              ))}
            </select>
            <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Banner Informativo de Vendedor Selecionado */}
      {ordersSellerFilter !== 'Todos' && (
        <div className="px-4 py-2.5 rounded-2xl bg-[#0071E3]/10 border border-[#0071E3]/20 text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-between text-xs font-medium">
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 shrink-0" />
            <span>
              Filtrando pedidos do vendedor <strong>{ordersSellerFilter}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOrdersSellerFilter('Todos')}
            className="hover:underline cursor-pointer text-[11px]"
          >
            Remover filtro
          </button>
        </div>
      )}

      {/* Empty State */}
      {filteredOrders.length === 0 && (
        <div className="text-center py-16 px-4 rounded-3xl border border-black/[0.05] dark:border-white/[0.06] bg-black/[0.01] dark:bg-white/[0.01]">
          <div className="w-14 h-14 rounded-full bg-black/[0.03] dark:bg-white/[0.05] flex items-center justify-center mx-auto mb-3 text-slate-400 dark:text-slate-500">
            <ShoppingBag className="h-6 w-6 stroke-[1.5]" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
            Nenhum pedido encontrado
          </h3>
          <p className="text-xs text-slate-500 dark:text-[#86868B] max-w-sm mx-auto">
            {hasActiveFilters
              ? 'Tente ajustar ou limpar os filtros para encontrar o que está procurando.'
              : 'Nenhum pedido foi realizado ainda na loja.'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 px-4 py-1.5 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-medium transition-all shadow-sm cursor-pointer"
            >
              Limpar Todos os Filtros
            </button>
          )}
        </div>
      )}

      {/* Lista de Pedidos (Apple Card Windows) */}
      {filteredOrders.length > 0 && (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <AdminOrderCard
              key={order.id}
              order={order}
              isDark={isDark}
              editingFreight={editingFreightMap[order.id]}
              editingLocalSaleId={editingLocalSaleIdMap[order.id]}
              onStatusChange={handleStatusChange}
              onFreightChange={(orderId, val) =>
                setEditingFreightMap((prev) => ({ ...prev, [orderId]: val }))
              }
              onFreightSave={handleFreightSave}
              onLocalSaleIdChange={(orderId, val) =>
                setEditingLocalSaleIdMap((prev) => ({ ...prev, [orderId]: val }))
              }
              onLocalSaleIdSave={handleLocalSaleIdSave}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};
