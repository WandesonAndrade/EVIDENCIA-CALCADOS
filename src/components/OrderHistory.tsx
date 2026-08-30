import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AuthScreen } from './AuthScreen';
import { ShoppingBag, MessageSquare, Calendar, ExternalLink, ReceiptText, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { OrderItem } from '../types';
import { OrderStatusBadge } from './orders/OrderStatusBadge';
import { OrderTimeline } from './orders/OrderTimeline';
import { ShippingInfoCard } from './orders/ShippingInfoCard';
import { FreightStatusCard } from './orders/FreightStatusCard';
import { PaymentInfoCard } from './orders/PaymentInfoCard';
import { OrderItemsGrid } from './orders/OrderItemsGrid';
import { PaymentStatusBadge } from './orders/PaymentStatusBadge';
import { formatCurrency, formatDateBR, getOrderProgressStep, buildWhatsAppUrl, createFallbackProduct } from '../utils/orderUtils';

export const OrderHistory: React.FC = () => {
  const { currentUser, orders, isLoadingOrders, theme, products, setSelectedProduct, setCurrentView } = useApp();
  const isDark = theme === 'dark';
  const [collapsedOrderIds, setCollapsedOrderIds] = useState<Record<string, boolean>>({});

  if (!currentUser) {
    return <AuthScreen />;
  }

  const toggleExpand = (id: string) => {
    setCollapsedOrderIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleNavigateToProduct = (item: OrderItem) => {
    const existingProduct = products.find(p => p.id === item.productId || p.name === item.name);
    if (existingProduct) {
      setSelectedProduct(existingProduct);
    } else {
      setSelectedProduct(createFallbackProduct(item));
    }
    setCurrentView('product-detail');
  };

  return (
    <div id="order-history-page" className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b pb-6 border-blue-900/10 dark:border-slate-800">
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center space-x-2 text-[#003B73] dark:text-white">
            <ReceiptText className="h-7 w-7 sm:h-8 sm:w-8 text-[#006EDB]" />
            <span>Meus Pedidos</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#52708F] font-medium">
            Acompanhe o status, rastreio e histórico das suas compras.
          </p>
        </div>
        <div className="px-4 py-1.5 rounded-full bg-[#EEF8FF] dark:bg-slate-900 text-[#006EDB] dark:text-amber-400 font-extrabold text-xs border border-[#006EDB]/20 shadow-sm">
          Total de Pedidos: {orders.length}
        </div>
      </div>

      {isLoadingOrders && orders.length === 0 ? (
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 px-4">
          <div className="bg-[#EEF8FF] dark:bg-slate-900 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <ShoppingBag className="h-10 w-10 text-[#006EDB] opacity-80" />
          </div>
          <h3 className="text-xl font-black text-[#003B73] dark:text-white mb-2">Nenhum pedido encontrado</h3>
          <p className="text-sm text-[#52708F] max-w-sm mx-auto mb-8 font-medium">
            Você ainda não realizou nenhuma compra. Explore nosso catálogo e encontre o calçado perfeito!
          </p>
          <button
            onClick={() => setCurrentView('category-page')}
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-[#006EDB] text-white font-black text-sm uppercase tracking-wide hover:bg-[#00509E] transition-all shadow-lg hover:shadow-[#006EDB]/25 hover:-translate-y-0.5 active:translate-y-0"
          >
            Explorar Catálogo
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {orders.map((order) => {
            const isExpanded = !collapsedOrderIds[order.id];
            const progressStep = getOrderProgressStep(order);
            const isOtherCities = order.deliveryType === 'Entrega para Outras Cidades';
            const isPendingFreight = isOtherCities && (!order.freightCost || order.freightCost === 0);

            return (
              <div
                key={order.id}
                className={`border rounded-3xl overflow-hidden backdrop-blur-md transition-all shadow-md hover:shadow-xl ${
                  isDark
                    ? 'bg-slate-900/90 border-slate-800 text-white'
                    : 'bg-white border-blue-900/10 text-[#003B73]'
                }`}
              >
                {/* CABEÇALHO DO CARD */}
                <div className={`p-5 sm:p-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-[#EEF8FF]/80 border-blue-900/10'
                }`}>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-sm font-black text-[#003B73] dark:text-amber-400 bg-white dark:bg-slate-900 px-3 py-1 rounded-xl border border-blue-900/15 shadow-2xs">
                        {order.orderNumber || order.id}
                      </span>
                      <OrderStatusBadge status={order.status} isDark={isDark} size="sm" />
                      <PaymentStatusBadge status={order.paymentStatus} variant="client" size="sm" />
                      
                      {isOtherCities && (
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                          isPendingFreight
                            ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          {isPendingFreight ? 'Frete: A Combinar' : `Frete: R$ ${formatCurrency(order.freightCost)}`}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-[#52708F] font-medium">
                      <Calendar className="h-3.5 w-3.5 text-[#006EDB]" />
                      <span>Realizado em {formatDateBR(order.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end space-x-6">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] font-bold uppercase text-[#52708F] block">Total do Pedido</span>
                      <span className="text-lg sm:text-xl font-black text-[#003B73] dark:text-white">
                        R$ {formatCurrency(order.total)}
                      </span>
                    </div>

                    <button
                      onClick={() => toggleExpand(order.id)}
                      className={`p-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                        isDark 
                          ? 'border-slate-800 bg-slate-900 text-slate-300 hover:text-white' 
                          : 'border-blue-900/15 bg-white text-[#003B73] hover:bg-[#DDF1FF]'
                      }`}
                      title={isExpanded ? "Ocultar itens comprados" : "Ver itens comprados"}
                    >
                      <span className="hidden sm:inline">{isExpanded ? 'Ocultar Itens' : 'Ver Itens'}</span>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* TIMELINE DE ACOMPANHAMENTO DO PEDIDO */}
                {order.status !== 'Cancelado' && (
                  <OrderTimeline currentStep={progressStep} isDark={isDark} />
                )}

                {/* DETALHES DE ENVIO, FRETE E PAGAMENTO */}
                <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-blue-900/10 text-xs">
                  <ShippingInfoCard order={order} isDark={isDark} variant="client" />
                  <FreightStatusCard order={order} isDark={isDark} variant="client" />
                  <PaymentInfoCard order={order} isDark={isDark} variant="client" />
                </div>

                {/* LISTA EXPANSÍVEL DE PRODUTOS */}
                {isExpanded && (
                  <OrderItemsGrid
                    items={order.items || []}
                    isDark={isDark}
                    variant="client"
                    onItemClick={handleNavigateToProduct}
                  />
                )}

                {/* AÇÕES INFERIORES: ACOMPANHAMENTO WHATSAPP */}
                <div className={`p-4 sm:px-6 border-t flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                  isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-[#EEF8FF]/60 border-blue-900/10'
                }`}>
                  {order.status === 'Entregue' ? (
                    <div className="flex items-center space-x-2 text-emerald-700 font-bold text-xs">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Entrega Concluída com Sucesso!</span>
                    </div>
                  ) : order.sellerName ? (
                    <p className="text-[11px] font-medium text-[#52708F]">
                      Atendido por: <span className="text-[#003B73] font-bold">{order.sellerName}</span> ({order.sellerEmail})
                    </p>
                  ) : (
                    <p className="text-[11px] text-[#52708F] font-medium">
                      Status do atendimento: <span className="text-[#006EDB] font-extrabold">Atendimento ativo via WhatsApp</span>
                    </p>
                  )}

                  {order.status !== 'Entregue' && (
                    <button
                      type="button"
                      onClick={() => {
                        const msg = `Olá! Gostaria de consultar o status e detalhes do meu pedido *${order.orderNumber || order.id}* na Evidência Calçados.`;
                        window.open(buildWhatsAppUrl('5599984684867', msg), '_blank');
                      }}
                      className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 py-2.5 px-5 bg-[#006EDB] hover:bg-[#00509E] text-white font-extrabold text-xs rounded-full shadow-md transition-all cursor-pointer"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>Consultar no WhatsApp</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
