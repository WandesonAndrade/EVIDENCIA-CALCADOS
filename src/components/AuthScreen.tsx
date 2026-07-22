import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, Shield, Briefcase, Mail, Key, UserCheck, Chrome, Sparkles, Check, ChevronRight } from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const { loginUser, registerUser, loginWithGoogle, loginWithGoogleSimulated, setCurrentView } = useApp();

  const [activeTab, setActiveTab] = useState<'customer' | 'admin'>('customer');
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
      if (activeTab === 'customer') {
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
          // Fallback pre-filled login if successful
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

  return (
    <div id="auth-page" className="max-w-md mx-auto px-4 py-8 sm:py-12">
      <div className="bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden p-6 sm:p-8 space-y-6">
        
        {/* Header Greeting */}
        <div className="text-center space-y-2">
          <span className="text-xl font-black tracking-tight text-primary block uppercase">
            Evidência <span className="text-secondary font-light">Calçados</span>
          </span>
          <h2 className="text-base sm:text-lg font-bold text-slate-800">
            {activeTab === 'customer' 
              ? (isRegisterMode ? 'Cadastre-se na Loja' : 'Acesse sua Conta') 
              : 'Painel Administrativo'}
          </h2>
          <p className="text-xs text-slate-400 font-light max-w-xs mx-auto leading-relaxed">
            {activeTab === 'customer'
              ? 'Conecte-se para acompanhar pedidos, salvar favoritos e agilizar sua compra.'
              : 'Espaço restrito para administradores, gerentes e equipe de vendas.'}
          </p>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => {
              setActiveTab('customer');
              setIsRegisterMode(false);
              setErrorMessage('');
            }}
            className={`py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center space-x-1 ${
              activeTab === 'customer'
                ? 'bg-white text-primary shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Área do Cliente</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab('admin');
              setErrorMessage('');
            }}
            className={`py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center space-x-1 ${
              activeTab === 'admin'
                ? 'bg-white text-primary shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Painel Admin</span>
          </button>
        </div>

        {/* tab content: CUSTOMER */}
        {activeTab === 'customer' && (
          <div className="space-y-4">
            {/* Google Authentication Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2.5 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-700 font-semibold text-xs active:scale-[0.99] disabled:opacity-50"
            >
              <Chrome className="h-4 w-4 text-red-500" />
              <span>Entrar com o Google</span>
            </button>

            {/* Simulated Google Button / Option */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowSimPanel(!showSimPanel)}
                className="text-[10px] text-slate-400 hover:text-primary underline font-medium transition-all"
              >
                {showSimPanel ? 'Ocultar Simulador Google' : 'Usar Simulador Google (Sem popups)'}
              </button>
            </div>

            {/* Google Simulator Drawer / Accordion */}
            {showSimPanel && (
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50/50 rounded-xl p-4 border border-indigo-100/60 space-y-3">
                <div className="flex items-center space-x-1.5 text-indigo-700 font-bold text-xs">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Simulador de Conta Google</span>
                </div>
                <p className="text-[10px] text-indigo-500 leading-normal">
                  Ideal para navegadores que bloqueiam popups ou no preview integrado. Escolha seus dados abaixo e faça login instantâneo.
                </p>

                <form onSubmit={handleSimulatedGoogleSignIn} className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Nome do Usuário Google</label>
                    <input
                      type="text"
                      required
                      value={simName}
                      onChange={(e) => setSimName(e.target.value)}
                      placeholder="Nome de teste"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:border-indigo-500 text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">E-mail do Usuário Google</label>
                    <input
                      type="email"
                      required
                      value={simEmail}
                      onChange={(e) => setSimEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:border-indigo-500 text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block font-sans">Avatar Google (Semente do Desenho)</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        required
                        value={simSeed}
                        onChange={(e) => setSimSeed(e.target.value)}
                        placeholder="Ex: Wandeson"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:border-indigo-500 text-slate-800"
                      />
                      <img
                        src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(simSeed)}`}
                        alt="Preview"
                        className="w-7 h-7 rounded-full bg-indigo-100 p-0.5 object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-md transition-all shadow-sm"
                  >
                    Simular e Entrar Agora
                  </button>
                </form>
              </div>
            )}

            {/* Divider */}
            <div className="relative py-2 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
              <span className="relative bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">ou e-mail tradicional</span>
            </div>

            {/* Traditional Email Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {isRegisterMode && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Seu Nome Completo</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Digite seu nome"
                      className="w-full pl-9 pr-4 py-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800"
                    />
                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Endereço de E-mail</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="w-full pl-9 pr-4 py-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800"
                  />
                  <Mail className="absolute left-3 top-3.5 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>

              {errorMessage && (
                <p className="text-[11px] text-highlight-red font-medium text-center bg-red-50 py-2 rounded-lg border border-red-100">
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-primary text-white text-xs font-bold rounded-lg hover:bg-secondary transition-all shadow-md disabled:opacity-50"
              >
                {isLoading ? 'Acessando...' : isRegisterMode ? 'Fazer Cadastro Grátis' : 'Entrar com E-mail'}
              </button>
            </form>

            {/* Switch Mode Link */}
            <div className="text-center text-xs text-slate-500 pt-1">
              {isRegisterMode ? (
                <p>
                  Já possui conta?{' '}
                  <button 
                    onClick={() => { setIsRegisterMode(false); setErrorMessage(''); }}
                    className="text-primary font-bold hover:underline"
                  >
                    Fazer Login
                  </button>
                </p>
              ) : (
                <p>
                  Ainda não é cadastrado?{' '}
                  <button 
                    onClick={() => { setIsRegisterMode(true); setErrorMessage(''); }}
                    className="text-primary font-bold hover:underline"
                  >
                    Criar cadastro grátis
                  </button>
                </p>
              )}
            </div>
          </div>
        )}

        {/* tab content: ADMIN */}
        {activeTab === 'admin' && (
          <div className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">E-mail Administrativo</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@evidencia.com"
                    className="w-full pl-9 pr-4 py-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800"
                  />
                  <Mail className="absolute left-3 top-3.5 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>

              {errorMessage && (
                <p className="text-[11px] text-highlight-red font-medium text-center bg-red-50 py-2 rounded-lg border border-red-100">
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-all shadow-md disabled:opacity-50"
              >
                {isLoading ? 'Carregando Painel...' : 'Acessar Painel de Controle'}
              </button>
            </form>

            {/* Divider */}
            <div className="relative py-2 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
              <span className="relative bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">acesso rápido para homologação</span>
            </div>

            {/* Fast Admin Logins */}
            <div className="grid grid-cols-1 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                className="flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-all text-left"
              >
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>Entrar como Administrador</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
              
              <button
                type="button"
                onClick={() => handleQuickLogin('seller')}
                className="flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-all text-left"
              >
                <div className="flex items-center space-x-2">
                  <Briefcase className="h-4 w-4 text-secondary" />
                  <span>Entrar como Vendedor</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
