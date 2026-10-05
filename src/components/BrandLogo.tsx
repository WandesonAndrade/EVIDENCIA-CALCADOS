import React from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'white';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = '', size = 'md', variant = 'default' }) => {
  const { setCurrentView, theme } = useApp();
  const isDark = theme === 'dark';
  const isWhiteLogo = variant === 'white' || isDark;

  const titleSizeClass = size === 'sm' 
    ? 'text-base min-[390px]:text-lg sm:text-2xl' 
    : size === 'lg' 
    ? 'text-2xl min-[390px]:text-3xl sm:text-4xl' 
    : 'text-[17px] min-[390px]:text-xl sm:text-2xl md:text-3xl';

  const subtitleSizeClass = size === 'sm' 
    ? 'text-[11px] min-[390px]:text-xs sm:text-base' 
    : size === 'lg' 
    ? 'text-lg min-[390px]:text-xl sm:text-2xl' 
    : 'text-xs min-[390px]:text-sm sm:text-lg md:text-xl';

  const taglineSizeClass = size === 'sm' 
    ? 'text-[0.45rem] px-1.5 py-0.2' 
    : 'text-[0.44rem] min-[390px]:text-[0.52rem] sm:text-[0.65rem] px-1.5 min-[390px]:px-2 sm:px-2.5 py-0.5';

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
          isWhiteLogo ? 'text-white drop-shadow-xs' : 'text-[#003e92]'
        }`}>
          Evidência
        </span>
        <span className={`font-light uppercase tracking-widest ml-1.5 transition-colors ${subtitleSizeClass} ${
          isWhiteLogo ? 'text-white/95 drop-shadow-xs' : 'text-[#003e92]'
        }`}>
          CALÇADOS
        </span>
      </div>

      {/* Linha 2: Tagline em estilo Fita/Retângulo Achatado */}
      <div className="-mt-1 sm:-mt-1.5 flex items-center">
        <span className={`inline-block font-normal leading-tight rounded-xs tracking-normal shadow-xs transition-colors ${taglineSizeClass} ${
          isWhiteLogo ? 'bg-white/20 text-white backdrop-blur-md border border-white/25' : 'bg-[#003e92] text-white'
        }`}>
          Com você no seu dia a dia
        </span>
      </div>
    </motion.div>
  );
};
