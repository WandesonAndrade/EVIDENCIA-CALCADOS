import React from 'react';
import { Box, ShieldCheck, Truck, PackageCheck, Check, RotateCcw, Store, ShoppingBag } from 'lucide-react';
import { OrderStatus } from '../../types';

interface Props {
  currentStatus: OrderStatus;
  isDark: boolean;
  isStorePickup?: boolean;
  onStatusChange: (status: OrderStatus) => void;
}

interface StepDef {
  step: number;
  status: OrderStatus;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const AdminStageStepper: React.FC<Props> = ({ currentStatus, isDark: _isDark, isStorePickup = false, onStatusChange }) => {
  if (currentStatus === 'Cancelado') {
    return (
      <div className="p-3.5 rounded-2xl bg-rose-500/[0.08] border border-rose-500/20 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-pulse" />
          <span>Este pedido foi <strong>Cancelado</strong>.</span>
        </div>
        <button
          type="button"
          onClick={() => onStatusChange('Pendente')}
          className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 font-semibold text-[11px] transition-colors cursor-pointer"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Reativar Pedido</span>
        </button>
      </div>
    );
  }

  const steps: StepDef[] = isStorePickup
    ? [
        { step: 1, status: 'Pendente', label: 'Pedido Recebido', shortLabel: 'Recebido', icon: Box },
        { step: 2, status: 'Confirmado', label: 'Pagamento Aprovado', shortLabel: 'Pago', icon: ShieldCheck },
        { step: 3, status: 'Em Preparação', label: 'Pronto p/ Retirada', shortLabel: 'No Balcão', icon: Store },
        { step: 4, status: 'Entregue', label: 'Retirado na Loja', shortLabel: 'Retirado', icon: ShoppingBag },
      ]
    : [
        { step: 1, status: 'Pendente', label: 'Pedido Recebido', shortLabel: 'Recebido', icon: Box },
        { step: 2, status: 'Confirmado', label: 'Pagamento Aprovado', shortLabel: 'Pago', icon: ShieldCheck },
        { step: 3, status: 'Em Preparação', label: 'Em Preparação', shortLabel: 'Preparando', icon: Truck },
        { step: 4, status: 'Entregue', label: 'Entregue ao Cliente', shortLabel: 'Entregue', icon: PackageCheck },
      ];

  const currentStepNum = currentStatus === 'Entregue'
    ? 4
    : currentStatus === 'Em Preparação'
    ? 3
    : currentStatus === 'Confirmado'
    ? 2
    : 1;

  const progressPct = ((currentStepNum - 1) / 3) * 100;

  return (
    <div className="py-3 px-4 sm:px-6 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.06] relative select-none">
      <div className="relative">
        {/* Linha de Conexão de Fundo - alinhada no centro do círculo de 32px (top-4 = 16px) */}
        <div className="absolute left-6 right-6 top-4 -translate-y-1/2 h-[3px] bg-slate-200/80 dark:bg-white/[0.08] rounded-full z-0" />

        {/* Linha de Progresso Ativa no Azul Apple */}
        <div
          className="absolute left-6 top-4 -translate-y-1/2 h-[3px] bg-[#0071E3] dark:bg-[#0A84FF] rounded-full transition-all duration-500 ease-out z-0"
          style={{ width: `calc(${progressPct}% - ${currentStepNum === 4 ? 0 : 12}px)` }}
        />

        <div className="flex items-start justify-between relative z-10">
          {steps.map((s) => {
            const isCompleted = currentStepNum >= s.step;
            const isCurrent = currentStepNum === s.step;
            const StepIcon = s.icon;

            return (
              <button
                key={s.step}
                type="button"
                onClick={() => onStatusChange(s.status)}
                title={`Clique para avançar/voltar para "${s.label}"`}
                className="flex flex-col items-center group cursor-pointer focus:outline-none transition-all duration-200"
              >
                {/* Círculo do Nó com centro exato em 16px (h-8 w-8) */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 shadow-sm ${
                    isCurrent
                      ? 'bg-[#0071E3] dark:bg-[#0A84FF] text-white ring-4 ring-[#0071E3]/20 dark:ring-[#0A84FF]/30 scale-110 shadow-md'
                      : isCompleted
                      ? 'bg-[#0071E3] dark:bg-[#0A84FF] text-white group-hover:brightness-110'
                      : 'bg-white dark:bg-[#2C2C2E] text-slate-400 dark:text-slate-400 border border-slate-200 dark:border-white/10 group-hover:border-[#0071E3] group-hover:text-[#0071E3]'
                  }`}
                >
                  {isCompleted && !isCurrent ? (
                    <Check className="h-4 w-4 stroke-[3]" />
                  ) : (
                    <StepIcon className="h-4 w-4 stroke-[2]" />
                  )}
                </div>

                {/* Rótulo e Indicador da Etapa */}
                <div className="mt-2 text-center max-w-[90px] sm:max-w-none">
                  <span
                    className={`text-[11px] sm:text-xs font-medium tracking-tight block transition-colors leading-tight ${
                      isCurrent
                        ? 'text-[#0071E3] dark:text-[#0A84FF] font-bold'
                        : isCompleted
                        ? 'text-slate-800 dark:text-slate-200 font-semibold'
                        : 'text-slate-400 dark:text-[#86868B] group-hover:text-slate-600 dark:group-hover:text-slate-300'
                    }`}
                  >
                    <span className="hidden sm:inline">{s.step}. {s.label}</span>
                    <span className="sm:hidden">{s.shortLabel}</span>
                  </span>
                  {isCurrent && (
                    <span className="inline-block mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#0071E3] dark:text-[#0A84FF] bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 px-1.5 py-0.2 rounded-md">
                      Etapa Atual
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
