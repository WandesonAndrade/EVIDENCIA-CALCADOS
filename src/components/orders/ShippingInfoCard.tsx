import React from 'react';
import { Truck, MapPin, Store, Clock, CheckCircle2 } from 'lucide-react';
import { Order } from '../../types';
import { formatCurrency } from '../../utils/orderUtils';

interface Props {
  order: Order;
  isDark: boolean;
  variant?: 'client' | 'admin';
}

export const ShippingInfoCard: React.FC<Props> = ({ order, isDark: _isDark, variant = 'client' }) => {
  const isStorePickup = order.deliveryType === 'Retirada na Loja';
  const isOtherCities = order.deliveryType === 'Entrega para Outras Cidades';

  if (variant === 'admin') {
    return (
      <div className="h-full flex flex-col justify-between p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.06] space-y-3">
        <div className="space-y-2.5">
          {/* Header Apple Maps / Store */}
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              isStorePickup
                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                : 'bg-blue-500/10 text-[#0071E3] dark:text-[#0A84FF]'
            }`}>
              {isStorePickup ? <Store className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
            </div>
            <div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#86868B] block">
                Modalidade
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                isStorePickup
                  ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 font-semibold'
                  : isOtherCities
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                  : 'bg-black/[0.04] dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border-black/[0.05] dark:border-white/[0.08]'
              }`}>
                {isStorePickup ? '🏬 Retirada na Loja' : (order.deliveryType || 'Entrega em Caxias-MA')}
              </span>
            </div>
          </div>

          {/* Endereço ou Local de Retirada */}
          <div className="space-y-1">
            <span className="text-[10px] font-medium text-[#86868B] block">
              {isStorePickup ? 'Local de Retirada (Loja Física):' : 'Endereço de Destino:'}
            </span>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
              {order.deliveryAddress || (isStorePickup ? 'Rua Afonso Pena, 295 - Centro, Caxias - MA' : 'Endereço não informado')}
            </p>
            {isStorePickup && (
              <span className="inline-flex items-center space-x-1 text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                <Clock className="h-3 w-3" />
                <span>Cliente retira no balcão da loja</span>
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Client variant - Apple Compact & Natural Spacing
  return (
    <div className="p-5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.06] space-y-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-[#86868B] flex items-center space-x-1.5">
          {isStorePickup ? (
            <Store className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
          ) : (
            <MapPin className="h-3.5 w-3.5 text-[#0071E3] dark:text-[#0A84FF]" />
          )}
          <span>{isStorePickup ? 'Retirada no Balcão' : 'Envio & Destino'}</span>
        </span>

        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${
          isStorePickup
            ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 font-semibold'
            : 'bg-[#0071E3]/10 text-[#0071E3] dark:text-[#0A84FF] border-[#0071E3]/20 font-semibold'
        }`}>
          {isStorePickup ? '🏬 Retirada na Loja' : (order.deliveryType || 'Entrega em Caxias-MA')}
        </span>
      </div>

      <div className="space-y-1">
        <span className="text-[10px] text-[#86868B] block font-medium">
          {isStorePickup ? 'Endereço da Loja Física:' : 'Endereço de Entrega:'}
        </span>
        <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-xs font-normal">
          {order.deliveryAddress || (isStorePickup ? 'Rua Afonso Pena, 295 - Centro, Caxias - MA' : 'Endereço cadastrado no seu perfil')}
        </p>
      </div>

      {/* Custo e Benefício de Frete */}
      <div className="pt-2 border-t border-black/[0.04] dark:border-white/[0.06] flex items-center space-x-2 text-[11px]">
        {isStorePickup ? (
          <span className="text-purple-700 dark:text-purple-300 font-medium flex items-center space-x-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-purple-600" />
            <span>Sem taxa de entrega (Frete Grátis)</span>
          </span>
        ) : isOtherCities ? (
          <span className="text-amber-700 dark:text-amber-400 font-medium">
            Frete: {order.freightCost && order.freightCost > 0 ? `R$ ${formatCurrency(order.freightCost)}` : 'A Combinar via WhatsApp'}
          </span>
        ) : (
          <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center space-x-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>{order.freightCost === 0 ? 'Frete Grátis incluso' : `Taxa fixa de envio: R$ ${formatCurrency(order.freightCost || 10)}`}</span>
          </span>
        )}
      </div>

      {/* Rodapé: Destinatário ou Horário */}
      <div className="pt-2 border-t border-black/[0.04] dark:border-white/[0.06] text-[11px] text-slate-500 dark:text-[#86868B]">
        {isStorePickup ? (
          <p className="font-medium text-purple-700 dark:text-purple-300 flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>Horário: Seg a Sex: 08h às 18h | Sáb: 08h às 13h</span>
          </p>
        ) : (
          <p>
            Destinatário: <strong className="font-medium text-slate-900 dark:text-slate-200">{order.customerName}</strong>
          </p>
        )}
      </div>
    </div>
  );
};
