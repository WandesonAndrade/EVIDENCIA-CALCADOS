import React from 'react';
import { Product } from '../../../types';
import { StorefrontProductCard } from './StorefrontProductCard';
import { AnimatePresence } from 'motion/react';
import { ShoppingBag, RefreshCw, X } from 'lucide-react';

export interface StorefrontProductGridProps {
  products: Product[];
  theme?: string;
  favorites?: string[];
  onToggleFavorite?: (id: string) => void;
  onViewDetails?: (product: Product) => void;
  onResetFilters?: () => void;
  isLoading?: boolean;
}

export const StorefrontProductGrid: React.FC<StorefrontProductGridProps> = ({
  products,
  theme = 'light',
  favorites = [],
  onToggleFavorite,
  onViewDetails,
  onResetFilters,
  isLoading = false,
}) => {
  const isDark = theme === 'dark';

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-[#006EDB] animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Carregando calçados...</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-16 text-center space-y-4 max-w-md mx-auto">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-50 dark:bg-slate-800 flex items-center justify-center text-[#006EDB]">
          <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
        </div>
        <div className="space-y-1">
          <h3 className={`text-base font-extrabold ${isDark ? 'text-white' : 'text-[#003B73]'}`}>
            Nenhum calçado encontrado
          </h3>
          <p className="text-xs text-slate-500">
            Tente buscar por outro termo, modelo ou limpar os filtros de categoria e numeração.
          </p>
        </div>
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-full bg-[#006EDB] text-white text-xs font-bold hover:bg-[#00509E] transition-all shadow-xs cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Limpar filtros de busca</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-6">
      <AnimatePresence mode="popLayout">
        {products.map((product) => (
          <StorefrontProductCard
            key={product.id}
            product={product}
            theme={theme}
            isFavorite={favorites.includes(product.id)}
            onToggleFavorite={onToggleFavorite}
            onViewDetails={onViewDetails}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
