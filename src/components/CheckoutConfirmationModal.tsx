import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, CheckCircle2, Truck, ShoppingBag, Zap, CreditCard, 
  ShieldCheck, MapPin, Info, ArrowRight, MessageSquare, Sparkles 
} from 'lucide-react';
import { motion } from 'motion/react';

interface CheckoutConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
  cartItemsCount: number;
  onConfirmOrder: (
    paymentMethod: 'Pix' | 'Cartão de Crédito' | 'Crediário da Loja', 
    deliveryType: 'Entrega em Caxias-MA' | 'Retirada na Loja'
  ) => void;
  isProcessing: boolean;
}

export const CheckoutConfirmationModal: React.FC<CheckoutConfirmationModalProps> = ({
  isOpen,
  onClose,
  subtotal,
  cartItemsCount,
  onConfirmOrder,
  isProcessing
}) => {
  const { currentUser, theme } = useApp();
  const isDark = theme === 'dark';

  const [deliveryType, setDeliveryType] = useState<'Entrega em Caxias-MA' | 'Retirada na Loja'>('Entrega em Caxias-MA');
  const [paymentMethod, setPaymentMethod] = useState<'Pix' | 'Cartão de Crédito' | 'Crediário da Loja'>('Pix');

  if (!isOpen || !currentUser) return null;

  // Calculate freight cost based on delivery choice
  const isFreeFreight = subtotal > 100 || deliveryType === 'Retirada na Loja';
  const freightCost = deliveryType === 'Retirada na Loja' ? 0 : (subtotal > 100 ? 0 : 10);
  const grandTotal = subtotal + freightCost;

  const isCrediarioApproved = currentUser.crediarioStatus === 'Aprovado';

  const handleConfirmClick = () => {
    onConfirmOrder(paymentMethod, deliveryType);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="fixed inset-0" onClick={onClose} />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`relative rounded-3xl border backdrop-blur-2xl max-w-lg w-full overflow-hidden shadow-2xl z-10 my-6 ${
          isDark ? 'bg-slate-900 border-slate-800 text-white shadow-black/80' : 'bg-white border-slate-200 text-slate-900 shadow-xl'
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-400 to-amber-500 p-6 text-slate-950 flex items-center justify-between shadow-md">
          <div>
            <div className="flex items-center space-x-2">
              <ShoppingBag className="h-5 w-5" />
              <h3 className="text-base font-black uppercase tracking-tight">Confirmação de Pedido</h3>
            </div>
            <p className="text-[11px] font-extrabold opacity-90">
              Escolha a forma de entrega e pagamento para finalizar
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/10 text-slate-950 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* SECTION 1: OPÇÕES DE ENTREGA */}
          <div className="space-y-3">
            <h4 className={`text-xs font-black uppercase tracking-wider flex items-center space-x-2 ${
              isDark ? 'text-amber-400' : 'text-slate-900'
            }`}>
              <Truck className="h-4 w-4" />
              <span>1. Escolha a Modalidade de Entrega</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Entrega em Caxias */}
              <button
                type="button"
                onClick={() => setDeliveryType('Entrega em Caxias-MA')}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  deliveryType === 'Entrega em Caxias-MA'
                    ? 'border-amber-400 bg-amber-400/10 shadow-sm'
                    : isDark ? 'border-slate-800 bg-slate-950/60 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span className="font-extrabold text-xs flex items-center space-x-1.5">
                    <Truck className="h-4 w-4 text-amber-400" />
                    <span>Entrega Caxias (MA)</span>
                  </span>
                  {deliveryType === 'Entrega em Caxias-MA' && <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />}
                </div>
                <p className="text-[10px] opacity-80 leading-relaxed font-medium">
                  Entregamos diretamente no seu endereço cadastrado em Caxias - MA.
                </p>
                <div className="mt-3 pt-2 border-t border-slate-800/40 text-[11px] font-black text-emerald-400">
                  {subtotal > 100 ? 'Frete GRÁTIS' : 'Frete: R$ 10,00'}
                </div>
              </button>

              {/* Retirada na Loja */}
              <button
                type="button"
                onClick={() => setDeliveryType('Retirada na Loja')}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  deliveryType === 'Retirada na Loja'
                    ? 'border-sky-400 bg-sky-400/10 shadow-sm'
                    : isDark ? 'border-slate-800 bg-slate-950/60 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span className="font-extrabold text-xs flex items-center space-x-1.5">
                    <MapPin className="h-4 w-4 text-sky-400" />
                    <span>Retirada na Loja</span>
                  </span>
                  {deliveryType === 'Retirada na Loja' && <CheckCircle2 className="h-4 w-4 text-sky-400 shrink-0" />}
                </div>
                <p className="text-[10px] opacity-80 leading-relaxed font-medium">
                  Rua Afonso Pena, 295 - Centro, Caxias - MA.
                </p>
                <div className="mt-3 pt-2 border-t border-slate-800/40 text-[11px] font-black text-sky-400">
                  Frete GRÁTIS (R$ 0,00)
                </div>
              </button>
            </div>

            {/* Address Details Preview */}
            <div className={`p-3.5 rounded-2xl border text-xs font-medium ${
              isDark ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Endereço Selecionado:</span>
              {deliveryType === 'Entrega em Caxias-MA' ? (
                <p className="leading-snug">
                  {currentUser.endereco}, Nº {currentUser.numero || 'S/N'} - {currentUser.bairro || 'Centro'}, Caxias - MA
                </p>
              ) : (
                <p className="leading-snug text-sky-400 font-bold">
                  Loja Evidência Calçados: Rua Afonso Pena, 295 - Centro, Caxias - MA (Seg-Sex: 08h-18h | Sáb: 08h-13h)
                </p>
              )}
            </div>
          </div>

          {/* SECTION 2: FORMA DE PAGAMENTO */}
          <div className="space-y-3">
            <h4 className={`text-xs font-black uppercase tracking-wider flex items-center space-x-2 ${
              isDark ? 'text-amber-400' : 'text-slate-900'
            }`}>
              <CreditCard className="h-4 w-4" />
              <span>2. Escolha a Forma de Pagamento</span>
            </h4>

            <div className="space-y-2">
              {/* Pix */}
              <button
                type="button"
                onClick={() => setPaymentMethod('Pix')}
                className={`w-full flex items-center justify-between p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                  paymentMethod === 'Pix'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-sm'
                    : isDark ? 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700' : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Zap className="h-4 w-4 text-emerald-400" />
                  <span>Pix (Aprovação Instantânea)</span>
                </div>
                {paymentMethod === 'Pix' && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
              </button>

              {/* Cartão de Crédito */}
              <button
                type="button"
                onClick={() => setPaymentMethod('Cartão de Crédito')}
                className={`w-full flex items-center justify-between p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                  paymentMethod === 'Cartão de Crédito'
                    ? 'border-sky-500 bg-sky-500/10 text-sky-400 shadow-sm'
                    : isDark ? 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700' : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <CreditCard className="h-4 w-4 text-sky-400" />
                  <span>Cartão de Crédito</span>
                </div>
                {paymentMethod === 'Cartão de Crédito' && <CheckCircle2 className="h-4 w-4 text-sky-400" />}
              </button>

              {/* Crediário da Loja */}
              <button
                type="button"
                onClick={() => {
                  if (isCrediarioApproved) {
                    setPaymentMethod('Crediário da Loja');
                  }
                }}
                disabled={!isCrediarioApproved}
                className={`w-full flex flex-col items-start p-3 rounded-2xl border text-xs transition-all ${
                  paymentMethod === 'Crediário da Loja'
                    ? 'border-amber-400 bg-amber-400/10 text-amber-300 shadow-sm'
                    : isDark ? 'border-slate-800 bg-slate-950/60 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'
                } ${!isCrediarioApproved ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="w-full flex items-center justify-between font-bold">
                  <div className="flex items-center space-x-2.5">
                    <ShieldCheck className="h-4 w-4 text-amber-400" />
                    <span>Crediário Próprio Evidência</span>
                  </div>

                  {isCrediarioApproved ? (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Aprovado
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      Requer Análise no Admin
                    </span>
                  )}
                </div>

                {!isCrediarioApproved && (
                  <p className="mt-1.5 text-[10px] text-amber-300/80 font-medium leading-relaxed">
                    Opção bloqueada. Seu crediário precisa ser analisado e aprovado pelo administrador.
                  </p>
                )}
              </button>
            </div>
          </div>

          {/* SECTION 3: RESUMO DE VALORES */}
          <div className={`p-4 rounded-2xl border space-y-2 text-xs font-semibold ${
            isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}>
            <div className="flex justify-between">
              <span>Subtotal ({cartItemsCount} itens):</span>
              <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
            </div>

            <div className="flex justify-between items-center">
              <span>Taxa de Frete:</span>
              <span className={freightCost === 0 ? 'text-emerald-400 font-extrabold' : ''}>
                {freightCost === 0 ? 'GRÁTIS' : 'R$ 10,00'}
              </span>
            </div>

            <div className="flex justify-between text-sm font-black pt-2 border-t border-slate-800 text-amber-400">
              <span>Total Geral:</span>
              <span>R$ {grandTotal.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>

          {/* Confirm Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleConfirmClick}
              disabled={isProcessing}
              className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center space-x-2"
            >
              <MessageSquare className="h-5 w-5" />
              <span>{isProcessing ? 'Gerando Pedido...' : 'CONFIRMAR E GERAR PEDIDO NO WHATSAPP'}</span>
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  );
};
