import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, ShoppingBag, Footprints, Luggage, Watch, Wallet, Heart, Shirt } from 'lucide-react';
import { normalizeCategoryName, normalizeSubcategoryName } from '../../../services/moblinkCategoriesService';
import { useApp } from '../../../context/AppContext';

export interface SubcategoryItem {
  id: string;
  name: string;
  image?: string;
  itemCount: number;
}

export interface SubcategoryCarouselProps {
  subcategories: SubcategoryItem[];
  theme?: string;
  onSelectSubcategory: (name: string) => void;
  title?: string;
  subtitle?: string;
}

// Paleta de tons pastéis / aquarela orgânicos conforme referência visual
const PASTEL_PALETTE = [
  {
    bg: 'bg-[#E0F2FE]',
    darkBg: 'dark:bg-sky-950/60 dark:border-sky-800/60',
    border: 'border-sky-200/70',
    text: 'text-sky-700 dark:text-sky-300',
    glow: 'from-sky-300/30 to-sky-100/10',
  },
  {
    bg: 'bg-[#FFE4E6]',
    darkBg: 'dark:bg-rose-950/60 dark:border-rose-800/60',
    border: 'border-rose-200/70',
    text: 'text-rose-700 dark:text-rose-300',
    glow: 'from-rose-300/30 to-rose-100/10',
  },
  {
    bg: 'bg-[#DCFCE7]',
    darkBg: 'dark:bg-emerald-950/60 dark:border-emerald-800/60',
    border: 'border-emerald-200/70',
    text: 'text-emerald-700 dark:text-emerald-300',
    glow: 'from-emerald-300/30 to-emerald-100/10',
  },
  {
    bg: 'bg-[#FFEDD5]',
    darkBg: 'dark:bg-orange-950/60 dark:border-orange-800/60',
    border: 'border-orange-200/70',
    text: 'text-orange-700 dark:text-orange-300',
    glow: 'from-orange-300/30 to-orange-100/10',
  },
  {
    bg: 'bg-[#EDE9FE]',
    darkBg: 'dark:bg-purple-950/60 dark:border-purple-800/60',
    border: 'border-purple-200/70',
    text: 'text-purple-700 dark:text-purple-300',
    glow: 'from-purple-300/30 to-purple-100/10',
  },
  {
    bg: 'bg-[#FEF3C7]',
    darkBg: 'dark:bg-amber-950/60 dark:border-amber-800/60',
    border: 'border-amber-200/70',
    text: 'text-amber-700 dark:text-amber-300',
    glow: 'from-amber-300/30 to-amber-100/10',
  },
  {
    bg: 'bg-[#CCFBF1]',
    darkBg: 'dark:bg-teal-950/60 dark:border-teal-800/60',
    border: 'border-teal-200/70',
    text: 'text-teal-700 dark:text-teal-300',
    glow: 'from-teal-300/30 to-teal-100/10',
  },
  {
    bg: 'bg-[#E0E7FF]',
    darkBg: 'dark:bg-indigo-950/60 dark:border-indigo-800/60',
    border: 'border-indigo-200/70',
    text: 'text-indigo-700 dark:text-indigo-300',
    glow: 'from-indigo-300/30 to-indigo-100/10',
  },
];

const getCategoryIcon = (name: string) => {
  const upper = (name || '').toUpperCase();
  if (upper.includes('BOLSA')) return <ShoppingBag className="w-8 h-8 sm:w-10 sm:h-10" />;
  if (upper.includes('MALA') || upper.includes('VIAGEM')) return <Luggage className="w-8 h-8 sm:w-10 sm:h-10" />;
  if (upper.includes('RELÓGIO') || upper.includes('RELOGIO')) return <Watch className="w-8 h-8 sm:w-10 sm:h-10" />;
  if (upper.includes('CARTEIRA')) return <Wallet className="w-8 h-8 sm:w-10 sm:h-10" />;
  if (
    upper.includes('SAPATO') ||
    upper.includes('CALÇADO') ||
    upper.includes('CALCADO') ||
    upper.includes('TÊNIS') ||
    upper.includes('TENIS') ||
    upper.includes('SANDÁLIA') ||
    upper.includes('SANDALIA') ||
    upper.includes('BOTA') ||
    upper.includes('PAPETE')
  ) {
    return <Footprints className="w-8 h-8 sm:w-10 sm:h-10" />;
  }
  if (upper.includes('MASCULINO') || upper.includes('CAMISA') || upper.includes('ROUPA')) {
    return <Shirt className="w-8 h-8 sm:w-10 sm:h-10" />;
  }
  if (upper.includes('FEMININO') || upper.includes('BELEZA') || upper.includes('PERFUM')) {
    return <Heart className="w-8 h-8 sm:w-10 sm:h-10" />;
  }
  return <Sparkles className="w-8 h-8 sm:w-10 sm:h-10" />;
};

