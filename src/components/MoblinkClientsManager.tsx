import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { UserProfile, Product, CrediarioStatus } from '../types';
import { moblinkClientesService, MoblinkContaReceber, getInstallmentAmount } from '../services/moblinkClientesService';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Users, 
  Search, 
  RefreshCw, 
  Filter, 
  Eye, 
  X, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle2, 
  Zap, 
  Calendar, 
  FileText, 
  DollarSign, 
  MessageCircle, 
  Building, 
  UserCheck, 
  Clock, 
  Sparkles,
  ExternalLink,
  ShieldCheck,
  ShoppingCart,
  Heart,
  Cake,
  Package,
  Info,
  Check,
  ThumbsUp,
  ThumbsDown,
  Edit3,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface MoblinkClientsManagerProps {
  isDark?: boolean;
}

export const isBirthdayMatch = (bdayStr?: string | null, filter?: 'Todos' | 'Dia' | 'Semana' | 'Mês'): boolean => {
  // Se o filtro for 'Todos' ou não especificado, retorna true para exibir qualquer cliente
  if (filter === 'Todos' || !filter) return true;
  
  // Validação Estrita: Se a data for nula, indefinida, vazia ou zerada, ignora o cliente nos filtros de aniversariante
  if (!bdayStr || typeof bdayStr !== 'string' || !bdayStr.trim() || bdayStr.trim().startsWith('0000')) {
    return false;
  }

  try {
    const clean = bdayStr.trim().split('T')[0];
    const parts = clean.split(/[-/]/);
    let day = 0;
    let month = 0;

    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        month = parseInt(parts[1], 10) - 1;
        day = parseInt(parts[2], 10);
      } else {
        // DD/MM/YYYY
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
      }
    }

    if (isNaN(day) || isNaN(month) || day <= 0 || day > 31 || month < 0 || month > 11) {
      return false;
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();

    if (filter === 'Dia') {
      return month === currentMonth && day === currentDay;
    }

    if (filter === 'Mês') {
      return month === currentMonth;
    }

    if (filter === 'Semana') {
      if (month !== currentMonth) return false;
      const diff = Math.abs(day - currentDay);
      return diff <= 3;
    }
  } catch (_) {}

  return false;
};

