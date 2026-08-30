import React from 'react';
import { OrderStatus } from '../../types';
import { getStatusBadge } from '../../utils/orderUtils';

interface Props {
  status: OrderStatus;
  isDark: boolean;
  size?: 'sm' | 'md';
  showDot?: boolean;
}

export const OrderStatusBadge: React.FC<Props> = ({ status, isDark, size = 'md', showDot = true }) => {
  const badge = getStatusBadge(status, isDark);
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-[11px]';
  const padding = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center space-x-1.5 ${padding} rounded-full font-medium tracking-tight border backdrop-blur-md transition-colors ${textSize} ${badge.style}`}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${badge.dotColor || 'bg-current'} ${status === 'Em Preparação' ? 'animate-pulse' : ''}`} />
      )}
      <span>{badge.label}</span>
    </span>
  );
};
