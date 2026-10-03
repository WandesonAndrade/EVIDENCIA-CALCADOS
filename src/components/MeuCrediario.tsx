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
import { WhatsAppButton } from './common/WhatsAppButton';
import {
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ShieldCheck,
  CreditCard,
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
    contactConfig 
  } = useApp();
  
  const activeUser = currentAdminUser || currentUser;
  const isDark = theme === 'dark';

  // ── State ERP Moblink (Carnês & Boletos) ──
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

  // ── CPF Mask ERP ──
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpfInput(formatCpfMask(e.target.value));
    setErrorMsg('');
  };

  // ── Verify CPF & fetch invoices ERP ──
  const handleVerify = useCallback(async (customCpf?: string) => {
    const raw = cleanCpf(customCpf ?? cpfInput);
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

  // Consulta automática se usuário já estiver logado com CPF válido
  useEffect(() => {
    if (activeUser?.cpf) {
      const clean = cleanCpf(activeUser.cpf);
      if (clean.length === 11 && validateCpf(clean)) {
        handleVerify(clean);
      }
    }
  }, [activeUser?.cpf]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const totalPendingAll = useMemo(() => {
    return groupedSales.reduce((s, g) => s + g.totalPending, 0);
  }, [groupedSales]);

  const handlePaymentSuccess = useCallback(() => {
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
                Consulte e pague seus carnês e boletos da loja física e online de forma rápida via PIX.
              </p>
            </div>
          </div>

          {/* Botão de Atendimento via WhatsApp com a Loja */}
          <div className="shrink-0">
            <WhatsAppButton
              phone={storePhone}
              message="Olá equipe Evidência Calçados! Gostaria de tirar dúvidas sobre meus carnês e boletos do crediário."
              label="Falar com a Loja"
              size="md"
              variant="outline"
            />
          </div>
        </motion.div>

        {/* Toast de Sucesso no Pagamento Pix */}
        {paymentSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-between gap-2 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{paymentSuccessToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setPaymentSuccessToast(null)}
              className="text-emerald-500 hover:text-emerald-700 font-bold p-1 cursor-pointer"
            >
              ×
            </button>
          </motion.div>
        )}

        {/* ── CONSULTA E GESTÃO DE CARNÊS & BOLETOS ERP ── */}
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
                  Consulta de Carnês & Boletos
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
                onClick={() => handleVerify()}
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
              <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Nenhum carnê localizado para este CPF
              </h3>
              <p className={`text-xs max-w-sm mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Não encontramos contas em aberto para o CPF informado no ERP. Se você acabou de abrir o crediário na loja, aguarde o faturamento da compra.
              </p>
              <button
                type="button"
                onClick={() => setViewState('cpf-form')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 cursor-pointer"
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
              {/* Barra de identificação do cliente e resumo */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Cliente identificado:</span>
                  <div className="flex items-center gap-2">
                    <strong className="text-sm font-bold text-slate-900 dark:text-white">
                      {verifiedClientName}
                    </strong>
                    <span className="text-xs text-slate-400 font-mono">({formatCpfMask(cpfInput)})</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block uppercase tracking-wider font-bold">
                      Total Pendente
                    </span>
                    <strong className={`text-base font-black ${totalPendingAll > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {formatCurrency(totalPendingAll)}
                    </strong>
                  </div>

                  <button
                    type="button"
                    onClick={() => setViewState('cpf-form')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 transition-colors cursor-pointer"
                  >
                    Trocar CPF
                  </button>
                </div>
              </div>

              {groupedSales.length === 0 ? (
                <div className={`${cardBase} p-8 text-center space-y-3`}>
                  <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500" />
                  <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Nenhuma parcela em aberto
                  </h3>
                  <p className={`text-xs max-w-sm mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Parabéns! Todas as faturas deste CPF estão em dia ou não há carnês pendentes no momento.
                  </p>
                </div>
              ) : (
                groupedSales.map((group) => {
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
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              Carnê #{group.saleKey}
                            </p>
                            <p className="text-xs text-slate-400">
                              {group.items.length} parcela(s) | Total da compra: {formatCurrency(group.totalValue)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-bold ${group.totalPending > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {group.totalPending > 0 ? `Pendente: ${formatCurrency(group.totalPending)}` : 'Quitado'}
                          </span>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
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
                                  <p className="font-bold text-slate-900 dark:text-white">Parcela {parcNum}</p>
                                  <p className="text-[11px] text-slate-400">Vencimento: {formatDate(inv.vencimento)}</p>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-sm text-slate-900 dark:text-white">
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
                                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 shadow-sm transition-all cursor-pointer"
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
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>

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
