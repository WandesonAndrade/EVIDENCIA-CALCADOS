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
      <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
          <span>Este pedido está marcado como <strong>Cancelado</strong>.</span>
        </div>
        <button
          type="button"
          onClick={() => onStatusChange('Pendente')}
          className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 font-semibold text-[11px] transition-colors cursor-pointer"
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
        { step: 2, status: 'Confirmado', label: 'Pagamento OK', shortLabel: 'Pago', icon: ShieldCheck },
        { step: 3, status: 'Em Preparação', label: 'Pronto p/ Retirada', shortLabel: 'No Balcão', icon: Store },
        { step: 4, status: 'Entregue', label: 'Retirado na Loja', shortLabel: 'Retirado', icon: ShoppingBag },
      ]
    : [
        { step: 1, status: 'Pendente', label: 'Pedido Recebido', shortLabel: 'Recebido', icon: Box },
        { step: 2, status: 'Confirmado', label: 'Pagamento OK', shortLabel: 'Pago', icon: ShieldCheck },
        { step: 3, status: 'Em Preparação', label: 'Em Preparação', shortLabel: 'Preparando', icon: Truck },
        { step: 4, status: 'Entregue', label: 'Entregue', shortLabel: 'Entregue', icon: PackageCheck },
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
    <div className="p-3 sm:p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.06]">
      <div className="relative flex items-center justify-between">
        {/* Linha de Conexão de Fundo */}
        <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-black/[0.06] dark:bg-white/[0.08] z-0" />

        {/* Linha de Progresso Ativa no Azul Apple */}
        <div
          className="absolute left-6 top-1/2 -translate-y-1/2 h-0.5 bg-[#0071E3] dark:bg-[#0A84FF] transition-all duration-300 z-0"
          style={{ width: `calc(${progressPct}% - ${currentStepNum === 4 ? 0 : 8}px)` }}
        />

        {steps.map((s) => {
          const isCompleted = currentStepNum >= s.step;
          const isCurrent = currentStepNum === s.step;
          const StepIcon = s.icon;

          return (
            <button
              key={s.step}
              type="button"
              onClick={() => onStatusChange(s.status)}
              title={`Clique para alterar para "${s.label}"`}
              className="relative z-10 flex flex-col items-center group cursor-pointer focus:outline-none transition-transform active:scale-95"
            >
              {/* Círculo do Nó */}
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200 shadow-xs ${
                  isCurrent
                    ? 'bg-[#0071E3] dark:bg-[#0A84FF] text-white ring-4 ring-[#0071E3]/20 dark:ring-[#0A84FF]/25 scale-105'
                    : isCompleted
                    ? 'bg-[#34C759] text-white'
                    : 'bg-white dark:bg-[#1D1D1F] text-slate-400 dark:text-slate-500 border border-black/[0.08] dark:border-white/[0.1] group-hover:border-[#0071E3]/50 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                }`}
              >
                {isCompleted && !isCurrent ? (
                  <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                ) : (
                  <StepIcon className="h-3.5 w-3.5 stroke-[2]" />
                )}
              </div>

              {/* Rótulo da Etapa */}
              <span
                className={`text-[10px] sm:text-[11px] mt-1 font-medium tracking-tight transition-colors text-center ${
                  isCurrent
                    ? 'text-[#0071E3] dark:text-[#0A84FF] font-semibold'
                    : isCompleted
                    ? 'text-slate-800 dark:text-slate-200'
                    : 'text-slate-400 dark:text-[#86868B] group-hover:text-slate-600 dark:group-hover:text-slate-300'
                }`}
              >
                <span className="hidden sm:inline">{s.step}. {s.label}</span>
                <span className="sm:hidden">{s.shortLabel}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
