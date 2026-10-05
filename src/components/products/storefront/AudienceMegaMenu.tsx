import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { motion } from 'motion/react';
import {
  ShoppingBag,
  Heart,
  Watch,
  Footprints,
  Luggage,
  Gift,
  Wallet,
  Sparkles,
  Droplets,
  ChevronRight,
  Package,
  Glasses,
  Smile,
  Shield,
  Layers,
  Sparkle,
} from 'lucide-react';
import {
  AudienceKey,
  AudienceSubcategoryItem,
  AUDIENCE_CONFIGS,
} from '../utils/categoryNavigationUtils';

export interface AudienceMegaMenuProps {
  activeAudience: AudienceKey;
  isDark?: boolean;
  subcategories: AudienceSubcategoryItem[];
  onSelectCategory: (categoryName: string, subcategoryName: string) => void;
  onClose?: () => void;
  onMouseEnter?: (menuKey: AudienceKey) => void;
  onMouseLeave?: () => void;
}

interface SubcategoryStyle {
  icon: React.ReactNode;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  blobBg: string;
  blobDarkBg: string;
}

// 8 paletas suaves de fallback cíclico
const FALLBACK_PALETTES = [
  {
    badgeBg: 'bg-rose-50 dark:bg-rose-950/40',
    badgeBorder: 'border-rose-100 dark:border-rose-800/50',
    badgeText: 'text-rose-500 dark:text-rose-400',
    blobBg: 'bg-[#FFE8ED]',
    blobDarkBg: 'dark:bg-rose-950/30',
  },
  {
    badgeBg: 'bg-purple-50 dark:bg-purple-950/40',
    badgeBorder: 'border-purple-100 dark:border-purple-800/50',
    badgeText: 'text-purple-500 dark:text-purple-400',
    blobBg: 'bg-[#EFE8FD]',
    blobDarkBg: 'dark:bg-purple-950/30',
  },
  {
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    badgeBorder: 'border-emerald-100 dark:border-emerald-800/50',
    badgeText: 'text-emerald-500 dark:text-emerald-400',
    blobBg: 'bg-[#FDF1E7]',
    blobDarkBg: 'dark:bg-emerald-950/30',
  },
  {
    badgeBg: 'bg-sky-50 dark:bg-sky-950/40',
    badgeBorder: 'border-sky-100 dark:border-sky-800/50',
    badgeText: 'text-sky-500 dark:text-sky-400',
    blobBg: 'bg-[#E8F3FF]',
    blobDarkBg: 'dark:bg-sky-950/30',
  },
  {
    badgeBg: 'bg-pink-50 dark:bg-pink-950/40',
    badgeBorder: 'border-pink-100 dark:border-pink-800/50',
    badgeText: 'text-pink-500 dark:text-pink-400',
    blobBg: 'bg-[#FDECEF]',
    blobDarkBg: 'dark:bg-pink-950/30',
  },
  {
    badgeBg: 'bg-cyan-50 dark:bg-cyan-950/40',
    badgeBorder: 'border-cyan-100 dark:border-cyan-800/50',
    badgeText: 'text-cyan-500 dark:text-cyan-400',
    blobBg: 'bg-[#E6F8FA]',
    blobDarkBg: 'dark:bg-cyan-950/30',
  },
  {
    badgeBg: 'bg-amber-50 dark:bg-amber-950/40',
    badgeBorder: 'border-amber-100 dark:border-amber-800/50',
    badgeText: 'text-amber-500 dark:text-amber-400',
    blobBg: 'bg-[#FFF0E5]',
    blobDarkBg: 'dark:bg-amber-950/30',
  },
  {
    badgeBg: 'bg-teal-50 dark:bg-teal-950/40',
    badgeBorder: 'border-teal-100 dark:border-teal-800/50',
    badgeText: 'text-teal-500 dark:text-teal-400',
    blobBg: 'bg-[#E6F8F2]',
    blobDarkBg: 'dark:bg-teal-950/30',
  },
];

/**
 * Mapeia ícones e paletas pastéis com fidelidade à inspiração visual
 */
