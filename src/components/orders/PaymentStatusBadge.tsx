import React from 'react';
import { PaymentStatus } from '../../types';
import { getPaymentStatusStyle } from '../../utils/orderUtils';

interface Props {
  status: PaymentStatus | undefined;
  variant?: 'client' | 'admin';
  size?: 'sm' | 'md';
}

export const PaymentStatusBadge: React.FC<Props> = ({ status, variant = 'client', size = 'sm' }) => {
  const style = getPaymentStatusStyle(status, variant);
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-[11px]';
  const padding = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1';

  const dotColor = status === 'Confirmado'
    ? 'bg-emerald-500'
    : status === 'Em Análise'
    ? 'bg-blue-500'
    : status === 'Recusado'
    ? 'bg-rose-500'
    : 'bg-amber-500';

  const statusLabel = status === 'Confirmado'
    ? 'Aprovado'
    : status === 'Em Análise'
    ? 'Em Análise'
    : status === 'Recusado'
    ? 'Recusado'
    : 'Pendente';

  return (
    <span
      className={`inline-flex items-center space-x-1.5 ${padding} rounded-full font-medium tracking-tight border backdrop-blur-md transition-colors ${textSize} ${style}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      <span>Pagamento: {statusLabel}</span>
    </span>
  );
};
