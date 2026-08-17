import React from 'react';
import { Store, ShieldCheck, Heart, Award, MapPin, Phone, Mail, Sparkles, ShoppingBag, Target, Eye, CheckCircle2, Calendar } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AboutUs: React.FC = () => {
  const { setCurrentView, theme } = useApp();
  const isDark = theme === 'dark';

  const valores = [
    { title: 'Confiança', desc: 'Transparência, integridade e segurança em todas as nossas relações.' },
    { title: 'Humildade', desc: 'Disposição para ouvir, aprender e evoluir continuamente com nossos clientes.' },
    { title: 'Disciplina', desc: 'Rigor e consistência na curadoria de produtos e no padrão de atendimento.' },
    { title: 'Respeito', desc: 'Valorização absoluta dos nossos clientes, parceiros e colaboradores.' },
    { title: 'Comprometimento', desc: 'Dedicação total em entregar a melhor experiência de compra e pós-venda.' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 space-y-16">
      
      {/* Hero Header Estilo Apple Studio Padronizado */}
      <div className="text-center max-w-3xl mx-auto space-y-3.5">
        <span className={`inline-flex items-center space-x-2 px-3.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest ${
          isDark 
            ? 'bg-blue-900/30 text-blue-200 border border-blue-800' 
            : 'bg-[#DDF1FF] text-[#003B73] border border-[#006EDB]/20'
        }`}>
          <Calendar className="h-3.5 w-3.5" />
          <span>Empresa Fundada em 09/09/2025</span>
        </span>

        <h1 className={`text-3xl md:text-5xl font-black tracking-tight ${
          isDark ? 'text-white' : 'text-[#003B73]'
        }`}>
          Evidência Calçados
        </h1>

        <p className={`text-base md:text-lg font-extrabold ${
          isDark ? 'text-blue-300' : 'text-[#006EDB]'
        }`}>
          Tradição, Qualidade e Inovação para Acompanhar os Seus Pés
        </p>

        <p className={`text-xs sm:text-sm leading-relaxed font-bold ${
          isDark ? 'text-slate-400' : 'text-[#52708F]'
        }`}>
          Localizada no coração de Caxias, Maranhão, a Evidência Calçados combina estilo, conforto e facilidade para que você expresse sua melhor versão a cada passo.
        </p>
      </div>

      {/* PAINEL MISSÃO & VISÃO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Card Missão */}
        <div className={`p-8 sm:p-10 rounded-3xl border transition-all space-y-4 relative overflow-hidden ${
          isDark ? 'bg-[#161617] border-white/10 text-white' : 'bg-[#f5f5f7] border-black/5 text-[#1d1d1f]'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-[#0071e3]/10 text-[#0071e3]">
              <Target className="h-6 w-6 stroke-[2.5]" />
            </div>
            <span className="text-xs font-black uppercase tracking-wider text-[#0071e3]">
              Nossa Missão
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
            Missão
          </h3>

          <p className={`text-sm sm:text-base leading-relaxed font-medium ${
            isDark ? 'text-slate-300' : 'text-[#515154]'
          }`}>
            "Oferecer aos nossos clientes uma seleção de calçados e acessórios de alta qualidade, combinando estilo, conforto e inovação, para que cada pessoa possa expressar sua personalidade e se sentir confiante em seu dia a dia."
          </p>
        </div>

        {/* Card Visão */}
        <div className={`p-8 sm:p-10 rounded-3xl border transition-all space-y-4 relative overflow-hidden ${
          isDark ? 'bg-[#161617] border-white/10 text-white' : 'bg-[#f5f5f7] border-black/5 text-[#1d1d1f]'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
              <Eye className="h-6 w-6 stroke-[2.5]" />
            </div>
            <span className="text-xs font-black uppercase tracking-wider text-amber-500">
              Nossa Visão
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
            Visão
          </h3>

          <p className={`text-sm sm:text-base leading-relaxed font-medium ${
            isDark ? 'text-slate-300' : 'text-[#515154]'
          }`}>
            "Ser reconhecido como a loja de calçados e acessórios mais inovadora e preferida na nossa região, destacando-se pelo atendimento diferenciado, variedade de produtos e compromisso com nossos clientes."
          </p>
        </div>

      </div>

      {/* PAINEL NOSSOS VALORES */}
      <div className="space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
            isDark ? 'text-white' : 'text-[#1d1d1f]'
          }`}>
            Nossos Valores
          </h2>
          <p className="text-xs text-[#86868b] font-medium">
            Os princípios fundamentais que guiam cada atitude e atendimento em nossa loja.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {valores.map((val, idx) => (
            <div 
              key={idx}
              className={`p-6 rounded-3xl border flex flex-col justify-between space-y-3 transition-all ${
                isDark 
                  ? 'bg-[#161617] border-white/10 hover:border-amber-400/40' 
                  : 'bg-white border-black/5 shadow-xs hover:border-[#0071e3]/30'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-full bg-[#0071e3]/10 text-[#0071e3] font-bold text-xs flex items-center justify-center">
                    0{idx + 1}
                  </span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
                <h4 className={`text-base font-bold tracking-tight ${
                  isDark ? 'text-white' : 'text-[#1d1d1f]'
                }`}>
                  {val.title}
                </h4>
                <p className="text-xs text-[#86868b] leading-relaxed font-normal">
                  {val.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* LOJA FÍSICA & ATENDIMENTO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center pt-6">
        
        {/* História e Compromisso */}
        <div className="space-y-6">
          <span className="text-xs font-bold text-[#0071e3] uppercase tracking-wider block">
            Caxias — Maranhão
          </span>
          <h2 className={`text-2xl md:text-3xl font-extrabold tracking-tight ${
            isDark ? 'text-white' : 'text-[#1d1d1f]'
          }`}>
            Fundada em 09 de Setembro de 2025
          </h2>
          <div className={`space-y-4 text-xs md:text-sm leading-relaxed font-normal ${
            isDark ? 'text-slate-300' : 'text-[#515154]'
          }`}>
            <p>
              A <strong>Evidência Calçados</strong> abriu suas portas oficialmente em <strong>09/09/2025</strong> com a missão de trazer para a cidade de Caxias-MA uma curadoria moderna de calçados, confecções e acessórios das principais marcas do mercado.
            </p>
            <p>
              Em nossa loja física e no catálogo digital integrados, combinamos atendimento humanizado, facilidade de crediário próprio em até 6x sem juros e entrega expressa para toda a região.
            </p>
          </div>
          
          <div className="pt-2">
            <button
              onClick={() => setCurrentView('home')}
              className="px-6 py-3 bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold text-xs rounded-full shadow-xs transition-all cursor-pointer inline-flex items-center space-x-2"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Explorar Nosso Catálogo</span>
            </button>
          </div>
        </div>

        {/* Card Loja Física */}
        <div className={`p-8 md:p-10 rounded-3xl border flex flex-col justify-between space-y-6 relative overflow-hidden ${
          isDark ? 'bg-[#161617] border-white/10 text-white' : 'bg-[#f5f5f7] border-black/5 text-[#1d1d1f]'
        }`}>
          <div className="space-y-4">
            <span className="text-[10px] uppercase font-bold text-[#0071e3] tracking-widest block">
              Visite-nos
            </span>
            <h3 className="text-xl md:text-2xl font-bold tracking-tight">
              Loja Física em Caxias - MA
            </h3>
            <p className="text-xs text-[#86868b] leading-relaxed">
              Venha conhecer nosso showroom e experimentar nossos calçados pessoalmente com auxílio dos nossos consultores de moda.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-start space-x-3">
              <MapPin className="h-4 w-4 text-[#0071e3] mt-0.5 shrink-0" />
              <span>Rua Afonso Pena, 295 - Centro, Caxias - MA, CEP: 65606-010</span>
            </div>
            <div className="flex items-center space-x-3">
              <Phone className="h-4 w-4 text-[#0071e3] shrink-0" />
              <span>(99) 98468-4867</span>
            </div>
            <div className="flex items-center space-x-3">
              <Mail className="h-4 w-4 text-[#0071e3] shrink-0" />
              <span>evidenicacalcados2025@gmail.com</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
