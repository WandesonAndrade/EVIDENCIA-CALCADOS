import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, Shield, Briefcase, Mail, Chrome, Sparkles, ChevronRight, ArrowLeft } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { AdminLogin } from './AdminLogin';

interface AuthScreenProps {
  mode?: 'customer' | 'admin';
}


export const AuthScreen: React.FC<AuthScreenProps> = ({ mode = 'customer' }) => {
  const { loginUser, registerUser, loginWithGoogle, loginWithGoogleSimulated, setCurrentView, theme } = useApp();
  const isDark = theme === 'dark';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!email) {
      setErrorMessage('Por favor, informe um e-mail válido.');
      return;
    }

    try {
      setIsLoading(true);
      if (mode === 'customer') {
        if (isRegisterMode) {
          if (!name) {
            setErrorMessage('Por favor, preencha o seu nome completo.');
            setIsLoading(false);
            return;
          }
          await registerUser(name, email, 'customer');
        } else {
          const loggedUser = await loginUser(email);
          if (!loggedUser) {
            // Auto register to keep UX super simple
            await registerUser(email.split('@')[0], email, 'customer');
          }
        }
        setCurrentView('home');
      } else {
        // Admin / Seller Login
        const loggedUser = await loginUser(email);
        if (loggedUser && (loggedUser.role === 'admin' || loggedUser.role === 'seller')) {
          setCurrentView('admin');
        } else if (email === 'admin@evidencia.com' || email === 'vendedor@evidencia.com') {
          await registerUser(
            email === 'admin@evidencia.com' ? 'Admin Evidência' : 'Carlos Vendedor',
            email,
            email === 'admin@evidencia.com' ? 'admin' : 'seller'
          );
          setCurrentView('admin');
        } else {
          setErrorMessage('Credenciais incorretas ou este perfil não possui privilégios administrativos.');
        }
      }
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
        setCurrentView('home');
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
      await loginWithGoogleSimulated(simName, simEmail, avatarUrl);
      setCurrentView('home');
    } catch (e) {
      console.error(e);
      setErrorMessage('Falha ao simular login do Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (testRole: 'admin' | 'seller') => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const testName = testRole === 'admin' ? 'Admin Evidência' : 'Carlos Vendedor';
      const testEmail = testRole === 'admin' ? 'admin@evidencia.com' : 'vendedor@evidencia.com';
      await registerUser(testName, testEmail, testRole);
      setCurrentView('admin');
    } catch (e) {
      console.error("Quick login failed:", e);
      setErrorMessage('Erro ao realizar login rápido administrativo.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- ISOLATED INTERFACE FOR ADMIN LOGIN ---
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
