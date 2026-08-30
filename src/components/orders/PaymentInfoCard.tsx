import React from 'react';
import { CreditCard } from 'lucide-react';
import { Order } from '../../types';
import { PaymentStatusBadge } from './PaymentStatusBadge';

interface Props {
  order: Order;
  isDark: boolean;
  variant?: 'client' | 'admin';
}

export const PaymentInfoCard: React.FC<Props> = ({ order, isDark: _isDark, variant = 'client' }) => {
  if (variant === 'admin') {
    return (
      <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.06] space-y-3">
        {/* Header Apple Wallet */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-slate-500/10 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#86868B] block">
                Pagamento
              </span>
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                {order.paymentMethod || 'Pix'}
              </span>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex flex-wrap items-center gap-2">
          <PaymentStatusBadge status={order.paymentStatus} variant="admin" size="sm" />
        </div>

        {/* Detalhes de Parcelamento */}
        {order.installments && order.installments > 1 && (
          <p className="text-[11px] text-[#0071E3] dark:text-[#0A84FF] font-medium">
            Parcelado em {order.installments}x sem juros
          </p>
        )}
        {order.paymentMethod === 'Crediário da Loja' && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
            Carnê Crediário Evidência em até 6x
          </p>
        )}

      </div>
    );
  }

  // Client variant
  return (
    <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.06] space-y-2.5">
      <span className="text-[10px] font-medium uppercase tracking-wider text-[#86868B] flex items-center space-x-1.5">
        <CreditCard className="h-3.5 w-3.5 text-[#0071E3] dark:text-[#0A84FF]" />
        <span>Forma de Pagamento</span>
      </span>
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm text-slate-900 dark:text-white">
          {order.paymentMethod || 'Pix'}
        </p>
        <PaymentStatusBadge status={order.paymentStatus} variant="client" size="sm" />
      </div>
      {order.installments && order.installments > 1 && (
        <p className="text-[11px] text-[#0071E3] dark:text-[#0A84FF] font-medium">
          Parcelado em {order.installments}x sem juros no cartão
        </p>
      )}
      {order.paymentMethod === 'Crediário da Loja' && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
          Carnê Crediário Evidência em até 6x
        </p>
      )}
    </div>
  );
};
