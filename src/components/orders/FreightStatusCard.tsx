import React from 'react';
import { Save } from 'lucide-react';
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
  order, isDark, variant = 'client',
  editingFreight, onEditingChange, onSaveFreight,
}) => {
  const isOtherCities = order.deliveryType === 'Entrega para Outras Cidades';
  const isPendingFreight = isOtherCities && (!order.freightCost || order.freightCost === 0);

  if (variant === 'admin') {
    return (
      <div className={`p-3.5 rounded-2xl border space-y-3 ${
        isOtherCities && isPendingFreight
          ? 'bg-amber-400/10 border-amber-400/30'
          : isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center justify-between border-b pb-1.5 border-slate-800/40">
          <span className="text-[10px] uppercase font-black text-amber-400">
            {isOtherCities ? 'Gestão do Valor do Frete' : 'Regra de Envio Aplicada'}
          </span>
          {isOtherCities ? (
            isPendingFreight ? (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-400/20 text-amber-400 border border-amber-400/30 animate-pulse">A Combinar</span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Definido</span>
            )
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-sky-500/20 text-sky-400 border border-sky-500/30">Automático</span>
          )}
        </div>

        {isOtherCities ? (
          <div className="space-y-1.5">
            <p className="text-[10px] text-slate-400 font-medium">Insira o valor negociado via WhatsApp:</p>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">R$</span>
                <input
                  type="number" step="0.01"
                  value={editingFreight !== undefined ? editingFreight : (order.freightCost || 0)}
                  onChange={(e) => onEditingChange?.(e.target.value)}
                  placeholder="0,00"
                  className={`w-full pl-8 pr-2 py-1.5 rounded-xl text-xs font-bold border focus:outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <button
                type="button" onClick={onSaveFreight}
                className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all shadow-sm cursor-pointer flex items-center space-x-1 shrink-0"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Salvar</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="py-1">
            {order.deliveryType === 'Retirada na Loja' ? (
              <p className="text-[11px] font-bold text-sky-400">🏥 Retirada na Loja (Frete Grátis)</p>
            ) : (
              <p className="text-[11px] font-bold text-emerald-400">
                {((order.subtotal || order.total) > 100 || order.freightCost === 0)
                  ? '✓ Frete Grátis Caxias - MA (Compras > R$ 100)'
                  : '🚚 Taxa Fixo Caxias - MA: R$ 10,00'}
              </p>
            )}
          </div>
        )}

        <div className="pt-2 border-t border-slate-800/50 space-y-1 text-[11px]">
          <div className="flex justify-between text-slate-400">
            <span>Subtotal Produtos:</span>
            <span className="font-bold text-slate-300">R$ {formatCurrency(order.subtotal ?? ((order.total || 0) - (order.freightCost || 0)))}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Taxa de Frete:</span>
            <span className="font-bold text-slate-300">
              {isOtherCities
                ? (order.freightCost && order.freightCost > 0 ? `R$ ${formatCurrency(order.freightCost)}` : 'A Combinar')
                : (order.freightCost === 0 || order.deliveryType === 'Retirada na Loja' || (order.subtotal || 0) > 100 ? 'GRÁTIS' : `R$ ${formatCurrency(order.freightCost || 10)}`)}
            </span>
          </div>
          <div className="flex justify-between font-black text-amber-400 pt-1 border-t border-slate-800/40 text-xs">
            <span>Total Geral:</span>
            <span>R$ {formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>
    );
  }

  // Client variant
  return (
    <div className={`p-4 rounded-2xl border space-y-2 ${
      isPendingFreight
        ? 'bg-amber-50 border-amber-200'
        : isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-[#EEF8FF]/60 border-blue-900/10'
    }`}>
      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#006EDB] flex items-center space-x-1.5">
        <span>Status do Frete</span>
      </span>
      {isOtherCities ? (
        isPendingFreight ? (
          <div className="space-y-1">
            <p className="font-bold text-amber-900">Frete sob consulta / A combinar</p>
            <p className="text-[11px] text-amber-800 leading-snug">Aguardando definição de valor pela equipe de atendimento da loja via WhatsApp.</p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="font-bold text-emerald-800">Frete Definido: R$ {formatCurrency(order.freightCost)}</p>
            <p className="text-[11px] text-[#52708F] leading-snug">Valor de envio alinhado e acrescido ao pedido.</p>
          </div>
        )
      ) : order.deliveryType === 'Retirada na Loja' ? (
        <div>
          <p className="font-bold text-[#006EDB]">Sem taxa de frete (Grátis)</p>
          <p className="text-[11px] text-[#52708F]">Retirada na loja física do Centro em Caxias-MA.</p>
        </div>
      ) : (
        <div>
          <p className="font-bold text-emerald-700">
            {order.freightCost === 0 ? 'Frete GRÁTIS' : 'R$ 10,00'}
          </p>
          <p className="text-[11px] text-[#52708F]">Entrega rápida na zona urbana de Caxias - MA.</p>
        </div>
      )}
    </div>
  );
};
