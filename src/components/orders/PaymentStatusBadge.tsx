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
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <span
      className={`inline-flex items-center ${textSize} font-bold uppercase px-2 py-0.5 rounded-full border ${style}`}
    >
      Pagamento: {status || 'Pendente'}
    </span>
  );
};
