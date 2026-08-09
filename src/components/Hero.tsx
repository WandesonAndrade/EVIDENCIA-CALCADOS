import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
    collectionTag: 'Coleção Outono/Inverno 2025',
    title: 'Seu próximo passo começa aqui.',
    description: 'Conforto, estilo e atitude em cada detalhe.',
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1600&auto=format&fit=crop',
    buttonText: 'COMPRE AGORA',
    categoryFilter: 'TODOS'
  },
  {
    id: 2,
    collectionTag: 'Coleção Feminina 2025',
    title: 'Charme, sofisticação e conforto.',
    description: 'Sandálias, sapatilhas, saltos e acessórios refinados.',
    image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=1600&auto=format&fit=crop',
    buttonText: 'VER MODA FEMININA',
    categoryFilter: 'FEMININO'
  },
  {
    id: 3,
    collectionTag: 'Coleção Masculina 2025',
    title: 'Estilo moderno e robustez incomparável.',
    description: 'Sapatos sociais premium, botas e tênis de alta performance.',
    image: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?q=80&w=1600&auto=format&fit=crop',
    buttonText: 'EXPLORAR MASCULINO',
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
        collectionTag: b.badge || 'Coleção 2025',
        title: b.title,
        description: b.description,
        image: b.image,
        buttonText: b.buttonText || 'COMPRE AGORA',
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
      className="relative overflow-hidden rounded-2xl mx-4 sm:mx-6 lg:mx-8 my-6 min-h-[460px] sm:min-h-[500px] lg:h-[58vh] max-w-7xl lg:mx-auto select-none shadow-sm group/hero"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 h-full w-full min-h-[460px] sm:min-h-[500px] lg:h-[58vh]">
        
        {/* Esquerda: Conteúdo com Fundo Bege Nude Quente estilo Nordic */}
        <div className={`lg:col-span-5 flex flex-col justify-center p-8 sm:p-12 lg:p-14 z-20 ${
          isDark ? 'bg-slate-900 text-white' : 'bg-[#eae6df] text-[#111111]'
        }`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="space-y-6"
            >
              {/* Título Principal */}
              <h1 className="text-3xl sm:text-5xl lg:text-5xl font-black tracking-tight leading-[1.08]">
                {currentBanner.title}
              </h1>

              {/* Subtítulo */}
              <p className={`text-sm sm:text-base font-medium leading-relaxed max-w-md ${
                isDark ? 'text-slate-300' : 'text-neutral-700'
              }`}>
                {currentBanner.description}
              </p>

              {/* Botão de Ação Preto Sólido */}
              <div className="pt-2">
                <button
                  onClick={() => handleAction(currentBanner.categoryFilter)}
                  className={`inline-block text-xs sm:text-sm font-extrabold tracking-widest uppercase px-8 py-3.5 transition-all cursor-pointer shadow-xs ${
                    isDark 
                      ? 'bg-amber-400 text-black hover:bg-amber-300' 
                      : 'bg-[#111111] text-white hover:bg-neutral-800'
                  }`}
                >
                  {currentBanner.buttonText}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Direita: Fotografia Editorial de Moda/Calçado */}
        <div className="lg:col-span-7 relative h-64 sm:h-80 lg:h-full overflow-hidden bg-neutral-200">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
              className="absolute inset-0 w-full h-full"
            >
              <img 
                src={sanitizeUrl(currentBanner.image)} 
                alt={currentBanner.title} 
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            </motion.div>
          </AnimatePresence>

          {/* Etiqueta de Coleção no Topo Direito */}
          <div className="absolute top-6 right-6 z-20">
            <span className="text-xs font-semibold tracking-wider text-neutral-900 bg-white/80 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-xs">
              {currentBanner.collectionTag}
            </span>
          </div>

          {/* Indicador de Slides na Direita Inferior (01 —— 03) */}
          <div className="absolute bottom-6 right-6 z-20 flex items-center space-x-3 text-white font-mono text-xs font-bold tracking-widest bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full">
            <span>0{currentSlide + 1}</span>
            <span className="w-8 h-[2px] bg-white/70 inline-block" />
            <span>0{slides.length}</span>
          </div>

          {/* Botões de Controle Circulares Brancos (Setas Left/Right) */}
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-10 h-10 rounded-full bg-white/90 text-neutral-900 shadow-md hover:bg-white transition-all cursor-pointer"
            title="Anterior"
          >
            <ChevronLeft className="h-5 w-5 stroke-[2.5]" />
          </button>

          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-10 h-10 rounded-full bg-white/90 text-neutral-900 shadow-md hover:bg-white transition-all cursor-pointer"
            title="Próximo"
          >
            <ChevronRight className="h-5 w-5 stroke-[2.5]" />
          </button>
        </div>

      </div>
    </div>
  );
};
