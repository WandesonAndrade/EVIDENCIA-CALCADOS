import React, { useState } from 'react';
import { 
  Mail, 
  ShieldCheck, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  LogOut, 
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { auth } from '../lib/firebase';
import { 
  requestEmailMigration, 
  reauthenticateAndMigrateEmail, 
  isFictitiousEmail 
} from '../features/cpf-auth';
import { EmailMigrationStep } from '../features/cpf-auth/types';

interface EmailMigrationModalProps {
  isOpen: boolean;
  onSuccess?: () => void;
}

export const EmailMigrationModal: React.FC<EmailMigrationModalProps> = ({
  isOpen,
  onSuccess,
}) => {
  const { currentUser, logout, theme } = useApp();
  const isDark = theme === 'dark';

  const [step, setStep] = useState<EmailMigrationStep>('input');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const currentFbUser = auth.currentUser;

  // 1. Submissão do novo e-mail real
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!currentFbUser) {
      setErrorMessage('Sessão expirada. Por favor, saia e faça login novamente.');
      return;
    }

    try {
      setIsLoading(true);
      const result = await requestEmailMigration(currentFbUser, newEmail);

      if (result.requiresReauth) {
        setStep('reauth');
        setErrorMessage(result.message || 'Por segurança, confirme sua senha atual.');
      } else if (result.success) {
        setStep('sent');
        setSuccessMessage(result.message || 'Link de verificação enviado com sucesso!');
      }
    } catch (err: any) {
      console.error('[EmailMigrationModal] Erro ao solicitar migração:', err);
      setErrorMessage(err.message || 'Erro ao processar a atualização do e-mail.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Submissão de reautenticação com a senha atual
  const handleReauthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!currentFbUser) {
      setErrorMessage('Sessão expirada. Por favor, saia e faça login novamente.');
      return;
    }

    try {
      setIsLoading(true);
      const result = await reauthenticateAndMigrateEmail(
        currentFbUser,
        currentPassword,
        newEmail
      );

      if (result.success) {
        setStep('sent');
        setSuccessMessage(result.message || 'Link de verificação enviado com sucesso!');
      }
    } catch (err: any) {
      console.error('[EmailMigrationModal] Erro ao reautenticar:', err);
      setErrorMessage(err.message || 'Senha incorreta ou erro na reautenticação.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Verifica se o usuário já clicou no link de confirmação do e-mail
  const handleCheckEmailVerified = async () => {
    if (!currentFbUser) return;
    setIsVerifying(true);
    setErrorMessage('');

    try {
      await currentFbUser.reload();
      const updatedUser = auth.currentUser;

      if (updatedUser && !isFictitiousEmail(updatedUser.email)) {
        setSuccessMessage('E-mail validado com sucesso! Redirecionando...');
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 1200);
      } else {
        setErrorMessage(
          'A confirmação ainda não foi detectada. Verifique se clicou no link recebido em seu e-mail e tente novamente.'
        );
      }
    } catch (err: any) {
      console.error('[EmailMigrationModal] Erro ao verificar atualização:', err);
      setErrorMessage('Não foi possível verificar no momento. Tente novamente em instantes.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in select-none">
      <div 
        className={`w-full max-w-lg rounded-3xl border shadow-2xl p-6 sm:p-8 space-y-6 transition-all animate-scale-up ${
          isDark 
            ? 'bg-slate-900 border-slate-800 text-white shadow-black/80' 
            : 'bg-white border-slate-200 text-slate-800 shadow-2xl'
        }`}
      >
        {/* Cabeçalho */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 mb-1">
            <ShieldCheck className="h-7 w-7" />
          </div>

          <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {step === 'sent' ? 'Verifique seu E-mail' : 'Atualização de E-mail Obrigatória'}
          </h2>

          <p className={`text-xs sm:text-sm leading-relaxed max-w-sm mx-auto font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {step === 'sent'
              ? 'Enviamos o link de confirmação para a sua caixa de entrada.'
              : 'Para a sua segurança, precisamos que você cadastre um e-mail real para recuperação de conta e notificações de pedidos.'}
          </p>
        </div>

        {/* Mensagem de Erro */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold text-center flex items-center justify-center gap-2 animate-fade-in">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Mensagem de Sucesso */}
        {successMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold text-center flex items-center justify-center gap-2 animate-fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ETAPA 1: INFORMAR NOVO E-MAIL REAL */}
        {step === 'input' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Novo E-mail Real <span className="text-amber-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="exemplo@gmail.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-sm font-medium transition-all outline-none ${
                    isDark
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-amber-400'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-400'
                  }`}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Enviaremos um link de confirmação para este endereço antes de concluir a alteração definitiva.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !newEmail}
              className={`w-full py-3.5 px-6 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 ${
                isDark
                  ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-amber-400/10'
                  : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Enviando link...</span>
                </>
              ) : (
                <>
                  <span>Enviar Link de Confirmação</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ETAPA 2: REAUTENTICAÇÃO COM A SENHA ATUAL */}
        {step === 'reauth' && (
          <form onSubmit={handleReauthSubmit} className="space-y-4">
            <div className="p-3 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-amber-500 text-xs">
              Por segurança, digite a senha da sua conta para autorizar o envio para: <strong>{newEmail}</strong>
            </div>

            <div className="space-y-1.5">
              <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Senha Atual da Conta <span className="text-amber-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  minLength={6}
                  placeholder="Sua senha atual"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={`w-full pl-10 pr-10 py-3 rounded-2xl border text-sm font-medium transition-all outline-none ${
                    isDark
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-amber-400'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-400'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setStep('input');
                  setCurrentPassword('');
                  setErrorMessage('');
                }}
                className={`w-1/3 py-3 rounded-2xl font-bold text-xs border cursor-pointer transition-colors ${
                  isDark ? 'border-slate-800 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={isLoading || !currentPassword}
                className={`w-2/3 py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 ${
                  isDark
                    ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Confirmando...</span>
                  </>
                ) : (
                  <span>Confirmar e Enviar</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ETAPA 3: LINK ENVIADO COM SUCESSO */}
        {step === 'sent' && (
          <div className="space-y-4 text-center">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-left space-y-2">
              <p className="font-bold text-emerald-600 dark:text-emerald-400">
                Link enviado para: {newEmail}
              </p>
              <p className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                1. Abra a sua caixa de entrada (ou pasta de spam).<br />
                2. Clique no link de confirmação do Firebase.<br />
                3. Após clicar no link, clique no botão abaixo para concluir o acesso.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCheckEmailVerified}
              disabled={isVerifying}
              className={`w-full py-3.5 px-6 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 ${
                isDark
                  ? 'bg-emerald-400 text-slate-950 hover:bg-emerald-300 shadow-emerald-400/10'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20'
              }`}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verificando status...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  <span>Já Confirmei meu E-mail</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('input');
                setSuccessMessage('');
                setErrorMessage('');
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline cursor-pointer"
            >
              Informou o e-mail errado? Corrigir e reenviar
            </button>
          </div>
        )}

        {/* Rodapé: Opção de Sair da Conta */}
        <div className="pt-3 border-t border-slate-800/20 flex justify-center">
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-500 hover:text-rose-600 hover:underline cursor-pointer transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sair da Conta</span>
          </button>
        </div>
      </div>
    </div>
  );
};
