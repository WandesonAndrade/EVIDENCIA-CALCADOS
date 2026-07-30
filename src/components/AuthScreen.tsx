import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, Shield, Briefcase, Mail, Chrome, Sparkles, ChevronRight, ArrowLeft, ShoppingBag, LogOut, ArrowRight } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { AdminLogin } from './AdminLogin';
import { UserProfile } from '../types';

interface AuthScreenProps {
  mode?: 'customer' | 'admin';
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ mode = 'customer' }) => {
  const { 
    currentUser, 
    currentAdminUser, 
    loginUser, 
    registerUser, 
    loginWithGoogle, 
    loginWithGoogleSimulated, 
    logout, 
    setCurrentView, 
    theme 
  } = useApp();

  const isDark = theme === 'dark';

  const activeUser = currentAdminUser || currentUser;
  const isUserCollaborator = (u: UserProfile | null): boolean => {
    if (!u) return false;
    return Boolean(u.role === 'admin' || u.role === 'seller' || u.isAuthorizedCollaborator);
  };

  const [authorizedUser, setAuthorizedUser] = useState<UserProfile | null>(activeUser);
  const [showChoiceScreen, setShowChoiceScreen] = useState<boolean>(isUserCollaborator(activeUser));

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Simulated Google login states
  const [showSimPanel, setShowSimPanel] = useState(false);
  const [simName, setSimName] = useState('Wandeson Andrade');
  const [simEmail, setSimEmail] = useState('WandesonAndrade33@gmail.com');
  const [simSeed, setSimSeed] = useState('Wandeson');

  const processPostAuth = (user: UserProfile | null) => {
    if (isUserCollaborator(user)) {
      setAuthorizedUser(user);
      setShowChoiceScreen(true);
    } else {
      setCurrentView('home');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!email) {
      setErrorMessage('Por favor, informe um e-mail válido.');
      return;
    }

    try {
      setIsLoading(true);
      let loggedUser = await loginUser(email);
      if (!loggedUser && isRegisterMode) {
        if (!name) {
          setErrorMessage('Por favor, preencha o seu nome completo.');
          setIsLoading(false);
          return;
        }
        loggedUser = await registerUser(name, email, 'customer');
      } else if (!loggedUser) {
        loggedUser = await registerUser(email.split('@')[0], email, 'customer');
      }

      processPostAuth(loggedUser);
    } catch (error) {
      console.error(error);
      setErrorMessage('Ocorreu um erro ao processar. Verifique sua conexão.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const user = await loginWithGoogle();
      if (user) {
        processPostAuth(user);
      }
    } catch (error: any) {
      console.error("Google popup error", error);
      setErrorMessage('A janela de login do Google foi bloqueada ou interrompida. Por favor, use o simulador do Google abaixo.');
      setShowSimPanel(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulatedGoogleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simName || !simEmail) {
      setErrorMessage('Preencha os dados de simulação do Google.');
      return;
    }
    setIsLoading(true);
    setErrorMessage('');
    try {
      const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(simSeed)}`;
      const user = await loginWithGoogleSimulated(simName, simEmail, avatarUrl);
      processPostAuth(user);
    } catch (e) {
      console.error(e);
      setErrorMessage('Falha ao simular login do Google.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- SELETOR INTERMEDIÁRIO DE DESTINO PARA COLABORADORES AUTORIZADOS ---
  if (showChoiceScreen && authorizedUser) {
    return (
      <div id="collaborator-choice-page" className="max-w-2xl mx-auto px-4 py-12 sm:py-16 animate-in fade-in duration-300">
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

  // --- ISOLATED INTERFACE FOR ADMIN CREDENTIAL LOGIN ---
  if (mode === 'admin') {
    return <AdminLogin />;
  }


  // --- ISOLATED INTERFACE FOR CUSTOMER LOGIN (100% FIREBASE GOOGLE FOCUSED) ---

  return (
    <div id="customer-auth-page" className="max-w-md mx-auto px-4 py-12 sm:py-16">
      <div className={`rounded-3xl border backdrop-blur-2xl shadow-2xl p-8 sm:p-10 space-y-7 text-center ${
        isDark ? 'bg-slate-900/90 border-slate-800 text-white shadow-black/60' : 'bg-white border-slate-200/90 text-slate-800 shadow-xl'
      }`}>
        
        {/* Header Greeting */}
        <div className="space-y-4">
          <div className="flex justify-center pb-1">
            <BrandLogo size="md" />
          </div>

          <div className="space-y-2">
            <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Acesse sua Conta
            </h2>
            <p className={`text-xs sm:text-sm max-w-xs mx-auto leading-relaxed font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Entre de forma rápida e segura com a sua conta Google para acompanhar seus pedidos e acessar seu Crediário.
            </p>
          </div>
        </div>

        {/* Highlighted Official Google Authentication Button */}
        <div className="space-y-4 pt-1">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold text-center animate-fade-in">
              {errorMessage}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className={`w-full flex items-center justify-center space-x-3.5 py-4 px-6 border-2 rounded-2xl transition-all text-sm font-extrabold shadow-md hover:shadow-xl cursor-pointer disabled:opacity-50 active:scale-[0.98] ${
              isDark
                ? 'bg-slate-950/95 border-slate-700 text-white hover:bg-slate-800 hover:border-amber-400/60 shadow-black/50'
                : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50 hover:border-slate-300 shadow-slate-200'
            }`}
          >
            <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.31 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.99-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z"/>
            </svg>
            <span>{isLoading ? 'Conectando...' : 'Entrar com o Google'}</span>
          </button>
        </div>

        {/* Security & Support Info Footer */}
        <div className="pt-4 border-t border-slate-800/40 space-y-2 text-center text-xs">
          <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>
            Ao se conectar, você concorda com nossos Termos de Uso e Política de Privacidade.
          </p>
          <div className="pt-1">
            <button
              onClick={() => setCurrentView('support')}
              className={`font-extrabold hover:underline cursor-pointer transition-colors ${
                isDark ? 'text-amber-400 hover:text-amber-300' : 'text-slate-900 hover:text-slate-700'
              }`}
            >
              Precisa de ajuda com seu acesso? Fale com o Suporte
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
