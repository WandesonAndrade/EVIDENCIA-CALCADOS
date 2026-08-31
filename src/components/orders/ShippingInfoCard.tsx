import React, { useState } from 'react';
import { Truck, MapPin, Store, Clock, CheckCircle2, Printer, Package, ExternalLink, XCircle, RefreshCw } from 'lucide-react';
import { Order } from '../../types';
import { formatCurrency } from '../../utils/orderUtils';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface Props {
  order: Order;
  isDark: boolean;
  variant?: 'client' | 'admin';
}

export const ShippingInfoCard: React.FC<Props> = ({ order, isDark: _isDark, variant = 'client' }) => {
  const isStorePickup = order.deliveryType === 'Retirada na Loja';
  const isOtherCities = order.deliveryType === 'Entrega para Outras Cidades';

  const [loading, setLoading] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order>(order);

  const handleGenerateLabel = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/shipping/labels/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          to: {
            name: order.customerName || 'Cliente',
            phone: order.customerPhone || '99999999999',
            email: order.customerEmail || 'cliente@evidencia.com',
            document: order.customerCpf || '00000000000',
            address: order.deliveryAddress || 'Rua Afonso Pena',
            number: '100',
            district: order.customerBairro || 'Centro',
            city: order.city || 'São Paulo',
            state_abbr: 'SP',
            postal_code: (order.customerCep || '01001000').replace(/\D/g, ''),
          },
          products: order.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unitary_value: item.price,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Falha na resposta do servidor proxy de etiquetas.');
      }

      const data = await response.json();
      if (data.success && data.label) {
        const updatedFields = {
          melhorEnvioId: data.label.shipmentId,
          trackingCode: data.label.trackingCode,
          labelUrl: data.label.labelUrl,
          labelStatus: 'gerada' as const,
        };

        if (db && order.id) {
          await updateDoc(doc(db, 'orders', order.id), updatedFields);
        }

        setCurrentOrder((prev) => ({ ...prev, ...updatedFields }));
      }
    } catch (err: any) {
      console.error('📌 Erro ao gerar etiqueta:', err);
      alert('Erro ao gerar etiqueta no Melhor Envio: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelLabel = async () => {
    if (!currentOrder.melhorEnvioId) return;
    if (!confirm('Deseja realmente cancelar a etiqueta do Melhor Envio para este pedido?')) return;

    setLoading(true);
    try {
      await fetch('/api/shipping/labels/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipmentId: currentOrder.melhorEnvioId,
          reason: 'Cancelado via painel administrativo',
        }),
      });

      const updatedFields = {
        melhorEnvioId: '',
        trackingCode: '',
        labelUrl: '',
        labelStatus: 'cancelada' as const,
      };

      if (db && order.id) {
        await updateDoc(doc(db, 'orders', order.id), updatedFields);
      }

      setCurrentOrder((prev) => ({ ...prev, ...updatedFields }));
    } catch (err: any) {
      console.error('📌 Erro ao cancelar etiqueta:', err);
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'admin') {
    const hasLabel = Boolean(currentOrder.labelUrl || currentOrder.trackingCode);

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
                Modalidade de Frete
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                isStorePickup
                  ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 font-semibold'
                  : isOtherCities
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-bold'
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

          {/* Painel de Gestão de Etiquetas do Melhor Envio */}
          {!isStorePickup && (
            <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Package className="w-3 h-3 text-[#0071E3]" />
                  <span>Etiqueta Melhor Envio</span>
                </span>
                {currentOrder.trackingCode && (
                  <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {currentOrder.trackingCode}
                  </span>
                )}
              </div>

              {!hasLabel ? (
                <button
                  onClick={handleGenerateLabel}
                  disabled={loading}
                  className="w-full py-2 px-3 rounded-xl bg-[#0071E3] hover:bg-[#005bb5] text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Package className="w-3.5 h-3.5" />}
                  <span>Gerar Etiqueta no Melhor Envio</span>
                </button>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <a
                      href={currentOrder.labelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Imprimir Etiqueta (PDF)</span>
                      <ExternalLink className="w-3 h-3 opacity-80" />
                    </a>

                    <button
                      onClick={handleCancelLabel}
                      disabled={loading}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                      title="Cancelar Etiqueta"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>

                  {currentOrder.trackingCode && (
                    <a
                      href={`https://www.melhorrastreio.com.br/rastreio/${currentOrder.trackingCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-medium text-slate-500 hover:text-[#0071E3] flex items-center gap-1 hover:underline"
                    >
                      <span>Rastrear pacote no Melhor Rastreio →</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
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

      {/* Rastreamento para o Cliente se disponível */}
      {order.trackingCode && !isStorePickup && (
        <div className="p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-800/40 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1.5">
            <Package className="w-3.5 h-3.5 text-[#0071E3]" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Rastreio:</span>
            <span className="font-mono font-bold text-[#0071E3]">{order.trackingCode}</span>
          </div>
          <a
            href={`https://www.melhorrastreio.com.br/rastreio/${order.trackingCode}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-bold text-[#0071E3] hover:underline flex items-center gap-0.5"
          >
            <span>Rastrear</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      )}

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
