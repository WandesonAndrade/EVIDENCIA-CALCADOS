import React, { useState, useRef, useEffect } from 'react';
import { Clock, ShieldCheck, Truck, PackageCheck, AlertCircle, ChevronDown, Check, Store, ShoppingBag, Package } from 'lucide-react';
import { OrderStatus } from '../../types';

interface Props {
  currentStatus: OrderStatus;
  isDark: boolean;
  isStorePickup?: boolean;
  onStatusChange: (status: OrderStatus) => void;
}

interface StageOption {
  status: OrderStatus;
  stepNum: number;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  dotColor: string;
  badgeStyle: string;
}

export const AdminStageSelector: React.FC<Props> = ({
  currentStatus,
  isDark: _isDark,
  isStorePickup = false,
  onStatusChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const stages: StageOption[] = isStorePickup
    ? [
        {
          status: 'Pendente',
          stepNum: 1,
          label: 'Pedido Recebido',
          subtitle: 'Aguardando validação ou pagamento',
          icon: Clock,
          dotColor: 'bg-[#FF9500]',
          badgeStyle: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
        },
        {
          status: 'Confirmado',
          stepNum: 2,
          label: 'Pagamento Aprovado',
          subtitle: 'Pagamento validado, pronto para separação',
          icon: ShieldCheck,
          dotColor: 'bg-[#34C759]',
          badgeStyle: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        },
        {
          status: 'Em Preparação',
          stepNum: 3,
          label: 'Em Separação',
          subtitle: 'Separando calçados no estoque da loja',
          icon: Package,
          dotColor: 'bg-[#AF52DE]',
          badgeStyle: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20',
        },
        {
          status: 'Em Trânsito',
          stepNum: 4,
          label: 'Pronto p/ Retirada',
          subtitle: 'Calçados disponíveis no balcão da loja',
          icon: Store,
          dotColor: 'bg-[#0071E3]',
          badgeStyle: 'text-[#0071E3] dark:text-[#0A84FF] bg-[#0071E3]/10 border-[#0071E3]/20',
        },
        {
          status: 'Entregue',
          stepNum: 5,
          label: 'Retirado na Loja',
          subtitle: 'Calçados retirados com sucesso pelo cliente',
          icon: ShoppingBag,
          dotColor: 'bg-[#34C759]',
          badgeStyle: 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border-emerald-500/25',
        },
      ]
    : [
        {
          status: 'Pendente',
          stepNum: 1,
          label: 'Pedido Recebido',
          subtitle: 'Aguardando validação ou pagamento',
          icon: Clock,
          dotColor: 'bg-[#FF9500]',
          badgeStyle: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
        },
        {
          status: 'Confirmado',
          stepNum: 2,
          label: 'Pagamento Aprovado',
          subtitle: 'Pagamento validado, pronto para separação',
          icon: ShieldCheck,
          dotColor: 'bg-[#34C759]',
          badgeStyle: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        },
        {
          status: 'Em Preparação',
          stepNum: 3,
          label: 'Em Preparação',
          subtitle: 'Separando calçados e embalando p/ envio',
          icon: Package,
          dotColor: 'bg-[#AF52DE]',
          badgeStyle: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20',
        },
        {
          status: 'Em Trânsito',
          stepNum: 4,
          label: 'Em Trânsito',
          subtitle: 'Objeto postado e em rota de entrega',
          icon: Truck,
          dotColor: 'bg-[#0071E3]',
          badgeStyle: 'text-[#0071E3] dark:text-[#0A84FF] bg-[#0071E3]/10 border-[#0071E3]/20',
        },
        {
          status: 'Entregue',
          stepNum: 5,
          label: 'Entregue ao Cliente',
          subtitle: 'Concluído e entregue com sucesso ao cliente',
          icon: PackageCheck,
          dotColor: 'bg-[#34C759]',
          badgeStyle: 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border-emerald-500/25',
        },
      ];

  const currentStage = stages.find((s) => s.status === currentStatus) || {
    status: currentStatus,
    stepNum: 0,
    label: currentStatus || 'Pendente',
    subtitle: 'Status personalizado',
    icon: currentStatus === 'Cancelado' ? AlertCircle : Clock,
    dotColor: currentStatus === 'Cancelado' ? 'bg-[#FF3B30]' : 'bg-slate-400',
    badgeStyle:
      currentStatus === 'Cancelado'
        ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20'
        : 'text-slate-600 dark:text-slate-300 bg-black/[0.04] dark:bg-white/[0.06] border-black/[0.06]',
  };

  const CurrentIcon = currentStage.icon;

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (status: OrderStatus) => {
    onStatusChange(status);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      {/* Botão Trigger no Padrão Apple HIG Pill */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-200 cursor-pointer shadow-xs active:scale-[0.98] ${
          isOpen ? 'ring-2 ring-[#0071E3]/30' : ''
        } ${currentStage.badgeStyle}`}
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${currentStage.dotColor} ${currentStatus === 'Em Preparação' ? 'animate-pulse' : ''}`} />
        <CurrentIcon className="h-3.5 w-3.5 shrink-0 stroke-[2]" />
        <span className="font-semibold tracking-tight">
          {currentStage.stepNum > 0 ? `${currentStage.stepNum}. ${currentStage.label}` : currentStage.label}
        </span>
        <ChevronDown
          className={`h-3 w-3 opacity-70 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Popover Menu Flutuante (macOS Control Center / Apple Style) */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl p-1.5 z-50 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.1] shadow-2xl space-y-1 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 border-b border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#86868B]">
              {isStorePickup ? 'Etapa (Retirada na Loja)' : 'Etapa do Pedido'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">1 a 4</span>
          </div>

          {/* 4 Etapas Principais */}
          <div className="space-y-0.5">
            {stages.map((stage) => {
              const isSelected = currentStatus === stage.status;
              const Icon = stage.icon;

              return (
                <button
                  key={stage.status}
                  type="button"
                  onClick={() => handleSelect(stage.status)}
                  className={`w-full text-left px-3 py-2 rounded-xl transition-all duration-150 flex items-center justify-between group cursor-pointer ${
                    isSelected
                      ? 'bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF]'
                      : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-[#0071E3] text-white shadow-xs'
                          : 'bg-black/[0.03] dark:bg-white/[0.05] text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 stroke-[2]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-semibold tracking-tight truncate">
                          {stage.stepNum}. {stage.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#86868B] truncate font-normal leading-tight">
                        {stage.subtitle}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="h-4 w-4 text-[#0071E3] dark:text-[#0A84FF] shrink-0 ml-2 stroke-[2.5]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Divisor e Opção de Cancelamento */}
          <div className="pt-1 border-t border-black/[0.04] dark:border-white/[0.06]">
            <button
              type="button"
              onClick={() => handleSelect('Cancelado')}
              className={`w-full text-left px-3 py-2 rounded-xl transition-all duration-150 flex items-center justify-between group cursor-pointer ${
                currentStatus === 'Cancelado'
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  : 'hover:bg-rose-500/10 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
              }`}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    currentStatus === 'Cancelado'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'bg-black/[0.03] dark:bg-white/[0.05] text-rose-500 group-hover:bg-rose-500 group-hover:text-white'
                  }`}
                >
                  <AlertCircle className="h-3.5 w-3.5 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold tracking-tight block text-rose-600 dark:text-rose-400">
                    Cancelar Pedido
                  </span>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-normal leading-tight">
                    Interromper fluxo e marcar como cancelado
                  </p>
                </div>
              </div>

              {currentStatus === 'Cancelado' && (
                <Check className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 ml-2 stroke-[2.5]" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
