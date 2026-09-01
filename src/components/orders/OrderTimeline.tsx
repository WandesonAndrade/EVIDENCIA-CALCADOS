import React from 'react';
import { Box, ShieldCheck, Truck, PackageCheck, Check, Store, ShoppingBag, ExternalLink, RefreshCw } from 'lucide-react';
import { ITrackingEvent } from '../../services/shipping/shippingProvider.interface';

interface Props {
  currentStep: number;
  isDark: boolean;
  deliveryType?: string;
  trackingCode?: string;
  trackingEvents?: ITrackingEvent[];
  onRefreshTracking?: () => void;
  isSyncing?: boolean;
}

export const OrderTimeline: React.FC<Props> = ({
  currentStep,
  isDark: _isDark,
  deliveryType,
  trackingCode,
  trackingEvents = [],
  onRefreshTracking,
  isSyncing = false,
}) => {
  const isStorePickup = deliveryType === 'Retirada na Loja';

  const steps = isStorePickup
    ? [
        { step: 1, label: 'Pedido Recebido', shortLabel: 'Recebido', icon: Box },
        { step: 2, label: 'Pagamento Aprovado', shortLabel: 'Pago', icon: ShieldCheck },
        { step: 3, label: 'Pronto p/ Retirada', shortLabel: 'No Balcão', icon: Store },
        { step: 4, label: 'Retirado', shortLabel: 'Retirado', icon: ShoppingBag },
      ]
    : [
        { step: 1, label: 'Pedido Recebido', shortLabel: 'Recebido', icon: Box },
        { step: 2, label: 'Pagamento Aprovado', shortLabel: 'Pago', icon: ShieldCheck },
        { step: 3, label: 'Em Preparação', shortLabel: 'Preparando', icon: Truck },
        { step: 4, label: 'Entregue', shortLabel: 'Entregue', icon: PackageCheck },
      ];

  const progressPct = ((Math.max(1, currentStep) - 1) / 3) * 100;
  const latestEvent = trackingEvents.length > 0 ? trackingEvents[trackingEvents.length - 1] : null;

  return (
    <div className="py-5 px-5 sm:px-12 border-b border-black/[0.04] dark:border-white/[0.06] bg-black/[0.01] dark:bg-white/[0.01] select-none space-y-4">
      <div className="max-w-2xl mx-auto relative">
        {/* Linha Conectora de Fundo */}
        <div className="absolute left-6 right-6 top-[18px] -translate-y-1/2 h-[2.5px] bg-slate-200/90 dark:bg-white/[0.08] rounded-full z-0" />

        {/* Linha de Progresso Ativa no Azul Apple */}
        <div
          className="absolute left-6 top-[18px] -translate-y-1/2 h-[2.5px] bg-[#0071E3] dark:bg-[#0A84FF] rounded-full transition-all duration-500 ease-out z-0"
          style={{ width: `calc(${progressPct}% - ${currentStep === 4 ? 0 : 12}px)` }}
        />

        <div className="flex items-start justify-between relative z-10">
          {steps.map(({ step, label, shortLabel, icon: StepIcon }) => {
            const isCompleted = currentStep > step;
            const isCurrent = currentStep === step;

            return (
              <div key={step} className="flex flex-col items-center group">
                {/* Círculo do Nó Apple HIG */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 shadow-2xs ${
                    isCurrent
                      ? 'bg-[#0071E3] dark:bg-[#0A84FF] text-white ring-4 ring-[#0071E3]/20 dark:ring-[#0A84FF]/25 scale-105 shadow-sm'
                      : isCompleted
                      ? 'bg-[#0071E3] dark:bg-[#0A84FF] text-white'
                      : 'bg-white dark:bg-[#242426] text-slate-400 dark:text-slate-500 border border-slate-200/90 dark:border-white/10'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4 stroke-[2.5]" />
                  ) : (
                    <StepIcon className="h-4 w-4 stroke-[1.75]" />
                  )}
                </div>

                {/* Rótulo e Sub-indicador */}
                <div className="mt-2 text-center max-w-[85px] sm:max-w-none">
                  <span
                    className={`text-[11px] sm:text-xs font-medium tracking-tight block transition-colors leading-tight ${
                      isCurrent
                        ? 'text-[#0071E3] dark:text-[#0A84FF] font-semibold'
                        : isCompleted
                        ? 'text-slate-800 dark:text-slate-200 font-medium'
                        : 'text-slate-400 dark:text-[#86868B]'
                    }`}
                  >
                    <span className="hidden sm:inline">{label}</span>
                    <span className="sm:hidden">{shortLabel}</span>
                  </span>
                  {isCurrent && (
                    <span className="inline-block mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#0071E3] dark:text-[#0A84FF] bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 px-1.5 py-0.2 rounded-md">
                      Em Andamento
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Caixa de Rastreamento Automático Melhor Envio/Melhor Rastreio */}
      {trackingCode && !isStorePickup && (
        <div className="max-w-2xl mx-auto space-y-2">
          <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/25 border border-blue-100 dark:border-blue-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Rastreio: <strong className="font-mono text-[#0071E3]">{trackingCode}</strong>
                  </span>
                  {onRefreshTracking && (
                    <button
                      onClick={onRefreshTracking}
                      disabled={isSyncing}
                      className="p-1 text-slate-400 hover:text-[#0071E3] transition rounded-full"
                      title="Atualizar Rastreamento"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                    </button>
                  )}
                </div>
                {latestEvent && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                    {latestEvent.description} {latestEvent.location ? `• ${latestEvent.location}` : ''}
                  </p>
                )}
              </div>
            </div>

            <a
              href={`https://www.melhorrastreio.com.br/rastreio/${trackingCode}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-[#0071E3] hover:bg-[#005bb5] text-white font-medium text-[11px] transition flex items-center gap-1 shrink-0 self-end sm:self-center"
            >
              <span>Melhor Rastreio</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Histórico Completo da Trajetória do Pacote (Checkpoints) */}
          {trackingEvents.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-slate-100 dark:border-white/5 space-y-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Histórico de Trajetória ({trackingEvents.length} {trackingEvents.length === 1 ? 'movimentação' : 'movimentações'})
              </span>
              <div className="space-y-2 pl-2 border-l-2 border-blue-100 dark:border-blue-900/40 ml-1">
                {[...trackingEvents].reverse().map((event, idx) => (
                  <div key={idx} className="relative pl-3 text-xs space-y-0.5">
                    <div className="absolute -left-[17px] top-1.5 w-2 h-2 rounded-full bg-[#0071E3] ring-4 ring-blue-50 dark:ring-blue-950" />
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                        {event.description || event.status}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {event.createdAt ? new Date(event.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    {event.location && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        📍 {event.location}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
