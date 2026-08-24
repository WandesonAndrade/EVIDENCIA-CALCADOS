import React, { useState } from 'react';
import { firstAccessAuthService } from '../services/firstAccessAuthService';
import { UserProfile } from '../types';
import { 
  ShieldCheck, 
  X, 
  Sparkles, 
  Lock, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';

interface FirstAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
  initialCpf?: string;
  isDark?: boolean;
}

export const FirstAccessModal: React.FC<FirstAccessModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialCpf = '',
  isDark = true,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  
  // Inputs
  const [cpf, setCpf] = useState(initialCpf);
  const [dob, setDob] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // States
  const [maskedName, setMaskedName] = useState('');
  const [rawName, setRawName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const formatCPF = (val: string): string => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const formatDOB = (val: string): string => {
    const digits = val.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  // Passo 1: Verifica o CPF no MobLink ERP
  const handleCheckCpf = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const cleanCpf = cpf.replace(/\D/g, '');

    if (cleanCpf.length !== 11) {
      setErrorMessage('Digite um CPF válido com 11 dígitos.');
      return;
    }

    try {
      setIsLoading(true);
      const result = await firstAccessAuthService.checkMoblinkCpfStatus(cleanCpf);

      if (result.locked) {
        setErrorMessage(result.lockMessage || 'Acesso suspenso temporariamente por tentativas incorretas.');
        return;
      }

      if (!result.found) {
        setErrorMessage('Nenhum cadastro de loja física localizado para este CPF. Caso seja um novo cliente, clique em "Cadastre-se".');
        return;
      }

      setMaskedName(result.maskedName || 'Cliente Evidência');
      setRawName(result.rawClientName || '');
      setStep(2);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao consultar cadastro no MobLink ERP.');
    } finally {
      setIsLoading(false);
    }
  };

  // Passo 2: Avança para a criação de senha após preencher a data de nascimento
  const handleProceedToPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const cleanDob = dob.replace(/\D/g, '');

    if (cleanDob.length !== 8) {
      setErrorMessage('Digite uma Data de Nascimento válida no formato DD/MM/AAAA.');
      return;
    }

    setStep(3);
  };

  // Passo 3: Conclui a validação no MobLink ERP e cria a senha de acesso
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!password || password.length < 6) {
      setErrorMessage('Sua senha deve conter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('As senhas digitadas não coincidem.');
      return;
    }

    try {
      setIsLoading(true);
      const user = await firstAccessAuthService.validateDobAndCreateAccount(cpf, dob, password);
      onSuccess(user);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao validar cadastro no MobLink ERP.');
      // Se errou a data de nascimento, retorna ao Passo 2
      if (err.message && err.message.includes('Data de nascimento incorreta')) {
        setStep(2);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in font-sans">
      <div className={`relative w-full max-w-md p-6 sm:p-8 rounded-3xl border shadow-2xl transition-all ${
        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* BOTÃO FECHAR */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 text-slate-400 hover:text-slate-200 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* CABEÇALHO */}
        <div className="space-y-2 mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0071E3]/10 text-[#0071E3] dark:text-blue-400 border border-[#0071E3]/20 text-[10px] font-black uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-[#0071E3]" />
            <span>Primeiro Acesso • Loja Física</span>
          </div>
          <h2 className="text-xl font-black tracking-tight">
            Ativar Acesso por CPF
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Identificamos seu cadastro do MobLink ERP. Valide sua identidade e crie sua senha de acesso ao site.
          </p>
        </div>

        {/* INDICADOR DE PASSOS */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200/60 dark:border-slate-800/80">
          <div className={`flex items-center gap-2 text-xs font-bold ${step >= 1 ? 'text-[#0071E3]' : 'text-slate-500'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${step >= 1 ? 'bg-[#0071E3] text-white' : 'bg-slate-800 text-slate-400'}`}>1</span>
            <span>CPF</span>
          </div>
          <div className="w-8 h-0.5 bg-slate-800" />
          <div className={`flex items-center gap-2 text-xs font-bold ${step >= 2 ? 'text-[#0071E3]' : 'text-slate-500'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${step >= 2 ? 'bg-[#0071E3] text-white' : 'bg-slate-800 text-slate-400'}`}>2</span>
            <span>Validação</span>
          </div>
          <div className="w-8 h-0.5 bg-slate-800" />
          <div className={`flex items-center gap-2 text-xs font-bold ${step >= 3 ? 'text-[#0071E3]' : 'text-slate-500'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${step >= 3 ? 'bg-[#0071E3] text-white' : 'bg-slate-800 text-slate-400'}`}>3</span>
            <span>Senha</span>
          </div>
        </div>

        {/* MENSAGEM DE ERRO */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* PASSO 1: INFORMAR CPF */}
        {step === 1 && (
          <form onSubmit={handleCheckCpf} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Informe o seu CPF:
              </label>
              <input
                type="text"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(formatCPF(e.target.value))}
                className="w-full px-4 py-3 border border-slate-700 rounded-2xl bg-slate-800/90 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || cpf.replace(/\D/g, '').length !== 11}
              className="w-full py-3.5 bg-[#0071E3] hover:bg-[#00509E] text-white font-extrabold rounded-2xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Consultando MobLink ERP...</span>
                </>
              ) : (
                <>
                  <span>Consultar Cadastro</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* PASSO 2: CONFIRMAR DATA DE NASCIMENTO */}
        {step === 2 && (
          <form onSubmit={handleProceedToPassword} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-[#0071E3]/10 border border-[#0071E3]/20 space-y-1">
              <div className="flex items-center gap-2 text-xs font-black text-blue-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Cadastro Localizado!</span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Titular: <strong>{maskedName}</strong>
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Confirme sua Data de Nascimento (DD/MM/AAAA):
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="DD/MM/AAAA"
                  value={dob}
                  onChange={(e) => setDob(formatDOB(e.target.value))}
                  className="w-full pl-10 pr-4 py-3 border border-slate-700 rounded-2xl bg-slate-800/90 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all"
                  autoFocus
                />
                <Calendar className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              </div>
              <p className="text-[11px] text-slate-500">
                Informe a data de nascimento exatamente como cadastrada na loja física.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl text-xs transition-all cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={dob.replace(/\D/g, '').length !== 8}
                className="flex-1 py-3 bg-[#0071E3] hover:bg-[#00509E] text-white font-extrabold rounded-2xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                <span>Validar Identidade</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* PASSO 3: CRIAR SENHA DE ACESSO */}
        {step === 3 && (
          <form onSubmit={handleFinalSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Crie sua Senha de Acesso:
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="No mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 border border-slate-700 rounded-2xl bg-slate-800/90 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all"
                  autoFocus
                />
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Confirme a Nova Senha:
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repita a senha criada"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-700 rounded-2xl bg-slate-800/90 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all"
                />
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl text-xs transition-all cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={isLoading || password.length < 6 || password !== confirmPassword}
                className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 shadow-emerald-500/20"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Ativando Cadastro...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-200" />
                    <span>Concluir &amp; Entrar</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
