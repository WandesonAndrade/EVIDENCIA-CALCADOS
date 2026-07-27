import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AuthScreen } from './AuthScreen';
import { 
  ShoppingBag, MessageSquare, Calendar, ExternalLink, 
  Truck, CreditCard, Clock, CheckCircle2, AlertCircle, 
  MapPin, PackageCheck, ReceiptText, ChevronDown, ChevronUp
} from 'lucide-react';
import { OrderStatus, Order, OrderItem, Product } from '../types';

export const OrderHistory: React.FC = () => {
  const { currentUser, orders, isLoadingOrders, theme, products, addToCart, setSelectedProduct, setCurrentView } = useApp();
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // If not logged in, require auth!
  if (!currentUser) {
    return <AuthScreen />;
  }

  const isDark = theme === 'dark';

  const toggleExpand = (id: string) => {
    setExpandedOrderId(prev => prev === id ? null : id);
  };

  const handleNavigateToProduct = (item: OrderItem) => {
    const targetProduct = products.find(p => p.id === item.productId || p.name === item.name);
    if (targetProduct) {
      setSelectedProduct(targetProduct);
      setCurrentView('product-detail');
    } else {
      const fallbackProd: Product = {
        id: item.productId || `PROD-${Date.now()}`,
        name: item.name,
        description: item.name,
        price: item.price,
        originalPrice: item.price,
        category: 'Calçados',
        images: [item.image],
        sizes: [34, 35, 36, 37, 38, 39, 40],
        crediarioProprio: true,
        visible: true,
        stockControl: false,
        stock: 10
      };
      setSelectedProduct(fallbackProd);
      setCurrentView('product-detail');
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Confirmado':
        return {
          label: 'Confirmado',
          style: isDark ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' : 'bg-blue-50 text-blue-700 border-blue-200',
          icon: CheckCircle2
        };
      case 'Entregue':
        return {
          label: 'Entregue',
          style: isDark ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: PackageCheck
        };
      case 'Cancelado':
        return {
          label: 'Cancelado',
          style: isDark ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' : 'bg-rose-50 text-rose-700 border-rose-200',
          icon: AlertCircle
        };
      default:
        return {
          label: status || 'Pendente',
          style: isDark ? 'bg-amber-400/20 text-amber-400 border-amber-400/40' : 'bg-amber-50 text-amber-800 border-amber-200',
          icon: Clock
        };
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div id="order-history-page" className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      
      {/* Page Title & User Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6 border-slate-800/40">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <ReceiptText className="h-5 w-5" />
            </div>
            <div>
              <h1 className={`text-2xl font-black tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                Meus Pedidos
              </h1>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Acompanhe o status de entrega, detalhes de pagamento e itens adquiridos
              </p>
            </div>
          </div>
        </div>

        {orders.length > 0 && (
          <span className={`px-3.5 py-1.5 rounded-full text-xs font-bold ${
            isDark ? 'bg-slate-900 text-slate-300 border border-slate-800' : 'bg-slate-100 text-slate-700 border border-slate-200'
          }`}>
            Total de Pedidos: <strong className="text-amber-400 font-extrabold">{orders.length}</strong>
          </span>
        )}
      </div>

      {/* Loading Skeleton */}
      {isLoadingOrders ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className={`border rounded-3xl p-6 animate-pulse space-y-4 ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex justify-between items-center">
                <div className={`h-5 rounded-lg w-1/3 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                <div className={`h-5 rounded-lg w-1/6 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
              </div>
              <div className={`h-16 rounded-2xl ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`} />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        /* Empty State */
        <div className={`text-center py-16 border rounded-3xl p-8 max-w-md mx-auto space-y-5 ${
          isDark ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600 shadow-sm'
        }`}>
          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto ${
            isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'
          }`}>
            <ShoppingBag className="h-8 w-8 text-amber-400" />
          </div>
          <div className="space-y-2">
            <h3 className={`text-base font-black ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              Você ainda não fez nenhum pedido
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Explore nossa vitrine completa com os últimos lançamentos em calçados, bolsas e acessórios com entrega rápida ou crediário próprio.
            </p>
          </div>
        </div>
      ) : (
        /* Orders List */
        <div className="space-y-6">
          {orders.map((order) => {
            const badge = getStatusBadge(order.status);
            const StatusIcon = badge.icon;
            const isOtherCities = order.deliveryType === 'Entrega para Outras Cidades';
            const isPendingFreight = isOtherCities && (!order.freightCost || order.freightCost === 0);
            const isExpanded = expandedOrderId === order.id || orders.length === 1;

            const itemsTotalCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

            return (
              <div
                key={order.id}
                className={`border rounded-3xl overflow-hidden backdrop-blur-xl transition-all shadow-sm ${
                  isDark
                    ? 'bg-slate-900/80 border-slate-800 hover:border-amber-400/40'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* CARD HEADER: Order ID, Date, Status Badge, Total */}
                <div className={`p-5 sm:p-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
                }`}>
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-sm font-black text-amber-400">
                        {order.orderNumber || order.id}
                      </span>

                      <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase border ${badge.style}`}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        <span>{badge.label}</span>
                      </span>

                      {/* Payment Status Badge */}
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        order.paymentStatus === 'Confirmado' 
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : order.paymentStatus === 'Em Análise'
                          ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                          : order.paymentStatus === 'Recusado'
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          : 'bg-amber-400/20 text-amber-400 border-amber-400/30'
                      }`}>
                        <span>Pagamento: {order.paymentStatus || 'Pendente'}</span>
                      </span>

                      {/* Freight Badge highlight */}
                      {isOtherCities && (
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          isPendingFreight
                            ? 'bg-amber-400/10 text-amber-400 border-amber-400/30 animate-pulse'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}>
                          {isPendingFreight ? 'Frete: A Combinar' : `Frete: R$ ${(order.freightCost || 0).toFixed(2).replace('.', ',')}`}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-slate-400 font-medium">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>Realizado em {formatDate(order.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end space-x-6">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Total do Pedido</span>
                      <span className="text-base sm:text-lg font-black text-amber-400">
                        R$ {order.total.toFixed(2).replace('.', ',')}
                      </span>
                    </div>

                    <button
                      onClick={() => toggleExpand(order.id)}
                      className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                        isDark 
                          ? 'border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:border-slate-700' 
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                      title={isExpanded ? "Ocultar detalhes" : "Ver detalhes"}
                    >
                      <span className="hidden sm:inline">{isExpanded ? 'Recolher' : 'Detalhes'}</span>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* DETAILED INFO GRID (Delivery + Payment + Freight Status) */}
                <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-800/40 text-xs">
                  
                  {/* Column 1: Entrega & Endereço */}
                  <div className={`p-4 rounded-2xl border space-y-2 ${
                    isDark ? 'bg-slate-950/40 border-slate-800/60' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
                      <Truck className="h-3.5 w-3.5" />
                      <span>Modalidade de Envio</span>
                    </span>
                    <p className="font-bold text-slate-200">{order.deliveryType || 'Entrega em Caxias-MA'}</p>
                    <p className="text-slate-400 leading-snug font-medium text-[11px]">
                      {order.deliveryAddress || 'Endereço cadastrado na conta'}
                    </p>
                  </div>

                  {/* Column 2: Status do Frete */}
                  <div className={`p-4 rounded-2xl border space-y-2 ${
                    isPendingFreight
                      ? 'bg-amber-400/10 border-amber-400/30'
                      : isDark ? 'bg-slate-950/40 border-slate-800/60' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>Status do Frete</span>
                    </span>
                    
                    {isOtherCities ? (
                      isPendingFreight ? (
                        <div className="space-y-1">
                          <p className="font-bold text-amber-400">Frete sob consulta / A combinar</p>
                          <p className="text-[11px] text-amber-300/80 leading-snug">
                            Aguardando definição de valor pela equipe de atendimento da loja via WhatsApp.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="font-bold text-emerald-400">Frete Definido: R$ {(order.freightCost || 0).toFixed(2).replace('.', ',')}</p>
                          <p className="text-[11px] text-slate-400 leading-snug">
                            Valor de envio alinhado e acrescido ao pedido.
                          </p>
                        </div>
                      )
                    ) : order.deliveryType === 'Retirada na Loja' ? (
                      <div>
                        <p className="font-bold text-sky-400">Sem taxa de frete (Grátis)</p>
                        <p className="text-[11px] text-slate-400">Retirada na loja do Centro em Caxias-MA.</p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-bold text-emerald-400">
                          {order.freightCost === 0 ? 'Frete GRÁTIS' : 'R$ 10,00'}
                        </p>
                        <p className="text-[11px] text-slate-400">Entrega rápida em Caxias - MA.</p>
                      </div>
                    )}
                  </div>

                  {/* Column 3: Forma de Pagamento */}
                  <div className={`p-4 rounded-2xl border space-y-2 ${
                    isDark ? 'bg-slate-950/40 border-slate-800/60' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
                      <CreditCard className="h-3.5 w-3.5" />
                      <span>Forma & Status do Pagamento</span>
                    </span>
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-200">{order.paymentMethod || 'Pix'}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                        order.paymentStatus === 'Confirmado' 
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : order.paymentStatus === 'Em Análise'
                          ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                          : order.paymentStatus === 'Recusado'
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          : 'bg-amber-400/20 text-amber-400 border-amber-400/30'
                      }`}>
                        {order.paymentStatus || 'Pendente'}
                      </span>
                    </div>
                    {order.installments && order.installments > 1 && (
                      <p className="text-sky-400 font-bold text-[11px]">
                        Parcelado em {order.installments}x sem juros no cartão
                      </p>
                    )}
                    {order.paymentMethod === 'Crediário da Loja' && (
                      <p className="text-amber-400 font-bold text-[11px]">
                        Carnê Crediário Evidência em até 6x
                      </p>
                    )}
                  </div>

                </div>

                {/* EXPANDABLE PRODUCTS LIST */}
                {isExpanded && (
                  <div className="p-5 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                        <ShoppingBag className="h-4 w-4 text-amber-400" />
                        <span>Produtos Comprados ({itemsTotalCount} item/itens)</span>
                      </span>
                    </div>

                    {/* Products Grid */}
                    <div className="space-y-3">
                      {order.items.map((item, idx) => {
                        const itemSubtotal = item.price * item.quantity;

                        return (
                          <div
                            key={idx}
                            onClick={() => handleNavigateToProduct(item)}
                            className={`p-3.5 rounded-2xl border flex items-center justify-between gap-4 transition-all cursor-pointer group ${
                              isDark 
                                ? 'bg-slate-950/60 border-slate-800/80 hover:border-amber-400/50 hover:bg-slate-900/80' 
                                : 'bg-slate-50 border-slate-200 hover:border-amber-400/50 hover:bg-amber-400/5'
                            }`}
                            title={`Clique para ver detalhes de ${item.name}`}
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-14 h-14 object-cover rounded-xl border border-slate-800 shrink-0 bg-slate-950 group-hover:scale-105 transition-transform"
                              />
                              <div className="min-w-0 space-y-1">
                                <h4 className={`text-xs font-bold truncate group-hover:text-amber-400 transition-colors ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                  {item.name}
                                </h4>
                                <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono font-bold">
                                    {item.selectedSize !== 0 ? `Tam: ${item.selectedSize}` : 'Acessório'}
                                  </span>
                                  <span>Qtd: <strong className="text-slate-200">{item.quantity}</strong></span>
                                  <span>• Unitário: <strong className="text-slate-200">R$ {item.price.toFixed(2).replace('.', ',')}</strong></span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0 flex items-center space-x-3">
                              <div>
                                <span className="text-[10px] font-bold uppercase text-slate-400 block">Subtotal</span>
                                <span className="text-xs font-black text-amber-400">
                                  R$ {itemSubtotal.toFixed(2).replace('.', ',')}
                                </span>
                              </div>
                              <div className="p-1.5 rounded-lg bg-amber-400/10 text-amber-400 group-hover:bg-amber-400 group-hover:text-slate-950 transition-all hidden sm:block">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* FOOTER ACTIONS: Conditional based on status */}
                <div className={`p-4 sm:px-6 border-t flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                  isDark ? 'bg-slate-950/40 border-slate-800/60' : 'bg-slate-50/50 border-slate-200/80'
                }`}>
                  {order.status === 'Entregue' ? (
                    <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Entrega Concluída com Sucesso!</span>
                    </div>
                  ) : order.sellerName ? (
                    <p className="text-[11px] font-medium text-slate-400">
                      Atendido por: <span className="text-amber-400 font-bold">{order.sellerName}</span> ({order.sellerEmail})
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 font-medium">
                      Status do atendimento: <span className="text-emerald-400 font-bold">Atendimento ativo via WhatsApp</span>
                    </p>
                  )}

                  {order.status !== 'Entregue' && (
                    /* WHATSAPP TRACKING BUTTON (ONLY FOR NON-DELIVERED ORDERS) */
                    <button
                      type="button"
                      onClick={() => {
                        const msg = `Olá! Gostaria de consultar o status e detalhes do meu pedido *${order.orderNumber || order.id}* na Evidência Calçados.`;
                        const whatsappUrl = `https://api.whatsapp.com/send?phone=5599981423405&text=${encodeURIComponent(msg)}`;
                        window.open(whatsappUrl, '_blank');
                      }}
                      className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 py-2.5 px-4 bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>Acompanhar Pedido no WhatsApp</span>
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
