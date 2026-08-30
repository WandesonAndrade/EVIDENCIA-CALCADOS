import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AuthScreen } from './AuthScreen';
import { ShoppingBag, MessageSquare, Calendar, ExternalLink, ReceiptText, ChevronDown, ChevronUp, CheckCircle2, Store } from 'lucide-react';
import { OrderItem } from '../types';
import { OrderStatusBadge } from './orders/OrderStatusBadge';
import { OrderTimeline } from './orders/OrderTimeline';
import { ShippingInfoCard } from './orders/ShippingInfoCard';
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
    <div id="order-history-page" className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header da Página */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 pb-5 border-b border-black/[0.06] dark:border-white/[0.08]">
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center space-x-2.5 text-slate-900 dark:text-white">
            <ReceiptText className="h-7 w-7 text-[#0071E3] dark:text-[#0A84FF]" />
            <span>Meus Pedidos</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#86868B] font-normal">
            Acompanhe o status, rastreio e histórico das suas compras em tempo real.
          </p>
        </div>
        <div className="px-3.5 py-1 rounded-full bg-black/[0.03] dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 font-semibold text-xs border border-black/[0.06] dark:border-white/[0.08]">
          Total de Pedidos: <span className="font-mono font-bold text-[#0071E3] dark:text-[#0A84FF]">{orders.length}</span>
        </div>
      </div>

      {isLoadingOrders && orders.length === 0 ? (
        <div className="space-y-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-44 rounded-3xl bg-black/[0.04] dark:bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 px-4">
          <div className="bg-black/[0.03] dark:bg-white/[0.05] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5">
            <ShoppingBag className="h-9 w-9 text-[#0071E3] opacity-80" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Nenhum pedido encontrado</h3>
          <p className="text-sm text-slate-500 dark:text-[#86868B] max-w-sm mx-auto mb-7 font-normal">
            Você ainda não realizou nenhuma compra. Explore nosso catálogo e encontre o calçado perfeito!
          </p>
          <button
            onClick={() => setCurrentView('category-page')}
            className="inline-flex items-center justify-center px-7 py-2.5 rounded-full bg-[#0071E3] hover:bg-[#0077ED] active:scale-[0.98] text-white font-medium text-sm transition-all shadow-sm cursor-pointer"
          >
            Explorar Catálogo
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const isExpanded = !collapsedOrderIds[order.id];
            const progressStep = getOrderProgressStep(order);
            const isOtherCities = order.deliveryType === 'Entrega para Outras Cidades';
            const isPendingFreight = isOtherCities && (!order.freightCost || order.freightCost === 0);
            const rawNum = order.orderNumber || order.id;
            const displayOrderNumber = rawNum.startsWith('#') ? rawNum : `#${rawNum}`;

            return (
              <div
                key={order.id}
                className="border border-black/[0.06] dark:border-white/[0.08] rounded-3xl overflow-hidden bg-white dark:bg-[#161617]/90 shadow-[0_2px_16px_rgba(0,0,0,0.03)] backdrop-blur-xl transition-all"
              >
                {/* CABEÇALHO DO CARD (Apple Unified Header) */}
                <div className="px-5 sm:px-6 py-4 border-b border-black/[0.04] dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-3.5 bg-black/[0.015] dark:bg-white/[0.015]">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 bg-black/[0.04] dark:bg-white/[0.06] px-2.5 py-1 rounded-xl border border-black/[0.05] dark:border-white/[0.08]">
                      {displayOrderNumber}
                    </span>

                    <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-[#86868B] font-normal">
                      <Calendar className="h-3.5 w-3.5 opacity-60" />
                      <span>{formatDateBR(order.createdAt)}</span>
                    </div>

                    <div className="h-3.5 w-[1px] bg-black/[0.08] dark:bg-white/[0.1] hidden sm:block" />

                    <OrderStatusBadge status={order.status} isDark={isDark} size="sm" />
                    <PaymentStatusBadge status={order.paymentStatus} variant="client" size="sm" />

                    {isOtherCities && (
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${
                        isPendingFreight
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 animate-pulse'
                          : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                      }`}>
                        {isPendingFreight ? 'Frete: A Combinar' : `Frete: R$ ${formatCurrency(order.freightCost)}`}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-3.5">
                    <div className="text-right">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-[#86868B] block leading-tight">
                        Total Pedido
                      </span>
                      <span className="text-base sm:text-lg font-bold font-mono tracking-tight text-[#0071E3] dark:text-[#0A84FF]">
                        R$ {formatCurrency(order.total)}
                      </span>
                    </div>

                    <div className="h-6 w-[1px] bg-black/[0.06] dark:bg-white/[0.08]" />

                    <button
                      onClick={() => toggleExpand(order.id)}
                      className="px-3 py-1.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#1D1D1F] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] text-xs font-medium text-slate-700 dark:text-slate-200 transition-all cursor-pointer flex items-center space-x-1.5 shadow-2xs"
                      title={isExpanded ? "Ocultar itens comprados" : "Ver itens comprados"}
                    >
                      <span>{isExpanded ? 'Ocultar Itens' : 'Ver Itens'}</span>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* TIMELINE DE ACOMPANHAMENTO DO PEDIDO */}
                {order.status !== 'Cancelado' && (
                  <OrderTimeline
                    currentStep={progressStep}
                    isDark={isDark}
                    deliveryType={order.deliveryType}
                  />
                )}

                {/* FEEDBACK VISUAL ESPECÍFICO PARA RETIRADA NA LOJA */}
                {order.deliveryType === 'Retirada na Loja' && (
                  <div className="px-5 sm:px-6 pt-4">
                    {order.status === 'Em Preparação' ? (
                      <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center space-x-3 text-xs">
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
                          <Store className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-purple-900 dark:text-purple-300">
                            🛍️ Seus calçados já estão disponíveis para retirada no balcão da loja!
                          </p>
                          <p className="text-[11px] text-purple-700/80 dark:text-purple-300/70 font-normal">
                            Compareça à Rua Afonso Pena, 295 - Centro, Caxias - MA. Basta informar o seu nome ou pedido {displayOrderNumber}.
                          </p>
                        </div>
                      </div>
                    ) : order.status === 'Entregue' ? (
                      <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center space-x-2.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Pedido retirado com sucesso na loja física. Obrigado pela preferência!</span>
                      </div>
                    ) : (
                      <div className="p-3 rounded-2xl bg-purple-500/5 border border-purple-500/15 flex items-center space-x-2.5 text-xs text-purple-700 dark:text-purple-300 font-medium">
                        <Store className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                        <span>Modalidade selecionada: <strong>Retirada na Loja Física</strong> (Rua Afonso Pena, 295 - Centro). Você será avisado quando estiver pronto!</span>
                      </div>
                    )}
                  </div>
                )}

                {/* DETALHES DE ENVIO E PAGAMENTO (GRID BALANCEADA EM 2 COLUNAS) */}
                <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 items-start text-xs">
                  <ShippingInfoCard order={order} isDark={isDark} variant="client" />
                  <PaymentInfoCard order={order} isDark={isDark} variant="client" />
                </div>

                {/* LISTA EXPANSÍVEL DE PRODUTOS */}
                {isExpanded && (
                  <div className="px-5 sm:px-6 pb-5 pt-1 border-t border-black/[0.04] dark:border-white/[0.06]">
                    <OrderItemsGrid
                      items={order.items || []}
                      isDark={isDark}
                      variant="client"
                      onItemClick={handleNavigateToProduct}
                    />
                  </div>
                )}

                {/* AÇÕES INFERIORES: ACOMPANHAMENTO WHATSAPP */}
                <div className="px-5 sm:px-6 py-3.5 border-t border-black/[0.04] dark:border-white/[0.06] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-black/[0.01] dark:bg-white/[0.01]">
                  {order.status === 'Entregue' ? (
                    <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400 font-medium text-xs">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Entrega Concluída com Sucesso!</span>
                    </div>
                  ) : order.sellerName ? (
                    <p className="text-[11px] font-normal text-slate-500 dark:text-[#86868B]">
                      Atendido por: <span className="text-slate-900 dark:text-white font-semibold">{order.sellerName}</span> ({order.sellerEmail})
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-500 dark:text-[#86868B] font-normal">
                      Status do atendimento: <span className="text-[#0071E3] dark:text-[#0A84FF] font-semibold">Atendimento ativo via WhatsApp</span>
                    </p>
                  )}

                  {order.status !== 'Entregue' && (
                    <button
                      type="button"
                      onClick={() => {
                        const msg = `Olá! Gostaria de consultar o status e detalhes do meu pedido *${order.orderNumber || order.id}* na Evidência Calçados.`;
                        window.open(buildWhatsAppUrl('5599984684867', msg), '_blank');
                      }}
                      className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 py-2 px-4.5 bg-[#0071E3] hover:bg-[#0077ED] active:scale-[0.98] text-white font-medium text-xs rounded-full shadow-sm transition-all cursor-pointer"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>Consultar no WhatsApp</span>
                      <ExternalLink className="h-3 w-3 opacity-70" />
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
