import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MoblinkConfig } from '../types';
import {
  Zap,
  RefreshCw,
  Server,
  Key,
  CheckCircle2,
  AlertCircle,
  Copy,
  FileText,
  Database,
  ArrowRightLeft,
  Search,
  Upload,
  Layers,
  History,
  Sliders,
  Check,
  Building,
  PackageCheck,
  Barcode,
  ExternalLink,
  Lock,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export const MoblinkIntegrationPanel: React.FC = () => {
  const {
    moblinkConfig,
    moblinkLogs,
    authSession,
    loginSincomAuth,
    logoutSincomAuth,
    updateMoblinkConfig,
    testMoblinkConnection,
    syncMoblinkStock,
    importMoblinkStockBatch,
    products,
    updateProduct,
    theme
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'auth' | 'config' | 'import' | 'mapping' | 'logs'>('overview');
  
  // Connection Form State
  const [formData, setFormData] = useState<MoblinkConfig>(moblinkConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authFeedback, setAuthFeedback] = useState<{ success: boolean; message: string; token?: string } | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Sync / Import State
  const [isSyncing, setIsSyncing] = useState(false);
  const [rawImportText, setRawImportText] = useState('');
  const [importStatus, setImportStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [parsedPreview, setParsedPreview] = useState<any[]>([]);

  // SKU Mapping Filter
  const [mappingSearch, setMappingSearch] = useState('');
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Webhook URL
  const webhookUrl = `${window.location.origin}/api/moblink/webhook?token=${moblinkConfig.webhookSecret || 'secret'}`;

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await updateMoblinkConfig(formData);
    setIsSaving(false);
    setTestResult({ success: true, message: 'Configurações da integração com Moblink salvas com sucesso!' });
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const result = await testMoblinkConnection();
    setTestResult(result);
    setIsTesting(false);
  };

  const handleExecuteLogin = async () => {
    setIsAuthenticating(true);
    setAuthFeedback(null);
    try {
      const session = await loginSincomAuth({
        apiUrl: formData.apiUrl,
        apiUser: formData.apiUser,
        apiPassword: formData.apiPassword
      });

      if (session.status === 'authenticated' && session.token) {
        setAuthFeedback({
          success: true,
          message: session.message || 'Login realizado com sucesso! Token de acesso capturado e armazenado.',
          token: session.token
        });
      } else {
        setAuthFeedback({
          success: false,
          message: session.message || 'Falha na requisição POST para a rota de login.'
        });
      }
    } catch (err: any) {
      setAuthFeedback({
        success: false,
        message: err.message || 'Erro ao conectar à rota de autenticação.'
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setImportStatus(null);
    const result = await syncMoblinkStock();
    setIsSyncing(false);
    setImportStatus(result);
  };

  // Parse custom JSON / CSV text for manual Moblink stock update
  const handleParseImportText = () => {
    try {
      if (!rawImportText.trim()) {
        setImportStatus({ success: false, message: 'Insira o texto JSON ou linhas CSV do Moblink para processar.' });
        return;
      }

      // Try JSON parsing
      if (rawImportText.trim().startsWith('[') || rawImportText.trim().startsWith('{')) {
        let parsed = JSON.parse(rawImportText);
        if (!Array.isArray(parsed) && parsed.items) parsed = parsed.items;
        if (!Array.isArray(parsed) && parsed.produtos) parsed = parsed.produtos;
        if (!Array.isArray(parsed)) parsed = [parsed];

        const formatted = parsed.map((item: any) => ({
          sku: item.sku || item.codigo || item.codigo_barra || item.id || '',
          moblinkId: item.moblinkId || item.id || '',
          barcode: item.barcode || item.codigo_barra || '',
          name: item.nome || item.descricao || item.name || '',
          stock: typeof item.estoque !== 'undefined' ? Number(item.estoque) : Number(item.stock || item.quantidade || 0),
          size: item.tamanho || item.size || 'Geral'
        }));

        setParsedPreview(formatted);
        setImportStatus({ success: true, message: `${formatted.length} itens reconhecidos no formato JSON. Clique em "Confirmar e Aplicar Estoque".` });
      } else {
        // Try CSV line parsing: SKU, Stock, Size
        const lines = rawImportText.split('\n').filter(l => l.trim().length > 0);
        const formatted: any[] = [];

        lines.forEach(line => {
          const parts = line.split(/[,;\t]/).map(p => p.trim());
          if (parts.length >= 2) {
            const sku = parts[0];
            const stock = Number(parts[1]) || 0;
            const size = parts[2] || 'Geral';
            formatted.push({ sku, stock, size, name: `Artigo SKU ${sku}` });
          }
        });

        if (formatted.length > 0) {
          setParsedPreview(formatted);
          setImportStatus({ success: true, message: `${formatted.length} linhas CSV interpretadas com sucesso.` });
        } else {
          setImportStatus({ success: false, message: 'Não foi possível reconhecer o formato. Utilize JSON ou CSV separado por vírgula.' });
        }
      }
    } catch (err: any) {
      setImportStatus({ success: false, message: `Erro ao interpretar dados: ${err.message}` });
    }
  };

  const handleApplyImport = async () => {
    if (parsedPreview.length === 0) return;
    setIsSyncing(true);
    const res = await importMoblinkStockBatch(parsedPreview);
    setIsSyncing(false);
    setImportStatus(res);
    if (res.success) {
      setParsedPreview([]);
      setRawImportText('');
    }
  };

  // Stats calculation
  const totalProducts = products.length;
  const linkedProductsCount = products.filter(p => p.sku || p.moblinkId || p.barcode).length;
  const totalMoblinkStockSum = products.reduce((sum, p) => sum + (p.stock || 0), 0);

  const filteredProductsForMapping = products.filter(p =>
    p.name.toLowerCase().includes(mappingSearch.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(mappingSearch.toLowerCase())) ||
    (p.modelOrSku && p.modelOrSku.toLowerCase().includes(mappingSearch.toLowerCase())) ||
    (p.category && p.category.toLowerCase().includes(mappingSearch.toLowerCase()))
  );

  return (
    <div className={`p-4 sm:p-6 rounded-2xl border space-y-6 ${
      theme === 'dark' ? 'bg-[#0f172a] border-slate-800 text-slate-100' : 'bg-white border-slate-100 shadow-xs text-slate-900'
    }`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wide flex items-center gap-2">
                Integração de Estoque Moblink ERP
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Pronto para Recebimento
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Sincronize automaticamente o saldo de produtos em tempo real via Webhook, API ou importação em lote.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Action Sync Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar Estoque Agora'}
          </button>
        </div>
      </div>

      {/* Tabs Sub-Navigation */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200/80 dark:border-slate-800 pb-2">
        {[
          { id: 'overview', label: 'Visão Geral & Métricas', icon: Database },
          { id: 'auth', label: 'Autenticação & Token API', icon: ShieldCheck },
          { id: 'mapping', label: `Mapeamento SKU / Código (${linkedProductsCount}/${totalProducts})`, icon: ArrowRightLeft },
          { id: 'import', label: 'Carga & Sincronizador Manual', icon: Upload },
          { id: 'config', label: 'Configuração da API / Webhook', icon: Server },
          { id: 'logs', label: `Logs de Auditoria (${moblinkLogs.length})`, icon: History }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB: AUTHENTICATION SERVICE */}
      {activeTab === 'auth' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl border bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                Serviço de Autenticação - Rota de Login (POST)
              </h3>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                authSession?.status === 'authenticated'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
              }`}>
                {authSession?.status === 'authenticated' ? '✓ Token Ativo & Armazenado' : 'Aguardando Login'}
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Este serviço efetua uma requisição <strong>POST</strong> para a rota de login da API usando o usuário e senha configurados. Ao receber a resposta com o Token de acesso, o sistema armazena-o automaticamente e o injeta no cabeçalho <code>Authorization: Bearer &lt;Token&gt;</code> de todas as próximas requisições.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">URL da API</span>
                <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200 block truncate">
                  {formData.apiUrl || 'http://api_sincom.caioflix.com.br'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Usuário Configurado</span>
                <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200 block">
                  {formData.apiUser || 'a'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Senha Configurada</span>
                <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200 block">
                  •••••• ({formData.apiPassword || 'a'})
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleExecuteLogin}
                disabled={isAuthenticating}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Lock className={`h-4 w-4 ${isAuthenticating ? 'animate-spin' : ''}`} />
                {isAuthenticating ? 'Autenticando via POST...' : '🔐 Executar Login & Obter Token de Acesso'}
              </button>

              {authSession?.token && (
                <button
                  type="button"
                  onClick={logoutSincomAuth}
                  className="px-4 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-red-500 hover:text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Limpar Token Armazenado
                </button>
              )}
            </div>

            {authFeedback && (
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                authFeedback.success
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                  : 'bg-red-500/10 border-red-500/20 text-red-800 dark:text-red-300'
              }`}>
                {authFeedback.success ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" /> : <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />}
                <div className="space-y-1">
                  <p className="text-xs font-bold">{authFeedback.message}</p>
                  {authFeedback.token && (
                    <div className="p-2 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-lg break-all border border-slate-800 mt-2">
                      <span className="text-slate-400">Token Salvo: </span>{authFeedback.token}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Current Active Token Box */}
          <div className="p-5 rounded-2xl border bg-slate-900 text-slate-100 border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-amber-400" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-amber-400">
                  Token de Acesso Armazenado para Próximas Requisições
                </h4>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Header: Authorization Bearer</span>
            </div>

            <div className="p-3 bg-slate-950 font-mono text-xs text-amber-300 rounded-xl border border-slate-800 break-all select-all">
              {authSession?.token || moblinkConfig.apiToken || 'Nenhum token ativado no momento. Clique em Executar Login.'}
            </div>

            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2 pt-1">
              <span>Usuário Logado: <strong className="text-slate-200 font-mono">{authSession?.user || formData.apiUser || 'a'}</strong></span>
              <span>Emissão: <strong className="text-slate-200">{authSession?.authenticatedAt ? new Date(authSession.authenticatedAt).toLocaleString('pt-BR') : 'Agora'}</strong></span>
              <span>Validade: <strong className="text-emerald-400">Ativo (24h)</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900/50 border-slate-200/70 dark:border-slate-800">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
                <span>Status da Conexão</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">Ativa &amp; Conectada</p>
              <p className="text-[10px] text-slate-400 mt-1">Webhook `/api/moblink/webhook` escutando</p>
            </div>

            <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900/50 border-slate-200/70 dark:border-slate-800">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
                <span>Mapeamento do Catálogo</span>
                <PackageCheck className="h-4 w-4 text-primary" />
              </div>
              <p className="text-lg font-black">{linkedProductsCount} <span className="text-xs font-semibold text-slate-400">de {totalProducts} produtos</span></p>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${totalProducts > 0 ? (linkedProductsCount / totalProducts) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900/50 border-slate-200/70 dark:border-slate-800">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
                <span>Estoque Total Moblink</span>
                <Layers className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-lg font-black">{totalMoblinkStockSum} <span className="text-xs font-semibold text-slate-400">unidades</span></p>
              <p className="text-[10px] text-slate-400 mt-1">Soma do saldo de todos os calçados</p>
            </div>

            <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900/50 border-slate-200/70 dark:border-slate-800">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
                <span>Última Sincronização</span>
                <History className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-sm font-bold truncate mt-1">
                {moblinkConfig.lastSyncAt ? new Date(moblinkConfig.lastSyncAt).toLocaleString('pt-BR') : 'Nunca'}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Atualização automática ativada</p>
            </div>
          </div>

          {/* Integration Status Box */}
          <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 space-y-3">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <h4 className="font-bold text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">
                  Como funciona a sincronização de estoque com o Moblink ERP
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  1. O Moblink ERP pode enviar atualizações de estoque instantâneas chamando a URL do seu <strong>Webhook</strong>.<br />
                  2. Cada produto na loja possui um campo <strong>SKU / Código de Barras Moblink</strong> para fazer a correspondência com a sua base do ERP.<br />
                  3. Quando o estoque no Moblink muda (venda física, entrada de mercadoria), o saldo do calçado na vitrine é atualizado automaticamente por tamanho.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Webhook Box */}
          <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                  Sua URL de Webhook para Configurar no Moblink ERP
                </label>
                <p className="text-[11px] text-slate-500">
                  Cole esta URL nas configurações de integrações / webhooks do seu painel do Moblink:
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyWebhook}
                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-primary hover:text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                {copiedWebhook ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedWebhook ? 'Copiado!' : 'Copiar URL do Webhook'}
              </button>
            </div>
            <div className="p-2.5 bg-slate-900 text-amber-300 font-mono text-xs rounded-lg break-all border border-slate-800">
              {webhookUrl}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SKU / CODE MAPPING */}
      {activeTab === 'mapping' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={mappingSearch}
                onChange={(e) => setMappingSearch(e.target.value)}
                placeholder="Buscar por nome, SKU atual ou categoria..."
                className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800"
              />
            </div>
            <span className="text-xs text-slate-500 font-bold self-center">
              {filteredProductsForMapping.length} de {products.length} produtos
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase text-[10px] tracking-wider font-bold">
                  <th className="p-3">Produto</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3">SKU / Ref. Atual</th>
                  <th className="p-3">ID Moblink</th>
                  <th className="p-3">Código de Barras</th>
                  <th className="p-3 text-center">Estoque Atual</th>
                  <th className="p-3 text-center">Status Moblink</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
                {filteredProductsForMapping.map(p => {
                  const hasMoblinkLink = p.sku || p.moblinkId || p.barcode;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                      <td className="p-3 font-semibold flex items-center gap-2">
                        <img src={p.images?.[0] || p.foto_uri || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=600&auto=format&fit=crop'} alt={p.name} className="w-8 h-8 rounded object-cover border border-slate-200 dark:border-slate-700" />
                        <span className="line-clamp-1">{p.name}</span>
                      </td>
                      <td className="p-3 text-slate-500">{p.category}</td>
                      
                      {/* SKU Editable inline */}
                      <td className="p-3">
                        <input
                          type="text"
                          defaultValue={p.sku || p.modelOrSku || ''}
                          onBlur={(e) => updateProduct(p.id, { sku: e.target.value })}
                          placeholder="Digite o SKU"
                          className="w-28 p-1.5 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-xs font-mono"
                        />
                      </td>

                      {/* Moblink ID Editable inline */}
                      <td className="p-3">
                        <input
                          type="text"
                          defaultValue={p.moblinkId || ''}
                          onBlur={(e) => updateProduct(p.id, { moblinkId: e.target.value })}
                          placeholder="Ex: MOB-102"
                          className="w-24 p-1.5 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-xs font-mono"
                        />
                      </td>

                      {/* Barcode Editable inline */}
                      <td className="p-3">
                        <input
                          type="text"
                          defaultValue={p.barcode || ''}
                          onBlur={(e) => updateProduct(p.id, { barcode: e.target.value })}
                          placeholder="EAN / Código"
                          className="w-28 p-1.5 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-xs font-mono"
                        />
                      </td>

                      <td className="p-3 text-center font-bold text-amber-600 dark:text-amber-400">
                        {p.stock} un
                      </td>

                      <td className="p-3 text-center">
                        {hasMoblinkLink ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <Check className="h-3 w-3" />
                            Vincular
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-500">
                            Sem SKU
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: MANUAL IMPORT / BATCH SYNC */}
      {activeTab === 'import' && (
        <div className="space-y-5">
          <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              Carga e Importação de Estoque Moblink (JSON ou CSV)
            </h3>
            <p className="text-xs text-slate-500">
              Cole abaixo o trecho JSON do Moblink ERP ou linhas no formato CSV (SKU, Estoque, Tamanho):
            </p>

            <textarea
              rows={6}
              value={rawImportText}
              onChange={(e) => setRawImportText(e.target.value)}
              placeholder={`Exemplo em JSON:
[
  { "sku": "OXFORD-38", "stock": 15, "size": "38" },
  { "sku": "OXFORD-39", "stock": 8, "size": "39" }
]

Exemplo em CSV:
OXFORD-38, 15, 38
OXFORD-39, 8, 39`}
              className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs bg-white dark:bg-slate-900 focus:outline-none focus:border-primary"
            />

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleParseImportText}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                1. Interpretar Dados
              </button>

              {parsedPreview.length > 0 && (
                <button
                  type="button"
                  onClick={handleApplyImport}
                  disabled={isSyncing}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isSyncing ? 'Aplicando...' : `2. Confirmar e Aplicar Estoque (${parsedPreview.length} itens)`}
                </button>
              )}
            </div>
          </div>

          {/* Feedback Status */}
          {importStatus && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              importStatus.success
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                : 'bg-red-500/10 border-red-500/20 text-red-800 dark:text-red-300'
            }`}>
              {importStatus.success ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" /> : <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />}
              <div>
                <p className="text-xs font-bold">{importStatus.message}</p>
              </div>
            </div>
          )}

          {/* Preview Table */}
          {parsedPreview.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                Pré-visualização dos Itens do Moblink ({parsedPreview.length})
              </h4>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl max-h-60 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800">
                    <tr className="uppercase text-[10px] tracking-wider font-bold text-slate-500">
                      <th className="p-2.5">SKU / Código</th>
                      <th className="p-2.5">Nome / Artigo</th>
                      <th className="p-2.5">Tamanho / Variação</th>
                      <th className="p-2.5 text-right">Novo Saldo Moblink</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800">
                    {parsedPreview.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-2.5 font-mono font-bold">{item.sku || '-'}</td>
                        <td className="p-2.5">{item.name || 'Artigo Correspondente'}</td>
                        <td className="p-2.5 font-semibold">{item.size}</td>
                        <td className="p-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {item.stock} un
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CONFIGURATION */}
      {activeTab === 'config' && (
        <form onSubmit={handleSaveConfig} className="space-y-6">
          <div className="p-5 rounded-2xl border bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-2 border-b pb-3">
              <Server className="h-4 w-4 text-primary" />
              Parâmetros de Conexão com o Servidor Moblink ERP
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-600 dark:text-slate-300 block uppercase text-[9px]">
                  URL da API Moblink
                </label>
                <input
                  type="text"
                  required
                  value={formData.apiUrl}
                  onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                  placeholder="https://api.moblink.com.br/v1"
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 dark:text-slate-300 block uppercase text-[9px]">
                  Usuário da API
                </label>
                <input
                  type="text"
                  value={formData.apiUser || ''}
                  onChange={(e) => setFormData({ ...formData, apiUser: e.target.value })}
                  placeholder="Ex: a"
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 dark:text-slate-300 block uppercase text-[9px]">
                  Senha da API
                </label>
                <input
                  type="password"
                  value={formData.apiPassword || ''}
                  onChange={(e) => setFormData({ ...formData, apiPassword: e.target.value })}
                  placeholder="Ex: a"
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 dark:text-slate-300 block uppercase text-[9px]">
                  Token de Autenticação / API Key
                </label>
                <input
                  type="password"
                  required
                  value={formData.apiToken}
                  onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
                  placeholder="Chave secreta de integração Moblink"
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 dark:text-slate-300 block uppercase text-[9px]">
                  Código da Empresa
                </label>
                <input
                  type="text"
                  value={formData.empresaId}
                  onChange={(e) => setFormData({ ...formData, empresaId: e.target.value })}
                  placeholder="Ex: 001"
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 dark:text-slate-300 block uppercase text-[9px]">
                  Código da Filial / Loja
                </label>
                <input
                  type="text"
                  value={formData.filialId}
                  onChange={(e) => setFormData({ ...formData, filialId: e.target.value })}
                  placeholder="Ex: 001"
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 dark:text-slate-300 block uppercase text-[9px]">
                  Chave do Webhook Secret
                </label>
                <input
                  type="text"
                  value={formData.webhookSecret}
                  onChange={(e) => setFormData({ ...formData, webhookSecret: e.target.value })}
                  placeholder="Segredo para autenticação do Webhook"
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 dark:text-slate-300 block uppercase text-[9px]">
                  Campo de Correspondência Principal
                </label>
                <select
                  value={formData.stockMatchKey}
                  onChange={(e) => setFormData({ ...formData, stockMatchKey: e.target.value as any })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 font-semibold"
                >
                  <option value="sku">Código SKU do Produto</option>
                  <option value="moblinkId">ID Interno Moblink</option>
                  <option value="barcode">Código de Barras (EAN)</option>
                  <option value="name">Nome / Descrição</option>
                </select>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              {isSaving ? 'Salvando...' : 'Salvar Configurações'}
            </button>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-5 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              {isTesting ? 'Testando Conexão...' : '⚡ Testar Comunicação com Moblink'}
            </button>
          </div>

          {testResult && (
            <div className={`p-4 rounded-xl border flex items-center gap-3 ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                : 'bg-red-500/10 border-red-500/20 text-red-800 dark:text-red-300'
            }`}>
              {testResult.success ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" /> : <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />}
              <p className="text-xs font-bold">{testResult.message}</p>
            </div>
          )}
        </form>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">
              Histórico de Sincronizações Moblink
            </h3>
            <span className="text-xs text-slate-400">Últimos {moblinkLogs.length} registros</span>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-[10px] tracking-wider font-bold">
                  <th className="p-3">Data / Hora</th>
                  <th className="p-3">Origem</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Mensagem / Resumo</th>
                  <th className="p-3 text-right">Itens Atualizados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
                {moblinkLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                    <td className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 border">
                        {log.type === 'webhook' ? '⚡ Webhook Push' : log.type === 'manual_import' ? '📥 Carga Manual' : '🔄 API Sync'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.status === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                      }`}>
                        {log.status === 'success' ? 'Sucesso' : 'Alerta'}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-700 dark:text-slate-200">{log.message}</td>
                    <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {log.itemsUpdated} item(ns)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
