import React, { useState, useEffect, useMemo } from 'react';
import { ICreditEvaluation } from '../../../types';
import { creditService } from '../../../services/credit/creditService';
import { WhatsAppButton } from '../../common/WhatsAppButton';
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User, 
  DollarSign, 
  Briefcase, 
  Phone, 
  Calendar,
  AlertCircle,
  Loader2,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';

interface CreditEvaluationsListProps {
  isDark: boolean;
  onRefreshStats?: () => void;
}

export const CreditEvaluationsList: React.FC<CreditEvaluationsListProps> = ({ 
  isDark,
  onRefreshStats 
}) => {
  const [evaluations, setEvaluations] = useState<ICreditEvaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Pendente' | 'Aprovado' | 'Rejeitado'>('Todos');
  
  // Modal de Aprovação / Rejeição
  const [actionModal, setActionModal] = useState<{
    type: 'approve' | 'reject';
    evaluation: ICreditEvaluation;
  } | null>(null);
  const [approvedLimitInput, setApprovedLimitInput] = useState<string>('500');
  const [actionNotes, setActionNotes] = useState<string>('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const fetchEvaluations = async () => {
    setIsLoading(true);
    try {
      const data = await creditService.getAllCreditEvaluations();
      setEvaluations(data);
      if (onRefreshStats) onRefreshStats();
    } catch (err) {
      console.error('Erro ao carregar avaliações:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvaluations();
  }, []);

  const filteredEvaluations = useMemo(() => {
    return evaluations.filter(item => {
      const matchesSearch = 
        (item.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.customerCpf || '').replace(/\D/g, '').includes(searchTerm.replace(/\D/g, '')) ||
        (item.customerPhone || '').includes(searchTerm) ||
        (item.customerEmail || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'Todos' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [evaluations, searchTerm, statusFilter]);

  const handleOpenApprove = (item: ICreditEvaluation) => {
    setActionModal({ type: 'approve', evaluation: item });
    setApprovedLimitInput(item.requestedLimit ? String(item.requestedLimit) : '500');
    setActionNotes('');
  };

  const handleOpenReject = (item: ICreditEvaluation) => {
    setActionModal({ type: 'reject', evaluation: item });
    setActionNotes('');
  };

  const handleConfirmAction = async () => {
    if (!actionModal) return;
    setIsSubmittingAction(true);
    try {
      if (actionModal.type === 'approve') {
        const limitNum = parseFloat(approvedLimitInput) || 0;
        await creditService.updateCreditEvaluationStatus(
          actionModal.evaluation.id,
          'Aprovado',
          limitNum,
          actionNotes || 'Limite aprovado pela equipe administrativa'
        );
      } else {
        await creditService.updateCreditEvaluationStatus(
          actionModal.evaluation.id,
          'Rejeitado',
          undefined,
          actionNotes || 'Solicitação não aprovada no momento'
        );
      }
      setActionModal(null);
      await fetchEvaluations();
    } catch (err) {
      console.error('Erro ao atualizar avaliação:', err);
      alert('Não foi possível concluir a ação.');
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
      {/* Barra de Filtros e Busca com design Apple */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        isDark ? 'bg-[#1c1c1e] border-slate-800' : 'bg-white border-slate-200/80 shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, CPF, telefone ou e-mail..."
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
              onClick={fetchEvaluations}
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

      {/* Listagem de Avaliações */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Carregando avaliações de crediário...
          </p>
        </div>
      ) : filteredEvaluations.length === 0 ? (
        <div className={`p-12 text-center rounded-2xl border ${
          isDark ? 'bg-[#1c1c1e] border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
        }`}>
          <ShieldCheck className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-60" />
          <h3 className="text-sm font-bold">Nenhuma avaliação de crédito encontrada</h3>
          <p className="text-xs mt-1">
            {searchTerm || statusFilter !== 'Todos'
              ? 'Tente alterar os filtros ou o termo de busca.'
              : 'As novas solicitações de limite enviadas pelos clientes aparecerão aqui.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredEvaluations.map(item => {
            const statusConfig = {
              Pendente: {
                bg: isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200',
                icon: Clock,
                label: 'Pendente de Análise'
              },
              Aprovado: {
                bg: isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
                icon: CheckCircle2,
                label: 'Crédito Aprovado'
              },
              Rejeitado: {
                bg: isDark ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-700 border-rose-200',
                icon: XCircle,
                label: 'Não Aprovado'
              },
            }[item.status];

            const StatusIcon = statusConfig.icon;

            const whatsAppMessage = `Olá ${item.customerName || 'Cliente'}, tudo bem? Aqui é da Evidência Calçados. Estou entrando em contato referente à sua solicitação de avaliação de crediário em nossa loja!`;

            return (
              <div
                key={item.id}
                className={`p-5 sm:p-6 rounded-2xl border transition-all ${
                  isDark 
                    ? 'bg-[#1c1c1e] border-slate-800 hover:border-slate-700' 
                    : 'bg-white border-slate-200/80 shadow-sm hover:shadow-md'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-base font-bold text-slate-900 dark:text-white">
                        {item.customerName}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusConfig.bg}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusConfig.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      {item.customerCpf && <span>CPF: <strong className="font-mono text-slate-700 dark:text-slate-300">{item.customerCpf}</strong></span>}
                      {item.customerPhone && <span>Tel: <strong className="font-mono text-slate-700 dark:text-slate-300">{item.customerPhone}</strong></span>}
                      {item.customerEmail && <span>E-mail: {item.customerEmail}</span>}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Botão de WhatsApp Rápido Integrado com o Telefone do Cliente */}
                  <div className="flex items-center gap-2">
                    <WhatsAppButton
                      phone={item.customerPhone || ''}
                      message={whatsAppMessage}
                      label="Conversar no WhatsApp"
                      size="md"
                    />
                  </div>
                </div>

                {/* Detalhes Financeiros & Profissionais da Análise */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 text-xs">
                  <div>
                    <span className="block text-[11px] text-slate-400 font-medium">Renda Declarada</span>
                    <strong className="text-slate-900 dark:text-white font-semibold">
                      {item.income ? `R$ ${item.income}` : 'Não informada'}
                    </strong>
                  </div>

                  <div>
                    <span className="block text-[11px] text-slate-400 font-medium">Profissão</span>
                    <strong className="text-slate-900 dark:text-white font-semibold">
                      {item.profession || 'Não informada'}
                    </strong>
                  </div>

                  <div>
                    <span className="block text-[11px] text-slate-400 font-medium">Limite Solicitado</span>
                    <strong className="text-slate-900 dark:text-white font-semibold">
                      {item.requestedLimit ? formatCurrency(item.requestedLimit) : 'Sob Análise'}
                    </strong>
                  </div>

                  <div>
                    <span className="block text-[11px] text-slate-400 font-medium">Limite Aprovado</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {item.approvedLimit ? formatCurrency(item.approvedLimit) : (item.status === 'Aprovado' ? 'Padrão da Loja' : '—')}
                    </strong>
                  </div>
                </div>

                {/* Referências & Observações */}
                {(item.referenceContact || item.notes) && (
                  <div className="mb-4 text-xs space-y-1">
                    {item.referenceContact && (
                      <p className="text-slate-600 dark:text-slate-300">
                        <strong className="text-slate-700 dark:text-slate-200">Contato de Referência:</strong> {item.referenceContact}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-slate-600 dark:text-slate-300">
                        <strong className="text-slate-700 dark:text-slate-200">Notas / Parecer:</strong> {item.notes}
                      </p>
                    )}
                  </div>
                )}

                {/* Ações de Aprovar / Rejeitar */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  {item.status !== 'Aprovado' && (
                    <button
                      type="button"
                      onClick={() => handleOpenApprove(item)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Aprovar Limite
                    </button>
                  )}

                  {item.status !== 'Rejeitado' && (
                    <button
                      type="button"
                      onClick={() => handleOpenReject(item)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Rejeitar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Confirmação de Aprovação / Rejeição */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold">
                {actionModal.type === 'approve' ? 'Aprovar Crediário' : 'Rejeitar Solicitação'}
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
              Cliente: <strong className="text-slate-800 dark:text-slate-200">{actionModal.evaluation.customerName}</strong>
              {actionModal.evaluation.customerCpf && ` (CPF: ${actionModal.evaluation.customerCpf})`}
            </p>

            {actionModal.type === 'approve' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold">
                  Definir Limite de Crédito Aprovado (R$):
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    R$
                  </span>
                  <input
                    type="number"
                    step="50"
                    min="0"
                    value={approvedLimitInput}
                    onChange={e => setApprovedLimitInput(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-bold border focus:outline-none transition-all ${
                      isDark 
                        ? 'bg-slate-800 border-slate-700 text-emerald-400 focus:border-emerald-500' 
                        : 'bg-slate-50 border-slate-200 text-emerald-600 focus:border-emerald-500'
                    }`}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold">
                Observações / Justificativa {actionModal.type === 'reject' ? '(Obrigatório)' : '(Opcional)'}:
              </label>
              <textarea
                rows={3}
                value={actionNotes}
                onChange={e => setActionNotes(e.target.value)}
                placeholder={
                  actionModal.type === 'approve'
                    ? 'Ex: Aprovado mediante confirmação de endereço.'
                    : 'Ex: Renda incompatível no momento ou documentação divergente.'
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
                disabled={isSubmittingAction || (actionModal.type === 'reject' && !actionNotes.trim())}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-sm flex items-center gap-1.5 ${
                  actionModal.type === 'approve'
                    ? 'bg-emerald-500 hover:bg-emerald-600'
                    : 'bg-rose-500 hover:bg-rose-600 disabled:opacity-50'
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
