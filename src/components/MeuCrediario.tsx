import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import {
  moblinkClientesService,
  MoblinkContaReceber,
  getInstallmentAmount,
} from '../services/moblinkClientesService';
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

  // ── Pix Payment Modal ──
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [pixSelectedParcel, setPixSelectedParcel] = useState<{ value: number; description: string } | null>(null);

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

    // Security check: CPF must match the logged-in user's CPF (if set)
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

      // Auto-expand first sale
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

  // ── Group invoices by sale ──
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
      const totalPending = sorted.reduce((s, i) => {
        const amt = getInstallmentAmount(i);
        return amt.isPaid ? s : s + amt.displayAmount;
      }, 0);
      const hasOverdue = sorted.some((i) => {
        const amt = getInstallmentAmount(i);
        return amt.isOverdue;
      });

      return { saleKey, items: sorted, totalValue, totalPending, hasOverdue };
    });
  }, [invoices]);

  const totalPendingAll = groupedSales.reduce((s, g) => s + g.totalPending, 0);
  const hasAnyOverdue = groupedSales.some((g) => g.hasOverdue);

  const toggleSale = (key: string) => {
    setExpandedSales((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // ─── Shared style tokens ──────────────────────────────────────────────────
  const cardBase = isDark
    ? 'bg-slate-900 border border-slate-800 rounded-xl'
    : 'bg-white border border-slate-200 rounded-xl shadow-sm';

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen py-8 px-4 sm:px-6 lg:px-8 ${isDark ? 'bg-[#0B0F19]' : 'bg-slate-50'}`}>
      <div className="max-w-2xl mx-auto">

        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => setCurrentView('home')}
          className={`flex items-center space-x-2 text-xs font-bold mb-6 transition-colors cursor-pointer ${
            isDark ? 'text-slate-400 hover:text-amber-400' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar à loja</span>
        </motion.button>

        {/* Page Title */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center space-x-3 mb-1">
            <div className={`p-2.5 rounded-xl ${isDark ? 'bg-amber-400/10 border border-amber-400/20' : 'bg-amber-50 border border-amber-200'}`}>
              <CreditCard className={`h-5 w-5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
            </div>
            <div>
              <h1 className={`text-xl font-black leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Meu Crediário
              </h1>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Consulte suas faturas e parcelas em aberto
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── CPF FORM ── */}
        <AnimatePresence mode="wait">
          {viewState === 'cpf-form' && (
            <motion.div
              key="cpf-form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.2 }}
              className={`${cardBase} p-6`}
            >
              <div className="flex items-center space-x-2 mb-5">
                <ShieldCheck className={`h-5 w-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <p className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  Verificação de Identidade
                </p>
              </div>

              <p className={`text-xs mb-6 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Para acessar suas faturas com segurança, confirme seu <strong>CPF</strong>.
                Ele será cruzado com o cadastro da sua conta para garantir que apenas você veja seus dados.
              </p>

              <label className={`block text-[11px] font-black uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                CPF
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
                className={`w-full px-4 py-3 rounded-xl border text-sm font-mono font-bold tracking-widest focus:outline-none transition-all ${
                  isDark
                    ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-600 focus:border-amber-400 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.15)]'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-slate-600 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.07)]'
                }`}
              />

              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center space-x-2 mt-3"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                  <p className="text-xs font-semibold text-rose-500">{errorMsg}</p>
                </motion.div>
              )}

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleVerify}
                disabled={cleanCpf(cpfInput).length < 11}
                className={`mt-5 w-full py-3 rounded-xl text-sm font-black transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDark
                    ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                Consultar Faturas
              </motion.button>

              {!activeUser && (
                <p className={`text-[10px] mt-4 text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  Você precisa estar logado para consultar faturas.{' '}
                  <button
                    onClick={() => setCurrentView('login')}
                    className={`font-bold underline cursor-pointer ${isDark ? 'text-amber-400' : 'text-slate-700'}`}
                  >
                    Entrar
                  </button>
                </p>
              )}
            </motion.div>
          )}

          {/* ── LOADING ── */}
          {viewState === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`${cardBase} p-10 flex flex-col items-center space-y-4`}
            >
              <Loader2 className={`h-8 w-8 animate-spin ${isDark ? 'text-amber-400' : 'text-slate-600'}`} />
              <p className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Consultando faturas...
              </p>
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Aguarde enquanto buscamos seus dados no servidor.
              </p>
            </motion.div>
          )}

          {/* ── NOT FOUND ── */}
          {viewState === 'not-found' && (
            <motion.div
              key="not-found"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`${cardBase} p-8 flex flex-col items-center space-y-4 text-center`}
            >
              <div className={`p-3 rounded-full ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <User className={`h-7 w-7 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
              </div>
              <div>
                <p className={`text-sm font-black mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  CPF não encontrado
                </p>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Não encontramos nenhum crediário vinculado ao CPF informado. Se você possui crediário conosco, entre em contato com nossa equipe.
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { setViewState('cpf-form'); setCpfInput(''); }}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                }`}
              >
                Tentar outro CPF
              </motion.button>
            </motion.div>
          )}

          {/* ── INVOICES ── */}
          {viewState === 'invoices' && (
            <motion.div
              key="invoices"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Summary Header */}
              <div className={`${cardBase} p-5`}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-wider mb-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                      Extrato de Crediário
                    </p>
                    <p className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {verifiedClientName}
                    </p>
                    <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      ID MobLink #{verifiedMoblinkId} · {groupedSales.length} compra(s) · {invoices.length} parcela(s)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-[10px] font-black uppercase tracking-wider mb-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                      Saldo Pendente
                    </p>
                    <p className={`text-xl font-black font-mono ${
                      hasAnyOverdue
                        ? (isDark ? 'text-rose-400' : 'text-rose-600')
                        : (isDark ? 'text-amber-400' : 'text-amber-700')
                    }`}>
                      {formatCurrency(totalPendingAll)}
                    </p>
                    {hasAnyOverdue && (
                      <span className="text-[9px] font-black uppercase text-rose-500 tracking-wider">
                        ⚠ Parcela(s) em atraso
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => { setViewState('cpf-form'); setCpfInput(''); setInvoices([]); }}
                  className={`mt-3 text-[11px] font-bold underline cursor-pointer ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  ← Nova consulta
                </button>
              </div>

              {/* No invoices case */}
              {groupedSales.length === 0 && (
                <div className={`${cardBase} p-8 flex flex-col items-center space-y-3 text-center`}>
                  <CheckCircle2 className={`h-8 w-8 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  <p className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Nenhuma fatura em aberto
                  </p>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Parabéns! Você está com o crediário em dia.
                  </p>
                </div>
              )}

              {/* Sale Groups Accordion */}
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
                    {/* Sale Header (Accordion Toggle) */}
                    <button
                      onClick={() => toggleSale(group.saleKey)}
                      className={`w-full flex items-center justify-between p-4 cursor-pointer rounded-xl transition-colors ${
                        isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3 text-left">
                        <div className={`p-2 rounded-lg ${
                          group.hasOverdue
                            ? (isDark ? 'bg-rose-500/15 border border-rose-500/30' : 'bg-rose-50 border border-rose-200')
                            : (isDark ? 'bg-slate-800 border border-slate-700' : 'bg-slate-100 border border-slate-200')
                        }`}>
                          <FileText className={`h-4 w-4 ${
                            group.hasOverdue
                              ? (isDark ? 'text-rose-400' : 'text-rose-600')
                              : (isDark ? 'text-slate-400' : 'text-slate-600')
                          }`} />
                        </div>
                        <div>
                          <p className={`text-xs font-black leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Compra / Venda #{group.saleKey}
                          </p>
                          <p className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                            {group.items.length} parcela(s) · {pendingCount > 0 ? `${pendingCount} pendente(s)` : 'Todas pagas'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 shrink-0">
                        <div className="text-right">
                          {group.totalPending > 0 && (
                            <p className={`text-sm font-black font-mono leading-none ${
                              group.hasOverdue
                                ? (isDark ? 'text-rose-400' : 'text-rose-600')
                                : (isDark ? 'text-amber-400' : 'text-amber-700')
                            }`}>
                              {formatCurrency(group.totalPending)}
                            </p>
                          )}
                          {group.totalPending === 0 && (
                            <p className={`text-xs font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                              Quitado
                            </p>
                          )}
                        </div>
                        {isExpanded
                          ? <ChevronUp className={`h-4 w-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                          : <ChevronDown className={`h-4 w-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                        }
                      </div>
                    </button>

                    {/* Parcelas Accordion Body */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className={`px-4 pb-4 pt-1 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                            <div className="space-y-2.5 mt-3">
                              {group.items.map((inv, idx) => {
                                const parcNum = inv.parcela || `${idx + 1}/${group.items.length}`;
                                const dtVenc = formatDate(inv.data_vencimento || inv.vencimento);
                                const amountInfo = getInstallmentAmount(inv);
                                const isPaid = amountInfo.isPaid;
                                const isOverdue = amountInfo.isOverdue;

                                return (
                                  <div
                                    key={inv.id || idx}
                                    className={`flex items-center justify-between p-3.5 rounded-xl border ${
                                      isPaid
                                        ? (isDark ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-emerald-50 border-emerald-300')
                                        : isOverdue
                                          ? (isDark ? 'bg-rose-950/40 border-rose-500/50' : 'bg-rose-50 border-rose-400')
                                          : (isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200')
                                    }`}
                                  >
                                    {/* Left: status icon + parcel info */}
                                    <div className="flex items-center space-x-3">
                                      <div className="shrink-0">
                                        {isPaid
                                          ? <CheckCircle2 className={`h-4 w-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                                          : isOverdue
                                            ? <XCircle className={`h-4 w-4 ${isDark ? 'text-rose-400' : 'text-rose-600'}`} />
                                            : <Clock className={`h-4 w-4 ${isDark ? 'text-sky-400' : 'text-sky-600'}`} />
                                        }
                                      </div>
                                      <div className="space-y-0.5">
                                        <div className="flex items-center space-x-1.5 flex-wrap">
                                          <p className={`text-sm font-black leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                            Parcela {parcNum}
                                          </p>
                                          {amountInfo.hasInterest && (
                                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40" title={`Inclui ${formatCurrency(amountInfo.interestAmount)} de juros/encargos do ERP`}>
                                              + Juros ERP
                                            </span>
                                          )}
                                        </div>
                                        <p className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                          Venc.{' '}
                                          <span className={`font-mono font-extrabold ${
                                            isOverdue
                                              ? (isDark ? 'text-rose-400' : 'text-rose-600')
                                              : (isDark ? 'text-amber-300' : 'text-amber-700')
                                          }`}>
                                            {dtVenc}
                                          </span>
                                        </p>
                                      </div>
                                    </div>

                                    {/* Right: status badge + value + pay button */}
                                    <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
                                      <div>
                                        {isPaid ? (
                                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${
                                            isDark ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                          }`}>
                                            Paga
                                          </span>
                                        ) : isOverdue ? (
                                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${
                                            isDark ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-rose-100 text-rose-700 border border-rose-300'
                                          }`}>
                                            Atrasada
                                          </span>
                                        ) : (
                                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${
                                            isDark ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'bg-sky-100 text-sky-700 border border-sky-300'
                                          }`}>
                                            A Vencer
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-right">
                                        <p className={`text-sm font-black font-mono tabular-nums leading-none ${
                                          isPaid
                                            ? (isDark ? 'text-slate-500 line-through' : 'text-slate-400 line-through')
                                            : isOverdue
                                              ? (isDark ? 'text-rose-400' : 'text-rose-600')
                                              : (isDark ? 'text-emerald-400' : 'text-emerald-700')
                                        }`}>
                                          {formatCurrency(amountInfo.displayAmount)}
                                        </p>
                                        {amountInfo.hasInterest && (
                                          <span className={`text-[9px] font-bold block mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                            Orig.: {formatCurrency(amountInfo.originalAmount)}
                                          </span>
                                        )}
                                      </div>
                                      {/* Pagar Agora Button (only for unpaid) */}
                                      {!isPaid && (
                                        <motion.button
                                          whileTap={{ scale: 0.93 }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setPixSelectedParcel({
                                              value: amountInfo.displayAmount,
                                              description: `Parcela ${parcNum} – Venda #${group.saleKey}`,
                                            });
                                            setPixModalOpen(true);
                                          }}
                                          className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                            isDark
                                              ? 'bg-[#0a84ff] hover:bg-[#409cff] text-white shadow-[0_0_16px_rgba(10,132,255,0.3)]'
                                              : 'bg-[#007aff] hover:bg-[#0066d6] text-white shadow-sm'
                                          }`}
                                        >
                                          <Smartphone className="h-3 w-3" />
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

              {/* Footer Note */}
              <p className={`text-[10px] text-center pb-4 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                Dados sincronizados com o sistema da loja (MobLink ERP). Em caso de dúvidas, entre em contato com nossa equipe.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pix Payment Modal */}
        <PixPaymentModal
          isOpen={pixModalOpen}
          onClose={() => { setPixModalOpen(false); setPixSelectedParcel(null); }}
          isDark={isDark}
          parcelDescription={pixSelectedParcel?.description || ''}
          parcelValue={pixSelectedParcel?.value || 0}
          emailCliente={activeUser?.email || 'cliente@evidenciacalcados.com'}
          nomeCliente={verifiedClientName || activeUser?.name || (activeUser as any)?.displayName}
          cpfCliente={cpfInput || activeUser?.cpf}
          externalReference={pixSelectedParcel ? `venda_${pixSelectedParcel.description.replace(/\D/g, '_')}` : undefined}
        />
      </div>
    </div>
  );
};