export const SubcategoryCarousel: React.FC<SubcategoryCarouselProps> = ({
  subcategories,
  theme = 'light',
  onSelectSubcategory,
  title = 'Compre por Categoria',
  subtitle = 'Acesso rápido aos modelos e estilos mais procurados da loja.',
}) => {
  const { storeTheme } = useApp();
  const isOutubroRosa = storeTheme === 'outubro-rosa';
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const isDark = theme === 'dark';
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!subcategories || subcategories.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Top Header com Botões de Navegação */}
      <div className={`flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b pb-3 ${
        isOutubroRosa ? 'border-pink-900/15 dark:border-pink-500/20' : 'border-blue-900/10 dark:border-white/10'
      }`}>
        <div>
          <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-[#003B73]'}`}>
            {title}
          </h2>
          <p className={`text-xs sm:text-sm font-medium mt-0.5 ${isDark ? 'text-slate-400' : 'text-[#52708F]'}`}>
            {subtitle}
          </p>
        </div>

        {/* Controles de Scroll */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={() => scrollCarousel('left')}
            className={`p-2 rounded-full border transition-all cursor-pointer ${
              isDark
                ? 'bg-slate-900 border-white/10 text-white hover:bg-slate-800'
                : isOutubroRosa
                ? 'bg-white border-pink-900/15 text-[#BE185D] hover:bg-pink-50 shadow-xs'
                : 'bg-white border-blue-900/10 text-[#003B73] hover:bg-blue-50 shadow-xs'
            }`}
            title="Rolar para a esquerda"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollCarousel('right')}
            className={`p-2 rounded-full border transition-all cursor-pointer ${
              isDark
                ? 'bg-slate-900 border-white/10 text-white hover:bg-slate-800'
                : isOutubroRosa
                ? 'bg-white border-pink-900/15 text-[#BE185D] hover:bg-pink-50 shadow-xs'
                : 'bg-white border-blue-900/10 text-[#003B73] hover:bg-blue-50 shadow-xs'
            }`}
            title="Rolar para a direita"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Carrossel Deslizante de Subcategorias Estilo Circular Pastel Blobs */}
      <div
        ref={carouselRef}
        className="flex items-start space-x-4 sm:space-x-6 lg:space-x-7 overflow-x-auto no-scrollbar scroll-smooth py-3 px-1"
      >
        {subcategories.map((sub, idx) => {
          const palette = PASTEL_PALETTE[idx % PASTEL_PALETTE.length];
          const hasValidImage = Boolean(sub.image && !imgErrors[sub.id]);
          const displayName = normalizeSubcategoryName(sub.name) || normalizeCategoryName(sub.name);

          return (
            <button
              key={sub.id}
              type="button"
              onClick={() => onSelectSubcategory(sub.name)}
              className="group flex-shrink-0 flex flex-col items-center cursor-pointer select-none text-center focus:outline-none min-w-[82px] sm:min-w-[100px] max-w-[120px] transition-transform active:scale-95"
            >
              {/* Bolha circular orgânica em tom pastel */}
              <div
                className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full sm:rounded-[30px] flex items-center justify-center p-3 relative transition-all duration-300 shadow-xs group-hover:shadow-md group-hover:scale-108 border ${palette.border} ${palette.bg} ${palette.darkBg}`}
              >
                {/* Efeito sutil de gradiente aquarela interno */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${palette.glow} rounded-full sm:rounded-[30px] opacity-70 pointer-events-none`}
                />

                {/* Foto real do produto ou ícone ilustrativo */}
                {hasValidImage ? (
                  <img
                    src={sub.image}
                    alt={displayName}
                    onError={() => setImgErrors((prev) => ({ ...prev, [sub.id]: true }))}
                    className="w-full h-full object-contain relative z-10 group-hover:scale-115 transition-transform duration-300 drop-shadow-xs"
                    loading="lazy"
                  />
                ) : (
                  <div className={`relative z-10 flex items-center justify-center ${palette.text}`}>
                    {getCategoryIcon(sub.name)}
                  </div>
                )}
              </div>

              {/* Rótulo da Subcategoria */}
              <span
                className={`text-xs sm:text-sm font-extrabold line-clamp-1 mt-2.5 transition-colors ${
                  isDark
                    ? isOutubroRosa ? 'text-slate-100 group-hover:text-pink-400' : 'text-slate-100 group-hover:text-blue-400'
                    : isOutubroRosa ? 'text-[#003B73] group-hover:text-[#FF2D78]' : 'text-[#003B73] group-hover:text-[#006EDB]'
                }`}
              >
                {displayName}
              </span>

              {/* Contagem de Modelos */}
              <span
                className={`text-[10px] font-semibold mt-0.5 transition-colors ${
                  isDark ? 'text-slate-400 group-hover:text-slate-300' : 'text-[#52708F] group-hover:text-[#003B73]'
                }`}
              >
                {sub.itemCount} {sub.itemCount === 1 ? 'modelo' : 'modelos'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

