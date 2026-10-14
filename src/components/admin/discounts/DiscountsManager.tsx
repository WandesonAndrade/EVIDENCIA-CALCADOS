import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../../context/AppContext';
import {
  Percent,
  Sparkles,
  Clock,
  CheckCircle2,
  Smartphone,
  Save,
  RotateCcw,
  Zap,
  Tag,
  Gift,
  MessageSquare,
  Settings2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { InstallmentDiscountConfig } from '../../../types';
import { DEFAULT_INSTALLMENT_DISCOUNT_CONFIG } from '../../../services/installmentDiscountService';

interface DiscountsManagerProps {
  isDark: boolean;
}

export const DiscountsManager: React.FC<DiscountsManagerProps> = ({ isDark }) => {
  const { installmentDiscountConfig, updateInstallmentDiscountConfig } = useApp();

  // Estado do formulário de Desconto de Pontualidade
  const [active, setActive] = useState<boolean>(installmentDiscountConfig?.active ?? true);
  const [percentage, setPercentage] = useState<number>(installmentDiscountConfig?.percentage ?? 10);
  const [cutoffHour, setCutoffHour] = useState<string>(installmentDiscountConfig?.cutoffHour ?? '22:00');
  const [bannerTitle, setBannerTitle] = useState<string>(
    installmentDiscountConfig?.bannerTitle || DEFAULT_INSTALLMENT_DISCOUNT_CONFIG.bannerTitle || ''
  );
  const [bannerSubtitle, setBannerSubtitle] = useState<string>(
    installmentDiscountConfig?.bannerSubtitle || DEFAULT_INSTALLMENT_DISCOUNT_CONFIG.bannerSubtitle || ''
  );
  const [financeWhatsApp, setFinanceWhatsApp] = useState<string>(
    installmentDiscountConfig?.financeWhatsApp || DEFAULT_INSTALLMENT_DISCOUNT_CONFIG.financeWhatsApp || '5599984125572'
  );
  const [showAdvancedText, setShowAdvancedText] = useState<boolean>(false);

  // Simulador de Parcela
  const [simulationValue, setSimulationValue] = useState<number>(100);

  // Estados de feedback
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sincroniza estado com o context quando mudar externamente
  useEffect(() => {
    if (installmentDiscountConfig) {
      setActive(installmentDiscountConfig.active);
      setPercentage(installmentDiscountConfig.percentage);
      setCutoffHour(installmentDiscountConfig.cutoffHour || '22:00');
      setBannerTitle(installmentDiscountConfig.bannerTitle || DEFAULT_INSTALLMENT_DISCOUNT_CONFIG.bannerTitle || '');
      setBannerSubtitle(installmentDiscountConfig.bannerSubtitle || DEFAULT_INSTALLMENT_DISCOUNT_CONFIG.bannerSubtitle || '');
      setFinanceWhatsApp(installmentDiscountConfig.financeWhatsApp || DEFAULT_INSTALLMENT_DISCOUNT_CONFIG.financeWhatsApp || '5599984125572');
    }
  }, [installmentDiscountConfig]);

  // Cálculos do Simulador
  const discountAmount = active ? Math.round((simulationValue * (percentage / 100)) * 100) / 100 : 0;
  const finalSimulatedValue = Math.max(0.01, Math.round((simulationValue - discountAmount) * 100) / 100);

  const presets = [5, 8, 10, 12, 15, 20];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedConfig: InstallmentDiscountConfig = {
        active,
        percentage: Math.max(0, Math.min(100, Number(percentage) || 0)),
        cutoffHour: cutoffHour || '22:00',
        bannerTitle: bannerTitle.trim(),
        bannerSubtitle: bannerSubtitle.trim(),
        financeWhatsApp: financeWhatsApp.trim() || '5599984125572',
        updatedAt: new Date().toISOString(),
      };

      await updateInstallmentDiscountConfig(updatedConfig);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      console.error('Erro ao salvar configuração de desconto de pontualidade:', err);
      alert('Erro ao salvar no Firestore. Verifique sua conexão.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (confirm('Deseja restaurar as configurações padrão (10% até às 22h e WhatsApp do Financeiro 99 98412-5572)?')) {
      setActive(DEFAULT_INSTALLMENT_DISCOUNT_CONFIG.active);
      setPercentage(DEFAULT_INSTALLMENT_DISCOUNT_CONFIG.percentage);
      setCutoffHour(DEFAULT_INSTALLMENT_DISCOUNT_CONFIG.cutoffHour);
      setBannerTitle(DEFAULT_INSTALLMENT_DISCOUNT_CONFIG.bannerTitle || '');
      setBannerSubtitle(DEFAULT_INSTALLMENT_DISCOUNT_CONFIG.bannerSubtitle || '');
      setFinanceWhatsApp(DEFAULT_INSTALLMENT_DISCOUNT_CONFIG.financeWhatsApp || '5599984125572');
    }
  };

  const cardStyle = isDark
    ? 'bg-slate-900/90 border border-slate-800 rounded-3xl shadow-lg backdrop-blur-md'
    : 'bg-white border border-slate-200/80 rounded-3xl shadow-sm backdrop-blur-md';

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Descontos & Benefícios
          </h1>
          <p className={`text-xs mt-0.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Configure o desconto de pontualidade do crediário e o canal de confirmação do financeiro.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              isDark
                ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Restaurar valores padrão recomendados"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Padrão</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#0071E3] hover:bg-[#005bb5] text-white transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                >
                  <Clock className="w-4 h-4" />
                </motion.div>
                <span>Salvando...</span>
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Salvo com Sucesso!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar Alterações</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alerta de Feedback de Sucesso */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center gap-2.5 text-xs font-bold"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              Alterações salvas! Desconto de {percentage}% até às {cutoffHour} ativo para os clientes.
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card Principal: Desconto de Pontualidade no Crediário */}
      <div className={`${cardStyle} p-5 sm:p-7 space-y-6`}>
        {/* Topo do Card: Título + Toggle Ativar/Desativar */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              active
                ? 'bg-blue-500/10 text-[#0071E3]'
                : isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'
            }`}>
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className={`text-sm sm:text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Pontualidade no Crediário Próprio
              </h2>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Abatimento automático em parcelas pagas até o vencimento.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className={`text-xs font-bold ${active ? 'text-emerald-500' : 'text-slate-400'}`}>
              {active ? 'Ativo' : 'Pausado'}
            </span>
            <button
              type="button"
              onClick={() => setActive(!active)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                active ? 'bg-emerald-500' : isDark ? 'bg-slate-700' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  active ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Grade: Configurações (Esq) vs Simulador (Dir) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Lado Esquerdo: Controles Principais */}
          <div className="lg:col-span-7 space-y-4">
            {/* Campo de Porcentagem & Presets em Linha */}
            <div className="space-y-1.5">
              <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Desconto por Parcela em Dia
              </label>

              <div className="flex items-center gap-2">
                <div className="relative w-32 shrink-0">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={percentage}
                    onChange={(e) => setPercentage(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                    className={`w-full pl-3.5 pr-8 py-2.5 rounded-xl border text-base font-black tracking-wide focus:outline-none transition-all ${
                      isDark
                        ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-600'
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-blue-500">
                    %
                  </div>
                </div>

                {/* Presets Rápidos */}
                <div className="flex items-center gap-1 flex-wrap">
                  {presets.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPercentage(p)}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        percentage === p
                          ? 'bg-[#0071E3] text-white shadow-xs'
                          : isDark
                          ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Linha Dupla: Horário de Corte + WhatsApp do Financeiro */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Horário de Corte */}
              <div className="space-y-1.5">
                <label className={`block text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  <span>Horário Limite</span>
                </label>
                <input
                  type="time"
                  value={cutoffHour}
                  onChange={(e) => setCutoffHour(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold tracking-wider focus:outline-none transition-all ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-600'
                  }`}
                />
                <p className="text-[10px] text-slate-400">
                  Válido até às {cutoffHour} do dia do vencimento.
                </p>
              </div>

              {/* WhatsApp do Financeiro */}
              <div className="space-y-1.5">
                <label className={`block text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                  <span>WhatsApp Financeiro</span>
                </label>
                <input
                  type="text"
                  value={financeWhatsApp}
                  onChange={(e) => setFinanceWhatsApp(e.target.value)}
                  placeholder="5599984125572"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold focus:outline-none transition-all ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-white focus:border-emerald-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-600'
                  }`}
                />
                <p className="text-[10px] text-slate-400">
                  Recebe comprovantes das parcelas pagas.
                </p>
              </div>
            </div>

            {/* Acordeão Opcional: Personalização dos Textos do Banner */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAdvancedText(!showAdvancedText)}
                className={`w-full py-2 px-3 rounded-xl flex items-center justify-between text-xs font-bold transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-slate-800/60 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Settings2 className="w-3.5 h-3.5 text-blue-500" />
                  <span>Personalizar Textos do Banner no Portal (Opcional)</span>
                </div>
                {showAdvancedText ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              <AnimatePresence>
                {showAdvancedText && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 pt-3 overflow-hidden"
                  >
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-400">Título do Banner:</span>
                      <input
                        type="text"
                        value={bannerTitle}
                        onChange={(e) => setBannerTitle(e.target.value)}
                        placeholder="Desconto de Pontualidade Evidência"
                        className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-none transition-all ${
                          isDark
                            ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500'
                            : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-600'
                        }`}
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-400">Subtítulo / Instrução:</span>
                      <input
                        type="text"
                        value={bannerSubtitle}
                        onChange={(e) => setBannerSubtitle(e.target.value)}
                        placeholder="Pague até a data do vencimento e economize na sua parcela!"
                        className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-none transition-all ${
                          isDark
                            ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500'
                            : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-600'
                        }`}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Lado Direito: Prévia Visual Limpa da Parcela */}
          <div className="lg:col-span-5 p-4 sm:p-5 rounded-2xl border bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Prévia na Visão do Cliente
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold">
                <span className="text-slate-400">Teste: R$</span>
                <input
                  type="number"
                  value={simulationValue}
                  onChange={(e) => setSimulationValue(Math.max(1, Number(e.target.value) || 0))}
                  className="w-16 px-1.5 py-0.5 rounded-lg border text-right font-bold text-xs bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                />
              </div>
            </div>

            {/* Card Simulando como a Parcela é Renderizada em MeuCrediario.tsx */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Parcela 1/3</span>
                  <p className="text-[10px] text-slate-400">Vence Hoje</p>
                </div>

                {active && percentage > 0 && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-[#0071E3] text-white flex items-center gap-1">
                    <Percent className="w-2.5 h-2.5" />
                    <span>-{percentage}% PONTUALIDADE</span>
                  </span>
                )}
              </div>

              {/* Preços e Economia */}
              <div className="flex items-end justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  {active && percentage > 0 && (
                    <div className="text-[10px] text-slate-400 line-through">
                      {simulationValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                  )}
                  <div className="text-sm font-black text-[#003B73] dark:text-blue-300">
                    {finalSimulatedValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                </div>

                {active && percentage > 0 && (
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-[#006EDB] dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md block">
                      Economia de {discountAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                )}
              </div>

              {/* Botão Pagar Pix Simulado */}
              <button
                type="button"
                disabled
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#0071E3] text-white flex items-center justify-center gap-1.5 shadow-sm opacity-95 cursor-default"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Pagar Pix com Desconto: {finalSimulatedValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé Minimalista: Outras Políticas Integradas */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-800/60">
        <span className="font-bold">Outros Módulos de Benefício:</span>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-medium flex items-center gap-1.5">
            <Tag className="w-3 h-3 text-purple-500" />
            <span>Cupons de Desconto (Ofertas)</span>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-medium flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-blue-500" />
            <span>Pix à Vista (MobLink ERP)</span>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-medium flex items-center gap-1.5">
            <Gift className="w-3 h-3 text-emerald-500" />
            <span>Cashback & Fidelidade (CRM)</span>
          </span>
        </div>
      </div>
    </div>
  );
};
