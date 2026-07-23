import React from 'react';
import { Store, ShieldCheck, Heart, Award, MapPin, Phone, Mail, Sparkles, ShoppingBag } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AboutUs: React.FC = () => {
  const { setCurrentView, theme, aboutConfig } = useApp();

  const cfg = aboutConfig || {
    badgeText: 'TRADIÇÃO & EXCELÊNCIA',
    title: 'Evidência Calçados',
    subtitle: 'Tradição, Qualidade e Estilo nos Seus Pés',
    description: 'Desde a nossa fundação, temos o compromisso de trazer moda, conforto e elegância para os seus pés. Localizada no coração de Caxias, Maranhão, somos mais do que uma loja de calçados — somos parceiros da sua caminhada diária.',
    highlightImage: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=1600&auto=format&fit=crop'
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
      
      {/* Hero section */}
      <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
        <span className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${
          theme === 'dark' ? 'bg-amber-400/10 text-amber-300 border border-amber-400/30' : 'bg-primary/10 text-primary border border-primary/20'
        }`}>
          <Sparkles className="h-3.5 w-3.5" />
          <span>{cfg.badgeText || 'Nossa História'}</span>
        </span>
        <h1 className={`text-3xl md:text-5xl font-extrabold tracking-tight font-sans ${
          theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
        }`}>
          {cfg.title}
        </h1>
        <p className={`text-base md:text-lg font-medium ${
          theme === 'dark' ? 'text-amber-400' : 'text-slate-700'
        }`}>
          {cfg.subtitle}
        </p>
        <p className={`text-sm md:text-base leading-relaxed font-normal whitespace-pre-line ${
          theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
        }`}>
          {cfg.description}
        </p>
      </div>

      {/* Grid of Values/Aesthetic content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
        
        {/* Value 1 */}
        <div className={`p-8 rounded-2xl border shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow ${
          theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-100'
        }`}>
          <div className="space-y-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              theme === 'dark' ? 'bg-red-950/40 text-red-400' : 'bg-primary/10 text-primary'
            }`}>
              <Heart className="h-6 w-6" />
            </div>
            <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>Paixão pelo Cliente</h3>
            <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              Nosso foco está em proporcionar a melhor experiência de compra, desde o atendimento personalizado até a facilidade de pagamento com nosso crediário facilitado.
            </p>
          </div>
        </div>

        {/* Value 2 */}
        <div className={`p-8 rounded-2xl border shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow ${
          theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-100'
        }`}>
          <div className="space-y-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              theme === 'dark' ? 'bg-amber-950/40 text-amber-400' : 'bg-secondary/10 text-secondary'
            }`}>
              <Award className="h-6 w-6" />
            </div>
            <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>Qualidade Garantida</h3>
            <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              Trabalhamos apenas com marcas renomadas e materiais de altíssima qualidade para garantir que cada par de calçado ofereça durabilidade, estilo e bem-estar.
            </p>
          </div>
        </div>

        {/* Value 3 */}
        <div className={`p-8 rounded-2xl border shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow ${
          theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-100'
        }`}>
          <div className="space-y-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              theme === 'dark' ? 'bg-blue-950/40 text-blue-400' : 'bg-accent-blue/10 text-accent-blue'
            }`}>
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>Crediário Próprio Seguro</h3>
            <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              Acreditamos no consumo acessível. Com o nosso crediário próprio facilitado, você realiza suas compras com total segurança, transparência e sem burocracia desnecessária.
            </p>
          </div>
        </div>

      </div>

      {/* Story detail layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
        
        {/* Text */}
        <div className="space-y-6">
          <h2 className={`text-2xl md:text-3xl font-extrabold tracking-tight ${
            theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
          }`}>
            Elegância e Conforto na sua cidade natal
          </h2>
          <div className={`space-y-4 text-xs md:text-sm leading-relaxed font-light ${
            theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
          }`}>
            <p>
              Fundada em Caxias, no Maranhão, a <strong>Evidência Calçados</strong> nasceu de um sonho de oferecer calçados modernos que unissem as principais tendências da moda global ao conforto que o dia a dia exige.
            </p>
            <p>
              Nossa loja física se tornou uma referência regional. Cada detalhe, desde o design do nosso catálogo até a curadoria dos nossos sapatos, sandálias e tênis, é planejado para fazer com que você se sinta confiante e elegante em qualquer ocasião.
            </p>
            <p>
              Com a evolução tecnológica, trouxemos nosso catálogo completo para o ambiente online, permitindo que nossos clientes vejam lançamentos, façam pedidos integrados via WhatsApp e gerenciem seus cadastros com facilidade absoluta.
            </p>
          </div>
          
          <div className="pt-4 flex flex-wrap gap-4">
            <button
              onClick={() => setCurrentView('home')}
              className={`px-6 py-2.5 text-xs font-bold rounded-lg transition-all shadow-md hover:scale-[1.01] flex items-center space-x-2 cursor-pointer ${
                theme === 'dark'
                  ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                  : 'bg-primary hover:bg-secondary text-white'
              }`}
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Ver Nosso Catálogo</span>
            </button>
          </div>
        </div>

        {/* Visual showcase card */}
        <div className="relative bg-slate-900 text-white p-8 md:p-12 rounded-3xl overflow-hidden shadow-xl border border-slate-800 flex flex-col justify-between min-h-[340px]">
          {/* Ambient light glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/35 to-secondary/35 rounded-full filter blur-3xl opacity-50 -z-1" />
          
          <div className="space-y-6 relative z-10">
            <span className="text-[10px] uppercase font-bold text-accent-blue tracking-widest block">
              Onde nos encontrar
            </span>
            <h3 className="text-xl md:text-2xl font-bold tracking-tight">
              Visite nossa Loja Física
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed font-light">
              Gosta de experimentar seus sapatos pessoalmente e tomar um café conosco? Nossa equipe de consultores de moda terá imenso prazer em receber você.
            </p>
          </div>

          <div className="mt-8 space-y-3 text-xs text-slate-300 relative z-10">
            <div className="flex items-start space-x-3">
              <MapPin className="h-4 w-4 text-accent-blue mt-0.5 shrink-0" />
              <span>Rua Afonso Pena, 295 - Centro, Caxias - MA, CEP: 65606-020</span>
            </div>
            <div className="flex items-center space-x-3">
              <Phone className="h-4 w-4 text-accent-blue shrink-0" />
              <span>(99) 98468-4867</span>
            </div>
            <div className="flex items-center space-x-3">
              <Mail className="h-4 w-4 text-accent-blue shrink-0" />
              <span>contato@evidenciacalcados.com</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