function getSubcategoryStyle(name: string, index: number): SubcategoryStyle {
  const upper = (name || '').toUpperCase();
  const fallback = FALLBACK_PALETTES[index % FALLBACK_PALETTES.length];

  if (upper.includes('BOLSA')) {
    return {
      icon: <ShoppingBag className="w-4 h-4 sm:w-4.5 sm:h-4.5" />,
      badgeBg: 'bg-rose-50 dark:bg-rose-950/40',
      badgeBorder: 'border-rose-100 dark:border-rose-800/50',
      badgeText: 'text-rose-500 dark:text-rose-400',
      blobBg: 'bg-[#FFE8ED]',
      blobDarkBg: 'dark:bg-rose-950/30',
    };
  }

  if (upper.includes('PERFUM') || upper.includes('FRAGRÂNCIA')) {
    return {
      icon: <Sparkles className="w-4 h-4 sm:w-4.5 sm:h-4.5" />,
      badgeBg: 'bg-purple-50 dark:bg-purple-950/40',
      badgeBorder: 'border-purple-100 dark:border-purple-800/50',
      badgeText: 'text-purple-500 dark:text-purple-400',
      blobBg: 'bg-[#EFE8FD]',
      blobDarkBg: 'dark:bg-purple-950/30',
    };
  }

  if (upper.includes('SANDÁLIA') || upper.includes('SANDALIA') || upper.includes('RASTEIRA')) {
    return {
      icon: <Footprints className="w-4 h-4 sm:w-4.5 sm:h-4.5" />,
      badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40',
      badgeBorder: 'border-emerald-100 dark:border-emerald-800/50',
      badgeText: 'text-emerald-500 dark:text-emerald-400',
      blobBg: 'bg-[#FDF1E7]',
      blobDarkBg: 'dark:bg-emerald-950/30',
    };
  }

  if (upper.includes('RELÓGIO') || upper.includes('RELOGIO')) {
    return {
      icon: <Watch className="w-4 h-4 sm:w-4.5 sm:h-4.5" />,
      badgeBg: 'bg-sky-50 dark:bg-sky-950/40',
      badgeBorder: 'border-sky-100 dark:border-sky-800/50',
      badgeText: 'text-sky-500 dark:text-sky-400',
      blobBg: 'bg-[#E8F3FF]',
      blobDarkBg: 'dark:bg-sky-950/30',
    };
  }

  if (upper.includes('ESTOJO') || upper.includes('NECESSAIRE')) {
    return {
      icon: <Package className="w-4 h-4 sm:w-4.5 sm:h-4.5" />,
      badgeBg: 'bg-pink-50 dark:bg-pink-950/40',
      badgeBorder: 'border-pink-100 dark:border-pink-800/50',
      badgeText: 'text-pink-500 dark:text-pink-400',
      blobBg: 'bg-[#FDECEF]',
      blobDarkBg: 'dark:bg-pink-950/30',
    };
  }

  if (upper.includes('MOCHILA')) {
    return {
      icon: <ShoppingBag className="w-4 h-4 sm:w-4.5 sm:h-4.5" />,
      badgeBg: 'bg-cyan-50 dark:bg-cyan-950/40',
      badgeBorder: 'border-cyan-100 dark:border-cyan-800/50',
      badgeText: 'text-cyan-500 dark:text-cyan-400',
      blobBg: 'bg-[#E6F8FA]',
      blobDarkBg: 'dark:bg-cyan-950/30',
    };
  }

  if (upper.includes('MALA') || upper.includes('VIAGEM')) {
    return {
      icon: <Luggage className="w-4 h-4 sm:w-4.5 sm:h-4.5" />,
      badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40',
      badgeBorder: 'border-indigo-100 dark:border-indigo-800/50',
      badgeText: 'text-indigo-500 dark:text-indigo-400',
      blobBg: 'bg-[#F2EDFD]',
      blobDarkBg: 'dark:bg-indigo-950/30',
    };
  }

  if (upper.includes('CHINELO') || upper.includes('SLIDE') || upper.includes('PAPETE')) {
    return {
      icon: <Footprints className="w-4 h-4 sm:w-4.5 sm:h-4.5" />,
      badgeBg: 'bg-amber-50 dark:bg-amber-950/40',
      badgeBorder: 'border-amber-100 dark:border-amber-800/50',
      badgeText: 'text-amber-500 dark:text-amber-400',
      blobBg: 'bg-[#FFF0E5]',
      blobDarkBg: 'dark:bg-amber-950/30',
    };
  }

  if (upper.includes('LANCHEIRA')) {
    return {
      icon: <ShoppingBag className="w-4 h-4 sm:w-4.5 sm:h-4.5" />,
      badgeBg: 'bg-teal-50 dark:bg-teal-950/40',
      badgeBorder: 'border-teal-100 dark:border-teal-800/50',
      badgeText: 'text-teal-500 dark:text-teal-400',
      blobBg: 'bg-[#E6F8F2]',
      blobDarkBg: 'dark:bg-teal-950/30',
    };
  }

  if (upper.includes('KIT') || upper.includes('PRESENTE')) {
    return {
      icon: <Gift className="w-4 h-4 sm:w-4.5 sm:h-4.5" />,
      badgeBg: 'bg-rose-50 dark:bg-rose-950/40',
      badgeBorder: 'border-rose-100 dark:border-rose-800/50',
      badgeText: 'text-rose-500 dark:text-rose-400',
      blobBg: 'bg-[#FFEBEF]',
      blobDarkBg: 'dark:bg-rose-950/30',
    };
  }

  if (upper.includes('CAPILAR') || upper.includes('CABELO')) {
    return {
      icon: <Droplets className="w-4 h-4 sm:w-4.5 sm:h-4.5" />,
      badgeBg: 'bg-sky-50 dark:bg-sky-950/40',
      badgeBorder: 'border-sky-100 dark:border-sky-800/50',
      badgeText: 'text-sky-500 dark:text-sky-400',
      blobBg: 'bg-[#FBF1E6]',
      blobDarkBg: 'dark:bg-sky-950/30',
    };
  }

  if (upper.includes('CARTEIRA')) {
    return {
      icon: <Wallet className="w-4 h-4 sm:w-4.5 sm:h-4.5" />,
      badgeBg: 'bg-purple-50 dark:bg-purple-950/40',
      badgeBorder: 'border-purple-100 dark:border-purple-800/50',
      badgeText: 'text-purple-500 dark:text-purple-400',
      blobBg: 'bg-[#F3ECFD]',
      blobDarkBg: 'dark:bg-purple-950/30',
    };
  }

  if (upper.includes('SKINCARE') || upper.includes('BELEZA') || upper.includes('MAQUIAGEM')) {
    return {
      icon: <Heart className="w-4 h-4 sm:w-4.5 sm:h-4.5" />,
      badgeBg: 'bg-teal-50 dark:bg-teal-950/40',
      badgeBorder: 'border-teal-100 dark:border-teal-800/50',
      badgeText: 'text-teal-500 dark:text-teal-400',
      blobBg: 'bg-[#EAF5FE]',
      blobDarkBg: 'dark:bg-teal-950/30',
    };
  }

  if (upper.includes('TÊNIS') || upper.includes('TENIS') || upper.includes('ESPORTE') || upper.includes('CHUTEIRA')) {
    return {
      icon: <Footprints className="w-4 h-4 sm:w-4.5 sm:h-4.5" />,
      badgeBg: 'bg-rose-50 dark:bg-rose-950/40',
      badgeBorder: 'border-rose-100 dark:border-rose-800/50',
      badgeText: 'text-rose-500 dark:text-rose-400',
      blobBg: 'bg-[#F1EEFE]',
      blobDarkBg: 'dark:bg-rose-950/30',
    };
  }

  if (upper.includes('BOTA') || upper.includes('COTURNO')) {
    return {
      icon: <Shield className="w-4 h-4 sm:w-4.5 sm:h-4.5" />,
      badgeBg: 'bg-amber-50 dark:bg-amber-950/40',
      badgeBorder: 'border-amber-100 dark:border-amber-800/50',
      badgeText: 'text-amber-500 dark:text-amber-400',
      blobBg: 'bg-[#FFF3E8]',
      blobDarkBg: 'dark:bg-amber-950/30',
    };
  }

  if (upper.includes('SALTO') || upper.includes('SCARPIN')) {
    return {
      icon: <Sparkles className="w-4 h-4 sm:w-4.5 sm:h-4.5" />,
      badgeBg: 'bg-fuchsia-50 dark:bg-fuchsia-950/40',
      badgeBorder: 'border-fuchsia-100 dark:border-fuchsia-800/50',
      badgeText: 'text-fuchsia-500 dark:text-fuchsia-400',
      blobBg: 'bg-[#FDEBF2]',
      blobDarkBg: 'dark:bg-fuchsia-950/30',
    };
  }

  if (upper.includes('SAPATILHA') || upper.includes('MOCASSIM') || upper.includes('SAPATO')) {
    return {
      icon: <Footprints className="w-4 h-4 sm:w-4.5 sm:h-4.5" />,
      badgeBg: 'bg-blue-50 dark:bg-blue-950/40',
      badgeBorder: 'border-blue-100 dark:border-blue-800/50',
      badgeText: 'text-blue-500 dark:text-blue-400',
      blobBg: 'bg-[#EDF4FD]',
      blobDarkBg: 'dark:bg-blue-950/30',
    };
  }

  return {
    icon: <Sparkle className="w-4 h-4 sm:w-4.5 sm:h-4.5" />,
    ...fallback,
  };
}

