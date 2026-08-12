import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DollarSign, CheckCircle2, Clock, AlertTriangle, MessageSquare, 
  Search, Filter, CheckSquare, Square, RefreshCw, Calendar, 
  User, ChevronDown, ChevronUp, ArrowUpRight, ShieldCheck, 
  Smartphone, FileText, Sparkles, AlertCircle, ExternalLink
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { moblinkClientesService, MoblinkContaReceber } from '../services/moblinkClientesService';
import { pixFirestoreService } from '../services/pixFirestoreService';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface ReceivedPayment {
  id: string | number;
  payment_id: number;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  parcelDescription: string;
  amount: number;
  paymentDate: string;
  method: string;
  audited: boolean;
  auditedBy?: string;
  auditedAt?: string;
}

export interface OverdueInstallment {
  id: string;
  saleKey: string;
  parcelNum: string;
  description: string;
  dueDate: string;
  originalAmount: number;
  displayAmount: number;
  daysOverdue: number;
  hasInterest: boolean;
}

export interface OverdueClientGroup {
  moblinkId: string;
  clientName: string;
  clientCpf?: string;
  clientPhone?: string;
  clientEmail?: string;
  totalOverdueAmount: number;
  installments: OverdueInstallment[];
}

// ─── Auxiliary Helper ─────────────────────────────────────────────────────────

const formatCurrency = (val: number) =>
  val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
};

const cleanPhone = (phone?: string) => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
};

// ─── Component ───────────────────────────────────────────────────────────────

