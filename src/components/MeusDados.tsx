import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  User, 
  FileText, 
  Calendar, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  Sparkles, 
  AlertCircle, 
  CreditCard, 
  CheckCircle2, 
  Loader2, 
  ArrowLeft, 
  Save, 
  Building2, 
  Briefcase, 
  Heart,
  Check
} from 'lucide-react';
import { moblinkClientesService } from '../services/moblinkClientesService';
import { cepService } from '../services/cepService';
import { motion, AnimatePresence } from 'motion/react';

export const MeusDados: React.FC = () => {
  const { currentUser, updateUserProfile, setCurrentView, theme } = useApp();
  const isDark = theme === 'dark';

  const [solicitarCrediario, setSolicitarCrediario] = useState(true);
  const [rg, setRg] = useState('');
  const [cpf, setCpf] = useState('');
  const [nomePai, setNomePai] = useState('');
  const [nomeMae, setNomeMae] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [naturalidade, setNaturalidade] = useState('');
  const [telefone, setTelefone] = useState('');
  const [profissao, setProfissao] = useState('');
  const [rendaMensal, setRendaMensal] = useState('');
  const [referenciaPessoal, setReferenciaPessoal] = useState('');

  // Structured address fields
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('MA');
  const [complemento, setComplemento] = useState('');
  const [pontoReferencia, setPontoReferencia] = useState('');

  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [cepSuccessMsg, setCepSuccessMsg] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // States for automatic ERP customer match via CPF
  const [isSearchingCpf, setIsSearchingCpf] = useState(false);
  const [matchedErpClient, setMatchedErpClient] = useState<any | null>(null);

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
    return raw.replace(/^(\d{5})(\d)/, '$1-$2').substring(0, 9);
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

  const handleCepChange = async (val: string) => {
    const formatted = formatCEP(val);
    setCep(formatted);
    setCepSuccessMsg('');

    const clean = val.replace(/\D/g, '');
    if (clean.length === 8) {
      setIsLoadingCep(true);
      const res = await cepService.fetchAddressByCep(clean);
      setIsLoadingCep(false);
      if (res) {
        if (res.logradouro) setEndereco(res.logradouro);
        if (res.bairro) setBairro(res.bairro);
        if (res.localidade) setCidade(res.localidade);
        if (res.uf) setUf(res.uf);
        setCepSuccessMsg(`✓ Endereço localizado: ${res.localidade}/${res.uf}`);
      }
    }
  };

  const autofillFromMatchedClient = (matched: any) => {
    if (!matched) return;
    setMatchedErpClient(matched);

    const rawCpf = matched.cpf || matched.cpf_cnpj || matched.documento || '';
    if (rawCpf) setCpf(formatCPF(rawCpf));

    const rawRg = matched.rg || matched.rg_numero || matched.documento_rg || '';
    if (rawRg) setRg(rawRg);

    const rawNomeMae = matched.nomeMae || matched.mae || matched.nome_mae || '';
    if (rawNomeMae) setNomeMae(rawNomeMae);

    const rawNomePai = matched.nomePai || matched.pai || matched.nome_pai || '';
    if (rawNomePai) setNomePai(rawNomePai);

    const rawDataNasc = matched.dataNascimento || matched.data_nasc || matched.nascimento || matched.birthDate || matched.dt_nasc || '';
    if (rawDataNasc) setDataNascimento(rawDataNasc);

    const rawNaturalidade = matched.naturalidade || matched.cidade_natal || '';
    if (rawNaturalidade) setNaturalidade(rawNaturalidade);

    const rawTelefone = matched.telefone || matched.celular || matched.phone || matched.whatsapp || matched.tel || '';
    if (rawTelefone) setTelefone(formatPhone(rawTelefone));

    const rawProfissao = matched.profissao || matched.cargo || matched.ocupacao || '';
    if (rawProfissao) setProfissao(rawProfissao);

    const rawRenda = matched.rendaMensal || matched.renda || matched.salario || '';
    if (rawRenda) setRendaMensal(String(rawRenda));

    const rawEndereco = matched.endereco || matched.address || matched.logradouro || matched.rua || '';
    if (rawEndereco) setEndereco(rawEndereco);

    const rawNumero = matched.numero || matched.numero_end || matched.num || '';
    if (rawNumero) setNumero(rawNumero);

    const rawBairro = matched.bairro || matched.distrito || '';
    if (rawBairro) setBairro(rawBairro);

    const rawCidade = matched.cidade || matched.municipio || '';
    if (rawCidade) setCidade(rawCidade);

    const rawUf = matched.uf || matched.estado || 'MA';
    if (rawUf) setUf(String(rawUf).toUpperCase());

    const rawCep = matched.cep || matched.codigo_postal || '';
    if (rawCep) setCep(formatCEP(rawCep));

    const rawComplemento = matched.complemento || matched.complemento_end || '';
    if (rawComplemento) setComplemento(rawComplemento);

    const rawRef = matched.pontoReferencia || matched.ponto_ref || matched.referencia || '';
    if (rawRef) setPontoReferencia(rawRef);
  };

  const lookupAndAutofillErpClient = async (cleanDigits: string) => {
    if (cleanDigits.length !== 11) {
      setMatchedErpClient(null);
      return;
    }
    setIsSearchingCpf(true);
    try {
      const matched = await moblinkClientesService.findClientByCpf(cleanDigits);
      if (matched) {
        autofillFromMatchedClient(matched);
      } else {
        setMatchedErpClient(null);
      }
    } catch (err) {
      console.warn('Erro ao pesquisar CPF no ERP:', err);
    } finally {
      setIsSearchingCpf(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      const anyUser = currentUser as any;
      const initialCpf = currentUser.cpf || anyUser.documento || anyUser.cpf_cnpj || '';
      const formattedCpf = formatCPF(initialCpf);

      setSolicitarCrediario(currentUser.solicitarCrediario !== false);
      setRg(currentUser.rg || anyUser.rg_numero || '');
      setCpf(formattedCpf);
      setNomePai(currentUser.nomePai || anyUser.pai || '');
      setNomeMae(currentUser.nomeMae || anyUser.mae || '');
      setDataNascimento(currentUser.dataNascimento || anyUser.birthDate || anyUser.nascimento || anyUser.data_nasc || '');
      setNaturalidade(currentUser.naturalidade || 'Caxias/MA');
      setTelefone(formatPhone(currentUser.telefone || anyUser.phone || anyUser.whatsapp || anyUser.celular || ''));
      setProfissao(currentUser.profissao || anyUser.cargo || '');
      setRendaMensal(currentUser.rendaMensal || '');
      setReferenciaPessoal(currentUser.referenciaPessoal || '');

      setCep(formatCEP(currentUser.cep || anyUser.codigo_postal || ''));
      setEndereco(currentUser.endereco || anyUser.address || anyUser.logradouro || '');
      setNumero(currentUser.numero || anyUser.numero_end || '');
      setBairro(currentUser.bairro || '');
      setCidade(currentUser.cidade || '');
      setUf((currentUser.uf || anyUser.estado || 'MA').toUpperCase());
      setComplemento(currentUser.complemento || anyUser.complemento_end || '');
      setPontoReferencia(currentUser.pontoReferencia || '');

      const cleanDigits = initialCpf.replace(/\D/g, '');
      if (cleanDigits.length === 11) {
        lookupAndAutofillErpClient(cleanDigits);
      }
    }
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className={`p-12 rounded-3xl border max-w-md mx-auto space-y-4 ${
          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-blue-900/10 text-[#003B73]'
        }`}>
          <AlertCircle className="h-12 w-12 mx-auto text-[#006EDB]" />
          <h2 className="text-xl font-black">Acesso Restrito</h2>
          <p className="text-xs text-[#52708F] dark:text-slate-400 font-medium">
            Você precisa estar conectado com sua conta para visualizar e editar seus dados cadastrais.
          </p>
          <button 
            onClick={() => setCurrentView('login')} 
            className="px-6 py-3 rounded-full text-xs font-black bg-[#006EDB] text-white hover:bg-[#00509E] transition-all cursor-pointer shadow-md"
          >
            Fazer Login
          </button>
        </div>
      </div>
    );
  }

  const handleCpfInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setCpf(formatted);
    const cleanDigits = formatted.replace(/\D/g, '');
    lookupAndAutofillErpClient(cleanDigits);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!cpf.trim() || !telefone.trim()) {
      setError('Por favor, preencha os campos obrigatórios: CPF e Telefone (WhatsApp).');
      return;
    }

    if (solicitarCrediario && !matchedErpClient) {
      if (
        !rg.trim() ||
        !dataNascimento.trim() ||
        !nomeMae.trim() ||
        !cep.trim() ||
        !endereco.trim() ||
        !numero.trim() ||
        !bairro.trim() ||
        !cidade.trim() ||
        !uf.trim() ||
        !profissao.trim()
      ) {
        setError('Para solicitar a análise do Crediário da Loja, por favor preencha todos os dados adicionais necessários (RG, Nascimento, Nome da Mãe, Endereço Completo e Profissão).');
        return;
      }
    }

    try {
      setIsSaving(true);

      const hasAddress = Boolean(endereco.trim() && numero.trim());
      const combinedEndereco = hasAddress
        ? `${endereco.trim()}, Nº ${numero.trim()}${bairro.trim() ? `, ${bairro.trim()}` : ''}${cidade.trim() ? `, ${cidade.trim()}` : ''}/${uf.trim()}${cep.trim() ? ` - CEP: ${cep.trim()}` : ''}${complemento.trim() ? ` (${complemento.trim()})` : ''}${pontoReferencia.trim() ? ` [Ref: ${pontoReferencia.trim()}]` : ''}`
        : currentUser.endereco || '';

      const nextCrediarioStatus =
        matchedErpClient?.crediarioStatus === 'Aprovado' ||
        (matchedErpClient?.limite_cred && matchedErpClient.limite_cred > 0)
          ? 'Aprovado'
          : solicitarCrediario
            ? currentUser.crediarioStatus === 'Aprovado'
              ? 'Aprovado'
              : 'EmAnalise'
            : currentUser.crediarioStatus === 'Aprovado'
              ? 'Aprovado'
              : 'NaoSolicitado';

      await updateUserProfile({
        rg: rg.trim(),
        cpf: cpf.trim(),
        nomePai: nomePai.trim(),
        nomeMae: nomeMae.trim(),
        dataNascimento: dataNascimento.trim(),
        naturalidade: naturalidade.trim(),
        telefone: telefone.trim(),
        profissao: profissao.trim(),
        rendaMensal: rendaMensal.trim(),
        referenciaPessoal: referenciaPessoal.trim(),
        cep: cep.trim(),
        endereco: combinedEndereco,
        numero: numero.trim(),
        bairro: bairro.trim(),
        cidade: cidade.trim(),
        uf: uf.trim().toUpperCase(),
        complemento: complemento.trim(),
        pontoReferencia: pontoReferencia.trim(),
        solicitarCrediario: solicitarCrediario,
        isProfileComplete: true,
        isErpCustomer: Boolean(matchedErpClient || currentUser.isErpCustomer),
        moblinkId: matchedErpClient?.moblinkId || currentUser.moblinkId,
        limite_cred: matchedErpClient?.limite_cred || currentUser.limite_cred || 500,
        crediarioStatus: nextCrediarioStatus,
        crediarioSolicitadoEm: solicitarCrediario
          ? currentUser.crediarioSolicitadoEm || new Date().toISOString()
          : currentUser.crediarioSolicitadoEm,
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
      }, 4000);
    } catch (err) {
      console.error(err);
      setError('Erro ao salvar os dados. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      id="meus-dados-page" 
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn"
    >
      {/* Botão de Retorno */}
      <button
        onClick={() => setCurrentView('home')}
        className={`flex items-center space-x-2 transition-colors text-xs font-extrabold uppercase tracking-wider mb-2 cursor-pointer ${
          isDark ? 'text-slate-400 hover:text-white' : 'text-[#52708F] hover:text-[#003B73]'
        }`}
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Voltar para a Vitrine</span>
      </button>

      {/* Cabeçalho da Página Padronizado */}
      <div className={`flex items-center space-x-4 border-b pb-6 ${
        isDark ? 'border-slate-800' : 'border-blue-900/15'
      }`}>
        <div className="w-14 h-14 rounded-2xl bg-[#003B73] text-white flex items-center justify-center shadow-md">
          <User className="h-7 w-7" />
        </div>
        <div>
          <span className={`inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest ${
            isDark ? 'bg-blue-900/30 text-blue-200 border border-blue-800' : 'bg-[#DDF1FF] text-[#003B73] border border-[#006EDB]/20'
          }`}>
            MINHA CONTA EVIDÊNCIA
          </span>
          <h1 className={`text-2xl sm:text-3xl font-black tracking-tight mt-1.5 ${isDark ? 'text-white' : 'text-[#003B73]'}`}>
            Meus Dados Cadastrais
          </h1>
          <p className={`text-xs sm:text-sm font-bold ${isDark ? 'text-slate-400' : 'text-[#52708F]'}`}>
            Gerencie seu CPF, endereço de entrega e opção de Crediário Próprio
          </p>
        </div>
      </div>

      {/* Alerta de Sucesso ou Erro */}
      <AnimatePresence>
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center space-x-3 shadow-md"
          >
            <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
            <div className="text-xs">
              <p className="font-black text-emerald-900 text-sm">Dados Cadastrais Salvos com Sucesso!</p>
              <p className="font-medium">Seu perfil e endereço foram atualizados no sistema Evidência Calçados.</p>
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center space-x-3 shadow-md"
          >
            <AlertCircle className="h-6 w-6 text-rose-600 shrink-0" />
            <div className="text-xs">
              <p className="font-black text-rose-900 text-sm">Atenção!</p>
              <p className="font-medium">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* CARD 1: CARTÃO DE IDENTIDADE APPLE ID STYLE */}
        <div className={`p-6 sm:p-8 rounded-3xl border space-y-6 shadow-md backdrop-blur-md ${
          isDark ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white border-blue-900/10 text-[#003B73]'
        }`}>
          <div className="flex items-center justify-between border-b pb-4 border-blue-900/10">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[#EEF8FF] dark:bg-slate-800 text-[#006EDB] flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-black tracking-tight text-[#003B73] dark:text-white">
                  1. Identidade & Contato Principal
                </h2>
                <p className="text-xs text-[#52708F] dark:text-slate-400 font-medium">
                  Dados de verificação da sua conta
                </p>
              </div>
            </div>

            {matchedErpClient && (
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                Cliente ERP Vinculado
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Nome Completo */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[11px] font-extrabold text-[#003B73] dark:text-slate-300 uppercase tracking-wider block">
                Nome Completo
              </label>
              <div className="relative">
                <input
                  type="text"
                  disabled
                  value={currentUser.name}
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-blue-900/15 bg-slate-100 dark:bg-slate-800 text-[#003B73] dark:text-slate-300 font-bold opacity-80 cursor-not-allowed"
                />
                <User className="absolute left-3 top-3 h-4 w-4 text-[#52708F]" />
              </div>
            </div>

            {/* Usuário de Acesso / E-mail */}
            {(() => {
              const isSynthetic = currentUser.email?.endsWith('@evidencia.com') || currentUser.email?.endsWith('@evidenciacalcados.com');
              const displayVal = isSynthetic
                ? (currentUser.cpf ? formatCPF(currentUser.cpf) : currentUser.email.replace(/@.*$/, ''))
                : currentUser.email;

              return (
                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-[#003B73] dark:text-slate-300 uppercase tracking-wider block">
                    {isSynthetic ? 'Usuário de Acesso (CPF)' : 'E-mail de Acesso'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      disabled
                      value={displayVal}
                      className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-blue-900/15 bg-slate-100 dark:bg-slate-800 text-[#003B73] dark:text-slate-300 font-black opacity-90 cursor-not-allowed"
                    />
                    {isSynthetic ? (
                      <ShieldCheck className="absolute left-3 top-3 h-4 w-4 text-[#006EDB]" />
                    ) : (
                      <FileText className="absolute left-3 top-3 h-4 w-4 text-[#52708F]" />
                    )}
                  </div>
                </div>
              );
            })()}

            {/* CPF com Consulta Instantânea no ERP */}
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-[#003B73] dark:text-slate-300 uppercase tracking-wider block">
                CPF <span className="text-rose-600 font-black">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={handleCpfInputChange}
                  className="w-full pl-9 pr-9 py-2.5 text-xs rounded-xl border border-blue-900/15 bg-white dark:bg-slate-950 text-[#003B73] dark:text-white font-bold focus:outline-none focus:border-[#006EDB] focus:ring-4 focus:ring-[#DDF1FF]"
                />
                <FileText className="absolute left-3 top-3 h-4 w-4 text-[#52708F]" />
                {isSearchingCpf && (
                  <Loader2 className="absolute right-3 top-3 h-4 w-4 text-[#006EDB] animate-spin" />
                )}
              </div>
            </div>

            {/* Telefone / WhatsApp */}
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-[#003B73] dark:text-slate-300 uppercase tracking-wider block">
                Telefone / WhatsApp <span className="text-rose-600 font-black">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  placeholder="(00) 00000-0000"
                  value={telefone}
                  onChange={(e) => setTelefone(formatPhone(e.target.value))}
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-blue-900/15 bg-white dark:bg-slate-950 text-[#003B73] dark:text-white font-bold focus:outline-none focus:border-[#006EDB] focus:ring-4 focus:ring-[#DDF1FF]"
                />
                <Phone className="absolute left-3 top-3 h-4 w-4 text-[#52708F]" />
              </div>
            </div>

            {/* RG */}
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-[#003B73] dark:text-slate-300 uppercase tracking-wider block">
                RG / Identidade {solicitarCrediario && <span className="text-amber-600 font-black">*</span>}
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Número do RG"
                  value={rg}
                  onChange={(e) => setRg(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-blue-900/15 bg-white dark:bg-slate-950 text-[#003B73] dark:text-white font-bold focus:outline-none focus:border-[#006EDB] focus:ring-4 focus:ring-[#DDF1FF]"
                />
                <FileText className="absolute left-3 top-3 h-4 w-4 text-[#52708F]" />
              </div>
            </div>

            {/* Data de Nascimento */}
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-[#003B73] dark:text-slate-300 uppercase tracking-wider block">
                Data de Nascimento {solicitarCrediario && <span className="text-amber-600 font-black">*</span>}
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-blue-900/15 bg-white dark:bg-slate-950 text-[#003B73] dark:text-white font-bold focus:outline-none focus:border-[#006EDB] focus:ring-4 focus:ring-[#DDF1FF]"
                />
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-[#52708F]" />
              </div>
            </div>

            {/* Naturalidade */}
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-[#003B73] dark:text-slate-300 uppercase tracking-wider block">
                Naturalidade
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ex: Caxias/MA"
                  value={naturalidade}
                  onChange={(e) => setNaturalidade(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-blue-900/15 bg-white dark:bg-slate-950 text-[#003B73] dark:text-white font-bold focus:outline-none focus:border-[#006EDB] focus:ring-4 focus:ring-[#DDF1FF]"
                />
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-[#52708F]" />
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: ENDEREÇO ESTRUTURADO DE ENTREGA & COBRANÇA */}
        <div className={`p-6 sm:p-8 rounded-3xl border space-y-6 shadow-md backdrop-blur-md ${
          isDark ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white border-blue-900/10 text-[#003B73]'
        }`}>
          <div className="flex items-center justify-between border-b pb-4 border-blue-900/10">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[#EEF8FF] dark:bg-slate-800 text-[#006EDB] flex items-center justify-center">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-black tracking-tight text-[#003B73] dark:text-white">
                  2. Endereço Principal de Entrega & Cobrança
                </h2>
                <p className="text-xs text-[#52708F] dark:text-slate-400 font-medium">
                  Utilizado para envio de pedidos e validação do Crediário
                </p>
              </div>
            </div>

            {isLoadingCep && (
              <span className="text-xs text-[#006EDB] font-black flex items-center gap-1">
                <Loader2 className="h-4 w-4 animate-spin text-[#006EDB]" /> Buscando ViaCEP...
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* CEP com Autopreenchimento */}
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-[#003B73] dark:text-slate-300 uppercase tracking-wider block">
                CEP {solicitarCrediario && <span className="text-amber-600 font-black">*</span>}
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="00000-000 (Busca automática)"
                  value={cep}
                  onChange={(e) => handleCepChange(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-blue-900/15 bg-white dark:bg-slate-950 text-[#003B73] dark:text-white font-bold focus:outline-none focus:border-[#006EDB] focus:ring-4 focus:ring-[#DDF1FF]"
                />
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-[#52708F]" />
              </div>
              {cepSuccessMsg && (
                <span className="text-[10px] font-extrabold text-emerald-600 block pt-0.5">
                  {cepSuccessMsg}
                </span>
              )}
            </div>

            {/* Endereço / Logradouro */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[11px] font-extrabold text-[#003B73] dark:text-slate-300 uppercase tracking-wider block">
                Logradouro / Rua {solicitarCrediario && <span className="text-amber-600 font-black">*</span>}
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Rua, Avenida, Praça..."
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-blue-900/15 bg-white dark:bg-slate-950 text-[#003B73] dark:text-white font-bold focus:outline-none focus:border-[#006EDB] focus:ring-4 focus:ring-[#DDF1FF]"
                />
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-[#52708F]" />
              </div>
            </div>

            {/* Número */}
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-[#003B73] dark:text-slate-300 uppercase tracking-wider block">
                Número {solicitarCrediario && <span className="text-amber-600 font-black">*</span>}
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ex: 123 ou S/N"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-blue-900/15 bg-white dark:bg-slate-950 text-[#003B73] dark:text-white font-bold focus:outline-none focus:border-[#006EDB] focus:ring-4 focus:ring-[#DDF1FF]"
                />
                <Building2 className="absolute left-3 top-3 h-4 w-4 text-[#52708F]" />
              </div>
            </div>

            {/* Bairro */}
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-[#003B73] dark:text-slate-300 uppercase tracking-wider block">
                Bairro {solicitarCrediario && <span className="text-amber-600 font-black">*</span>}
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Bairro"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-blue-900/15 bg-white dark:bg-slate-950 text-[#003B73] dark:text-white font-bold focus:outline-none focus:border-[#006EDB] focus:ring-4 focus:ring-[#DDF1FF]"
                />
                <Building2 className="absolute left-3 top-3 h-4 w-4 text-[#52708F]" />
              </div>
            </div>

            {/* Cidade */}
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-[#003B73] dark:text-slate-300 uppercase tracking-wider block">
                Cidade {solicitarCrediario && <span className="text-amber-600 font-black">*</span>}
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cidade"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-blue-900/15 bg-white dark:bg-slate-950 text-[#003B73] dark:text-white font-bold focus:outline-none focus:border-[#006EDB] focus:ring-4 focus:ring-[#DDF1FF]"
                />
                <Building2 className="absolute left-3 top-3 h-4 w-4 text-[#52708F]" />
              </div>
            </div>

            {/* UF */}
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-[#003B73] dark:text-slate-300 uppercase tracking-wider block">
                UF (Estado) {solicitarCrediario && <span className="text-amber-600 font-black">*</span>}
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={2}
                  placeholder="MA"
                  value={uf}
                  onChange={(e) => setUf(e.target.value.toUpperCase().substring(0, 2))}
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-blue-900/15 bg-white dark:bg-slate-950 text-[#003B73] dark:text-white font-black uppercase focus:outline-none focus:border-[#006EDB] focus:ring-4 focus:ring-[#DDF1FF]"
                />
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-[#52708F]" />
              </div>
            </div>

            {/* Complemento */}
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-[#003B73] dark:text-slate-300 uppercase tracking-wider block">
                Complemento
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Apto, Bloco, Sala..."
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-blue-900/15 bg-white dark:bg-slate-950 text-[#003B73] dark:text-white font-bold focus:outline-none focus:border-[#006EDB] focus:ring-4 focus:ring-[#DDF1FF]"
                />
                <Building2 className="absolute left-3 top-3 h-4 w-4 text-[#52708F]" />
              </div>
            </div>

            {/* Ponto de Referência */}
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-[#003B73] dark:text-slate-300 uppercase tracking-wider block">
                Ponto de Referência
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ex: Próximo ao supermercado"
                  value={pontoReferencia}
                  onChange={(e) => setPontoReferencia(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-blue-900/15 bg-white dark:bg-slate-950 text-[#003B73] dark:text-white font-bold focus:outline-none focus:border-[#006EDB] focus:ring-4 focus:ring-[#DDF1FF]"
                />
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-[#52708F]" />
              </div>
            </div>
          </div>
        </div>

        {/* CARD 3: OPÇÃO DE CREDIÁRIO PRÓPRIO (CARNÊ EVIDÊNCIA) */}
        <div className={`p-6 sm:p-8 rounded-3xl border space-y-6 shadow-md backdrop-blur-md ${
          solicitarCrediario 
            ? 'bg-[#EEF8FF] border-[#006EDB]/20 text-[#003B73]' 
            : isDark ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white border-blue-900/10 text-[#003B73]'
        }`}>
          <div className="flex items-center justify-between border-b pb-4 border-blue-900/10">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[#003B73] text-white flex items-center justify-center shadow-md">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-black tracking-tight text-[#003B73] dark:text-white">
                  3. Crediário Próprio Evidência (Carnê)
                </h2>
                <p className="text-xs text-[#52708F] dark:text-slate-400 font-medium">
                  Opção para compras parceladas no boleto da loja
                </p>
              </div>
            </div>

            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={solicitarCrediario}
                onChange={(e) => setSolicitarCrediario(e.target.checked)}
                className="w-5 h-5 accent-[#006EDB] rounded cursor-pointer"
              />
              <span className="text-xs font-black text-[#003B73] dark:text-white">
                Desejo Crediário Próprio
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Profissão */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[11px] font-extrabold text-[#003B73] dark:text-slate-300 uppercase tracking-wider block">
                Profissão / Ocupação Principal {solicitarCrediario && <span className="text-amber-600 font-black">*</span>}
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ex: Comerciante, Vendedor, Autônomo, Servidor Público"
                  value={profissao}
                  onChange={(e) => setProfissao(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-blue-900/15 bg-white dark:bg-slate-950 text-[#003B73] dark:text-white font-bold focus:outline-none focus:border-[#006EDB] focus:ring-4 focus:ring-[#DDF1FF]"
                />
                <Briefcase className="absolute left-3 top-3 h-4 w-4 text-[#52708F]" />
              </div>
            </div>

            {/* Renda Mensal */}
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-[#003B73] dark:text-slate-300 uppercase tracking-wider block">
                Renda Mensal Declarada
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ex: R$ 2.500,00"
                  value={rendaMensal}
                  onChange={(e) => setRendaMensal(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-blue-900/15 bg-white dark:bg-slate-950 text-[#003B73] dark:text-white font-bold focus:outline-none focus:border-[#006EDB] focus:ring-4 focus:ring-[#DDF1FF]"
                />
                <FileText className="absolute left-3 top-3 h-4 w-4 text-[#52708F]" />
              </div>
            </div>

            {/* Nome da Mãe */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[11px] font-extrabold text-[#003B73] dark:text-slate-300 uppercase tracking-wider block">
                Nome Completo da Mãe {solicitarCrediario && <span className="text-amber-600 font-black">*</span>}
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Nome completo da mãe"
                  value={nomeMae}
                  onChange={(e) => setNomeMae(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-blue-900/15 bg-white dark:bg-slate-950 text-[#003B73] dark:text-white font-bold focus:outline-none focus:border-[#006EDB] focus:ring-4 focus:ring-[#DDF1FF]"
                />
                <User className="absolute left-3 top-3 h-4 w-4 text-[#52708F]" />
              </div>
            </div>

            {/* Referência Pessoal */}
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-[#003B73] dark:text-slate-300 uppercase tracking-wider block">
                Contato de Referência / Emergência
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Nome e telefone de amigo ou parente"
                  value={referenciaPessoal}
                  onChange={(e) => setReferenciaPessoal(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-blue-900/15 bg-white dark:bg-slate-950 text-[#003B73] dark:text-white font-bold focus:outline-none focus:border-[#006EDB] focus:ring-4 focus:ring-[#DDF1FF]"
                />
                <Phone className="absolute left-3 top-3 h-4 w-4 text-[#52708F]" />
              </div>
            </div>
          </div>
        </div>

        {/* BARRA FIXA DE AÇÃO INFERIOR */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-blue-900/10">
          <button
            type="button"
            onClick={() => setCurrentView('home')}
            className={`text-xs font-black uppercase tracking-wider transition-colors cursor-pointer ${
              isDark ? 'text-slate-400 hover:text-white' : 'text-[#52708F] hover:text-[#003B73]'
            }`}
          >
            Cancelar e Voltar
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2.5 px-10 py-4 bg-[#006EDB] hover:bg-[#00509E] active:scale-98 text-white font-black text-xs uppercase tracking-wider rounded-full shadow-md transition-all cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Salvando Perfil...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Salvar Meus Dados Cadastrais</span>
              </>
            )}
          </button>
        </div>

      </form>
    </motion.div>
  );
};
