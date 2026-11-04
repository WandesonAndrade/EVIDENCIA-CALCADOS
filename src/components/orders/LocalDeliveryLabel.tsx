import React, { useState } from 'react';
import { Order } from '../../types';
import { Printer, X, User, Phone, MapPin, Building2, Package, CheckCircle2, AlertTriangle, FileText, Bike } from 'lucide-react';
import { Code39Barcode } from '../../utils/barcodeUtils';
import { generateLocalLabelNumber, getLocalDeliveryPaymentBadge } from '../../utils/localDelivery';
import { extractStreetName } from '../../utils/addressUtils';

interface LocalDeliveryLabelProps {
  order: Order;
  onClose: () => void;
  onLabelPrinted?: (labelNumber: string) => void;
}

export const LocalDeliveryLabel: React.FC<LocalDeliveryLabelProps> = ({
  order,
  onClose,
  onLabelPrinted,
}) => {
  const [printFormat, setPrintFormat] = useState<'thermal' | 'a4'>('thermal');
  const [courierName, setCourierName] = useState(order.localCourierName || '');

  const labelNumber = order.localLabelNumber || generateLocalLabelNumber(order.orderNumber || order.id);
  const paymentBadge = getLocalDeliveryPaymentBadge(order);

  const cleanCep = (order.customerCep || '').replace(/\D/g, '');
  const formattedCep = cleanCep.length === 8 ? `${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}` : (order.customerCep || 'Caxias - MA');

  // Endereço e número higienizados sem valores fictícios
  const customerNumber = (order.customerNumero || '').trim() || 'S/N';
  const customerBairro = (order.customerBairro || '').trim();
  const customerComplement = (order.customerComplemento || '').trim();

  const handlePrint = () => {
    if (onLabelPrinted) {
      onLabelPrinted(labelNumber);
    }
    window.print();
  };

  const totalQuantity = order.items.reduce((acc, it) => acc + (it.quantity || 1), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm print:p-0 print:bg-white print:static">
      
      {/* Container Principal */}
      <div className="bg-white dark:bg-[#18181b] w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col max-h-[92vh] overflow-hidden print:max-h-none print:w-auto print:max-w-none print:border-none print:shadow-none print:rounded-none">
        
        {/* Header de Controle (Não impresso) */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 print:hidden bg-slate-50 dark:bg-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base leading-tight">
                Etiqueta Própria • Entrega Caxias Urbana
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Identificação e canhoto de entrega expressa local
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Seletor de Formato */}
            <div className="flex items-center bg-slate-200/80 dark:bg-white/10 p-0.5 rounded-lg text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setPrintFormat('thermal')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  printFormat === 'thermal'
                    ? 'bg-white dark:bg-black text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Térmica (10x15)
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('a4')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  printFormat === 'a4'
                    ? 'bg-white dark:bg-black text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Folha A4
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Input Opcional de Entregador (Não impresso) */}
        <div className="px-5 py-2.5 bg-slate-100/70 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between text-xs print:hidden">
          <div className="flex items-center gap-2 w-full max-w-sm">
            <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">Motoboy / Entregador:</span>
            <input
              type="text"
              value={courierName}
              onChange={(e) => setCourierName(e.target.value)}
              placeholder="Ex: Carlos (Moto 01)"
              className="w-full px-2.5 py-1 text-xs bg-white dark:bg-black/40 border border-slate-300 dark:border-white/15 rounded-md outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-200"
            />
          </div>
          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">Romaneio: {labelNumber}</span>
        </div>

        {/* ========================================================================= */}
        {/* ÁREA IMPRIMÍVEL DA ETIQUETA (100mm x 150mm ou A4) */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-6 overflow-y-auto print:p-0 print:overflow-visible">
          
          <div
            id="printable-local-label"
            className={`mx-auto bg-white text-black border-2 border-black rounded-lg p-3 sm:p-4 font-sans text-xs flex flex-col justify-between print:border-2 print:border-black print:rounded-none ${
              printFormat === 'thermal'
                ? 'w-full max-w-[100mm] min-h-[148mm] print:w-[100mm] print:min-h-[148mm] print:p-3'
                : 'w-full max-w-md print:w-[130mm] print:p-4'
            }`}
            style={{ boxSizing: 'border-box' }}
          >

            {/* SEÇÃO 1: CANHOTO DESTACÁVEL DE RECEBIMENTO */}
            <div className="border-b-2 border-dashed border-black pb-2.5 mb-2.5">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[9px] font-black tracking-widest uppercase">EVIDÊNCIA CALÇADOS • COMPROVANTE DE ENTREGA</span>
                <span className="text-[9px] font-bold font-mono">PEDIDO #{order.orderNumber || order.id}</span>
              </div>
              <p className="text-[8.5px] leading-tight text-neutral-700">
                Recebi em perfeitas condições o(s) produto(s) correspondente(s) ao pedido acima.
              </p>
              
              <div className="grid grid-cols-2 gap-2 mt-2 pt-1 border-t border-dotted border-neutral-400 text-[8.5px]">
                <div>
                  <span className="block text-[7.5px] uppercase font-bold text-neutral-500">Nome Legível do Recebedor:</span>
                  <div className="h-4 border-b border-black"></div>
                </div>
                <div>
                  <span className="block text-[7.5px] uppercase font-bold text-neutral-500">Documento (RG ou CPF):</span>
                  <div className="h-4 border-b border-black"></div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-1.5 text-[8.5px] items-end">
                <div>
                  <span className="block text-[7.5px] uppercase font-bold text-neutral-500">Grau / Parentesco:</span>
                  <div className="h-4 border-b border-black"></div>
                </div>
                <div>
                  <span className="block text-[7.5px] uppercase font-bold text-neutral-500">Data e Hora:</span>
                  <div className="h-4 border-b border-black text-center font-mono">____/____/________  ____:____</div>
                </div>
                <div>
                  <span className="block text-[7.5px] uppercase font-bold text-neutral-500">Assinatura:</span>
                  <div className="h-4 border-b border-black"></div>
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: CABEÇALHO DA ETIQUETA PRINCIPAL */}
            <div className="border-b-2 border-black pb-2 mb-2">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-sm sm:text-base font-black tracking-wider uppercase leading-none">
                    EVIDÊNCIA CALÇADOS
                  </h1>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-700 block mt-0.5">
                    ENTREGA EXPRESSA LOCAL • CAXIAS - MA
                  </span>
                </div>
                <div className="text-right">
                  <span className="inline-block bg-black text-white text-[9px] font-black px-2 py-0.5 rounded-sm uppercase tracking-wide">
                    ENTREGA LOCAL
                  </span>
                  <span className="block text-[9px] font-mono font-bold mt-0.5">
                    VOL: 1 / 1 ({totalQuantity} {totalQuantity === 1 ? 'par' : 'pares'})
                  </span>
                </div>
              </div>

              {/* Código de barras do Romaneio / Pedido */}
              <div className="mt-2 flex justify-between items-center gap-2">
                <div className="flex-1">
                  <Code39Barcode value={String(order.orderNumber || order.id)} height={32} displayValue={false} />
                  <div className="flex justify-between text-[8px] font-mono font-bold mt-0.5">
                    <span>PEDIDO: #{order.orderNumber || order.id}</span>
                    <span>ROMANEIO: {labelNumber}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO 3: DESTINATÁRIO (ÁREA DE MAIOR DESTAQUE VISUAL PARA O MOTOBOY) */}
            <div className="border-2 border-black p-2.5 rounded-sm mb-2 bg-neutral-50 print:bg-transparent">
              <div className="flex justify-between items-center border-b border-black pb-1 mb-1.5">
                <span className="text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                  <User className="w-3 h-3" /> DESTINATÁRIO
                </span>
                {order.customerPhone && (
                  <span className="text-[11px] font-black font-mono tracking-tight flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {order.customerPhone}
                  </span>
                )}
              </div>

              <h2 className="text-sm font-black uppercase text-black leading-tight">
                {order.customerName}
              </h2>

              {/* Endereço com número e bairro em alto relevo */}
              <div className="mt-1.5 space-y-0.5 text-xs">
                <p className="leading-tight">
                  <span className="font-semibold">{extractStreetName(order.deliveryAddress?.split(',')[0] || order.deliveryAddress)}</span>,{' '}
                  <span className="font-black text-sm bg-black text-white px-1.5 py-0.2 rounded-xs print:bg-black print:text-white">
                    Nº {customerNumber}
                  </span>
                </p>

                {customerComplement && (
                  <p className="text-[10px] text-neutral-800 font-medium">
                    <span className="font-bold">Compl./Ref.:</span> {customerComplement}
                  </p>
                )}

                <p className="font-bold text-[11px] text-neutral-900">
                  Bairro: <span className="uppercase font-black">{customerBairro || 'Centro / Caxias'}</span>
                </p>

                <p className="text-[10px] font-mono font-bold text-neutral-700">
                  CEP: {formattedCep} • CAXIAS - MA
                </p>
              </div>
            </div>

            {/* SEÇÃO 4: STATUS FINANCEIRO / COBRANÇA */}
            <div className="border-2 border-black p-2 rounded-sm mb-2 text-center">
              {paymentBadge.type === 'PAID' ? (
                <div className="flex items-center justify-center gap-1.5 py-0.5 font-black text-xs uppercase tracking-wider text-black">
                  <CheckCircle2 className="w-4 h-4 text-black" />
                  <span>✅ JÁ PAGO ONLINE (NÃO COBRAR NADA DO CLIENTE)</span>
                </div>
              ) : (
                <div className="py-0.5">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider text-black">
                    <AlertTriangle className="w-4 h-4 text-black" />
                    <span>⚠️ ATENÇÃO: COBRAR DO CLIENTE NA ENTREGA</span>
                  </div>
                  <div className="text-base font-black font-mono mt-0.5 text-black">
                    VALOR TOTAL: {paymentBadge.amountToCollect?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  <span className="text-[9px] font-semibold text-neutral-700 block">
                    Forma: {order.paymentMethod || 'Dinheiro / Maquininha da Loja'}
                  </span>
                </div>
              )}
            </div>

            {/* SEÇÃO 5: RESUMO DOS ITENS CONFERIDOS */}
            <div className="border border-black p-1.5 rounded-sm mb-2 text-[9px]">
              <div className="flex justify-between items-center font-bold border-b border-black pb-0.5 mb-1">
                <span>CONFERÊNCIA DE MERCADORIA ({order.items.length} {order.items.length === 1 ? 'item' : 'itens'})</span>
                <span>GRADE / TAM</span>
              </div>
              <div className="space-y-0.5">
                {order.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center leading-tight">
                    <span className="truncate pr-2 font-medium">
                      {it.quantity}x {it.name}
                    </span>
                    <span className="font-mono font-bold uppercase whitespace-nowrap">
                      {it.selectedSize ? `TAM ${it.selectedSize}` : '-'}
                    </span>
                  </div>
                ))}
              </div>
              {order.shippingBoxName && (
                <div className="mt-1 pt-1 border-t border-dotted border-neutral-400 text-[8px] text-neutral-600 flex justify-between">
                  <span>Embalagem: {order.shippingBoxName}</span>
                  {courierName && <span>Entregador: {courierName}</span>}
                </div>
              )}
            </div>

            {/* SEÇÃO 6: REMETENTE & INSTRUÇÕES DA LOJA */}
            <div className="pt-1.5 border-t border-black text-[8px] leading-tight text-neutral-700 flex justify-between items-end">
              <div>
                <span className="font-bold text-black uppercase block">REMETENTE: EVIDÊNCIA CALÇADOS</span>
                <p>Rua Afonso Pena, Nº 295 - Centro, Caxias/MA • CEP 65600-060</p>
                <p className="font-semibold text-black">WhatsApp / Atendimento: (99) 98468-4867</p>
              </div>
              <div className="text-right font-mono text-[7.5px] text-neutral-500">
                <span>Emissão: {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* ESTILOS DE IMPRESSÃO ISOLADOS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-local-label, #printable-local-label * {
            visibility: visible !important;
          }
          #printable-local-label {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: ${printFormat === 'thermal' ? '100mm' : '100%'} !important;
            min-height: ${printFormat === 'thermal' ? '148mm' : 'auto'} !important;
            margin: 0 !important;
            padding: 8mm !important;
            border: 2px solid black !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
          }
          @page {
            size: ${printFormat === 'thermal' ? '100mm 150mm' : 'A4 portrait'};
            margin: 0;
          }
        }
      `}</style>

    </div>
  );
};

