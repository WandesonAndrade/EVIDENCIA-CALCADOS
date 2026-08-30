import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { OrderItem } from '../../types';
import { OrderItemCard } from './OrderItemCard';

interface Props {
  items: OrderItem[];
  isDark: boolean;
  variant?: 'client' | 'admin';
  onItemClick?: (item: OrderItem) => void;
}

export const OrderItemsGrid: React.FC<Props> = ({ items, isDark, variant = 'client', onItemClick }) => {
  const totalCount = (items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);

  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium tracking-tight text-[#86868B] flex items-center space-x-1.5 uppercase">
          <ShoppingBag className="h-3.5 w-3.5 text-slate-500 dark:text-[#86868B]" />
          <span>Itens do Pedido ({totalCount} {totalCount === 1 ? 'item' : 'itens'})</span>
        </span>
      </div>

      <div className={variant === 'admin' ? 'grid grid-cols-1 sm:grid-cols-2 gap-2.5' : 'space-y-2.5'}>
        {(items || []).map((item, idx) => (
          <OrderItemCard
            key={idx}
            item={item}
            isDark={isDark}
            variant={variant}
            onClick={onItemClick}
          />
        ))}
      </div>
    </div>
  );
};
