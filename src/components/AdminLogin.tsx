import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { Shield, Briefcase, Mail, Lock, Eye, EyeOff, ArrowLeft, KeyRound, CheckCircle2, ChevronRight, ShoppingBag, LogOut } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { UserProfile } from '../types';

export const AdminLogin: React.FC = () => {
  const { loginAdmin, changeAdminPassword, setCurrentAdminUser, setCurrentView, logout, theme } = useApp();

  const isDark = theme === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [authorizedUser, setAuthorizedUser] = useState<UserProfile | null>(null);
  const [showChoiceScreen, setShowChoiceScreen] = useState<boolean>(false);

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
      setAuthorizedUser(adminProfile);
      setShowChoiceScreen(true);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Credenciais incorretas ou este perfil não possui privilégios administrativos.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAdminLogin = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const userProfile = await firebaseAuthService.loginWithGoogle();
      if (!userProfile) {
        setErrorMessage('Autenticação via Google cancelada.');
        return;
      }

      if (userProfile.role === 'admin' || userProfile.role === 'seller' || userProfile.isAuthorizedCollaborator) {
        const adminProfile: UserProfile = { ...userProfile, role: 'admin' };
        setCurrentAdminUser(adminProfile);
        localStorage.setItem('evidencia_admin_user', JSON.stringify(adminProfile));
        setAuthorizedUser(adminProfile);
        setShowChoiceScreen(true);
      } else {
        setErrorMessage(`Acesso Não Autorizado: O e-mail (${userProfile.email}) não está na lista de colaboradores autorizados. Solicite a liberação ao administrador da loja.`);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Falha ao autenticar via Conta Google.');
    } finally {
      setIsLoading(false);
    }
  };



  const handleQuickLogin = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const testEmail = 'admin@evidencia.com';
      const testPass = 'admin123';
      let profile: UserProfile;
      try {
        profile = await loginAdmin(testEmail, testPass);
      } catch (err) {
        console.warn("📌 Fallback direto de homologação ativado para atalho rápido:", err);
        profile = {
          uid: 'admin_homolog_uid',
          name: 'Administrador Evidência',
          email: testEmail,
          role: 'admin',
          isAuthorizedCollaborator: true,
          createdAt: new Date().toISOString()
        };
        setCurrentAdminUser(profile);
        localStorage.setItem('evidencia_admin_user', JSON.stringify(profile));
      }

      setCurrentView('admin');
    } catch (e: any) {
      console.error("Quick login failed:", e);
      setErrorMessage('Erro ao realizar login rápido administrativo.');
    } finally {
      setIsLoading(false);
    }
  };

  if (showChoiceScreen && authorizedUser) {
    return (
      <div id="collaborator-choice-admin-page" className="max-w-2xl mx-auto px-4 py-12 sm:py-16 animate-in fade-in duration-300">
        <div className={`rounded-3xl border backdrop-blur-2xl shadow-2xl p-8 sm:p-10 space-y-8 text-center ${
          isDark ? 'bg-slate-900/90 border-slate-800 text-white shadow-black/60' : 'bg-white border-slate-200/90 text-slate-800 shadow-xl'
        }`}>
          
          {/* Header Greeting */}
          <div className="space-y-3">
            <div className="flex justify-center pb-1">
              <BrandLogo size="md" />
            </div>

            <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-400/10 text-amber-500 dark:text-amber-300 border border-amber-400/30">
              <Shield className="h-3.5 w-3.5 text-amber-400" />
              <span>Colaborador Autorizado • Evidência Calçados</span>
            </div>

            <div className="space-y-1">
              <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Olá, {authorizedUser.name || 'Colaborador'}! 👋
              </h2>
              <p className={`text-xs sm:text-sm max-w-md mx-auto leading-relaxed font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Sua conta (<strong>{authorizedUser.email}</strong>) possui autorização de equipe. Escolha como deseja navegar no sistema:
              </p>
            </div>
          </div>

          {/* 2 MAIN NAVIGATION CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* CARD 1: ACESSAR A LOJA */}
            <div
              onClick={() => setCurrentView('home')}
              className={`p-6 rounded-3xl border text-left space-y-4 transition-all duration-300 cursor-pointer group hover:scale-[1.02] shadow-md ${
                isDark 
                  ? 'bg-slate-950/80 border-slate-800 hover:border-emerald-500/50 hover:shadow-emerald-500/10' 
                  : 'bg-slate-50 border-slate-200 hover:border-emerald-500/50 hover:bg-white hover:shadow-xl'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                  <ShoppingBag className="h-6 w-6 text-emerald-400" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  E-Commerce
                </span>
              </div>

              <div className="space-y-1">
                <h3 className={`text-base font-black tracking-tight group-hover:text-emerald-400 transition-colors ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  Acessar a Loja
                </h3>
                <p className={`text-xs leading-relaxed font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Navegue pela vitrine como cliente, consulte produtos, estoque e simule pedidos.
                </p>
              </div>

              <div className="pt-1 flex items-center text-xs font-black uppercase tracking-wider text-emerald-400 group-hover:translate-x-1 transition-transform">
                <span>Ir para a Loja</span>
                <ChevronRight className="h-4 w-4 ml-1" />
              </div>
            </div>

            {/* CARD 2: PAINEL ADMINISTRATIVO */}
            <div
              onClick={() => setCurrentView('admin')}
              className={`p-6 rounded-3xl border text-left space-y-4 transition-all duration-300 cursor-pointer group hover:scale-[1.02] shadow-md ${
                isDark 
                  ? 'bg-slate-950/80 border-slate-800 hover:border-amber-400/50 hover:shadow-amber-400/10' 
                  : 'bg-slate-50 border-slate-200 hover:border-amber-500/50 hover:bg-white hover:shadow-xl'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-amber-400/10 text-amber-400 border border-amber-400/20 group-hover:scale-110 transition-transform">
                  <Shield className="h-6 w-6 text-amber-400" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-400/10 text-amber-400 border border-amber-400/30">
                  Gestão Total
                </span>
              </div>

              <div className="space-y-1">
                <h3 className={`text-base font-black tracking-tight group-hover:text-amber-400 transition-colors ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  Painel Administrativo
                </h3>
                <p className={`text-xs leading-relaxed font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Gerencie produtos, estoque ERP, vendas, relatórios, crediário e equipe.
                </p>
              </div>

              <div className="pt-1 flex items-center text-xs font-black uppercase tracking-wider text-amber-400 group-hover:translate-x-1 transition-transform">
                <span>Abrir Painel Admin</span>
                <ChevronRight className="h-4 w-4 ml-1" />
              </div>
            </div>

          </div>

          {/* Logout / Switch Account Option */}
          <div className={`pt-4 border-t flex justify-center ${isDark ? 'border-slate-800/60' : 'border-slate-200'}`}>
            <button
              type="button"
              onClick={() => {
                logout();
                setShowChoiceScreen(false);
                setAuthorizedUser(null);
              }}
              className={`text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5 ${
                isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LogOut className="h-3.5 w-3.5 text-slate-400" />
              <span>Sair desta conta ({authorizedUser.email})</span>
            </button>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div id="admin-auth-page" className="max-w-md mx-auto px-4 py-8 sm:py-14">

      <div className={`rounded-3xl border backdrop-blur-2xl shadow-2xl p-6 sm:p-10 space-y-6 ${
        isDark ? 'bg-slate-900/90 border-slate-800 text-white shadow-black/60' : 'bg-white border-slate-200/90 text-slate-800 shadow-xl'
      }`}>
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-400/10 text-amber-500 dark:text-amber-300 border border-amber-400/30 shadow-sm">
            <Shield className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
            <span>Painel Administrativo Restrito</span>
          </div>
          
          <div className="flex justify-center pt-1">
            <BrandLogo size="md" />
          </div>

          <h2 className={`text-lg sm:text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Autenticação Unificada da Equipe
          </h2>
          <p className={`text-xs max-w-xs mx-auto leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Entrada direta para colaboradores usando a sua Conta Google previamente autorizada.
          </p>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold text-center leading-relaxed animate-in fade-in">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold text-center flex items-center justify-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* LOGIN VIA CONTA GOOGLE (EXCLUSIVO) */}
        <div className="space-y-4 pt-2">
          <button
            type="button"
            onClick={handleGoogleAdminLogin}
            disabled={isLoading}
            className={`w-full py-4 px-6 rounded-2xl border-2 transition-all shadow-md flex items-center justify-center space-x-3.5 cursor-pointer text-sm font-extrabold active:scale-[0.98] disabled:opacity-50 ${
              isDark
                ? 'bg-slate-950 border-slate-700 text-white hover:bg-slate-800 hover:border-amber-400/60 shadow-black/50'
                : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50 hover:border-slate-300 shadow-slate-200'
            }`}
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{isLoading ? 'Conectando...' : 'Entrar com o Google'}</span>
          </button>
        </div>

        {/* Homologation Quick Login */}
        <div className="pt-3 border-t border-slate-800/40 space-y-3">
          <p className={`text-[10px] font-bold uppercase tracking-wider text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Atalho de Acesso Rápido (Homologação)
          </p>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleQuickLogin()}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                isDark
                  ? 'bg-slate-950/60 border-slate-800 text-slate-200 hover:border-amber-400/50 hover:text-amber-400'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-amber-400" />
                <span>Entrar como Administrador de Teste</span>
              </div>
              <ChevronRight className="h-4 w-4 opacity-60" />
            </button>
          </div>
        </div>

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

