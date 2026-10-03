import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  ArrowRight, 
  CreditCard, 
  ShoppingBag, 
  ShieldCheck, 
  Truck, 
  RefreshCw, 
  Shirt, 
  BookOpen 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { scrollToSectionWithOffset } from '../lib/scrollUtils';
import { sanitizeUrl } from '../lib/securityUtils';

export interface HeroSlideCTA {
  text: string;
  action: 'offers' | 'crediario' | 'category' | 'catalog';
  targetParam?: string;
  variant?: 'primary' | 'amber' | 'outline';
  icon?: 'arrow' | 'credit' | 'sparkles' | 'bag';
}

export interface HeroSlide {
  id: string | number;
  collectionTag: string;
  title: string;
  description: string;
  image: string;
  ctas: HeroSlideCTA[];
  badgeVariant?: 'amber' | 'blue' | 'default';
}

export const DEFAULT_SLIDES: HeroSlide[] = [
  {
    id: 'banner-masculino',
    collectionTag: 'COLEÇÃO MASCULINA',
    title: 'Estilo moderno e robustez incomparável.',
    description: 'Sapatos sociais premium, botas indestrutíveis e tênis de alta performance para o homem contemporâneo que valoriza design e atitude.',
    image: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?q=80&w=1600&auto=format&fit=crop',
    badgeVariant: 'blue',
    ctas: [
      {
        text: 'Explorar Linha Masculina',
        action: 'category',
        targetParam: 'MASCULINO',
        variant: 'primary',
        icon: 'arrow'
      },
      {
        text: 'Ver Catálogo Completo',
        action: 'catalog',
        variant: 'outline',
        icon: 'arrow'
      }
    ]
  },
  {
    id: 'banner-feminino',
    collectionTag: 'COLEÇÃO FEMININA',
    title: 'Charme, sofisticação e conforto extremo.',
    description: 'Encontre sandálias, sapatilhas, saltos e acessórios refinados criados especialmente para destacar a sua personalidade única.',
    image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=1600&auto=format&fit=crop',
    badgeVariant: 'blue',
    ctas: [
      {
        text: 'Ver Moda Feminina',
        action: 'category',
        targetParam: 'FEMININO',
        variant: 'primary',
        icon: 'arrow'
      },
      {
        text: 'Ver Catálogo Completo',
        action: 'catalog',
        variant: 'outline',
        icon: 'arrow'
      }
    ]
  },
  {
    id: 'banner-ofertas',
    collectionTag: 'CAMPANHA DE OFERTAS',
    title: 'Super Descontos de até 50% OFF',
    description: 'Chegou o momento de adquirir aquele calçado desejado com preços incríveis e condições especiais. Aproveite as melhores promoções da loja!',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=1600&auto=format&fit=crop',
    badgeVariant: 'amber',
    ctas: [
      {
        text: 'Aproveitar Ofertas',
        action: 'offers',
        variant: 'primary',
        icon: 'arrow'
      },
      {
        text: 'Ver Catálogo Completo',
        action: 'catalog',
        variant: 'outline',
        icon: 'arrow'
      }
    ]
  }
];

