import React from 'react';
import { ExternalLink, Layers } from 'lucide-react';
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
  const hasComponents = Boolean(item.isKit && item.kitComponents && item.kitComponents.length > 0);

  if (isClient) {
    return (
      <div
        onClick={() => onClick?.(item)}
        className={`p-3.5 rounded-2xl border flex flex-col gap-2.5 transition-all duration-200 ${
          onClick ? 'cursor-pointer group hover:bg-black/[0.02] dark:hover:bg-white/[0.03]' : ''
        } bg-black/[0.01] dark:bg-white/[0.02] border-black/[0.04] dark:border-white/[0.06]`}
        title={onClick ? `Ver detalhes de ${item.name}` : item.name}
      >
        <div className="flex items-center justify-between gap-3.5">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-13 h-13 rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.04] p-1.5 shrink-0 flex items-center justify-center overflow-hidden">
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-1.5">
                {item.isKit && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-blue-600 text-white shrink-0">
                    Kit
                  </span>
                )}
                <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-[#0071E3] dark:group-hover:text-[#0A84FF] transition-colors">
                  {item.name}
                </h4>
              </div>
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

        {/* Explosão de produtos componentes do Kit */}
        {hasComponents && (
          <div className="pt-2 border-t border-black/[0.04] dark:border-white/[0.06] pl-2 space-y-1">
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Layers className="w-2.5 h-2.5" />
              Produtos Inclusos:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
              {item.kitComponents?.map((comp, cIdx) => (
                <div key={cIdx} className="flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-slate-300 bg-white/60 dark:bg-black/20 px-2 py-1 rounded-lg border border-black/[0.03] dark:border-white/[0.04]">
                  <span className="text-blue-600 dark:text-blue-400 font-bold shrink-0">↳ {(comp.quantity || 1) * (item.quantity || 1)}x</span>
                  <span className="truncate">{comp.productName}</span>
                  {comp.selectedSize && (
                    <span className="px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-[9px] font-bold shrink-0">
                      Tam: {comp.selectedSize}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Admin variant (Apple Store Bag Tile)
  return (
    <div className="p-3 rounded-xl border flex flex-col gap-2 bg-black/[0.015] dark:bg-white/[0.02] border-black/[0.04] dark:border-white/[0.06] hover:border-black/[0.08] dark:hover:border-white/[0.1] transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-11 h-11 rounded-lg border border-black/[0.05] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.04] p-1 shrink-0 flex items-center justify-center overflow-hidden">
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-1.5">
              {item.isKit && (
                <span className="px-1.5 py-0.2 rounded text-[8.5px] font-black uppercase bg-blue-600 text-white shrink-0">
                  Kit
                </span>
              )}
              <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 block truncate">
                {item.name}
              </span>
            </div>
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

      {/* Explosão de produtos componentes do Kit no Painel Admin para separação e baixa ERP */}
      {hasComponents && (
        <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.06] space-y-1">
          <span className="text-[9px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1">
            <Layers className="w-2.5 h-2.5" />
            Separar da Loja / Baixa ERP:
          </span>
          <div className="space-y-1 pl-1">
            {item.kitComponents?.map((comp, cIdx) => (
              <div key={cIdx} className="flex items-center justify-between text-[10px] text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-black/30 px-2 py-1 rounded border border-black/[0.03] dark:border-white/[0.04]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-bold text-blue-600 shrink-0">↳ {(comp.quantity || 1) * (item.quantity || 1)}x</span>
                  <span className="truncate">{comp.productName}</span>
                </div>
                {comp.selectedSize && (
                  <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 font-bold shrink-0">
                    Tam: {comp.selectedSize}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
