import React, { useState } from 'react';
import { 
  Phone, 
  MapPin, 
  Mail, 
  MessageSquare, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  Clock, 
  FileText, 
  RefreshCw, 
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface FAQItemProps {
  question: string;
  answer: React.ReactNode;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { theme } = useApp();

  return (
    <div className={`border-b last:border-none py-4 ${theme === 'dark' ? 'border-slate-850' : 'border-slate-100'}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex justify-between items-center text-left py-2 font-semibold transition-colors focus:outline-none cursor-pointer ${
          theme === 'dark' ? 'text-slate-200 hover:text-amber-400' : 'text-slate-800 hover:text-primary'
        }`}
      >
        <span className="text-sm md:text-base">{question}</span>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-slate-400 shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-400 shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className={`mt-2 text-xs md:text-sm leading-relaxed font-light pl-1 animate-fade-in ${
          theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
        }`}>
          {answer}
        </div>
      )}
    </div>
  );
};

export const SupportPage: React.FC = () => {
  const { currentUser, setCurrentView, theme } = useApp();

  const handleWhatsAppSupportClick = (option: string) => {
    let message = "Olá! Estou vindo do site da Evidência Calçados e preciso de suporte.";
    if (option === 'crediario') {
      message = "Olá! Gostaria de tirar dúvidas ou solicitar suporte sobre meu Crediário Próprio na Evidência Calçados.";
    } else if (option === 'troca') {
      message = "Olá! Gostaria de saber como iniciar o processo de troca ou devolução de um calçado.";
    }
    const text = encodeURIComponent(message);
    window.open(`https://wa.me/5599984684867?text=${text}`, '_blank');
  };

  const triggerProfileModal = () => {
    window.dispatchEvent(new CustomEvent('open-profile-modal'));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
      
      {/* Header section */}
      <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
        <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
          theme === 'dark' ? 'bg-amber-400/10 text-amber-300' : 'bg-primary/10 text-primary'
        }`}>
          <HelpCircle className="h-3.5 w-3.5" />
          <span>Central de Ajuda</span>
        </span>
        <h1 className={`text-3xl md:text-5xl font-extrabold tracking-tight font-sans ${
          theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
        }`}>
          Como podemos ajudar você?
        </h1>
        <p className={`text-sm md:text-base leading-relaxed font-light ${
          theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
        }`}>
          Seja para tirar dúvidas sobre o seu Crediário Próprio, solicitar uma troca, localizar nossa loja ou falar com um consultor pelo WhatsApp, estamos à sua inteira disposição.
        </p>
      </div>

      {/* Main Channels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        
        {/* Atendimento WhatsApp */}
        <div className={`p-8 rounded-2xl border shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow ${
          theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-100'
        }`}>
          <div className="space-y-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              theme === 'dark' ? 'bg-green-950/40 text-green-400' : 'bg-green-50 text-green-500'
            }`}>
              <MessageSquare className="h-6 w-6" />
            </div>
            <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>WhatsApp de Suporte</h3>
            <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              Fale diretamente com nossa equipe de vendas e suporte para resolver dúvidas, realizar compras, ou consultar faturas pendentes instantaneamente.
            </p>
          </div>
          <div className="mt-6">
            <button
              onClick={() => handleWhatsAppSupportClick('geral')}
              className="w-full py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg transition-all shadow-sm flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Phone className="h-4 w-4" />
              <span>Falar no WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Crediário Próprio Info */}
        <div className={`p-8 rounded-2xl border shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow ${
          theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-100'
        }`}>
          <div className="space-y-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              theme === 'dark' ? 'bg-amber-400/10 text-amber-300' : 'bg-primary/10 text-primary'
            }`}>
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>Crediário Próprio</h3>
            <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              Descubra a facilidade de comprar sem cartão de crédito! Complete seus dados agora mesmo e faça sua simulação ou solicite sua ativação.
            </p>
          </div>
          <div className="mt-6">
            {currentUser ? (
              <button
                onClick={triggerProfileModal}
                className={`w-full py-2 text-xs font-bold rounded-lg transition-all shadow-sm flex items-center justify-center space-x-2 cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                    : 'bg-primary hover:bg-secondary text-white'
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>Atualizar Meus Dados</span>
              </button>
            ) : (
              <button
                onClick={() => setCurrentView('home')}
                className={`w-full py-2 text-xs font-bold rounded-lg transition-all shadow-sm flex items-center justify-center space-x-2 cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                    : 'bg-primary hover:bg-secondary text-white'
                }`}
              >
                <Sparkles className="h-4 w-4" />
                <span>Cadastrar-se / Entrar</span>
              </button>
            )}
          </div>
        </div>

        {/* Loja Física e Horários */}
        <div className={`p-8 rounded-2xl border shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow ${
          theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-100'
        }`}>
          <div className="space-y-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              theme === 'dark' ? 'bg-blue-950/40 text-blue-400' : 'bg-secondary/10 text-secondary'
            }`}>
              <Clock className="h-6 w-6" />
            </div>
            <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>Nossa Loja Física</h3>
            <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              Faça-nos uma visita, experimente nossos calçados pessoalmente e desfrute de um atendimento exclusivo na nossa loja em Caxias, MA.
            </p>
          </div>
          <div className={`mt-6 pt-2 border-t text-[11px] space-y-1 ${
            theme === 'dark' ? 'border-slate-800 text-slate-400' : 'border-slate-50 text-slate-500'
          }`}>
            <div className={`flex items-center space-x-1.5 font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              <Clock className="h-3.5 w-3.5 text-secondary shrink-0" />
              <span>Segunda a Sexta: 8h às 18h</span>
            </div>
            <div className={`flex items-center space-x-1.5 font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              <Clock className="h-3.5 w-3.5 text-secondary shrink-0" />
              <span>Sábado: 8h às 13h</span>
            </div>
          </div>
        </div>

      </div>

      {/* Structured Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16">
        
        {/* Support details / Policies */}
        <div className="lg:col-span-7 space-y-8">
          <div className="space-y-4">
            <h2 className={`text-2xl font-extrabold tracking-tight flex items-center space-x-2 ${
              theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
            }`}>
              <RefreshCw className="h-5.5 w-5.5 text-primary" />
              <span>Política de Trocas e Devoluções</span>
            </h2>
            <p className={`text-xs md:text-sm leading-relaxed font-light ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            }`}>
              Queremos que você ame completamente seu novo par de sapatos. Caso precise trocar o tamanho ou o modelo, nós tornamos tudo super simples e prático:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className={`p-5 rounded-xl border space-y-2 ${
              theme === 'dark' ? 'bg-slate-950/40 border-slate-850' : 'bg-slate-50 border-slate-100'
            }`}>
              <span className={`text-xs font-extrabold uppercase tracking-wider block ${
                theme === 'dark' ? 'text-red-400' : 'text-primary'
              }`}>Prazo de Troca</span>
              <p className={`text-xs leading-relaxed font-light ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Você tem até <strong>30 dias corridos</strong> após a compra para realizar a troca de qualquer calçado que não tenha sido usado, conservando a embalagem original e etiqueta.
              </p>
            </div>

            <div className={`p-5 rounded-xl border space-y-2 ${
              theme === 'dark' ? 'bg-slate-950/40 border-slate-850' : 'bg-slate-50 border-slate-100'
            }`}>
              <span className={`text-xs font-extrabold uppercase tracking-wider block ${
                theme === 'dark' ? 'text-amber-400' : 'text-secondary'
              }`}>Como Solicitar?</span>
              <p className={`text-xs leading-relaxed font-light ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Basta trazer o produto com a etiqueta à nossa loja física ou entrar em contato pelo nosso WhatsApp de Suporte enviando uma foto do produto para iniciarmos o processo.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => handleWhatsAppSupportClick('troca')}
              className={`px-5 py-2 border text-xs font-bold rounded-lg transition-colors flex items-center space-x-2 cursor-pointer ${
                theme === 'dark'
                  ? 'border-slate-700 text-slate-300 hover:text-amber-400 hover:border-amber-400/50'
                  : 'border-slate-200 text-slate-700 hover:text-primary hover:border-primary'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span>Iniciar Solicitação de Troca</span>
            </button>
          </div>
        </div>

        {/* Location Box & Quick Contact details */}
        <div className="lg:col-span-5 bg-slate-900 text-white p-8 md:p-10 rounded-3xl overflow-hidden shadow-lg border border-slate-800 relative flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-primary/30 to-secondary/30 rounded-full filter blur-2xl opacity-40 -z-1" />
          
          <div className="space-y-6">
            <h3 className="text-xl font-bold tracking-tight">Canais Rápidos</h3>
            <p className="text-xs text-slate-300 leading-relaxed font-light">
              Prefere contato tradicional ou quer visitar nossa equipe? Utilize as informações abaixo para uma comunicação rápida.
            </p>
            
            <div className="space-y-4 pt-2 text-xs text-slate-300">
              <div className="flex items-start space-x-3">
                <MapPin className="h-4.5 w-4.5 text-accent-blue mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <span className="font-bold text-white block">Endereço Físico:</span>
                  <p className="font-light">Rua Afonso Pena, 295 - Centro, Caxias - MA</p>
                  <p className="text-[10px] text-slate-400">CEP: 65606-020</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Phone className="h-4.5 w-4.5 text-accent-blue mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <span className="font-bold text-white block">Telefone Comercial / WhatsApp:</span>
                  <p className="font-light">(99) 98468-4867</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Mail className="h-4.5 w-4.5 text-accent-blue mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <span className="font-bold text-white block">E-mail Corporativo:</span>
                  <p className="font-light text-accent-blue">contato@evidenciacalcados.com</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* FAQ Section */}
      <div className={`p-6 md:p-10 rounded-3xl border max-w-4xl mx-auto space-y-6 ${
        theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-slate-50/50 border-slate-100'
      }`}>
        <div className="text-center space-y-2 mb-4">
          <h2 className={`text-xl md:text-2xl font-extrabold tracking-tight ${
            theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
          }`}>
            Perguntas Frequentes (FAQ)
          </h2>
          <p className={`text-xs font-light ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            Respostas rápidas para as principais dúvidas sobre nossa loja e serviços
          </p>
        </div>

        <div className={`divide-y ${theme === 'dark' ? 'divide-slate-850' : 'divide-slate-100'}`}>
          <FAQItem 
            question="Como posso abrir uma conta no Crediário Próprio Evidência?" 
            answer={
              <div className="space-y-2">
                <p>O processo é 100% online, prático e seguro:</p>
                <ol className="list-decimal list-inside space-y-1 pl-1">
                  <li>Faça login na sua conta no nosso site.</li>
                  <li>Clique em <strong>Meus Dados Cadastrais</strong> no menu do usuário ou clique no aviso de Cadastro Pendente no topo da tela.</li>
                  <li>Preencha todos os campos obrigatórios (*), incluindo seu CPF, RG, Nome da Mãe, e seu endereço completo de faturamento.</li>
                  <li>Clique em <strong>Salvar e Concluir</strong>. Nosso sistema analisará seus dados e ativará seu limite de Crediário Próprio instantaneamente.</li>
                </ol>
              </div>
            } 
          />
          <FAQItem 
            question="Quais documentos são exigidos para aprovação do Crediário?" 
            answer="Para a liberação do seu limite de crediário próprio para compras na Evidência Calçados, exigimos apenas o preenchimento correto dos dados básicos de identificação: CPF, RG (ou CNH), Data de Nascimento, Filiação (Nome da Mãe) e Endereço Completo de Faturamento com CEP. Não há necessidade de envio de papelada física pelo site."
          />
          <FAQItem 
            question="Como faço para efetuar o pagamento das parcelas do meu Crediário?" 
            answer="As parcelas do seu crediário podem ser pagas diretamente em nossa loja física localizada em Caxias/MA, ou de forma facilitada via transferência Pix ou boleto bancário solicitando os códigos de pagamento diretamente no nosso canal de WhatsApp de suporte financeiro no telefone (99) 98468-4867."
          />
          <FAQItem 
            question="Qual o prazo e a área de entrega das compras?" 
            answer="Oferecemos entrega no mesmo dia (ou em até 24 horas úteis) para toda a zona urbana de Caxias, MA. Para municípios vizinhos e outras regiões do Maranhão, o prazo e a taxa de frete variam conforme a localidade e o método de envio selecionado. Consulte nossa equipe de atendimento no WhatsApp para cotações personalizadas."
          />
          <FAQItem 
            question="Os produtos vendidos possuem garantia?" 
            answer="Sim! Todos os calçados e acessórios comercializados pela Evidência Calçados possuem garantia total de fábrica contra defeitos de fabricação de até 90 dias após a data da compra, de acordo com o Código de Defesa do Consumidor."
          />
        </div>
      </div>

    </div>
  );
};
