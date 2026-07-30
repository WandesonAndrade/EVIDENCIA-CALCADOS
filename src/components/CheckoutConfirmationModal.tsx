import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { UserProfile } from '../types';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { 
  X, CheckCircle2, Truck, ShoppingBag, Zap, CreditCard, 
  ShieldCheck, MapPin, Info, ArrowRight, MessageSquare, Sparkles, User
} from 'lucide-react';
import { motion } from 'motion/react';

interface CheckoutConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
  cartItemsCount: number;
  onConfirmOrder: (
    paymentMethod: 'Pix' | 'Cartão de Crédito' | 'Crediário da Loja', 
    deliveryType: 'Entrega em Caxias-MA' | 'Entrega para Outras Cidades' | 'Retirada na Loja',
    installments?: number,
    sellerName?: string
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

  const [deliveryType, setDeliveryType] = useState<'Entrega em Caxias-MA' | 'Entrega para Outras Cidades' | 'Retirada na Loja'>('Entrega em Caxias-MA');
  const [paymentMethod, setPaymentMethod] = useState<'Pix' | 'Cartão de Crédito' | 'Crediário da Loja'>('Pix');
  const [installments, setInstallments] = useState<number>(1);
  const [crediarioInstallments, setCrediarioInstallments] = useState<number>(1);
  const [selectedSellerName, setSelectedSellerName] = useState<string>('Atendimento Direto da Loja');
  const [teamSellers, setTeamSellers] = useState<UserProfile[]>([]);

  useEffect(() => {
    let isMounted = true;
    firebaseAuthService.getActiveSellers().then((members) => {
      if (isMounted && members && members.length > 0) {
        setTeamSellers(members);
      }
    });
    return () => { isMounted = false; };
  }, []);

  if (!isOpen || !currentUser) return null;

  const isOtherCities = deliveryType === 'Entrega para Outras Cidades';
  // Calculate freight cost based on delivery choice
  const isFreeFreight = (subtotal > 100 && deliveryType === 'Entrega em Caxias-MA') || deliveryType === 'Retirada na Loja';
  const freightCost = (deliveryType === 'Retirada na Loja' || isOtherCities) ? 0 : (subtotal > 100 ? 0 : 10);
  
  // Cashback Auto-Discount
  const todayStr = new Date().toISOString().split('T')[0];
  const isCashbackValid = Boolean(
    currentUser?.cashbackBalance && 
    currentUser.cashbackBalance > 0 && 
    (!currentUser.cashbackValidUntil || currentUser.cashbackValidUntil >= todayStr)
  );
  const cashbackDiscount = isCashbackValid ? Math.min(currentUser.cashbackBalance || 0, subtotal + freightCost) : 0;
  const grandTotal = Math.max(0, subtotal + freightCost - cashbackDiscount);

  const isCrediarioApproved = currentUser.crediarioStatus === 'Aprovado';

  // Calculate installment options 1x up to 10x sem juros for Credit Card
  const installmentOptions = Array.from({ length: 10 }, (_, i) => {
    const count = i + 1;
    const value = grandTotal / count;
    return {
      count,
      value,
      label: count === 1
        ? `1x de R$ ${value.toFixed(2).replace('.', ',')} à vista`
        : `${count}x de R$ ${value.toFixed(2).replace('.', ',')} sem juros`
    };
  });

  // Calculate Crediario installment options 1x up to 6x sem juros
  const crediarioInstallmentOptions = Array.from({ length: 6 }, (_, i) => {
    const count = i + 1;
    const value = grandTotal / count;
    return {
      count,
      value,
      label: count === 1
        ? `1x de R$ ${value.toFixed(2).replace('.', ',')} no Carnê`
        : `${count}x de R$ ${value.toFixed(2).replace('.', ',')} sem juros no Carnê`
    };
  });

  const handleConfirmClick = () => {
    const selectedInstallments = paymentMethod === 'Cartão de Crédito' 
      ? installments 
      : (paymentMethod === 'Crediário da Loja' ? crediarioInstallments : 1);

    onConfirmOrder(
      paymentMethod, 
      deliveryType, 
      selectedInstallments,
      selectedSellerName !== 'Atendimento Direto da Loja' ? selectedSellerName : undefined
    );
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Entrega em Caxias */}
              <button
                type="button"
                onClick={() => setDeliveryType('Entrega em Caxias-MA')}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  deliveryType === 'Entrega em Caxias-MA'
                    ? 'border-amber-400 bg-amber-400/10 shadow-sm'
                    : isDark ? 'border-slate-800 bg-slate-950/60 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-extrabold text-[11px] flex items-center space-x-1">
                    <Truck className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span>Entrega Caxias</span>
                  </span>
                  {deliveryType === 'Entrega em Caxias-MA' && <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                </div>
                <p className="text-[9px] opacity-80 leading-snug font-medium">
                  Endereço urbano em Caxias - MA.
                </p>
                <div className="mt-2 pt-1.5 border-t border-slate-800/40 text-[10px] font-black text-emerald-400">
                  {subtotal > 100 ? 'Frete GRÁTIS' : 'Frete: R$ 10,00'}
                </div>
              </button>

              {/* Entrega para Outras Cidades */}
              <button
                type="button"
                onClick={() => setDeliveryType('Entrega para Outras Cidades')}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  deliveryType === 'Entrega para Outras Cidades'
                    ? 'border-emerald-400 bg-emerald-500/10 shadow-sm'
                    : isDark ? 'border-slate-800 bg-slate-950/60 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-extrabold text-[11px] flex items-center space-x-1">
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>Outras Cidades</span>
                  </span>
                  {deliveryType === 'Entrega para Outras Cidades' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                </div>
                <p className="text-[9px] opacity-80 leading-snug font-medium">
                  Envio para todo Brasil.
                </p>
                <div className="mt-2 pt-1.5 border-t border-slate-800/40 text-[10px] font-black text-emerald-400">
                  Frete a Combinar
                </div>
              </button>

              {/* Retirada na Loja */}
              <button
                type="button"
                onClick={() => setDeliveryType('Retirada na Loja')}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  deliveryType === 'Retirada na Loja'
                    ? 'border-sky-400 bg-sky-400/10 shadow-sm'
                    : isDark ? 'border-slate-800 bg-slate-950/60 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-extrabold text-[11px] flex items-center space-x-1">
                    <MapPin className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                    <span>Retirada Loja</span>
                  </span>
                  {deliveryType === 'Retirada na Loja' && <CheckCircle2 className="h-3.5 w-3.5 text-sky-400 shrink-0" />}
                </div>
                <p className="text-[9px] opacity-80 leading-snug font-medium">
                  Retire no Centro.
                </p>
                <div className="mt-2 pt-1.5 border-t border-slate-800/40 text-[10px] font-black text-sky-400">
                  Frete GRÁTIS
                </div>
              </button>
            </div>

            {/* Address Details & Freight Notice Preview */}
            <div className={`p-3.5 rounded-2xl border text-xs font-medium space-y-2 ${
              isDark ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Endereço & Localidade Selecionada:</span>
              {deliveryType === 'Entrega em Caxias-MA' ? (
                <p className="leading-snug">
                  {currentUser.endereco}, Nº {currentUser.numero || 'S/N'} - {currentUser.bairro || 'Centro'}, Caxias - MA
                </p>
              ) : deliveryType === 'Entrega para Outras Cidades' ? (
                <div className="space-y-2">
                  <p className="leading-snug text-emerald-400 font-bold">
                    {currentUser.endereco ? `${currentUser.endereco}, Nº ${currentUser.numero || 'S/N'} - ${currentUser.bairro || ''}, ${currentUser.cidade || ''}/${currentUser.uf || ''}` : 'Entrega para outra localidade'}
                  </p>
                  <div className="pt-1 border-t border-slate-800/40">
                    <span className="text-[11px] text-amber-400 font-bold">💬 Frete a combinar / sob consulta (será ajustado no atendimento)</span>
                  </div>
                </div>
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
              <div className="space-y-2">
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
                    <span>Cartão de Crédito (até 10x sem juros)</span>
                  </div>
                  {paymentMethod === 'Cartão de Crédito' && <CheckCircle2 className="h-4 w-4 text-sky-400" />}
                </button>

                {/* Sub-Seletor de Parcelamento */}
                {paymentMethod === 'Cartão de Crédito' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className={`p-3.5 rounded-2xl border space-y-2 ${
                      isDark ? 'bg-sky-500/10 border-sky-500/30' : 'bg-sky-50 border-sky-200'
                    }`}
                  >
                    <label className="block text-xs font-bold text-sky-400">
                      Selecione o Parcelamento no Cartão:
                    </label>
                    <select
                      value={installments}
                      onChange={(e) => setInstallments(Number(e.target.value))}
                      className={`w-full p-2.5 rounded-xl text-xs font-bold border focus:outline-none cursor-pointer ${
                        isDark 
                          ? 'bg-slate-950 border-sky-500/40 text-slate-100' 
                          : 'bg-white border-sky-300 text-slate-900'
                      }`}
                    >
                      {installmentOptions.map((opt) => (
                        <option key={opt.count} value={opt.count}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-sky-300/90 font-medium">
                      ✓ Parcelamento sem juros em até 10x exclusivo Evidência Calçados.
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Crediário da Loja */}
              <div className="space-y-2">
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
                      <span>Crediário Próprio Evidência (até 6x sem juros)</span>
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

                {/* Sub-Seletor de Parcelamento no Crediário */}
                {paymentMethod === 'Crediário da Loja' && isCrediarioApproved && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className={`p-3.5 rounded-2xl border space-y-2 ${
                      isDark ? 'bg-amber-400/10 border-amber-400/30' : 'bg-amber-50 border-amber-200'
                    }`}
                  >
                    <label className="block text-xs font-bold text-amber-400">
                      Selecione o Parcelamento no Crediário:
                    </label>
                    <select
                      value={crediarioInstallments}
                      onChange={(e) => setCrediarioInstallments(Number(e.target.value))}
                      className={`w-full p-2.5 rounded-xl text-xs font-bold border focus:outline-none cursor-pointer ${
                        isDark 
                          ? 'bg-slate-950 border-amber-400/40 text-slate-100' 
                          : 'bg-white border-amber-300 text-slate-900'
                      }`}
                    >
                      {crediarioInstallmentOptions.map((opt) => (
                        <option key={opt.count} value={opt.count}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-amber-300/90 font-medium">
                      ✓ Parcelamento sem juros em até 6x no carnê exclusivo Evidência Calçados.
                    </p>
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 3: SELEÇÃO DE VENDEDOR (OPCIONAL) */}
          <div className="space-y-2">
            <h4 className={`text-xs font-black uppercase tracking-wider flex items-center space-x-2 ${
              isDark ? 'text-amber-400' : 'text-slate-900'
            }`}>
              <User className="h-4 w-4 text-amber-400 shrink-0" />
              <span>3. Selecione um vendedor</span>
            </h4>

            <div className={`p-4 rounded-2xl border transition-all ${
              isDark 
                ? 'bg-slate-900/60 border-slate-800 focus-within:border-amber-400/50' 
                : 'bg-slate-50 border-slate-200 focus-within:border-slate-800'
            }`}>
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1.5">
                Quem te atendeu ou indicou esta compra?
              </label>
              <div className="relative">
                <select
                  value={selectedSellerName}
                  onChange={(e) => setSelectedSellerName(e.target.value)}
                  className={`w-full p-3 rounded-xl text-xs font-bold border focus:outline-none cursor-pointer appearance-none pr-8 transition-all ${
                    isDark 
                      ? 'bg-slate-950 border-slate-800 text-amber-300 focus:border-amber-400' 
                      : 'bg-white border-slate-300 text-slate-900 focus:border-slate-800'
                  }`}
                >
                  <option value="Atendimento Direto da Loja">Sem indicação / Atendimento Direto da Loja</option>
                  {teamSellers.map((seller) => (
                    <option key={seller.uid || seller.email} value={seller.name}>
                      {seller.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-3 text-slate-400">
                  <User className="h-4 w-4 text-amber-400" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-2">
                Se você foi atendido por um de nossos colaboradores, selecione o nome dele para vincular o atendimento ao pedido.
              </p>
            </div>
          </div>


          {/* SECTION 4: RESUMO DE VALORES */}
          <div className={`p-4 rounded-2xl border space-y-2 text-xs font-semibold ${
            isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}>

            <div className="flex justify-between">
              <span>Subtotal ({cartItemsCount} itens):</span>
              <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
            </div>

            <div className="flex justify-between items-center">
              <span>Taxa de Frete:</span>
              <span className={isOtherCities ? 'text-amber-400 font-extrabold' : (freightCost === 0 ? 'text-emerald-400 font-extrabold' : '')}>
                {isOtherCities ? 'A COMBINAR' : (freightCost === 0 ? 'GRÁTIS' : 'R$ 10,00')}
              </span>
            </div>

            {cashbackDiscount > 0 && (
              <div className="flex justify-between items-center text-emerald-400 font-bold">
                <span className="flex items-center space-x-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Desconto Cashback Ativo:</span>
                </span>
                <span>- R$ {cashbackDiscount.toFixed(2).replace('.', ',')}</span>
              </div>
            )}

            <div className="flex justify-between text-sm font-black pt-2 border-t border-slate-800 text-amber-400">
              <span>Total Geral:</span>
              <span>R$ {grandTotal.toFixed(2).replace('.', ',')}</span>
            </div>

            {paymentMethod === 'Cartão de Crédito' && installments > 1 && (
              <div className="pt-2 border-t border-slate-800 text-[11px] font-bold text-sky-400 flex justify-between">
                <span>Plano Escolhido:</span>
                <span>{installments}x de R$ {(grandTotal / installments).toFixed(2).replace('.', ',')}</span>
              </div>
            )}
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
