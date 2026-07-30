import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Zap,
  RefreshCw,
  Server,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ShieldCheck,
  Activity,
  Database,
  History
} from 'lucide-react';

export const MoblinkIntegrationPanel: React.FC = () => {
  const {
    moblinkConfig,
    moblinkLogs,
    testMoblinkConnection,
    syncMoblinkStock,
    products,
    theme
  } = useApp();

  const [isSyncing, setIsSyncing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [syncResult, setSyncResult] = useState<{ success?: boolean; message?: string } | null>(null);

  // Webhook URL oficial da loja
  const webhookUrl = `${window.location.origin}/api/moblink/webhook?token=${moblinkConfig.webhookSecret || 'secret_moblink_evidencia_2026'}`;

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testMoblinkConnection();
      setTestResult(result);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Erro ao conectar à API do MobLink.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncMoblinkStock();
      setSyncResult(result);
    } catch (err: any) {
      setSyncResult({ success: false, message: err.message || 'Falha ao sincronizar estoque.' });
    } finally {
      setIsSyncing(false);
    }
  };

  // Métricas essenciais
  const totalProducts = products.length;
  const linkedProductsCount = products.filter(p => p.sku || p.moblinkId || String(p.id).startsWith('MOB-')).length;
  const totalStockSum = products.reduce((sum, p) => sum + Math.max(0, p.stock || 0), 0);
  const recentLogs = moblinkLogs.slice(0, 5);

  return (
    <div className={`p-4 sm:p-6 rounded-2xl border space-y-6 animate-fade-in ${
      theme === 'dark' ? 'bg-[#0f172a] border-slate-800 text-slate-100' : 'bg-white border-slate-100 shadow-xs text-slate-900'
    }`}>
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl border border-amber-500/20 shadow-xs">
            <Zap className="h-6 w-6 fill-amber-500/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wide">
                Integração MobLink ERP
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Ativo &amp; Sincronizado
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Conexão com a API oficial da Evidência Calçados com suporte a atualizações em tempo real.
            </p>
          </div>
        </div>

        {/* BOTAO DE SINCRONIZAÇÃO DIRETA */}
        <button
          type="button"
          onClick={handleSyncNow}
          disabled={isSyncing}
          className="px-5 py-2.5 bg-slate-900 dark:bg-amber-500 dark:text-slate-950 text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer hover:opacity-90 disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin text-amber-400 dark:text-slate-950' : ''}`} />
          <span>{isSyncing ? 'Sincronizando Estoque...' : 'Sincronizar Estoque Agora'}</span>
        </button>
      </div>

      {/* FEEDBACK DE SINCRONIZAÇÃO */}
      {syncResult && (
        <div className={`p-4 rounded-xl border text-xs flex items-center gap-3 animate-fade-in ${
          syncResult.success !== false
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300'
        }`}>
          {syncResult.success !== false ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />
          )}
          <span className="font-semibold">{syncResult.message || 'Sincronização concluída com sucesso!'}</span>
        </div>
      )}

      {/* CARDS DE MÉTRICAS ESSENCIAIS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CARD 1: API ENDPOINT */}
        <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Status do Servidor ERP</span>
            <Server className="h-4 w-4 text-amber-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-lg font-black text-slate-800 dark:text-slate-100">API Oficial ERP</p>
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">Online</span>
          </div>
          <p className="text-[10px] text-slate-400 truncate font-mono" title="https://api.evidenciacalcados.com.br/api/v1/produtos">
            api.evidenciacalcados.com.br
          </p>
        </div>

        {/* CARD 2: PRODUTOS MAPEADOS */}
        <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Produtos Sincronizados</span>
            <Database className="h-4 w-4 text-blue-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-xl font-black text-slate-800 dark:text-slate-100">{linkedProductsCount}</p>
            <span className="text-xs font-bold text-slate-400">de {totalProducts} itens</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${totalProducts > 0 ? Math.min(100, (linkedProductsCount / totalProducts) * 100) : 100}%` }}
            ></div>
          </div>
        </div>

        {/* CARD 3: SALDO DE ESTOQUE */}
        <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total de Peças em Loja</span>
            <Activity className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-xl font-black text-slate-800 dark:text-slate-100">{totalStockSum}</p>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Em Estoque</span>
          </div>
          <p className="text-[10px] text-slate-400">Valores negativos tratados como 0 (Esgotado)</p>
        </div>
      </div>

      {/* CONECTIVIDADE & WEBHOOK */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LADO ESQUERDO: TESTE DE CONEXÃO & SEGURANÇA */}
        <div className="p-5 rounded-xl border bg-slate-50 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Autenticação &amp; Diagnóstico
            </h3>
            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Bearer Token Active
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            A API utiliza um Token JWT seguro para validar todas as sincronizações. Clique abaixo para testar a comunicação direta com o servidor oficial do ERP.
          </p>

          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isTesting ? 'animate-spin text-amber-500' : ''}`} />
            <span>{isTesting ? 'Testando Comunicação...' : 'Testar Conexão com MobLink ERP'}</span>
          </button>

          {testResult && (
            <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 animate-fade-in ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
            }`}>
              {testResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* LADO DIREITO: URL DO WEBHOOK PARA ESTOQUE EM TEMPO REAL */}
        <div className="p-5 rounded-xl border bg-slate-50 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Webhook em Tempo Real
            </h3>
            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              POST Receiver
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Cadastre a URL abaixo no painel do MobLink ERP para receber atualizações automáticas de saldo no e-commerce sempre que uma venda for efetuada na loja física.
          </p>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={webhookUrl}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono select-all focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopyWebhook}
              className="px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-xs"
            >
              {copiedWebhook ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedWebhook ? 'Copiado!' : 'Copiar'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* HISTÓRICO RECENTE DE AUDITORIA (LOGS) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <History className="h-4 w-4 text-slate-400" />
            Histórico Recente de Sincronizações
          </h3>
          <span className="text-[10px] text-slate-400 font-mono">Últimas 5 atividades</span>
        </div>

        <div className="border rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800">
          {recentLogs.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 font-medium">
              Nenhum registro de sincronização recente.
            </div>
          ) : (
            recentLogs.map((log) => (
              <div key={log.id} className="p-3 text-xs flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  {log.status === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                      {log.message}
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {log.type}
                  </span>
                  <span className="font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    {log.itemsUpdated} item(ns)
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
