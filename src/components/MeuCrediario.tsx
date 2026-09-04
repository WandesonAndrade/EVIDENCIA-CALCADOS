import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import {
  moblinkClientesService,
  MoblinkContaReceber,
  getInstallmentAmount,
  getParcelId,
} from '../services/moblinkClientesService';
import { pixFirestoreService, PixTransacaoFirestore } from '../services/pixFirestoreService';
import { PixPaymentModal } from './PixPaymentModal';
import { creditService } from '../services/credit/creditService';
import { WhatsAppButton } from './common/WhatsAppButton';
import { ICreditOrder, ICreditEvaluation, OrderItem } from '../types';
import {
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowLeft,
  ShieldCheck,
  CreditCard,
  User,
  Smartphone,
  Sparkles,
  ShoppingBag,
  DollarSign,
  Briefcase,
  Phone,
  MapPin,
  Send,
  HelpCircle,
  Plus
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(value: number | null | undefined): string {
  const v = typeof value === 'number' ? value : 0;
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(raw: string | null | undefined): string {
  if (!raw) return '—';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return raw;
  }
}

function cleanCpf(input: string): string {
  return input.replace(/\D/g, '');
}

function formatCpfMask(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function validateCpf(cpf: string): boolean {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(d[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === parseInt(d[10]);
}

// ─── Types ───────────────────────────────────────────────────────────────────

type ViewState = 'cpf-form' | 'loading' | 'not-found' | 'invoices';
type ActiveTab = 'solicitar-credito' | 'comprar-crediario' | 'carne-erp';

interface SaleGroup {
  saleKey: string;
  items: MoblinkContaReceber[];
  totalValue: number;
  totalPending: number;
  hasOverdue: boolean;
}

interface SelectedParcel {
  parcelId: string;
  saleKey: string;
  parcNum: string;
  value: number;
  description: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const MeuCrediario: React.FC = () => {
  const { 
    currentUser, 
    currentAdminUser, 
    setCurrentView, 
    theme, 
    cart, 
    clearCart,
    contactConfig 
  } = useApp();
  
  const activeUser = currentAdminUser || currentUser;
  const isDark = theme === 'dark';

  // ── Abas do Módulo ──
  const [activeTab, setActiveTab] = useState<ActiveTab>('solicitar-credito');

  // ── Estado Formulário de Avaliação de Crédito ──
  const [evalIncome, setEvalIncome] = useState(activeUser?.rendaMensal || '');
  const [evalProfession, setEvalProfession] = useState(activeUser?.profissao || '');
  const [evalReference, setEvalReference] = useState(activeUser?.referenciaPessoal || '');
  const [evalPhone, setEvalPhone] = useState(activeUser?.telefone || '');
  const [evalRequestedLimit, setEvalRequestedLimit] = useState('1000');
  const [isSubmittingEval, setIsSubmittingEval] = useState(false);
  const [evalSuccessMsg, setEvalSuccessMsg] = useState('');

  // ── Estado Solicitação de Compra via Crediário ──
  const [selectedInstallments, setSelectedInstallments] = useState(3);
  const [isSubmittingCreditOrder, setIsSubmittingCreditOrder] = useState(false);
  const [creditOrderSuccessMsg, setCreditOrderSuccessMsg] = useState('');
  const [userCreditOrders, setUserCreditOrders] = useState<ICreditOrder[]>([]);
  const [isLoadingUserOrders, setIsLoadingUserOrders] = useState(false);

  // ── State ERP Moblink ──
  const [cpfInput, setCpfInput] = useState(activeUser?.cpf ? formatCpfMask(activeUser.cpf) : '');
  const [viewState, setViewState] = useState<ViewState>('cpf-form');
  const [errorMsg, setErrorMsg] = useState('');
  const [invoices, setInvoices] = useState<MoblinkContaReceber[]>([]);
  const [verifiedMoblinkId, setVerifiedMoblinkId] = useState('');
  const [verifiedClientName, setVerifiedClientName] = useState('');
  const [expandedSales, setExpandedSales] = useState<Set<string>>(new Set());

  // ── Pix Payment Modal & Paid State ──
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [pixSelectedParcel, setPixSelectedParcel] = useState<SelectedParcel | null>(null);
  const [paidParcelKeys, setPaidParcelKeys] = useState<Set<string>>(new Set());
  const [approvedPixList, setApprovedPixList] = useState<PixTransacaoFirestore[]>([]);
  const [paymentSuccessToast, setPaymentSuccessToast] = useState<string | null>(null);

  // Telefone da Empresa (para o cliente falar com a loja)
  const storePhone = contactConfig?.whatsapp || '5599984684867';

  // ── Buscar Histórico de Pedidos de Crediário do Usuário ──
  const loadUserOrders = useCallback(async () => {
    if (!activeUser?.uid) return;
    setIsLoadingUserOrders(true);
    try {
      const orders = await creditService.getUserCreditOrders(activeUser.uid);
      setUserCreditOrders(orders);
    } catch (err) {
      console.error('Erro ao buscar pedidos de crediário do usuário:', err);
    } finally {
      setIsLoadingUserOrders(false);
    }
  }, [activeUser?.uid]);

  useEffect(() => {
    loadUserOrders();
  }, [loadUserOrders]);

  // ── Submeter Avaliação de Crédito ──
  const handleSubmitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser) {
      alert('Você precisa estar logado para solicitar crédito.');
      return;
    }

    setIsSubmittingEval(true);
    setEvalSuccessMsg('');

    try {
      await creditService.requestCreditEvaluation({
        userId: activeUser.uid,
        customerName: activeUser.name,
        customerEmail: activeUser.email,
        customerPhone: evalPhone || activeUser.telefone || '',
        customerCpf: activeUser.cpf || '',
        customerRg: activeUser.rg || '',
        income: evalIncome,
        profession: evalProfession,
        referenceContact: evalReference,
        requestedLimit: parseFloat(evalRequestedLimit) || 1000,
        notes: 'Solicitação enviada pelo cliente através da página do Crediário.',
      });

      setEvalSuccessMsg('Sua solicitação de crédito foi enviada com sucesso! Nossa equipe analisará seu cadastro.');
    } catch (err) {
      console.error('Erro ao solicitar avaliação:', err);
      alert('Não foi possível enviar sua solicitação no momento. Tente novamente.');
    } finally {
      setIsSubmittingEval(false);
    }
  };

  // ── Submeter Solicitação de Compra (Importar Carrinho) ──
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  }, [cart]);

  const handleSendCreditOrder = async () => {
    if (!activeUser) {
      alert('Você precisa estar logado para enviar uma solicitação.');
      return;
    }

    if (cart.length === 0) {
      alert('Seu carrinho está vazio. Adicione produtos na loja antes de enviar a solicitação.');
      return;
    }

    setIsSubmittingCreditOrder(true);
    setCreditOrderSuccessMsg('');

    const itemsPayload: OrderItem[] = cart.map(item => ({
      productId: item.product.id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      selectedSize: item.selectedSize,
      image: item.product.imageUrl || (item.product.images && item.product.images[0]) || '',
      originalPrice: item.product.originalPrice
    }));

    const formattedAddress = `${activeUser.endereco || ''}, Nº ${activeUser.numero || 'S/N'} - ${activeUser.bairro || ''}, ${activeUser.cidade || 'Caxias'}/${activeUser.uf || 'MA'} (CEP: ${activeUser.cep || ''})`;

    try {
      const created = await creditService.createCreditOrder({
        userId: activeUser.uid,
        customerName: activeUser.name,
        customerEmail: activeUser.email,
        customerPhone: activeUser.telefone || '',
        customerCpf: activeUser.cpf || '',
        items: itemsPayload,
        totalAmount: cartTotal,
        subtotal: cartTotal,
        installmentsRequested: selectedInstallments,
        deliveryType: 'Entrega no Endereço',
        deliveryAddress: formattedAddress,
        adminNotes: 'Solicitação gerada a partir da importação do carrinho do cliente.',
      });

      setCreditOrderSuccessMsg(`Solicitação de compra #${created.id} enviada com sucesso! Acompanhe o status nesta página.`);
      clearCart();
      await loadUserOrders();
    } catch (err) {
      console.error('Erro ao enviar solicitação de compra:', err);
      alert('Não foi possível enviar sua solicitação de compra.');
    } finally {
      setIsSubmittingCreditOrder(false);
    }
  };

  // ── CPF Mask ERP ──
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpfInput(formatCpfMask(e.target.value));
    setErrorMsg('');
  };

  // ── Verify CPF & fetch invoices ERP ──
  const handleVerify = useCallback(async () => {
    const raw = cleanCpf(cpfInput);
    if (raw.length !== 11) {
      setErrorMsg('Digite um CPF com 11 dígitos.');
      return;
    }
    if (!validateCpf(raw)) {
      setErrorMsg('CPF inválido. Verifique os dígitos e tente novamente.');
      return;
    }

    if (activeUser) {
      const userCpf = cleanCpf(activeUser.cpf || (activeUser as any).documento || '');
      if (userCpf && userCpf !== raw) {
        setErrorMsg('O CPF informado não corresponde ao cadastro da sua conta. Use o CPF vinculado ao seu perfil.');
        return;
      }
    }

    setViewState('loading');
    setErrorMsg('');

    try {
      const client = await moblinkClientesService.findClientByCpf(raw);

      if (!client || !client.moblinkId) {
        setViewState('not-found');
        return;
      }

      setVerifiedMoblinkId(client.moblinkId);
      setVerifiedClientName(client.name || 'Cliente');

      const data = await moblinkClientesService.fetchClienteContasReceber(client.moblinkId);
      setInvoices(data);
      setViewState('invoices');

      try {
        const firestorePixDocs = await pixFirestoreService.fetchAllPixTransacoes();
        setApprovedPixList(firestorePixDocs);

        const approvedKeys: string[] = firestorePixDocs
          .filter((t) => t.status === 'approved' || t.audited)
          .map((t) => String(t.parcelKey).toLowerCase());

        const pixRes = await fetch('/listar-pix-transacoes');
        const pixData = await pixRes.json();
        if (pixData.success && Array.isArray(pixData.transactions)) {
          pixData.transactions.forEach((t: any) => {
            if ((t.status === 'approved' || t.audited) && t.parcelKey) {
              approvedKeys.push(String(t.parcelKey).toLowerCase());
            }
          });
        }

        if (approvedKeys.length > 0) {
          setPaidParcelKeys(new Set(approvedKeys));
        }
      } catch (err) {
        console.warn('Falha ao sincronizar Pix aprovados do Firestore:', err);
      }

      if (data.length > 0) {
        const firstKey = String(data[0].id_venda ?? data[0].documento ?? 'other');
        setExpandedSales(new Set([firstKey]));
      }
    } catch (err) {
      console.error('Erro ao verificar CPF:', err);
      setViewState('cpf-form');
      setErrorMsg('Erro ao consultar o servidor. Tente novamente em instantes.');
    }
  }, [cpfInput, activeUser]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleVerify();
  };

  // ── Agrupamento por Compra ERP ──
  const groupedSales = useMemo((): SaleGroup[] => {
    const map = new Map<string, MoblinkContaReceber[]>();

    invoices.forEach((inv) => {
      const key = String(inv.id_venda ?? inv.documento ?? 'other');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(inv);
    });

    return Array.from(map.entries()).map(([saleKey, items]) => {
      const sorted = [...items].sort((a, b) => {
        const pa = parseInt(String(a.parcela || '0').split('/')[0]) || 0;
        const pb = parseInt(String(b.parcela || '0').split('/')[0]) || 0;
        return pa - pb;
      });

      const totalValue = sorted.reduce((s, i) => s + (i.valor_parcela ?? i.valor ?? i.saldo ?? 0), 0);
      const totalPending = sorted.reduce((s, i, idx) => {
        const parcNum = i.parcela || `${idx + 1}/${sorted.length}`;
        const parcelUniqueKey = String(i.id || `${saleKey}_${parcNum}`);
        const isPaidByMatch = pixFirestoreService.checkIfParcelIsPaidInFirestore(i, approvedPixList);
        const isPaid = getInstallmentAmount(i).isPaid || paidParcelKeys.has(parcelUniqueKey) || paidParcelKeys.has(String(i.id)) || isPaidByMatch;
        const amt = getInstallmentAmount(i);
        return isPaid ? s : s + amt.displayAmount;
      }, 0);
      const hasOverdue = sorted.some((i, idx) => {
        const parcNum = i.parcela || `${idx + 1}/${sorted.length}`;
        const parcelUniqueKey = String(i.id || `${saleKey}_${parcNum}`);
        const isPaidByMatch = pixFirestoreService.checkIfParcelIsPaidInFirestore(i, approvedPixList);
        const isPaid = getInstallmentAmount(i).isPaid || paidParcelKeys.has(parcelUniqueKey) || paidParcelKeys.has(String(i.id)) || isPaidByMatch;
        const amt = getInstallmentAmount(i);
        return !isPaid && amt.isOverdue;
      });

      return { saleKey, items: sorted, totalValue, totalPending, hasOverdue };
    });
  }, [invoices, paidParcelKeys, approvedPixList]);

  const totalPendingAll = groupedSales.reduce((s, g) => s + g.totalPending, 0);

  const handlePaymentSuccess = useCallback((paymentId: number) => {
    if (pixSelectedParcel) {
      const key = pixSelectedParcel.parcelId;
      setPaidParcelKeys((prev) => new Set(prev).add(key));
      setPaymentSuccessToast(`🎉 Pagamento da ${pixSelectedParcel.description} confirmado via Pix com sucesso!`);
    }
    if (verifiedMoblinkId) {
      moblinkClientesService.fetchClienteContasReceber(verifiedMoblinkId).then((data) => {
        setInvoices(data);
      }).catch(console.error);
    }
  }, [pixSelectedParcel, verifiedMoblinkId]);

  const toggleSale = (key: string) => {
    setExpandedSales((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // Status de crediário do usuário
  const credStatus = activeUser?.crediarioStatus || 'NaoSolicitado';
  const approvedLimit = activeUser?.limite_cred;

  const cardBase = isDark
    ? 'bg-slate-900/90 border border-slate-800 rounded-3xl shadow-lg backdrop-blur-md'
    : 'bg-white/95 border border-slate-200/80 rounded-3xl shadow-sm backdrop-blur-md';

  return (
    <div className={`min-h-screen py-8 px-4 sm:px-6 lg:px-8 ${isDark ? 'bg-[#0B0F19]' : 'bg-[#f5f5f7]'}`}>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Botão de Voltar */}
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => setCurrentView('home')}
          className={`flex items-center space-x-2 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
            isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar à loja</span>
        </motion.button>

        {/* Cabeçalho da Página com Padrão Apple */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6 ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md font-bold">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Crediário Próprio Evidência
              </h1>
              <p className={`text-xs sm:text-sm font-medium mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Parcele suas compras em até 6x sem juros no carnê da loja física e online.
              </p>
            </div>
          </div>

          {/* Botão de Atendimento via WhatsApp com a Loja */}
          <div className="shrink-0">
            <WhatsAppButton
              phone={storePhone}
              message="Olá equipe Evidência Calçados! Gostaria de tirar dúvidas sobre o Crediário da Loja."
              label="Falar com a Loja"
              size="md"
              variant="outline"
            />
          </div>
        </motion.div>

        {/* Banner de Status do Crediário do Cliente */}
        <div className={`p-5 rounded-3xl border ${
          credStatus === 'Aprovado'
            ? isDark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'
            : credStatus === 'EmAnalise'
            ? isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'
            : isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {credStatus === 'Aprovado' ? (
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : credStatus === 'EmAnalise' ? (
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              )}

              <div>
                <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {credStatus === 'Aprovado'
                    ? 'Seu Crediário está Aprovado!'
                    : credStatus === 'EmAnalise'
                    ? 'Avaliação de Crédito em Andamento'
                    : 'Crediário Não Solicitado ou Sob Consulta'}
                </h3>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {credStatus === 'Aprovado'
                    ? `Limite liberado: ${approvedLimit ? formatCurrency(approvedLimit) : 'Padrão da loja'} para compras no carnê em até 6x.`
                    : credStatus === 'EmAnalise'
                    ? 'Recebemos seus dados e nossa equipe está analisando seu cadastro com carinho.'
                    : 'Preencha seus dados na aba abaixo para solicitar sua linha de crédito.'}
                </p>
              </div>
            </div>

            {credStatus === 'Aprovado' && (
              <button
                type="button"
                onClick={() => setActiveTab('comprar-crediario')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all cursor-pointer whitespace-nowrap"
              >
                Comprar com Crediário →
              </button>
            )}
          </div>
        </div>

        {/* Abas Superiores Estilo Apple Segmented Control */}
        <div className={`p-1.5 rounded-2xl border flex items-center gap-1.5 overflow-x-auto ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-200/60 border-slate-200'
        }`}>
          <button
            type="button"
            onClick={() => setActiveTab('solicitar-credito')}
            className={`flex-1 min-w-[160px] py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'solicitar-credito'
                ? (isDark ? 'bg-[#2c2c2e] text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm')
                : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-500" />
            <span>1. Solicitar Avaliação</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('comprar-crediario')}
            className={`flex-1 min-w-[160px] py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer relative ${
              activeTab === 'comprar-crediario'
                ? (isDark ? 'bg-[#2c2c2e] text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm')
                : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-emerald-500" />
            <span>2. Comprar com Crediário</span>
            {cart.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('carne-erp')}
            className={`flex-1 min-w-[160px] py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'carne-erp'
                ? (isDark ? 'bg-[#2c2c2e] text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm')
                : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
            }`}
          >
            <FileText className="w-4 h-4 text-blue-500" />
            <span>3. Carnês & Boletos ERP</span>
          </button>
        </div>

        {/* ── ABA 1: SOLICITAR AVALIAÇÃO DE CRÉDITO ── */}
        {activeTab === 'solicitar-credito' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${cardBase} p-6 sm:p-8 space-y-6`}
          >
            <div className="space-y-1">
              <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Formulário de Solicitação de Crédito
              </h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Preencha os dados abaixo para que a equipe da Evidência Calçados analise e libere seu limite para parcelar no carnê.
              </p>
            </div>

            {evalSuccessMsg && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{evalSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitEvaluation} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    disabled
                    value={activeUser?.name || ''}
                    className="w-full px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    CPF
                  </label>
                  <input
                    type="text"
                    disabled
                    value={activeUser?.cpf ? formatCpfMask(activeUser.cpf) : 'Não cadastrado'}
                    className="w-full px-4 py-2.5 rounded-xl text-xs font-mono font-semibold bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Telefone para Contato / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    value={evalPhone}
                    onChange={e => setEvalPhone(e.target.value)}
                    placeholder="(99) 98765-4321"
                    className={`w-full px-4 py-2.5 rounded-xl text-xs font-medium border focus:outline-none transition-all ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Profissão / Ocupação *
                  </label>
                  <input
                    type="text"
                    required
                    value={evalProfession}
                    onChange={e => setEvalProfession(e.target.value)}
                    placeholder="Ex: Vendedora, Autônomo, Servidor..."
                    className={`w-full px-4 py-2.5 rounded-xl text-xs font-medium border focus:outline-none transition-all ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Renda Mensal Estimada (R$) *
                  </label>
                  <input
                    type="text"
                    required
                    value={evalIncome}
                    onChange={e => setEvalIncome(e.target.value)}
                    placeholder="Ex: 2500,00"
                    className={`w-full px-4 py-2.5 rounded-xl text-xs font-medium border focus:outline-none transition-all ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Limite Sugerido Pretendido (R$)
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    value={evalRequestedLimit}
                    onChange={e => setEvalRequestedLimit(e.target.value)}
                    placeholder="1000"
                    className={`w-full px-4 py-2.5 rounded-xl text-xs font-medium border focus:outline-none transition-all ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Contato de Referência Pessoal (Nome e Telefone)
                </label>
                <input
                  type="text"
                  value={evalReference}
                  onChange={e => setEvalReference(e.target.value)}
                  placeholder="Ex: Maria Souza (Mãe) - (99) 98888-7777"
                  className={`w-full px-4 py-2.5 rounded-xl text-xs font-medium border focus:outline-none transition-all ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-900'
                  }`}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingEval}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  {isSubmittingEval ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>{isSubmittingEval ? 'Enviando...' : 'Enviar Solicitação de Avaliação'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* ── ABA 2: COMPRAR NO CREDIÁRIO (IMPORTAR CARRINHO) ── */}
        {activeTab === 'comprar-crediario' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Seção Importar Carrinho */}
            <div className={`${cardBase} p-6 sm:p-8 space-y-6`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Importar Carrinho Atual
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Envie os itens que você selecionou na loja diretamente para nossa equipe aprovar no crediário.
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Total do Carrinho</span>
                  <strong className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(cartTotal)}
                  </strong>
                </div>
              </div>

              {creditOrderSuccessMsg && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{creditOrderSuccessMsg}</span>
                </div>
              )}

              {cart.length === 0 ? (
                <div className="py-8 text-center space-y-3">
                  <ShoppingBag className="w-12 h-12 mx-auto text-slate-400 opacity-60" />
                  <p className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    Seu carrinho está vazio no momento. Adicione os calçados que você deseja comprar na vitrine e volte aqui!
                  </p>
                  <button
                    type="button"
                    onClick={() => setCurrentView('home')}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 transition-all cursor-pointer shadow-sm"
                  >
                    Explorar Produtos da Vitrine
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Lista de Itens do Carrinho */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {cart.map((item, idx) => (
                      <div key={idx} className="py-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          {(item.product.imageUrl || (item.product.images && item.product.images[0])) && (
                            <img
                              src={item.product.imageUrl || item.product.images[0]}
                              alt={item.product.name}
                              className="w-12 h-12 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
                            />
                          )}
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{item.product.name}</p>
                            <p className="text-[11px] text-slate-400">
                              Tamanho: <strong>{item.selectedSize}</strong> | Qtd: <strong>{item.quantity}</strong>
                            </p>
                          </div>
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatCurrency(item.product.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Parcelamento Carnê */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Escolha o Parcelamento no Carnê:
                      </label>
                      <select
                        value={selectedInstallments}
                        onChange={e => setSelectedInstallments(Number(e.target.value))}
                        className={`w-full p-3 rounded-xl text-xs font-bold border focus:outline-none transition-colors ${
                          isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-900'
                        }`}
                      >
                        {[1, 2, 3, 4, 5, 6].map(num => (
                          <option key={num} value={num}>
                            {num === 1
                              ? `1x de ${formatCurrency(cartTotal)} no carnê`
                              : `${num}x de ${formatCurrency(cartTotal / num)} sem juros no carnê`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Endereço de Entrega:
                      </label>
                      <p className="text-xs text-slate-500 dark:text-slate-400 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                        {activeUser?.endereco
                          ? `${activeUser.endereco}, Nº ${activeUser.numero || 'S/N'} - ${activeUser.bairro || ''}, ${activeUser.cidade || 'Caxias'}/${activeUser.uf || 'MA'}`
                          : 'Endereço padrão cadastrado no seu perfil.'}
                      </p>
                    </div>
                  </div>

                  {/* Botão de Envio da Solicitação */}
                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={handleSendCreditOrder}
                      disabled={isSubmittingCreditOrder}
                      className="w-full py-3.5 rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                    >
                      {isSubmittingCreditOrder ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span>{isSubmittingCreditOrder ? 'Enviando Solicitação...' : 'Enviar Solicitação de Compra via Crediário'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Histórico de Solicitações do Cliente */}
            <div className={`${cardBase} p-6 sm:p-8 space-y-4`}>
              <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Minhas Solicitações de Compra
              </h3>

              {isLoadingUserOrders ? (
                <div className="py-6 flex justify-center">
                  <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                </div>
              ) : userCreditOrders.length === 0 ? (
                <p className="text-xs text-slate-400 py-4">
                  Você ainda não enviou solicitações de compra via crediário.
                </p>
              ) : (
                <div className="space-y-3">
                  {userCreditOrders.map(ord => (
                    <div
                      key={ord.id}
                      className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                          #{ord.id}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          ord.status === 'Aprovado'
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : ord.status === 'Rejeitado'
                            ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        }`}>
                          {ord.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-500">
                        <span>{formatDate(ord.createdAt)}</span>
                        <strong className="text-slate-900 dark:text-white font-bold text-sm">
                          {formatCurrency(ord.totalAmount)}
                        </strong>
                      </div>

                      {ord.adminNotes && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 p-2.5 rounded-xl">
                          <strong>Parecer da loja:</strong> {ord.adminNotes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── ABA 3: CARNÊS & FATURAS ERP MOBLINK ── */}
        {activeTab === 'carne-erp' && (
          <AnimatePresence mode="wait">
            {viewState === 'cpf-form' && (
              <motion.div
                key="cpf-form"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.2 }}
                className={`${cardBase} p-6 sm:p-8 space-y-6`}
              >
                <div className="flex items-center space-x-2.5">
                  <ShieldCheck className="h-6 w-6 text-amber-500" />
                  <h3 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Consulta de Carnês MobLink ERP
                  </h3>
                </div>

                <p className={`text-xs leading-relaxed font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Informe o seu <strong>CPF</strong> cadastrado na loja para visualizar faturas pendentes emitidas no sistema e efetuar o pagamento via PIX com baixa automática.
                </p>

                <div className="space-y-2">
                  <label className={`block text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                    Número do CPF
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cpfInput}
                    onChange={handleCpfChange}
                    onKeyDown={handleKeyDown}
                    maxLength={14}
                    placeholder="000.000.000-00"
                    className={`w-full px-4 py-3 rounded-2xl border text-sm font-mono font-bold tracking-widest focus:outline-none transition-all ${
                      isDark
                        ? 'bg-slate-800 border-slate-700 text-white focus:border-amber-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-900'
                    }`}
                  />
                  {errorMsg && (
                    <p className="text-xs font-semibold text-rose-500 flex items-center gap-1 mt-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {errorMsg}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleVerify}
                  className="w-full py-3.5 rounded-2xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Consultar Carnês & Boletos</span>
                </button>
              </motion.div>
            )}

            {viewState === 'loading' && (
              <div className="py-20 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Consultando faturas no sistema ERP...
                </p>
              </div>
            )}

            {viewState === 'not-found' && (
              <div className={`${cardBase} p-8 text-center space-y-4`}>
                <XCircle className="w-12 h-12 mx-auto text-rose-500" />
                <h3 className="text-base font-bold">Nenhum carnê localizado para este CPF</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Não encontramos contas em aberto para o CPF informado no ERP. Se você acabou de abrir o crediário, aguarde o faturamento da compra.
                </p>
                <button
                  type="button"
                  onClick={() => setViewState('cpf-form')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                >
                  Tentar outro CPF
                </button>
              </div>
            )}

            {viewState === 'invoices' && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">
                    Carnês de <strong>{verifiedClientName}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setViewState('cpf-form')}
                    className="text-xs font-bold text-amber-500 hover:underline cursor-pointer"
                  >
                    Trocar CPF
                  </button>
                </div>

                {groupedSales.map((group) => {
                  const isExpanded = expandedSales.has(group.saleKey);
                  return (
                    <div
                      key={group.saleKey}
                      className={`${cardBase} p-5 space-y-3 overflow-hidden`}
                    >
                      <div
                        onClick={() => toggleSale(group.saleKey)}
                        className="flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">
                            Carnê #{group.saleKey}
                          </p>
                          <p className="text-xs text-slate-400">
                            {group.items.length} parcela(s) | Total: {formatCurrency(group.totalValue)}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-emerald-500">
                            Pendente: {formatCurrency(group.totalPending)}
                          </span>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                          {group.items.map((inv, idx) => {
                            const parcNum = inv.parcela || `${idx + 1}/${group.items.length}`;
                            const amountInfo = getInstallmentAmount(inv);
                            const parcelUniqueKey = String(inv.id || `${group.saleKey}_${parcNum}`);
                            const isPaid = amountInfo.isPaid || paidParcelKeys.has(parcelUniqueKey) || paidParcelKeys.has(String(inv.id));

                            return (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs"
                              >
                                <div>
                                  <p className="font-bold">Parcela {parcNum}</p>
                                  <p className="text-[11px] text-slate-400">Vencimento: {formatDate(inv.vencimento)}</p>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-sm">
                                    {formatCurrency(amountInfo.displayAmount)}
                                  </span>

                                  {isPaid ? (
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                                      Pago
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPixSelectedParcel({
                                          parcelId: String(inv.id || getParcelId(inv) || ''),
                                          saleKey: group.saleKey,
                                          parcNum: String(parcNum),
                                          value: amountInfo.displayAmount,
                                          description: `Parcela ${parcNum} - Carnê #${group.saleKey}`,
                                        });
                                        setPixModalOpen(true);
                                      }}
                                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 shadow-sm"
                                    >
                                      <Smartphone className="w-3.5 h-3.5" />
                                      Pagar Pix
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Modal de Pagamento Pix para Carnê ERP */}
        <PixPaymentModal
          isOpen={pixModalOpen}
          onClose={() => { setPixModalOpen(false); setPixSelectedParcel(null); }}
          isDark={isDark}
          parcelDescription={pixSelectedParcel?.description || ''}
          parcelValue={pixSelectedParcel?.value || 0}
          emailCliente={activeUser?.email || 'cliente@evidenciacalcados.com'}
          nomeCliente={verifiedClientName || activeUser?.name || (activeUser as any)?.displayName}
          cpfCliente={cpfInput || activeUser?.cpf}
          externalReference={pixSelectedParcel ? `venda_${pixSelectedParcel.saleKey}_parcela_${pixSelectedParcel.parcelId}` : undefined}
          idVenda={pixSelectedParcel?.saleKey}
          idParcela={pixSelectedParcel?.parcelId}
          onPaymentSuccess={handlePaymentSuccess}
        />
      </div>
    </div>
  );
};
