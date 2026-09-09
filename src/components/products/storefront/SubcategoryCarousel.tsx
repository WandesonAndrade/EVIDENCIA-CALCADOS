import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { normalizeCategoryName, normalizeSubcategoryName } from '../../../services/moblinkCategoriesService';

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

export const SubcategoryCarousel: React.FC<SubcategoryCarouselProps> = ({
  subcategories,
  theme = 'light',
  onSelectSubcategory,
  title = 'Compre por Categoria',
  subtitle = 'Selecione o estilo ou modelo ideal de calçado para o seu dia a dia.',
}) => {
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const isDark = theme === 'dark';

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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b pb-3 border-blue-900/10 dark:border-white/10">
        <div>
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-[#DDF1FF] text-[#003B73] dark:bg-blue-900/30 dark:text-blue-200 border border-[#006EDB]/20 mb-1.5">
            <Sparkles className="h-3 w-3 text-[#006EDB]" />
            <span>Navegação Rápida</span>
          </span>
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
                : 'bg-white border-blue-900/10 text-[#003B73] hover:bg-blue-50 shadow-xs'
            }`}
            title="Rolar para a direita"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Carrossel Deslizante de Subcategorias */}
      <div
        ref={carouselRef}
        className="flex items-center space-x-3.5 sm:space-x-4 overflow-x-auto no-scrollbar scroll-smooth py-2 px-0.5"
      >
        {subcategories.map((sub) => (
          <div
            key={sub.id}
            onClick={() => onSelectSubcategory(sub.name)}
            className={`group flex-shrink-0 min-w-[130px] sm:min-w-[150px] max-w-[170px] flex flex-col items-center p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer text-center select-none ${
              isDark
                ? 'bg-[#101828]/90 border-white/10 text-white hover:bg-[#006EDB] hover:border-[#006EDB] hover:shadow-lg backdrop-blur-md'
                : 'bg-white border-blue-900/10 text-[#003B73] shadow-md hover:bg-[#006EDB] hover:text-white hover:border-[#006EDB] hover:shadow-xl'
            }`}
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 mb-2 overflow-hidden flex items-center justify-center rounded-xl p-1 bg-[#EEF8FF] group-hover:bg-white/20 transition-colors">
              {sub.image ? (
                <img
                  src={sub.image}
                  alt={sub.name}
                  className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#006EDB] font-black text-lg">
                  {sub.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <span
              className={`text-xs font-bold line-clamp-1 transition-colors ${
                isDark ? 'text-slate-200 group-hover:text-white' : 'text-[#003B73] group-hover:text-white'
              }`}
            >
              {normalizeSubcategoryName(sub.name) || normalizeCategoryName(sub.name)}
            </span>

            <span
              className={`text-[10px] font-semibold mt-0.5 transition-colors ${
                isDark ? 'text-slate-400 group-hover:text-blue-100' : 'text-[#52708F] group-hover:text-[#DDF1FF]'
              }`}
            >
              {sub.itemCount} {sub.itemCount === 1 ? 'modelo' : 'modelos'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
