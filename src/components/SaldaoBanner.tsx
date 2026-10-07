import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Truck, 
  ShieldCheck, 
  CreditCard, 
  RefreshCw, 
  ArrowRight, 
  Tag 
} from 'lucide-react';

interface SaldaoBannerProps {
  discountPercent?: number;
  bannerText?: string;
  onViewAll?: () => void;
}

export const SaldaoBanner: React.FC<SaldaoBannerProps> = ({
  discountPercent = 20,
  bannerText,
  onViewAll
}) => {
  const { storeTheme } = useApp();
  const isOutubroRosa = storeTheme === 'outubro-rosa';

  // Formata o subtítulo para manter conciso e elegante na vitrine, removendo quaisquer emojis
  const cleanSubtitle = bannerText 
    ? bannerText.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim()
    : 'Saldão de calçados – últimas unidades com desconto exclusivo!';

  return (
    <div 
      id="saldao-destaque-banner"
      className={`relative overflow-hidden rounded-2xl sm:rounded-3xl lg:rounded-[28px] border text-white select-none group transition-all duration-300 ${
        isOutubroRosa 
          ? 'border-pink-400/40 bg-[#540832] shadow-2xl shadow-pink-950/40' 
          : 'border-blue-600/30 bg-[#021B4D] shadow-2xl shadow-blue-950/60'
      }`}
      style={{
        background: isOutubroRosa
          ? 'linear-gradient(108deg, #5B0836 0%, #7D0D47 35%, #9D174D 62%, #680A3A 100%)'
          : 'linear-gradient(108deg, #011438 0%, #032158 35%, #052b6e 62%, #021a47 100%)'
      }}
    >
      {/* 1. Efeito de Iluminação de Fundo: Halo Solar / Spotlight Âmbar & Laranja Radiante */}
      <div 
        className="absolute right-[12%] sm:right-[16%] lg:right-[18%] top-1/2 -translate-y-1/2 w-[260px] sm:w-[380px] lg:w-[480px] h-[220px] sm:h-[300px] lg:h-[360px] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, rgba(255, 115, 0, 0.95) 0%, rgba(255, 145, 0, 0.70) 28%, rgba(255, 95, 0, 0.20) 54%, ${isOutubroRosa ? 'rgba(91, 8, 54, 0)' : 'rgba(2, 27, 77, 0)'} 72%)`,
          filter: 'blur(16px)',
          opacity: 0.95
        }}
      />

      {/* Brilho Solar Suave de Profundidade */}
      <div 
        className="absolute right-[15%] lg:right-[20%] top-1/2 -translate-y-1/2 w-[180px] lg:w-[260px] h-[180px] lg:h-[260px] rounded-full bg-gradient-to-tr from-orange-500 via-amber-400 to-yellow-300 blur-2xl opacity-60 pointer-events-none" 
      />

      {/* Grid de Linhas Sutis & Partículas Decorativas no Fundo */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03] pointer-events-none" />

      {/* 2. Traços de Energia / Acentos Dinâmicos em Laranja (Sparks) */}
      <div className="absolute top-5 right-[34%] hidden xl:block pointer-events-none">
        <svg width="40" height="28" viewBox="0 0 45 35" fill="none">
          <line x1="8" y1="28" x2="22" y2="8" stroke="#FF8A00" strokeWidth="3.2" strokeLinecap="round" />
          <line x1="26" y1="32" x2="42" y2="18" stroke="#FF8A00" strokeWidth="3.2" strokeLinecap="round" />
        </svg>
      </div>

      <div className="absolute top-7 right-8 hidden lg:block pointer-events-none">
        <svg width="30" height="32" viewBox="0 0 35 40" fill="none">
          <line x1="6" y1="12" x2="16" y2="4" stroke="#FF8A00" strokeWidth="3.2" strokeLinecap="round" />
          <line x1="14" y1="26" x2="28" y2="36" stroke="#FF8A00" strokeWidth="3.2" strokeLinecap="round" />
        </svg>
      </div>

      {/* 3. Conteúdo Principal - Layout Compacto e Panorâmico */}
      <div className="relative z-10 px-5 sm:px-7 lg:px-8 xl:px-10 py-4 sm:py-5 flex flex-col justify-between">
        
        {/* Bloco Superior: Informações & Palco com Ilustração 3D */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-5 xl:gap-8">
          
          {/* Lado Esquerdo: Textos, Título e Badges */}
          <div className="space-y-2 sm:space-y-2.5 z-20 shrink-0">
            
            {/* Badge de Destaque com Gradiente Quente */}
            <div className="inline-flex items-center">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-[#FF4500] via-[#FF6000] to-[#FFA000] text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-md shadow-orange-600/30 border border-white/20">
                <span>ÚLTIMAS UNIDADES EM ESTOQUE</span>
              </span>
            </div>

            {/* Título Principal Bicolor com -% OFF */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
              <h2 className="text-lg sm:text-2xl md:text-3xl lg:text-[30px] xl:text-[34px] font-black tracking-tight text-white leading-tight">
                Saldão de Calçados
              </h2>
              <span className={`text-lg sm:text-2xl md:text-3xl lg:text-[30px] xl:text-[34px] font-black ${isOutubroRosa ? 'text-[#F472B6]' : 'text-[#FF7A00]'} tracking-tight leading-tight shrink-0`}>
                -{discountPercent}% OFF
              </span>
            </div>

            {/* Subtítulo / Chamada Comercial */}
            <div className={`flex items-center space-x-2 ${isOutubroRosa ? 'text-pink-100/90' : 'text-sky-100/90'} text-xs sm:text-sm font-medium`}>
              <Tag className={`w-3.5 h-3.5 ${isOutubroRosa ? 'text-[#F472B6]' : 'text-[#38BDF8]'} shrink-0`} />
              <p className="truncate max-w-xs sm:max-w-md lg:max-w-sm xl:max-w-md">
                {cleanSubtitle}
              </p>
            </div>
          </div>

          {/* Centro: Palco Ilustrado com Pódio 3D, Sacolas e Tênis (100% CÓDIGO VETORIAL COM LARGURA FLEXÍVEL) */}
          <div className="hidden lg:flex items-center justify-center relative flex-1 min-w-0 max-w-[260px] xl:max-w-[320px] h-[115px] sm:h-[130px] lg:h-[140px] pointer-events-none mx-auto">
            <svg 
              viewBox="0 0 440 220" 
              className="w-full h-full drop-shadow-xl overflow-visible"
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Gradiente do Pódio Superior */}
                <linearGradient id="podiumTopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={isOutubroRosa ? '#9D174D' : '#143C8A'} />
                  <stop offset="50%" stopColor={isOutubroRosa ? '#700B40' : '#0B255E'} />
                  <stop offset="100%" stopColor={isOutubroRosa ? '#4A062B' : '#051740'} />
                </linearGradient>

                {/* Gradiente da Face do Pódio */}
                <linearGradient id="podiumBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={isOutubroRosa ? '#700B40' : '#0B2660'} />
                  <stop offset="100%" stopColor={isOutubroRosa ? '#3B0422' : '#03102C'} />
                </linearGradient>

                {/* Gradiente da Sacola Temática */}
                <linearGradient id="themeBagGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={isOutubroRosa ? '#EC4899' : '#124099'} />
                  <stop offset="60%" stopColor={isOutubroRosa ? '#BE185D' : '#092766'} />
                  <stop offset="100%" stopColor={isOutubroRosa ? '#831843' : '#051945'} />
                </linearGradient>

                {/* Gradiente da Sacola Laranja */}
                <linearGradient id="orangeBagGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FF8C00" />
                  <stop offset="100%" stopColor="#E64A00" />
                </linearGradient>

                {/* Sombra de Contato Suave */}
                <radialGradient id="softGroundShadow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#000000" stopOpacity="0.75" />
                  <stop offset="60%" stopColor="#000000" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* 1. Sombra do Pódio no Chão */}
              <ellipse cx="230" cy="195" rx="130" ry="22" fill="url(#softGroundShadow)" />

              {/* 2. Face Cilíndrica do Pódio */}
              <path 
                d="M 105 150 Q 230 190 355 150 L 355 180 Q 230 220 105 180 Z" 
                fill="url(#podiumBodyGrad)" 
              />
              
              {/* 3. Topo Elíptico do Pódio */}
              <ellipse 
                cx="230" 
                cy="150" 
                rx="125" 
                ry="36" 
                fill="url(#podiumTopGrad)" 
                stroke={isOutubroRosa ? '#EC4899' : '#2962FF'} 
                strokeWidth="1.5"
                strokeOpacity="0.4"
              />

              {/* 4. Sacola Laranja de Fundo (Esquerda) */}
              <g transform="translate(130, 75) rotate(-6)">
                <path 
                  d="M 18 10 C 18 -6, 42 -6, 42 10" 
                  fill="none" 
                  stroke="#FFB049" 
                  strokeWidth="3" 
                  strokeLinecap="round" 
                />
                <rect x="5" y="10" width="50" height="60" rx="5" fill="url(#orangeBagGrad)" />
                <path d="M 5 22 L 55 22" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
              </g>

              {/* 5. Sacola Temática com Ícone de Carrinho (Fundo/Centro) */}
              <g transform="translate(195, 30)">
                <path 
                  d="M 28 22 C 28 -4, 62 -4, 62 22" 
                  fill="none" 
                  stroke={isOutubroRosa ? '#F472B6' : '#448AFF'} 
                  strokeWidth="4" 
                  strokeLinecap="round" 
                />
                <rect 
                  x="5" 
                  y="22" 
                  width="80" 
                  height="105" 
                  rx="6" 
                  fill="url(#themeBagGrad)" 
                  stroke={isOutubroRosa ? '#EC4899' : '#2979FF'} 
                  strokeWidth="1.5" 
                  strokeOpacity="0.4"
                />
                <g transform="translate(28, 48) scale(1.15)">
                  <path 
                    d="M 2 3 L 7 3 L 12 18 L 26 18 L 30 7 L 10 7" 
                    fill="none" 
                    stroke="#FFFFFF" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                  />
                  <circle cx="14" cy="22" r="2" fill="#FFFFFF" />
                  <circle cx="24" cy="22" r="2" fill="#FFFFFF" />
                  <line x1="16" y1="10" x2="16" y2="15" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="21" y1="10" x2="21" y2="15" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
                </g>
              </g>

              {/* 6. Sombra dos Calçados sobre o Topo do Pódio */}
              <ellipse cx="235" cy="158" rx="85" ry="16" fill="rgba(0, 0, 0, 0.6)" />

              {/* 7. Par de Tênis Esportivo Moderno (Ilustração Vetorial 100% Código) */}
              {/* Tênis Esquerdo */}
              <g transform="translate(155, 95) scale(0.85)">
                <path 
                  d="M 12 55 C 25 58, 65 59, 105 54 C 115 53, 128 47, 134 38 C 130 38, 122 39, 114 42 C 90 44, 45 45, 18 43 C 14 43, 11 48, 12 55 Z" 
                  fill="#1C212D" 
                />
                <path 
                  d="M 14 44 C 38 46, 85 45, 112 41 C 122 39, 129 35, 132 30 C 122 28, 102 30, 80 32 C 45 35, 25 36, 15 36 C 11 36, 12 40, 14 44 Z" 
                  fill="#F1F3F8" 
                />
                <path 
                  d="M 22 36 C 35 22, 50 16, 68 15 C 80 20, 92 24, 110 26 C 122 27, 128 31, 122 33 C 105 32, 45 35, 22 36 Z" 
                  fill="#C5CCD9" 
                />
                <path 
                  d="M 38 20 C 44 10, 56 6, 68 6 C 72 10, 75 16, 78 20 Z" 
                  fill="#E4E8F0" 
                />
              </g>

              {/* Tênis Direito (Principal, em Primeiro Plano) */}
              <g transform="translate(180, 100)">
                <path 
                  d="M 16 56 C 30 60, 80 61, 125 55 C 136 53, 148 46, 154 36 C 148 37, 138 39, 126 42 C 95 45, 45 46, 20 44 C 15 44, 13 50, 16 56 Z" 
                  fill="#181D26" 
                />
                <path 
                  d="M 18 45 C 45 47, 98 46, 128 41 C 138 39, 146 34, 150 28 C 140 27, 120 29, 95 32 C 55 35, 30 36, 18 36 C 14 36, 15 41, 18 45 Z" 
                  fill="#FFFFFF" 
                  stroke="#E2E8F0"
                  strokeWidth="0.8"
                />
                <path 
                  d="M 45 43 Q 75 42 110 38" 
                  stroke="#CBD5E1" 
                  strokeWidth="1.5" 
                  strokeLinecap="round" 
                />
                <path 
                  d="M 24 36 C 38 20, 56 14, 76 13 C 92 18, 106 23, 128 25 C 142 27, 148 30, 140 32 C 120 31, 55 35, 24 36 Z" 
                  fill="#DCE2EC" 
                />
                <path 
                  d="M 68 18 C 76 22, 88 26, 106 28 C 102 34, 90 35, 78 34 C 70 30, 66 24, 68 18 Z" 
                  fill="#C29B76" 
                />
                <path 
                  d="M 112 26 C 126 27, 142 29, 136 33 C 122 33, 110 30, 112 26 Z" 
                  fill="#F8FAFC" 
                />
                <path 
                  d="M 45 18 C 52 7, 66 3, 78 3 C 82 8, 85 14, 88 18 Z" 
                  fill="#FFFFFF" 
                />
                <line x1="60" y1="10" x2="72" y2="12" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="64" y1="14" x2="77" y2="16" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="68" y1="18" x2="82" y2="20" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" />
                <path 
                  d="M 32 28 C 30 20, 36 12, 48 10 C 45 18, 38 24, 32 28 Z" 
                  fill="#475569" 
                />
              </g>
            </svg>
          </div>

          {/* Lado Direito: Botão de Ação Destacado em Pílula Branca (Posicionado Confortavelmente com Margem) */}
          <div className="z-20 shrink-0 self-start lg:self-center pr-1 sm:pr-2">
            <button 
              onClick={onViewAll}
              className={`inline-flex items-center space-x-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-white hover:bg-slate-100 ${
                isOutubroRosa ? 'text-[#9D174D] hover:text-[#831843]' : 'text-[#002B70] hover:text-[#001E54]'
              } font-black text-xs sm:text-sm tracking-tight shadow-xl hover:shadow-2xl hover:shadow-white/20 active:scale-95 transition-all duration-200 cursor-pointer group/btn whitespace-nowrap`}
            >
              <span>Ver todos os calçados em saldão</span>
              <ArrowRight className={`w-4 h-4 stroke-[2.8] ${isOutubroRosa ? 'text-[#9D174D]' : 'text-[#002B70]'} group-hover/btn:translate-x-1.5 transition-transform shrink-0`} />
            </button>
          </div>

        </div>

        {/* Bloco Inferior: Barra de Confiança e Vantagens (4 Pilares em Código) */}
        <div className="pt-3 mt-3 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 text-left z-20">
          
          {/* Pilar 1: Entrega Rápida */}
          <div className="flex items-center space-x-2">
            <Truck className={`h-3.5 w-3.5 ${isOutubroRosa ? 'text-[#F472B6]' : 'text-[#38BDF8]'} shrink-0 stroke-[2.2]`} />
            <div>
              <h5 className="text-[10px] sm:text-[11px] font-bold text-white tracking-tight leading-none">
                Entrega Rápida
              </h5>
              <span className={`text-[8px] sm:text-[9px] ${isOutubroRosa ? 'text-pink-200/70' : 'text-sky-200/70'} leading-none`}>
                Para todo o Brasil
              </span>
            </div>
          </div>

          {/* Pilar 2: Compra Segura */}
          <div className="flex items-center space-x-2">
            <ShieldCheck className={`h-3.5 w-3.5 ${isOutubroRosa ? 'text-[#F472B6]' : 'text-[#38BDF8]'} shrink-0 stroke-[2.2]`} />
            <div>
              <h5 className="text-[10px] sm:text-[11px] font-bold text-white tracking-tight leading-none">
                Compra Segura
              </h5>
              <span className={`text-[8px] sm:text-[9px] ${isOutubroRosa ? 'text-pink-200/70' : 'text-sky-200/70'} leading-none`}>
                Seus dados protegidos
              </span>
            </div>
          </div>

          {/* Pilar 3: Parcele em até 10x */}
          <div className="flex items-center space-x-2">
            <CreditCard className={`h-3.5 w-3.5 ${isOutubroRosa ? 'text-[#F472B6]' : 'text-[#38BDF8]'} shrink-0 stroke-[2.2]`} />
            <div>
              <h5 className="text-[10px] sm:text-[11px] font-bold text-white tracking-tight leading-none">
                Parcele em até 10x
              </h5>
              <span className={`text-[8px] sm:text-[9px] ${isOutubroRosa ? 'text-pink-200/70' : 'text-sky-200/70'} leading-none`}>
                No cartão de crédito
              </span>
            </div>
          </div>

          {/* Pilar 4: Troca e Devolução */}
          <div className="flex items-center space-x-2">
            <RefreshCw className={`h-3.5 w-3.5 ${isOutubroRosa ? 'text-[#F472B6]' : 'text-[#38BDF8]'} shrink-0 stroke-[2.2]`} />
            <div>
              <h5 className="text-[10px] sm:text-[11px] font-bold text-white tracking-tight leading-none">
                Troca e Devolução
              </h5>
              <span className={`text-[8px] sm:text-[9px] ${isOutubroRosa ? 'text-pink-200/70' : 'text-sky-200/70'} leading-none`}>
                Sem complicação
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
