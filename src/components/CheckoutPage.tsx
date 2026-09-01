import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { UserProfile, SavedAddress, PaymentStatus } from '../types';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { CompleteProfileModal } from './CompleteProfileModal';
import { PaymentForm } from './PaymentForm';
import { 
  CheckCircle2, Truck, ShoppingBag, CreditCard, 
  ShieldCheck, MapPin, MessageSquare, User, Edit3, Plus, Loader2, ArrowLeft, Lock, Package, Store
} from 'lucide-react';
import { motion } from 'motion/react';
import { cepService } from '../services/cepService';
import { ShippingCalculator } from './common/ShippingCalculator';
import { IShippingOption } from '../services/shipping/shippingProvider.interface';
import { isProfileIncomplete } from '../App';

export const CheckoutPage: React.FC = () => {
  const { 
    currentUser, 
    updateUserProfile, 
    theme, 
    sellers = [], 
    cart,
    setCurrentView,
    createOrder
  } = useApp();
  
  const isDark = theme === 'dark';

  const [isProcessing, setIsProcessing] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any | null>(null);
  const [deliveryType, setDeliveryType] = useState<'Entrega no Endereço' | 'Retirada na Loja'>('Entrega no Endereço');

  // Se não houver carrinho, redireciona para a home
  useEffect(() => {
    if (cart.length === 0 && !createdOrder) {
      setCurrentView('home');
    }
  }, [cart.length, createdOrder, setCurrentView]);

  // Estado para edição de dados do perfil e gestão de múltiplos endereços
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('default');
  const [selectedShippingOption, setSelectedShippingOption] = useState<IShippingOption | null>(null);
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

  const [checkoutCep, setCheckoutCep] = useState<string>('');
  const [isLoadingCheckoutCep, setIsLoadingCheckoutCep] = useState<boolean>(false);

  const handleCheckoutCepChange = async (val: string) => {
    const raw = val.replace(/\D/g, '');
    let formatted = raw;
    if (raw.length > 5) {
      formatted = `${raw.slice(0, 5)}-${raw.slice(5, 8)}`;
    }
    setCheckoutCep(formatted);

    if (raw.length === 8) {
      setIsLoadingCheckoutCep(true);
      const res = await cepService.fetchAddressByCep(raw);
      setIsLoadingCheckoutCep(false);
      if (res) {
        setNewAddrForm(prev => ({
          ...prev,
          rua: res.logradouro || prev.rua,
          bairro: res.bairro || prev.bairro,
          cidade: res.localidade || prev.cidade,
          uf: res.uf || prev.uf
        }));
        if (res.localidade && res.localidade !== 'Caxias') {
          setOtherCityName(res.localidade);
        }
      }
    }
  };

  const [otherCityName, setOtherCityName] = useState<string>(
    (currentUser?.cidade && currentUser.cidade !== 'Caxias') ? currentUser.cidade : ''
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
    cep: currentUser?.cep || '',
  };

  const userSavedList: SavedAddress[] = currentUser?.savedAddresses || [];
  const allAddresses: SavedAddress[] = defaultAddress.rua 
    ? [defaultAddress, ...userSavedList]
    : userSavedList;

  // Sincroniza cidade e verifica se o cliente possui endereço salvo ao abrir
  useEffect(() => {
    if (currentUser?.cidade && currentUser.cidade !== 'Caxias') {
      setOtherCityName(currentUser.cidade);
    }
    if (allAddresses.length === 0) {
      setIsAddingNewAddress(true);
    }
  }, [currentUser, allAddresses.length]);

  const handleSaveNewAddress = async () => {
    if (!newAddrForm.rua.trim() || !newAddrForm.bairro.trim()) {
      alert('Por favor, informe a Rua e o Bairro do novo endereço.');
      return;
    }

    const targetCity = newAddrForm.cidade.trim() || otherCityName.trim() || 'Caxias';

    const newAddrObj: SavedAddress = {
      id: 'addr_' + Date.now(),
      label: newAddrForm.label.trim() || (allAddresses.length === 0 ? 'Endereço Principal' : `Endereço ${allAddresses.length + 1}`),
      rua: newAddrForm.rua.trim(),
      numero: newAddrForm.numero.trim() || 'S/N',
      bairro: newAddrForm.bairro.trim(),
      cidade: targetCity,
      uf: newAddrForm.uf.trim() || 'MA',
      complemento: newAddrForm.complemento.trim(),
    };

    const updatedAddresses = [...(currentUser?.savedAddresses || []), newAddrObj];
    const isFirstAddress = !currentUser?.endereco;

    const profileDataToSave: Partial<UserProfile> = {
      savedAddresses: updatedAddresses
    };

    if (isFirstAddress) {
      profileDataToSave.endereco = newAddrObj.rua;
      profileDataToSave.numero = newAddrObj.numero;
      profileDataToSave.bairro = newAddrObj.bairro;
      profileDataToSave.cidade = newAddrObj.cidade;
      profileDataToSave.uf = newAddrObj.uf;
    }

    try {
      await updateUserProfile(profileDataToSave);
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

  const [paymentGroup, setPaymentGroup] = useState<'Online' | 'Crediário'>('Online');
  const [onlineTab, setOnlineTab] = useState<'pix' | 'credit'>('credit');
  const [installments, setInstallments] = useState<number>(1);
  const [crediarioInstallments, setCrediarioInstallments] = useState<number>(1);
  const [selectedSellerName, setSelectedSellerName] = useState<string>('Atendimento Direto da Loja');
  const [teamSellers, setTeamSellers] = useState<UserProfile[]>([]);
  
  const paymentMethod = paymentGroup === 'Crediário' ? 'Crediário da Loja' 
    : (onlineTab === 'pix' ? 'Pix' : 'Cartão de Crédito');

  useEffect(() => {
    let isMounted = true;
    firebaseAuthService.getActiveSellers().then((members) => {
      if (isMounted && members && members.length > 0) {
        setTeamSellers(members);
      }
    });
    return () => { isMounted = false; };
  }, []);

  if (!currentUser) {
    // Evitar render no curto espaço de redirecionamento do useEffect
    return null;
  }

  const getCalculatedPrice = (item: any, pMethod: string) => {
    const p = item.product;
    if (pMethod === 'Pix') {
      const pVista = p.precoVista ?? p.preco_vista ?? p.precoAvista ?? p.priceCash ?? p.pricePix;
      return typeof pVista === 'number' && pVista > 0 ? pVista : (p.price > 0 ? Math.round(p.price * 0.9 * 100) / 100 : p.price);
    } else if (pMethod === 'Cartão de Crédito' || pMethod === 'Cartão de Débito') {
      const pCartao = p.precoCartao ?? p.preco_cartao ?? p.priceCard;
      return typeof pCartao === 'number' && pCartao > 0 ? pCartao : (p.price > 0 ? Math.round(p.price * 0.9 * 100) / 100 : p.price);
    } else {
      return p.price; // Crediário / Default
    }
  };

  // Preço Base
  const subtotal = cart.reduce((sum, item) => sum + getCalculatedPrice(item, paymentMethod) * item.quantity, 0);
  const originalSubtotal = cart.reduce((sum, item) => {
    const calcPrice = getCalculatedPrice(item, paymentMethod);
    const origPrice = item.product.originalPrice && item.product.originalPrice > calcPrice 
      ? item.product.originalPrice 
      : calcPrice;
    return sum + origPrice * item.quantity;
  }, 0);
  const totalDiscount = originalSubtotal - subtotal;
  
  const activeSubtotal = subtotal;

  const freightCost = deliveryType === 'Retirada na Loja'
    ? 0
    : (selectedShippingOption ? selectedShippingOption.price : 0);
  
  const todayStr = new Date().toISOString().split('T')[0];
  const isCashbackValid = Boolean(
    currentUser?.cashbackBalance && 
    currentUser.cashbackBalance > 0 && 
    (!currentUser.cashbackValidUntil || currentUser.cashbackValidUntil >= todayStr)
  );
  const cashbackDiscount = isCashbackValid ? Math.min(currentUser.cashbackBalance || 0, activeSubtotal + freightCost) : 0;
  const grandTotal = Math.max(0, activeSubtotal + freightCost - cashbackDiscount);

  const isCrediarioApproved = currentUser.crediarioStatus === 'Aprovado';

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

  const handleConfirmOrder = async (pixPaymentId?: number | string, customPaymentStatus?: PaymentStatus) => {
    const selectedInstallments = paymentMethod === 'Cartão de Crédito' 
      ? installments 
      : (paymentMethod === 'Crediário da Loja' ? crediarioInstallments : 1);

    const activeAddressObj = allAddresses.find(a => a.id === selectedAddressId) || allAddresses[0] || defaultAddress;

    const formattedAddress = deliveryType === 'Retirada na Loja'
      ? 'Retirada na Loja: Rua Afonso Pena, 295 - Centro, Caxias - MA'
      : `${activeAddressObj?.rua || ''}, Nº ${activeAddressObj?.numero || 'S/N'} - ${activeAddressObj?.bairro || ''}, ${activeAddressObj?.cidade || otherCityName || 'Caxias'}/${activeAddressObj?.uf || 'MA'}${activeAddressObj?.cep ? ` (CEP: ${activeAddressObj.cep})` : ''}`;

    try {
      setIsProcessing(true);
      const determinedPaymentStatus: PaymentStatus = customPaymentStatus || (
        paymentMethod === 'Pix' ? 'Pendente' : (paymentMethod === 'Crediário da Loja' ? 'Pendente' : 'Confirmado')
      );
      const determinedStatus = determinedPaymentStatus === 'Confirmado' ? 'Confirmado' : 'Pendente';

      const order = await createOrder(currentUser.name, currentUser.email, {
        paymentMethod,
        deliveryType,
        installments: selectedInstallments,
        sellerName: selectedSellerName !== 'Atendimento Direto da Loja' ? selectedSellerName : undefined,
        customerPhone: currentUser.telefone || '',
        customerCpf: currentUser.cpf || '',
        customerCep: activeAddressObj?.cep || currentUser.cep || '65600060',
        customerNumero: activeAddressObj?.numero || currentUser.numero || 'S/N',
        customerBairro: activeAddressObj?.bairro || currentUser.bairro || 'Centro',
        city: activeAddressObj?.cidade || otherCityName || currentUser.cidade || 'Caxias',
        deliveryAddress: formattedAddress,
        freightCost: freightCost,
        paymentStatus: determinedPaymentStatus,
        status: determinedStatus,
        paymentId: pixPaymentId,
      });

      setCreatedOrder(order);
      window.open(order.whatsappUrl, '_blank');
    } catch (error) {
      console.error("Failed to finalize order:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // TELA DE SUCESSO
  if (createdOrder) {
    return (
      <div className={`min-h-screen pt-20 px-4 ${isDark ? 'bg-[#050b18]' : 'bg-slate-50'}`}>
        <div className="max-w-xl mx-auto py-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-8 sm:p-10 rounded-3xl border backdrop-blur-xl text-center space-y-6 shadow-2xl ${
              isDark ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xl'
            }`}
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="h-8 w-8" />
            </div>
  
            <div className="space-y-2">
              <h2 className={`text-2xl font-black ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                Pedido Confirmado!
              </h2>
              <p className="text-sm font-mono text-emerald-500 font-extrabold">
                Pedido #{createdOrder.orderNumber || createdOrder.id}
              </p>
              <p className={`text-sm font-medium max-w-sm mx-auto ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Seu pedido foi registrado. Nós abrimos o WhatsApp para você concluir o atendimento.
              </p>
            </div>
  
            <div className={`p-4 rounded-2xl border max-w-sm mx-auto text-left space-y-2 text-xs font-medium ${
              isDark ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <p>Entrega: <strong className="font-bold text-sky-400">{createdOrder.deliveryType}</strong></p>
              <p>Pagamento: <strong className="font-bold">{createdOrder.paymentMethod}</strong></p>
              <p className="pt-2 border-t text-sm font-black flex justify-between">
                <span>Total Pago:</span>
                <span className="text-emerald-500">R$ {createdOrder.total.toFixed(2).replace('.', ',')}</span>
              </p>
            </div>
  
            <div className="pt-4">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setCreatedOrder(null);
                  setCurrentView('orders');
                }}
                className={`px-8 py-4 font-bold text-sm rounded-xl shadow-md cursor-pointer ${
                  isDark ? 'bg-amber-400 text-slate-950 hover:bg-amber-300' : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                Acompanhar Meus Pedidos
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // TELA DE CHECKOUT NORMAL
  return (
    <div className={`min-h-screen pb-20 ${isDark ? 'bg-[#000000]' : 'bg-[#f5f5f7]'}`}>
      {/* Header simplificado e focado na compra */}
      <header className={`sticky top-0 z-40 backdrop-blur-xl transition-colors ${isDark ? 'bg-black/80 border-b border-white/10' : 'bg-[#f5f5f7]/80 border-b border-slate-200/50'}`}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={() => setCurrentView('cart')}
            className={`flex items-center space-x-2 text-sm font-bold cursor-pointer transition-colors ${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar ao Carrinho</span>
          </button>
          
          <div className="flex items-center space-x-2">
            <Lock className="h-4 w-4 text-emerald-500" />
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Checkout Seguro</span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 pt-10 pb-20">
        <div className="mb-10 text-center lg:text-left">
          <h1 className={`text-3xl sm:text-4xl font-semibold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Finalizar Compra
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LADO ESQUERDO: ETAPAS DE CHECKOUT */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* ETAPA 1: DADOS PESSOAIS */}
            <div className={`p-6 sm:p-8 rounded-[24px] shadow-[0_2px_40px_rgba(0,0,0,0.02)] transition-all ${isDark ? 'bg-[#1c1c1e]' : 'bg-white'}`}>
              <div className="flex items-center justify-between border-b pb-4 mb-5 border-slate-100 dark:border-white/5">
                <h2 className={`text-lg font-semibold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  1. Dados Pessoais
                </h2>
                <button 
                  onClick={() => setIsProfileModalOpen(true)}
                  className="text-[#0071e3] hover:underline font-bold text-xs cursor-pointer flex items-center gap-1"
                >
                  <Edit3 className="h-3 w-3" /> Alterar
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 font-medium block text-xs">Nome</span>
                  <span className="font-bold text-slate-900 dark:text-white">{currentUser.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 font-medium block text-xs">CPF</span>
                  <span className="font-bold text-slate-900 dark:text-white">{currentUser.cpf || 'Pendente'}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 font-medium block text-xs">E-mail</span>
                  <span className="font-bold text-slate-900 dark:text-white">{currentUser.email}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 font-medium block text-xs">Telefone</span>
                  <span className="font-bold text-slate-900 dark:text-white">{currentUser.telefone || 'Pendente'}</span>
                </div>
              </div>
              {isProfileIncomplete(currentUser) && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl text-amber-800 dark:text-amber-400 text-xs font-bold flex items-center justify-between">
                  <span>Faltam dados para aprovação rápida de crédito.</span>
                  <button onClick={() => setIsProfileModalOpen(true)} className="underline cursor-pointer">Completar Agora</button>
                </div>
              )}
            </div>

            {/* ETAPA 2: ENTREGA */}
            <div className={`p-6 sm:p-8 rounded-[24px] shadow-[0_2px_40px_rgba(0,0,0,0.02)] transition-all ${isDark ? 'bg-[#1c1c1e]' : 'bg-white'}`}>
              <div className="flex items-center justify-between border-b pb-4 mb-5 border-slate-100 dark:border-white/5">
                <h2 className={`text-lg font-semibold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  2. Entrega
                </h2>
                <span className="text-xs font-medium text-slate-400">
                  {deliveryType === 'Retirada na Loja' ? '🏬 Retirada Balcão (Frete Grátis)' : '🚚 Entrega no Endereço'}
                </span>
              </div>

              {/* SELETOR DE MODO: ENTREGA NO ENDEREÇO VS RETIRADA NA LOJA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => setDeliveryType('Entrega no Endereço')}
                  className={`p-4 rounded-2xl text-left flex items-center justify-between transition-all cursor-pointer border ${
                    deliveryType !== 'Retirada na Loja'
                      ? 'border-[#0071E3] bg-[#0071E3]/10 dark:bg-[#0071E3]/20 ring-2 ring-[#0071E3]/20'
                      : isDark ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center font-bold">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-slate-900 dark:text-white block">
                        Entregar no meu Endereço
                      </span>
                      <span className="text-xs text-slate-500 font-medium block">
                        Calculado automaticamente pelo CEP
                      </span>
                    </div>
                  </div>
                  {deliveryType !== 'Retirada na Loja' && <CheckCircle2 className="h-5 w-5 text-[#0071E3] shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDeliveryType('Retirada na Loja');
                    setSelectedShippingOption(null);
                  }}
                  className={`p-4 rounded-2xl text-left flex items-center justify-between transition-all cursor-pointer border ${
                    deliveryType === 'Retirada na Loja'
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 ring-2 ring-emerald-500/20'
                      : isDark ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        Retirar na Loja
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-black uppercase">Grátis</span>
                      </span>
                      <span className="text-xs text-slate-500 font-medium block">
                        Centro de Caxias - MA
                      </span>
                    </div>
                  </div>
                  {deliveryType === 'Retirada na Loja' && <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />}
                </button>
              </div>

              {/* SELEÇÃO DE ENDEREÇO E OPÇÕES DE FRETE AUTOMÁTICAS */}
              {deliveryType !== 'Retirada na Loja' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#0071E3]" />
                      <span>Endereço de Entrega</span>
                    </h3>
                    <button 
                      onClick={() => setIsAddingNewAddress(!isAddingNewAddress)}
                      className="text-xs font-semibold text-[#0071E3] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-3 w-3" /> {isAddingNewAddress ? 'Usar Cadastrado' : 'Novo Endereço'}
                    </button>
                  </div>

                  {isAddingNewAddress ? (
                    <div className="space-y-4 p-5 rounded-[20px] bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">CEP</label>
                        <input
                          type="text"
                          value={checkoutCep}
                          onChange={(e) => handleCheckoutCepChange(e.target.value)}
                          className="w-full md:w-1/2 px-4 py-3 rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#1c1c1e] text-sm focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition-all outline-none font-mono"
                          placeholder="00000-000"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2">
                          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Rua</label>
                          <input type="text" value={newAddrForm.rua} onChange={e => setNewAddrForm({...newAddrForm, rua: e.target.value})} className="w-full px-4 py-3 rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#1c1c1e] text-sm focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition-all outline-none" />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Número</label>
                          <input type="text" value={newAddrForm.numero} onChange={e => setNewAddrForm({...newAddrForm, numero: e.target.value})} className="w-full px-4 py-3 rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#1c1c1e] text-sm focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition-all outline-none" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Bairro</label>
                          <input type="text" value={newAddrForm.bairro} onChange={e => setNewAddrForm({...newAddrForm, bairro: e.target.value})} className="w-full px-4 py-3 rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#1c1c1e] text-sm focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition-all outline-none" />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Cidade / UF</label>
                          <input type="text" placeholder="Caxias / MA" value={otherCityName || newAddrForm.cidade} onChange={e => setOtherCityName(e.target.value)} className="w-full px-4 py-3 rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#1c1c1e] text-sm focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition-all outline-none" />
                        </div>
                      </div>
                      <div className="pt-2">
                        <button onClick={handleSaveNewAddress} className="w-full sm:w-auto px-6 py-3 bg-[#0071E3] hover:bg-[#005bb5] text-white rounded-xl font-semibold text-sm cursor-pointer transition-colors shadow-sm">
                          Salvar e Usar Endereço
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {allAddresses.map(addr => {
                        const isSelected = selectedAddressId === addr.id;
                        const hasNumberInRua = addr.rua.toLowerCase().includes('nº') || addr.rua.toLowerCase().includes('nº');
                        const displayAddress = hasNumberInRua ? addr.rua : `${addr.rua}, Nº ${addr.numero}`;

                        return (
                          <div 
                            key={addr.id}
                            onClick={() => {
                              setSelectedAddressId(addr.id);
                              if (addr.cep) setCheckoutCep(addr.cep);
                            }}
                            className={`p-4 rounded-[18px] cursor-pointer flex items-center justify-between transition-all border ${
                              isSelected 
                              ? 'border-[#0071E3] bg-[#0071E3]/10 dark:bg-[#0071E3]/20 shadow-sm ring-2 ring-[#0071E3]/20' 
                              : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-slate-900 dark:text-white">{displayAddress}</span>
                                {addr.id === 'default' && (
                                  <span className="text-[10px] bg-slate-200 dark:bg-white/10 px-2 py-0.5 rounded font-bold text-slate-600 dark:text-slate-300">
                                    Principal
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-500 mt-1 block font-medium">
                                {addr.bairro} - {addr.cidade}/{addr.uf} {addr.cep ? `• CEP: ${addr.cep}` : ''}
                              </span>
                            </div>
                            {isSelected && <CheckCircle2 className="h-5 w-5 text-[#0071E3] shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* COTAÇÃO AUTOMÁTICA DE FRETE BASEADA NO ENDEREÇO SELECIONADO (SEM REPETIÇÕES) */}
                  <div className="pt-3">
                    <ShippingCalculator
                      initialPostalCode={
                        (allAddresses.find(a => a.id === selectedAddressId)?.cep) || 
                        checkoutCep || 
                        currentUser?.cep || 
                        '65606-020'
                      }
                      hideInput={true}
                      hideHeader={false}
                      selectedOptionId={selectedShippingOption?.id}
                      onSelectOption={(opt) => {
                        setSelectedShippingOption(opt);
                      }}
                    />
                  </div>
                </div>
              )}

              {/* CARD DE RETIRADA NA LOJA */}
              {deliveryType === 'Retirada na Loja' && (
                <div className="p-5 rounded-[20px] bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200 space-y-2">
                  <div className="flex items-center justify-between font-bold text-sm">
                    <span className="flex items-center gap-2">
                      <Store className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>Retirada na Loja Física (Evidência Calçados)</span>
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-200 dark:bg-emerald-900 px-2.5 py-0.5 rounded-full text-emerald-900 dark:text-emerald-100">
                      Frete GRÁTIS
                    </span>
                  </div>
                  <p className="text-xs opacity-90 leading-relaxed font-normal">
                    Endereço: <strong>Rua Afonso Pena, 295 - Centro, Caxias - MA</strong>.<br />
                    Você poderá retirar o seu pedido em nossa loja assim que receber a confirmação de pagamento.
                  </p>
                </div>
              )}
            </div>

            {/* ETAPA 3: PAGAMENTO */}
            <div className={`p-6 sm:p-8 rounded-[24px] shadow-[0_2px_40px_rgba(0,0,0,0.02)] transition-all ${isDark ? 'bg-[#1c1c1e]' : 'bg-white'}`}>
              <h2 className={`text-lg font-semibold tracking-tight border-b pb-4 mb-6 border-slate-100 dark:border-white/5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                3. Pagamento
              </h2>

              <div className="flex gap-3 mb-6 bg-slate-100/50 dark:bg-white/5 p-1 rounded-[20px]">
                <button
                  type="button"
                  onClick={() => setPaymentGroup('Online')}
                  className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
                    paymentGroup === 'Online'
                      ? 'bg-white dark:bg-[#2c2c2e] shadow-sm text-slate-900 dark:text-white'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Cartão ou Pix
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isCrediarioApproved) setPaymentGroup('Crediário');
                  }}
                  disabled={!isCrediarioApproved}
                  className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition-all flex flex-col items-center justify-center cursor-pointer ${
                    paymentGroup === 'Crediário'
                      ? 'bg-white dark:bg-[#2c2c2e] shadow-sm text-slate-900 dark:text-white'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  } ${!isCrediarioApproved ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Crediário da Loja</span>
                  </div>
                  {!isCrediarioApproved && <span className="text-[10px] text-amber-500 mt-0.5">Requer Análise</span>}
                </button>
              </div>

              {paymentGroup === 'Online' ? (
                <div className="p-1">
                  <PaymentForm
                    grandTotal={grandTotal}
                    emailCliente={currentUser.email || ''}
                    nomeCliente={currentUser.name}
                    cpfCliente={currentUser.cpf}
                    externalReference={`ped_${Date.now()}`}
                    isDark={isDark}
                    onActiveTabChange={(tab) => setOnlineTab(tab)}
                    onPaymentApproved={(details) => handleConfirmOrder(details.paymentId, details.status)}
                    onPaymentFailed={(err) => console.error("Payment failed", err)}
                  />
                  {/* Info para o usuário que Cartão é preenchido e já confirmado ali dentro (o brick tem botão próprio) */}
                  {onlineTab === 'credit' && (
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 p-4 border border-slate-200 dark:border-slate-700 rounded-xl mt-4 bg-slate-50 dark:bg-slate-800">
                      ℹ️ O pagamento via Cartão de Crédito é processado diretamente pelo painel acima. Preencha e clique no botão de pagamento acima para finalizar.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-xl text-sm font-bold">
                    <ShieldCheck className="h-5 w-5" /> Parcelamento Exclusivo
                  </div>
                  <label className="block text-sm font-bold">Escolha as parcelas:</label>
                  <select
                    value={crediarioInstallments}
                    onChange={(e) => setCrediarioInstallments(Number(e.target.value))}
                    className={`w-full p-4 rounded-xl font-bold border focus:outline-none cursor-pointer transition-colors ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-500' : 'bg-white border-slate-300 focus:border-amber-500'
                    }`}
                  >
                    {crediarioInstallmentOptions.map(opt => (
                      <option key={opt.count} value={opt.count}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

          </div>

          {/* LADO DIREITO: RESUMO DO PEDIDO E BOTÃO FLUTUANTE */}
          <div className="lg:col-span-5 relative">
            <div className={`sticky top-24 p-6 sm:p-8 rounded-[24px] shadow-[0_2px_40px_rgba(0,0,0,0.02)] transition-all ${isDark ? 'bg-[#1c1c1e]' : 'bg-white'}`}>
              <h3 className={`text-lg font-semibold tracking-tight mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Resumo do Pedido
              </h3>

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 mb-6">
                {cart.map((item) => (
                  <div key={`${item.product.id}-${item.selectedSize}`} className="flex gap-4">
                    <img src={item.product.images?.[0] || item.product.foto_uri} alt="" className="w-16 h-16 rounded-xl object-cover bg-slate-100" />
                    <div className="flex-1">
                      <p className="text-xs font-bold line-clamp-2">{item.product.name}</p>
                      <p className="text-[10px] text-slate-500 mt-1">Tam: {item.selectedSize !== 0 ? item.selectedSize : 'Único'} | Qtd: {item.quantity}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      {item.product.originalPrice && item.product.originalPrice > item.product.price && (
                        <p className="text-[10px] line-through text-slate-400">
                          R$ {(item.product.originalPrice * item.quantity).toFixed(2).replace('.', ',')}
                        </p>
                      )}
                      <p className="text-sm font-black whitespace-nowrap">R$ {(item.product.price * item.quantity).toFixed(2).replace('.', ',')}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-white/5 text-sm">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-500">Subtotal dos Produtos</span>
                  <span className="text-slate-900 dark:text-white">R$ {originalSubtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between font-medium text-emerald-500">
                    <span>Descontos Aplicados</span>
                    <span>- R$ {totalDiscount.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium">
                  <span className="text-slate-500">Frete</span>
                  {freightCost === 0 ? (
                    <span className="text-emerald-500 font-semibold">Grátis</span>
                  ) : (
                    <span className="text-slate-900 dark:text-white">R$ {freightCost.toFixed(2).replace('.', ',')}</span>
                  )}
                </div>
                {cashbackDiscount > 0 && (
                  <div className="flex justify-between font-medium text-emerald-500">
                    <span>Cashback Aplicado</span>
                    <span>- R$ {cashbackDiscount.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-white/5">
                  <span className="text-base font-semibold text-slate-900 dark:text-white">Total</span>
                  <span className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                    R$ {grandTotal.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>

              {/* Botão Oficial de Concluir para Pix e Crediário */}
              <button
                onClick={() => handleConfirmOrder()}
                disabled={isProcessing || (paymentGroup === 'Online' && onlineTab === 'credit')}
                className={`w-full mt-8 py-4 rounded-2xl font-semibold text-base transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isProcessing || (paymentGroup === 'Online' && onlineTab === 'credit') 
                    ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-white/5 text-slate-400' 
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                }`}
              >
                {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-5 w-5" />}
                {isProcessing ? 'Processando...' : 'Finalizar Compra'}
              </button>

              <div className="mt-6 flex flex-col items-center gap-2 text-[10px] text-slate-400 font-medium text-center">
                <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3"/> Ambiente 100% Seguro</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CompleteProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
};
