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
    <div className="p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-extrabold uppercase tracking-wider flex items-center space-x-1.5 ${
          variant === 'admin' ? 'text-amber-400' : 'text-[#003B73]'
        }`}>
          <ShoppingBag className={`h-4 w-4 ${variant === 'admin' ? 'text-amber-400' : 'text-[#006EDB]'}`} />
          <span>
            {variant === 'admin' ? 'Produtos do Pedido' : 'Itens do Pedido'} ({totalCount} item{totalCount !== 1 ? 's' : ''})
          </span>
        </span>
      </div>

      <div className={variant === 'admin' ? 'grid grid-cols-1 sm:grid-cols-2 gap-2.5' : 'space-y-3'}>
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
