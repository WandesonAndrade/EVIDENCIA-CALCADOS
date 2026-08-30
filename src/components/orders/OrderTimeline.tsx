import React from 'react';
import { Box, ShieldCheck, Truck, PackageCheck, Check, Store, ShoppingBag } from 'lucide-react';

interface Props {
  currentStep: number;
  isDark: boolean;
  deliveryType?: string;
}

export const OrderTimeline: React.FC<Props> = ({ currentStep, isDark, deliveryType }) => {
  const isStorePickup = deliveryType === 'Retirada na Loja';

  const steps = isStorePickup
    ? [
        { step: 1, label: 'Pedido Recebido', icon: Box },
        { step: 2, label: 'Pagamento OK', icon: ShieldCheck },
        { step: 3, label: 'Pronto p/ Retirada', icon: Store },
        { step: 4, label: 'Retirado', icon: ShoppingBag },
      ]
    : [
        { step: 1, label: 'Pedido Recebido', icon: Box },
        { step: 2, label: 'Pagamento OK', icon: ShieldCheck },
        { step: 3, label: 'Em Preparação', icon: Truck },
        { step: 4, label: 'Entregue', icon: PackageCheck },
      ];

  const progressPct = ((Math.max(1, currentStep) - 1) / 3) * 100;
  const rightOffset = currentStep === 4 ? '0px' : '8px';

  return (
    <div className={`px-4 sm:px-8 py-5 border-b border-black/[0.04] dark:border-white/[0.06] ${
      isDark ? 'bg-black/[0.02]' : 'bg-black/[0.01]'
    }`}>
      <div className="max-w-3xl mx-auto flex items-center justify-between relative py-2">
        {/* Linha Conectora de Fundo */}
        <div className="absolute left-4 right-4 sm:left-6 sm:right-6 top-5 sm:top-4.5 -translate-y-1/2 h-0.5 bg-black/[0.06] dark:bg-white/[0.08] z-0" />

        {/* Linha de Progresso Ativa (Apple Blue) */}
        <div
          className={`absolute left-4 sm:left-6 top-5 sm:top-4.5 -translate-y-1/2 h-0.5 transition-all duration-500 z-0 ${
            isStorePickup ? 'bg-[#0071E3] dark:bg-[#0A84FF]' : 'bg-[#0071E3] dark:bg-[#0A84FF]'
          }`}
          style={{ width: `calc(${progressPct}% - ${rightOffset})` }}
        />

        {steps.map(({ step, label, icon: StepIcon }) => {
          const isCompleted = currentStep >= step;
          const isCurrent = currentStep === step;

          return (
            <div key={step} className="relative z-10 flex flex-col items-center group">
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                  isCompleted
                    ? 'bg-[#0071E3] dark:bg-[#0A84FF] text-white shadow-sm ring-4 ring-[#0071E3]/15 dark:ring-[#0A84FF]/20'
                    : 'bg-white dark:bg-[#1C1C1E] text-slate-400 dark:text-slate-500 border border-black/[0.08] dark:border-white/[0.1]'
                } ${isCurrent ? 'scale-110 ring-4 ring-amber-500/20' : ''}`}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[2.5]" />
                ) : (
                  <StepIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[1.75]" />
                )}
              </div>
              <span
                className={`text-[10px] sm:text-[11px] font-medium mt-2 text-center transition-colors tracking-tight ${
                  isCompleted
                    ? 'text-slate-900 dark:text-white font-semibold'
                    : 'text-slate-400 dark:text-[#86868B]'
                } ${isCurrent ? 'text-[#0071E3] dark:text-[#0A84FF]' : ''}`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
