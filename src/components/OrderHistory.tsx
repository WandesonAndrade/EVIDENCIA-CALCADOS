import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AuthScreen } from './AuthScreen';
import { 
  ShoppingBag, MessageSquare, Calendar, ExternalLink, 
  Truck, CreditCard, Clock, CheckCircle2, AlertCircle, 
  MapPin, PackageCheck, ReceiptText, ChevronDown, ChevronUp,
  ArrowRight, ShieldCheck, Box, Check
} from 'lucide-react';
import { OrderStatus, Order, OrderItem, Product } from '../types';

export const OrderHistory: React.FC = () => {
  const { currentUser, orders, isLoadingOrders, theme, products, setSelectedProduct, setCurrentView } = useApp();
  // Armazena IDs dos pedidos recolhidos manualmente (por padrão todos começam visíveis)
  const [collapsedOrderIds, setCollapsedOrderIds] = useState<Record<string, boolean>>({});

  // Exigir autenticação se o usuário não estiver logado
  if (!currentUser) {
    return <AuthScreen />;
  }

  const isDark = theme === 'dark';

  const toggleExpand = (id: string) => {
    setCollapsedOrderIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
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
          label: 'Pagamento Confirmado',
          style: isDark ? 'bg-[#006EDB]/20 text-[#DDF1FF] border-[#006EDB]/40' : 'bg-[#DDF1FF] text-[#003B73] border-[#006EDB]/30',
          icon: CheckCircle2
        };
      case 'Em Preparação':
        return {
          label: 'Em Preparação / Envio',
          style: isDark ? 'bg-sky-500/20 text-sky-400 border-sky-500/40' : 'bg-sky-50 text-sky-800 border-sky-200',
          icon: Truck
        };
      case 'Entregue':
        return {
          label: 'Entregue',
          style: isDark ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-emerald-50 text-emerald-800 border-emerald-200',
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
          label: status || 'Pedido Recebido',
          style: isDark ? 'bg-amber-400/20 text-amber-400 border-amber-400/40' : 'bg-amber-50 text-amber-900 border-amber-200',
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

  // Cálculo das 4 Etapas Visuais:
  // 1: Pedido Recebido
  // 2: Pagamento OK (Confirmado no status ou pagamento)
  // 3: Em Preparação
  // 4: Entregue
  const getOrderProgressStep = (order: Order) => {
    if (order.status === 'Cancelado') return 0;
    if (order.status === 'Entregue') return 4;
    if (order.status === 'Em Preparação') return 3;
    if (order.status === 'Confirmado' || order.paymentStatus === 'Confirmado') return 2;
    return 1;
  };

  return (
    <div id="order-history-page" className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      
      {/* Cabeçalho da Página no estilo Apple Store Purchase History */}
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6 ${
        isDark ? 'border-slate-800' : 'border-blue-900/15'
      }`}>
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#003B73] text-white flex items-center justify-center shadow-md">
            <ReceiptText className="h-6 w-6" />
          </div>
          <div>
            <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-[#003B73]'}`}>
              Meus Pedidos
            </h1>
            <p className={`text-xs sm:text-sm font-bold mt-0.5 ${isDark ? 'text-slate-400' : 'text-[#52708F]'}`}>
              Histórico de compras, rastreamento de entregas e notas do crediário
            </p>
          </div>
        </div>

        {orders.length > 0 && (
          <span className={`px-4 py-2 rounded-full text-xs font-bold border shadow-xs ${
            isDark 
              ? 'bg-slate-900 text-slate-300 border-slate-800' 
              : 'bg-white text-[#003B73] border-blue-900/15'
          }`}>
            Total de Pedidos: <strong className="text-[#006EDB] font-black">{orders.length}</strong>
          </span>
        )}
      </div>

      {/* Carregamento Skeleton */}
      {isLoadingOrders && orders.length === 0 ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className={`border rounded-3xl p-6 animate-pulse space-y-4 ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-blue-900/10 shadow-sm'
            }`}>
              <div className="flex justify-between items-center">
                <div className={`h-5 rounded-lg w-1/3 ${isDark ? 'bg-slate-800' : 'bg-blue-50'}`} />
                <div className={`h-5 rounded-lg w-1/6 ${isDark ? 'bg-slate-800' : 'bg-blue-50'}`} />
              </div>
              <div className={`h-20 rounded-2xl ${isDark ? 'bg-slate-950' : 'bg-blue-50/50'}`} />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        /* Estado Vazio no Estilo Apple Store */
        <div className={`text-center py-16 border rounded-3xl p-8 max-w-lg mx-auto space-y-6 shadow-md ${
          isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-white border-blue-900/10 text-[#003B73]'
        }`}>
          <div className="w-20 h-20 rounded-full bg-[#EEF8FF] border border-blue-900/10 flex items-center justify-center mx-auto shadow-inner">
            <ShoppingBag className="h-9 w-9 text-[#006EDB]" />
          </div>
          <div className="space-y-2">
            <h3 className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-[#003B73]'}`}>
              Nenhum pedido realizado ainda
            </h3>
            <p className="text-xs text-[#52708F] leading-relaxed max-w-md mx-auto">
              Explore nossa vitrine de calçados, bolsas e confecções com entrega rápida ou parcelamento em até 6x no Crediário Próprio.
            </p>
          </div>
          <button
            onClick={() => setCurrentView('category-page')}
            className="inline-flex items-center space-x-2 px-8 py-3.5 rounded-full bg-[#006EDB] hover:bg-[#00509E] text-white text-xs font-extrabold tracking-wider uppercase transition-all shadow-md cursor-pointer"
          >
            <span>Explorar Catálogo</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Lista de Pedidos Apple Store Style */
        <div className="space-y-6">
          {orders.map((order) => {
            const badge = getStatusBadge(order.status);
            const StatusIcon = badge.icon;
            const isOtherCities = order.deliveryType === 'Entrega para Outras Cidades';
            const isPendingFreight = isOtherCities && (!order.freightCost || order.freightCost === 0);
            const isExpanded = !collapsedOrderIds[order.id];
            const progressStep = getOrderProgressStep(order);

            const itemsTotalCount = (order.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);

            return (
              <div
                key={order.id}
                className={`border rounded-3xl overflow-hidden backdrop-blur-md transition-all shadow-md hover:shadow-xl ${
                  isDark
                    ? 'bg-slate-900/90 border-slate-800 text-white'
                    : 'bg-white border-blue-900/10 text-[#003B73]'
                }`}
              >
                {/* CABEÇALHO DO CARD: Número do Pedido, Data, Selos e Valor Total */}
                <div className={`p-5 sm:p-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-[#EEF8FF]/80 border-blue-900/10'
                }`}>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-sm font-black text-[#003B73] dark:text-amber-400 bg-white dark:bg-slate-900 px-3 py-1 rounded-xl border border-blue-900/15 shadow-2xs">
                        {order.orderNumber || order.id}
                      </span>

                      {/* Selo do Status Principal */}
                      <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase border ${badge.style}`}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        <span>{badge.label}</span>
                      </span>

                      {/* Selo do Status do Pagamento */}
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                        order.paymentStatus === 'Confirmado' 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : order.paymentStatus === 'Em Análise'
                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : order.paymentStatus === 'Recusado'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        <span>Pagamento: {order.paymentStatus || 'Pendente'}</span>
                      </span>

                      {/* Destaque de Frete para Outras Cidades */}
                      {isOtherCities && (
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                          isPendingFreight
                            ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          {isPendingFreight ? 'Frete: A Combinar' : `Frete: R$ ${(order.freightCost || 0).toFixed(2).replace('.', ',')}`}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-[#52708F] font-medium">
                      <Calendar className="h-3.5 w-3.5 text-[#006EDB]" />
                      <span>Realizado em {formatDate(order.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end space-x-6">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] font-bold uppercase text-[#52708F] block">Total do Pedido</span>
                      <span className="text-lg sm:text-xl font-black text-[#003B73] dark:text-white">
                        R$ {(order.total || 0).toFixed(2).replace('.', ',')}
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

                {/* TIMELINE DE ACOMPANHAMENTO DO PEDIDO (FEEDBACK VISUAL 4 ETAPAS) */}
                {order.status !== 'Cancelado' && (
                  <div className="px-4 sm:px-8 py-5 bg-[#F8FAFC] dark:bg-slate-950/40 border-b border-blue-900/10">
                    <div className="max-w-3xl mx-auto flex items-center justify-between relative py-2">
                      {/* Linha Conectora de Fundo */}
                      <div className="absolute left-4 right-4 sm:left-6 sm:right-6 top-6 sm:top-5 -translate-y-1/2 h-1 bg-slate-200 dark:bg-slate-800 z-0" />
                      {/* Linha Conectora de Progresso Ativo */}
                      <div 
                        className="absolute left-4 sm:left-6 top-6 sm:top-5 -translate-y-1/2 h-1 bg-gradient-to-r from-[#003B73] to-[#006EDB] transition-all duration-500 z-0"
                        style={{ width: `calc(${((Math.max(1, progressStep) - 1) / 3) * 100}% - ${progressStep === 4 ? '0px' : '10px'})` }}
                      />

                      {/* Passos da Linha do Tempo */}
                      {[
                        { step: 1, label: 'Pedido Recebido', icon: Box },
                        { step: 2, label: 'Pagamento OK', icon: ShieldCheck },
                        { step: 3, label: 'Em Preparação', icon: Truck },
                        { step: 4, label: 'Entregue', icon: PackageCheck },
                      ].map(({ step, label, icon: StepIcon }) => {
                        const isCompleted = progressStep >= step;
                        const isCurrent = progressStep === step;

                        return (
                          <div key={step} className="relative z-10 flex flex-col items-center group">
                            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-md ${
                              isCompleted 
                                ? 'bg-[#003B73] text-white ring-4 ring-[#DDF1FF] dark:ring-blue-900/30' 
                                : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-300 dark:border-slate-700'
                            } ${isCurrent ? 'scale-110 ring-4 ring-amber-300 dark:ring-amber-400/40' : ''}`}>
                              {isCompleted ? <Check className="h-4 w-4 sm:h-5 sm:w-5 stroke-[3]" /> : <StepIcon className="h-4 w-4 sm:h-5 sm:w-5" />}
                            </div>
                            <span className={`text-[10px] sm:text-xs font-extrabold mt-2 text-center transition-all ${
                              isCompleted 
                                ? 'text-[#003B73] dark:text-blue-400 font-black' 
                                : 'text-slate-400 dark:text-slate-500'
                            } ${isCurrent ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                              {label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* DETALHES DE ENVIO, FRETE E PAGAMENTO */}
                <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-blue-900/10 text-xs">
                  
                  {/* Card 1: Modalidade de Envio */}
                  <div className={`p-4 rounded-2xl border space-y-2 ${
                    isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-[#EEF8FF]/60 border-blue-900/10'
                  }`}>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#006EDB] flex items-center space-x-1.5">
                      <Truck className="h-3.5 w-3.5" />
                      <span>Modalidade de Envio</span>
                    </span>
                    <p className="font-bold text-[#003B73] dark:text-white">{order.deliveryType || 'Entrega em Caxias-MA'}</p>
                    <p className="text-[#52708F] leading-snug font-medium text-[11px]">
                      {order.deliveryAddress || 'Endereço cadastrado no seu perfil'}
                    </p>
                    <div className="pt-1.5 border-t border-blue-900/10 text-[10px] text-[#52708F] space-y-0.5">
                      <p>Destinatário: <strong className="text-[#003B73] dark:text-slate-200">{order.customerName}</strong></p>
                      {order.customerPhone && <p>Contato: <strong>{order.customerPhone}</strong></p>}
                    </div>
                  </div>

                  {/* Card 2: Status do Frete */}
                  <div className={`p-4 rounded-2xl border space-y-2 ${
                    isPendingFreight
                      ? 'bg-amber-50 border-amber-200'
                      : isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-[#EEF8FF]/60 border-blue-900/10'
                  }`}>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#006EDB] flex items-center space-x-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>Status do Frete</span>
                    </span>
                    
                    {isOtherCities ? (
                      isPendingFreight ? (
                        <div className="space-y-1">
                          <p className="font-bold text-amber-900">Frete sob consulta / A combinar</p>
                          <p className="text-[11px] text-amber-800 leading-snug">
                            Aguardando definição de valor pela equipe de atendimento da loja via WhatsApp.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="font-bold text-emerald-800">Frete Definido: R$ {(order.freightCost || 0).toFixed(2).replace('.', ',')}</p>
                          <p className="text-[11px] text-[#52708F] leading-snug">
                            Valor de envio alinhado e acrescido ao pedido.
                          </p>
                        </div>
                      )
                    ) : order.deliveryType === 'Retirada na Loja' ? (
                      <div>
                        <p className="font-bold text-[#006EDB]">Sem taxa de frete (Grátis)</p>
                        <p className="text-[11px] text-[#52708F]">Retirada na loja física do Centro em Caxias-MA.</p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-bold text-emerald-700">
                          {order.freightCost === 0 ? 'Frete GRÁTIS' : 'R$ 10,00'}
                        </p>
                        <p className="text-[11px] text-[#52708F]">Entrega rápida na zona urbana de Caxias - MA.</p>
                      </div>
                    )}
                  </div>

                  {/* Card 3: Forma de Pagamento */}
                  <div className={`p-4 rounded-2xl border space-y-2 ${
                    isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-[#EEF8FF]/60 border-blue-900/10'
                  }`}>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#006EDB] flex items-center space-x-1.5">
                      <CreditCard className="h-3.5 w-3.5" />
                      <span>Forma & Pagamento</span>
                    </span>
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-[#003B73] dark:text-white">{order.paymentMethod || 'Pix'}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                        order.paymentStatus === 'Confirmado' 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : order.paymentStatus === 'Em Análise'
                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : order.paymentStatus === 'Recusado'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {order.paymentStatus || 'Pendente'}
                      </span>
                    </div>
                    {order.installments && order.installments > 1 && (
                      <p className="text-[#006EDB] font-bold text-[11px]">
                        Parcelado em {order.installments}x sem juros no cartão
                      </p>
                    )}
                    {order.paymentMethod === 'Crediário da Loja' && (
                      <p className="text-[#003B73] font-bold text-[11px]">
                        Carnê Crediário Evidência em até 6x
                      </p>
                    )}
                  </div>

                </div>

                {/* LISTA EXPANSÍVEL DE PRODUTOS */}
                {isExpanded && (
                  <div className="p-5 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-[#003B73] flex items-center space-x-1.5">
                        <ShoppingBag className="h-4 w-4 text-[#006EDB]" />
                        <span>Itens do Pedido ({itemsTotalCount} modelo/modelos)</span>
                      </span>
                    </div>

                    {/* Grid dos Produtos do Pedido */}
                    <div className="space-y-3">
                      {(order.items || []).map((item, idx) => {
                        const itemSubtotal = (item.price || 0) * (item.quantity || 1);

                        return (
                          <div
                            key={idx}
                            onClick={() => handleNavigateToProduct(item)}
                            className={`p-3.5 rounded-2xl border flex items-center justify-between gap-4 transition-all cursor-pointer group ${
                              isDark 
                                ? 'bg-slate-950/60 border-slate-800 hover:border-[#006EDB]/50 hover:bg-slate-900' 
                                : 'bg-white border-blue-900/10 hover:border-[#006EDB] hover:bg-[#EEF8FF]/50 shadow-2xs'
                            }`}
                            title={`Clique para ver detalhes de ${item.name}`}
                          >
                            <div className="flex items-center space-x-3.5 min-w-0">
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-14 h-14 object-contain p-1 rounded-xl border border-blue-900/10 bg-[#EEF8FF] shrink-0 group-hover:scale-105 transition-transform"
                              />
                              <div className="min-w-0 space-y-1">
                                <h4 className={`text-xs font-extrabold truncate group-hover:text-[#006EDB] transition-colors ${
                                  isDark ? 'text-white' : 'text-[#00509E]'
                                }`}>
                                  {item.name}
                                </h4>
                                <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#52708F]">
                                  <span className="px-2 py-0.5 rounded-md bg-[#DDF1FF] text-[#003B73] font-bold">
                                    {item.selectedSize !== 0 ? `Tam: ${item.selectedSize}` : 'Acessório'}
                                  </span>
                                  <span>Qtd: <strong className="text-[#003B73]">{item.quantity || 1}</strong></span>
                                  <span>• Unitário: <strong className="text-[#003B73]">R$ {(item.price || 0).toFixed(2).replace('.', ',')}</strong></span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0 flex items-center space-x-3">
                              <div>
                                <span className="text-[10px] font-bold uppercase text-[#52708F] block">Subtotal</span>
                                <span className="text-xs font-black text-[#003B73]">
                                  R$ {itemSubtotal.toFixed(2).replace('.', ',')}
                                </span>
                              </div>
                              <div className="p-2 rounded-xl bg-[#DDF1FF] text-[#003B73] group-hover:bg-[#006EDB] group-hover:text-white transition-all hidden sm:block">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
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
                        const whatsappUrl = `https://api.whatsapp.com/send?phone=5599984684867&text=${encodeURIComponent(msg)}`;
                        window.open(whatsappUrl, '_blank');
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

