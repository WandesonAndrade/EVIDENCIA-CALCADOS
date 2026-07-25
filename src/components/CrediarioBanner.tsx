import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ShieldCheck, Sparkles, CheckCircle2, Clock, 
  ArrowRight, CreditCard, AlertCircle, FileText, Lock 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CompleteProfileModal } from './CompleteProfileModal';
import { isProfileIncomplete } from '../App';

export const CrediarioBanner: React.FC = () => {
  const { currentUser, setCurrentView, theme } = useApp();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const isDark = theme === 'dark';
  const crediarioStatus = currentUser?.crediarioStatus || 'NaoSolicitado';

  const handleActionClick = () => {
    if (!currentUser) {
      setCurrentView('login');
      return;
    }

    if (crediarioStatus === 'Aprovado') {
      setFeedbackMessage('🎉 Parabéns! Seu crediário próprio já está aprovado e disponível para parcelar suas compras no checkout.');
      setTimeout(() => setFeedbackMessage(''), 5000);
      return;
    }

    if (crediarioStatus === 'EmAnalise') {
      setFeedbackMessage('⏳ Sua solicitação de crediário já está em análise pela equipe da Evidência Calçados em Caxias (MA). Aguarde a liberação!');
      setTimeout(() => setFeedbackMessage(''), 5000);
      return;
    }

    // Open Profile modal to complete registration & request credit
    setIsProfileModalOpen(true);
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={`relative overflow-hidden rounded-3xl border p-6 sm:p-8 backdrop-blur-2xl shadow-xl transition-all ${
          isDark
            ? 'bg-gradient-to-r from-amber-500/15 via-slate-900/90 to-amber-600/10 border-amber-400/30 text-white shadow-black/60'
            : 'bg-gradient-to-r from-amber-500/10 via-white to-amber-400/20 border-amber-300/80 text-slate-900 shadow-md'
        }`}
      >
        {/* Glow / Light Accent */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Main Info */}
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-400 border border-amber-400/30">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Exclusivo para Caxias - MA</span>
            </div>

            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight leading-snug">
              Compre no carnê: <span className="text-amber-400">Solicite seu Crediário Próprio!</span>
            </h2>

            <p className={`text-xs sm:text-sm font-medium leading-relaxed ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}>
              Parcele seus calçados e acessórios em até <strong>10x sem juros no carnê da loja Evidência</strong> sem precisar de cartão de crédito ou burocracia.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-2.5 pt-1 text-[11px] font-bold">
              <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl border ${
                isDark ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}>
                <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                <span>Até 10x sem juros</span>
              </span>

              <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl border ${
                isDark ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}>
                <Clock className="h-3.5 w-3.5 text-sky-400" />
                <span>Análise Rápida</span>
              </span>

              <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl border ${
                isDark ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}>
                <CreditCard className="h-3.5 w-3.5 text-emerald-400" />
                <span>Sem Cartão de Crédito</span>
              </span>
            </div>
          </div>

          {/* Status & CTA Action Section */}
          <div className="flex flex-col items-start lg:items-end justify-center space-y-3 shrink-0 pt-2 lg:pt-0">
            {/* Status Badges */}
            {crediarioStatus === 'Aprovado' && (
              <div className="flex items-center space-x-2 px-4 py-2 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black uppercase">
                <CheckCircle2 className="h-4 w-4" />
                <span>Crediário Aprovado & Liberado</span>
              </div>
            )}

            {crediarioStatus === 'EmAnalise' && (
              <div className="flex items-center space-x-2 px-4 py-2 rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-black uppercase">
                <Clock className="h-4 w-4 animate-pulse" />
                <span>Solicitação Em Análise</span>
              </div>
            )}

            {crediarioStatus === 'Rejeitado' && (
              <div className="flex items-center space-x-2 px-4 py-2 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-black uppercase">
                <AlertCircle className="h-4 w-4" />
                <span>Análise Não Aprovada</span>
              </div>
            )}

            {/* Action Button */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleActionClick}
              className={`inline-flex items-center space-x-2.5 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer ${
                crediarioStatus === 'Aprovado'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                  : crediarioStatus === 'EmAnalise'
                    ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/30'
                    : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/20'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>
                {crediarioStatus === 'Aprovado'
                  ? 'Crediário Pronto para Uso'
                  : crediarioStatus === 'EmAnalise'
                    ? 'Acompanhar Análise'
                    : crediarioStatus === 'Rejeitado'
                      ? 'Revisar e Solicitar Novamente'
                      : 'Solicitar Análise de Crédito'}
              </span>
              <ArrowRight className="h-4 w-4" />
            </motion.button>

            {!currentUser && (
              <p className={`text-[10px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                * Faça login com seu e-mail para solicitar
              </p>
            )}
          </div>

        </div>

        {/* Feedback Alert Message */}
        <AnimatePresence>
          {feedbackMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-3 rounded-2xl bg-slate-950/80 border border-amber-400/30 text-amber-300 text-xs font-bold text-center"
            >
              {feedbackMessage}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Complete Profile & Credit Request Modal */}
      <CompleteProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
};
