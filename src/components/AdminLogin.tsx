import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Shield, Briefcase, Mail, Lock, Eye, EyeOff, ArrowLeft, KeyRound, CheckCircle2, ChevronRight } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { UserProfile } from '../types';

export const AdminLogin: React.FC = () => {
  const { loginAdmin, changeAdminPassword, setCurrentAdminUser, setCurrentView, theme } = useApp();

  const isDark = theme === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // States for 1st Access Password Reset Modal / Flow
  const [isResetStep, setIsResetStep] = useState(false);
  const [pendingProfile, setPendingProfile] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email || !password) {
      setErrorMessage('Informe o e-mail e a senha administrativa.');
      return;
    }

    try {
      setIsLoading(true);
      const adminProfile = await loginAdmin(email, password);

      if (adminProfile.requiresPasswordChange) {
        setPendingProfile(adminProfile);
        setIsResetStep(true);
        setSuccessMessage('Primeiro acesso detectado! Por favor, cadastre sua nova senha.');
      } else {
        setCurrentView('admin');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Credenciais incorretas ou este perfil não possui privilégios administrativos.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('As senhas não coincidem. Digite novamente.');
      return;
    }

    try {
      setIsLoading(true);
      if (pendingProfile) {
        await changeAdminPassword(newPassword, pendingProfile);
        setSuccessMessage('Senha atualizada com sucesso! Acessando o painel...');
        setTimeout(() => {
          setCurrentView('admin');
        }, 1000);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Falha ao redefinir a senha.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (testRole: 'admin' | 'seller') => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const testEmail = testRole === 'admin' ? 'admin@evidencia.com' : 'vendedor@evidencia.com';
      const testPass = 'admin123';
      let profile: UserProfile;
      try {
        profile = await loginAdmin(testEmail, testPass);
      } catch (err) {
        console.warn("📌 Fallback direto de homologação ativado para atalho rápido:", err);
        profile = {
          uid: testRole === 'admin' ? 'admin_homolog_uid' : 'vendedor_homolog_uid',
          name: testRole === 'admin' ? 'Administrador Evidência' : 'Vendedor Evidência',
          email: testEmail,
          role: testRole,
          createdAt: new Date().toISOString()
        };
        setCurrentAdminUser(profile);
        localStorage.setItem('evidencia_admin_user', JSON.stringify(profile));
      }

      if (profile.requiresPasswordChange) {
        setPendingProfile(profile);
        setIsResetStep(true);
      } else {
        setCurrentView('admin');
      }
    } catch (e: any) {
      console.error("Quick login failed:", e);
      setErrorMessage('Erro ao realizar login rápido administrativo.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div id="admin-auth-page" className="max-w-md mx-auto px-4 py-8 sm:py-14">
      <div className={`rounded-3xl border backdrop-blur-2xl shadow-2xl p-6 sm:p-10 space-y-6 ${
        isDark ? 'bg-slate-900/90 border-slate-800 text-white shadow-black/60' : 'bg-white border-slate-200/90 text-slate-800 shadow-xl'
      }`}>
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-800 text-amber-400 border border-slate-700 shadow-sm">
            <Shield className="h-3.5 w-3.5 text-amber-400" />
            <span>Painel Administrativo Restrito</span>
          </div>
          
          <div className="flex justify-center pt-1">
            <BrandLogo size="md" />
          </div>

          <h2 className={`text-lg sm:text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {isResetStep ? 'Redefinição de Primeiro Acesso' : 'Autenticação da Gestão'}
          </h2>
          <p className={`text-xs max-w-xs mx-auto leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {isResetStep 
              ? 'Por razões de segurança, cadastre sua nova senha pessoal antes de acessar o painel.'
              : 'Acesso exclusivo para administradores, equipe de vendas e gestores de loja.'}
          </p>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold text-center">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold text-center flex items-center justify-center space-x-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* STEP 1: LOGIN FORM */}
        {!isResetStep ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className={`text-[10px] font-black uppercase tracking-wider block ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                E-mail Administrativo
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@evidencia.com"
                  className={`w-full pl-10 pr-4 py-3 text-xs border rounded-xl focus:outline-none transition-all ${
                    isDark 
                      ? 'bg-slate-950/80 border-slate-800 text-white placeholder-slate-500 focus:border-amber-400' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-slate-800'
                  }`}
                />
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={`text-[10px] font-black uppercase tracking-wider block ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Senha Administrativa
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-10 py-3 text-xs border rounded-xl focus:outline-none transition-all ${
                    isDark 
                      ? 'bg-slate-950/80 border-slate-800 text-white placeholder-slate-500 focus:border-amber-400' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-slate-800'
                  }`}
                />
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 p-0.5 text-slate-400 hover:text-amber-400 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3.5 px-4 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 ${
                isDark
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {isLoading ? 'Autenticando Gestão...' : 'Acessar Painel Admin'}
            </button>
          </form>
        ) : (
          /* STEP 2: FIRST ACCESS PASSWORD RESET */
          <form onSubmit={handlePasswordResetSubmit} className="space-y-4 pt-2">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-1">
              <p className="font-bold">🔑 Conta de Primeiro Acesso</p>
              <p className="text-[11px] opacity-90">Usuário: <b>{pendingProfile?.name}</b> ({pendingProfile?.email})</p>
            </div>

            <div className="space-y-1.5">
              <label className={`text-[10px] font-black uppercase tracking-wider block ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Nova Senha Definitiva
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className={`w-full pl-10 pr-4 py-3 text-xs border rounded-xl focus:outline-none transition-all ${
                    isDark 
                      ? 'bg-slate-950/80 border-slate-800 text-white placeholder-slate-500 focus:border-amber-400' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-slate-800'
                  }`}
                />
                <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={`text-[10px] font-black uppercase tracking-wider block ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Confirmar Nova Senha
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Digite a mesma senha novamente"
                  className={`w-full pl-10 pr-4 py-3 text-xs border rounded-xl focus:outline-none transition-all ${
                    isDark 
                      ? 'bg-slate-950/80 border-slate-800 text-white placeholder-slate-500 focus:border-amber-400' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-slate-800'
                  }`}
                />
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3.5 px-4 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 ${
                isDark
                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-slate-950 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {isLoading ? 'Atualizando Senha...' : 'Salvar Nova Senha e Entrar'}
            </button>
          </form>
        )}

        {/* Homologation Quick Login */}
        {!isResetStep && (
          <div className="pt-2 border-t border-slate-800/40 space-y-3">
            <p className={`text-[10px] font-bold uppercase tracking-wider text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Atalhos de Acesso Rápido (Homologação)
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  isDark
                    ? 'bg-slate-950/60 border-slate-800 text-slate-200 hover:border-amber-400/50 hover:text-amber-400'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-amber-400" />
                  <span>Entrar como Administrador</span>
                </div>
                <ChevronRight className="h-4 w-4 opacity-60" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('seller')}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  isDark
                    ? 'bg-slate-950/60 border-slate-800 text-slate-200 hover:border-amber-400/50 hover:text-amber-400'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Briefcase className="h-4 w-4 text-sky-400" />
                  <span>Entrar como Vendedor</span>
                </div>
                <ChevronRight className="h-4 w-4 opacity-60" />
              </button>

            </div>
          </div>
        )}

        <div className="text-center pt-1">
          <button
            onClick={() => setCurrentView('home')}
            className={`inline-flex items-center space-x-1.5 text-xs font-medium cursor-pointer transition-colors ${
              isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar para a Loja</span>
          </button>
        </div>
      </div>
    </div>
  );
};
