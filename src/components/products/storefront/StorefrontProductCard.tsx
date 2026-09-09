import React from 'react';
import { Product } from '../../../types';
import { Heart, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { ProductImage } from '../atomic/ProductImage';
import { ProductPriceDisplay } from '../atomic/ProductPriceDisplay';
import { ProductBadges } from '../atomic/ProductBadges';

export interface StorefrontProductCardProps {
  product: Product;
  theme?: string;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  onViewDetails?: (product: Product) => void;
}

const StorefrontProductCardComponent: React.FC<StorefrontProductCardProps> = ({
  product,
  theme = 'light',
  isFavorite = false,
  onToggleFavorite,
  onViewDetails,
}) => {
  const isDark = theme === 'dark';

  const handleClick = () => {
    if (onViewDetails) {
      onViewDetails(product);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`group relative flex flex-col justify-between h-full rounded-3xl border transition-all duration-300 overflow-hidden cursor-pointer ${
        isDark
          ? 'bg-[#101828]/90 border-white/12 text-white hover:border-blue-400/40 hover:shadow-2xl hover:shadow-blue-950/80 backdrop-blur-md'
          : 'bg-white border border-blue-900/10 text-[#003B73] shadow-md shadow-blue-900/5 hover:border-[#006EDB] hover:shadow-xl hover:shadow-blue-900/15'
      }`}
      onClick={handleClick}
    >
      {/* Moldura da Foto do Calçado */}
      <div
        className={`relative aspect-square w-full overflow-hidden p-6 flex items-center justify-center border-b transition-colors ${
          isDark
            ? 'bg-[#18233a] border-white/5'
            : 'bg-[#EEF8FF] border-blue-900/5 group-hover:bg-[#DDF1FF]'
        }`}
      >
        <ProductImage product={product} />

        {/* Badges no Canto Superior Esquerdo */}
        <ProductBadges product={product} position="corner" />

        {/* Botão de Favoritos */}
        {onToggleFavorite && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(product.id);
            }}
            className={`absolute top-3.5 right-3.5 p-2 rounded-full border transition-all z-10 cursor-pointer ${
              isFavorite
                ? 'bg-rose-500 border-rose-500 text-white shadow-md'
                : isDark
                  ? 'bg-slate-900/80 border-white/10 text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'bg-white/90 border-blue-900/10 text-[#52708F] hover:text-rose-500 hover:bg-white'
            }`}
            title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-white' : ''}`} />
          </button>
        )}
      </div>

      {/* Informações do Produto */}
      <div className="p-4 sm:p-5 flex flex-col justify-between flex-1 space-y-3">
        <div className="space-y-1.5">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#52708F]">
            {product.category || 'Evidência Calçados'}
          </span>

          {/* Título */}
          <h3
            className={`text-sm font-bold tracking-tight line-clamp-2 min-h-[40px] leading-snug ${
              isDark ? 'text-slate-100' : 'text-[#00509E]'
            }`}
          >
            {product.name}
          </h3>

          {/* Preço e Parcelamento */}
          <ProductPriceDisplay product={product} theme={theme} showInstallments={true} />
        </div>

        {/* Botão Comprar */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleClick}
            className="w-full py-2.5 px-4 rounded-full bg-[#006EDB] hover:bg-[#00509E] active:scale-[0.98] text-white text-xs font-extrabold tracking-wide transition-all shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <span>Comprar</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export const StorefrontProductCard = React.memo(StorefrontProductCardComponent);
export const ProductCard = StorefrontProductCard;
