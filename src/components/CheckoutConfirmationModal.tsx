import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { UserProfile, SavedAddress } from '../types';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { 
  X, CheckCircle2, Truck, ShoppingBag, Zap, CreditCard, 
  ShieldCheck, MapPin, Info, ArrowRight, MessageSquare, Sparkles, User, Edit3, Plus
} from 'lucide-react';
import { motion } from 'motion/react';

interface CheckoutConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
  cartItemsCount: number;
  initialDeliveryType?: 'Entrega em Caxias-MA' | 'Entrega para Outras Cidades' | 'Retirada na Loja';
  initialCityName?: string;
  onConfirmOrder: (
    paymentMethod: 'Pix' | 'Cartão de Crédito' | 'Crediário da Loja', 
    deliveryType: 'Entrega em Caxias-MA' | 'Entrega para Outras Cidades' | 'Retirada na Loja',
    installments?: number,
    sellerName?: string,
    customDeliveryAddress?: string
  ) => void;
  isProcessing: boolean;
}

export const CheckoutConfirmationModal: React.FC<CheckoutConfirmationModalProps> = ({
  isOpen,
  onClose,
  subtotal,
  cartItemsCount,
  initialDeliveryType,
  initialCityName,
  onConfirmOrder,
  isProcessing
}) => {
  const { currentUser, updateUserProfile, theme } = useApp();
  const isDark = theme === 'dark';

  const [deliveryType, setDeliveryType] = useState<'Entrega em Caxias-MA' | 'Entrega para Outras Cidades' | 'Retirada na Loja'>(initialDeliveryType || 'Entrega em Caxias-MA');

  useEffect(() => {
    if (initialDeliveryType) {
      setDeliveryType(initialDeliveryType);
    }
  }, [initialDeliveryType, isOpen]);

  // Estado para gestão de múltiplos endereços (Sem sobrescrever anteriores)
  const [selectedAddressId, setSelectedAddressId] = useState<string>('default');
  const [isAddingNewAddress, setIsAddingNewAddress] = useState<boolean>(false);
  const [newAddrForm, setNewAddrForm] = useState({
    label: '',
    rua: '',
    numero: '',
    bairro: '',
    cidade: 'Caxias',
    uf: 'MA',
    complemento: ''
  });

  const [otherCityName, setOtherCityName] = useState<string>(
    initialCityName || (currentUser?.cidade && currentUser.cidade !== 'Caxias' ? currentUser.cidade : '')
  );

  // Lista normalizada de todos os endereços salvos
  const defaultAddress: SavedAddress = {
    id: 'default',
    label: 'Endereço Cadastrado',
    rua: currentUser?.endereco || '',
    numero: currentUser?.numero || 'S/N',
    bairro: currentUser?.bairro || 'Centro',
    cidade: currentUser?.cidade || 'Caxias',
    uf: currentUser?.uf || 'MA',
  };

  const userSavedList: SavedAddress[] = currentUser?.savedAddresses || [];
  const allAddresses: SavedAddress[] = defaultAddress.rua 
    ? [defaultAddress, ...userSavedList]
    : userSavedList;

  // Atualiza nome da cidade quando initialCityName, currentUser ou modal abre
  useEffect(() => {
    if (initialCityName) {
      setOtherCityName(initialCityName);
    } else if (currentUser?.cidade && currentUser.cidade !== 'Caxias') {
      setOtherCityName(currentUser.cidade);
    }
  }, [initialCityName, currentUser, isOpen]);

  // Função para salvar novo endereço sem sobrescrever o antigo
  const handleSaveNewAddress = async () => {
    if (!newAddrForm.rua.trim() || !newAddrForm.bairro.trim()) {
      alert('Por favor, informe a Rua e o Bairro do novo endereço.');
      return;
    }

    const newAddrObj: SavedAddress = {
      id: 'addr_' + Date.now(),
      label: newAddrForm.label.trim() || `Endereço ${(currentUser?.savedAddresses?.length || 0) + 2}`,
      rua: newAddrForm.rua.trim(),
      numero: newAddrForm.numero.trim() || 'S/N',
      bairro: newAddrForm.bairro.trim(),
      cidade: deliveryType === 'Entrega para Outras Cidades' 
        ? (otherCityName.trim() || newAddrForm.cidade.trim() || 'Outra Cidade')
        : (newAddrForm.cidade.trim() || 'Caxias'),
      uf: newAddrForm.uf.trim() || 'MA',
      complemento: newAddrForm.complemento.trim(),
    };

    const updatedAddresses = [...(currentUser?.savedAddresses || []), newAddrObj];
    try {
      await updateUserProfile({ savedAddresses: updatedAddresses });
      setSelectedAddressId(newAddrObj.id);
      setIsAddingNewAddress(false);
      setNewAddrForm({
        label: '',
        rua: '',
        numero: '',
        bairro: '',
        cidade: 'Caxias',
        uf: 'MA',
        complemento: ''
      });
    } catch (error) {
      console.error("Erro ao salvar endereço:", error);
    }
  };

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

    const activeAddressObj = allAddresses.find(a => a.id === selectedAddressId) || allAddresses[0] || defaultAddress;

    const formattedAddress = deliveryType === 'Retirada na Loja'
      ? 'Retirada na Loja: Rua Afonso Pena, 295 - Centro, Caxias - MA'
      : deliveryType === 'Entrega para Outras Cidades'
      ? `${activeAddressObj?.rua ? `${activeAddressObj.rua}, Nº ${activeAddressObj.numero || 'S/N'} - ${activeAddressObj.bairro || ''}, ` : ''}${otherCityName || activeAddressObj?.cidade || 'Outra Cidade'}/${activeAddressObj?.uf || 'MA'}`
      : `${activeAddressObj?.rua || 'Centro'}, Nº ${activeAddressObj?.numero || 'S/N'} - ${activeAddressObj?.bairro || 'Centro'}, Caxias - MA`;

    onConfirmOrder(
      paymentMethod, 
      deliveryType, 
      selectedInstallments,
      selectedSellerName !== 'Atendimento Direto da Loja' ? selectedSellerName : undefined,
      formattedAddress
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
          isDark ? 'bg-[#161617] border-white/10 text-white shadow-black/80' : 'bg-white border-black/10 text-slate-900 shadow-2xl'
        }`}
      >
        {/* Header Elegante e Limpo Estilo Apple */}
        <div className="bg-[#1d1d1f] p-5 text-white flex items-center justify-between border-b border-white/10 shadow-sm">
          <div>
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-[#0071e3]">
                <ShoppingBag className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-base font-extrabold tracking-tight">Confirmação de Pedido</h3>
            </div>
            <p className="text-[11px] text-slate-300 font-medium pt-0.5">
              Escolha a forma de entrega e pagamento para finalizar
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* SECTION 1: OPÇÕES DE ENTREGA */}
          <div className="space-y-3">
            <h4 className={`text-xs font-black uppercase tracking-wider flex items-center space-x-2 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              <Truck className="h-4 w-4 text-[#0071e3]" />
              <span>1. Escolha a Modalidade de Entrega</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Entrega em Caxias */}
              <button
                type="button"
                onClick={() => setDeliveryType('Entrega em Caxias-MA')}
                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  deliveryType === 'Entrega em Caxias-MA'
                    ? 'border-2 border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20 shadow-xs'
                    : isDark ? 'border-white/10 bg-[#1d1d1f] text-slate-300 hover:border-white/20' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-extrabold text-[11px] flex items-center space-x-1.5">
                    <Truck className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span className={deliveryType === 'Entrega em Caxias-MA' ? (isDark ? 'text-white' : 'text-slate-900') : ''}>Entrega Caxias</span>
                  </span>
                  {deliveryType === 'Entrega em Caxias-MA' && <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                </div>
                <p className="text-[10px] opacity-80 leading-snug font-medium">
                  Endereço urbano em Caxias - MA.
                </p>
                <div className="mt-2.5 pt-1.5 border-t border-slate-200 dark:border-white/10 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                  {subtotal > 100 ? 'Frete GRÁTIS' : 'Frete: R$ 10,00'}
                </div>
              </button>

              {/* Entrega para Outras Cidades */}
              <button
                type="button"
                onClick={() => setDeliveryType('Entrega para Outras Cidades')}
                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  deliveryType === 'Entrega para Outras Cidades'
                    ? 'border-2 border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20 shadow-xs'
                    : isDark ? 'border-white/10 bg-[#1d1d1f] text-slate-300 hover:border-white/20' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-extrabold text-[11px] flex items-center space-x-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span className={deliveryType === 'Entrega para Outras Cidades' ? (isDark ? 'text-white' : 'text-slate-900') : ''}>Outras Cidades</span>
                  </span>
                  {deliveryType === 'Entrega para Outras Cidades' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                </div>
                <p className="text-[10px] opacity-80 leading-snug font-medium">
                  Envio para todo Brasil.
                </p>
                <div className="mt-2.5 pt-1.5 border-t border-slate-200 dark:border-white/10 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                  Frete a Combinar
                </div>
              </button>

              {/* Retirada na Loja */}
              <button
                type="button"
                onClick={() => setDeliveryType('Retirada na Loja')}
                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  deliveryType === 'Retirada na Loja'
                    ? 'border-2 border-sky-500 bg-sky-500/10 ring-2 ring-sky-500/20 shadow-xs'
                    : isDark ? 'border-white/10 bg-[#1d1d1f] text-slate-300 hover:border-white/20' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-extrabold text-[11px] flex items-center space-x-1.5">
                    <MapPin className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                    <span className={deliveryType === 'Retirada na Loja' ? (isDark ? 'text-white' : 'text-slate-900') : ''}>Retirada Loja</span>
                  </span>
                  {deliveryType === 'Retirada na Loja' && <CheckCircle2 className="h-3.5 w-3.5 text-sky-500 shrink-0" />}
                </div>
                <p className="text-[9px] opacity-80 leading-snug font-medium">
                  Retire no Centro.
                </p>
                <div className="mt-2.5 pt-1.5 border-t border-slate-200 dark:border-white/10 text-[10px] font-black text-sky-600 dark:text-sky-400">
                  Frete GRÁTIS
                </div>
              </button>
            </div>

            {/* Address Details & Saved Multi-Address Selection */}
            <div className={`p-4 rounded-2xl border text-xs space-y-3 ${
              isDark ? 'bg-slate-950/80 border-white/10 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}>
              <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-white/10">
                <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                  Endereço & Localidade Selecionada:
                </span>
                {deliveryType !== 'Retirada na Loja' && (
                  <button 
                    type="button" 
                    onClick={() => setIsAddingNewAddress(!isAddingNewAddress)} 
                    className="text-[#0071e3] hover:underline font-extrabold flex items-center gap-1 cursor-pointer text-[11px]"
                  >
                    <Plus className="h-3.5 w-3.5 text-[#0071e3]" />
                    {isAddingNewAddress ? 'Cancelar' : '+ Novo Endereço'}
                  </button>
                )}
              </div>

              {/* RETIRADA NA LOJA */}
              {deliveryType === 'Retirada na Loja' ? (
                <div className="space-y-1">
                  <p className="leading-snug text-sky-600 dark:text-sky-400 font-extrabold text-xs flex items-start gap-1.5">
                    <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-sky-500" />
                    <span>Loja Evidência Calçados: Rua Afonso Pena, 295 - Centro, Caxias - MA</span>
                  </p>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block pt-0.5 font-medium">
                    (Horário de funcionamento: Seg-Sex: 08h-18h | Sáb: 08h-13h)
                  </span>
                </div>
              ) : (
                /* ENTREGA CAXIAS OU OUTRAS CIDADES: SELEÇÃO E CADASTRO DE NOVO ENDEREÇO */
                <div className="space-y-3">
                  {deliveryType === 'Entrega para Outras Cidades' && (
                    <div className="space-y-1">
                      <label className="block text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                        📍 Informe o Nome da Outra Cidade de Destino:
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: São Luís - MA, Teresina - PI, Imperatriz - MA..."
                        value={otherCityName}
                        onChange={(e) => setOtherCityName(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl text-xs border font-bold focus:outline-none transition-all ${
                          isDark ? 'bg-slate-900 border-emerald-500/40 text-white focus:border-emerald-400' : 'bg-white border-emerald-300 text-slate-900 focus:border-emerald-500'
                        }`}
                      />
                    </div>
                  )}

                  {/* FORMULÁRIO DE CADASTRO DE NOVO ENDEREÇO (SEM SOBRESCREVER OS ANTERIORES) */}
                  {isAddingNewAddress ? (
                    <div className={`p-3.5 rounded-2xl border space-y-2.5 shadow-sm ${
                      isDark ? 'bg-slate-900 border-[#0071e3]/40' : 'bg-white border-[#0071e3]/30'
                    }`}>
                      <span className="text-xs font-extrabold text-[#0071e3] block flex items-center gap-1">
                        <Plus className="h-3.5 w-3.5" />
                        Cadastrar Novo Endereço de Entrega
                      </span>

                      <div className="space-y-2 text-xs">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Identificação do Local (Opcional):</label>
                          <input
                            type="text"
                            placeholder="Ex: Minha Casa 2, Trabalho, Casa da Praia..."
                            value={newAddrForm.label}
                            onChange={(e) => setNewAddrForm({ ...newAddrForm, label: e.target.value })}
                            className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${
                              isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Rua / Logradouro:*</label>
                          <input
                            type="text"
                            placeholder="Ex: Rua das Flores"
                            value={newAddrForm.rua}
                            onChange={(e) => setNewAddrForm({ ...newAddrForm, rua: e.target.value })}
                            className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${
                              isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                            }`}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Número:*</label>
                            <input
                              type="text"
                              placeholder="Ex: 123 ou S/N"
                              value={newAddrForm.numero}
                              onChange={(e) => setNewAddrForm({ ...newAddrForm, numero: e.target.value })}
                              className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${
                                isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                              }`}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Bairro:*</label>
                            <input
                              type="text"
                              placeholder="Ex: Renascença"
                              value={newAddrForm.bairro}
                              onChange={(e) => setNewAddrForm({ ...newAddrForm, bairro: e.target.value })}
                              className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${
                                isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                              }`}
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveNewAddress}
                        className="w-full py-2.5 bg-[#00a650] hover:bg-[#009146] text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer transition-all mt-1"
                      >
                        Salvar e Selecionar Novo Endereço
                      </button>
                    </div>
                  ) : (
                    /* LISTA DE ENDEREÇOS SALVOS PARA SELEÇÃO COM ALTO CONTRASTE */
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">
                        Escolha entre seus endereços salvos:
                      </span>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {allAddresses.map((addr) => {
                          const isSelected = selectedAddressId === addr.id;
                          return (
                            <div
                              key={addr.id}
                              onClick={() => setSelectedAddressId(addr.id)}
                              className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start justify-between ${
                                isSelected
                                  ? 'border-2 border-emerald-500 bg-emerald-500/10 text-slate-900 dark:text-white font-extrabold shadow-xs ring-1 ring-emerald-500/30'
                                  : isDark 
                                  ? 'border-white/10 bg-slate-900 text-slate-200 hover:border-white/20' 
                                  : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                              }`}
                            >
                              <div className="space-y-0.5">
                                <span className={`font-extrabold block text-[11px] ${
                                  isSelected ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                                }`}>
                                  📍 {addr.label || 'Endereço Salvo'}
                                </span>
                                <p className={`text-[11px] font-bold leading-snug ${
                                  isSelected ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'
                                }`}>
                                  {addr.rua}, Nº {addr.numero} - {addr.bairro}, {addr.cidade}/{addr.uf}
                                </p>
                              </div>
                              {isSelected && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {deliveryType === 'Entrega para Outras Cidades' && (
                    <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center space-x-1.5 text-[11px] text-emerald-700 dark:text-amber-400 font-bold">
                      <MessageSquare className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-amber-400" />
                      <span>💬 Frete a combinar / sob consulta via WhatsApp para {otherCityName || 'a cidade informada'}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: FORMA DE PAGAMENTO */}
          <div className="space-y-3">
            <h4 className={`text-xs font-black uppercase tracking-wider flex items-center space-x-2 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              <CreditCard className="h-4 w-4 text-[#0071e3]" />
              <span>2. Escolha a Forma de Pagamento</span>
            </h4>

            <div className="space-y-2">
              {/* Pix */}
              <button
                type="button"
                onClick={() => setPaymentMethod('Pix')}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-xs font-extrabold transition-all cursor-pointer ${
                  paymentMethod === 'Pix'
                    ? 'border-2 border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shadow-xs'
                    : isDark ? 'border-white/10 bg-[#1d1d1f] text-slate-200 hover:border-white/20' : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Zap className="h-4 w-4 text-emerald-500" />
                  <span>Pix (Aprovação Instantânea)</span>
                </div>
                {paymentMethod === 'Pix' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
              </button>

              {/* Cartão de Crédito */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('Cartão de Crédito')}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-xs font-extrabold transition-all cursor-pointer ${
                    paymentMethod === 'Cartão de Crédito'
                      ? 'border-2 border-[#0071e3] bg-[#0071e3]/10 text-[#0071e3] dark:text-sky-400 shadow-xs'
                      : isDark ? 'border-white/10 bg-[#1d1d1f] text-slate-200 hover:border-white/20' : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <CreditCard className="h-4 w-4 text-[#0071e3]" />
                    <span>Cartão de Crédito (até 10x sem juros)</span>
                  </div>
                  {paymentMethod === 'Cartão de Crédito' && <CheckCircle2 className="h-4 w-4 text-[#0071e3]" />}
                </button>

                {/* Sub-Seletor de Parcelamento */}
                {paymentMethod === 'Cartão de Crédito' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className={`p-3.5 rounded-2xl border space-y-2 ${
                      isDark ? 'bg-[#0071e3]/10 border-[#0071e3]/30' : 'bg-sky-50 border-sky-200'
                    }`}
                  >
                    <label className="block text-xs font-extrabold text-[#0071e3] dark:text-sky-400">
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
                    <p className="text-[10px] text-sky-700 dark:text-sky-300 font-medium">
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
                  className={`w-full flex flex-col items-start p-3.5 rounded-2xl border text-xs transition-all ${
                    paymentMethod === 'Crediário da Loja'
                      ? 'border-2 border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400 shadow-xs'
                      : isDark ? 'border-white/10 bg-[#1d1d1f] text-slate-200' : 'border-slate-200 bg-white text-slate-800'
                  } ${!isCrediarioApproved ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="w-full flex items-center justify-between font-bold">
                    <div className="flex items-center space-x-2.5">
                      <ShieldCheck className="h-4 w-4 text-amber-500" />
                      <span>Crediário Próprio Evidência (até 6x sem juros)</span>
                    </div>

                    {isCrediarioApproved ? (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500 text-white shadow-xs">
                        Aprovado
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        Requer Análise no Admin
                      </span>
                    )}
                  </div>

                  {!isCrediarioApproved && (
                    <p className="mt-1.5 text-[10px] text-amber-700 dark:text-amber-300 font-medium leading-relaxed">
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
                    <label className="block text-xs font-bold text-amber-600 dark:text-amber-400">
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
                    <p className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">
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
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              <User className="h-4 w-4 text-[#0071e3] shrink-0" />
              <span>3. Selecione um vendedor</span>
            </h4>

            <div className={`p-4 rounded-2xl border transition-all ${
              isDark 
                ? 'bg-[#1d1d1f] border-white/10' 
                : 'bg-slate-50 border-slate-200'
            }`}>
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 block mb-1.5">
                Quem te atendeu ou indicou esta compra?
              </label>
              <div className="relative">
                <select
                  value={selectedSellerName}
                  onChange={(e) => setSelectedSellerName(e.target.value)}
                  className={`w-full p-3 rounded-xl text-xs font-bold border focus:outline-none cursor-pointer appearance-none pr-8 transition-all ${
                    isDark 
                      ? 'bg-slate-950 border-white/20 text-white focus:border-[#0071e3]' 
                      : 'bg-white border-slate-300 text-slate-900 focus:border-[#0071e3]'
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
                  <User className="h-4 w-4 text-[#0071e3]" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-2">
                Se você foi atendido por um de nossos colaboradores, selecione o nome dele para vincular o atendimento ao pedido.
              </p>
            </div>
          </div>


          {/* SECTION 4: RESUMO DE VALORES */}
          <div className={`p-4.5 rounded-2xl border space-y-2.5 text-xs font-semibold ${
            isDark ? 'bg-[#1d1d1f] border-white/10 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}>

            <div className="flex justify-between">
              <span>Subtotal ({cartItemsCount} itens):</span>
              <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
            </div>

            <div className="flex justify-between items-center">
              <span>Taxa de Frete:</span>
              <span className={isOtherCities ? 'text-amber-600 dark:text-amber-400 font-extrabold' : (freightCost === 0 ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : '')}>
                {isOtherCities ? 'A COMBINAR' : (freightCost === 0 ? 'GRÁTIS' : 'R$ 10,00')}
              </span>
            </div>

            {cashbackDiscount > 0 && (
              <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-extrabold">
                <span className="flex items-center space-x-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Desconto Cashback Ativo:</span>
                </span>
                <span>- R$ {cashbackDiscount.toFixed(2).replace('.', ',')}</span>
              </div>
            )}

            <div className="flex justify-between text-sm font-black pt-2.5 border-t border-slate-200 dark:border-white/10 text-emerald-600 dark:text-emerald-400">
              <span>Total Geral:</span>
              <span>R$ {grandTotal.toFixed(2).replace('.', ',')}</span>
            </div>

            {paymentMethod === 'Cartão de Crédito' && installments > 1 && (
              <div className="pt-2 border-t border-slate-200 dark:border-white/10 text-[11px] font-bold text-[#0071e3] flex justify-between">
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
              className="w-full py-4 px-6 bg-[#00a650] hover:bg-[#009146] text-white font-extrabold text-xs sm:text-sm uppercase tracking-wide rounded-2xl shadow-md disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center space-x-2.5"
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
