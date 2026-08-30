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

export const OrderItemCard: React.FC<Props> = ({ item, isDark, variant = 'client', onClick }) => {
  const itemSubtotal = (item.price || 0) * (item.quantity || 1);
  const isClient = variant === 'client';

  if (isClient) {
    return (
      <div
        onClick={() => onClick?.(item)}
        className={`p-3.5 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
          onClick ? 'cursor-pointer group' : ''
        } ${
          isDark
            ? 'bg-slate-950/60 border-slate-800 hover:border-[#006EDB]/50 hover:bg-slate-900'
            : 'bg-white border-blue-900/10 hover:border-[#006EDB] hover:bg-[#EEF8FF]/50 shadow-2xs'
        }`}
        title={onClick ? `Clique para ver detalhes de ${item.name}` : item.name}
      >
        <div className="flex items-center space-x-3.5 min-w-0">
          <img
            src={item.image}
            alt={item.name}
            className="w-14 h-14 object-contain p-1 rounded-xl border border-blue-900/10 bg-[#EEF8FF] shrink-0 group-hover:scale-105 transition-transform"
          />
          <div className="min-w-0 space-y-1">
            <h4 className={`text-xs font-extrabold truncate group-hover:text-[#006EDB] transition-colors ${
              isDark ? 'text-white' : 'text-[#00509E]'
            }`}>{item.name}</h4>
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#52708F]">
              <span className="px-2 py-0.5 rounded-md bg-[#DDF1FF] text-[#003B73] font-bold">
                {item.selectedSize !== 0 ? `Tam: ${item.selectedSize}` : 'Acessório'}
              </span>
              <span>Qtd: <strong className="text-[#003B73]">{item.quantity || 1}</strong></span>
              <span>• Unitário: <strong className="text-[#003B73]">R$ {formatCurrency(item.price)}</strong></span>
            </div>
          </div>
        </div>
        <div className="text-right shrink-0 flex items-center space-x-3">
          <div>
            <span className="text-[10px] font-bold uppercase text-[#52708F] block">Subtotal</span>
            <span className="text-xs font-black text-[#003B73]">R$ {formatCurrency(itemSubtotal)}</span>
          </div>
          {onClick && (
            <div className="p-2 rounded-xl bg-[#DDF1FF] text-[#003B73] group-hover:bg-[#006EDB] group-hover:text-white transition-all hidden sm:block">
              <ExternalLink className="h-3.5 w-3.5" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Admin variant
  return (
    <div
      className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
      }`}
    >
      <div className="flex items-center space-x-3 min-w-0">
        <img
          src={item.image}
          alt={item.name}
          className="w-12 h-12 object-contain p-1 rounded-lg border border-slate-700/50 bg-slate-800/40 shrink-0"
        />
        <div className="min-w-0 space-y-0.5">
          <span className="font-bold text-xs text-slate-100 block truncate">{item.name}</span>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="px-1.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20 font-black text-[10px]">
              {item.selectedSize !== 0 ? `Tam: ${item.selectedSize}` : 'Acessório'}
            </span>
            <span>Qtd: <strong className="text-white">{item.quantity || 1}</strong></span>
            <span>• Un: <strong>R$ {formatCurrency(item.price)}</strong></span>
          </div>
        </div>
      </div>
      <div className="text-right shrink-0">
        <span className="text-[9px] uppercase font-bold text-slate-400 block">Subtotal</span>
        <span className="font-black text-amber-400 text-xs">R$ {formatCurrency(itemSubtotal)}</span>
      </div>
    </div>
  );
};
