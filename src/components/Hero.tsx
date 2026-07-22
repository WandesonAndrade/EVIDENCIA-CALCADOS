import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Slide {
  id: number;
  badge: string;
  title: string;
  description: string;
  image: string;
  buttonText: string;
  tabKey: string;
}

const SLIDES: Slide[] = [
  {
    id: 1,
    badge: 'NOVA COLEÇÃO 2026',
    title: 'Elegância que caminha com você.',
    description: 'Descubra a seleção exclusiva de calçados premium com o conforto que seus pés merecem e as condições que só a Evidência oferece.',
    image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=1600&auto=format&fit=crop',
    buttonText: 'Ver Lançamentos',
    tabKey: 'lançamentos'
  },
  {
    id: 2,
    badge: 'COLEÇÃO FEMININA',
    title: 'Charme, sofisticação e conforto extremo.',
    description: 'Encontre sandálias, sapatilhas, saltos e acessórios refinados criados especialmente para destacar a sua personalidade única.',
    image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=1600&auto=format&fit=crop',
    buttonText: 'Ver Moda Feminina',
    tabKey: 'feminino'
  },
  {
    id: 3,
    badge: 'COLEÇÃO MASCULINA',
    title: 'Estilo moderno e robustez incomparável.',
    description: 'Sapatos sociais premium, botas indestrutíveis e tênis de alta performance para o homem contemporâneo que valoriza design e atitude.',
    image: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?q=80&w=1600&auto=format&fit=crop',
    buttonText: 'Explorar Linha Masculina',
    tabKey: 'masculino'
  },
  {
    id: 4,
    badge: 'CAMPANHA DE OFERTAS',
    title: 'Super Descontos de até 50% OFF.',
    description: 'Chegou o momento de adquirir aquele calçado desejado com preços incríveis e parcelamento facilitado no Crediário Próprio Evidência.',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=1600&auto=format&fit=crop',
    buttonText: 'Aproveitar Ofertas',
    tabKey: 'ofertas'
  }
];

export const Hero: React.FC = () => {
  const { setSelectedMenuTab, setCurrentView, theme } = useApp();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-play effect
  useEffect(() => {
    if (!isPaused) {
      autoplayTimerRef.current = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % SLIDES.length);
      }, 6000);
    }

    return () => {
      if (autoplayTimerRef.current) {
        clearInterval(autoplayTimerRef.current);
      }
    };
  }, [isPaused]);

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlide(prev => (prev + 1) % SLIDES.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlide(prev => (prev - 1 + SLIDES.length) % SLIDES.length);
  };

  const handleDotClick = (index: number) => {
    setCurrentSlide(index);
  };

  const handleSlideAction = (tabKey: string) => {
    setSelectedMenuTab(tabKey);
    setCurrentView('category-page');
    
    // Scroll smoothly to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div 
      id="hero-banner" 
      className="relative bg-slate-950 text-white overflow-hidden rounded-2xl mx-4 sm:mx-6 lg:mx-8 my-6 h-[400px] sm:h-[420px] md:h-[460px] group/hero shadow-xl border border-slate-900"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background Slides with crossfade animation */}
      <div className="absolute inset-0 w-full h-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            className="absolute inset-0 w-full h-full"
          >
            {/* Background Image overlay */}
            <div className="absolute inset-0 opacity-40 mix-blend-multiply bg-slate-950">
              <img 
                src={SLIDES[currentSlide].image} 
                alt={SLIDES[currentSlide].title} 
                className="w-full h-full object-cover select-none"
              />
            </div>
            {/* Radial and Linear overlay gradients */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent"></div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Slide Content */}
      <div className="relative h-full max-w-7xl mx-auto px-6 py-12 sm:py-20 lg:px-12 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4 }}
            className="max-w-xl space-y-4 sm:space-y-6"
          >
            <div>
              <span className={`inline-block text-[10px] font-bold tracking-widest uppercase px-3.5 py-1.5 rounded-full select-none transition-all duration-300 ${
                theme === 'dark'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-accent-blue/15 text-accent-blue border border-accent-blue/30'
              }`}>
                {SLIDES[currentSlide].badge}
              </span>
            </div>
            
            <h1 className={`text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight transition-all duration-300 ${
              theme === 'dark'
                ? 'bg-gradient-to-r from-white via-white to-amber-200 bg-clip-text text-transparent'
                : 'text-white'
            }`}>
              {SLIDES[currentSlide].title}
            </h1>
            
            <p className="text-xs sm:text-sm md:text-base text-slate-300 font-light leading-relaxed max-w-lg">
              {SLIDES[currentSlide].description}
            </p>
            
            <div className="pt-2">
              <button
                onClick={() => handleSlideAction(SLIDES[currentSlide].tabKey)}
                className={`group flex items-center space-x-2 px-6 py-3 sm:py-3.5 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 hover:from-amber-300 hover:to-amber-400 border border-amber-300/30 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                    : 'bg-white text-primary hover:bg-slate-50 shadow-lg'
                }`}
              >
                <span>{SLIDES[currentSlide].buttonText}</span>
                <ArrowRight className={`h-4 w-4 group-hover:translate-x-1 transition-transform duration-200 ${
                  theme === 'dark' ? 'text-slate-950' : 'text-primary'
                }`} />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Arrow Navigation controls */}
      <button
        onClick={handlePrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 hidden sm:flex items-center justify-center h-10 w-10 rounded-full border border-slate-800 bg-slate-900/40 text-slate-200 backdrop-blur-xs opacity-0 group-hover/hero:opacity-100 hover:bg-slate-900/80 hover:text-white transition-all duration-300 active:scale-95 shadow-md cursor-pointer"
        title="Anterior"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 hidden sm:flex items-center justify-center h-10 w-10 rounded-full border border-slate-800 bg-slate-900/40 text-slate-200 backdrop-blur-xs opacity-0 group-hover/hero:opacity-100 hover:bg-slate-900/80 hover:text-white transition-all duration-300 active:scale-95 shadow-md cursor-pointer"
        title="Próximo"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Auto-play progress indicators (Dots at the bottom) */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center space-x-2.5">
        {SLIDES.map((slide, idx) => (
          <button
            key={slide.id}
            onClick={() => handleDotClick(idx)}
            className="group/dot relative flex items-center justify-center h-4 w-4 cursor-pointer"
            title={`Slide ${idx + 1}`}
          >
            {/* Outer ring for active dot */}
            <span className={`absolute inset-0 rounded-full border border-white transition-all duration-300 ${idx === currentSlide ? 'scale-100 opacity-60' : 'scale-50 opacity-0 group-hover/dot:opacity-30'}`} />
            
            {/* Center dot */}
            <span className={`h-1.5 rounded-full bg-white transition-all duration-300 ${idx === currentSlide ? 'w-4 opacity-100' : 'w-1.5 opacity-40 group-hover/dot:opacity-75'}`} />
          </button>
        ))}
      </div>
    </div>
  );
};