export const MoblinkClientsManager: React.FC<MoblinkClientsManagerProps> = ({ isDark = true }) => {
  const { products, addToast } = useApp();

  const [clients, setClients] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgressMessage, setSyncProgressMessage] = useState('');
  
  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [credFilter, setCredFilter] = useState<'Todos' | 'Aprovado' | 'EmAnalise' | 'NaoAprovado' | 'ComDebito'>('Todos');
  const [personTypeFilter, setPersonTypeFilter] = useState<'Todos' | 'PF' | 'PJ'>('Todos');
  const [bdayFilter, setBdayFilter] = useState<'Todos' | 'Dia' | 'Semana' | 'Mês'>('Todos');
  
  // Detail Modal State
  const [selectedClient, setSelectedClient] = useState<UserProfile | null>(null);
  const [detailTab, setDetailTab] = useState<'pessoal' | 'contato' | 'financeiro' | 'produtos'>('pessoal');
  const [productTab, setProductTab] = useState<'carrinho' | 'favoritos'>('carrinho');

  // Credit Action Form State
  const [limitInput, setLimitInput] = useState<string>('500');
  const [isUpdatingCredit, setIsUpdatingCredit] = useState(false);

  // Invoices & Contas a Receber Lazy Loading State
  const [invoices, setInvoices] = useState<MoblinkContaReceber[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [hasLoadedInvoices, setHasLoadedInvoices] = useState(false);

  // Accordion state for grouped sales
  const [expandedSales, setExpandedSales] = useState<{ [saleKey: string]: boolean }>({});

  const toggleSaleAccordion = (saleKey: string) => {
    setExpandedSales(prev => ({
      ...prev,
      [saleKey]: !prev[saleKey]
    }));
  };

  // Reset Lazy Invoices state when selected client changes
  useEffect(() => {
    setInvoices([]);
    setHasLoadedInvoices(false);
    setIsLoadingInvoices(false);
    setExpandedSales({});
  }, [selectedClient?.uid, (selectedClient as any)?.moblinkId, (selectedClient as any)?.id]);

  // Lazy Fetch Invoices when user switches to 'financeiro' tab
  useEffect(() => {
    if (detailTab === 'financeiro' && selectedClient && !hasLoadedInvoices && !isLoadingInvoices) {
      const moblinkId = selectedClient.moblinkId || (selectedClient as any).id;
      if (moblinkId) {
        setIsLoadingInvoices(true);
        moblinkClientesService.fetchClienteContasReceber(String(moblinkId))
          .then(data => {
            setInvoices(data || []);
            setHasLoadedInvoices(true);
          })
          .catch(err => {
            console.warn("Erro ao carregar faturas a receber:", err);
            setHasLoadedInvoices(true);
          })
          .finally(() => {
            setIsLoadingInvoices(false);
          });
      } else {
        setHasLoadedInvoices(true);
      }
    }
  }, [detailTab, selectedClient, hasLoadedInvoices, isLoadingInvoices]);

  const handleReloadInvoices = () => {
    if (!selectedClient) return;
    const moblinkId = selectedClient.moblinkId || (selectedClient as any).id;
    if (moblinkId) {
      setIsLoadingInvoices(true);
      moblinkClientesService.fetchClienteContasReceber(String(moblinkId))
        .then(data => {
          setInvoices(data || []);
          setHasLoadedInvoices(true);
          addToast("Faturas Atualizadas", `${data?.length || 0} contas/parcelas localizadas no ERP.`, "info");
        })
        .catch(err => {
          console.warn("Erro ao recarregar faturas:", err);
        })
        .finally(() => {
          setIsLoadingInvoices(false);
        });
    }
  };

  // Group invoices by id_venda / document number
  const groupedInvoices = useMemo(() => {
    const groupsMap: { 
      [saleKey: string]: { 
        saleKey: string;
        idVenda: string | null;
        docNum: string; 
        historico: string; 
        items: MoblinkContaReceber[]; 
        totalVal: number; 
        totalPaid: number; 
        totalPending: number;
        hasOverdue: boolean;
      } 
    } = {};

    invoices.forEach(inv => {
      const idVenda = inv.id_venda ? String(inv.id_venda) : null;
      const docNum = String(inv.documento || inv.numero_documento || inv.id_venda || 'Sem N°');
      const saleKey = idVenda ? `venda_${idVenda}` : `doc_${docNum}`;
      
      const historico = String(inv.historico || inv.historico_origem || 'Carnê de Loja Evidência');
      const amountInfo = getInstallmentAmount(inv);
      const val = amountInfo.originalAmount;
      const currentPayableVal = amountInfo.displayAmount;
      const isPaid = amountInfo.isPaid;
      const isOverdue = amountInfo.isOverdue;

      if (!groupsMap[saleKey]) {
        groupsMap[saleKey] = {
          saleKey,
          idVenda,
          docNum,
          historico,
          items: [],
          totalVal: 0,
          totalPaid: 0,
          totalPending: 0,
          hasOverdue: false
        };
      }

      groupsMap[saleKey].items.push(inv);
      groupsMap[saleKey].totalVal += val;
      if (isPaid) {
        groupsMap[saleKey].totalPaid += currentPayableVal;
      } else {
        groupsMap[saleKey].totalPending += currentPayableVal;
      }

      if (isOverdue) {
        groupsMap[saleKey].hasOverdue = true;
      }
    });

    // Sort items within each purchase by installment number
    Object.values(groupsMap).forEach(g => {
      g.items.sort((a, b) => {
        const parcA = parseInt(String(a.parcela || 1), 10);
        const parcB = parseInt(String(b.parcela || 1), 10);
        return parcA - parcB;
      });
    });

    return Object.values(groupsMap);
  }, [invoices]);

  // Auto-expand sales that have pending/overdue debt or default to expanding the first sale
  useEffect(() => {
    if (groupedInvoices.length > 0) {
      const initialMap: { [saleKey: string]: boolean } = {};
      groupedInvoices.forEach((g, idx) => {
        if (g.totalPending > 0 || idx === 0) {
          initialMap[g.saleKey] = true;
        }
      });
      setExpandedSales(initialMap);
    } else {
      setExpandedSales({});
    }
  }, [groupedInvoices]);

  // Load clients from Firestore
  const loadClientsFromFirestore = async () => {
    try {
      setIsLoading(true);
      const snap = await getDocs(collection(db, 'users'));
      const list: UserProfile[] = [];
      snap.forEach(docSnap => {
        list.push({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
      });

      setClients(list);
    } catch (err) {
      console.warn("Erro ao buscar clientes no Firestore:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClientsFromFirestore();
  }, []);

  // Sync with MobLink ERP API
  const handleSyncERP = async () => {
    try {
      setIsSyncing(true);
      setSyncProgressMessage('Conectando ao ERP MobLink...');
      const res = await moblinkClientesService.syncClientesToFirestore((curr, total, msg) => {
        setSyncProgressMessage(msg);
      });
      
      await loadClientsFromFirestore();
      addToast(
        'Base de Clientes Atualizada!',
        `${res.imported} novos clientes importados e ${res.updated} atualizados do ERP MobLink.`,
        'success'
      );
    } catch (err: any) {
      console.error("Erro na sincronização de clientes:", err);
      addToast('Erro ao Sincronizar', err.message || 'Falha ao conectar com o MobLink ERP.', 'error');
    } finally {
      setIsSyncing(false);
      setSyncProgressMessage('');
    }
  };

  // Credit Approval & Rejection Direct Actions
  const handleSetCrediarioStatus = async (client: UserProfile, newStatus: CrediarioStatus, approvedLimit?: number) => {
    if (!client) return;
    const targetUid = client.uid || (client as any).docId || (client as any).id;
    if (!targetUid) {
      addToast("Erro", "Identificador de cliente inválido.", "error");
      return;
    }

    try {
      setIsUpdatingCredit(true);
      const docRef = doc(db, 'users', targetUid);
      const updatedFields: any = {
        crediarioStatus: newStatus,
        updatedAt: new Date().toISOString()
      };

      if (newStatus === 'Aprovado') {
        const parsedLimit = approvedLimit ?? parseFloat(limitInput) ?? 500;
        updatedFields.limite_cred = parsedLimit;
        updatedFields.sit_cred = 'A';
      } else if (newStatus === 'Rejeitado') {
        updatedFields.limite_cred = 0;
        updatedFields.sit_cred = 'R';
      }

      await setDoc(docRef, updatedFields, { merge: true });

      // Update local state
      const updatedClient = { ...client, ...updatedFields };
      setSelectedClient(updatedClient);
      setClients(prev => prev.map(c => (c.uid === targetUid || (c as any).moblinkId === targetUid) ? updatedClient : c));

      if (newStatus === 'Aprovado') {
        addToast("Crediário Aprovado! 🎉", `Limite de R$ ${updatedFields.limite_cred?.toFixed(2)} concedido a ${client.name || (client as any).nome}.`, "success");
      } else {
        addToast("Crediário Rejeitado", `O crediário de ${client.name || (client as any).nome} foi alterado para Não Aprovado.`, "info");
      }
    } catch (err: any) {
      console.error("Erro ao atualizar crediário:", err);
      addToast("Erro ao Atualizar Crediário", err.message || "Falha na comunicação com o banco de dados.", "error");
    } finally {
      setIsUpdatingCredit(false);
    }
  };

  // Helper extraction for Cart & Favorites
  const getClientCartItems = (client: UserProfile) => {
    const anyC = client as any;
    if (Array.isArray(client.cartItems) && client.cartItems.length > 0) return client.cartItems;
    if (Array.isArray(client.cart) && client.cart.length > 0) return client.cart;
    if (Array.isArray(anyC.cartItems) && anyC.cartItems.length > 0) return anyC.cartItems;
    if (Array.isArray(anyC.cart) && anyC.cart.length > 0) return anyC.cart;
    return [];
  };

  const getClientFavoriteIds = (client: UserProfile) => {
    const anyC = client as any;
    if (Array.isArray(client.favoriteIds) && client.favoriteIds.length > 0) return client.favoriteIds;
    if (Array.isArray(client.favorites) && client.favorites.length > 0) return client.favorites;
    if (Array.isArray(anyC.favoriteIds) && anyC.favoriteIds.length > 0) return anyC.favoriteIds;
    if (Array.isArray(anyC.favorites) && anyC.favorites.length > 0) return anyC.favorites;
    return [];
  };

  // Formatting Helpers
  const formatCpfCnpj = (val?: string) => {
    if (!val) return 'Não informado';
    const clean = val.replace(/\D/g, '');
    if (clean.length === 11) {
      return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (clean.length === 14) {
      return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return val;
  };

  const formatPhone = (val?: string) => {
    if (!val) return 'Não informado';
    const clean = val.replace(/\D/g, '');
    if (clean.length === 11) {
      return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    if (clean.length === 10) {
      return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return val;
  };

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDate = (val?: string) => {
    if (!val) return 'Não informada';
    if (val.includes('-')) {
      const parts = val.split('T')[0].split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return val;
  };

  // Statistics Summary & Counts
  const stats = useMemo(() => {
    const total = clients.length;
    const erpCount = clients.filter(c => c.isErpCustomer || (c as any).moblinkId).length;
    const approvedCredCount = clients.filter(c => c.crediarioStatus === 'Aprovado' || (c as any).sit_cred === 'A' || (c as any).sit_cred === 'L' || (c.limite_cred && c.limite_cred > 0)).length;
    const pendingCredCount = clients.filter(c => c.crediarioStatus === 'EmAnalise').length;
    const notApprovedCredCount = Math.max(0, total - approvedCredCount - pendingCredCount);
    const debtCount = clients.filter(c => Boolean((c as any).valor_vencido && (c as any).valor_vencido > 0)).length;

    // Birthday Counts
    const bdayDayCount = clients.filter(c => isBirthdayMatch(c.dataNascimento || (c as any).data_nasc || (c as any).birthDate, 'Dia')).length;
    const bdayWeekCount = clients.filter(c => isBirthdayMatch(c.dataNascimento || (c as any).data_nasc || (c as any).birthDate, 'Semana')).length;
    const bdayMonthCount = clients.filter(c => isBirthdayMatch(c.dataNascimento || (c as any).data_nasc || (c as any).birthDate, 'Mês')).length;

    return { 
      total, 
      erpCount, 
      approvedCredCount, 
      pendingCredCount,
      notApprovedCredCount,
      debtCount,
      bdayDayCount,
      bdayWeekCount,
      bdayMonthCount
    };
  }, [clients]);

  // Filtered Clients List
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const anyC = c as any;
      const cleanSearch = searchTerm.toLowerCase().trim();
      const cleanDigitsSearch = searchTerm.replace(/\D/g, '');

      const nameMatch = (c.name || anyC.nome || '').toLowerCase().includes(cleanSearch);
      const cpfMatch = cleanDigitsSearch.length > 0 && (c.cpf || anyC.cpf_cnpj || '').replace(/\D/g, '').includes(cleanDigitsSearch);
      const phoneMatch = cleanDigitsSearch.length > 0 && (c.telefone || anyC.celular || anyC.phone || '').replace(/\D/g, '').includes(cleanDigitsSearch);
      const cityMatch = (c.cidade || anyC.cidade || '').toLowerCase().includes(cleanSearch);
      
      const searchOk = !cleanSearch || nameMatch || cpfMatch || phoneMatch || cityMatch;

      // Status Crediario filter
      let credOk = true;
      const hasLimit = Boolean(c.limite_cred && c.limite_cred > 0);
      const isApproved = c.crediarioStatus === 'Aprovado' || anyC.sit_cred === 'A' || anyC.sit_cred === 'L' || hasLimit;
      const isPending = c.crediarioStatus === 'EmAnalise';
      const hasDebt = Boolean((anyC.valor_vencido && anyC.valor_vencido > 0));

      if (credFilter === 'Aprovado') credOk = isApproved;
      if (credFilter === 'EmAnalise') credOk = isPending;
      if (credFilter === 'NaoAprovado') credOk = !isApproved && !isPending;
      if (credFilter === 'ComDebito') credOk = hasDebt;

      // Person Type Filter
      let personOk = true;
      const cpfClean = (c.cpf || anyC.cpf_cnpj || '').replace(/\D/g, '');
      const isPj = cpfClean.length > 11 || anyC.pessoa === 'J';
      if (personTypeFilter === 'PF') personOk = !isPj;
      if (personTypeFilter === 'PJ') personOk = isPj;

      // Birthday Filter
      const bdayVal = c.dataNascimento || anyC.data_nasc || anyC.birthDate || anyC.data_nascimento;
      const bdayOk = bdayFilter === 'Todos' || isBirthdayMatch(bdayVal, bdayFilter);

      return searchOk && credOk && personOk && bdayOk;
    });
  }, [clients, searchTerm, credFilter, personTypeFilter, bdayFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header & Main Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center space-x-2.5">
            <Users className="h-7 w-7 text-amber-400" />
            <span className={isDark ? 'text-white' : 'text-slate-900'}>
              Base de Clientes & CRM - MobLink ERP ({stats.total})
            </span>
          </h2>
          <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'} mt-0.5 font-medium`}>
            Consulte cadastros do ERP, analise faturas a receber, limite de crédito e mensagens via WhatsApp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleSyncERP}
            disabled={isSyncing}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer flex items-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : '🔄 Sincronizar Base do ERP'}</span>
          </button>
        </div>
      </div>

      {/* Sync Progress Bar */}
      {isSyncing && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center space-x-3 shadow-sm animate-pulse">
          <RefreshCw className="h-5 w-5 text-emerald-400 animate-spin shrink-0" />
          <div className="flex-1 space-y-1">
            <p className="text-emerald-200">{syncProgressMessage || 'Sincronizando base de clientes com o servidor do ERP MobLink...'}</p>
            <div className="w-full bg-emerald-950/60 rounded-full h-1.5 overflow-hidden">
              <div className="bg-emerald-400 h-full animate-pulse w-full" />
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-300 shadow-sm'}`}>
          <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Total de Cadastros</span>
          <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'} mt-1 flex items-center space-x-1.5`}>
            <span>{stats.total}</span>
          </p>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-300 shadow-sm'}`}>
          <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider block">Análises Pendentes</span>
          <p className="text-2xl font-black text-amber-400 mt-1 flex items-center space-x-1.5">
            <Clock className="h-5 w-5 animate-pulse text-amber-400" />
            <span>{stats.pendingCredCount}</span>
          </p>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-300 shadow-sm'}`}>
          <span className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-wider block">Crediários Aprovados</span>
          <p className="text-2xl font-black text-emerald-500 mt-1 flex items-center space-x-1.5">
            <CreditCard className="h-4 w-4" />
            <span>{stats.approvedCredCount}</span>
          </p>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-300 shadow-sm'}`}>
          <span className="text-[10px] font-extrabold text-rose-500 uppercase tracking-wider block">Clientes com Débitos</span>
          <p className="text-2xl font-black text-rose-500 mt-1 flex items-center space-x-1.5">
            <AlertTriangle className="h-4 w-4" />
            <span>{stats.debtCount}</span>
          </p>
        </div>
      </div>

      {/* Controls Container: Search Input & Quick Filter Pills */}
      <div className={`p-4 rounded-2xl border space-y-3.5 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-300 shadow-sm'
      }`}>
        {/* Search Bar & Person Select */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3.5 top-3 text-amber-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar instantaneamente por Nome, CPF/CNPJ, Telefone ou Cidade..."
              className={`w-full pl-10 pr-9 py-2.5 rounded-xl text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                isDark ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-500'
              }`}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Person Type Filter */}
          <select
            value={personTypeFilter}
            onChange={(e) => setPersonTypeFilter(e.target.value as any)}
            className={`px-3 py-2.5 rounded-xl text-xs font-black border focus:outline-none cursor-pointer ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-900'
            }`}
          >
            <option value="Todos">👤 Tipo: Todos (PF & PJ)</option>
            <option value="PF">Pessoa Física (PF)</option>
            <option value="PJ">Pessoa Jurídica (PJ)</option>
          </select>
        </div>

        {/* Quick Crediario Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/40">
          <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'} mr-1`}>
            Crediário:
          </span>

          {[
            { id: 'Todos', label: '🎉 Todos os Clientes', count: stats.total },
            { id: 'EmAnalise', label: '⏳ Análises Pendentes', count: stats.pendingCredCount },
            { id: 'Aprovado', label: '💳 Crediário Aprovado', count: stats.approvedCredCount },
            { id: 'NaoAprovado', label: '⚠️ Não Aprovado / Requer Análise', count: stats.notApprovedCredCount },
            { id: 'ComDebito', label: '⚠️ Com Débitos Vencidos', count: stats.debtCount }
          ].map(pill => {
            const isActive = credFilter === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setCredFilter(pill.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center space-x-2 border ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-sm'
                    : isDark 
                      ? 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white' 
                      : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
                }`}
              >
                <span>{pill.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  isActive ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                }`}>
                  {pill.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Birthday Filter Pills (Dia / Semana / Mês) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/40">
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 mr-1 flex items-center space-x-1">
            <Cake className="h-3.5 w-3.5" />
            <span>Aniversariantes:</span>
          </span>

          {[
            { id: 'Todos', label: 'Todos', count: stats.total },
            { id: 'Dia', label: '🎂 Aniversariantes do Dia', count: stats.bdayDayCount },
            { id: 'Semana', label: '📅 Aniversariantes da Semana', count: stats.bdayWeekCount },
            { id: 'Mês', label: '📆 Aniversariantes do Mês', count: stats.bdayMonthCount }
          ].map(pill => {
            const isActive = bdayFilter === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setBdayFilter(pill.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center space-x-2 border ${
                  isActive
                    ? 'bg-purple-500/25 text-purple-300 border-purple-500/60 shadow-sm'
                    : isDark 
                      ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200' 
                      : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{pill.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  isActive ? 'bg-purple-500 text-white' : 'bg-slate-800 text-purple-300'
                }`}>
                  {pill.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Clients Data Table */}
      <div className={`rounded-2xl border overflow-hidden ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-300 shadow-md'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${
                isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-800'
              }`}>
                <th className="py-3.5 px-4">Cliente / E-commerce & ERP</th>
                <th className="py-3.5 px-4">CPF / CNPJ</th>
                <th className="py-3.5 px-4">Contato / WhatsApp</th>
                <th className="py-3.5 px-4">Cidade / UF</th>
                <th className="py-3.5 px-4">Status do Crediário</th>
                <th className="py-3.5 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-xs ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 space-y-2">
                    <RefreshCw className="h-6 w-6 text-amber-400 animate-spin mx-auto" />
                    <p className="text-xs font-medium">Carregando lista de clientes...</p>
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    Nenhum cliente encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const anyC = client as any;
                  const nameVal = client.name || anyC.nome || 'Cliente Evidência';
                  const cpfVal = client.cpf || anyC.cpf_cnpj || '';
                  const cleanCpf = cpfVal.replace(/\D/g, '');
                  const isPj = cleanCpf.length > 11 || anyC.pessoa === 'J';
                  const phoneVal = client.telefone || anyC.celular || anyC.phone || '';
                  const cityVal = client.cidade || anyC.cidade || 'Caxias';
                  const ufVal = (client.uf || anyC.uf || 'MA').toUpperCase();
                  const moblinkId = client.moblinkId || anyC.id;
                  const bdayVal = client.dataNascimento || anyC.data_nasc || anyC.birthDate || anyC.data_nascimento;
                  
                  const limitCred = client.limite_cred ?? anyC.limite_cred ?? 0;
                  const vencidoCred = client.valor_vencido ?? anyC.valor_vencido ?? 0;
                  const sitCred = anyC.sit_cred || 'N';

                  const isApprovedCred = client.crediarioStatus === 'Aprovado' || sitCred === 'A' || sitCred === 'L' || limitCred > 0;
                  const isPendingCred = client.crediarioStatus === 'EmAnalise';
                  const isRejectedCred = client.crediarioStatus === 'Rejeitado';

                  // Cart & Favorites counts
                  const cartItems = getClientCartItems(client);
                  const favItemsCount = getClientFavoriteIds(client).length;
                  const cartItemsCount = cartItems.reduce((acc: number, item: any) => acc + (item.quantity || 1), 0);

                  const isDayBday = isBirthdayMatch(bdayVal, 'Dia');
                  const isWeekBday = isBirthdayMatch(bdayVal, 'Semana');
                  const isMonthBday = isBirthdayMatch(bdayVal, 'Mês');

                  return (
                    <tr 
                      key={client.uid || moblinkId} 
                      className={`transition-colors ${
                        isDark ? 'hover:bg-slate-800/60 text-slate-100' : 'hover:bg-amber-50/60 text-slate-900 font-medium'
                      }`}
                    >
                      {/* Name & Badges (PF/PJ, ERP, Cart, Favorites, Birthday) */}
                      <td className="py-3.5 px-4 font-bold">
                        <div className="space-y-1.5">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className={isDark ? 'text-white font-extrabold' : 'text-slate-900 font-black'}>
                              {nameVal}
                            </span>
                            
                            {isPj ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-blue-600 text-white shadow-xs">
                                PJ
                              </span>
                            ) : (
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${
                                isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-200 text-slate-800 border-slate-300'
                              }`}>
                                PF
                              </span>
                            )}

                            {/* Birthday Badge */}
                            {isDayBday ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-bounce flex items-center space-x-1">
                                <Cake className="h-3 w-3 text-purple-400" />
                                <span>Aniversariante HOJE! 🎂</span>
                              </span>
                            ) : isWeekBday ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                📅 Aniversariante da Semana
                              </span>
                            ) : isMonthBday ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-500/10 text-purple-300 border border-purple-500/20">
                                📆 Aniversariante do Mês
                              </span>
                            ) : null}
                          </div>
                          
                          <div className="flex items-center space-x-2 flex-wrap gap-1">
                            {moblinkId && (
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center space-x-1 border ${
                                isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              }`}>
                                <Zap className="h-2.5 w-2.5" />
                                <span>ERP #{moblinkId}</span>
                              </span>
                            )}

                            {/* Cart Badge */}
                            {cartItemsCount > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-sky-500/20 text-sky-300 border border-sky-500/40 animate-pulse flex items-center space-x-1">
                                <ShoppingCart className="h-3 w-3 text-sky-400" />
                                <span>Carrinho ({cartItemsCount})</span>
                              </span>
                            )}

                            {/* Favorites Badge */}
                            {favItemsCount > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center space-x-1">
                                <Heart className="h-3 w-3 text-rose-400 fill-rose-500/40" />
                                <span>Favoritos ({favItemsCount})</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* CPF / CNPJ */}
                      <td className={`py-3.5 px-4 font-mono font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                        {formatCpfCnpj(cpfVal)}
                      </td>

                      {/* Phone & WhatsApp */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                            {formatPhone(phoneVal)}
                          </span>
                          {phoneVal && (
                            <a
                              href={`https://wa.me/55${phoneVal.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 px-1.5 rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-black transition-colors flex items-center space-x-1"
                              title="Abrir no WhatsApp"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              <span className="text-[10px]">Whats</span>
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Location */}
                      <td className={`py-3.5 px-4 font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {cityVal}/{ufVal}
                      </td>

                      {/* Crediario Indicators with Status & Guidance */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            {isApprovedCred ? (
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center space-x-1 border ${
                                isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-emerald-100 text-emerald-950 border-emerald-400'
                              }`}>
                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                <span>Aprovado ({formatCurrency(limitCred)})</span>
                              </span>
                            ) : isPendingCred ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse flex items-center space-x-1">
                                <Clock className="h-3 w-3 text-amber-400" />
                                <span>Em Análise de Crédito</span>
                              </span>
                            ) : isRejectedCred ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center space-x-1">
                                <AlertTriangle className="h-3 w-3 text-rose-400" />
                                <span>Não Aprovado / Rejeitado</span>
                              </span>
                            ) : (
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border flex items-center space-x-1 ${
                                isDark ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-900 border-amber-300'
                              }`}>
                                <Info className="h-3 w-3 text-amber-500" />
                                <span>Não Aprovado • Requer Análise</span>
                              </span>
                            )}
                          </div>

                          {vencidoCred > 0 && (
                            <div className="flex items-center space-x-1 text-[10px] font-black text-rose-500">
                              <AlertTriangle className="h-3 w-3" />
                              <span>Débito Vencido: {formatCurrency(vencidoCred)}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Action: Ver Detalhes */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClient(client);
                            setDetailTab('pessoal');
                            setProductTab('carrinho');
                            setLimitInput(String(limitCred > 0 ? limitCred : 500));
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 font-black text-xs transition-all shadow-xs cursor-pointer inline-flex items-center space-x-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Ver Detalhes</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalhes Completo do Cliente com Faturas & Contas a Receber Agrupadas por Venda / Acordeão */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="fixed inset-0" onClick={() => setSelectedClient(null)} />

          <div className={`relative rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border animate-in zoom-in-95 duration-200 z-10 my-6 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            
            {/* Modal Header */}
            <div className={`px-6 py-5 border-b flex items-center justify-between ${
              isDark 
                ? 'bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 border-slate-800' 
                : 'bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 border-slate-300 text-white'
            }`}>
              <div className="space-y-1">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 font-black flex items-center justify-center text-lg shadow-md shrink-0">
                    {(selectedClient.name || (selectedClient as any).nome || 'C')[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white tracking-tight leading-none">
                      {selectedClient.name || (selectedClient as any).nome || 'Cliente Evidência'}
                    </h3>
                    <p className="text-[11px] text-amber-300 font-mono mt-1 font-bold flex items-center space-x-2">
                      <span>CPF/CNPJ: {formatCpfCnpj(selectedClient.cpf || (selectedClient as any).cpf_cnpj)}</span>
                      {(selectedClient.moblinkId || (selectedClient as any).id) && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/30 text-emerald-300 border border-emerald-400/40">
                          ERP #{selectedClient.moblinkId || (selectedClient as any).id}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedClient(null)}
                className="p-2 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Fechar Ficha"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* TOP BAR: DESTAQUE DE STATUS & AÇÕES RÁPIDAS DE CREDIÁRIO */}
            <div className={`p-3.5 px-6 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              selectedClient.crediarioStatus === 'Aprovado' || (selectedClient as any).sit_cred === 'A' || (selectedClient.limite_cred && selectedClient.limite_cred > 0)
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : selectedClient.crediarioStatus === 'EmAnalise'
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  : 'bg-slate-950/80 border-slate-800 text-slate-300'
            }`}>
              <div className="flex items-center space-x-2">
                {selectedClient.crediarioStatus === 'Aprovado' || (selectedClient as any).sit_cred === 'A' || (selectedClient.limite_cred && selectedClient.limite_cred > 0) ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                ) : selectedClient.crediarioStatus === 'EmAnalise' ? (
                  <Clock className="h-5 w-5 text-amber-400 animate-pulse shrink-0" />
                ) : (
                  <Info className="h-5 w-5 text-amber-400 shrink-0" />
                )}

                <div>
                  <span className="text-[10px] uppercase font-black tracking-wider block text-slate-400">Status do Crediário Próprio</span>
                  <p className="text-xs font-black">
                    {selectedClient.crediarioStatus === 'Aprovado' || (selectedClient as any).sit_cred === 'A' || (selectedClient.limite_cred && selectedClient.limite_cred > 0)
                      ? `Crediário Aprovado (${formatCurrency(selectedClient.limite_cred ?? 500)})`
                      : selectedClient.crediarioStatus === 'EmAnalise'
                        ? 'Solicitação Pendente de Análise de Crédito'
                        : selectedClient.crediarioStatus === 'Rejeitado'
                          ? 'Crediário Não Aprovado / Rejeitado'
                          : 'Crediário Não Aprovado (Requer Análise)'}
                  </p>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                {selectedClient.crediarioStatus !== 'Aprovado' && (
                  <button
                    type="button"
                    disabled={isUpdatingCredit}
                    onClick={() => handleSetCrediarioStatus(selectedClient, 'Aprovado', parseFloat(limitInput) || 500)}
                    className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-black text-xs shadow-sm transition-all cursor-pointer inline-flex items-center justify-center space-x-1 disabled:opacity-50"
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    <span>Aprovar Crediário</span>
                  </button>
                )}

                {selectedClient.crediarioStatus !== 'Rejeitado' && (
                  <button
                    type="button"
                    disabled={isUpdatingCredit}
                    onClick={() => handleSetCrediarioStatus(selectedClient, 'Rejeitado')}
                    className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 font-bold text-xs transition-all cursor-pointer inline-flex items-center justify-center space-x-1 disabled:opacity-50"
                  >
                    <ThumbsDown className="h-3.5 w-3.5" />
                    <span>Rejeitar</span>
                  </button>
                )}
              </div>
            </div>

            {/* Modal Tab Navigation */}
            <div className={`flex border-b px-6 overflow-x-auto ${
              isDark ? 'border-slate-800 bg-slate-950/80' : 'border-slate-300 bg-slate-100'
            }`}>
              {[
                { id: 'pessoal', label: '👤 Dados Pessoais' },
                { id: 'contato', label: '📍 Contato & Endereço' },
                { id: 'financeiro', label: '💰 Financeiro & Contas a Receber' },
                { id: 'produtos', label: `🛒 Produtos (${getClientCartItems(selectedClient).length + getClientFavoriteIds(selectedClient).length})` }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setDetailTab(t.id as any)}
                  className={`py-3.5 px-4 text-xs font-black transition-all border-b-2 cursor-pointer shrink-0 ${
                    detailTab === t.id
                      ? isDark 
                        ? 'border-amber-400 text-amber-400 bg-amber-400/10' 
                        : 'border-amber-600 text-amber-800 bg-amber-200/50'
                      : isDark 
                        ? 'border-transparent text-slate-400 hover:text-slate-200' 
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Modal Tab Content */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              
              {/* TAB 1: DADOS PESSOAIS */}
              {detailTab === 'pessoal' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className={`p-4 rounded-2xl border space-y-1 ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-300 shadow-2xs'
                  }`}>
                    <span className={`text-[10px] uppercase font-black tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Nome Completo</span>
                    <p className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedClient.name || (selectedClient as any).nome || 'Não informado'}</p>
                  </div>

                  <div className={`p-4 rounded-2xl border space-y-1 ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-300 shadow-2xs'
                  }`}>
                    <span className={`text-[10px] uppercase font-black tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Apelido / Nome Fantasia</span>
                    <p className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{(selectedClient as any).apelido || (selectedClient as any).nome_fantasia || 'Não informado'}</p>
                  </div>

                  <div className={`p-4 rounded-2xl border space-y-1 ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-300 shadow-2xs'
                  }`}>
                    <span className={`text-[10px] uppercase font-black tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>CPF / CNPJ</span>
                    <p className={`font-black font-mono text-sm ${isDark ? 'text-amber-300' : 'text-slate-900'}`}>{formatCpfCnpj(selectedClient.cpf || (selectedClient as any).cpf_cnpj)}</p>
                  </div>

                  <div className={`p-4 rounded-2xl border space-y-1 ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-300 shadow-2xs'
                  }`}>
                    <span className={`text-[10px] uppercase font-black tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>RG / Identidade</span>
                    <p className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{selectedClient.rg || (selectedClient as any).rg || 'Não informado'}</p>
                  </div>

                  <div className={`p-4 rounded-2xl border space-y-1 ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-300 shadow-2xs'
                  }`}>
                    <span className={`text-[10px] uppercase font-black tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Data de Nascimento</span>
                    <p className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{formatDate(selectedClient.dataNascimento || (selectedClient as any).data_nasc)}</p>
                  </div>

                  <div className={`p-4 rounded-2xl border space-y-1 ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-300 shadow-2xs'
                  }`}>
                    <span className={`text-[10px] uppercase font-black tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Sexo</span>
                    <p className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{(selectedClient as any).sexo === 'M' ? 'Masculino' : (selectedClient as any).sexo === 'F' ? 'Feminino' : 'Não informado'}</p>
                  </div>

                  <div className={`p-4 rounded-2xl border space-y-1 ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-300 shadow-2xs'
                  }`}>
                    <span className={`text-[10px] uppercase font-black tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>ID MobLink ERP</span>
                    <p className="font-black text-emerald-500 font-mono text-sm">#{selectedClient.moblinkId || (selectedClient as any).id || 'Local'}</p>
                  </div>

                  <div className={`p-4 rounded-2xl border space-y-1 ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-300 shadow-2xs'
                  }`}>
                    <span className={`text-[10px] uppercase font-black tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Data de Cadastro</span>
                    <p className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{formatDate(selectedClient.createdAt || (selectedClient as any).data_cad)}</p>
                  </div>
                </div>
              )}

              {/* TAB 2: CONTATO & ENDEREÇO */}
              {detailTab === 'contato' && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className={`p-4 rounded-2xl border space-y-1.5 ${
                      isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-300 shadow-2xs'
                    }`}>
                      <span className={`text-[10px] uppercase font-black tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Celular / WhatsApp</span>
                      <div className="flex items-center space-x-2">
                        <p className={`font-extrabold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatPhone(selectedClient.telefone || (selectedClient as any).celular)}</p>
                        {(selectedClient.telefone || (selectedClient as any).celular) && (
                          <a
                            href={`https://wa.me/55${(selectedClient.telefone || (selectedClient as any).celular).replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs inline-flex items-center space-x-1 hover:bg-emerald-400 transition-colors shadow-xs"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            <span>Abrir WhatsApp</span>
                          </a>
                        )}
                      </div>
                    </div>

                    <div className={`p-4 rounded-2xl border space-y-1.5 ${
                      isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-300 shadow-2xs'
                    }`}>
                      <span className={`text-[10px] uppercase font-black tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>E-mail</span>
                      <p className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{selectedClient.email || 'Não informado'}</p>
                    </div>
                  </div>

                  <div className={`p-4.5 rounded-2xl border space-y-3 ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-300 shadow-2xs'
                  }`}>
                    <span className="text-[10px] uppercase font-black text-amber-500 flex items-center space-x-1.5">
                      <MapPin className="h-4 w-4 text-amber-500" />
                      <span>Endereço Residencial / Entrega</span>
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className={`text-[10px] font-black uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Rua / Logradouro</span>
                        <p className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{selectedClient.endereco || (selectedClient as any).endereco || 'Não informado'}</p>
                      </div>

                      <div>
                        <span className={`text-[10px] font-black uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Número & Complemento</span>
                        <p className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                          Nº {selectedClient.numero || (selectedClient as any).numero_end || 'S/N'} 
                          {selectedClient.complemento ? ` (${selectedClient.complemento})` : ''}
                        </p>
                      </div>

                      <div>
                        <span className={`text-[10px] font-black uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Bairro</span>
                        <p className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{selectedClient.bairro || (selectedClient as any).bairro || 'Não informado'}</p>
                      </div>

                      <div>
                        <span className={`text-[10px] font-black uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Cidade / UF</span>
                        <p className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{selectedClient.cidade || (selectedClient as any).cidade || 'Caxias'} / {(selectedClient.uf || (selectedClient as any).uf || 'MA').toUpperCase()}</p>
                      </div>

                      <div>
                        <span className={`text-[10px] font-black uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>CEP</span>
                        <p className={`font-bold font-mono ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{selectedClient.cep || (selectedClient as any).cep || 'Não informado'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: FINANCEIRO, CREDIÁRIO & FATURAS A RECEBER AGRUPADAS POR VENDA / ACORDEÃO */}
              {detailTab === 'financeiro' && (
                <div className="space-y-4 text-xs">
                  
                  {/* Interactive Credit Approval Control Panel */}
                  <div className={`p-4.5 rounded-2xl border space-y-3 ${
                    isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-300 shadow-sm'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-black text-amber-400 flex items-center space-x-1.5">
                        <CreditCard className="h-4 w-4 text-amber-400" />
                        <span>Painel de Análise e Aprovação de Crediário Próprio</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end pt-1">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                          Definir Limite de Crédito (R$)
                        </label>
                        <input
                          type="number"
                          value={limitInput}
                          onChange={(e) => setLimitInput(e.target.value)}
                          placeholder="500"
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>

                      <button
                        type="button"
                        disabled={isUpdatingCredit}
                        onClick={() => handleSetCrediarioStatus(selectedClient, 'Aprovado', parseFloat(limitInput) || 500)}
                        className="px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-black text-xs transition-all cursor-pointer flex items-center justify-center space-x-1.5 disabled:opacity-50 shadow-sm"
                      >
                        <ThumbsUp className="h-4 w-4" />
                        <span>Aprovar com Limite</span>
                      </button>

                      <button
                        type="button"
                        disabled={isUpdatingCredit}
                        onClick={() => handleSetCrediarioStatus(selectedClient, 'Rejeitado')}
                        className="px-4 py-2.5 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 font-bold text-xs transition-all cursor-pointer flex items-center justify-center space-x-1.5 disabled:opacity-50"
                      >
                        <ThumbsDown className="h-4 w-4" />
                        <span>Rejeitar / Solicitar Ajuste</span>
                      </button>
                    </div>
                  </div>

                  {/* Indicators Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className={`p-4 rounded-2xl border space-y-1.5 ${
                      isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-300 shadow-2xs'
                    }`}>
                      <span className="text-[10px] uppercase font-black text-amber-500 block">Status Atual no Sistema</span>
                      <div className="flex items-center space-x-2">
                        {selectedClient.crediarioStatus === 'Aprovado' || (selectedClient as any).sit_cred === 'A' || (selectedClient as any).sit_cred === 'L' || (selectedClient.limite_cred && selectedClient.limite_cred > 0) ? (
                          <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            ✓ Crediário Aprovado
                          </span>
                        ) : selectedClient.crediarioStatus === 'EmAnalise' ? (
                          <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                            ⏳ Em Análise de Crédito
                          </span>
                        ) : selectedClient.crediarioStatus === 'Rejeitado' ? (
                          <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            ❌ Não Aprovado / Rejeitado
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            ⚠️ Não Aprovado • Requer Análise
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={`p-4 rounded-2xl border space-y-1.5 ${
                      isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-300 shadow-2xs'
                    }`}>
                      <span className="text-[10px] uppercase font-black text-emerald-500 block">Limite de Crédito Concedido</span>
                      <p className="text-xl font-black text-emerald-500">
                        {formatCurrency(selectedClient.limite_cred ?? (selectedClient as any).limite_cred ?? 500)}
                      </p>
                    </div>

                    <div className={`p-4 rounded-2xl border space-y-1.5 ${
                      isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-300 shadow-2xs'
                    }`}>
                      <span className="text-[10px] uppercase font-black text-rose-500 block">Valor Vencido (Débitos Pendentes)</span>
                      <p className={`text-xl font-black ${
                        ((selectedClient as any).valor_vencido || 0) > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-400'
                      }`}>
                        {formatCurrency((selectedClient as any).valor_vencido || 0)}
                      </p>
                    </div>

                    <div className={`p-4 rounded-2xl border space-y-1.5 ${
                      isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-300 shadow-2xs'
                    }`}>
                      <span className="text-[10px] uppercase font-black text-sky-500 block">Valor a Vencer</span>
                      <p className="text-xl font-black text-sky-500">
                        {formatCurrency((selectedClient as any).valor_vencer || 0)}
                      </p>
                    </div>
                  </div>

                  {/* Faturas & Contas a Receber AGRUPADAS POR VENDA / ACORDEÃO EXPANSÍVEL */}
                  <div className={`p-4.5 rounded-2xl border space-y-3.5 ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-300 shadow-2xs'
                  }`}>
                    <div className="flex items-center justify-between border-b pb-2 border-slate-800/60">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-amber-400" />
                        <span>Histórico de Vendas & Faturas (MobLink ERP)</span>
                      </span>

                      <button
                        type="button"
                        onClick={handleReloadInvoices}
                        disabled={isLoadingInvoices}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold border border-slate-700 transition-colors inline-flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`h-3 w-3 text-amber-400 ${isLoadingInvoices ? 'animate-spin' : ''}`} />
                        <span>Atualizar</span>
                      </button>
                    </div>

                    {isLoadingInvoices ? (
                      <div className="py-8 text-center text-slate-400 space-y-2">
                        <RefreshCw className="h-6 w-6 text-amber-400 animate-spin mx-auto" />
                        <p className="text-xs font-medium">Buscando faturas e parcelas em aberto no MobLink ERP...</p>
                      </div>
                    ) : invoices.length === 0 ? (
                      <div className="py-6 text-center text-slate-400 text-xs font-medium space-y-1">
                        <p className="text-slate-300 font-bold">Nenhuma fatura ou parcela em aberto encontrada para este cliente.</p>
                        <p className="text-[11px] text-slate-500">As parcelas de crediário e títulos a receber gerados no ERP aparecerão automaticamente nesta lista.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {groupedInvoices.map((group) => {
                          const isExpanded = expandedSales[group.saleKey] ?? false;

                          return (
                            <div 
                              key={group.saleKey} 
                              className={`rounded-2xl border overflow-hidden transition-all shadow-xs ${
                                isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-300'
                              }`}
                            >
                              {/* Expandable Accordion Header */}
                              <button
                                type="button"
                                onClick={() => toggleSaleAccordion(group.saleKey)}
                                className={`w-full p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                                  isExpanded 
                                    ? isDark ? 'bg-slate-800/50' : 'bg-amber-50/50' 
                                    : isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-center space-x-3">
                                  <div className={`p-1.5 rounded-lg border transition-transform duration-200 ${
                                    isExpanded ? 'rotate-180 bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-slate-800 border-slate-700 text-slate-400'
                                  }`}>
                                    <ChevronDown className="h-4 w-4" />
                                  </div>

                                  <div className="space-y-0.5">
                                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                      <span className="font-black text-sm text-slate-100 flex items-center space-x-1.5">
                                        <span>Venda / Doc #{group.docNum}</span>
                                        {group.idVenda && group.idVenda !== group.docNum && (
                                          <span className="text-amber-400 font-mono text-xs">(ID Venda: #{group.idVenda})</span>
                                        )}
                                      </span>

                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-800 text-slate-300 border border-slate-700">
                                        {group.items.length} {group.items.length === 1 ? 'Parcela' : 'Parcelas'}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 font-medium">{group.historico}</p>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-4 text-xs shrink-0 pl-8 sm:pl-0">
                                  <div className="text-right">
                                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Total da Compra</span>
                                    <span className="font-black text-slate-200">{formatCurrency(group.totalVal)}</span>
                                  </div>

                                  {group.totalPending > 0 ? (
                                    <div className="text-right">
                                      <span className="text-[10px] text-amber-400 block font-bold uppercase">Em Aberto</span>
                                      <span className={`font-black ${group.hasOverdue ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
                                        {formatCurrency(group.totalPending)}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                      ✓ Quitada
                                    </span>
                                  )}
                                </div>
                              </button>

                              {/* Accordion Content Panel */}
                              {isExpanded && (
                                <div className={`p-4 pt-2 border-t space-y-3 animate-in fade-in duration-200 ${
                                  isDark ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-200 bg-slate-50/50'
                                }`}>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {group.items.map((inv, idx) => {
                                      const parcNum = inv.parcela || `${idx + 1}/${group.items.length}`;
                                      const dtVenc = formatDate(inv.data_vencimento || inv.vencimento);
                                      const dtEmis = formatDate(inv.data_emissao || inv.emissao);
                                      const amountInfo = getInstallmentAmount(inv);
                                      const isPaid = amountInfo.isPaid;
                                      const isOverdue = amountInfo.isOverdue;

                                      return (
                                        <div 
                                          key={inv.id || idx}
                                          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                                            isPaid 
                                              ? isDark ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-emerald-50 border-emerald-300'
                                              : isOverdue
                                                ? isDark ? 'bg-rose-950/40 border-rose-500/50' : 'bg-rose-50 border-rose-400'
                                                : isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'
                                          }`}
                                        >
                                          <div className="space-y-1.5">
                                            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                              <span className={`font-black text-sm leading-none ${
                                                isDark ? 'text-white' : 'text-slate-900'
                                              }`}>
                                                Parcela {parcNum}
                                              </span>
                                              {isPaid ? (
                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/25 text-emerald-300 border border-emerald-500/50">
                                                  ✓ Paga
                                                </span>
                                              ) : isOverdue ? (
                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-500/25 text-rose-300 border border-rose-500/50 animate-pulse">
                                                  ⚠️ Atrasada
                                                </span>
                                              ) : (
                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-sky-500/25 text-sky-300 border border-sky-500/50">
                                                  A Vencer
                                                </span>
                                              )}
                                              {amountInfo.hasInterest && (
                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500/25 text-amber-300 border border-amber-500/50" title={`Inclui ${formatCurrency(amountInfo.interestAmount)} de juros/encargos do ERP`}>
                                                  + Juros ERP
                                                </span>
                                              )}
                                            </div>

                                            <p className={`text-xs font-bold ${
                                              isDark ? 'text-slate-300' : 'text-slate-700'
                                            }`}>
                                              Vencimento:{' '}
                                              <span className={`font-mono font-extrabold ${
                                                isOverdue ? (isDark ? 'text-rose-400' : 'text-rose-600') : (isDark ? 'text-amber-300' : 'text-amber-700')
                                              }`}>{dtVenc}</span>
                                            </p>
                                          </div>

                                          <div className="text-right shrink-0">
                                            <span className={`text-[10px] font-black uppercase tracking-wider block ${
                                              isDark ? 'text-slate-400' : 'text-slate-600'
                                            }`}>
                                              {isPaid ? 'Valor Pago' : (amountInfo.hasInterest ? 'Saldo a Pagar (c/ Juros)' : 'Saldo Devedor')}
                                            </span>
                                            <span className={`font-black text-sm leading-tight block ${
                                              isPaid 
                                                ? (isDark ? 'text-slate-500 line-through' : 'text-slate-400 line-through')
                                                : isOverdue
                                                  ? (isDark ? 'text-rose-400' : 'text-rose-600')
                                                  : (isDark ? 'text-emerald-400' : 'text-emerald-700')
                                            }`}>
                                              {formatCurrency(amountInfo.displayAmount)}
                                            </span>
                                            {amountInfo.hasInterest && (
                                              <span className={`text-[9px] font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                Orig.: {formatCurrency(amountInfo.originalAmount)}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className={`p-4 rounded-2xl border space-y-2 ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-300 shadow-2xs'
                  }`}>
                    <span className={`text-[10px] uppercase font-black tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Histórico de Compras no ERP</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className={`text-[10px] font-black uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Data da Última Compra</span>
                        <p className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{formatDate((selectedClient as any).data_ultima_compra)}</p>
                      </div>

                      <div>
                        <span className={`text-[10px] font-black uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Dias Sem Comprar</span>
                        <p className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{(selectedClient as any).dias_ultima_compra || 0} dias</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: PRODUTOS (CARRINHO & FAVORITOS COM FILTRO DEDICADO) */}
              {detailTab === 'produtos' && (
                <div className="space-y-4 text-xs">
                  {/* Sub-Filter Pills within Modal */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setProductTab('carrinho')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center space-x-2 border ${
                        productTab === 'carrinho'
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/60 shadow-sm'
                          : isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-700'
                      }`}
                    >
                      <ShoppingCart className="h-3.5 w-3.5 text-sky-400" />
                      <span>Carrinho de Compras ({getClientCartItems(selectedClient).length})</span>
                    </button>

                    <button
                      onClick={() => setProductTab('favoritos')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center space-x-2 border ${
                        productTab === 'favoritos'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/60 shadow-sm'
                          : isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-700'
                      }`}
                    >
                      <Heart className="h-3.5 w-3.5 text-rose-400 fill-rose-500/30" />
                      <span>Lista de Favoritos ({getClientFavoriteIds(selectedClient).length})</span>
                    </button>
                  </div>

                  {/* Sub-Tab Content: Carrinho */}
                  {productTab === 'carrinho' && (
                    <div className="space-y-2">
                      {getClientCartItems(selectedClient).length === 0 ? (
                        <div className="p-8 text-center text-slate-400 space-y-2 border border-dashed rounded-2xl border-slate-800">
                          <ShoppingCart className="h-8 w-8 mx-auto text-slate-600" />
                          <p className="font-bold">O cliente não possui itens no carrinho no momento.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {getClientCartItems(selectedClient).map((item: any, idx: number) => {
                            const pMatch = products.find(p => String(p.id) === String(item.productId) || String(p.moblinkId) === String(item.productId));
                            const imgUrl = pMatch?.imageUrl || item.image || item.imageUrl || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400';
                            
                            return (
                              <div key={idx} className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                              }`}>
                                <div className="flex items-center space-x-3">
                                  <img src={imgUrl} alt={item.name} className="w-12 h-12 rounded-xl object-cover border border-slate-700 shrink-0" />
                                  <div>
                                    <h5 className="font-black text-slate-100">{item.name || pMatch?.name || 'Produto Evidência'}</h5>
                                    <p className="text-[11px] text-slate-400">
                                      Tamanho: <span className="text-amber-400 font-bold">{item.selectedSize || '38'}</span> • Qtd: <span className="font-bold text-white">{item.quantity || 1}</span>
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] text-slate-400 block font-bold">Subtotal</span>
                                  <span className="font-black text-emerald-400 text-sm">
                                    {formatCurrency((item.price || pMatch?.price || 0) * (item.quantity || 1))}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sub-Tab Content: Favoritos */}
                  {productTab === 'favoritos' && (
                    <div className="space-y-2">
                      {getClientFavoriteIds(selectedClient).length === 0 ? (
                        <div className="p-8 text-center text-slate-400 space-y-2 border border-dashed rounded-2xl border-slate-800">
                          <Heart className="h-8 w-8 mx-auto text-slate-600" />
                          <p className="font-bold">O cliente não possui itens salvos nos favoritos.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {getClientFavoriteIds(selectedClient).map((favId: string, idx: number) => {
                            const pMatch = products.find(p => String(p.id) === String(favId) || String(p.moblinkId) === String(favId) || String(p.sku) === String(favId));
                            
                            return (
                              <div key={idx} className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                              }`}>
                                <div className="flex items-center space-x-3">
                                  {pMatch ? (
                                    <img src={pMatch.imageUrl} alt={pMatch.name} className="w-12 h-12 rounded-xl object-cover border border-slate-700 shrink-0" />
                                  ) : (
                                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                                      <Package className="h-6 w-6 text-slate-500" />
                                    </div>
                                  )}
                                  <div>
                                    <h5 className="font-black text-slate-100">{pMatch?.name || `Produto REF #${favId}`}</h5>
                                    <p className="text-[11px] text-slate-400 font-medium">
                                      Categoria: {pMatch?.category || 'Calçados'}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] text-slate-400 block font-bold">Preço</span>
                                  <span className="font-black text-amber-400 text-sm">
                                    {formatCurrency(pMatch?.price || 0)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className={`p-4 px-6 border-t flex items-center justify-between ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-700'
            }`}>
              <span className="text-[11px] font-medium">
                Informações sincronizadas via MobLink ERP API • Evidência Calçados
              </span>
              <button
                onClick={() => setSelectedClient(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
              >
                Fechar Ficha
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
