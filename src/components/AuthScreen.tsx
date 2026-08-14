import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, Shield, Lock, Phone, UserCheck, Eye, EyeOff, ChevronRight, ShoppingBag, LogOut } from 'lucide-react';
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
    loginWithCpf, 
    registerWithCpf, 
    loginWithGoogle, 
    checkCpfStatus,
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

  // --- CPF + SENHA STATES ---
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [name, setName] = useState('');
  const [telefone, setTelefone] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // States de verificação automática do CPF no ERP MobLink
  const [isCheckingCpf, setIsCheckingCpf] = useState(false);
  const [erpCustomerFound, setErpCustomerFound] = useState<UserProfile | null>(null);
  const [isDefinePasswordOnly, setIsDefinePasswordOnly] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Formatação em tempo real do CPF (000.000.000-00)
  const formatCPF = (val: string): string => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  // Formatação em tempo real do Telefone (00) 00000-0000
  const formatPhone = (val: string): string => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  // Verificação em tempo real do CPF no ERP MobLink e Firebase Auth
  const handleCpfInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setCpf(formatted);
    const cleanDigits = formatted.replace(/\D/g, '');

    if (cleanDigits.length === 11) {
      verifyCpfOnErp(cleanDigits);
    } else {
      setErpCustomerFound(null);
      setIsDefinePasswordOnly(false);
    }
  };

  const verifyCpfOnErp = async (cleanCpf: string) => {
    setIsCheckingCpf(true);
    setErrorMessage('');
    try {
      const status = await checkCpfStatus(cleanCpf);
      if (status.hasFirebaseAccount) {
        // Já possui conta com senha definida no Firebase
        setIsDefinePasswordOnly(false);
        setErpCustomerFound(null);
        setAuthTab('login');
      } else if (status.existsInErp && status.erpClientData) {
        // Cliente existe no ERP MobLink mas AINDA NÃO tem senha definida!
        setErpCustomerFound(status.erpClientData);
        setIsDefinePasswordOnly(true);
        setAuthTab('register');
        setName(status.erpClientData.name || '');
        if (status.erpClientData.telefone) {
          setTelefone(formatPhone(status.erpClientData.telefone));
        }
      } else {
        // Cliente novo em ambos os sistemas
        setIsDefinePasswordOnly(false);
        setErpCustomerFound(null);
      }
    } catch (err) {
      console.warn('📌 Erro ao verificar CPF:', err);
    } finally {
      setIsCheckingCpf(false);
    }
  };

  const processPostAuth = (user: UserProfile | null) => {
    if (isUserCollaborator(user)) {
      setAuthorizedUser(user);
      setShowChoiceScreen(true);
    } else {
      setCurrentView('home');
    }
  };

  const handleCpfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      setErrorMessage('Por favor, digite um CPF válido contendo 11 dígitos.');
      return;
    }

    if (!senha || senha.length < 6) {
      setErrorMessage('Sua senha deve conter no mínimo 6 caracteres.');
      return;
    }

    try {
      setIsLoading(true);
      let loggedUser: UserProfile;

      if (authTab === 'register' || isDefinePasswordOnly) {
        if (!name || name.trim().length < 2) {
          setErrorMessage('Por favor, informe seu nome completo para criar a conta.');
          setIsLoading(false);
          return;
        }
        if (senha !== confirmarSenha) {
          setErrorMessage('As senhas digitadas não coincidem. Por favor, verifique e digite novamente.');
          setIsLoading(false);
          return;
        }
        loggedUser = await registerWithCpf(cpfLimpo, senha, name, telefone, erpCustomerFound || undefined);
      } else {
        loggedUser = await loginWithCpf(cpfLimpo, senha);
      }

      processPostAuth(loggedUser);
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || 'Erro ao realizar login. Verifique se o CPF e senha estão corretos.');
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
      setErrorMessage('A janela de login do Google foi fechada ou cancelada.');
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
                Sua conta possui autorização de equipe. Escolha como deseja navegar no sistema:
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
              <span>Sair desta conta ({authorizedUser.name || 'Usuário'})</span>
            </button>
          </div>

        </div>
      </div>
    );
  }

  // --- INTERFACE DE LOGIN ADMINISTRATIVO ---
  if (mode === 'admin') {
    return <AdminLogin />;
  }

  // --- INTERFACE DE LOGIN DO CLIENTE (CPF E SENHA + OPÇÃO GOOGLE) ---
  return (
    <div id="customer-auth-page" className="max-w-md mx-auto px-4 py-8 sm:py-12">
      <div className={`rounded-3xl border backdrop-blur-2xl shadow-2xl p-6 sm:p-8 space-y-6 ${
        isDark ? 'bg-slate-900/90 border-slate-800 text-white shadow-black/60' : 'bg-white border-slate-200/90 text-slate-800 shadow-xl'
      }`}>
        
        {/* Header Greeting */}
        <div className="space-y-3 text-center">
          <div className="flex justify-center pb-1">
            <BrandLogo size="md" />
          </div>

          <div className="space-y-1">
            <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {authTab === 'login' ? 'Acesse sua Conta' : 'Criar Nova Conta'}
            </h2>
            <p className={`text-xs sm:text-sm max-w-xs mx-auto leading-relaxed font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {authTab === 'login' 
                ? 'Digite seu CPF e senha para acompanhar seus pedidos e acessar seu Crediário.'
                : 'Preencha seus dados com CPF e crie uma senha para acessar a loja.'}
            </p>
          </div>
        </div>

        {/* Abas de Troca (Entrar x Cadastrar) */}
        <div className={`grid grid-cols-2 p-1 rounded-2xl border ${
          isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            type="button"
            onClick={() => {
              setAuthTab('login');
              setErrorMessage('');
            }}
            className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
              authTab === 'login'
                ? isDark 
                  ? 'bg-amber-400 text-slate-950 shadow-md' 
                  : 'bg-white text-slate-900 shadow-sm'
                : isDark 
                  ? 'text-slate-400 hover:text-white' 
                  : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Entrar com CPF
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthTab('register');
              setErrorMessage('');
            }}
            className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
              authTab === 'register'
                ? isDark 
                  ? 'bg-amber-400 text-slate-950 shadow-md' 
                  : 'bg-white text-slate-900 shadow-sm'
                : isDark 
                  ? 'text-slate-400 hover:text-white' 
                  : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Criar Conta
          </button>
        </div>

        {/* Banner Informativo quando o Cliente já existe no ERP MobLink */}
        {isDefinePasswordOnly && erpCustomerFound && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 dark:text-amber-300 text-xs font-semibold text-center space-y-1 animate-fade-in">
            <p className="font-black text-sm">✨ Olá, {erpCustomerFound.name}!</p>
            <p className="text-[11px] leading-relaxed">
              Identificamos o seu cadastro de cliente na <strong>Evidência Calçados</strong>! Crie e confirme sua senha abaixo para acessar sua conta.
            </p>
          </div>
        )}

        {/* Mensagem de Erro */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold text-center animate-fade-in">
            {errorMessage}
          </div>
        )}

        {/* Form de Autenticação via CPF + Senha */}
        <form onSubmit={handleCpfSubmit} className="space-y-4">
          
          {/* Nome Completo (Apenas no Cadastro) */}
          {authTab === 'register' && (
            <div className="space-y-1.5">
              <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Nome Completo <span className="text-amber-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  readOnly={isDefinePasswordOnly}
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-xs font-semibold transition-all outline-none ${
                    isDefinePasswordOnly
                      ? isDark ? 'bg-slate-900 border-amber-400/30 text-amber-300' : 'bg-amber-50/50 border-amber-200 text-amber-900 font-bold'
                      : isDark 
                        ? 'bg-slate-950/80 border-slate-700 text-white focus:border-amber-400' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-400'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Campo CPF */}
          <div className="space-y-1.5">
            <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              CPF <span className="text-amber-500">*</span>
            </label>
            <div className="relative">
              <UserCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                required
                maxLength={14}
                placeholder="000.000.000-00"
                value={cpf}
                onChange={handleCpfInputChange}
                className={`w-full pl-10 pr-10 py-3 rounded-2xl border text-xs font-semibold transition-all outline-none font-mono ${
                  isDark 
                    ? 'bg-slate-950/80 border-slate-700 text-white focus:border-amber-400' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-400'
                }`}
              />
              {isCheckingCpf && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Telefone (Apenas no Cadastro) */}
          {authTab === 'register' && (
            <div className="space-y-1.5">
              <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Telefone / WhatsApp <span className="text-slate-400 font-normal">(Opcional)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  maxLength={15}
                  placeholder="(99) 99999-9999"
                  value={telefone}
                  onChange={(e) => setTelefone(formatPhone(e.target.value))}
                  className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-xs font-semibold transition-all outline-none font-mono ${
                    isDark 
                      ? 'bg-slate-950/80 border-slate-700 text-white focus:border-amber-400' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-400'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Campo Senha */}
          <div className="space-y-1.5">
            <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Senha <span className="text-amber-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className={`w-full pl-10 pr-10 py-3 rounded-2xl border text-xs font-semibold transition-all outline-none ${
                  isDark 
                    ? 'bg-slate-950/80 border-slate-700 text-white focus:border-amber-400' 
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

          {/* Campo Confirmar Senha (Apenas no Cadastro) */}
          {authTab === 'register' && (
            <div className="space-y-1.5">
              <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Confirmar Senha <span className="text-amber-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Repita sua senha"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  className={`w-full pl-10 pr-10 py-3 rounded-2xl border text-xs font-semibold transition-all outline-none ${
                    isDark 
                      ? 'bg-slate-950/80 border-slate-700 text-white focus:border-amber-400' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-400'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Botão de Envio Principal */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3.5 px-6 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer disabled:opacity-50 active:scale-[0.98] ${
              isDark
                ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-amber-400/10'
                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20'
            }`}
          >
            {isLoading 
              ? 'Processando...' 
              : (authTab === 'login' ? 'Entrar com CPF e Senha' : 'Criar minha Conta')}
          </button>
        </form>

        {/* Divisor Visual */}
        <div className="relative flex items-center justify-center my-2">
          <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
          <span className={`absolute px-3 text-[10px] font-black uppercase tracking-widest ${
            isDark ? 'bg-slate-900 text-slate-500' : 'bg-white text-slate-400'
          }`}>
            ou
          </span>
        </div>

        {/* Botão de Alternativa Rápida via Google */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className={`w-full flex items-center justify-center space-x-3 py-3 px-4 border rounded-2xl transition-all text-xs font-bold cursor-pointer disabled:opacity-50 active:scale-[0.98] ${
            isDark
              ? 'bg-slate-950/80 border-slate-800 text-slate-200 hover:bg-slate-800 hover:border-slate-700'
              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.31 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.99-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z"/>
          </svg>
          <span>Conectar rapidamente com o Google</span>
        </button>

        {/* Security & Support Info Footer */}
        <div className="pt-3 border-t border-slate-800/40 space-y-1.5 text-center text-xs">
          <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>
            Ao se conectar, você concorda com nossos Termos e Política de Privacidade.
          </p>
          <div>
            <button
              onClick={() => setCurrentView('support')}
              className={`font-bold hover:underline cursor-pointer transition-colors ${
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
