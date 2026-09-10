import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight, CreditCard, ShoppingBag, ShieldCheck } from 'lucide-react';
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
  }
];

export const Hero: React.FC = () => {
  const { 
    setSelectedCategory, 
    setSelectedSubcategory, 
    setSelectedMenuTab, 
    setCurrentView, 
    theme, 
    heroBanners 
  } = useApp();

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isDark = theme === 'dark';

  // Processa dinamicamente múltiplos slides via array de objetos suportando CMS ou os banners padrão
  const slides: HeroSlide[] = useMemo(() => {
    if (heroBanners && heroBanners.filter(b => b.active).length > 0) {
      // Filtra banners ativos e descarta qualquer banner de crediário
      const activeBanners = heroBanners.filter(b => {
        if (!b.active) return false;
        const tab = (b.tabKey || '').toLowerCase();
        const badge = (b.badge || '').toLowerCase();
        const title = (b.title || '').toLowerCase();
        return tab !== 'meu-crediario' && !title.includes('crediário') && !title.includes('crediario') && !badge.includes('crediário');
      });

      if (activeBanners.length > 0) {
        return activeBanners.map((b, i) => {
          const tab = (b.tabKey || '').toLowerCase();
          const badgeText = b.badge || 'Coleção Evidência';
          const isOffers = tab === 'ofertas' || badgeText.toUpperCase().includes('OFERTA') || b.title.includes('50% OFF');

          // Limpeza de descrições que mencionavam crediário
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
          } else {
            ctas.push({
              text: b.buttonText || 'Comprar agora',
              action: 'category',
              targetParam: b.tabKey || 'TODOS',
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

          const isAmberBadge = isOffers || badgeText.toUpperCase().includes('CAMPANHA');

          return {
            id: b.id || i + 1,
            collectionTag: badgeText,
            title: b.title,
            description: cleanDesc,
            image: b.image,
            ctas,
            badgeVariant: isAmberBadge ? 'amber' : 'blue'
          };
        });
      }
    }
    return DEFAULT_SLIDES;
  }, [heroBanners]);

  useEffect(() => {
    if (!isPaused && slides.length > 0) {
      autoplayTimerRef.current = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % slides.length);
      }, 7000);
    }

    return () => {
      if (autoplayTimerRef.current) {
        clearInterval(autoplayTimerRef.current);
      }
    };
  }, [isPaused, slides.length]);

  if (!slides || slides.length === 0) return null;
  const currentBanner = slides[currentSlide] || slides[0];

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentSlide(prev => (prev + 1) % slides.length);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length);
  };

  const handleCtaClick = (cta: HeroSlideCTA) => {
    switch (cta.action) {
      case 'offers':
        setSelectedCategory('OFERTAS');
        if (setSelectedMenuTab) setSelectedMenuTab('ofertas');
        if (setSelectedSubcategory) setSelectedSubcategory('TODAS');
        setCurrentView('category-page');
        setTimeout(() => {
          scrollToSectionWithOffset('category-all-items-section');
        }, 100);
        break;

      case 'crediario':
        setCurrentView('meu-crediario');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;

      case 'category':
        if (cta.targetParam) {
          const norm = cta.targetParam.toLowerCase();
          if (norm === 'ofertas') {
            setSelectedCategory('OFERTAS');
            if (setSelectedMenuTab) setSelectedMenuTab('ofertas');
            if (setSelectedSubcategory) setSelectedSubcategory('TODAS');
            setCurrentView('category-page');
            setTimeout(() => {
              scrollToSectionWithOffset('category-all-items-section');
            }, 100);
          } else if (norm === 'meu-crediario' || norm === 'crediario') {
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

  const renderIcon = (icon?: string) => {
    switch (icon) {
      case 'credit':
        return <CreditCard className="w-4 h-4 stroke-[2.2] shrink-0" />;
      case 'sparkles':
        return <Sparkles className="w-4 h-4 stroke-[2.2] shrink-0" />;
      case 'bag':
        return <ShoppingBag className="w-4 h-4 stroke-[2.2] shrink-0" />;
      case 'arrow':
      default:
        return <ArrowRight className="w-4 h-4 stroke-[2.5] shrink-0 transition-transform group-hover/btn:translate-x-1" />;
    }
  };

  return (
    <div 
      id="hero-banner" 
      className="relative overflow-hidden rounded-3xl mx-4 sm:mx-6 lg:mx-8 my-4 lg:my-6 min-h-[500px] lg:min-h-[560px] max-w-7xl lg:mx-auto select-none shadow-md transition-all duration-300 group/hero border border-black/5 dark:border-white/10"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Fundo Azul Vibrante da Marca Evidência Calçados */}
      <div className={`absolute inset-0 transition-colors duration-500 ${
        isDark 
          ? 'bg-gradient-to-br from-[#020610] via-[#003B73] to-[#00509E]' 
          : 'bg-gradient-to-br from-[#003B73] via-[#006EDB] to-[#008CFF]'
      }`} />

      {/* Elementos sutis de brilho para profundidade visual */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none translate-y-1/2" />

      <div className="relative grid grid-cols-1 lg:grid-cols-12 h-full w-full z-10 min-h-[500px] lg:min-h-[560px]">
        
        {/* Esquerda: Tipografia e Botões de Ação (CTAs) de Alto Impacto */}
        <div className="lg:col-span-6 flex flex-col justify-between p-8 sm:p-12 lg:p-14 z-20">
          <div className="space-y-6 max-w-xl my-auto">
            {/* Tag / Badge de Coleção ou Campanha */}
            <motion.div 
              key={`tag-${currentSlide}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center space-x-2"
            >
              {currentBanner.badgeVariant === 'amber' ? (
                <span className="text-[11px] font-black tracking-wider uppercase px-4 py-1.5 rounded-full border bg-amber-400/20 text-amber-300 border-amber-400/40 backdrop-blur-md shadow-xs flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  <span>{currentBanner.collectionTag}</span>
                </span>
              ) : (
                <span className="text-[11px] font-bold tracking-wider uppercase px-3.5 py-1 rounded-full border bg-white/20 text-[#DDF1FF] border-white/30 backdrop-blur-md">
                  {currentBanner.collectionTag}
                </span>
              )}
            </motion.div>

            {/* Conteúdo Dinâmico: Título Principal e Descrição */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`content-${currentSlide}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-4"
              >
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] text-white drop-shadow-xs">
                  {currentBanner.title}
                </h1>

                <p className="text-base sm:text-lg font-medium leading-relaxed text-[#DDF1FF]">
                  {currentBanner.description}
                </p>

                {/* Botões de Ação Dinâmicos (CTAs) */}
                <div className="pt-4 flex flex-wrap items-center gap-3">
                  {currentBanner.ctas.map((cta, idx) => {
                    if (cta.variant === 'amber') {
                      return (
                        <button
                          key={`cta-${idx}`}
                          onClick={() => handleCtaClick(cta)}
                          className="inline-flex items-center justify-center text-sm font-black px-6 py-3.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-slate-950 hover:brightness-105 active:scale-95 transition-all shadow-md hover:shadow-amber-500/25 border border-amber-300/80 cursor-pointer space-x-2.5 group/btn"
                        >
                          {renderIcon(cta.icon)}
                          <span>{cta.text}</span>
                        </button>
                      );
                    }

                    if (cta.variant === 'outline') {
                      return (
                        <button
                          key={`cta-${idx}`}
                          onClick={() => handleCtaClick(cta)}
                          className="inline-flex items-center justify-center text-sm font-bold px-6 py-3.5 rounded-full border border-white/35 text-white hover:bg-white/15 active:scale-95 transition-all backdrop-blur-sm cursor-pointer space-x-2 group/btn"
                        >
                          <span>{cta.text}</span>
                          {renderIcon(cta.icon)}
                        </button>
                      );
                    }

                    // Botão Primário Padrão (Branco com texto azul institucional)
                    return (
                      <button
                        key={`cta-${idx}`}
                        onClick={() => handleCtaClick(cta)}
                        className="inline-flex items-center justify-center text-sm font-black px-6 py-3.5 rounded-full bg-white text-[#00509E] hover:bg-[#DDF1FF] hover:text-[#003B73] active:scale-95 transition-all shadow-md hover:shadow-lg cursor-pointer space-x-2.5 group/btn"
                      >
                        <span>{cta.text}</span>
                        {renderIcon(cta.icon)}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Indicadores de Banner estilo Apple Dots */}
          <div className="pt-6 flex items-center space-x-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  currentSlide === idx 
                    ? 'w-8 bg-amber-400' 
                    : isDark ? 'w-2 bg-white/25 hover:bg-white/45' : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Ir para slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Direita: Fotografia de Produto de Alto Impacto */}
        <div className="lg:col-span-6 relative h-72 sm:h-96 lg:h-full overflow-hidden flex items-center justify-center p-6 lg:p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={`img-${currentSlide}`}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full h-full flex items-center justify-center"
            >
              <img 
                src={sanitizeUrl(currentBanner.image)} 
                alt={currentBanner.title} 
                className="w-full h-full object-cover object-center rounded-2xl shadow-lg border border-black/5 dark:border-white/10"
              />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/35 via-transparent to-transparent pointer-events-none" />
            </motion.div>
          </AnimatePresence>

          {/* Botões de Navegação discretos com Glassmorphism */}
          <div className="absolute bottom-6 right-6 z-30 flex items-center space-x-2">
            <button
              onClick={handlePrev}
              className={`p-2.5 rounded-full backdrop-blur-xl border transition-all cursor-pointer ${
                isDark 
                  ? 'bg-black/50 border-white/15 text-white hover:bg-black/70' 
                  : 'bg-white/80 border-black/10 text-neutral-900 hover:bg-white'
              }`}
              title="Anterior"
            >
              <ChevronLeft className="h-4 w-4 stroke-[2.5]" />
            </button>

            <button
              onClick={handleNext}
              className={`p-2.5 rounded-full backdrop-blur-xl border transition-all cursor-pointer ${
                isDark 
                  ? 'bg-black/50 border-white/15 text-white hover:bg-black/70' 
                  : 'bg-white/80 border-black/10 text-neutral-900 hover:bg-white'
              }`}
              title="Próximo"
            >
              <ChevronRight className="h-4 w-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
