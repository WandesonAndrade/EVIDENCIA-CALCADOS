import React from 'react';
import { useApp } from '../context/AppContext';
import { AuthScreen } from './AuthScreen';
import { ShoppingBag, MessageSquare, Calendar, ExternalLink } from 'lucide-react';

export const OrderHistory: React.FC = () => {
  const { currentUser, orders, isLoadingOrders, theme } = useApp();

  // If not logged in, require auth!
  if (!currentUser) {
    return <AuthScreen />;
  }

  const getStatusColor = (status: string) => {
    if (theme === 'dark') {
      switch (status) {
        case 'Confirmado':
          return 'bg-blue-950/40 text-blue-400 border border-blue-900/30';
        case 'Cancelado':
          return 'bg-red-950/40 text-red-400 border border-red-900/30';
        case 'Entregue':
          return 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30';
        default:
          return 'bg-amber-950/40 text-amber-400 border border-amber-900/30'; // Pendente
      }
    } else {
      switch (status) {
        case 'Confirmado':
          return 'bg-blue-50 text-blue-700 border border-blue-100';
        case 'Cancelado':
          return 'bg-red-50 text-red-700 border border-red-100';
        case 'Entregue':
          return 'bg-green-50 text-green-700 border border-green-100';
        default:
          return 'bg-amber-50 text-amber-700 border border-amber-100'; // Pendente
      }
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
    <div id="order-history-page" className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>Histórico de Compras</h1>
          <p className={`text-xs font-light ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Olá, {currentUser.name}! Veja abaixo todos os seus pedidos finalizados e gerencie o progresso deles.</p>
        </div>
      </div>

      {isLoadingOrders ? (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className={`border rounded-xl p-6 animate-pulse space-y-3 ${
              theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-100'
            }`}>
              <div className={`h-4 rounded w-1/4 ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-200'}`}></div>
              <div className={`h-4 rounded w-3/4 ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-200'}`}></div>
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className={`text-center py-16 border rounded-2xl p-8 max-w-md mx-auto space-y-4 ${
          theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-100'
        }`}>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
            theme === 'dark' ? 'bg-slate-900 text-slate-500' : 'bg-slate-50 text-slate-400'
          }`}>
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>Nenhum pedido encontrado</p>
            <p className={`text-xs font-light ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Você ainda não finalizou compras. Adicione itens na vitrine e finalize pelo WhatsApp!</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div 
              key={order.id} 
              className={`border rounded-2xl overflow-hidden shadow-xs transition-all ${
                theme === 'dark' 
                  ? 'bg-[#0f172a] border-slate-800 hover:border-amber-400/30' 
                  : 'bg-white border-slate-100 hover:border-slate-200'
              }`}
            >
              {/* Header card info */}
              <div className={`border-b px-6 py-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3 ${
                theme === 'dark' ? 'bg-slate-950/60 border-slate-850' : 'bg-slate-50 border-slate-100'
              }`}>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs font-mono font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-800'}`}>{order.id}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className={`flex items-center text-[11px] font-light space-x-1.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-400'}`}>
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(order.createdAt)}</span>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className={`text-[10px] block font-bold uppercase ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Valor Total</span>
                  <span className={`text-sm sm:text-base font-extrabold ${theme === 'dark' ? 'text-amber-400' : 'text-primary'}`}>R$ {order.total.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

              {/* Order Items list */}
              <div className={`px-6 py-4 divide-y ${theme === 'dark' ? 'divide-slate-850' : 'divide-slate-100'}`}>
                {order.items.map((item, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                    <div className="flex items-center space-x-3">
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className={`w-10 h-10 object-cover rounded border ${
                          theme === 'dark' ? 'border-slate-800 bg-slate-950' : 'border-slate-100 bg-slate-50'
                        }`}
                      />
                      <div>
                        <h4 className={`text-xs font-bold line-clamp-1 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{item.name}</h4>
                        <p className={`text-[9px] font-medium uppercase ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                          {item.selectedSize !== 0 ? `Tamanho: ${item.selectedSize}` : 'Acessório'} • Qtd: {item.quantity}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Order Actions footer */}
              <div className={`border-t px-6 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                theme === 'dark' ? 'bg-slate-950/40 border-slate-850' : 'bg-slate-50/50 border-slate-100'
              }`}>
                {order.sellerName ? (
                  <p className={`text-[10px] font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-400'}`}>
                    Atendido por: <span className={theme === 'dark' ? 'text-slate-300 font-semibold' : 'text-slate-600 font-semibold'}>{order.sellerName}</span> ({order.sellerEmail})
                  </p>
                ) : (
                  <p className={`text-[10px] font-light ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Aguardando atendimento de um consultor de vendas.</p>
                )}

                <button
                  onClick={() => window.open(order.whatsappUrl, '_blank')}
                  className="flex items-center space-x-1.5 py-1.5 px-3 bg-[#25D366] text-white text-[10px] font-bold rounded-lg hover:bg-[#20ba5a] transition-all cursor-pointer"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Finalizar no WhatsApp</span>
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};
