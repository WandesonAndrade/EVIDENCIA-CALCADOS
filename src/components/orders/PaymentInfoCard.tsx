import React from 'react';
import { CreditCard, Check } from 'lucide-react';
import { Order } from '../../types';
import { getPaymentStatusStyle } from '../../utils/orderUtils';

interface Props {
  order: Order;
  isDark: boolean;
  variant?: 'client' | 'admin';
  onConfirmPayment?: () => void;
}

export const PaymentInfoCard: React.FC<Props> = ({ order, isDark, variant = 'client', onConfirmPayment }) => {
  const payStyle = getPaymentStatusStyle(order.paymentStatus, variant);

  if (variant === 'admin') {
    return (
      <div>
        <span className="text-[10px] text-slate-400 uppercase font-bold block">Forma de Pagamento</span>
        <div className="mt-1 space-y-1">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-sm text-slate-200">{order.paymentMethod || 'Pix'}</span>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${payStyle}`}>
              {order.paymentStatus || 'Pendente'}
            </span>
          </div>
          {order.installments && order.installments > 1 && (
            <p className="text-sky-400 font-bold text-[11px]">Parcelado em {order.installments}x sem juros</p>
          )}
          {order.paymentMethod === 'Crediário da Loja' && (
            <p className="text-amber-400 font-bold text-[11px]">Carnê Crediário Evidência em até 6x</p>
          )}
          {order.paymentStatus !== 'Confirmado' && onConfirmPayment && (
            <button
              type="button" onClick={onConfirmPayment}
              className="mt-1.5 px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-1"
            >
              <Check className="h-3 w-3" />
              <span>Confirmar Pagamento</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-2xl border space-y-2 ${
      isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-[#EEF8FF]/60 border-blue-900/10'
    }`}>
      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#006EDB] flex items-center space-x-1.5">
        <CreditCard className="h-3.5 w-3.5" />
        <span>Forma &amp; Pagamento</span>
      </span>
      <div className="flex items-center justify-between">
        <p className="font-bold text-[#003B73] dark:text-white">{order.paymentMethod || 'Pix'}</p>
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${payStyle}`}>
          {order.paymentStatus || 'Pendente'}
        </span>
      </div>
      {order.installments && order.installments > 1 && (
        <p className="text-[#006EDB] font-bold text-[11px]">Parcelado em {order.installments}x sem juros no cartão</p>
      )}
      {order.paymentMethod === 'Crediário da Loja' && (
        <p className="text-[#003B73] font-bold text-[11px]">Carnê Crediário Evidência em até 6x</p>
      )}
    </div>
  );
};
