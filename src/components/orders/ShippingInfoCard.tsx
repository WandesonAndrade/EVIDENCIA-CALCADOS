import React from 'react';
import { Truck } from 'lucide-react';
import { Order } from '../../types';

interface Props {
  order: Order;
  isDark: boolean;
  variant?: 'client' | 'admin';
}

export const ShippingInfoCard: React.FC<Props> = ({ order, isDark, variant = 'client' }) => {
  if (variant === 'admin') {
    return (
      <div>
        <span className="text-[10px] text-slate-400 uppercase font-bold block">Modalidade de Envio</span>
        <div className="mt-1 space-y-1">
          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
            order.deliveryType === 'Entrega para Outras Cidades'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-slate-800 text-slate-300 border border-slate-700'
          }`}>
            {order.deliveryType || 'Entrega em Caxias-MA'}
          </span>
          <p className="text-slate-300 text-[11px] font-medium leading-snug">
            {order.deliveryAddress || 'Endereço não especificado'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-2xl border space-y-2 ${
      isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-[#EEF8FF]/60 border-blue-900/10'
    }`}>
      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#006EDB] flex items-center space-x-1.5">
        <Truck className="h-3.5 w-3.5" />
        <span>Modalidade de Envio</span>
      </span>
      <p className="font-bold text-[#003B73] dark:text-white">{order.deliveryType || 'Entrega em Caxias-MA'}</p>
      <p className="text-[#52708F] leading-snug font-medium text-[11px]">
        {order.deliveryAddress || 'Endereço cadastrado no seu perfil'}
      </p>
      <div className="pt-1.5 border-t border-blue-900/10 text-[10px] text-[#52708F] space-y-0.5">
        <p>Destinatário: <strong className="text-[#003B73] dark:text-slate-200">{order.customerName}</strong></p>
        {order.customerPhone && <p>Contato: <strong>{order.customerPhone}</strong></p>}
      </div>
    </div>
  );
};
