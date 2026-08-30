import React from 'react';
import { Box, ShieldCheck, Truck, PackageCheck, Check } from 'lucide-react';

interface Props {
  currentStep: number;
  isDark: boolean;
}

const STEPS = [
  { step: 1, label: 'Pedido Recebido', icon: Box },
  { step: 2, label: 'Pagamento OK', icon: ShieldCheck },
  { step: 3, label: 'Em Preparação', icon: Truck },
  { step: 4, label: 'Entregue', icon: PackageCheck },
];

export const OrderTimeline: React.FC<Props> = ({ currentStep, isDark }) => {
  const progressPct = ((Math.max(1, currentStep) - 1) / 3) * 100;
  const rightOffset = currentStep === 4 ? '0px' : '10px';

  return (
    <div className={`px-4 sm:px-8 py-5 border-b border-blue-900/10 ${
      isDark ? 'bg-slate-950/40' : 'bg-[#F8FAFC]'
    }`}>
      <div className="max-w-3xl mx-auto flex items-center justify-between relative py-2">
        {/* Background connector */}
        <div className="absolute left-4 right-4 sm:left-6 sm:right-6 top-6 sm:top-5 -translate-y-1/2 h-1 bg-slate-200 dark:bg-slate-800 z-0" />
        {/* Active progress connector */}
        <div
          className="absolute left-4 sm:left-6 top-6 sm:top-5 -translate-y-1/2 h-1 bg-gradient-to-r from-[#003B73] to-[#006EDB] transition-all duration-500 z-0"
          style={{ width: `calc(${progressPct}% - ${rightOffset})` }}
        />

        {STEPS.map(({ step, label, icon: StepIcon }) => {
          const isCompleted = currentStep >= step;
          const isCurrent = currentStep === step;

          return (
            <div key={step} className="relative z-10 flex flex-col items-center group">
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-md ${
                  isCompleted
                    ? 'bg-[#003B73] text-white ring-4 ring-[#DDF1FF] dark:ring-blue-900/30'
                    : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-300 dark:border-slate-700'
                } ${isCurrent ? 'scale-110 ring-4 ring-amber-300 dark:ring-amber-400/40' : ''}`}
              >
                {isCompleted ? <Check className="h-4 w-4 sm:h-5 sm:w-5 stroke-[3]" /> : <StepIcon className="h-4 w-4 sm:h-5 sm:w-5" />}
              </div>
              <span
                className={`text-[10px] sm:text-xs font-extrabold mt-2 text-center transition-all ${
                  isCompleted
                    ? 'text-[#003B73] dark:text-blue-400 font-black'
                    : 'text-slate-400 dark:text-slate-500'
                } ${isCurrent ? 'text-amber-600 dark:text-amber-400' : ''}`}
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
