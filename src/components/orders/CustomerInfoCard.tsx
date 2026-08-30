import React from 'react';
import { ExternalLink, MessageCircle } from 'lucide-react';
import { Order } from '../../types';
import { buildWhatsAppUrl } from '../../utils/orderUtils';

interface Props {
  order: Order;
  isDark: boolean;
}

export const CustomerInfoCard: React.FC<Props> = ({ order, isDark: _isDark }) => {
  const getInitials = (name: string): string => {
    if (!name) return 'C';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(order.customerName);

  return (
    <div className="h-full flex flex-col justify-between p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.06] space-y-3">
      <div className="space-y-2.5">
        {/* Header com Monograma Apple */}
      <div className="flex items-center space-x-2.5">
        <div className="w-8 h-8 rounded-full bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF] border border-[#0071E3]/20 flex items-center justify-center font-semibold text-xs shrink-0 select-none">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[#86868B] block">
            Cliente
          </span>
          <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
            {order.customerName || 'Cliente sem nome'}
          </h4>
        </div>
      </div>

      {/* Contato & E-mail */}
      <div className="space-y-1 text-[11px]">
        <p className="text-slate-500 dark:text-[#86868B] truncate font-normal" title={order.customerEmail}>
          {order.customerEmail}
        </p>

        {order.customerPhone ? (
          <div className="pt-0.5">
            <a
              href={buildWhatsAppUrl(order.customerPhone)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium text-[11px] transition-all duration-200 active:scale-[0.98] group"
              title="Abrir WhatsApp com o cliente"
            >
              <MessageCircle className="h-3 w-3" />
              <span>{order.customerPhone}</span>
              <ExternalLink className="h-2.5 w-2.5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </a>
          </div>
        ) : (
          <p className="text-slate-400 dark:text-slate-600 text-[11px]">Telefone não cadastrado</p>
        )}
      </div>
      </div>

      {/* Documentos (CPF / RG) */}
      {(order.customerCpf || order.customerRg) && (
        <div className="pt-2 border-t border-black/[0.04] dark:border-white/[0.06] flex flex-wrap items-center gap-1.5 text-[10px]">
          {order.customerCpf && (
            <span className="px-2 py-0.5 rounded-md bg-black/[0.03] dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 font-mono">
              <strong className="font-medium text-slate-400">CPF:</strong> {order.customerCpf}
            </span>
          )}
          {order.customerRg && (
            <span className="px-2 py-0.5 rounded-md bg-black/[0.03] dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 font-mono">
              <strong className="font-medium text-slate-400">RG:</strong> {order.customerRg}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
