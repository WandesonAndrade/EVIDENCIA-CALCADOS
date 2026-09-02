import React, { useState, useEffect } from 'react';
import { Truck, MapPin, Store, Clock, CheckCircle2, Printer, Package, ExternalLink, XCircle, RefreshCw, AlertTriangle, Edit2, Check, X } from 'lucide-react';
import { Order } from '../../types';
import { formatCurrency } from '../../utils/orderUtils';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ShippingLabelPrintModal } from './ShippingLabelPrintModal';
import { ShippingTrackerService } from '../../services/shipping/shippingTracker';

interface Props {
  order: Order;
  isDark: boolean;
  variant?: 'client' | 'admin';
}

export const ShippingInfoCard: React.FC<Props> = ({ order, isDark: _isDark, variant = 'client' }) => {
  const isStorePickup = order.deliveryType === 'Retirada na Loja';
  const isOtherCities = order.deliveryType === 'Entrega para Outras Cidades';
  const isLocalDelivery = !isStorePickup && !isOtherCities && (
    (order.deliveryType || '').toLowerCase().includes('caxias') ||
    (order.deliveryType || '').toLowerCase().includes('própria') ||
    (order.deliveryType || '').toLowerCase().includes('propria') ||
    (!order.deliveryType && (order.city || '').toLowerCase().includes('caxias'))
  );

  const [loading, setLoading] = useState(false);
  const [syncingTracking, setSyncingTracking] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order>(order);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isEditingTracking, setIsEditingTracking] = useState(false);
  const [editedTrackingCode, setEditedTrackingCode] = useState(order.trackingCode || '');
  const [labelError, setLabelError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentOrder(order);
    setEditedTrackingCode(order.trackingCode || '');
  }, [order]);

  const handleSyncTracking = async () => {
    if (!currentOrder.trackingCode) return;
    setSyncingTracking(true);
    try {
      const res = await ShippingTrackerService.syncOrderTracking(currentOrder.id, currentOrder.trackingCode);
      console.log(`📦 [ShippingInfoCard Admin] Rastreamento atualizado para o pedido #${currentOrder.orderNumber || currentOrder.id}:`, res);
      if (res.updated) {
        setCurrentOrder((prev) => ({
          ...prev,
          trackingCode: res.trackingCode || prev.trackingCode,
          status: res.newStatus || prev.status,
          labelStatus: (res.labelStatus as any) || prev.labelStatus,
          trackingEvents: res.events || prev.trackingEvents,
          metricDivergence: res.metricDivergence || prev.metricDivergence,
        }));
        if (res.trackingCode) {
          setEditedTrackingCode(res.trackingCode);
        }
      }
    } catch (err) {
      console.error('Erro ao sincronizar rastreamento:', err);
    } finally {
      setSyncingTracking(false);
    }
  };

  const handleSaveTrackingCode = async () => {
    const cleanCode = editedTrackingCode.trim().toUpperCase();
    if (!cleanCode) return;
    try {
      if (db && currentOrder.id) {
        await updateDoc(doc(db, 'orders', currentOrder.id), {
          trackingCode: cleanCode,
        });
      }
      setCurrentOrder((prev) => ({ ...prev, trackingCode: cleanCode }));
      setIsEditingTracking(false);

      // Já sincroniza imediatamente com o novo código oficial inserido!
      setSyncingTracking(true);
      const res = await ShippingTrackerService.syncOrderTracking(currentOrder.id, cleanCode);
      if (res.updated) {
        setCurrentOrder((prev) => ({
          ...prev,
          trackingCode: res.trackingCode || cleanCode,
          status: res.newStatus || prev.status,
          labelStatus: (res.labelStatus as any) || prev.labelStatus,
          trackingEvents: res.events || prev.trackingEvents,
          metricDivergence: res.metricDivergence || prev.metricDivergence,
        }));
      }
    } catch (err) {
      console.error('Erro ao salvar código de rastreamento:', err);
    } finally {
      setSyncingTracking(false);
    }
  };

  const handleGenerateLabel = async () => {
    setLoading(true);
    // Extração robusta do CEP (caso venha no campo customerCep ou no texto do deliveryAddress)
    const cepMatch = (order.deliveryAddress || '').match(/(\d{5}-?\d{3})/);
    let targetCep = (order.customerCep || '').replace(/\D/g, '');
    if (targetCep.length !== 8 && cepMatch) {
      targetCep = cepMatch[1].replace(/\D/g, '');
    }
    // Se ainda for inválido ou for 65600000 (rejeitado pela Jadlog no ME), usa o CEP oficial de Caxias 65600060
    // Identificação inteligente de Cidade e UF
    const cleanCepNumbers = targetCep.replace(/\D/g, '');
    const getUfFromCep = (cepStr: string): string => {
      const p2 = parseInt(cepStr.substring(0, 2), 10);
      if (p2 >= 1 && p2 <= 19) return 'SP';
      if (p2 >= 20 && p2 <= 28) return 'RJ';
      if (p2 === 29) return 'ES';
      if (p2 >= 30 && p2 <= 39) return 'MG';
      if (p2 >= 40 && p2 <= 48) return 'BA';
      if (p2 === 49) return 'SE';
      if (p2 >= 50 && p2 <= 56) return 'PE';
      if (p2 === 57) return 'AL';
      if (p2 === 58) return 'PB';
      if (p2 === 59) return 'RN';
      if (p2 >= 60 && p2 <= 63) return 'CE';
      if (p2 === 64) return 'PI'; // Teresina e Piauí
      if (p2 === 65) return 'MA'; // Caxias e Maranhão
      if (p2 >= 66 && p2 <= 68) return 'PA';
      if (p2 === 69) return 'AM';
      if (p2 >= 70 && p2 <= 72) return 'DF';
      if (p2 >= 73 && p2 <= 76) return 'GO';
      if (p2 === 77) return 'TO';
      if (p2 >= 78 && p2 <= 79) return 'MT';
      if (p2 >= 80 && p2 <= 87) return 'PR';
      if (p2 >= 88 && p2 <= 89) return 'SC';
      if (p2 >= 90 && p2 <= 99) return 'RS';
      return 'MA';
    };

    const ufMatch = (order.deliveryAddress || '').match(/\/([A-Za-z]{2})/);
    const addressUf = ufMatch ? ufMatch[1].toUpperCase() : '';
    const targetUf = addressUf || getUfFromCep(cleanCepNumbers);

    const cityMatch = (order.deliveryAddress || '').match(/,\s*([^,/-]+)\/[A-Za-z]{2}/);
    const targetCity = (order as any).customerCidade || order.city || (cityMatch ? cityMatch[1].trim() : (targetUf === 'PI' ? 'Teresina' : 'Caxias'));

    try {
      const response = await fetch('/api/shipping/labels/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          to: {
            name: order.customerName || 'Cliente',
            phone: (order.customerPhone || '99999999999').replace(/\D/g, ''),
            email: order.customerEmail || 'cliente@evidenciacalcados.com.br',
            document: (order.customerCpf || '04067032307').replace(/\D/g, ''),
            address: order.deliveryAddress?.split(',')[0]?.trim() || order.deliveryAddress || 'Rua Afonso Pena',
            number: order.customerNumero || '295',
            district: order.customerBairro || 'Centro',
            city: targetCity,
            state_abbr: targetUf,
            postal_code: targetCep,
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

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success || !data.label) {
        throw new Error(data.error || 'Falha na resposta da API do Melhor Envio.');
      }

      const updatedFields: any = {
        melhorEnvioId: data.label.shipmentId,
        trackingCode: data.label.trackingCode,
        labelUrl: data.label.labelUrl,
        labelStatus: 'gerada' as const,
        status: 'Em Preparação' as const,
        paymentStatus: 'Confirmado' as const,
      };

      if (db && order.id) {
        await updateDoc(doc(db, 'orders', order.id), updatedFields);
      }

      setCurrentOrder((prev) => ({ ...prev, ...updatedFields }));
      setLabelError(null);

      if (data.label.labelUrl) {
        window.open(data.label.labelUrl, '_blank');
      }
    } catch (err: any) {
      console.error('📌 Erro ao gerar etiqueta no Melhor Envio:', err);
      setLabelError(err?.message || 'Erro inesperado ao gerar etiqueta no Melhor Envio.');
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

          {/* 1. SE FOR ENTREGA PRÓPRIA DA LOJA (CAXIAS URBANA) */}
          {isLocalDelivery && (
            <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5" />
                  <span>Entrega Própria da Loja</span>
                </span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Caxias Urbana
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                Entrega expressa própria da Evidência Calçados. Não gera etiqueta externa nos Correios.
              </p>
              <button
                onClick={() => setIsPrintModalOpen(true)}
                className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Etiqueta da Loja (Romaneio Local)</span>
              </button>
            </div>
          )}

          {/* 2. SE FOR ENVIO EXTERNO (MELHOR ENVIO / CORREIOS / JADLOG) */}
          {!isStorePickup && !isLocalDelivery && (
            <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Package className="w-3 h-3 text-[#0071E3]" />
                  <span>Etiqueta Melhor Envio</span>
                </span>
                {isEditingTracking ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={editedTrackingCode}
                      onChange={(e) => setEditedTrackingCode(e.target.value)}
                      placeholder="Ex: QH87996960BR"
                      className="w-28 px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase bg-white dark:bg-black/40 border border-[#0071E3] rounded-md outline-none"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveTrackingCode}
                      className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer"
                      title="Salvar e Rastrear Código Oficial"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setIsEditingTracking(false)}
                      className="p-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 transition cursor-pointer"
                      title="Cancelar"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  currentOrder.trackingCode && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">
                        {currentOrder.trackingCode}
                      </span>
                      <button
                        onClick={() => setIsEditingTracking(true)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                        title="Corrigir / Informar Código Oficial dos Correios"
                      >
                        <Edit2 className="w-2.5 h-2.5" />
                      </button>
                      <button
                        onClick={handleSyncTracking}
                        disabled={syncingTracking}
                        className="p-1 rounded-md text-slate-400 hover:text-[#0071E3] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition cursor-pointer"
                        title="Atualizar Status do Rastreamento Agora"
                      >
                        <RefreshCw className={`w-3 h-3 ${syncingTracking ? 'animate-spin text-[#0071E3]' : ''}`} />
                      </button>
                    </div>
                  )
                )}
              </div>

              {/* Mensagem de Erro Real do Melhor Envio (sem falso positivo) */}
              {labelError && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <div className="space-y-0.5">
                    <span className="font-bold block">Falha na geração no Melhor Envio:</span>
                    <p className="text-[11px] leading-relaxed">{labelError}</p>
                  </div>
                </div>
              )}

              {!hasLabel ? (
                <button
                  onClick={handleGenerateLabel}
                  disabled={loading}
                  className="w-full py-2 px-3 rounded-xl bg-[#0071E3] hover:bg-[#005bb5] text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Package className="w-3.5 h-3.5" />}
                  <span>{loading ? 'Gerando no Melhor Envio...' : 'Gerar Etiqueta no Melhor Envio'}</span>
                </button>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (currentOrder.labelUrl) {
                          window.open(currentOrder.labelUrl, '_blank');
                        }
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Imprimir Etiqueta Oficial (PDF)</span>
                      <ExternalLink className="w-3 h-3 opacity-80" />
                    </button>

                    <button
                      onClick={handleCancelLabel}
                      disabled={loading}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                      title="Cancelar Etiqueta"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>

                  {currentOrder.trackingCode && (
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <a
                        href={`https://www.melhorrastreio.com.br/rastreio/${currentOrder.trackingCode}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-medium text-slate-500 hover:text-[#0071E3] flex items-center gap-1 hover:underline"
                      >
                        <span>Rastrear no Melhor Rastreio →</span>
                      </a>
                      <button
                        onClick={handleSyncTracking}
                        disabled={syncingTracking}
                        className="text-[10px] font-medium text-[#0071E3] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-2.5 h-2.5 ${syncingTracking ? 'animate-spin' : ''}`} />
                        <span>{syncingTracking ? 'Atualizando...' : 'Atualizar Status'}</span>
                      </button>
                    </div>
                  )}

                  {/* Resumo da última movimentação de rastreamento para o Admin */}
                  {currentOrder.trackingEvents && currentOrder.trackingEvents.length > 0 && (
                    <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium bg-slate-50 dark:bg-white/[0.03] p-2 rounded-lg border border-slate-100 dark:border-white/5 space-y-0.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-semibold text-slate-500">Último status:</span>
                        <span className="font-mono">
                          {currentOrder.trackingEvents[currentOrder.trackingEvents.length - 1].createdAt
                            ? new Date(
                                currentOrder.trackingEvents[currentOrder.trackingEvents.length - 1].createdAt
                              ).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-200 text-[11px] leading-tight line-clamp-2">
                        {currentOrder.trackingEvents[currentOrder.trackingEvents.length - 1].description}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Alerta de Divergência de Métrica para o Administrador */}
              {currentOrder.metricDivergence && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 text-xs space-y-1 mt-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Diferença de Métrica Identificada</span>
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    A transportadora cobrou um acréscimo de <strong>+R$ {currentOrder.metricDivergence.difference.toFixed(2).replace('.', ',')}</strong> na postagem.
                    {currentOrder.metricDivergence.measuredWeight ? ` Peso aferido: ${currentOrder.metricDivergence.measuredWeight}kg.` : ''}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <ShippingLabelPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          order={currentOrder}
          labelUrl={currentOrder.labelUrl}
          trackingCode={currentOrder.trackingCode}
        />
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
            <span className="font-semibold text-slate-700 dark:text-slate-300">Código de Rastreio:</span>
            <span className="font-mono font-bold text-[#0071E3]">{order.trackingCode}</span>
          </div>
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
            Rastreio no Site
          </span>
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
            <span>{order.freightCost === 0 ? 'Frete Grátis incluso' : `Frete: R$ ${formatCurrency(order.freightCost)}`}</span>
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
