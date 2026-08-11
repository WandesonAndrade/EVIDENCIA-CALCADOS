import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import {
  X,
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
} from "lucide-react";
import { moblinkClientesService } from "../services/moblinkClientesService";
import { cepService } from "../services/cepService";

interface CompleteProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSolicitarCrediario?: boolean;
}

export const CompleteProfileModal: React.FC<CompleteProfileModalProps> = ({
  isOpen,
  onClose,
  initialSolicitarCrediario = true,
}) => {
  const { currentUser, updateUserProfile } = useApp();

  const [solicitarCrediario, setSolicitarCrediario] = useState(true);
  const [rg, setRg] = useState("");
  const [cpf, setCpf] = useState("");
  const [nomePai, setNomePai] = useState("");
  const [nomeMae, setNomeMae] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [naturalidade, setNaturalidade] = useState("");
  const [telefone, setTelefone] = useState("");
  const [profissao, setProfissao] = useState("");
  const [rendaMensal, setRendaMensal] = useState("");
  const [referenciaPessoal, setReferenciaPessoal] = useState("");

  // Structured address fields
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("MA");
  const [complemento, setComplemento] = useState("");
  const [pontoReferencia, setPontoReferencia] = useState("");

  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [cepSuccessMsg, setCepSuccessMsg] = useState("");

  const handleCepChange = async (val: string) => {
    const formatted = formatCEP(val);
    setCep(formatted);
    setCepSuccessMsg("");

    const clean = val.replace(/\D/g, "");
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

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // States for automatic ERP customer match via CPF
  const [isSearchingCpf, setIsSearchingCpf] = useState(false);
  const [matchedErpClient, setMatchedErpClient] = useState<any | null>(null);

  // Helper para mapeamento e atribuição explícita de dados do cliente MobLink ERP nos estados do formulário
  const autofillFromMatchedClient = (matched: any) => {
    if (!matched) return;
    setMatchedErpClient(matched);

    // 1. CPF
    const rawCpf = matched.cpf || matched.cpf_cnpj || matched.documento || "";
    if (rawCpf) setCpf(formatCPF(rawCpf));

    // 2. RG / Identidade
    const rawRg = matched.rg || matched.rg_numero || matched.documento_rg || "";
    if (rawRg) setRg(rawRg);

    // 3. Filiação
    const rawNomeMae = matched.nomeMae || matched.mae || matched.nome_mae || "";
    if (rawNomeMae) setNomeMae(rawNomeMae);

    const rawNomePai = matched.nomePai || matched.pai || matched.nome_pai || "";
    if (rawNomePai) setNomePai(rawNomePai);

    // 4. Data de Nascimento
    const rawDataNasc =
      matched.dataNascimento ||
      matched.data_nasc ||
      matched.nascimento ||
      matched.birthDate ||
      matched.dt_nasc ||
      "";
    if (rawDataNasc) setDataNascimento(rawDataNasc);

    // 5. Naturalidade
    const rawNaturalidade = matched.naturalidade || matched.cidade_natal || "";
    if (rawNaturalidade) setNaturalidade(rawNaturalidade);

    // 6. Telefone / Celular / WhatsApp
    const rawTelefone =
      matched.telefone ||
      matched.celular ||
      matched.phone ||
      matched.whatsapp ||
      matched.tel ||
      "";
    if (rawTelefone) setTelefone(formatPhone(rawTelefone));

    // 7. Profissão & Renda
    const rawProfissao =
      matched.profissao || matched.cargo || matched.ocupacao || "";
    if (rawProfissao) setProfissao(rawProfissao);

    const rawRenda =
      matched.rendaMensal || matched.renda || matched.salario || "";
    if (rawRenda) setRendaMensal(String(rawRenda));

    // 8. Endereço Estruturado
    const rawEndereco =
      matched.endereco ||
      matched.address ||
      matched.logradouro ||
      matched.rua ||
      "";
    if (rawEndereco) setEndereco(rawEndereco);

    const rawNumero = matched.numero || matched.numero_end || matched.num || "";
    if (rawNumero) setNumero(rawNumero);

    const rawBairro = matched.bairro || matched.distrito || "";
    if (rawBairro) setBairro(rawBairro);

    const rawCidade = matched.cidade || matched.municipio || "";
    if (rawCidade) setCidade(rawCidade);

    const rawUf = matched.uf || matched.estado || "MA";
    if (rawUf) setUf(String(rawUf).toUpperCase());

    const rawCep = matched.cep || matched.codigo_postal || "";
    if (rawCep) setCep(formatCEP(rawCep));

    const rawComplemento = matched.complemento || matched.complemento_end || "";
    if (rawComplemento) setComplemento(rawComplemento);

    const rawRef =
      matched.pontoReferencia || matched.ponto_ref || matched.referencia || "";
    if (rawRef) setPontoReferencia(rawRef);

    // 9. Herança de Status do Crediário
    if (
      matched.crediarioStatus === "Aprovado" ||
      (matched.limite_cred && matched.limite_cred > 0) ||
      matched.sit_cred === "A" ||
      matched.sit_cred === "L" ||
      matched.sit_cred === "N"
    ) {
      setSolicitarCrediario(true);
    }
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
      console.warn("Erro ao pesquisar CPF no ERP:", err);
    } finally {
      setIsSearchingCpf(false);
    }
  };

  // Load existing values when modal opens or user changes
  useEffect(() => {
    if (isOpen) {
      if (initialSolicitarCrediario !== undefined) {
        setSolicitarCrediario(initialSolicitarCrediario);
      } else if (currentUser && currentUser.solicitarCrediario === false) {
        setSolicitarCrediario(false);
      } else {
        setSolicitarCrediario(true);
      }

      if (currentUser) {
        const anyUser = currentUser as any;
        const initialCpf =
          currentUser.cpf || anyUser.documento || anyUser.cpf_cnpj || "";
        const formattedCpf = formatCPF(initialCpf);

        setRg(currentUser.rg || anyUser.rg_numero || "");
        setCpf(formattedCpf);
        setNomePai(currentUser.nomePai || anyUser.pai || "");
        setNomeMae(currentUser.nomeMae || anyUser.mae || "");
        setDataNascimento(
          currentUser.dataNascimento ||
            anyUser.birthDate ||
            anyUser.nascimento ||
            anyUser.data_nasc ||
            "",
        );
        setNaturalidade(currentUser.naturalidade || "Caxias/MA");
        setTelefone(
          formatPhone(
            currentUser.telefone ||
              anyUser.phone ||
              anyUser.whatsapp ||
              anyUser.celular ||
              "",
          ),
        );
        setProfissao(currentUser.profissao || anyUser.cargo || "");
        setRendaMensal(currentUser.rendaMensal || "");
        setReferenciaPessoal(currentUser.referenciaPessoal || "");

        setCep(formatCEP(currentUser.cep || anyUser.codigo_postal || ""));
        setEndereco(
          currentUser.endereco || anyUser.address || anyUser.logradouro || "",
        );
        setNumero(currentUser.numero || anyUser.numero_end || "");
        setBairro(currentUser.bairro || "");
        setCidade(currentUser.cidade || "");
        setUf((currentUser.uf || anyUser.estado || "MA").toUpperCase());
        setComplemento(
          currentUser.complemento || anyUser.complemento_end || "",
        );
        setPontoReferencia(currentUser.pontoReferencia || "");

        const cleanDigits = initialCpf.replace(/\D/g, "");
        if (cleanDigits.length === 11) {
          lookupAndAutofillErpClient(cleanDigits);
        }
      }
    }
  }, [currentUser, isOpen, initialSolicitarCrediario]);

  if (!isOpen || !currentUser) return null;

  // Simple formatting helpers
  const formatCPF = (value: string) => {
    const raw = value.replace(/\D/g, "");
    return raw
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
      .substring(0, 14);
  };

  const formatCEP = (value: string) => {
    const raw = value.replace(/\D/g, "");
    return raw.replace(/^(\d{5})(\d)/, "$1-$2").substring(0, 9);
  };

  const formatPhone = (value: string) => {
    const raw = value.replace(/\D/g, "");
    if (raw.length <= 10) {
      return raw
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2")
        .substring(0, 14);
    } else {
      return raw
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{5})(\d)/, "$1-$2")
        .substring(0, 15);
    }
  };

  // Instant CPF Search in ERP Database on input change
  const handleCpfInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setCpf(formatted);
    const cleanDigits = formatted.replace(/\D/g, "");
    lookupAndAutofillErpClient(cleanDigits);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 1. Validação dos campos obrigatórios padrão: CPF e Telefone (WhatsApp)
    if (!cpf.trim() || !telefone.trim()) {
      setError(
        "Por favor, preencha os campos obrigatórios padrão: CPF e Telefone (WhatsApp).",
      );
      return;
    }

    // 2. Validação condicional para Crediário da Loja (se não tiver herança direta do ERP)
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
        setError(
          "Para solicitar a análise do Crediário da Loja, por favor preencha todos os dados adicionais necessários (RG, Nascimento, Nome da Mãe, Endereço Completo e Profissão).",
        );
        return;
      }
    }

    try {
      setIsSaving(true);

      const hasAddress = Boolean(endereco.trim() && numero.trim());
      const combinedEndereco = hasAddress
        ? `${endereco.trim()}, Nº ${numero.trim()}${bairro.trim() ? `, ${bairro.trim()}` : ""}${cidade.trim() ? `, ${cidade.trim()}` : ""}/${uf.trim()}${cep.trim() ? ` - CEP: ${cep.trim()}` : ""}${complemento.trim() ? ` (${complemento.trim()})` : ""}${pontoReferencia.trim() ? ` [Ref: ${pontoReferencia.trim()}]` : ""}`
        : currentUser.endereco || "";

      const nextCrediarioStatus =
        matchedErpClient?.crediarioStatus === "Aprovado" ||
        (matchedErpClient?.limite_cred && matchedErpClient.limite_cred > 0)
          ? "Aprovado"
          : solicitarCrediario
            ? currentUser.crediarioStatus === "Aprovado"
              ? "Aprovado"
              : "EmAnalise"
            : currentUser.crediarioStatus === "Aprovado"
              ? "Aprovado"
              : "NaoSolicitado";

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
        limite_cred:
          matchedErpClient?.limite_cred || currentUser.limite_cred || 500,
        crediarioStatus: nextCrediarioStatus,
        crediarioSolicitadoEm: solicitarCrediario
          ? currentUser.crediarioSolicitadoEm || new Date().toISOString()
          : currentUser.crediarioSolicitadoEm,
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      console.error(err);
      setError("Erro ao salvar os dados. Tente novamente.");
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
              <h3 className="text-base font-extrabold tracking-tight">
                Completar Cadastro
              </h3>
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
            <h4 className="text-lg font-bold text-slate-800">
              Cadastro Atualizado!
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
              Seus dados foram salvos com sucesso e sua conta agora está
              totalmente verificada para compras e crediário.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="p-6 space-y-4 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-start space-x-2.5 p-3 bg-blue-50/55 rounded-xl border border-blue-100/60">
              <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-[11px] text-slate-600 leading-normal font-light">
                Olá,{" "}
                <span className="font-bold text-primary">
                  {currentUser.name}
                </span>
                ! Atualize os seus dados de cadastro. Defina se deseja solicitar
                o{" "}
                <span className="font-bold text-secondary">
                  Crediário Próprio Evidência
                </span>
                :
              </p>
            </div>

            {/* Box de Opção: Solicitar Crediário da Loja */}
            <div
              className={`p-4 rounded-2xl border transition-all ${
                solicitarCrediario
                  ? "bg-amber-50 border-amber-300 text-amber-900 shadow-sm"
                  : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={solicitarCrediario}
                  onChange={(e) => setSolicitarCrediario(e.target.checked)}
                  className="w-5 h-5 accent-amber-500 rounded cursor-pointer mt-0.5"
                />
                <div>
                  <span className="text-xs font-black flex items-center space-x-1.5 text-amber-700">
                    <CreditCard className="h-4 w-4" />
                    <span>
                      Solicitar Crediário da Loja (Carnê Próprio Evidência)
                    </span>
                  </span>
                  <p className="text-[11px] text-slate-600 leading-snug mt-0.5 font-medium">
                    {solicitarCrediario
                      ? "⚠️ Opção Marcada: Os dados adicionais (RG, Nascimento, Mãe, Endereço Completo e Profissão) tornam-se obrigatórios para análise e concessão de crédito."
                      : "Cadastro Padrão: Apenas Nome, CPF e Telefone (WhatsApp) são obrigatórios."}
                  </p>
                </div>
              </label>
            </div>

            {/* Banner de Cliente Reconhecido no ERP */}
            {matchedErpClient && (
              <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-950 flex items-start space-x-3 shadow-xs animate-in fade-in zoom-in-95">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <p className="font-bold text-emerald-950 flex items-center space-x-1.5">
                    <span>🎉 Cliente Reconhecido no ERP Evidência!</span>
                  </p>
                  <p className="text-slate-700 leading-snug font-medium">
                    Identificamos o seu histórico na loja física (
                    <strong className="text-slate-900 font-bold">
                      {matchedErpClient.name}
                    </strong>
                    ). Seus dados e o seu{" "}
                    <strong className="text-emerald-800 font-bold">
                      Crediário (Limite R${" "}
                      {(matchedErpClient.limite_cred || 500)
                        .toFixed(2)
                        .replace(".", ",")}
                      )
                    </strong>{" "}
                    foram vinculados automaticamente.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 text-highlight-red rounded-lg border border-red-100 text-[11px] font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* CPF (Consulta Instantânea no ERP) */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                  CPF{" "}
                  <span className="text-red-500 font-black">
                    * (Obrigatório)
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={handleCpfInputChange}
                    className="w-full pl-8 pr-8 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 font-medium"
                  />
                  <FileText className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  {isSearchingCpf && (
                    <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 text-amber-500 animate-spin" />
                  )}
                </div>
              </div>

              {/* Telefone (Estritamente Obrigatório Padrão) */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                  Telefone / WhatsApp{" "}
                  <span className="text-red-500 font-black">
                    * (Obrigatório)
                  </span>
                </label>
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

              {/* RG */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  RG / Identidade{" "}
                  {solicitarCrediario ? (
                    <span className="text-amber-600 font-black">
                      * (Crediário)
                    </span>
                  ) : (
                    <span className="text-slate-400 font-normal">
                      (Opcional)
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
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
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Data de Nascimento{" "}
                  {solicitarCrediario ? (
                    <span className="text-amber-600 font-black">
                      * (Crediário)
                    </span>
                  ) : (
                    <span className="text-slate-400 font-normal">
                      (Opcional)
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={dataNascimento}
                    onChange={(e) => setDataNascimento(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 font-medium"
                  />
                  <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              {/* Naturalidade */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Naturalidade (Cidade/Estado onde nasceu){" "}
                  <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ex: Caxias/MA"
                    value={naturalidade}
                    onChange={(e) => setNaturalidade(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 font-medium"
                  />
                  <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              {/* Nome da Mãe */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Nome Completo da Mãe{" "}
                  {solicitarCrediario ? (
                    <span className="text-amber-600 font-black">
                      * (Crediário)
                    </span>
                  ) : (
                    <span className="text-slate-400 font-normal">
                      (Opcional)
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Nome completo da mãe"
                    value={nomeMae}
                    onChange={(e) => setNomeMae(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 font-medium"
                  />
                  <User className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              {/* Profissão / Ocupação */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Profissão / Ocupação Principal{" "}
                  {solicitarCrediario ? (
                    <span className="text-amber-600 font-black">
                      * (Crediário)
                    </span>
                  ) : (
                    <span className="text-slate-400 font-normal">
                      (Opcional)
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ex: Comerciante, Vendedor, Autônomo, Servidor Público"
                    value={profissao}
                    onChange={(e) => setProfissao(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 font-medium"
                  />
                  <User className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              {/* Renda Mensal Declarada */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Renda Mensal{" "}
                  <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ex: R$ 2.500,00"
                    value={rendaMensal}
                    onChange={(e) => setRendaMensal(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 font-medium"
                  />
                  <FileText className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              {/* Referência Pessoal / Contato de Emergência */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Referência Pessoal / Contato{" "}
                  <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Nome e telefone de parente ou amigo"
                    value={referenciaPessoal}
                    onChange={(e) => setReferenciaPessoal(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 font-medium"
                  />
                  <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              {/* Divider for Address */}
              <div className="sm:col-span-2 border-t border-slate-100 pt-3 mt-1">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>
                    Endereço de Entrega & Cobrança{" "}
                    {solicitarCrediario ? (
                      <span className="text-amber-600 font-black text-[10px]">
                        * (Obrigatório para Crediário)
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal text-[10px]">
                        (Opcional)
                      </span>
                    )}
                  </span>
                </h4>
              </div>

              {/* CEP com Busca Automática de Endereço */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    CEP{" "}
                    {solicitarCrediario ? (
                      <span className="text-amber-600 font-black">
                        * (Crediário)
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal">
                        (Opcional)
                      </span>
                    )}
                  </label>
                  {isLoadingCep && (
                    <span className="text-[10px] text-[#0071e3] font-bold flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin text-[#0071e3]" /> Buscando CEP...
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="00000-000 (Preenche o endereço automaticamente)"
                    value={cep}
                    onChange={(e) => handleCepChange(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 font-medium"
                  />
                  <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                </div>
                {cepSuccessMsg && (
                  <span className="text-[10px] font-extrabold text-emerald-600 block pt-0.5">
                    {cepSuccessMsg}
                  </span>
                )}
              </div>

              {/* Endereço (Logradouro) */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Endereço{" "}
                  {solicitarCrediario ? (
                    <span className="text-amber-600 font-black">
                      * (Crediário)
                    </span>
                  ) : (
                    <span className="text-slate-400 font-normal">
                      (Opcional)
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
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
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Número{" "}
                  {solicitarCrediario ? (
                    <span className="text-amber-600 font-black">
                      * (Crediário)
                    </span>
                  ) : (
                    <span className="text-slate-400 font-normal">
                      (Opcional)
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
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
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Bairro{" "}
                  {solicitarCrediario ? (
                    <span className="text-amber-600 font-black">
                      * (Crediário)
                    </span>
                  ) : (
                    <span className="text-slate-400 font-normal">
                      (Opcional)
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
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
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Cidade{" "}
                  {solicitarCrediario ? (
                    <span className="text-amber-600 font-black">
                      * (Crediário)
                    </span>
                  ) : (
                    <span className="text-slate-400 font-normal">
                      (Opcional)
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
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
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  UF{" "}
                  {solicitarCrediario ? (
                    <span className="text-amber-600 font-black">
                      * (Crediário)
                    </span>
                  ) : (
                    <span className="text-slate-400 font-normal">
                      (Opcional)
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={2}
                    placeholder="MA"
                    value={uf}
                    onChange={(e) =>
                      setUf(e.target.value.toUpperCase().substring(0, 2))
                    }
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 font-bold"
                  />
                  <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              {/* Complemento */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Complemento{" "}
                  <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
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
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Ponto de Referência{" "}
                  <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
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
                {isSaving ? "Salvando..." : "Salvar e Concluir"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
