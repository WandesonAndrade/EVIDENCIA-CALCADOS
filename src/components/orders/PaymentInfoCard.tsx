import React, { useState } from 'react';
import { CreditCard, Zap, FileText, ShieldCheck, Copy, Check, Info } from 'lucide-react';
import { Order } from '../../types';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { formatCurrency } from '../../utils/orderUtils';

interface Props {
  order: Order;
  isDark: boolean;
  variant?: 'client' | 'admin';
}

export const PaymentInfoCard: React.FC<Props> = ({ order, isDark: _isDark, variant = 'client' }) => {
  const [copiedId, setCopiedId] = useState(false);

  const method = order.paymentMethod || 'Pix';
  const isCard = method.includes('Cartão');
  const isPix = method === 'Pix';
  const isCrediario = method === 'Crediário da Loja';

  const installments = order.installments || 1;
  const installmentValue = installments > 0 ? (order.total || 0) / installments : (order.total || 0);

  const handleCopyId = (id: string | number) => {
    navigator.clipboard.writeText(String(id));
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const MethodIcon = isPix ? Zap : isCrediario ? FileText : CreditCard;
  const iconColor = isPix
    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    : isCrediario
    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
    : 'bg-[#0071E3]/10 text-[#0071E3] dark:text-[#0A84FF]';

  if (variant === 'admin') {
    return (
      <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.06] space-y-3">
        {/* Header Apple Wallet */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconColor}`}>
              <MethodIcon className="h-4 w-4 stroke-[2]" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#86868B] block">
                Forma de Pagamento
              </span>
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate block">
                {method}
              </span>
            </div>
          </div>

          <PaymentStatusBadge status={order.paymentStatus} variant="admin" size="sm" />
        </div>

        {/* Informações da Condição & Parcelamento */}
        <div className="space-y-1 text-xs">
          {installments > 1 ? (
            <div className="flex items-center justify-between text-[11px] p-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.06]">
              <span className="text-slate-500 dark:text-[#86868B]">Parcelamento:</span>
              <span className="font-semibold text-[#0071E3] dark:text-[#0A84FF]">
                {installments}x de R$ {formatCurrency(installmentValue)} s/ juros
              </span>
            </div>
          ) : isPix ? (
            <div className="flex items-center justify-between text-[11px] p-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium">
              <span>Condição:</span>
              <span className="font-semibold">À Vista no Pix</span>
            </div>
          ) : isCrediario ? (
            <div className="flex items-center justify-between text-[11px] p-1.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium">
              <span>Condição:</span>
              <span className="font-semibold">Carnê Loja até 6x</span>
            </div>
          ) : null}

          {/* Discriminação de Desconto / Cashback */}
          {(Boolean(order.totalDiscount && order.totalDiscount > 0) || Boolean(order.cashbackDiscount && order.cashbackDiscount > 0)) && (
            <div className="pt-1.5 space-y-0.5 text-[11px] text-[#86868B]">
              {order.totalDiscount && order.totalDiscount > 0 ? (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Desconto Aplicado:</span>
                  <span className="font-medium font-mono">- R$ {formatCurrency(order.totalDiscount)}</span>
                </div>
              ) : null}
              {order.cashbackDiscount && order.cashbackDiscount > 0 ? (
                <div className="flex justify-between text-[#0071E3] dark:text-[#0A84FF]">
                  <span>Cashback Utilizado:</span>
                  <span className="font-medium font-mono">- R$ {formatCurrency(order.cashbackDiscount)}</span>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Transação Mercado Pago / ID */}
        {order.paymentId && (
          <div className="pt-2 border-t border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between text-[10px]">
            <span className="text-[#86868B]">ID Transação:</span>
            <button
              type="button"
              onClick={() => handleCopyId(order.paymentId!)}
              className="inline-flex items-center space-x-1 font-mono text-slate-700 dark:text-slate-300 hover:text-[#0071E3] dark:hover:text-[#0A84FF] transition-colors cursor-pointer"
              title="Copiar ID da Transação"
            >
              <span>#{order.paymentId}</span>
              {copiedId ? (
                <Check className="h-3 w-3 text-emerald-500 stroke-[2.5]" />
              ) : (
                <Copy className="h-3 w-3 opacity-60 hover:opacity-100" />
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Client variant
  return (
    <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.06] space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-[#86868B] flex items-center space-x-1.5">
          <MethodIcon className="h-3.5 w-3.5 text-[#0071E3] dark:text-[#0A84FF]" />
          <span>Informações de Pagamento</span>
        </span>
        <PaymentStatusBadge status={order.paymentStatus} variant="client" size="sm" />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${iconColor}`}>
            <MethodIcon className="h-3.5 w-3.5 stroke-[2]" />
          </div>
          <div>
            <p className="font-semibold text-xs text-slate-900 dark:text-white">
              {method}
            </p>
            <p className="text-[10px] text-[#86868B]">
              {order.paymentStatus === 'Confirmado'
                ? 'Pagamento aprovado e conciliado'
                : order.paymentStatus === 'Em Análise'
                ? 'Em processamento seguro pela operadora'
                : isPix
                ? 'Aguardando confirmação Pix'
                : 'Aguardando validação'}
            </p>
          </div>
        </div>
      </div>

      {/* Detalhes de Parcelamento e Valores */}
      <div className="pt-2 border-t border-black/[0.04] dark:border-white/[0.06] space-y-1.5 text-xs">
        {installments > 1 ? (
          <div className="flex items-center justify-between text-[11px] font-medium">
            <span className="text-slate-500 dark:text-[#86868B]">Condição:</span>
            <span className="font-semibold text-[#0071E3] dark:text-[#0A84FF]">
              {installments}x de R$ {formatCurrency(installmentValue)} sem juros
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between text-[11px] font-medium">
            <span className="text-slate-500 dark:text-[#86868B]">Condição:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              À vista (1x)
            </span>
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-black/[0.04] dark:border-white/[0.06]">
          <span className="text-slate-500 dark:text-[#86868B]">Valor Pago / Total:</span>
          <span className="font-bold text-slate-900 dark:text-white font-mono text-xs">
            R$ {formatCurrency(order.total)}
          </span>
        </div>

        {order.paymentId && (
          <div className="pt-1 text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
            <span>Comprovante:</span>
            <span className="font-mono">#{order.paymentId}</span>
          </div>
        )}
      </div>

      <div className="pt-1.5 flex items-center space-x-1.5 text-[10px] text-slate-400 dark:text-slate-500">
        <ShieldCheck className="h-3 w-3 text-emerald-500 shrink-0" />
        <span>Transação protegida com criptografia ponta a ponta</span>
      </div>
    </div>
  );
};
