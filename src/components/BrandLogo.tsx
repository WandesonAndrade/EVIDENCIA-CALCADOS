import React from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = '', size = 'md' }) => {
  const { setCurrentView, theme } = useApp();
  const isDark = theme === 'dark';

  const titleSizeClass = size === 'sm' 
    ? 'text-xl sm:text-2xl' 
    : size === 'lg' 
    ? 'text-3xl sm:text-4xl' 
    : 'text-2xl sm:text-3xl';

  const subtitleSizeClass = size === 'sm' 
    ? 'text-sm sm:text-base' 
    : size === 'lg' 
    ? 'text-xl sm:text-2xl' 
    : 'text-lg sm:text-xl';

  const taglineSizeClass = size === 'sm' 
    ? 'text-[0.55rem] px-2 py-0.2' 
    : 'text-[0.6rem] sm:text-[0.65rem] px-2.5 py-0.5';

  return (
    <motion.div
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      onClick={() => setCurrentView('home')}
      className={`inline-flex flex-col select-none cursor-pointer group ${className}`}
      title="Evidência Calçados - Ir para a Home"
    >
      {/* Linha 1: Nome da Marca */}
      <div className="flex items-baseline leading-none">
        <span className={`font-black tracking-tight transition-colors ${titleSizeClass} ${
          isDark ? 'text-white' : 'text-[#1b648c]'
        }`}>
          Evidência
        </span>
        <span className={`font-light uppercase tracking-widest ml-1.5 transition-colors ${subtitleSizeClass} ${
          isDark ? 'text-slate-300' : 'text-[#1b648c]'
        }`}>
          CALÇADOS
        </span>
      </div>

      {/* Linha 2: Tagline em estilo Fita/Retângulo Achatado */}
      <div className="-mt-1 sm:-mt-1.5 flex items-center">
        <span className={`inline-block text-white font-normal leading-tight rounded-xs tracking-normal shadow-xs transition-colors ${taglineSizeClass} ${
          isDark ? 'bg-white/20 text-slate-100 backdrop-blur-md' : 'bg-[#1b648c]'
        }`}>
          Com você no seu dia a dia
        </span>
      </div>
    </motion.div>
  );
};
