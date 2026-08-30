import React from 'react';
import { Box, ShieldCheck, Truck, PackageCheck, Check, Store, ShoppingBag } from 'lucide-react';

interface Props {
  currentStep: number;
  isDark: boolean;
  deliveryType?: string;
}

export const OrderTimeline: React.FC<Props> = ({ currentStep, isDark: _isDark, deliveryType }) => {
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

  return (
    <div className="py-4 px-4 sm:px-8 border-b border-black/[0.04] dark:border-white/[0.06] bg-black/[0.015] dark:bg-white/[0.015] select-none">
      <div className="max-w-3xl mx-auto relative">
        {/* Linha Conectora de Fundo - alinhada no centro do círculo de 32px (top-4 = 16px) */}
        <div className="absolute left-5 right-5 sm:left-6 sm:right-6 top-4 -translate-y-1/2 h-[3px] bg-slate-200/80 dark:bg-white/[0.08] rounded-full z-0" />

        {/* Linha de Progresso Ativa (Apple Blue) */}
        <div
          className="absolute left-5 sm:left-6 top-4 -translate-y-1/2 h-[3px] bg-[#0071E3] dark:bg-[#0A84FF] rounded-full transition-all duration-500 ease-out z-0"
          style={{ width: `calc(${progressPct}% - ${currentStep === 4 ? 0 : 12}px)` }}
        />

        <div className="flex items-start justify-between relative z-10">
          {steps.map(({ step, label, shortLabel, icon: StepIcon }) => {
            const isCompleted = currentStep > step;
            const isCurrent = currentStep === step;

            return (
              <div key={step} className="flex flex-col items-center group">
                {/* Círculo do Nó */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 shadow-sm ${
                    isCurrent
                      ? 'bg-[#0071E3] dark:bg-[#0A84FF] text-white ring-4 ring-[#0071E3]/20 dark:ring-[#0A84FF]/30 scale-110 shadow-md'
                      : isCompleted
                      ? 'bg-[#0071E3] dark:bg-[#0A84FF] text-white'
                      : 'bg-white dark:bg-[#2C2C2E] text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-white/10'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4 stroke-[3]" />
                  ) : (
                    <StepIcon className="h-4 w-4 stroke-[2]" />
                  )}
                </div>

                {/* Rótulo da Etapa */}
                <div className="mt-2 text-center max-w-[85px] sm:max-w-none">
                  <span
                    className={`text-[11px] sm:text-xs font-medium tracking-tight block transition-colors leading-tight ${
                      isCurrent
                        ? 'text-[#0071E3] dark:text-[#0A84FF] font-bold'
                        : isCompleted
                        ? 'text-slate-800 dark:text-slate-200 font-semibold'
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
    </div>
  );
};