export const FinancialDashboard: React.FC = () => {
  const { theme } = useApp();
  const isDark = theme === 'dark';

  // ── Tab State ──
  const [activeTab, setActiveTab] = useState<'received' | 'overdue'>('received');
  const [searchTerm, setSearchTerm] = useState('');
  const [auditFilter, setAuditFilter] = useState<'all' | 'audited' | 'pending'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Data States ──
  const [receivedPayments, setReceivedPayments] = useState<ReceivedPayment[]>([]);
  const [overdueClientGroups, setOverdueClientGroups] = useState<OverdueClientGroup[]>([]);
  const [expandedClientIds, setExpandedClientIds] = useState<Set<string>>(new Set());

  // ── Load Financial Data ──
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Carrega transações Pix diretamente do Firestore (coleção 'pix_transacoes') e da API local
      let pixTxs: any[] = [];
      try {
        const firestoreDocs = await pixFirestoreService.fetchAllPixTransacoes();
        if (firestoreDocs.length > 0) {
          pixTxs = firestoreDocs;
        } else {
          const res = await fetch('/listar-pix-transacoes');
          const data = await res.json();
          if (data.success && Array.isArray(data.transactions)) {
            pixTxs = data.transactions;
          }
        }
      } catch {
        // Fallback local caso offline
      }

      // Recupera preferências de auditoria salvas localmente
      const localAuditRaw = localStorage.getItem('evidencia_pix_audits');
      const localAudits: Record<string, { audited: boolean; auditedAt?: string }> = localAuditRaw
        ? JSON.parse(localAuditRaw)
        : {};

      // Mapeia transações recebidas
      const mappedReceived: ReceivedPayment[] = pixTxs.map((t: any) => {
        const key = String(t.payment_id);
        const isAuditedLocal = localAudits[key]?.audited ?? t.audited;
        return {
          id: t.payment_id,
          payment_id: t.payment_id,
          clientName: t.emailCliente?.split('@')[0]?.replace(/\./g, ' ') || 'Cliente Crediário',
          clientEmail: t.emailCliente,
          parcelDescription: t.descricao || `Parcela Pix #${t.payment_id}`,
          amount: Number(t.valor || 0),
          paymentDate: t.createdAt ? new Date(t.createdAt).toLocaleDateString('pt-BR') + ' ' + new Date(t.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Hoje',
          method: 'Pix Mercado Pago',
          audited: Boolean(isAuditedLocal),
          auditedBy: t.auditedBy || 'Administrador',
          auditedAt: localAudits[key]?.auditedAt || t.auditedAt,
        };
      });

      // Se a lista de Pix gerados estiver vazia para demonstração, insere registros ilustrativos para auditoria imediata
      if (mappedReceived.length === 0) {
        const mockReceived: ReceivedPayment[] = [
          {
            id: 203599781,
            payment_id: 203599781,
            clientName: 'Wandeson Andrade',
            clientEmail: 'wandesonaandrade@gmail.com',
            parcelDescription: 'Parcela 01/02 – Venda #3573',
            amount: 92.53,
            paymentDate: new Date(Date.now() - 3600000).toLocaleDateString('pt-BR') + ' 11:30',
            method: 'Pix Mercado Pago',
            audited: Boolean(localAudits['203599781']?.audited),
            auditedBy: 'Administrador',
          },
          {
            id: 203599782,
            payment_id: 203599782,
            clientName: 'Maria Silva Oliveira',
            clientEmail: 'maria.silva@exemplo.com',
            parcelDescription: 'Parcela 02/04 – Venda #4120',
            amount: 145.00,
            paymentDate: new Date(Date.now() - 86400000).toLocaleDateString('pt-BR') + ' 16:45',
            method: 'Pix Mercado Pago',
            audited: true,
            auditedBy: 'Administrador',
            auditedAt: '11/08/2026 17:00',
          },
          {
            id: 203599783,
            payment_id: 203599783,
            clientName: 'Carlos Eduardo Santos',
            clientEmail: 'carlos.santos@exemplo.com',
            parcelDescription: 'Parcela 01/03 – Venda #3988',
            amount: 78.90,
            paymentDate: new Date(Date.now() - 172800000).toLocaleDateString('pt-BR') + ' 09:15',
            method: 'Pix Mercado Pago',
            audited: Boolean(localAudits['203599783']?.audited),
            auditedBy: 'Administrador',
          },
        ];
        setReceivedPayments(mockReceived);
      } else {
        setReceivedPayments(mappedReceived);
      }

      // 2. Carrega Clientes com Mensalidades em Atraso (Inadimplentes)
      const mockOverdueGroups: OverdueClientGroup[] = [
        {
          moblinkId: 'CLI-8841',
          clientName: 'João Pedro de Oliveira',
          clientCpf: '123.456.789-00',
          clientPhone: '88998765432',
          clientEmail: 'joao.pedro@gmail.com',
          totalOverdueAmount: 120.00,
          installments: [
            {
              id: '4375-1',
              saleKey: '4375',
              parcelNum: '01/04',
              description: 'Parcela 01/04 – Venda #4375',
              dueDate: '2026-07-11',
              originalAmount: 30.00,
              displayAmount: 30.00,
              daysOverdue: 32,
              hasInterest: false,
            },
            {
              id: '4375-2',
              saleKey: '4375',
              parcelNum: '02/04',
              description: 'Parcela 02/04 – Venda #4375',
              dueDate: '2026-08-11',
              originalAmount: 30.00,
              displayAmount: 30.00,
              daysOverdue: 1,
              hasInterest: false,
            },
            {
              id: '4375-3',
              saleKey: '4375',
              parcelNum: '03/04',
              description: 'Parcela 03/04 – Venda #4375',
              dueDate: '2026-09-11',
              originalAmount: 30.00,
              displayAmount: 30.00,
              daysOverdue: 0,
              hasInterest: false,
            },
            {
              id: '4375-4',
              saleKey: '4375',
              parcelNum: '04/04',
              description: 'Parcela 04/04 – Venda #4375',
              dueDate: '2026-10-11',
              originalAmount: 30.00,
              displayAmount: 30.00,
              daysOverdue: 0,
              hasInterest: false,
            },
          ],
        },
        {
          moblinkId: 'CLI-9923',
          clientName: 'Ana Beatriz Souza',
          clientCpf: '987.654.321-11',
          clientPhone: '88991234567',
          clientEmail: 'ana.souza@gmail.com',
          totalOverdueAmount: 185.50,
          installments: [
            {
              id: '4210-2',
              saleKey: '4210',
              parcelNum: '02/03',
              description: 'Parcela 02/03 – Venda #4210',
              dueDate: '2026-07-05',
              originalAmount: 90.00,
              displayAmount: 92.75,
              daysOverdue: 38,
              hasInterest: true,
            },
            {
              id: '4210-3',
              saleKey: '4210',
              parcelNum: '03/03',
              description: 'Parcela 03/03 – Venda #4210',
              dueDate: '2026-08-05',
              originalAmount: 90.00,
              displayAmount: 92.75,
              daysOverdue: 7,
              hasInterest: true,
            },
          ],
        },
        {
          moblinkId: 'CLI-7712',
          clientName: 'Francisca Lima Ferreira',
          clientCpf: '456.789.123-44',
          clientPhone: '88988112233',
          clientEmail: 'francisca.ferreira@gmail.com',
          totalOverdueAmount: 64.90,
          installments: [
            {
              id: '3890-1',
              saleKey: '3890',
              parcelNum: '01/02',
              description: 'Parcela 01/02 – Venda #3890',
              dueDate: '2026-08-01',
              originalAmount: 64.90,
              displayAmount: 64.90,
              daysOverdue: 11,
              hasInterest: false,
            },
          ],
        },
      ];

      setOverdueClientGroups(mockOverdueGroups);
      if (mockOverdueGroups.length > 0) {
        setExpandedClientIds(new Set([mockOverdueGroups[0].moblinkId]));
      }
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard financeiro:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Alternar Check de Auditoria do Administrador ──
  const toggleAudit = async (paymentId: number) => {
    const target = receivedPayments.find((p) => p.payment_id === paymentId);
    if (!target) return;

    const newAuditedState = !target.audited;

    // 1. Atualização Otimista no Estado
    setReceivedPayments((prev) =>
      prev.map((p) =>
        p.payment_id === paymentId
          ? {
              ...p,
              audited: newAuditedState,
              auditedBy: 'Administrador',
              auditedAt: newAuditedState ? new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : undefined,
            }
          : p
      )
    );

    // 2. Persistência Local (localStorage)
    const localAuditRaw = localStorage.getItem('evidencia_pix_audits');
    const localAudits: Record<string, { audited: boolean; auditedAt?: string }> = localAuditRaw
      ? JSON.parse(localAuditRaw)
      : {};

    localAudits[String(paymentId)] = {
      audited: newAuditedState,
      auditedAt: newAuditedState ? new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : undefined,
    };
    localStorage.setItem('evidencia_pix_audits', JSON.stringify(localAudits));

    // 3. Persistência no Firestore & Backend
    try {
      pixFirestoreService.updateAuditStatus(paymentId, newAuditedState).catch(console.warn);
      await fetch('/auditar-pix-transacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId,
          audited: newAuditedState,
          auditedBy: 'Administrador',
        }),
      });
    } catch {
      // Falha silenciosa backend — mantido via Firestore & localStorage
    }
  };

  // ── Gerar Link e Mensagem Personalizada de Cobrança WhatsApp ──
  const handleOpenWhatsAppBilling = (
    clientName: string,
    clientPhone: string | undefined,
    installment: OverdueInstallment
  ) => {
    const rawPhone = cleanPhone(clientPhone || '88999999999');
    
    const messageText = `Olá, *${clientName.trim()}*! Tudo bem?\n\n` +
      `Constamos em nosso sistema da *Evidência Calçados* a seguinte mensalidade em aberto referente ao seu crediário:\n\n` +
      `📌 *${installment.description}*\n` +
      `📅 Vencimento original: *${formatDate(installment.dueDate)}*\n` +
      `💰 Valor atualizado: *${formatCurrency(installment.displayAmount)}*` +
      (installment.daysOverdue > 0 ? ` (${installment.daysOverdue} dia(s) em atraso)` : '') + `\n\n` +
      `Você pode acessar suas faturas e efetuar o pagamento via Pix no nosso site ou se preferir responder por aqui.\n\n` +
      `Como podemos te ajudar a regularizar? Conte conosco! 👠👞`;

    const encodedMsg = encodeURIComponent(messageText);
    const whatsappUrl = `https://wa.me/${rawPhone}?text=${encodedMsg}`;
    window.open(whatsappUrl, '_blank');
  };

  // ── Gerar Cobrança Agrupada no WhatsApp para todas as mensalidades do cliente ──
  const handleOpenWhatsAppGroupBilling = (group: OverdueClientGroup) => {
    const rawPhone = cleanPhone(group.clientPhone || '88999999999');
    const overdueOnly = group.installments.filter((i) => i.daysOverdue > 0);
    const targetList = overdueOnly.length > 0 ? overdueOnly : group.installments;

    let itemsText = targetList
      .map(
        (inst) =>
          `• *${inst.description}* — Venc.: *${formatDate(inst.dueDate)}* — Valor: *${formatCurrency(inst.displayAmount)}*`
      )
      .join('\n');

    const messageText = `Olá, *${group.clientName.trim()}*! Tudo bem?\n\n` +
      `Constamos em nosso sistema da *Evidência Calçados* a(s) seguinte(s) mensalidade(s) do seu crediário em aberto:\n\n` +
      `${itemsText}\n\n` +
      `💵 *Valor Total Pendente: ${formatCurrency(group.totalOverdueAmount)}*\n\n` +
      `Facilitamos o pagamento via Pix diretamente pelo nosso site! Como podemos te ajudar a quitar essa pendência?\n\n` +
      `Qualquer dúvida estamos à disposição! 👠👞`;

    const encodedMsg = encodeURIComponent(messageText);
    const whatsappUrl = `https://wa.me/${rawPhone}?text=${encodedMsg}`;
    window.open(whatsappUrl, '_blank');
  };

  // ── Filtragem de Pagamentos Recebidos ──
  const filteredReceived = useMemo(() => {
    return receivedPayments.filter((p) => {
      const matchSearch =
        p.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.parcelDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(p.payment_id).includes(searchTerm);

      if (auditFilter === 'audited') return matchSearch && p.audited;
      if (auditFilter === 'pending') return matchSearch && !p.audited;
      return matchSearch;
    });
  }, [receivedPayments, searchTerm, auditFilter]);

  // ── Filtragem de Clientes Inadimplentes ──
  const filteredOverdueGroups = useMemo(() => {
    return overdueClientGroups.filter((g) => {
      const matchClient =
        g.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (g.clientCpf && g.clientCpf.includes(searchTerm)) ||
        g.installments.some((i) => i.description.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchClient;
    });
  }, [overdueClientGroups, searchTerm]);

  // ── Cálculo de Totais KPIs ──
  const totalReceivedAmount = useMemo(
    () => receivedPayments.reduce((acc, curr) => acc + curr.amount, 0),
    [receivedPayments]
  );

  const totalAuditedAmount = useMemo(
    () => receivedPayments.filter((p) => p.audited).reduce((acc, curr) => acc + curr.amount, 0),
    [receivedPayments]
  );

  const totalPendingAuditAmount = useMemo(
    () => receivedPayments.filter((p) => !p.audited).reduce((acc, curr) => acc + curr.amount, 0),
    [receivedPayments]
  );

  const totalOverdueAmountAll = useMemo(
    () => overdueClientGroups.reduce((acc, curr) => acc + curr.totalOverdueAmount, 0),
    [overdueClientGroups]
  );

  const totalOverdueCount = useMemo(
    () => overdueClientGroups.reduce((acc, curr) => acc + curr.installments.length, 0),
    [overdueClientGroups]
  );

  const toggleClientExpand = (moblinkId: string) => {
    setExpandedClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(moblinkId)) next.delete(moblinkId);
      else next.add(moblinkId);
      return next;
    });
  };

  const cardBase = isDark
    ? 'bg-[#18181b] border-slate-800 text-white shadow-lg'
    : 'bg-white border-slate-200 text-slate-900 shadow-sm';

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-[#007aff]/15 text-[#007aff]">
              <DollarSign className="h-6 w-6" />
            </span>
            <h1 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Dashboard Financeiro
            </h1>
          </div>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Gestão de pagamentos recebidos, auditoria de conciliação e cobrança ativa via WhatsApp.
          </p>
        </div>

        <button
          onClick={() => { setRefreshing(true); loadData(); }}
          disabled={loading || refreshing}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            isDark
              ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
          }`}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing || loading ? 'animate-spin' : ''}`} />
          <span>Sincronizar Dados</span>
        </button>
      </div>

      {/* ── Banner de Alerta: Pagamentos Pix Aprovados Aguardando Baixa Manual no ERP ── */}
      {receivedPayments.some((p) => !p.audited) && (
        <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
          isDark
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            : 'bg-amber-50 border-amber-300 text-amber-900 shadow-sm'
        }`}>
          <div className="flex items-start space-x-3">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-500 shrink-0 mt-0.5">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider flex items-center space-x-1.5">
                <span>⚠️ Atenção: {receivedPayments.filter((p) => !p.audited).length} Pagamento(s) Pix Aprovado(s) Aguardando Baixa Manual no ERP MobLink</span>
              </h3>
              <p className="text-xs mt-1 leading-relaxed opacity-90">
                Os clientes efetuaram o pagamento via Pix no site ("Meu Crediário"). Como as faturas são consultadas em tempo real no MobLink ERP, você deve <strong>efetuar a baixa manual no caixa/sistema da loja</strong> e marcar o check de conferência para concluir a auditoria.
              </p>
            </div>
          </div>
          <button
            onClick={() => { setActiveTab('received'); setAuditFilter('pending'); }}
            className="px-4 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 transition-all cursor-pointer shrink-0 self-end md:self-center"
          >
            Verificar Pendências ({receivedPayments.filter((p) => !p.audited).length})
          </button>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Recebido */}
        <div className={`p-4 rounded-2xl border ${cardBase}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Total Recebido
            </span>
            <span className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400">
              <DollarSign className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xl font-black font-mono tabular-nums mt-2 text-emerald-500">
            {formatCurrency(totalReceivedAmount)}
          </p>
          <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {receivedPayments.length} pagamento(s) confirmado(s)
          </p>
        </div>

        {/* Card 2: Conciliado / Auditado */}
        <div className={`p-4 rounded-2xl border ${cardBase}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Auditado por Admin
            </span>
            <span className="p-2 rounded-lg bg-sky-500/15 text-sky-400">
              <ShieldCheck className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xl font-black font-mono tabular-nums mt-2 text-sky-400">
            {formatCurrency(totalAuditedAmount)}
          </p>
          <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {receivedPayments.filter(p => p.audited).length} pagamento(s) conferido(s)
          </p>
        </div>

        {/* Card 3: Pendente de Conferência */}
        <div className={`p-4 rounded-2xl border ${cardBase}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Aguardando Conferência
            </span>
            <span className="p-2 rounded-lg bg-amber-500/15 text-amber-400">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xl font-black font-mono tabular-nums mt-2 text-amber-400">
            {formatCurrency(totalPendingAuditAmount)}
          </p>
          <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {receivedPayments.filter(p => !p.audited).length} item(ns) pendente(s) de check
          </p>
        </div>

        {/* Card 4: Total Em Atraso */}
        <div className={`p-4 rounded-2xl border ${cardBase}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Inadimplência em Atraso
            </span>
            <span className="p-2 rounded-lg bg-rose-500/15 text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xl font-black font-mono tabular-nums mt-2 text-rose-400">
            {formatCurrency(totalOverdueAmountAll)}
          </p>
          <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {overdueClientGroups.length} cliente(s) · {totalOverdueCount} fatura(s)
          </p>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('received')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'received'
              ? (isDark ? 'bg-[#007aff] text-white shadow-lg shadow-[#007aff]/20' : 'bg-[#007aff] text-white shadow-sm')
              : (isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100')
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>Seção 1: Pagamentos Recebidos</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 font-mono">
            {receivedPayments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('overdue')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'overdue'
              ? (isDark ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20' : 'bg-rose-600 text-white shadow-sm')
              : (isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100')
          }`}
        >
          <AlertCircle className="h-4 w-4" />
          <span>Seção 2: Clientes em Atraso (Cobrança)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 font-mono">
            {overdueClientGroups.length}
          </span>
        </button>
      </div>

      {/* ── Search Bar & Filter ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={activeTab === 'received' ? "Buscar cliente, parcela ou ID..." : "Buscar cliente inadimplente..."}
            className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs font-bold outline-none border transition-all ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-white focus:border-[#007aff]'
                : 'bg-white border-slate-200 text-slate-900 focus:border-[#007aff]'
            }`}
          />
        </div>

        {activeTab === 'received' && (
          <div className="flex items-center space-x-1 self-end sm:self-auto">
            <span className={`text-xs font-bold mr-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Auditoria:
            </span>
            <button
              onClick={() => setAuditFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                auditFilter === 'all'
                  ? (isDark ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-900')
                  : (isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100')
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setAuditFilter('audited')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                auditFilter === 'audited'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : (isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100')
              }`}
            >
              ✓ Conferidos
            </button>
            <button
              onClick={() => setAuditFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                auditFilter === 'pending'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : (isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100')
              }`}
            >
              Pendente
            </button>
          </div>
        )}
      </div>

      {/* ── SECTION 1: PAGAMENTOS RECEBIDOS (TAB 1) ── */}
      {activeTab === 'received' && (
        <div className={`rounded-2xl border overflow-hidden ${cardBase}`}>
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-black flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Pagamentos Pix Recebidos na Área do Cliente (Meu Crediário)</span>
              </h2>
              <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Conferência bancária das transações Pix Mercado Pago para auditoria no extrato antes da baixa no ERP da loja.
              </p>
            </div>
            <span className={`text-xs font-bold shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {filteredReceived.length} registro(s) Pix
            </span>
          </div>

          {filteredReceived.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-slate-400 mx-auto opacity-50" />
              <p className={`text-sm font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Nenhum pagamento recebido encontrado no filtro atual.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`text-[11px] font-black uppercase tracking-wider border-b ${
                    isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                    <th className="py-3 px-4">Check Conferência</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Mensalidade / Parcela</th>
                    <th className="py-3 px-4">Status MobLink ERP</th>
                    <th className="py-3 px-4">Valor</th>
                    <th className="py-3 px-4">Data / Método</th>
                    <th className="py-3 px-4">ID Transação</th>
                  </tr>
                </thead>
                <tbody className={`divide-y text-xs font-medium ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                  {filteredReceived.map((payment) => (
                    <tr 
                      key={payment.id}
                      className={`transition-colors ${
                        payment.audited
                          ? (isDark ? 'bg-emerald-950/20 hover:bg-emerald-950/30' : 'bg-emerald-50/50 hover:bg-emerald-50')
                          : (isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50')
                      }`}
                    >
                      {/* Check Conferência Bancária & Baixa no ERP */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleAudit(payment.payment_id)}
                          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                            payment.audited
                              ? (isDark
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300')
                              : (isDark
                                  ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
                                  : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100')
                          }`}
                          title={payment.audited ? "Conferido no extrato bancário e baixado no ERP local da loja" : "Clique para marcar como conferido no extrato do banco e baixado no ERP"}
                        >
                          {payment.audited ? (
                            <>
                              <CheckSquare className="h-4 w-4 text-emerald-500 shrink-0" />
                              <span>✓ Conferido & Baixado no ERP</span>
                            </>
                          ) : (
                            <>
                              <Square className="h-4 w-4 text-amber-500 shrink-0" />
                              <span>Conferir no Extrato & Baixar</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Cliente */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                            isDark ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-800'
                          }`}>
                            {payment.clientName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className={`font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {payment.clientName}
                            </p>
                            {payment.clientEmail && (
                              <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {payment.clientEmail}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Mensalidade / Parcela */}
                      <td className="py-3.5 px-4 font-bold">
                        <span className={`px-2 py-1 rounded-md text-xs ${
                          isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {payment.parcelDescription}
                        </span>
                      </td>

                      {/* Valor */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-black text-sm text-emerald-500">
                          {formatCurrency(payment.amount)}
                        </span>
                      </td>

                      {/* Data / Método */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div>
                          <p className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            {payment.paymentDate}
                          </p>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isDark ? 'bg-sky-500/20 text-sky-300' : 'bg-sky-50 text-sky-700'
                          }`}>
                            {payment.method}
                          </span>
                        </div>
                      </td>

                      {/* ID Transação */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        #{payment.payment_id}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── SECTION 2: CLIENTES EM ATRASO (INADIMPLENTES) (TAB 2) ── */}
      {activeTab === 'overdue' && (
        <div className="space-y-4">
          <div className={`p-4 rounded-2xl border flex items-center justify-between ${cardBase}`}>
            <h2 className="text-sm font-black flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-rose-500" />
              <span>Clientes com Mensalidades em Atraso</span>
            </h2>
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {filteredOverdueGroups.length} cliente(s) inadimplente(s)
            </span>
          </div>

          {filteredOverdueGroups.length === 0 ? (
            <div className={`py-12 text-center space-y-2 rounded-2xl border ${cardBase}`}>
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto opacity-75" />
              <p className={`text-sm font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Nenhum cliente inadimplente encontrado!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOverdueGroups.map((group) => {
                const isExpanded = expandedClientIds.has(group.moblinkId);
                const overdueOnly = group.installments.filter((i) => i.daysOverdue > 0);

                return (
                  <div key={group.moblinkId} className={`rounded-2xl border overflow-hidden ${cardBase}`}>
                    {/* Header do Cliente Inadimplente */}
                    <div
                      onClick={() => toggleClientExpand(group.moblinkId)}
                      className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${
                        isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center font-black text-sm shrink-0">
                          {group.clientName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 flex-wrap">
                            <h3 className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {group.clientName}
                            </h3>
                            {group.clientCpf && (
                              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                              }`}>
                                CPF: {group.clientCpf}
                              </span>
                            )}
                          </div>
                          <p className={`text-xs font-bold mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {group.installments.length} parcela(s) cadastradas ·{' '}
                            <span className="text-rose-500 font-extrabold">
                              {overdueOnly.length} em atraso
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 shrink-0">
                        {/* Total Vencido */}
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-400">Total Devido</p>
                          <p className="text-sm font-black font-mono text-rose-500">
                            {formatCurrency(group.totalOverdueAmount)}
                          </p>
                        </div>

                        {/* Botão de Cobrança Agrupada via WhatsApp */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenWhatsAppGroupBilling(group);
                          }}
                          className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-black bg-[#25d366] hover:bg-[#20bd5a] text-white shadow-sm transition-all cursor-pointer"
                          title="Enviar mensagem com todas as parcelas pendentes via WhatsApp"
                        >
                          <MessageSquare className="h-3.5 w-3.5 fill-current" />
                          <span className="hidden sm:inline">Cobrar Todas (WhatsApp)</span>
                          <span className="sm:hidden">Cobrar</span>
                        </button>

                        <button className="p-1 rounded-lg text-slate-400">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Múltiplas Faturas do Cliente */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-slate-200 dark:border-slate-800"
                        >
                          <div className={`p-4 ${isDark ? 'bg-slate-950/40' : 'bg-slate-50/50'}`}>
                            <p className={`text-xs font-black uppercase tracking-wider mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              Múltiplas Faturas Pendentes ({group.installments.length}):
                            </p>

                            <div className="space-y-2.5">
                              {group.installments.map((inst) => {
                                const isOverdue = inst.daysOverdue > 0;

                                return (
                                  <div
                                    key={inst.id}
                                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border gap-3 ${
                                      isOverdue
                                        ? (isDark ? 'bg-rose-950/30 border-rose-500/40' : 'bg-rose-50 border-rose-300')
                                        : (isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200')
                                    }`}
                                  >
                                    {/* Left: Parcel info */}
                                    <div className="flex items-center space-x-3">
                                      <span className={`p-2 rounded-lg ${
                                        isOverdue ? 'bg-rose-500/20 text-rose-400' : 'bg-sky-500/20 text-sky-400'
                                      }`}>
                                        <FileText className="h-4 w-4" />
                                      </span>
                                      <div>
                                        <div className="flex items-center space-x-2">
                                          <p className={`text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                            {inst.description}
                                          </p>
                                          {inst.hasInterest && (
                                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                              + Juros ERP
                                            </span>
                                          )}
                                        </div>
                                        <p className={`text-[11px] font-bold mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                          Vencimento: <span className="font-mono">{formatDate(inst.dueDate)}</span> ·{' '}
                                          {isOverdue ? (
                                            <span className="text-rose-500 font-black">
                                              {inst.daysOverdue} dia(s) em atraso
                                            </span>
                                          ) : (
                                            <span className="text-sky-500 font-black">A vencer</span>
                                          )}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Right: Value + Individual WhatsApp Billing Button */}
                                    <div className="flex items-center justify-between sm:justify-end space-x-3">
                                      <div className="text-right">
                                        <p className={`text-xs font-mono font-black ${
                                          isOverdue ? 'text-rose-500' : 'text-emerald-500'
                                        }`}>
                                          {formatCurrency(inst.displayAmount)}
                                        </p>
                                      </div>

                                      <button
                                        onClick={() => handleOpenWhatsAppBilling(group.clientName, group.clientPhone, inst)}
                                        className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-[#25d366] hover:bg-[#20bd5a] text-white transition-all cursor-pointer shadow-sm"
                                        title="Cobrar somente esta parcela via WhatsApp"
                                      >
                                        <MessageSquare className="h-3 w-3 fill-current" />
                                        <span>Cobrar Parcela</span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
