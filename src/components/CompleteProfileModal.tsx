import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, User, FileText, Calendar, MapPin, Phone, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';

interface CompleteProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CompleteProfileModal: React.FC<CompleteProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateUserProfile } = useApp();
  
  const [rg, setRg] = useState('');
  const [cpf, setCpf] = useState('');
  const [nomePai, setNomePai] = useState('');
  const [nomeMae, setNomeMae] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [naturalidade, setNaturalidade] = useState('');
  const [telefone, setTelefone] = useState('');

  // Structured address fields
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('MA');
  const [complemento, setComplemento] = useState('');
  const [pontoReferencia, setPontoReferencia] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Load existing values when modal opens or user changes
  useEffect(() => {
    if (currentUser) {
      setRg(currentUser.rg || '');
      setCpf(currentUser.cpf || '');
      setNomePai(currentUser.nomePai || '');
      setNomeMae(currentUser.nomeMae || '');
      setDataNascimento(currentUser.dataNascimento || '');
      setNaturalidade(currentUser.naturalidade || 'Caxias/MA');
      setTelefone(currentUser.telefone || '(99) 98468-4867');
      
      setCep(currentUser.cep || '65606-020');
      setEndereco(currentUser.endereco || 'Rua Afonso Pena');
      setNumero(currentUser.numero || '295');
      setBairro(currentUser.bairro || 'Centro');
      setCidade(currentUser.cidade || 'Caxias');
      setUf(currentUser.uf || 'MA');
      setComplemento(currentUser.complemento || '');
      setPontoReferencia(currentUser.pontoReferencia || '');
    }
  }, [currentUser, isOpen]);

  if (!isOpen || !currentUser) return null;

  // Simple formatting helpers
  const formatCPF = (value: string) => {
    const raw = value.replace(/\D/g, '');
    return raw
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .substring(0, 14);
  };

  const formatCEP = (value: string) => {
    const raw = value.replace(/\D/g, '');
    return raw
      .replace(/^(\d{5})(\d)/, '$1-$2')
      .substring(0, 9);
  };

  const formatPhone = (value: string) => {
    const raw = value.replace(/\D/g, '');
    if (raw.length <= 10) {
      return raw
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .substring(0, 14);
    } else {
      return raw
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .substring(0, 15);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Check required fields
    if (
      !rg.trim() || 
      !cpf.trim() || 
      !nomeMae.trim() || 
      !dataNascimento.trim() || 
      !naturalidade.trim() || 
      !telefone.trim() ||
      !cep.trim() ||
      !endereco.trim() ||
      !numero.trim() ||
      !bairro.trim() ||
      !cidade.trim() ||
      !uf.trim()
    ) {
      setError('Por favor, preencha todos os campos obrigatórios (*).');
      return;
    }

    try {
      setIsSaving(true);
      
      // Build a unified endereco string for compatibility/display
      const combinedEndereco = `${endereco.trim()}, Nº ${numero.trim()}${bairro.trim() ? `, ${bairro.trim()}` : ''}${cidade.trim() ? `, ${cidade.trim()}` : ''}/${uf.trim()} - CEP: ${cep.trim()}${complemento.trim() ? ` (${complemento.trim()})` : ''}${pontoReferencia.trim() ? ` [Ponto de Ref: ${pontoReferencia.trim()}]` : ''}`;

      await updateUserProfile({
        rg: rg.trim(),
        cpf: cpf.trim(),
        nomePai: nomePai.trim(),
        nomeMae: nomeMae.trim(),
        dataNascimento: dataNascimento.trim(),
        naturalidade: naturalidade.trim(),
        telefone: telefone.trim(),
        cep: cep.trim(),
        endereco: combinedEndereco, // compatibility with fallback views
        numero: numero.trim(),
        bairro: bairro.trim(),
        cidade: cidade.trim(),
        uf: uf.trim().toUpperCase(),
        complemento: complemento.trim(),
        pontoReferencia: pontoReferencia.trim()
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      console.error(err);
      setError('Erro ao salvar os dados. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      {/* Background overlay click */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Box */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200 z-10 my-8">
        
        {/* Banner header decor */}
        <div className="bg-gradient-to-r from-primary to-secondary px-6 py-5 text-white flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-5 w-5 text-accent-blue" />
              <h3 className="text-base font-extrabold tracking-tight">Completar Cadastro</h3>
            </div>
            <p className="text-[10px] text-slate-100 font-light tracking-wide uppercase">
              Evidência Calçados • Ambiente Seguro
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 text-white transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto border border-green-100 text-green-500">
              <ShieldCheck className="h-10 w-10 animate-bounce" />
            </div>
            <h4 className="text-lg font-bold text-slate-800">Cadastro Atualizado!</h4>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
              Seus dados foram salvos com sucesso e sua conta agora está totalmente verificada para compras e crediário.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-start space-x-2.5 p-3 bg-blue-50/55 rounded-xl border border-blue-100/60">
              <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-[11px] text-slate-600 leading-normal font-light">
                Olá, <span className="font-bold text-primary">{currentUser.name}</span>! Para sua segurança e aprovação instantânea no nosso <span className="font-bold text-secondary">Crediário Próprio Evidência</span>, complete o formulário de cadastro abaixo:
              </p>
            </div>

            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 text-highlight-red rounded-lg border border-red-100 text-[11px] font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* CPF */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">CPF *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(formatCPF(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 font-medium"
                  />
                  <FileText className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              {/* RG */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">RG / Identidade *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Número do RG"
                    value={rg}
                    onChange={(e) => setRg(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 font-medium"
                  />
                  <FileText className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              {/* Data Nascimento */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Data de Nascimento *</label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={dataNascimento}
                    onChange={(e) => setDataNascimento(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 font-medium"
                  />
                  <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              {/* Telefone */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Telefone / WhatsApp *</label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    placeholder="(00) 00000-0000"
                    value={telefone}
                    onChange={(e) => setTelefone(formatPhone(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 font-medium"
                  />
                  <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              {/* Naturalidade */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Naturalidade (Cidade/Estado onde nasceu) *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Ex: São Luís/MA"
                    value={naturalidade}
                    onChange={(e) => setNaturalidade(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 font-medium"
                  />
                  <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              {/* Nome da Mãe */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Nome Completo da Mãe *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Nome completo da mãe"
                    value={nomeMae}
                    onChange={(e) => setNomeMae(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 font-medium"
                  />
                  <User className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              {/* Nome do Pai */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Nome Completo do Pai (Opcional)</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Nome completo do pai"
                    value={nomePai}
                    onChange={(e) => setNomePai(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 font-medium"
                  />
                  <User className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              {/* Divider for Address */}
              <div className="sm:col-span-2 border-t border-slate-100 pt-3 mt-1">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>Endereço de Entrega & Cobrança</span>
                </h4>
              </div>

              {/* CEP */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">CEP *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="00000-000"
                    value={cep}
                    onChange={(e) => setCep(formatCEP(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 font-medium"
                  />
                  <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              {/* Endereço (Logradouro) */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Endereço *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Rua, Avenida, Praça, etc."
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 font-medium"
                  />
                  <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              {/* Número */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Número *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Ex: 123 ou S/N"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 font-medium"
                  />
                  <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              {/* Bairro */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Bairro *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Bairro"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 font-medium"
                  />
                  <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              {/* Cidade */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Cidade *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Cidade"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 font-medium"
                  />
                  <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              {/* UF */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">UF *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={2}
                    placeholder="MA"
                    value={uf}
                    onChange={(e) => setUf(e.target.value.toUpperCase().substring(0, 2))}
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 font-bold"
                  />
                  <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              {/* Complemento */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Complemento</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Apto, Sala, Bloco, etc."
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 font-medium"
                  />
                  <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              {/* Ponto de Referência */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Ponto de Referência</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ex: Próximo ao supermercado"
                    value={pontoReferencia}
                    onChange={(e) => setPontoReferencia(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 font-medium"
                  />
                  <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

            </div>

            <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              >
                Voltar Depois
              </button>
              
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 bg-primary hover:bg-secondary text-white text-xs font-bold rounded-lg transition-all shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                {isSaving ? 'Salvando...' : 'Salvar e Concluir'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
