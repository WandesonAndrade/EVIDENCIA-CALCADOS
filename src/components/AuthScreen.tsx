import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, Shield, Briefcase, Mail, Chrome, Sparkles, ChevronRight, ArrowLeft } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

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
    return (
      <div id="admin-auth-page" className="max-w-md mx-auto px-4 py-8 sm:py-14">
        <div className={`rounded-3xl border backdrop-blur-2xl shadow-2xl p-6 sm:p-10 space-y-6 ${
          isDark ? 'bg-slate-900/90 border-slate-800 text-white shadow-black/60' : 'bg-white border-slate-200/90 text-slate-800 shadow-xl'
        }`}>
          
          {/* Restricted Admin Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-800 text-amber-400 border border-slate-700 shadow-sm">
              <Shield className="h-3.5 w-3.5 text-amber-400" />
              <span>Ambiente Administrativo Restrito</span>
            </div>
            
            <div className="flex justify-center pt-1">
              <BrandLogo size="md" />
            </div>

            <h2 className={`text-lg sm:text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Painel de Controle
            </h2>
            <p className={`text-xs max-w-xs mx-auto leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Autenticação exclusiva para a equipe de gestão, administradores e gerentes de vendas.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
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

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold text-center">
                {errorMessage}
              </div>
            )}

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

          {/* Homologation Quick Login */}
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
  }

  // --- ISOLATED INTERFACE FOR CUSTOMER LOGIN ---
  return (
    <div id="customer-auth-page" className="max-w-md mx-auto px-4 py-8 sm:py-12">
      <div className={`rounded-3xl border backdrop-blur-2xl shadow-2xl p-6 sm:p-10 space-y-6 ${
        isDark ? 'bg-slate-900/90 border-slate-800 text-white shadow-black/50' : 'bg-white border-slate-200/80 text-slate-800 shadow-xl'
      }`}>
        
        {/* Header Greeting */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <BrandLogo size="md" />
          </div>

          <h2 className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {isRegisterMode ? 'Criar Cadastro Grátis' : 'Acesse sua Conta'}
          </h2>
          <p className={`text-xs max-w-xs mx-auto leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Conecte-se para acompanhar pedidos, salvar favoritos e agilizar suas compras na Evidência Calçados.
          </p>
        </div>

        <div className="space-y-4">
          {/* Google Authentication Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className={`w-full flex items-center justify-center space-x-2.5 py-3 border rounded-xl transition-all text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50 ${
              isDark
                ? 'bg-slate-950/80 border-slate-800 text-slate-200 hover:bg-slate-800 hover:border-slate-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Chrome className="h-4 w-4 text-red-500" />
            <span>Entrar com o Google</span>
          </button>

          {/* Simulated Google Button / Option */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowSimPanel(!showSimPanel)}
              className={`text-[10px] underline font-semibold transition-all ${
                isDark ? 'text-slate-400 hover:text-amber-400' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {showSimPanel ? 'Ocultar Simulador Google' : 'Usar Simulador Google (Sem popups)'}
            </button>
          </div>

          {/* Google Simulator Drawer / Accordion */}
          {showSimPanel && (
            <div className={`rounded-2xl p-4 border space-y-3 ${
              isDark ? 'bg-indigo-950/40 border-indigo-900/50' : 'bg-indigo-50/70 border-indigo-100'
            }`}>
              <div className="flex items-center space-x-1.5 text-indigo-400 font-bold text-xs">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Simulador de Conta Google</span>
              </div>
              <p className="text-[10px] text-indigo-300 leading-normal">
                Ideal para navegadores que bloqueiam popups ou no preview integrado.
              </p>

              <form onSubmit={handleSimulatedGoogleSignIn} className="space-y-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider block">Nome do Usuário Google</label>
                  <input
                    type="text"
                    required
                    value={simName}
                    onChange={(e) => setSimName(e.target.value)}
                    placeholder="Nome de teste"
                    className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-indigo-900/60 rounded-lg text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider block">E-mail do Usuário Google</label>
                  <input
                    type="email"
                    required
                    value={simEmail}
                    onChange={(e) => setSimEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-indigo-900/60 rounded-lg text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition-all shadow-sm"
                >
                  Simular e Entrar Agora
                </button>
              </form>
            </div>
          )}

          {/* Divider */}
          <div className="relative py-2 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className={`w-full border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`} />
            </div>
            <span className={`relative px-3 text-[10px] font-bold uppercase tracking-wider ${
              isDark ? 'bg-[#0B0F19] text-slate-400' : 'bg-white text-slate-400'
            }`}>
              ou e-mail tradicional
            </span>
          </div>

          {/* Traditional Email Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {isRegisterMode && (
              <div className="space-y-1">
                <label className={`text-[10px] font-black uppercase tracking-wider block ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Seu Nome Completo
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Digite seu nome completo"
                    className={`w-full pl-10 pr-4 py-2.5 text-xs border rounded-xl focus:outline-none transition-all ${
                      isDark 
                        ? 'bg-slate-950/80 border-slate-800 text-white focus:border-amber-400' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-800'
                    }`}
                  />
                  <User className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className={`text-[10px] font-black uppercase tracking-wider block ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Endereço de E-mail
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className={`w-full pl-10 pr-4 py-2.5 text-xs border rounded-xl focus:outline-none transition-all ${
                    isDark 
                      ? 'bg-slate-950/80 border-slate-800 text-white focus:border-amber-400' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-800'
                  }`}
                />
                <Mail className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold text-center">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 ${
                isDark
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {isLoading ? 'Acessando...' : isRegisterMode ? 'Fazer Cadastro Grátis' : 'Entrar com E-mail'}
            </button>
          </form>

          {/* Switch Mode Link (ONLY FOR CUSTOMER) */}
          <div className="text-center text-xs pt-1">
            {isRegisterMode ? (
              <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                Já possui conta?{' '}
                <button 
                  onClick={() => { setIsRegisterMode(false); setErrorMessage(''); }}
                  className={`font-bold hover:underline cursor-pointer ${isDark ? 'text-amber-400' : 'text-slate-900'}`}
                >
                  Fazer Login
                </button>
              </p>
            ) : (
              <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                Ainda não é cadastrado?{' '}
                <button 
                  onClick={() => { setIsRegisterMode(true); setErrorMessage(''); }}
                  className={`font-bold hover:underline cursor-pointer ${isDark ? 'text-amber-400' : 'text-slate-900'}`}
                >
                  Criar cadastro grátis
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
