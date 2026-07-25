import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { scrollToSectionWithOffset } from '../lib/scrollUtils';
import { sanitizeUrl } from '../lib/securityUtils';

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
    badge: 'LOJA OFICIAL CAXIAS - MA',
    title: 'A sua loja de Caxias - MA está online!',
    description: 'Compre no carnê em até 10x sem juros ou receba via entrega rápida com o atendimento exclusivo da equipe Evidência Calçados.',
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
    tabKey: 'calcados-femininos'
  },
  {
    id: 3,
    badge: 'COLEÇÃO MASCULINA',
    title: 'Estilo moderno e robustez incomparável.',
    description: 'Sapatos sociais premium, botas indestrutíveis e tênis de alta performance para o homem contemporâneo que valoriza design e atitude.',
    image: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?q=80&w=1600&auto=format&fit=crop',
    buttonText: 'Explorar Linha Masculina',
    tabKey: 'calcados-masculinos'
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
  const { setSelectedMenuTab, setCurrentView, theme, heroBanners } = useApp();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isDark = theme === 'dark';

  const slides = heroBanners && heroBanners.filter(b => b.active).length > 0
    ? heroBanners.filter(b => b.active)
    : SLIDES;

  // Auto-play effect
  useEffect(() => {
    if (!isPaused && slides.length > 0) {
      autoplayTimerRef.current = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % slides.length);
      }, 6000);
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

  const handleDotClick = (index: number) => {
    setCurrentSlide(index);
  };

  const handleSlideAction = (tabKey: string) => {
    setSelectedMenuTab(tabKey);
    setCurrentView('category-page');
    setTimeout(() => {
      scrollToSectionWithOffset('category-all-items-section');
    }, 100);
  };

  return (
    <div 
      id="hero-banner" 
      className="relative overflow-hidden rounded-3xl mx-4 sm:mx-6 lg:mx-8 my-6 min-h-[480px] sm:min-h-[520px] md:min-h-[540px] lg:h-[62vh] shadow-2xl border border-slate-800/80 group/hero select-none bg-slate-950"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background Image Slides with High Impact Footwear Showcase & Smooth Crossfade */}
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
              src={sanitizeUrl(currentBanner.image)} 
              alt={currentBanner.title} 
              className="w-full h-full object-cover opacity-95 brightness-[1.12] contrast-[1.08] saturate-[1.15] filter drop-shadow-md transition-all duration-700"
            />
            
            {/* Multi-layered Light & Vibrant Gradients (Preserving High Legibility & Bright Studio Images) */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/45 to-transparent" />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Hero Content: Pure Product & Title Showcase */}
      <div className="relative h-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 py-12 sm:py-16 flex items-center justify-start z-20">
        <div className="max-w-2xl text-center sm:text-left space-y-4 sm:space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="space-y-4 sm:space-y-6"
            >
              {/* Badge Tag */}
              <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                <span className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-black tracking-widest uppercase text-amber-400 bg-amber-400/10 border border-amber-400/40 backdrop-blur-md shadow-[0_0_15px_rgba(245,158,11,0.25)]">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span>{currentBanner.badge}</span>
                </span>
              </div>
              
              {/* Headline Title */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
                {currentBanner.title}
              </h1>
              
              {/* Subtitle / Description */}
              <p className="text-sm sm:text-base md:text-lg text-slate-200 font-medium leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
                {currentBanner.description}
              </p>
              
              {/* Action CTA Button with Strong Golden Glow */}
              <div className="pt-3 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-4">
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSlideAction(currentBanner.tabKey)}
                  className="group inline-flex items-center space-x-3 px-8 py-4 rounded-2xl text-xs sm:text-sm font-black tracking-widest uppercase bg-gradient-to-r from-amber-400 via-amber-400 to-amber-500 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.45)] hover:shadow-[0_0_40px_rgba(245,158,11,0.7)] transition-all cursor-pointer border border-amber-300/40"
                >
                  <span>{currentBanner.buttonText}</span>
                  <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1.5 transition-transform duration-200 text-slate-950 stroke-[3]" />
                </motion.button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
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

      {/* Sleek Minimalist Carousel Dots (Bottom) */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center space-x-2.5 backdrop-blur-md px-3.5 py-1.5 rounded-full bg-slate-950/60 border border-white/10">
        {slides.map((slide, idx) => {
          const isActive = idx === currentSlide;
          return (
            <button
              key={slide.id}
              onClick={() => handleDotClick(idx)}
              className="relative transition-all duration-300 cursor-pointer focus:outline-none py-1"
              title={`Ir para slide ${idx + 1}`}
            >
              <span className={`block rounded-full transition-all duration-300 ${
                isActive 
                  ? 'w-7 h-1.5 bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.6)]' 
                  : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/80'
              }`} />
            </button>
          );
        })}
      </div>
    </div>
  );
};