export const AudienceMegaMenu: React.FC<AudienceMegaMenuProps> = ({
  activeAudience,
  isDark = false,
  subcategories = [],
  onSelectCategory,
  onClose,
  onMouseEnter,
  onMouseLeave,
}) => {
  const { storeTheme } = useApp();
  const isOutubroRosa = storeTheme === 'outubro-rosa';

  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const audienceConfig = AUDIENCE_CONFIGS[activeAudience] || AUDIENCE_CONFIGS.feminino;

  // Imagens de destaque para a montagem de produtos no topo do banner
  const showcaseImages = React.useMemo(() => {
    const validPhotos = subcategories
      .map((s) => s.image)
      .filter((img): img is string => Boolean(img));

    // Se tiver fotos dos produtos da subcategoria, pega até 3
    if (validPhotos.length >= 2) {
      return validPhotos.slice(0, 3);
    }

    // Fallbacks fotográficos elegantes de alta definição caso a loja esteja sem fotos sincronizadas
    if (activeAudience === 'feminino') {
      return [
        'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=400&q=80', // Tênis branco
        'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=400&q=80', // Bolsa bege
        'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=400&q=80', // Sandália nude
      ];
    }
    if (activeAudience === 'masculino') {
      return [
        'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=400&q=80', // Tênis Vans
        'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=400&q=80', // Sapato couro
        'https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=400&q=80', // Relógio
      ];
    }
    return [
      'https://images.unsplash.com/photo-1514989940723-e8e51635b782?auto=format&fit=crop&w=400&q=80', // Tênis infantil
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=400&q=80', // Mochila infantil
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80', // Fone/Acessório
    ];
  }, [subcategories, activeAudience]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.985 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => onMouseEnter?.(activeAudience)}
      onMouseLeave={onMouseLeave}
      className={`absolute left-0 right-0 top-full mt-2.5 z-50 rounded-3xl border shadow-2xl overflow-hidden backdrop-blur-xl transition-all ${
        isDark
          ? 'bg-slate-900/98 border-slate-800 text-slate-100 shadow-slate-950/80'
          : `bg-white/98 border-slate-200/90 text-slate-900 ${
              isOutubroRosa
                ? 'shadow-[0_20px_50px_-10px_rgba(157,23,77,0.18)]'
                : 'shadow-[0_20px_50px_-10px_rgba(0,34,77,0.18)]'
            }`
      }`}
    >
      <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* 1. HERO BANNER COM DESIGN DA REFERÊNCIA VISUAL */}
        <div
          className={`relative overflow-hidden rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 border shadow-lg ${
            isDark
              ? isOutubroRosa
                ? 'bg-gradient-to-r from-slate-950 via-[#36051D] to-[#54082F] border-pink-950/60 text-white'
                : 'bg-gradient-to-r from-slate-950 via-[#00224D] to-[#003875] border-slate-800 text-white'
              : isOutubroRosa
                ? 'bg-gradient-to-r from-[#5B0836] via-[#7D0D47] to-[#9D174D] border-pink-500/40 text-white'
                : 'bg-gradient-to-r from-[#002554] via-[#003875] to-[#0052A3] border-blue-900/40 text-white'
          }`}
        >
          {/* Efeito de anéis orbitais concêntricos de profundidade no fundo */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <svg
              className="absolute right-12 sm:right-32 -top-24 w-[500px] h-[500px] text-white/5 opacity-80"
              viewBox="0 0 500 500"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="250" cy="250" r="140" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
              <circle cx="250" cy="250" r="190" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="250" cy="250" r="240" stroke="currentColor" strokeWidth="1" />
            </svg>
            <div className={`absolute right-0 top-0 bottom-0 w-1/2 bg-radial ${isOutubroRosa ? 'from-pink-400/15' : 'from-sky-400/10'} via-transparent to-transparent pointer-events-none`} />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Bloco de Texto e Título */}
            <div className="max-w-xl">
              {/* Badge da Coleção com Ícone de Gênero */}
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${
                isOutubroRosa ? 'bg-pink-500/30 border border-pink-400/30' : 'bg-blue-500/30 border border-blue-400/30'
              } text-white text-[11px] font-black tracking-wider uppercase backdrop-blur-md mb-2 shadow-xs`}>
                <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
                  {activeAudience === 'feminino' ? '♀' : activeAudience === 'masculino' ? '♂' : '★'}
                </span>
                <span>{audienceConfig.collectionBadge}</span>
              </div>

              {/* Título Principal */}
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-2">
                <span>Subcategorias</span>
                <span className={isOutubroRosa ? 'text-pink-300' : 'text-sky-300'}>
                  {activeAudience === 'feminino'
                    ? 'Femininas'
                    : activeAudience === 'masculino'
                    ? 'Masculinas'
                    : 'Infantis'}
                </span>
              </h2>

              {/* Subtítulo Inspirador */}
              <p className={`text-xs sm:text-sm ${isOutubroRosa ? 'text-pink-100/90' : 'text-sky-100/90'} font-normal mt-1.5 max-w-md leading-relaxed`}>
                {audienceConfig.subtitle}
              </p>

              {/* Linha de Destaque Neon da Marca */}
              <div className={`w-10 h-1 rounded-full ${
                isOutubroRosa ? 'bg-[#F472B6] shadow-[0_0_10px_#F472B6]' : 'bg-[#00D0FF] shadow-[0_0_10px_#00D0FF]'
              } mt-3`} />
            </div>

            {/* Bloco Direito: Montagem de Produtos com Pódio 3D + Botão Explorar Tudo */}
            <div className="flex items-center justify-between sm:justify-end gap-5 sm:gap-7 shrink-0">
              {/* Pódio 3D com Showcase de Produtos */}
              <div className="relative hidden md:flex items-center justify-center w-52 lg:w-60 h-24">
                {/* Base do Pódio Circular */}
                <div className={`absolute bottom-1 w-44 lg:w-48 h-6 ${
                  isOutubroRosa ? 'bg-[#50082E]/80 border border-pink-400/30' : 'bg-[#001D40]/70 border border-sky-400/20'
                } rounded-[100%] shadow-inner`} />

                {/* 3 Produtos Sobrepostos */}
                {showcaseImages[0] && (
                  <img
                    src={showcaseImages[0]}
                    alt="Produto 1"
                    className="absolute left-1 bottom-3 w-16 h-16 lg:w-18 lg:h-18 object-contain drop-shadow-md transition-transform hover:scale-110 z-10"
                    loading="lazy"
                  />
                )}
                {showcaseImages[1] && (
                  <img
                    src={showcaseImages[1]}
                    alt="Produto 2"
                    className="absolute left-1/2 -translate-x-1/2 bottom-5 w-20 h-20 lg:w-22 lg:h-22 object-contain drop-shadow-xl transition-transform hover:scale-110 z-20"
                    loading="lazy"
                  />
                )}
                {showcaseImages[2] && (
                  <img
                    src={showcaseImages[2]}
                    alt="Produto 3"
                    className="absolute right-1 bottom-3 w-16 h-16 lg:w-18 lg:h-18 object-contain drop-shadow-md transition-transform hover:scale-110 z-10"
                    loading="lazy"
                  />
                )}
              </div>

              {/* Botão Pill Branco: Explorar Tudo */}
              <button
                type="button"
                onClick={() => {
                  onClose?.();
                  onSelectCategory(activeAudience, 'TODAS');
                }}
                className={`group px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-white hover:bg-slate-50 ${
                  isOutubroRosa ? 'text-[#9D174D]' : 'text-[#002D62]'
                } font-black text-xs sm:text-sm shadow-lg hover:shadow-xl hover:scale-103 active:scale-98 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0`}
              >
                <span>{audienceConfig.ctaText}</span>
                <ChevronRight className={`w-4 h-4 ${isOutubroRosa ? 'text-[#9D174D]' : 'text-[#002D62]'} transition-transform group-hover:translate-x-1`} />
              </button>
            </div>
          </div>
        </div>

        {/* 2. GRID DE CARDS COM DESIGN ORGÂNICO PASTEL */}
        {subcategories.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-3.5">
            {subcategories.map((sub, idx) => {
              const style = getSubcategoryStyle(sub.name, idx);
              const hasPhoto = Boolean(sub.image && !failedImages[sub.name]);

              return (
                <button
                  key={sub.slug || idx}
                  type="button"
                  onClick={() => {
                    onClose?.();
                    onSelectCategory(activeAudience, sub.name);
                  }}
                  className={`group relative overflow-hidden rounded-[20px] p-2.5 sm:p-3 text-left transition-all duration-300 cursor-pointer flex items-center justify-between border ${
                    isDark
                      ? 'bg-slate-850/90 border-slate-800 hover:border-sky-500/50 hover:bg-slate-800 hover:shadow-slate-950/60'
                      : 'bg-white border-slate-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.09)] hover:border-sky-200'
                  } hover:-translate-y-0.5`}
                >
                  {/* Lado Esquerdo: Ícone com Badge Pastel + Rótulos */}
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1 z-10 pr-1">
                    {/* Badge do Ícone Pastel */}
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover:scale-108 ${style.badgeBg} ${style.badgeBorder} ${style.badgeText}`}
                    >
                      {style.icon}
                    </div>

                    {/* Título e Contagem de Itens */}
                    <div className="min-w-0 flex-1">
                      <span
                        className={`text-xs sm:text-[13px] font-bold block truncate transition-colors ${
                          isDark
                            ? 'text-slate-100 group-hover:text-sky-300'
                            : 'text-slate-800 group-hover:text-[#003e92]'
                        }`}
                        title={sub.name}
                      >
                        {sub.name}
                      </span>
                      <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 dark:text-slate-400 block mt-0.5 truncate">
                        {sub.count} {sub.count === 1 ? 'produto' : 'produtos'}
                      </span>
                    </div>

                    {/* Botãozinho Circular de Chevron */}
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-sky-50/80 dark:bg-slate-800 text-sky-500 dark:text-sky-400 flex items-center justify-center shrink-0 transition-all duration-200 group-hover:bg-[#003e92] group-hover:text-white group-hover:scale-105">
                      <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>

                  {/* Lado Direito: Blob Aquarela Pastel Orgânica de Fundo */}
                  <div
                    className={`absolute -right-2 -bottom-2 w-16 h-16 sm:w-20 sm:h-20 rounded-[42%_58%_55%_45%/45%_55%_45%_55%] pointer-events-none transition-transform duration-500 group-hover:scale-115 group-hover:rotate-6 ${style.blobBg} ${style.blobDarkBg}`}
                  />

                  {/* Foto Real do Produto na Vitrine */}
                  <div className="relative z-10 shrink-0 ml-1">
                    {hasPhoto ? (
                      <img
                        src={sub.image}
                        alt={sub.name}
                        onError={() => setFailedImages((prev) => ({ ...prev, [sub.name]: true }))}
                        className="w-12 h-12 sm:w-15 sm:h-15 object-contain transition-transform duration-300 group-hover:scale-112 group-hover:-translate-y-0.5 drop-shadow-xs"
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className={`w-12 h-12 sm:w-15 sm:h-15 flex items-center justify-center opacity-40 group-hover:opacity-70 transition-opacity ${style.badgeText}`}
                      >
                        {style.icon}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 text-xs sm:text-sm text-slate-400">
            Nenhuma subcategoria disponível com estoque ativo no momento para esta coleção.
          </div>
        )}
      </div>
    </motion.div>
  );
};
