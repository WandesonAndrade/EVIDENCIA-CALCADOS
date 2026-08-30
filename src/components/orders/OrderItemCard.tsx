import React from 'react';
import { ExternalLink } from 'lucide-react';
import { OrderItem } from '../../types';
import { formatCurrency } from '../../utils/orderUtils';

interface Props {
  item: OrderItem;
  isDark: boolean;
  variant?: 'client' | 'admin';
  onClick?: (item: OrderItem) => void;
}

export const OrderItemCard: React.FC<Props> = ({ item, isDark: _isDark, variant = 'client', onClick }) => {
  const itemSubtotal = (item.price || 0) * (item.quantity || 1);
  const isClient = variant === 'client';

  if (isClient) {
    return (
      <div
        onClick={() => onClick?.(item)}
        className={`p-3 rounded-2xl border flex items-center justify-between gap-3.5 transition-all duration-200 ${
          onClick ? 'cursor-pointer group hover:bg-black/[0.02] dark:hover:bg-white/[0.03]' : ''
        } bg-black/[0.01] dark:bg-white/[0.02] border-black/[0.04] dark:border-white/[0.06]`}
        title={onClick ? `Ver detalhes de ${item.name}` : item.name}
      >
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-13 h-13 rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.04] p-1.5 shrink-0 flex items-center justify-center overflow-hidden">
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          <div className="min-w-0 space-y-1">
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-[#0071E3] dark:group-hover:text-[#0A84FF] transition-colors">
              {item.name}
            </h4>
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 dark:text-[#86868B]">
              <span className="px-2 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 font-medium">
                {item.selectedSize !== 0 ? `Tam: ${item.selectedSize}` : 'Acessório'}
              </span>
              <span>Qtd: <strong className="font-semibold text-slate-900 dark:text-slate-200">{item.quantity || 1}</strong></span>
              <span>• R$ {formatCurrency(item.price)} un</span>
            </div>
          </div>
        </div>

        <div className="text-right shrink-0 flex items-center space-x-2.5">
          <div>
            <span className="text-[9px] font-medium uppercase tracking-wider text-[#86868B] block">Subtotal</span>
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 font-mono">
              R$ {formatCurrency(itemSubtotal)}
            </span>
          </div>
          {onClick && (
            <div className="p-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-slate-400 group-hover:text-[#0071E3] dark:group-hover:text-[#0A84FF] transition-colors hidden sm:flex items-center justify-center">
              <ExternalLink className="h-3 w-3" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Admin variant (Apple Store Bag Tile)
  return (
    <div className="p-2.5 rounded-xl border flex items-center justify-between gap-3 bg-black/[0.015] dark:bg-white/[0.02] border-black/[0.04] dark:border-white/[0.06] hover:border-black/[0.08] dark:hover:border-white/[0.1] transition-colors">
      <div className="flex items-center space-x-2.5 min-w-0">
        <div className="w-11 h-11 rounded-lg border border-black/[0.05] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.04] p-1 shrink-0 flex items-center justify-center overflow-hidden">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-contain"
          />
        </div>
        <div className="min-w-0 space-y-0.5">
          <span className="font-medium text-xs text-slate-900 dark:text-slate-100 block truncate">
            {item.name}
          </span>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-[#86868B]">
            <span className="px-1.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 font-medium">
              {item.selectedSize !== 0 ? `Tam ${item.selectedSize}` : 'Acessório'}
            </span>
            <span>Qtd: <strong className="font-semibold text-slate-800 dark:text-slate-200">{item.quantity || 1}</strong></span>
            <span>• R$ {formatCurrency(item.price)}</span>
          </div>
        </div>
      </div>

      <div className="text-right shrink-0">
        <span className="text-[9px] uppercase font-medium text-[#86868B] block">Subtotal</span>
        <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs font-mono">
          R$ {formatCurrency(itemSubtotal)}
        </span>
      </div>
    </div>
  );
};
