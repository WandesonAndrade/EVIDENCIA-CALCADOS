import React, { useState, useEffect, useMemo } from 'react';
import { ICreditOrder } from '../../../types';
import { creditService } from '../../../services/credit/creditService';
import { WhatsAppButton } from '../../common/WhatsAppButton';
import { 
  Search, 
  ShoppingBag, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar,
  DollarSign, 
  MapPin, 
  Loader2, 
  RefreshCw,
  PackageCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface CreditOrdersListProps {
  isDark: boolean;
  onRefreshStats?: () => void;
}

export const CreditOrdersList: React.FC<CreditOrdersListProps> = ({
  isDark,
  onRefreshStats
}) => {
  const [orders, setOrders] = useState<ICreditOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Pendente' | 'Aprovado' | 'Rejeitado'>('Todos');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  // Modal de Ação
  const [actionModal, setActionModal] = useState<{
    type: 'approve' | 'reject';
    order: ICreditOrder;
  } | null>(null);
  const [actionNotes, setActionNotes] = useState<string>('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const data = await creditService.getAllCreditOrders();
      setOrders(data);
      if (onRefreshStats) onRefreshStats();
    } catch (err) {
      console.error('Erro ao carregar pedidos de crediário:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const toggleExpand = (orderId: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(item => {
      const matchesSearch = 
        (item.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.customerCpf || '').replace(/\D/g, '').includes(searchTerm.replace(/\D/g, '')) ||
        (item.customerPhone || '').includes(searchTerm);

      const matchesStatus = statusFilter === 'Todos' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const handleOpenApprove = (order: ICreditOrder) => {
    setActionModal({ type: 'approve', order });
    setActionNotes('');
  };

  const handleOpenReject = (order: ICreditOrder) => {
    setActionModal({ type: 'reject', order });
    setActionNotes('');
  };

  const handleConfirmAction = async () => {
    if (!actionModal) return;
    setIsSubmittingAction(true);
    try {
      if (actionModal.type === 'approve') {
        await creditService.updateCreditOrderStatus(
          actionModal.order.id,
          'Aprovado',
          actionNotes || 'Compra no crediário aprovada pela equipe'
        );
      } else {
        await creditService.updateCreditOrderStatus(
          actionModal.order.id,
          'Rejeitado',
          actionNotes || 'Solicitação de compra recusada'
        );
      }
      setActionModal(null);
      await fetchOrders();
    } catch (err) {
      console.error('Erro ao atualizar solicitação de compra:', err);
      alert('Não foi possível atualizar a solicitação.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const formatCurrency = (val?: number) => {
    if (typeof val !== 'number') return '—';
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra de Filtros e Busca */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        isDark ? 'bg-[#1c1c1e] border-slate-800' : 'bg-white border-slate-200/80 shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, ID do pedido, CPF ou telefone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-medium border focus:outline-none transition-all ${
                isDark 
                  ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-900'
              }`}
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {(['Todos', 'Pendente', 'Aprovado', 'Rejeitado'] as const).map(status => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === status
                    ? (isDark ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-slate-900 text-white font-bold')
                    : (isDark ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                }`}
              >
                {status}
              </button>
            ))}

            <button
              type="button"
              onClick={fetchOrders}
              title="Atualizar lista"
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                isDark 
                  ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800' 
                  : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Listagem */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Carregando solicitações de compra...
          </p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className={`p-12 text-center rounded-2xl border ${
          isDark ? 'bg-[#1c1c1e] border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
        }`}>
          <PackageCheck className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-60" />
          <h3 className="text-sm font-bold">Nenhuma solicitação de compra encontrada</h3>
          <p className="text-xs mt-1">
            {searchTerm || statusFilter !== 'Todos'
              ? 'Tente alterar os filtros ou o termo de busca.'
              : 'As solicitações de compra de carrinho enviadas pelos clientes aparecerão aqui.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredOrders.map(item => {
            const isExpanded = expandedOrders.has(item.id);

            const statusConfig = {
              Pendente: {
                bg: isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200',
                icon: Clock,
                label: 'Aguardando Aprovação'
              },
              Aprovado: {
                bg: isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
                icon: CheckCircle2,
                label: 'Compra Aprovada'
              },
              Rejeitado: {
                bg: isDark ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-700 border-rose-200',
                icon: XCircle,
                label: 'Compra Não Autorizada'
              },
            }[item.status];

            const StatusIcon = statusConfig.icon;

            const whatsAppMessage = `Olá ${item.customerName || 'Cliente'}, aqui é da Evidência Calçados! Recebemos sua solicitação de compra via Crediário (ref: ${item.id}) no valor de ${formatCurrency(item.totalAmount)}. Gostaria de alinhar os detalhes da sua compra com você!`;

            return (
              <div
                key={item.id}
                className={`p-5 sm:p-6 rounded-2xl border transition-all ${
                  isDark 
                    ? 'bg-[#1c1c1e] border-slate-800 hover:border-slate-700' 
                    : 'bg-white border-slate-200/80 shadow-sm hover:shadow-md'
                }`}
              >
                {/* Cabeçalho do Card */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-base font-bold text-slate-900 dark:text-white">
                        {item.customerName}
                      </span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        #{item.id}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusConfig.bg}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusConfig.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      {item.customerCpf && <span>CPF: <strong className="font-mono text-slate-700 dark:text-slate-300">{item.customerCpf}</strong></span>}
                      {item.customerPhone && <span>Tel: <strong className="font-mono text-slate-700 dark:text-slate-300">{item.customerPhone}</strong></span>}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* WhatsApp integrado com telefone do cliente */}
                  <div className="flex items-center gap-2">
                    <WhatsAppButton
                      phone={item.customerPhone || ''}
                      message={whatsAppMessage}
                      label="Conversar no WhatsApp"
                      size="md"
                    />
                  </div>
                </div>

                {/* Resumo da Compra */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 text-xs">
                  <div>
                    <span className="block text-[11px] text-slate-400 font-medium">Total Solicitado</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                      {formatCurrency(item.totalAmount)}
                    </strong>
                  </div>

                  <div>
                    <span className="block text-[11px] text-slate-400 font-medium">Parcelamento</span>
                    <strong className="text-slate-900 dark:text-white font-semibold">
                      {item.installmentsRequested ? `${item.installmentsRequested}x no Carnê` : '1x (À vista no carnê)'}
                    </strong>
                  </div>

                  <div>
                    <span className="block text-[11px] text-slate-400 font-medium">Modalidade</span>
                    <strong className="text-slate-900 dark:text-white font-semibold">
                      {item.deliveryType || 'Entrega no Endereço'}
                    </strong>
                  </div>

                  <div>
                    <span className="block text-[11px] text-slate-400 font-medium">Qtd. Itens</span>
                    <strong className="text-slate-900 dark:text-white font-semibold">
                      {item.items?.length || 0} produto(s)
                    </strong>
                  </div>
                </div>

                {/* Endereço de Entrega se houver */}
                {item.deliveryAddress && (
                  <div className="mb-4 flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span>{item.deliveryAddress}</span>
                  </div>
                )}

                {/* Itens do Carrinho - Botão para Expandir */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                  <button
                    type="button"
                    onClick={() => toggleExpand(item.id)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    <span>{isExpanded ? 'Ocultar itens da compra' : `Ver ${item.items?.length || 0} produto(s) do carrinho`}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {isExpanded && item.items && item.items.length > 0 && (
                    <div className="mt-3 space-y-2 divide-y divide-slate-100 dark:divide-slate-800">
                      {item.items.map((prod, idx) => (
                        <div key={idx} className="flex items-center justify-between pt-2 text-xs">
                          <div className="flex items-center gap-3">
                            {prod.image && (
                              <img
                                src={prod.image}
                                alt={prod.name}
                                className="w-10 h-10 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                              />
                            )}
                            <div>
                              <p className="font-semibold text-slate-800 dark:text-slate-200">{prod.name}</p>
                              <p className="text-[11px] text-slate-400">
                                Tam: <strong>{prod.selectedSize}</strong> | Qtd: <strong>{prod.quantity}</strong>
                              </p>
                            </div>
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {formatCurrency(prod.price * prod.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Observações do Administrador */}
                {item.adminNotes && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-xs text-slate-600 dark:text-slate-300">
                    <strong className="text-slate-700 dark:text-slate-200">Notas da Loja:</strong> {item.adminNotes}
                  </div>
                )}

                {/* Ações de Aprovar / Rejeitar Pedido */}
                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
                  {item.status !== 'Aprovado' && (
                    <button
                      type="button"
                      onClick={() => handleOpenApprove(item)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Aprovar Compra
                    </button>
                  )}

                  {item.status !== 'Rejeitado' && (
                    <button
                      type="button"
                      onClick={() => handleOpenReject(item)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Recusar Compra
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Ação para Aprovar/Recusar Compra */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold">
                {actionModal.type === 'approve' ? 'Aprovar Compra via Crediário' : 'Recusar Compra via Crediário'}
              </h3>
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cliente: <strong className="text-slate-800 dark:text-slate-200">{actionModal.order.customerName}</strong> | Valor:{' '}
              <strong className="text-emerald-500">{formatCurrency(actionModal.order.totalAmount)}</strong>
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold">
                Observações / Informações para o Cliente:
              </label>
              <textarea
                rows={3}
                value={actionNotes}
                onChange={e => setActionNotes(e.target.value)}
                placeholder={
                  actionModal.type === 'approve'
                    ? 'Ex: Compra aprovada! Carnê disponível na loja para assinatura ou via WhatsApp.'
                    : 'Ex: Limite insuficiente para o valor solicitado. Entre em contato para alternativas.'
                }
                className={`w-full p-3 rounded-xl text-xs font-medium border focus:outline-none transition-all resize-none ${
                  isDark 
                    ? 'bg-slate-800 border-slate-700 text-white focus:border-amber-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-900'
                }`}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                disabled={isSubmittingAction}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={isSubmittingAction}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-sm flex items-center gap-1.5 ${
                  actionModal.type === 'approve'
                    ? 'bg-emerald-500 hover:bg-emerald-600'
                    : 'bg-rose-500 hover:bg-rose-600'
                }`}
              >
                {isSubmittingAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {actionModal.type === 'approve' ? 'Confirmar Aprovação' : 'Confirmar Recusa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