export const Hero: React.FC = () => {
  const { 
    setSelectedCategory, 
    setSelectedSubcategory, 
    setSelectedMenuTab, 
    setCurrentView, 
    theme, 
    heroBanners,
    storeTheme
  } = useApp();

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isDark = theme === 'dark';
  const isOutubroRosa = storeTheme === 'outubro-rosa';

  // Processa dinamicamente múltiplos slides via array de objetos suportando CMS ou os banners padrão
  const slides: HeroSlide[] = useMemo(() => {
    if (heroBanners && heroBanners.filter(b => b.active).length > 0) {
      // Filtra banners ativos e descarta qualquer menção invasiva de crediário
      const activeBanners = heroBanners.filter(b => {
        if (!b.active) return false;
        const tab = (b.tabKey || '').toLowerCase();
        const badge = (b.badge || '').toLowerCase();
        const title = (b.title || '').toLowerCase();
        return tab !== 'meu-crediario' && !title.includes('crediário') && !title.includes('crediario') && !badge.includes('crediário');
      });

      if (activeBanners.length > 0) {
        return activeBanners.map((b) => {
          const tab = (b.tabKey || '').toLowerCase();
          const badgeText = b.badge || 'Coleção Evidência';
          const isOffers = tab === 'ofertas' || badgeText.toUpperCase().includes('OFERTA') || b.title.includes('50% OFF');

          const cleanDesc = (b.description || '')
            .replace(/no Crediário Próprio Evidência\.?/gi, 'na Evidência Calçados.')
            .replace(/Conheça nosso novo Crediário Próprio e solicite sua análise de crédito!?/gi, 'Aproveite as melhores promoções da loja!');

          const ctas: HeroSlideCTA[] = [];

          if (isOffers) {
            ctas.push({
              text: b.buttonText || 'Aproveitar Ofertas',
              action: 'offers',
              variant: 'primary',
              icon: 'arrow'
            });
            ctas.push({
              text: 'Ver Catálogo Completo',
              action: 'catalog',
              variant: 'outline',
              icon: 'arrow'
            });
          } else if (tab === 'feminino' || badgeText.toUpperCase().includes('FEMININ')) {
            ctas.push({
              text: b.buttonText || 'Ver Moda Feminina',
              action: 'category',
              targetParam: 'FEMININO',
              variant: 'primary',
              icon: 'arrow'
            });
            ctas.push({
              text: 'Ver Catálogo Completo',
              action: 'catalog',
              variant: 'outline',
              icon: 'arrow'
            });
          } else if (tab === 'masculino' || badgeText.toUpperCase().includes('MASCULIN')) {
            ctas.push({
              text: b.buttonText || 'Explorar Linha Masculina',
              action: 'category',
              targetParam: 'MASCULINO',
              variant: 'primary',
              icon: 'arrow'
            });
            ctas.push({
              text: 'Ver Catálogo Completo',
              action: 'catalog',
              variant: 'outline',
              icon: 'arrow'
            });
          } else {
            ctas.push({
              text: b.buttonText || 'Conferir Coleção',
              action: 'catalog',
              variant: 'primary',
              icon: 'arrow'
            });
            ctas.push({
              text: 'Ver Catálogo Completo',
              action: 'catalog',
              variant: 'outline',
              icon: 'arrow'
            });
          }

          return {
            id: b.id,
            collectionTag: badgeText,
            title: b.title,
            description: cleanDesc,
            image: b.image || 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?q=80&w=1600&auto=format&fit=crop',
            badgeVariant: isOffers ? 'amber' : 'blue',
            ctas
          };
        });
      }
    }

    return DEFAULT_SLIDES;
  }, [heroBanners]);

  // Rotacionador automático de banners com pause no hover (6 segundos)
  useEffect(() => {
    if (slides.length <= 1) return;

    if (!isPaused) {
      autoplayTimerRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, 6000);
    }

    return () => {
      if (autoplayTimerRef.current) {
        clearInterval(autoplayTimerRef.current);
      }
    };
  }, [isPaused, slides.length]);

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const currentBanner = slides[currentSlide] || slides[0];

  const handleCtaClick = (cta: HeroSlideCTA) => {
    switch (cta.action) {
      case 'offers':
        if (setSelectedSubcategory) setSelectedSubcategory('TODAS');
        if (setSelectedCategory) setSelectedCategory('OFERTAS');
        if (setSelectedMenuTab) setSelectedMenuTab('ofertas');
        if (setCurrentView) setCurrentView('category-page');
        setTimeout(() => {
          scrollToSectionWithOffset('category-all-items-section');
        }, 100);
        break;

      case 'category':
        if (cta.targetParam) {
          if (cta.targetParam.toLowerCase() === 'meu-crediario') {
            setCurrentView('meu-crediario');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            setSelectedCategory(cta.targetParam.toUpperCase());
            if (setSelectedMenuTab) setSelectedMenuTab(cta.targetParam.toLowerCase());
            setCurrentView('category-page');
            setTimeout(() => {
              scrollToSectionWithOffset('category-all-items-section');
            }, 100);
          }
        } else {
          setSelectedCategory('TODOS');
          if (setCurrentView) setCurrentView('home');
          setTimeout(() => {
            scrollToSectionWithOffset('catalog-products-section');
          }, 100);
        }
        break;

      case 'catalog':
      default:
        setSelectedCategory('TODOS');
        if (setSelectedMenuTab) setSelectedMenuTab('todos');
        if (setCurrentView) setCurrentView('home');
        setTimeout(() => {
          scrollToSectionWithOffset('catalog-products-section');
        }, 100);
        break;
    }
  };

  // Helper para renderizar ícone do badge
  const renderBadgeIcon = (collectionTag: string) => {
    const upper = (collectionTag || '').toUpperCase();
    if (upper.includes('MASCULIN')) return <Shirt className={`w-3.5 h-3.5 ${isOutubroRosa ? 'text-pink-300' : 'text-blue-300'} stroke-[2.2]`} />;
    if (upper.includes('FEMININ')) return <Sparkles className="w-3.5 h-3.5 text-pink-300 stroke-[2.2]" />;
    if (upper.includes('OFERTA') || upper.includes('DESCONTO')) return <Sparkles className="w-3.5 h-3.5 text-amber-300 stroke-[2.2]" />;
    return <ShoppingBag className={`w-3.5 h-3.5 ${isOutubroRosa ? 'text-pink-300' : 'text-blue-300'} stroke-[2.2]`} />;
  };

  // Helper para renderizar título com duas cores (branco + tom vibrante de destaque)
  const renderTwoToneTitle = (title: string) => {
    const words = title.trim().split(/\s+/);
    if (words.length <= 2) {
      return (
        <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-black tracking-tight leading-[1.08] text-white drop-shadow-sm">
          {title}
        </h1>
      );
    }

    // Quebra equilibrada: primeira parte branca e parte final no tom do tema
    const splitIndex = Math.ceil(words.length * 0.52);
    const firstPart = words.slice(0, splitIndex).join(' ');
    const secondPart = words.slice(splitIndex).join(' ');

    return (
      <h1 className="text-3xl sm:text-5xl lg:text-[52px] font-black tracking-tight leading-[1.06] text-white drop-shadow-sm">
        <span>{firstPart} </span>
        <span className={`${isOutubroRosa ? 'text-[#FF2D78]' : 'text-[#0084FF]'} block sm:inline`}>{secondPart}</span>
      </h1>
    );
  };

  return (
    <div 
      id="hero-banner" 
      className={`relative overflow-hidden rounded-3xl mx-4 sm:mx-6 lg:mx-8 my-4 lg:my-6 min-h-[490px] sm:min-h-[520px] lg:min-h-[560px] max-w-7xl lg:mx-auto select-none shadow-2xl transition-all duration-300 group/hero border ${
        isOutubroRosa ? 'border-pink-900/30 bg-[#240316]' : 'border-blue-900/20 bg-[#001736]'
      }`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 1. Background Image Full: Fotografia de Produto em Alta Resolução */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={`img-${currentSlide}`}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-full relative"
          >
            <img 
              src={sanitizeUrl(currentBanner.image)} 
              alt={currentBanner.title} 
              className="w-full h-full object-cover object-center lg:object-[82%_center]"
            />
            {/* Vinheta escura no rodapé do produto */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent pointer-events-none" />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 2. Painel Curvo com Linha de Luz Neon (Desktop) */}
      <div className="hidden lg:block absolute inset-y-0 left-0 w-[58%] xl:w-[54%] z-10 pointer-events-none">
        <svg 
          className="w-full h-full" 
          viewBox="0 0 540 500" 
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="heroWaveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isOutubroRosa ? '#240316' : '#001838'} />
              <stop offset="55%" stopColor={isOutubroRosa ? '#450727' : '#00244F'} />
              <stop offset="100%" stopColor={isOutubroRosa ? '#1C0211' : '#00132B'} />
            </linearGradient>
            <filter id="heroGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          {/* Fundo Sólido até a Curva */}
          <path 
            d="M 0 0 L 430 0 C 465 60, 525 140, 525 225 C 525 320, 480 420, 395 500 L 0 500 Z" 
            fill="url(#heroWaveGrad)" 
          />
          {/* Linha Curva com Brilho Neon */}
          <path 
            d="M 430 0 C 465 60, 525 140, 525 225 C 525 320, 480 420, 395 500" 
            fill="none" 
            stroke={isOutubroRosa ? '#FF2D78' : '#0071E3'} 
            strokeWidth="3.5" 
            filter="url(#heroGlow)"
          />
        </svg>
      </div>

      {/* 2.1 Overlay Mobile / Tablet com Gradiente Suave */}
      <div className={`lg:hidden absolute inset-0 bg-gradient-to-r ${
        isOutubroRosa
          ? 'from-[#240316]/95 via-[#450727]/90 to-[#1C0211]/80'
          : 'from-[#001838]/95 via-[#00244F]/90 to-[#00132B]/80'
      } z-10 pointer-events-none`} />

      {/* 3. Coluna de Conteúdo à Esquerda */}
      <div className="relative z-20 flex flex-col justify-between h-full min-h-[490px] sm:min-h-[520px] lg:min-h-[560px] p-6 sm:p-10 lg:p-12 xl:p-14 max-w-xl lg:max-w-[49%]">
        
        {/* Bloco Superior & Central */}
        <div className="space-y-5 my-auto pt-2">
          {/* Badge da Coleção */}
          <motion.div 
            key={`tag-${currentSlide}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center space-x-2"
          >
            <span className={`text-[11px] font-extrabold tracking-wider uppercase px-4 py-1.5 rounded-full border ${
              isOutubroRosa
                ? 'bg-[#4D072C]/80 text-[#FFE4F0] border-[#FF2D78]/50'
                : 'bg-[#00224C]/80 text-[#DDF1FF] border-[#0071E3]/50'
            } backdrop-blur-md shadow-xs inline-flex items-center space-x-2`}>
              {renderBadgeIcon(currentBanner.collectionTag)}
              <span>{currentBanner.collectionTag}</span>
            </span>
          </motion.div>

          {/* Título Bicolor & Descrição */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`content-${currentSlide}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-4"
            >
              {renderTwoToneTitle(currentBanner.title)}

              <p className={`text-xs sm:text-sm lg:text-base font-normal leading-relaxed ${
                isOutubroRosa ? 'text-[#FFE4F0]/90' : 'text-[#DDF1FF]/90'
              } max-w-lg`}>
                {currentBanner.description}
              </p>

              {/* Botões de Ação Dinâmicos (CTAs) */}
              <div className="pt-3 flex flex-wrap items-center gap-3">
                {currentBanner.ctas.map((cta, idx) => {
                  if (cta.variant === 'outline') {
                    return (
                      <button
                        key={`cta-${idx}`}
                        onClick={() => handleCtaClick(cta)}
                        className="inline-flex items-center justify-center text-xs sm:text-sm font-semibold px-5 sm:px-6 py-3 rounded-full border border-white/25 text-white hover:bg-white/10 hover:border-white/40 active:scale-95 transition-all backdrop-blur-sm cursor-pointer space-x-2 group/btn shadow-xs"
                      >
                        <BookOpen className="w-4 h-4 stroke-[2] shrink-0" />
                        <span>{cta.text}</span>
                        <ArrowRight className="w-3.5 h-3.5 stroke-[2.5] shrink-0 transition-transform group-hover/btn:translate-x-1" />
                      </button>
                    );
                  }

                  // Botão Primário Dinâmico (Azul vs Outubro Rosa)
                  return (
                    <button
                      key={`cta-${idx}`}
                      onClick={() => handleCtaClick(cta)}
                      className={`inline-flex items-center justify-center text-xs sm:text-sm font-bold px-6 sm:px-7 py-3 rounded-full ${
                        isOutubroRosa
                          ? 'bg-gradient-to-r from-[#E11D48] to-[#FF2D78] hover:from-[#BE123C] hover:to-[#E11D48] text-white shadow-lg shadow-pink-600/30'
                          : 'bg-[#0071E3] hover:bg-[#005fb8] text-white shadow-lg shadow-blue-600/30'
                      } active:scale-95 transition-all cursor-pointer space-x-2 group/btn`}
                    >
                      <span>{cta.text}</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5] shrink-0 transition-transform group-hover/btn:translate-x-1" />
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 4. Barra de Confiança Integrada no Rodapé do Banner */}
        <div className="pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
          <div className="flex items-center space-x-2.5">
            <Truck className={`h-4 w-4 ${isOutubroRosa ? 'text-[#FF2D78]' : 'text-[#0084FF]'} shrink-0 stroke-[2.2]`} />
            <div>
              <h5 className="text-[10px] sm:text-[11px] font-bold text-white tracking-tight leading-none">Entrega Rápida</h5>
              <span className={`text-[8px] sm:text-[9px] ${isOutubroRosa ? 'text-[#FFE4F0]/70' : 'text-[#DDF1FF]/70'} leading-none`}>Para todo o Brasil</span>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <ShieldCheck className={`h-4 w-4 ${isOutubroRosa ? 'text-[#FF2D78]' : 'text-[#0084FF]'} shrink-0 stroke-[2.2]`} />
            <div>
              <h5 className="text-[10px] sm:text-[11px] font-bold text-white tracking-tight leading-none">Compra Segura</h5>
              <span className={`text-[8px] sm:text-[9px] ${isOutubroRosa ? 'text-[#FFE4F0]/70' : 'text-[#DDF1FF]/70'} leading-none`}>Seus dados protegidos</span>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <CreditCard className={`h-4 w-4 ${isOutubroRosa ? 'text-[#FF2D78]' : 'text-[#0084FF]'} shrink-0 stroke-[2.2]`} />
            <div>
              <h5 className="text-[10px] sm:text-[11px] font-bold text-white tracking-tight leading-none">Parcele em até 12x</h5>
              <span className={`text-[8px] sm:text-[9px] ${isOutubroRosa ? 'text-[#FFE4F0]/70' : 'text-[#DDF1FF]/70'} leading-none`}>No cartão de crédito</span>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <RefreshCw className={`h-4 w-4 ${isOutubroRosa ? 'text-[#FF2D78]' : 'text-[#0084FF]'} shrink-0 stroke-[2.2]`} />
            <div>
              <h5 className="text-[10px] sm:text-[11px] font-bold text-white tracking-tight leading-none">Troca e Devolução</h5>
              <span className={`text-[8px] sm:text-[9px] ${isOutubroRosa ? 'text-[#FFE4F0]/70' : 'text-[#DDF1FF]/70'} leading-none`}>Sem complicação</span>
            </div>
          </div>
        </div>

      </div>

      {/* 5. Controles do Slider: Botões de Navegação discretos com Glassmorphism */}
      <div className="absolute inset-y-0 right-0 left-auto lg:left-[51%] flex items-center justify-between px-4 sm:px-8 pointer-events-none z-30">
        <button
          onClick={handlePrev}
          className="pointer-events-auto w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/15 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-lg"
          title="Anterior"
        >
          <ChevronLeft className="h-5 w-5 stroke-[2.5]" />
        </button>

        <button
          onClick={handleNext}
          className="pointer-events-auto w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/15 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-lg"
          title="Próximo"
        >
          <ChevronRight className="h-5 w-5 stroke-[2.5]" />
        </button>
      </div>

      {/* 6. Indicadores em Barras Elegantes no Canto Inferior Direito */}
      <div className="absolute bottom-5 right-6 sm:right-10 z-30 flex items-center space-x-2">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentSlide(idx)}
            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
              currentSlide === idx 
                ? (isOutubroRosa ? 'w-9 bg-[#FF2D78] shadow-sm shadow-pink-500/50' : 'w-9 bg-[#0084FF] shadow-sm shadow-blue-500/50')
                : 'w-6 bg-white/30 hover:bg-white/60'
            }`}
            aria-label={`Ir para slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

