import React from 'react';
import { Save, Calculator } from 'lucide-react';
import { Order } from '../../types';
import { formatCurrency } from '../../utils/orderUtils';

interface Props {
  order: Order;
  isDark: boolean;
  variant?: 'client' | 'admin';
  // admin only
  editingFreight?: string;
  onEditingChange?: (val: string) => void;
  onSaveFreight?: () => void;
}

export const FreightStatusCard: React.FC<Props> = ({
  order, isDark: _isDark, variant = 'client',
  editingFreight, onEditingChange, onSaveFreight,
}) => {
  const isStorePickup = order.deliveryType === 'Retirada na Loja';
  const isOtherCities = order.deliveryType === 'Entrega para Outras Cidades';
  const isPendingFreight = isOtherCities && (!order.freightCost || order.freightCost === 0);

  if (variant === 'admin') {
    return (
      <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.06] space-y-3">
        {/* Header Apple Financial */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-slate-500/10 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
              <Calculator className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#86868B] block">
                {isStorePickup ? 'Custo de Envio' : isOtherCities ? 'Frete Negociado' : 'Taxa de Envio'}
              </span>
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                {isStorePickup ? 'Retirada Loja' : isOtherCities ? 'Outras Cidades' : 'Entrega Local'}
              </span>
            </div>
          </div>

          <div>
            {isStorePickup ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                🏬 Isento
              </span>
            ) : isOtherCities ? (
              isPendingFreight ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  A Combinar
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Definido
                </span>
              )
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/[0.04] dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-black/[0.05] dark:border-white/[0.08]">
                Automático
              </span>
            )}
          </div>
        </div>

        {/* Input para Outras Cidades */}
        {isOtherCities && (
          <div className="space-y-1.5 pt-1">
            <label className="text-[10px] text-[#86868B] font-medium block">
              Valor ajustado via WhatsApp:
            </label>
            <div className="flex items-center space-x-1.5">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1.5 text-xs font-medium text-slate-400">R$</span>
                <input
                  type="number"
                  step="0.01"
                  value={editingFreight !== undefined ? editingFreight : (order.freightCost || 0)}
                  onChange={(e) => onEditingChange?.(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-8 pr-2.5 py-1 rounded-xl text-xs font-medium bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/30 transition-all"
                />
              </div>
              <button
                type="button"
                onClick={onSaveFreight}
                className="px-3 py-1 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] active:scale-[0.98] text-white text-xs font-medium transition-all shadow-sm cursor-pointer flex items-center space-x-1 shrink-0"
              >
                <Save className="h-3 w-3" />
                <span>Salvar</span>
              </button>
            </div>
          </div>
        )}

        {/* Resumo Financeiro Apple Clean */}
        <div className="pt-2 border-t border-black/[0.04] dark:border-white/[0.06] space-y-1 text-[11px]">
          <div className="flex justify-between text-slate-500 dark:text-[#86868B]">
            <span>Produtos:</span>
            <span className="font-medium text-slate-700 dark:text-slate-300 font-mono">
              R$ {formatCurrency(order.subtotal ?? ((order.total || 0) - (order.freightCost || 0)))}
            </span>
          </div>
          <div className="flex justify-between text-slate-500 dark:text-[#86868B]">
            <span>Frete:</span>
            <span className="font-medium text-slate-700 dark:text-slate-300 font-mono">
              {isOtherCities
                ? (order.freightCost && order.freightCost > 0 ? `R$ ${formatCurrency(order.freightCost)}` : 'A Combinar')
                : (order.freightCost === 0 || order.deliveryType === 'Retirada na Loja' || (order.subtotal || 0) > 100 ? 'Grátis' : `R$ ${formatCurrency(order.freightCost || 10)}`)}
            </span>
          </div>
          <div className="flex justify-between font-semibold text-slate-900 dark:text-white pt-1.5 border-t border-black/[0.04] dark:border-white/[0.06] text-xs">
            <span>Total:</span>
            <span className="text-[#0071E3] dark:text-[#0A84FF] font-mono">
              R$ {formatCurrency(order.total)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Client variant
  return (
    <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.06] space-y-2.5">
      <span className="text-[10px] font-medium uppercase tracking-wider text-[#86868B] flex items-center space-x-1.5">
        <Calculator className="h-3.5 w-3.5 text-[#0071E3] dark:text-[#0A84FF]" />
        <span>Status do Frete</span>
      </span>
      {isOtherCities ? (
        isPendingFreight ? (
          <div className="space-y-1">
            <p className="font-semibold text-xs text-amber-600 dark:text-amber-400">
              Aguardando cotação via WhatsApp
            </p>
            <p className="text-[11px] text-slate-500 dark:text-[#86868B] leading-relaxed">
              O valor do envio para sua cidade está sendo consultado com a transportadora.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="font-semibold text-xs text-emerald-600 dark:text-emerald-400">
              Frete Definido: R$ {formatCurrency(order.freightCost)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-[#86868B] leading-relaxed">
              Valor calculado e adicionado ao pedido.
            </p>
          </div>
        )
      ) : order.deliveryType === 'Retirada na Loja' ? (
        <div>
          <p className="font-semibold text-xs text-[#0071E3] dark:text-[#0A84FF]">
            Retirada no Centro (Grátis)
          </p>
          <p className="text-[11px] text-slate-500 dark:text-[#86868B]">
            Disponível para retirada na loja física.
          </p>
        </div>
      ) : (
        <div>
          <p className="font-semibold text-xs text-emerald-600 dark:text-emerald-400">
            {order.freightCost === 0 ? 'Frete Grátis' : 'R$ 10,00'}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-[#86868B]">
            Entrega expressa na zona urbana de Caxias - MA.
          </p>
        </div>
      )}
    </div>
  );
};
