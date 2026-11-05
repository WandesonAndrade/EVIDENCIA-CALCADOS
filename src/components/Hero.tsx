import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  ArrowRight, 
  ShoppingBag, 
  ShieldCheck, 
  Truck, 
  RefreshCw, 
  Shirt, 
  Play, 
  Pause 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { scrollToSectionWithOffset } from '../lib/scrollUtils';
import { sanitizeUrl } from '../lib/securityUtils';
import { 
  HeroSlide, 
  HeroSlideCTA, 
  DEFAULT_SLIDES, 
  buildSlidesFromBanners 
} from './products/utils/heroSlides';

// Re-exporta tipos para retrocompatibilidade
export type { HeroSlide, HeroSlideCTA };
export { DEFAULT_SLIDES };

export const Hero: React.FC = () => {
  const { 
    setSelectedCategory, 
    setSelectedSubcategory, 
    setSelectedMenuTab, 
    setCurrentView, 
    heroBanners,
    storeTheme,
    storeThemeTokens
  } = useApp();
  const heroTokens = storeThemeTokens.hero;

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isUserPaused, setIsUserPaused] = useState(false);
  const [hasUserNavigated, setHasUserNavigated] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  const isOutubroRosa = storeTheme === 'outubro-rosa';

  // Detecta preferência do sistema por redução de movimento (A11y WCAG 2.1)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const listener = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  // Processa dinamicamente os slides a partir do CMS ou dos padrões
  const slides: HeroSlide[] = useMemo(() => {
    return buildSlidesFromBanners(heroBanners);
  }, [heroBanners]);

  // Robustez de estado: se o número de slides diminuir (ex: banner removido no CMS), ajusta o índice
  useEffect(() => {
    if (currentSlide >= slides.length) {
      setCurrentSlide(Math.max(0, slides.length - 1));
    }
  }, [slides.length, currentSlide]);

  const handleNext = useCallback(() => {
    setHasUserNavigated(true);
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const handlePrev = useCallback(() => {
    setHasUserNavigated(true);
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Pré-carrega a imagem do próximo slide em background para transições suaves
  useEffect(() => {
    if (slides.length <= 1) return;
    const nextIdx = (currentSlide + 1) % slides.length;
    const nextImgUrl = slides[nextIdx]?.image;
    if (nextImgUrl) {
      const img = new Image();
      img.src = sanitizeUrl(nextImgUrl);
    }
  }, [currentSlide, slides]);

  // Rotacionador automático (6 segundos). Respeita pausa por hover, foco, toque, botão e reduced-motion
  useEffect(() => {
    if (slides.length <= 1 || prefersReducedMotion || isUserPaused) return;

    if (!isPaused) {
      autoplayTimerRef.current = setInterval(() => {
        setHasUserNavigated(true);
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, 6000);
    }

    return () => {
      if (autoplayTimerRef.current) {
        clearInterval(autoplayTimerRef.current);
      }
    };
  }, [isPaused, isUserPaused, slides.length, prefersReducedMotion]);

  // Handlers para gestos de swipe no mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsPaused(false);
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchStartXRef.current - touchEndX;

    // Distância mínima de 45px para acionar a troca de slide
    if (Math.abs(diffX) > 45) {
      if (diffX > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartXRef.current = null;
  };

  const currentBanner = slides[currentSlide] || slides[0];

  const handleCtaClick = (cta: HeroSlideCTA) => {
    switch (cta.action) {
      case 'offers':
        if (cta.targetParam && cta.targetParam.startsWith('promo:')) {
          if (setSelectedSubcategory) setSelectedSubcategory('TODAS');
          if (setSelectedCategory) setSelectedCategory('OFERTAS');
          if (setSelectedMenuTab) setSelectedMenuTab(cta.targetParam);
          if (setCurrentView) setCurrentView('category-page');
          setTimeout(() => {
            scrollToSectionWithOffset('category-all-items-section');
          }, 100);
        } else {
          if (setSelectedSubcategory) setSelectedSubcategory('TODAS');
          if (setSelectedCategory) setSelectedCategory('OFERTAS');
          if (setSelectedMenuTab) setSelectedMenuTab('ofertas');
          if (setCurrentView) setCurrentView('category-page');
          setTimeout(() => {
            scrollToSectionWithOffset('category-all-items-section');
          }, 100);
        }
        break;

      case 'category':
        if (cta.targetParam) {
          const param = cta.targetParam;
          if (param.startsWith('promo:')) {
            if (setSelectedSubcategory) setSelectedSubcategory('TODAS');
            if (setSelectedCategory) setSelectedCategory('OFERTAS');
            if (setSelectedMenuTab) setSelectedMenuTab(param);
            setCurrentView('category-page');
            setTimeout(() => {
              scrollToSectionWithOffset('category-all-items-section');
            }, 100);
          } else if (param.startsWith('subcategoria:')) {
            const parts = param.replace('subcategoria:', '').split(':');
            const subName = parts.length > 1 ? parts[1].trim() : parts[0].trim();
            const catName = parts.length > 1 ? parts[0].trim() : 'TODOS';
            setSelectedCategory(catName.toUpperCase(), subName);
            if (setSelectedMenuTab) setSelectedMenuTab(param);
            setCurrentView('category-page');
            setTimeout(() => {
              scrollToSectionWithOffset('category-all-items-section');
            }, 100);
          } else if (param.startsWith('categoria:')) {
            const catName = param.replace('categoria:', '').trim();
            setSelectedCategory(catName.toUpperCase(), 'TODAS');
            if (setSelectedMenuTab) setSelectedMenuTab(catName.toLowerCase());
            setCurrentView('category-page');
            setTimeout(() => {
              scrollToSectionWithOffset('category-all-items-section');
            }, 100);
          } else {
            setSelectedCategory(param.toUpperCase(), 'TODAS');
            if (setSelectedMenuTab) setSelectedMenuTab(param.toLowerCase());
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

  // Ícone do badge temático
  const renderBadgeIcon = (collectionTag: string) => {
    const upper = (collectionTag || '').toUpperCase();
    if (upper.includes('MASCULIN')) return <Shirt className={`w-3.5 h-3.5 ${heroTokens.trustIconColor} stroke-[2.2]`} />;
    if (upper.includes('FEMININ')) return <Sparkles className={`w-3.5 h-3.5 ${heroTokens.trustIconColor} stroke-[2.2]`} />;
    if (upper.includes('OFERTA') || upper.includes('DESCONTO') || upper.includes('BLACK')) return <Sparkles className={`w-3.5 h-3.5 text-amber-300 stroke-[2.2]`} />;
    return <ShoppingBag className={`w-3.5 h-3.5 ${heroTokens.trustIconColor} stroke-[2.2]`} />;
  };

  // Renderiza título bicolor acessível como h2 (h1 é reservado ao topo da vitrine)
  const renderTwoToneTitle = (title: string) => {
    const words = title.trim().split(/\s+/);
    if (words.length <= 2) {
      return (
        <h2 className="text-2xl min-[390px]:text-3xl sm:text-5xl lg:text-[52px] font-black tracking-tight leading-[1.08] text-white drop-shadow-sm">
          {title}
        </h2>
      );
    }

    const splitIndex = Math.ceil(words.length * 0.52);
    const firstPart = words.slice(0, splitIndex).join(' ');
    const secondPart = words.slice(splitIndex).join(' ');

    return (
      <h2 className="text-2xl min-[390px]:text-3xl sm:text-5xl lg:text-[52px] font-black tracking-tight leading-[1.06] text-white drop-shadow-sm">
        <span>{firstPart} </span>
        <span className={`${heroTokens.titleAccent} block sm:inline`}>{secondPart}</span>
      </h2>
    );
  };

  return (
    <section 
      id="hero-banner" 
      style={{ background: heroTokens.containerGradient }}
      role="region"
      aria-roledescription="carrossel"
      aria-label="Destaques e Coleções Principais"
      className={`relative overflow-hidden rounded-2xl sm:rounded-3xl mx-2.5 min-[390px]:mx-3 sm:mx-6 lg:mx-8 my-2.5 min-[390px]:my-3 sm:my-4 lg:my-6 min-h-[430px] min-[390px]:min-h-[460px] sm:min-h-[520px] lg:min-h-[560px] max-w-7xl lg:mx-auto select-none shadow-2xl transition-all duration-300 group/hero border ${
        `${heroTokens.containerBorder} ${heroTokens.containerBg}`
      }`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 1. Background Image Full: Fotografia de Produto em Alta Resolução */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={`img-${currentSlide}`}
            initial={hasUserNavigated && !prefersReducedMotion ? { opacity: 0, scale: 1.04 } : false}
            animate={{ opacity: 1, scale: 1 }}
            exit={!prefersReducedMotion ? { opacity: 0, scale: 0.98 } : { opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.1 : 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-full relative"
          >
            <img 
              src={sanitizeUrl(currentBanner.image)} 
              alt={currentBanner.title} 
              // Prioridade alta de carregamento no primeiro slide para otimizar LCP
              fetchPriority={currentSlide === 0 ? "high" : "auto"}
              loading={currentSlide === 0 ? "eager" : "lazy"}
              decoding="async"
              className="w-full h-full object-cover object-center lg:object-[82%_center]"
            />
            {/* Vinheta escura para garantir contraste sobre qualquer fundo */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 2. Painel Curvo com Linha de Luz Neon (Desktop) */}
      <div className="hidden lg:block absolute inset-y-0 left-0 w-[58%] xl:w-[54%] z-10 pointer-events-none" aria-hidden="true">
        <svg 
          className="w-full h-full" 
          viewBox="0 0 540 500" 
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="heroWaveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={heroTokens.curveStops[0]} />
              <stop offset="55%" stopColor={heroTokens.curveStops[1]} />
              <stop offset="100%" stopColor={heroTokens.curveStops[2]} />
            </linearGradient>
            <filter id="heroGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <path 
            d="M 0 0 L 430 0 C 465 60, 525 140, 525 225 C 525 320, 480 420, 395 500 L 0 500 Z" 
            fill="url(#heroWaveGrad)" 
          />
          <path 
            d="M 430 0 C 465 60, 525 140, 525 225 C 525 320, 480 420, 395 500" 
            fill="none" 
            stroke={heroTokens.curveNeonStroke} 
            strokeWidth="3.5" 
            filter="url(#heroGlow)"
          />
        </svg>
      </div>

      {/* 2.1 Overlay Mobile / Tablet com Gradiente Suave para máxima legibilidade */}
      <div 
        aria-hidden="true"
        className={`lg:hidden absolute inset-0 bg-gradient-to-r ${
          storeThemeTokens.isBlackFriday
            ? 'from-[#0A0A0A]/95 via-[#1A1408]/90 to-[#0A0A0A]/85'
            : isOutubroRosa
            ? 'from-[#4A062B]/95 via-[#780B44]/90 to-[#3B0422]/80'
            : 'from-[#001838]/95 via-[#00244F]/90 to-[#00132B]/80'
        } z-10 pointer-events-none`} 
      />

      {/* 3. Coluna de Conteúdo à Esquerda */}
      <div 
        className="relative z-20 flex flex-col justify-between h-full min-h-[430px] min-[390px]:min-h-[460px] sm:min-h-[520px] lg:min-h-[560px] p-4 min-[390px]:p-5 sm:p-10 lg:p-12 xl:p-14 w-full max-w-xl lg:max-w-[49%]"
        aria-live={isPaused || isUserPaused ? "polite" : "off"}
      >
        
        {/* Bloco Superior & Central */}
        <div className="space-y-3.5 sm:space-y-5 my-auto pt-1 sm:pt-2">
          {/* Badge da Coleção */}
          <motion.div 
            key={`tag-${currentSlide}`}
            initial={hasUserNavigated && !prefersReducedMotion ? { opacity: 0, y: 10 } : false}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center space-x-2"
          >
            <span className={`text-[10px] min-[390px]:text-[11px] font-extrabold tracking-wider uppercase px-3 min-[390px]:px-4 py-1.5 rounded-full border ${
              `${heroTokens.badgeBg} ${heroTokens.badgeText} ${heroTokens.badgeBorder}`
            } backdrop-blur-md shadow-xs inline-flex items-center space-x-1.5 min-[390px]:space-x-2`}>
              {renderBadgeIcon(currentBanner.collectionTag)}
              <span>{currentBanner.collectionTag}</span>
            </span>
          </motion.div>

          {/* Título Bicolor & Descrição */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`content-${currentSlide}`}
              initial={hasUserNavigated && !prefersReducedMotion ? { opacity: 0, y: 12 } : false}
              animate={{ opacity: 1, y: 0 }}
              exit={!prefersReducedMotion ? { opacity: 0, y: -8 } : { opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0.1 : 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-3 sm:space-y-4"
            >
              {renderTwoToneTitle(currentBanner.title)}

              <p className={`text-xs min-[390px]:text-[13px] sm:text-sm lg:text-base font-normal leading-relaxed ${
                heroTokens.trustTextColor
              } max-w-lg line-clamp-3 sm:line-clamp-none`}>
                {currentBanner.description}
              </p>

              {/* Botões de Ação Dinâmicos (CTAs) */}
              <div className="pt-2 sm:pt-3 flex flex-wrap items-center gap-2.5 sm:gap-3">
                {currentBanner.ctas.map((cta, idx) => {
                  if (cta.variant === 'outline') {
                    return (
                      <button
                        key={`cta-${idx}`}
                        type="button"
                        onClick={() => handleCtaClick(cta)}
                        className="inline-flex items-center justify-center text-[11px] min-[390px]:text-xs sm:text-sm font-semibold px-4 min-[390px]:px-5 sm:px-6 py-2.5 min-[390px]:py-3 rounded-full border border-white/30 text-white hover:bg-white/15 hover:border-white/50 active:scale-95 transition-all backdrop-blur-sm cursor-pointer space-x-1.5 sm:space-x-2 group/btn shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      >
                        <span>{cta.text}</span>
                        <ArrowRight className="w-3.5 h-3.5 stroke-[2.5] shrink-0 transition-transform group-hover/btn:translate-x-1" />
                      </button>
                    );
                  }

                  // Botão Primário Dinâmico
                  return (
                    <button
                      key={`cta-${idx}`}
                      type="button"
                      onClick={() => handleCtaClick(cta)}
                      className={`inline-flex items-center justify-center text-[11px] min-[390px]:text-xs sm:text-sm font-bold px-5 min-[390px]:px-6 sm:px-7 py-2.5 min-[390px]:py-3 rounded-full ${
                        `${heroTokens.ctaGradient} ${heroTokens.ctaText} ${heroTokens.ctaHover} ${heroTokens.ctaShadow}`
                      } active:scale-95 transition-all cursor-pointer space-x-1.5 sm:space-x-2 group/btn focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white`}
                    >
                      <span>{cta.text}</span>
                      <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5] shrink-0 transition-transform group-hover/btn:translate-x-1" />
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 4. Barra de Confiança Integrada no Rodapé do Banner */}
        <div className="pt-4 sm:pt-6 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-left">
          <div className="flex items-center space-x-2 min-[390px]:space-x-2.5">
            <Truck className={`h-4 w-4 ${heroTokens.trustIconColor} shrink-0 stroke-[2.2]`} />
            <div>
              <h3 className="text-[10px] min-[390px]:text-[11px] font-bold text-white tracking-tight leading-none">Entrega Rápida</h3>
              <span className={`text-[8.5px] min-[390px]:text-[9px] ${heroTokens.trustTextColor} leading-none`}>Para todo o Brasil</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 min-[390px]:space-x-2.5">
            <ShieldCheck className={`h-4 w-4 ${heroTokens.trustIconColor} shrink-0 stroke-[2.2]`} />
            <div>
              <h3 className="text-[10px] min-[390px]:text-[11px] font-bold text-white tracking-tight leading-none">Compra Segura</h3>
              <span className={`text-[8.5px] min-[390px]:text-[9px] ${heroTokens.trustTextColor} leading-none`}>Seus dados protegidos</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 min-[390px]:space-x-2.5">
            <ShoppingBag className={`h-4 w-4 ${heroTokens.trustIconColor} shrink-0 stroke-[2.2]`} />
            <div>
              <h3 className="text-[10px] min-[390px]:text-[11px] font-bold text-white tracking-tight leading-none">Parcele em até 10x</h3>
              <span className={`text-[8.5px] min-[390px]:text-[9px] ${heroTokens.trustTextColor} leading-none`}>No cartão de crédito</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 min-[390px]:space-x-2.5">
            <RefreshCw className={`h-4 w-4 ${heroTokens.trustIconColor} shrink-0 stroke-[2.2]`} />
            <div>
              <h3 className="text-[10px] min-[390px]:text-[11px] font-bold text-white tracking-tight leading-none">Troca e Devolução</h3>
              <span className={`text-[8.5px] min-[390px]:text-[9px] ${heroTokens.trustTextColor} leading-none`}>Sem complicação</span>
            </div>
          </div>
        </div>

      </div>

      {/* 5. Controles do Slider: Botões Anterior / Próximo */}
      <div className="hidden sm:flex absolute inset-y-0 right-0 left-auto lg:left-[51%] items-center justify-between px-4 sm:px-8 pointer-events-none z-30">
        <button
          type="button"
          onClick={handlePrev}
          className="pointer-events-auto w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-lg focus-visible:outline-2 focus-visible:outline-white"
          aria-label="Slide anterior"
        >
          <ChevronLeft className="h-5 w-5 stroke-[2.5]" />
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="pointer-events-auto w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-lg focus-visible:outline-2 focus-visible:outline-white"
          aria-label="Próximo slide"
        >
          <ChevronRight className="h-5 w-5 stroke-[2.5]" />
        </button>
      </div>

      {/* 6. Controles de Pausa Acessível e Indicadores de Paginação */}
      <div className="absolute bottom-4 right-4 sm:bottom-5 sm:right-8 z-30 flex items-center space-x-2">
        {/* Botão de pausa/reprodução acessível (WCAG 2.2.2) */}
        {slides.length > 1 && !prefersReducedMotion && (
          <button
            type="button"
            onClick={() => setIsUserPaused((prev) => !prev)}
            className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all cursor-pointer mr-1.5 focus-visible:outline-2 focus-visible:outline-white"
            aria-label={isUserPaused ? "Retomar rotação automática de banners" : "Pausar rotação automática de banners"}
            title={isUserPaused ? "Retomar" : "Pausar"}
          >
            {isUserPaused ? (
              <Play className="h-3 w-3 fill-current ml-0.5" />
            ) : (
              <Pause className="h-3 w-3 fill-current" />
            )}
          </button>
        )}

        {/* Indicadores com alvo de clique seguro */}
        {slides.map((slide, idx) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => {
              setHasUserNavigated(true);
              setCurrentSlide(idx);
            }}
            className="py-2 px-0.5 flex items-center cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
            aria-label={`Ir para slide ${idx + 1} de ${slides.length}: ${slide.collectionTag}`}
            aria-current={currentSlide === idx ? 'true' : undefined}
          >
            <span 
              className={`h-1.5 rounded-full transition-all duration-300 block ${
                currentSlide === idx 
                  ? heroTokens.indicatorActive
                  : 'w-4 bg-white/40 hover:bg-white/70'
              }`}
            />
          </button>
        ))}
      </div>
    </section>
  );
};
