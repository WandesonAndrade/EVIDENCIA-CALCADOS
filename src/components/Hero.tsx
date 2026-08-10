import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { scrollToSectionWithOffset } from '../lib/scrollUtils';
import { sanitizeUrl } from '../lib/securityUtils';

interface Slide {
  id: number;
  collectionTag: string;
  title: string;
  description: string;
  image: string;
  buttonText: string;
  categoryFilter: string;
}

const SLIDES: Slide[] = [
  {
    id: 1,
    collectionTag: 'Lançamento Exclusivo 2025',
    title: 'Engenharia do Conforto. Design Inconfundível.',
    description: 'Calçados projetados com precisão anatômica para elevar cada passo do seu dia.',
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1600&auto=format&fit=crop',
    buttonText: 'Comprar agora',
    categoryFilter: 'TODOS'
  },
  {
    id: 2,
    collectionTag: 'Linha Feminina Premium',
    title: 'Leveza. Sofisticação. Elegância sem Esforço.',
    description: 'Sandálias, saltos e sapatilhas confeccionadas com materiais nobres e acabamento artesanal.',
    image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=1600&auto=format&fit=crop',
    buttonText: 'Explorar Feminino',
    categoryFilter: 'FEMININO'
  },
  {
    id: 3,
    collectionTag: 'Coleção Masculina Urban',
    title: 'Robustez e Alta Performance.',
    description: 'Sapatos sociais refinados, botas de couro legítimo e tênis tecnológicos.',
    image: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?q=80&w=1600&auto=format&fit=crop',
    buttonText: 'Explorar Masculino',
    categoryFilter: 'MASCULINO'
  }
];

export const Hero: React.FC = () => {
  const { setSelectedCategory, setCurrentView, theme, heroBanners } = useApp();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isDark = theme === 'dark';

  const slides = heroBanners && heroBanners.filter(b => b.active).length > 0
    ? heroBanners.filter(b => b.active).map((b, i) => ({
        id: i + 1,
        collectionTag: b.badge || 'Coleção Evidência 2025',
        title: b.title,
        description: b.description,
        image: b.image,
        buttonText: b.buttonText || 'Comprar agora',
        categoryFilter: b.tabKey || 'TODOS'
      }))
    : SLIDES;

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

  const handleAction = (categoryFilter: string) => {
    setSelectedCategory(categoryFilter.toUpperCase());
    if (setCurrentView) setCurrentView('home');
    setTimeout(() => {
      scrollToSectionWithOffset('catalog-products-section');
    }, 100);
  };

  return (
    <div 
      id="hero-banner" 
      className="relative overflow-hidden rounded-3xl mx-4 sm:mx-6 lg:mx-8 my-4 lg:my-6 min-h-[500px] lg:min-h-[560px] max-w-7xl lg:mx-auto select-none shadow-sm transition-all duration-300 group/hero border border-black/5 dark:border-white/10"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Apple-style background canvas */}
      <div className={`absolute inset-0 transition-colors duration-500 ${
        isDark 
          ? 'bg-gradient-to-br from-[#0B0F19] via-[#111827] to-[#030712]' 
          : 'bg-gradient-to-br from-[#fbfbfd] via-[#f5f5f7] to-[#e8e8ed]'
      }`} />

      <div className="relative grid grid-cols-1 lg:grid-cols-12 h-full w-full z-10 min-h-[500px] lg:min-h-[560px]">
        
        {/* Esquerda: Tipografia Apple - Título limpo, tag elegante e botões pílula */}
        <div className="lg:col-span-6 flex flex-col justify-between p-8 sm:p-12 lg:p-14 z-20">
          <div className="space-y-6 max-w-xl my-auto">
            {/* Tag de Coleção Apple Pill */}
            <motion.div 
              key={`tag-${currentSlide}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center space-x-2"
            >
              <span className={`text-[11px] font-semibold tracking-wider uppercase px-3.5 py-1 rounded-full border backdrop-blur-md ${
                isDark 
                  ? 'bg-white/10 text-white/90 border-white/20' 
                  : 'bg-black/5 text-neutral-800 border-black/10'
              }`}>
                {currentBanner.collectionTag}
              </span>
            </motion.div>

            {/* Título Principal estilo Apple */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`content-${currentSlide}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-4"
              >
                <h1 className={`text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] ${
                  isDark ? 'text-white' : 'text-[#1d1d1f]'
                }`}>
                  {currentBanner.title}
                </h1>

                <p className={`text-base sm:text-lg font-normal leading-relaxed ${
                  isDark ? 'text-slate-300' : 'text-[#86868b]'
                }`}>
                  {currentBanner.description}
                </p>

                {/* Botões de Ação estilo Apple Pill */}
                <div className="pt-4 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => handleAction(currentBanner.categoryFilter)}
                    className="inline-flex items-center justify-center text-sm font-semibold px-6 py-3 rounded-full bg-[#0071e3] text-white hover:bg-[#0077ed] active:scale-95 transition-all shadow-sm cursor-pointer space-x-2"
                  >
                    <span>{currentBanner.buttonText}</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </button>

                  <button
                    onClick={() => handleAction('TODOS')}
                    className={`inline-flex items-center justify-center text-sm font-medium px-6 py-3 rounded-full border transition-all cursor-pointer ${
                      isDark
                        ? 'border-white/20 text-white hover:bg-white/10'
                        : 'border-black/15 text-[#1d1d1f] hover:bg-black/5'
                    }`}
                  >
                    Ver Catálogo Completo
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Indicador de Banner estilo Apple dots */}
          <div className="pt-6 flex items-center space-x-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  currentSlide === idx 
                    ? 'w-8 bg-[#0071e3]' 
                    : isDark ? 'w-2 bg-white/20 hover:bg-white/40' : 'w-2 bg-black/20 hover:bg-black/40'
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
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
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

