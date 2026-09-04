import React, { useState, useEffect } from 'react';
import { CreditEvaluationsList } from './CreditEvaluationsList';
import { CreditOrdersList } from './CreditOrdersList';
import { creditService } from '../../../services/credit/creditService';
import { 
  CreditCard, 
  ShoppingBag, 
  Clock, 
  CheckCircle2, 
  DollarSign, 
  TrendingUp,
  ShieldCheck,
  Users
} from 'lucide-react';

interface CreditManagementProps {
  isDark: boolean;
}

export const CreditManagement: React.FC<CreditManagementProps> = ({ isDark }) => {
  const [activeTab, setActiveTab] = useState<'evaluations' | 'orders'>('evaluations');
  const [stats, setStats] = useState({
    pendingEvaluations: 0,
    totalEvaluations: 0,
    pendingOrders: 0,
    totalOrders: 0,
    totalOrdersValue: 0,
  });

  const loadStats = async () => {
    try {
      const [evals, ords] = await Promise.all([
        creditService.getAllCreditEvaluations(),
        creditService.getAllCreditOrders()
      ]);

      const pendingE = evals.filter(e => e.status === 'Pendente').length;
      const pendingO = ords.filter(o => o.status === 'Pendente').length;
      const sumValue = ords.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);

      setStats({
        pendingEvaluations: pendingE,
        totalEvaluations: evals.length,
        pendingOrders: pendingO,
        totalOrders: ords.length,
        totalOrdersValue: sumValue,
      });
    } catch (err) {
      console.error('Erro ao carregar estatísticas do crediário:', err);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Gestão do Crediário Próprio
          </h1>
          <p className={`text-xs mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Analise limites de crédito, aprove pedidos de compra e converse com clientes no WhatsApp.
          </p>
        </div>

        {/* Abas Unificadas Estilo Apple Segmented Control */}
        <div className={`p-1 rounded-2xl border flex items-center gap-1 shrink-0 ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-100 border-slate-200/60'
        }`}>
          <button
            type="button"
            onClick={() => setActiveTab('evaluations')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'evaluations'
                ? (isDark ? 'bg-[#2c2c2e] text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm')
                : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-500" />
            <span>Avaliações de Crédito</span>
            {stats.pendingEvaluations > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
                {stats.pendingEvaluations}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'orders'
                ? (isDark ? 'bg-[#2c2c2e] text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm')
                : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-emerald-500" />
            <span>Solicitações de Compra</span>
            {stats.pendingOrders > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white">
                {stats.pendingOrders}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
          isDark ? 'bg-[#1c1c1e] border-slate-800' : 'bg-white border-slate-200/80 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Análises Pendentes</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 text-amber-500">
            {stats.pendingEvaluations}
          </p>
          <span className="text-[11px] text-slate-400">de {stats.totalEvaluations} avaliações</span>
        </div>

        <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
          isDark ? 'bg-[#1c1c1e] border-slate-800' : 'bg-white border-slate-200/80 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Compras Pendentes</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 text-blue-500">
            {stats.pendingOrders}
          </p>
          <span className="text-[11px] text-slate-400">aguardando liberação</span>
        </div>

        <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
          isDark ? 'bg-[#1c1c1e] border-slate-800' : 'bg-white border-slate-200/80 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total de Pedidos</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 text-slate-900 dark:text-white">
            {stats.totalOrders}
          </p>
          <span className="text-[11px] text-slate-400">via crediário</span>
        </div>

        <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
          isDark ? 'bg-[#1c1c1e] border-slate-800' : 'bg-white border-slate-200/80 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Volume em Compras</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black mt-2 text-emerald-600 dark:text-emerald-400">
            {stats.totalOrdersValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <span className="text-[11px] text-slate-400">solicitado em carnê</span>
        </div>
      </div>

      {/* Conteúdo da Aba Ativa */}
      {activeTab === 'evaluations' ? (
        <CreditEvaluationsList isDark={isDark} onRefreshStats={loadStats} />
      ) : (
        <CreditOrdersList isDark={isDark} onRefreshStats={loadStats} />
      )}
    </div>
  );
};
