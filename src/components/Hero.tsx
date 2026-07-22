import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
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

  const isDark = theme === 'dark';

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

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentSlide(prev => (prev + 1) % SLIDES.length);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentSlide(prev => (prev - 1 + SLIDES.length) % SLIDES.length);
  };

  const handleDotClick = (index: number) => {
    setCurrentSlide(index);
  };

  const handleSlideAction = (tabKey: string) => {
    setSelectedMenuTab(tabKey);
    setCurrentView('category-page');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div 
      id="hero-banner" 
      className="relative overflow-hidden rounded-3xl mx-4 sm:mx-6 lg:mx-8 my-6 min-h-[500px] sm:min-h-[540px] md:min-h-[580px] lg:h-[65vh] shadow-2xl border border-slate-800/80 group/hero select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background Image Slides with Smooth Motion Zoom & Crossfade */}
      <div className="absolute inset-0 w-full h-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.9, ease: [0.25, 1, 0.5, 1] }}
            className="absolute inset-0 w-full h-full"
          >
            <img 
              src={SLIDES[currentSlide].image} 
              alt={SLIDES[currentSlide].title} 
              className="w-full h-full object-cover"
            />
            
            {/* Multi-layered Immersive Gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-slate-950/20" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-transparent" />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Floating Glassmorphic Content Card */}
      <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-12 sm:py-20 flex items-center justify-start z-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: -30, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.97 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`w-full max-w-xl p-6 sm:p-10 lg:p-12 rounded-3xl border backdrop-blur-2xl shadow-2xl space-y-4 sm:space-y-6 text-center sm:text-left ${
              isDark
                ? 'bg-slate-900/70 border-slate-800/80 text-white shadow-black/50'
                : 'bg-slate-900/75 border-white/20 text-white shadow-2xl'
            }`}
          >
            {/* Badge Tag */}
            <div>
              <span className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-black tracking-widest uppercase text-amber-400 bg-amber-400/10 border border-amber-400/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>{SLIDES[currentSlide].badge}</span>
              </span>
            </div>
            
            {/* Main Title */}
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white drop-shadow-md">
              {SLIDES[currentSlide].title}
            </h1>
            
            {/* Subtitle / Description */}
            <p className="text-xs sm:text-sm md:text-base text-slate-300 font-normal leading-relaxed max-w-lg">
              {SLIDES[currentSlide].description}
            </p>
            
            {/* Magnetic CTA Button */}
            <div className="pt-2 flex justify-center sm:justify-start">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSlideAction(SLIDES[currentSlide].tabKey)}
                className="group inline-flex items-center space-x-3 px-7 py-3.5 sm:py-4 rounded-2xl text-xs sm:text-sm font-black tracking-wider uppercase bg-gradient-to-r from-amber-400 via-amber-400 to-amber-500 text-slate-950 shadow-lg hover:shadow-[0_0_25px_rgba(245,158,11,0.45)] transition-all cursor-pointer"
              >
                <span>{SLIDES[currentSlide].buttonText}</span>
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1.5 transition-transform duration-200 text-slate-950" />
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Floating Glass Arrow Controls (Sides) */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handlePrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 hidden sm:flex items-center justify-center h-12 w-12 rounded-full border border-slate-700/80 bg-slate-900/70 text-white backdrop-blur-xl opacity-0 group-hover/hero:opacity-100 hover:bg-slate-800 hover:text-amber-400 transition-all duration-300 shadow-2xl cursor-pointer"
        title="Anterior"
      >
        <ChevronLeft className="h-6 w-6 stroke-[2.5]" />
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 hidden sm:flex items-center justify-center h-12 w-12 rounded-full border border-slate-700/80 bg-slate-900/70 text-white backdrop-blur-xl opacity-0 group-hover/hero:opacity-100 hover:bg-slate-800 hover:text-amber-400 transition-all duration-300 shadow-2xl cursor-pointer"
        title="Próximo"
      >
        <ChevronRight className="h-6 w-6 stroke-[2.5]" />
      </motion.button>

      {/* Pagination Dots (Bottom) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center space-x-3 backdrop-blur-md px-4 py-2 rounded-full bg-slate-900/50 border border-white/10">
        {SLIDES.map((slide, idx) => {
          const isActive = idx === currentSlide;
          return (
            <button
              key={slide.id}
              onClick={() => handleDotClick(idx)}
              className="relative transition-all duration-300 cursor-pointer focus:outline-none"
              title={`Ir para slide ${idx + 1}`}
            >
              <span className={`block rounded-full transition-all duration-300 ${
                isActive 
                  ? 'w-8 h-2 bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]' 
                  : 'w-2 h-2 bg-white/40 hover:bg-white/80'
              }`} />
            </button>
          );
        })}
      </div>
    </div>
  );
};
