import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Order } from '../../types';
import { buildWhatsAppUrl } from '../../utils/orderUtils';

interface Props {
  order: Order;
  isDark: boolean;
}

export const CustomerInfoCard: React.FC<Props> = ({ order, isDark: _isDark }) => {
  return (
    <div className="space-y-1">
      <span className="text-[10px] text-slate-400 uppercase font-bold block">Cliente &amp; Contato</span>
      <p className="font-bold text-sm text-slate-100">{order.customerName}</p>
      <p className="text-slate-400 text-[11px] truncate" title={order.customerEmail}>{order.customerEmail}</p>

      {order.customerPhone ? (
        <a
          href={buildWhatsAppUrl(order.customerPhone)}
          target="_blank" rel="noopener noreferrer"
          className="text-emerald-400 hover:text-emerald-300 font-mono font-bold flex items-center space-x-1 pt-0.5"
          title="Abrir conversa no WhatsApp com o cliente"
        >
          <span>📱 {order.customerPhone}</span>
          <ExternalLink className="h-3 w-3 inline" />
        </a>
      ) : (
        <p className="text-slate-500 font-mono text-[11px]">Telefone não informado</p>
      )}

      {order.customerCpf && (
        <div className="pt-1 border-t border-slate-800/40 text-[11px] text-slate-300 flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400 font-bold">CPF:</span>
          <span className="font-mono">{order.customerCpf}</span>
        </div>
      )}
      {order.customerRg && (
        <div className="text-[11px] text-slate-300 flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400 font-bold">RG:</span>
          <span className="font-mono">{order.customerRg}</span>
        </div>
      )}
    </div>
  );
};
