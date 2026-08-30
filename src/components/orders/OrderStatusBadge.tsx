import React from 'react';
import { OrderStatus } from '../../types';
import { getStatusBadge } from '../../utils/orderUtils';

interface Props {
  status: OrderStatus;
  isDark: boolean;
  size?: 'sm' | 'md';
}

export const OrderStatusBadge: React.FC<Props> = ({ status, isDark, size = 'md' }) => {
  const badge = getStatusBadge(status, isDark);
  const Icon = badge.icon;
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-[11px]';
  const padding = size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1';

  return (
    <span
      className={`inline-flex items-center space-x-1.5 ${padding} rounded-full font-extrabold uppercase border ${textSize} ${badge.style}`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{badge.label}</span>
    </span>
  );
};
