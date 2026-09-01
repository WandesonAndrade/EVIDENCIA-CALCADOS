import React from 'react';
import { Order } from '../../types';
import { Printer, X, Package, MapPin, Building2, User, FileText } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  labelUrl?: string;
  trackingCode?: string;
}

export const ShippingLabelPrintModal: React.FC<Props> = ({
  isOpen,
  onClose,
  order,
  labelUrl,
  trackingCode,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const cleanCep = (order.customerCep || '65609627').replace(/\D/g, '');
  const formattedCep = cleanCep.length === 8 ? `${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}` : cleanCep;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header - Não impresso */}
        <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#0071E3]" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Etiqueta de Envio & Declaração de Conteúdo
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {labelUrl && !labelUrl.includes('sandbox-ME-SANDBOX') && (
              <a
                href={labelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition"
              >
                Abrir PDF Oficial
              </a>
            )}
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Agora (Ctrl+P)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conteúdo Imprimível */}
        <div className="p-6 overflow-y-auto space-y-6 print:p-0 print:space-y-4">
          
          {/* BLOCO 1: ETIQUETA DE POSTAGEM */}
          <div className="border-2 border-dashed border-slate-300 dark:border-white/20 p-5 rounded-2xl print:border-black print:rounded-none">
            <div className="flex justify-between items-start border-b border-slate-200 dark:border-white/10 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#0071E3]">EVIDÊNCIA CALÇADOS</span>
                <h4 className="font-bold text-lg text-slate-900 dark:text-white">Etiqueta de Postagem</h4>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold bg-slate-100 dark:bg-white/10 px-2 py-1 rounded">
                  {trackingCode || `ME-${order.id}`}
                </span>
                <span className="block text-[10px] text-slate-500 mt-1">Pedido: {order.orderNumber || order.id}</span>
              </div>
            </div>

            {/* DESTINATÁRIO */}
            <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl mb-4 border border-slate-200/80 dark:border-white/10 print:bg-transparent print:border-black">
              <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1 flex items-center gap-1">
                <User className="w-3 h-3" /> DESTINATÁRIO
              </span>
              <p className="font-bold text-slate-900 dark:text-white text-sm">{order.customerName}</p>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">{order.deliveryAddress}</p>
              <p className="text-xs font-mono font-bold text-slate-900 dark:text-white mt-1">CEP: {formattedCep}</p>
              {order.customerPhone && (
                <p className="text-[11px] text-slate-500 mt-0.5">Telefone: {order.customerPhone}</p>
              )}
            </div>

            {/* REMETENTE */}
            <div className="p-3 border-t border-slate-200 dark:border-white/10 text-[11px] text-slate-600 dark:text-slate-400">
              <span className="font-bold uppercase text-[10px] text-slate-500 block mb-0.5 flex items-center gap-1">
                <Building2 className="w-3 h-3" /> REMETENTE
              </span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">Evidência Calçados • CNPJ: 60.997.831/0001-01</p>
              <p>Rua Afonso Pena, Nº 295 - Centro, Caxias/MA • CEP: 65600-060</p>
            </div>
          </div>

          {/* BLOCO 2: DECLARAÇÃO DE CONTEÚDO */}
          <div className="border border-slate-200 dark:border-white/10 p-5 rounded-2xl print:border-black print:rounded-none">
            <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-white/10 pb-2 mb-3">
              <FileText className="w-4 h-4 text-slate-500" />
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Declaração de Conteúdo
              </h5>
            </div>

            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 text-[10px] text-slate-400 uppercase">
                  <th className="py-1">Item / Descrição</th>
                  <th className="py-1 text-center">Qtd</th>
                  <th className="py-1 text-right">Valor Unit.</th>
                  <th className="py-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {order.items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="py-2 text-slate-800 dark:text-slate-200 font-medium">
                      {it.name} {it.selectedSize ? `(Tam: ${it.selectedSize})` : ''}
                    </td>
                    <td className="py-2 text-center text-slate-600 dark:text-slate-400">{it.quantity}</td>
                    <td className="py-2 text-right font-mono">
                      {it.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="py-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {(it.price * it.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10 flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-600 dark:text-slate-400">Total Declarado:</span>
              <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                {(order.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};