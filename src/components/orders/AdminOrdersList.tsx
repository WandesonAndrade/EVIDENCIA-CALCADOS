import React, { useState } from 'react';
import { ShoppingBag, Search, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { OrderStatus, PaymentStatus } from '../../types';
import { AdminOrderCard } from './AdminOrderCard';
import { formatCurrency } from '../../utils/orderUtils';

interface Props {
  isDark: boolean;
}

export const AdminOrdersList: React.FC<Props> = ({ isDark }) => {
  const {
    orders,
    sellers = [],
    updateOrderStatus,
    updateOrderPaymentStatus,
    updateOrderFreight,
    deleteOrder,
    addToast,
  } = useApp();

  const [ordersSearch, setOrdersSearch] = useState('');
  const [ordersStatusFilter, setOrdersStatusFilter] = useState<'Todos' | OrderStatus>('Todos');
  const [ordersPaymentFilter, setOrdersPaymentFilter] = useState<'Todos' | PaymentStatus>('Todos');
  const [ordersSellerFilter, setOrdersSellerFilter] = useState<string>('Todos');
  const [editingFreightMap, setEditingFreightMap] = useState<{ [orderId: string]: string }>({});

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
      const q = ordersSearch.toLowerCase();
      const matchesSearch =
        !q ||
        o.customerName?.toLowerCase().includes(q) ||
        o.customerEmail?.toLowerCase().includes(q) ||
        o.customerPhone?.includes(q) ||
        o.orderNumber?.toLowerCase().includes(q) ||
        o.id?.toLowerCase().includes(q);
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
    addToast('Etapa Atualizada!', `O pedido foi movido para "${newStatus}".`, 'success');
  };

  const handlePaymentConfirm = async (orderId: string) => {
    const o = orders.find((x) => x.id === orderId);
    await updateOrderPaymentStatus(orderId, 'Confirmado');
    addToast('Pagamento Confirmado!', `O pagamento do pedido ${o?.orderNumber || orderId} foi confirmado.`, 'success');
  };

  const handleFreightSave = async (orderId: string) => {
    const val = parseFloat(editingFreightMap[orderId] ?? '0');
    await updateOrderFreight(orderId, isNaN(val) ? 0 : val);
    const o = orders.find((x) => x.id === orderId);
    addToast('Frete Atualizado!', `O valor do frete do pedido ${o?.orderNumber || orderId} foi salvo.`, 'success');
  };

  const handleDelete = async (orderId: string) => {
    const o = orders.find((x) => x.id === orderId);
    if (window.confirm(`Tem certeza que deseja excluir permanentemente o pedido ${o?.orderNumber || orderId}?`)) {
      await deleteOrder(orderId);
      addToast('Pedido Excluído', `O pedido ${o?.orderNumber || orderId} foi excluído com sucesso.`, 'info');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center space-x-2">
            <ShoppingBag className="h-6 w-6 text-amber-400" />
            <span>Gestão Global de Vendas & Pedidos ({orders.length})</span>
          </h2>
          <p className="text-xs text-slate-400">
            Visão completa de todos os pedidos da loja. Altere status de entrega, confirme pagamentos e gerencie fretes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={ordersSearch}
              onChange={(e) => setOrdersSearch(e.target.value)}
              placeholder="Buscar cliente, e-mail, tel ou nº..."
              className={`pl-9 pr-3 py-1.5 rounded-xl text-xs border focus:outline-none w-56 ${
                isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
          </div>

          <div className="flex items-center space-x-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Etapa:</span>
            <select
              value={ordersStatusFilter}
              onChange={(e) => setOrdersStatusFilter(e.target.value as any)}
              className={`p-1.5 rounded-xl text-xs font-bold border focus:outline-none cursor-pointer ${
                isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              <option value="Todos">Todas Etapas</option>
              <option value="Pendente">1. Pedido Recebido</option>
              <option value="Confirmado">2. Pagamento OK</option>
              <option value="Em Preparação">3. Em Preparação</option>
              <option value="Entregue">4. Entregue</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>

          <div className="flex items-center space-x-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Pagamento:</span>
            <select
              value={ordersPaymentFilter}
              onChange={(e) => setOrdersPaymentFilter(e.target.value as any)}
              className={`p-1.5 rounded-xl text-xs font-bold border focus:outline-none cursor-pointer ${
                isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              <option value="Todos">Todos Pagamentos</option>
              <option value="Pendente">⏳ Pendente</option>
              <option value="Em Análise">🔍 Em Análise</option>
              <option value="Confirmado">✅ Confirmado</option>
              <option value="Recusado">❌ Recusado</option>
            </select>
          </div>

          <div className="flex items-center space-x-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Vendedor:</span>
            <select
              value={ordersSellerFilter}
              onChange={(e) => setOrdersSellerFilter(e.target.value)}
              className={`p-1.5 rounded-xl text-xs font-bold border focus:outline-none cursor-pointer ${
                isDark ? 'bg-slate-900 border-slate-800 text-amber-400' : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              <option value="Todos">Todos Vendedores</option>
              {sellersList.map((sellerName) => (
                <option key={sellerName} value={sellerName}>👤 {sellerName}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <span className="text-[10px] uppercase font-black text-slate-400 block">Total de Pedidos</span>
          <span className="text-xl font-black text-white">{orders.length}</span>
        </div>
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <span className="text-[10px] uppercase font-black text-slate-400 block">Pedidos Entregues</span>
          <span className="text-xl font-black text-emerald-400">
            {orders.filter((o) => o.status === 'Entregue').length}
          </span>
        </div>
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <span className="text-[10px] uppercase font-black text-slate-400 block">Pagamentos Confirmados</span>
          <span className="text-xl font-black text-sky-400">
            {orders.filter((o) => o.paymentStatus === 'Confirmado').length}
          </span>
        </div>
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <span className="text-[10px] uppercase font-black text-slate-400 block">Total Faturado</span>
          <span className="text-xl font-black text-amber-400">R$ {formatCurrency(totalFaturado)}</span>
        </div>
      </div>

      {/* Seller Filter Banner */}
      {ordersSellerFilter !== 'Todos' && (
        <div className="p-3.5 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-400 flex items-center justify-between text-xs font-bold shadow-sm">
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-amber-400" />
            <span>Filtrando Vendas Atribuídas a <strong>{ordersSellerFilter}</strong></span>
          </div>
          <span>
            {orders.filter((o) => o.sellerName === ordersSellerFilter).length} pedido(s) (R${' '}
            {formatCurrency(orders.filter((o) => o.sellerName === ordersSellerFilter).reduce((sum, o) => sum + (o.total || 0), 0))})
          </span>
        </div>
      )}

      {/* Empty State */}
      {orders.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-bold text-sm">Nenhum pedido registrado ainda</p>
        </div>
      )}

      {/* Orders List */}
      {filteredOrders.length > 0 && (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <AdminOrderCard
              key={order.id}
              order={order}
              isDark={isDark}
              editingFreight={editingFreightMap[order.id]}
              onStatusChange={handleStatusChange}
              onPaymentConfirm={handlePaymentConfirm}
              onFreightChange={(orderId, val) => setEditingFreightMap((prev) => ({ ...prev, [orderId]: val }))}
              onFreightSave={handleFreightSave}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};
