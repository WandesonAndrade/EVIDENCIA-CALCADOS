import React, { useState, useMemo, useCallback } from 'react';
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
  const { currentUser, currentAdminUser, setCurrentView, theme } = useApp();
  const activeUser = currentAdminUser || currentUser;
  const isDark = theme === 'dark';

  // ── State ──
  const [cpfInput, setCpfInput] = useState('');
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

  // ── CPF Mask ──
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpfInput(formatCpfMask(e.target.value));
    setErrorMsg('');
  };

  // ── Verify CPF & fetch invoices ──
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

    // Checagem de segurança: CPF deve corresponder ao usuário logado
    if (activeUser) {
      const userCpf = cleanCpf(activeUser.cpf || (activeUser as any).documento || '');
      if (userCpf && userCpf !== raw) {
        setErrorMsg(
          'O CPF informado não corresponde ao cadastro da sua conta. Use o CPF vinculado ao seu perfil.'
        );
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

      // Recupera parcelas com Pix aprovado salvos no Firestore / backend
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

      // Auto-expande a primeira compra
      if (data.length > 0) {
        const firstKey = String(data[0].id_venda ?? data[0].documento ?? 'other');
        setExpandedSales(new Set([firstKey]));
      }
    } catch (err) {
      console.error('Erro ao verificar CPF:', err);
      setViewState('cpf-form');
      setErrorMsg('Erro ao consultar o servidor. Tente novamente em instantes.');
    }
  }, [cpfInput, currentUser]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleVerify();
  };

  // ── Agrupamento por Compra ──
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
  }, [invoices, paidParcelKeys]);

  const totalPendingAll = groupedSales.reduce((s, g) => s + g.totalPending, 0);
  const hasAnyOverdue = groupedSales.some((g) => g.hasOverdue);

  // ── Confirmação de Pagamento Pix ──
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

  // ─── Estilos Base Apple Store ──────────────────────────────────────────────
  const cardBase = isDark
    ? 'bg-slate-900/90 border border-slate-800 rounded-3xl shadow-lg backdrop-blur-md'
    : 'bg-white/95 border border-blue-900/10 rounded-3xl shadow-md backdrop-blur-md';

  return (
    <div className={`min-h-screen py-8 px-4 sm:px-6 lg:px-8 ${isDark ? 'bg-[#0B0F19]' : 'bg-[#EAF5FF]'}`}>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Botão de Voltar com Alto Contraste */}
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => setCurrentView('home')}
          className={`flex items-center space-x-2 text-xs font-extrabold uppercase tracking-wider transition-colors cursor-pointer ${
            isDark ? 'text-slate-400 hover:text-white' : 'text-[#52708F] hover:text-[#003B73]'
          }`}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar à loja</span>
        </motion.button>

        {/* Cabeçalho da Página com Alto Contraste */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6 ${
            isDark ? 'border-slate-800' : 'border-blue-900/15'
          }`}
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#003B73] text-white flex items-center justify-center shadow-md">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-[#003B73]'}`}>
                Meu Crediário Evidência
              </h1>
              <p className={`text-xs sm:text-sm font-bold mt-0.5 ${isDark ? 'text-slate-400' : 'text-[#52708F]'}`}>
                Consulte carnês, parcelas em aberto e efetue pagamentos instantâneos via PIX
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── FORMULÁRIO DE CONSULTA CPF (ESTILO APPLE CARD) ── */}
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
                <ShieldCheck className="h-6 w-6 text-[#006EDB]" />
                <h3 className={`text-base font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-[#003B73]'}`}>
                  Autenticação do Carnê Crediário
                </h3>
              </div>

              <p className={`text-xs leading-relaxed font-medium ${isDark ? 'text-slate-400' : 'text-[#52708F]'}`}>
                Informe o seu <strong>CPF</strong> cadastrado na loja para visualizar o extrato detalhado de faturas e efetuar a quitação via PIX com baixa automática.
              </p>

              <div className="space-y-2">
                <label className={`block text-[11px] font-extrabold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-[#003B73]'}`}>
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
                  autoFocus
                  className={`w-full px-4 py-3.5 rounded-2xl border text-sm font-mono font-bold tracking-widest focus:outline-none transition-all ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-600 focus:border-[#006EDB] focus:ring-4 focus:ring-[#006EDB]/20'
                      : 'bg-white border-blue-900/20 text-[#003B73] placeholder-slate-400 focus:border-[#006EDB] focus:ring-4 focus:ring-[#DDF1FF]'
                  }`}
                />
              </div>

              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center space-x-2 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 p-3 rounded-xl"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleVerify}
                disabled={cleanCpf(cpfInput).length < 11}
                className="w-full py-3.5 rounded-full text-xs font-extrabold tracking-wider uppercase transition-all shadow-md cursor-pointer bg-[#006EDB] hover:bg-[#00509E] text-white disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 disabled:shadow-none disabled:cursor-not-allowed"
              >
                Consultar Faturas do Crediário
              </motion.button>

              {!activeUser && (
                <p className={`text-[11px] text-center font-medium ${isDark ? 'text-slate-500' : 'text-[#52708F]'}`}>
                  Você precisa estar logado para consultar suas faturas.{' '}
                  <button
                    onClick={() => setCurrentView('login')}
                    className="font-bold underline cursor-pointer text-[#006EDB]"
                  >
                    Entrar na minha conta
                  </button>
                </p>
              )}
            </motion.div>
          )}

          {/* ── CARREGAMENTO (SKELETON APPLE) ── */}
          {viewState === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`${cardBase} p-12 flex flex-col items-center justify-center space-y-4 text-center`}
            >
              <Loader2 className="h-9 w-9 animate-spin text-[#006EDB]" />
              <p className={`text-sm font-extrabold ${isDark ? 'text-white' : 'text-[#003B73]'}`}>
                Consultando o MobLink ERP...
              </p>
              <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-[#52708F]'}`}>
                Buscando suas faturas e saldo atualizado do crediário.
              </p>
            </motion.div>
          )}

          {/* ── NÃO ENCONTRADO ── */}
          {viewState === 'not-found' && (
            <motion.div
              key="not-found"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`${cardBase} p-8 flex flex-col items-center space-y-5 text-center`}
            >
              <div className="w-16 h-16 rounded-full bg-[#EEF8FF] border border-blue-900/10 flex items-center justify-center">
                <User className="h-8 w-8 text-[#006EDB]" />
              </div>
              <div className="space-y-1.5 max-w-md">
                <h3 className={`text-base font-extrabold ${isDark ? 'text-white' : 'text-[#003B73]'}`}>
                  CPF Não Localizado no Sistema
                </h3>
                <p className={`text-xs font-medium leading-relaxed ${isDark ? 'text-slate-400' : 'text-[#52708F]'}`}>
                  Não identificamos nenhuma compra no crediário vinculada ao CPF informado. Caso tenha efetuado o cadastro recentemente, entre em contato com o atendimento.
                </p>
              </div>
              <button
                onClick={() => { setViewState('cpf-form'); setCpfInput(''); }}
                className="px-6 py-2.5 rounded-full text-xs font-extrabold uppercase bg-[#006EDB] hover:bg-[#00509E] text-white transition-all shadow-md cursor-pointer"
              >
                Tentar Outro CPF
              </button>
            </motion.div>
          )}

          {/* ── LISTA DE FATURAS E PAINEL DO CREDIÁRIO ── */}
          {viewState === 'invoices' && (
            <motion.div
              key="invoices"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              {/* Alerta de Sucesso no Pagamento */}
              {paymentSuccessToast && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl border flex items-center justify-between shadow-sm bg-emerald-50 border-emerald-300 text-emerald-900"
                >
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                    <p className="text-xs font-extrabold">{paymentSuccessToast}</p>
                  </div>
                  <button
                    onClick={() => setPaymentSuccessToast(null)}
                    className="text-xs font-black hover:opacity-75 cursor-pointer ml-2"
                  >
                    ✕
                  </button>
                </motion.div>
              )}

              {/* Card Resumo do Cliente (Estilo Apple Wallet Header) */}
              <div className={`${cardBase} p-6 space-y-4`}>
                <div className="flex items-center justify-between flex-wrap gap-4 border-b pb-4 border-blue-900/10">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#52708F] block">
                      Titular do Crediário
                    </span>
                    <h2 className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-[#003B73]'}`}>
                      {verifiedClientName}
                    </h2>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="px-2.5 py-0.5 rounded-md bg-[#DDF1FF] text-[#003B73] text-[10px] font-bold">
                        ID MobLink #{verifiedMoblinkId}
                      </span>
                      <span className="text-[11px] text-[#52708F] font-medium">
                        {groupedSales.length} carnê(s) · {invoices.length} parcela(s)
                      </span>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#52708F] block">
                      Total Pendente
                    </span>
                    <p className={`text-2xl font-black font-mono tracking-tight ${
                      hasAnyOverdue
                        ? 'text-rose-600'
                        : 'text-[#003B73] dark:text-white'
                    }`}>
                      {formatCurrency(totalPendingAll)}
                    </p>
                    {hasAnyOverdue && (
                      <span className="text-[10px] font-extrabold uppercase text-rose-600 tracking-wider block mt-0.5">
                        ⚠ Há parcelas vencidas
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => { setViewState('cpf-form'); setCpfInput(''); setInvoices([]); }}
                    className="text-xs font-extrabold text-[#006EDB] hover:underline cursor-pointer flex items-center space-x-1"
                  >
                    <span>← Consultar outro CPF</span>
                  </button>

                  <span className="text-[10px] text-[#52708F] font-medium hidden sm:inline">
                    Pagamento via PIX 24h com aprovação imediata
                  </span>
                </div>
              </div>

              {/* Caso Sem Faturas */}
              {groupedSales.length === 0 && (
                <div className={`${cardBase} p-10 flex flex-col items-center space-y-3 text-center`}>
                  <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                  <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-[#003B73]'}`}>
                    Parabéns! Crediário 100% Quitado
                  </h3>
                  <p className="text-xs text-[#52708F] font-medium max-w-sm">
                    Você não possui nenhuma parcela pendente no momento. Obrigado por manter sua conta em dia!
                  </p>
                </div>
              )}

              {/* Lista de Carnês / Compras em Acordeão */}
              {groupedSales.map((group, gIdx) => {
                const isExpanded = expandedSales.has(group.saleKey);
                const pendingCount = group.items.filter((i) => {
                  const st = (i.situacao || i.status || '').toUpperCase();
                  return !st.includes('PAG') && !st.includes('BAIX') && st !== 'L';
                }).length;

                return (
                  <motion.div
                    key={group.saleKey}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: gIdx * 0.05 }}
                    className={cardBase}
                  >
                    {/* Cabeçalho do Carnê (Toggle) */}
                    <button
                      onClick={() => toggleSale(group.saleKey)}
                      className={`w-full flex items-center justify-between p-5 cursor-pointer rounded-3xl transition-colors ${
                        isDark ? 'hover:bg-slate-800/40' : 'hover:bg-[#EEF8FF]/50'
                      }`}
                    >
                      <div className="flex items-center space-x-3.5 text-left">
                        <div className={`p-2.5 rounded-2xl ${
                          group.hasOverdue
                            ? 'bg-rose-50 border border-rose-200 text-rose-600'
                            : 'bg-[#EEF8FF] border border-blue-900/10 text-[#003B73]'
                        }`}>
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className={`text-sm font-black leading-snug ${isDark ? 'text-white' : 'text-[#003B73]'}`}>
                            Carnê de Compra #{group.saleKey}
                          </p>
                          <p className="text-[11px] text-[#52708F] font-medium mt-0.5">
                            {group.items.length} parcela(s) · {pendingCount > 0 ? `${pendingCount} a pagar` : 'Totalmente pago'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 shrink-0">
                        <div className="text-right">
                          {group.totalPending > 0 ? (
                            <p className={`text-base font-black font-mono ${
                              group.hasOverdue ? 'text-rose-600' : 'text-[#003B73] dark:text-white'
                            }`}>
                              {formatCurrency(group.totalPending)}
                            </p>
                          ) : (
                            <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                              Quitado
                            </span>
                          )}
                        </div>
                        {isExpanded ? <ChevronUp className="h-5 w-5 text-[#52708F]" /> : <ChevronDown className="h-5 w-5 text-[#52708F]" />}
                      </div>
                    </button>

                    {/* Lista das Parcelas do Carnê */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className={`px-5 pb-5 pt-2 border-t ${isDark ? 'border-slate-800' : 'border-blue-900/10'}`}>
                            <div className="space-y-3 mt-2">
                              {group.items.map((inv, idx) => {
                                const parcNum = inv.parcela || `${idx + 1}/${group.items.length}`;
                                const dtVenc = formatDate(inv.data_vencimento || inv.vencimento);
                                const amountInfo = getInstallmentAmount(inv);
                                const parcelUniqueKey = String(inv.id || `${group.saleKey}_${parcNum}`);
                                const isPaidByFirebaseMatch = pixFirestoreService.checkIfParcelIsPaidInFirestore(inv, approvedPixList);
                                const isPaidByPix = paidParcelKeys.has(parcelUniqueKey) || paidParcelKeys.has(String(inv.id)) || isPaidByFirebaseMatch;
                                const isPaid = amountInfo.isPaid || isPaidByPix;
                                const isOverdue = !isPaid && amountInfo.isOverdue;

                                return (
                                  <div
                                    key={inv.id || idx}
                                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border gap-3 transition-all ${
                                      isPaid
                                        ? 'bg-emerald-50/50 border-emerald-200'
                                        : isOverdue
                                          ? 'bg-rose-50/60 border-rose-300'
                                          : 'bg-white border-blue-900/10 shadow-2xs'
                                    }`}
                                  >
                                    {/* Lado Esquerdo: Ícone + Info da Parcela */}
                                    <div className="flex items-center space-x-3.5">
                                      <div className="shrink-0">
                                        {isPaid ? (
                                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                        ) : isOverdue ? (
                                          <XCircle className="h-5 w-5 text-rose-600" />
                                        ) : (
                                          <Clock className="h-5 w-5 text-[#006EDB]" />
                                        )}
                                      </div>
                                      <div className="space-y-0.5">
                                        <div className="flex items-center space-x-2 flex-wrap">
                                          <p className={`text-sm font-extrabold ${isDark ? 'text-white' : 'text-[#003B73]'}`}>
                                            Parcela {parcNum}
                                          </p>
                                          {amountInfo.hasInterest && (
                                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                              + Juros ERP
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-xs text-[#52708F] font-medium">
                                          Vencimento:{' '}
                                          <span className={`font-mono font-extrabold ${isOverdue ? 'text-rose-700' : 'text-[#003B73]'}`}>
                                            {dtVenc}
                                          </span>
                                        </p>
                                      </div>
                                    </div>

                                    {/* Lado Direito: Status + Valor + Botão Pagar */}
                                    <div className="flex items-center justify-between sm:justify-end space-x-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-blue-900/10">
                                      <div>
                                        {isPaidByPix || isPaid ? (
                                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                                            ✓ Paga
                                          </span>
                                        ) : isOverdue ? (
                                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                            Vencida
                                          </span>
                                        ) : (
                                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-[#DDF1FF] text-[#003B73] border border-[#006EDB]/30">
                                            A Vencer
                                          </span>
                                        )}
                                      </div>

                                      <div className="text-right">
                                        <p className={`text-base font-black font-mono tabular-nums leading-none ${
                                          isPaid
                                            ? 'text-slate-400 line-through'
                                            : isOverdue
                                              ? 'text-rose-600'
                                              : 'text-[#003B73] dark:text-white'
                                        }`}>
                                          {formatCurrency(amountInfo.displayAmount)}
                                        </p>
                                      </div>

                                      {/* Botão Pagar com PIX (Apenas para parcelas não pagas) */}
                                      {!isPaid && (
                                        <motion.button
                                          whileTap={{ scale: 0.95 }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const exactParcelId = String(inv.id || getParcelId(inv) || '').trim();
                                            const exactSaleId = String(group.saleKey || inv.id_venda || '').trim();
                                            setPixSelectedParcel({
                                              parcelId: exactParcelId,
                                              saleKey: exactSaleId,
                                              parcNum: String(parcNum),
                                              value: amountInfo.displayAmount,
                                              description: `Parcela ${parcNum} – Carnê #${exactSaleId}`,
                                            });
                                            setPixModalOpen(true);
                                          }}
                                          className="flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-extrabold uppercase tracking-wider bg-[#006EDB] hover:bg-[#00509E] text-white transition-all shadow-md cursor-pointer"
                                        >
                                          <Smartphone className="h-3.5 w-3.5" />
                                          <span>Pagar</span>
                                        </motion.button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}

              <p className="text-[10px] text-center text-[#52708F] font-medium pt-2 pb-6">
                Informações integradas ao sistema de gestão MobLink ERP. Dúvidas sobre boletos ou liquidações? Fale conosco no WhatsApp.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal de Pagamento via Pix */}
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

