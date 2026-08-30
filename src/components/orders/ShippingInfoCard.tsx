import React from 'react';
import { Truck, MapPin } from 'lucide-react';
import { Order } from '../../types';

interface Props {
  order: Order;
  isDark: boolean;
  variant?: 'client' | 'admin';
}

export const ShippingInfoCard: React.FC<Props> = ({ order, isDark: _isDark, variant = 'client' }) => {
  const isOtherCities = order.deliveryType === 'Entrega para Outras Cidades';

  if (variant === 'admin') {
    return (
      <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.06] space-y-3">
        {/* Header Apple Maps */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-blue-500/10 text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center shrink-0">
            <Truck className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#86868B] block">
              Modalidade
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
              isOtherCities
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                : 'bg-black/[0.04] dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border-black/[0.05] dark:border-white/[0.08]'
            }`}>
              {order.deliveryType || 'Entrega em Caxias-MA'}
            </span>
          </div>
        </div>

        {/* Endereço */}
        <div className="space-y-1">
          <span className="text-[10px] font-medium text-[#86868B] block">
            Endereço de Destino:
          </span>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
            {order.deliveryAddress || 'Endereço não informado'}
          </p>
        </div>
      </div>
    );
  }

  // Client variant
  return (
    <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.06] space-y-2.5">
      <span className="text-[10px] font-medium uppercase tracking-wider text-[#86868B] flex items-center space-x-1.5">
        <MapPin className="h-3.5 w-3.5 text-[#0071E3] dark:text-[#0A84FF]" />
        <span>Endereço de Entrega</span>
      </span>
      <p className="font-semibold text-sm text-slate-900 dark:text-white">
        {order.deliveryType || 'Entrega em Caxias-MA'}
      </p>
      <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-xs font-normal">
        {order.deliveryAddress || 'Endereço cadastrado na sua conta'}
      </p>
      <div className="pt-2 border-t border-black/[0.04] dark:border-white/[0.06] text-[11px] text-slate-500 dark:text-[#86868B] flex justify-between items-center">
        <span>Destinatário: <strong className="font-medium text-slate-900 dark:text-slate-200">{order.customerName}</strong></span>
      </div>
    </div>
  );
};
