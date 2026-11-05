import React, { useMemo } from 'react';
import { Product } from '../../../types';
import { useApp } from '../../../context/AppContext';
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

/**
 * Extrai e normaliza todos os tamanhos da grade disponíveis para o produto.
 */
export const extractAvailableSizes = (product: Product | any): string[] => {
  if (!product) return [];

  const stockObj = product.stockBySize || product.sizeStockMap;
  const hasStockMap = stockObj && typeof stockObj === 'object' && Object.keys(stockObj).length > 0;

  const rawList: (string | number)[] = [];

  if (Array.isArray(product.sizes)) rawList.push(...product.sizes);
  if (Array.isArray(product.tamanhos)) rawList.push(...product.tamanhos);
  if (Array.isArray(product.grade)) {
    product.grade.forEach((g: any) => {
      if (typeof g === 'string' || typeof g === 'number') rawList.push(g);
      else if (g?.saldo !== undefined && Number(g.saldo) <= 0) return;
      else if (g?.estoque !== undefined && Number(g.estoque) <= 0) return;
      else if (g?.tamanho) rawList.push(g.tamanho);
      else if (g?.size) rawList.push(g.size);
    });
  } else if (product.grade && typeof product.grade === 'object') {
    if (Array.isArray(product.grade.tamanhos)) rawList.push(...product.grade.tamanhos);
  }
  if (Array.isArray(product.grades)) {
    product.grades.forEach((g: any) => {
      if (g?.saldo !== undefined && Number(g.saldo) <= 0) return;
      if (g?.estoque !== undefined && Number(g.estoque) <= 0) return;
      if (g?.tamanho) rawList.push(g.tamanho);
      else if (g?.size) rawList.push(g.size);
    });
  }
  if (Array.isArray(product.variacoes)) {
    product.variacoes.forEach((v: any) => {
      if (v?.saldo !== undefined && Number(v.saldo) <= 0) return;
      if (v?.estoque !== undefined && Number(v.estoque) <= 0) return;
      if (v?.tamanho) rawList.push(v.tamanho);
      else if (v?.size) rawList.push(v.size);
    });
  }
  if (Array.isArray(product.saldos_lojas_grade)) {
    product.saldos_lojas_grade.forEach((s: any) => {
      if (s?.saldo !== undefined && Number(s.saldo) <= 0) return;
      if (s?.estoque !== undefined && Number(s.estoque) <= 0) return;
      if (s?.tamanho) rawList.push(s.tamanho);
      else if (s?.tam) rawList.push(s.tam);
    });
  }
  if (hasStockMap) {
    Object.keys(stockObj).forEach((k) => {
      if (Number(stockObj[k] ?? 0) > 0) rawList.push(k);
    });
  }

  const cleaned = rawList
    .map((val) => String(val ?? '').trim())
    .filter((val) => {
      if (
        val === '' ||
        val === '0' ||
        val === 'null' ||
        val === 'undefined' ||
        val === 'UN' ||
        val === 'ÚNICO'
      ) {
        return false;
      }
      if (hasStockMap && val in stockObj && Number(stockObj[val] ?? 0) <= 0) {
        return false;
      }
      return true;
    });

  const unique = Array.from(new Set(cleaned));
  return unique.sort((a, b) => {
    const numA = parseFloat(a.replace(',', '.'));
    const numB = parseFloat(b.replace(',', '.'));
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });
};

const StorefrontProductCardComponent: React.FC<StorefrontProductCardProps> = ({
  product,
  theme = 'light',
  isFavorite = false,
  onToggleFavorite,
  onViewDetails,
}) => {
  const { storeThemeTokens } = useApp();
  const cardTokens = storeThemeTokens.cards;
  const isDark = theme === 'dark';
  const availableSizes = useMemo(() => extractAvailableSizes(product), [product]);

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
      whileHover={{ y: -8 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className={`group relative flex flex-col justify-between h-full rounded-2xl sm:rounded-3xl border transition-all duration-300 overflow-hidden cursor-pointer ${
        isDark
          ? `bg-[#101828]/95 ${cardTokens.borderDark} text-white ${cardTokens.borderHoverDark} ${cardTokens.shadowHoverDark} backdrop-blur-md`
          : `bg-white ${cardTokens.borderLight} text-[#003B73] shadow-md ${cardTokens.borderHoverLight} ${cardTokens.shadowHoverLight}`
      }`}
      onClick={handleClick}
    >
      {/* Moldura da Foto do Produto com Efeitos de Profundidade */}
      <div
        className={`relative aspect-square w-full overflow-hidden p-3.5 min-[390px]:p-5 sm:p-6 flex items-center justify-center border-b transition-all duration-500 ${
          isDark ? cardTokens.photoBgDark : cardTokens.photoBgLight
        }`}
      >
        <ProductImage product={product} />

        {/* Badges no Canto Superior Esquerdo */}
        <ProductBadges product={product} position="corner" />

        {/* Botão de Favoritos com Animação */}
        {onToggleFavorite && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(product.id);
            }}
            className={`absolute top-2.5 right-2.5 p-1.5 min-[390px]:p-2 rounded-full border transition-all duration-300 z-10 cursor-pointer ${
              isFavorite
                ? 'bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-500/30 scale-105'
                : isDark
                  ? 'bg-slate-900/80 border-white/10 text-slate-400 hover:text-white hover:bg-slate-800 hover:scale-110'
                  : 'bg-white/90 border-blue-900/10 text-[#52708F] hover:text-rose-500 hover:bg-white hover:scale-110 shadow-xs'
            }`}
            title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          >
            <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isFavorite ? 'fill-white' : ''}`} />
          </button>
        )}

        {/* Overlay Flutuante de Grade de Tamanhos ao passar o mouse */}
        {availableSizes.length > 0 && (
          <div className="absolute bottom-2.5 inset-x-2.5 z-20 opacity-0 translate-y-3 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 ease-out">
            <div
              className={`bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-2.5 border ${
                storeThemeTokens.isBlackFriday
                  ? 'border-amber-500/40 shadow-black/40'
                  : storeThemeTokens.isOutubroRosa
                  ? 'border-pink-300/50 dark:border-pink-500/30 shadow-pink-500/10'
                  : 'border-blue-900/10 dark:border-white/10'
              } shadow-xl flex flex-col items-center gap-1.5`}
            >
              <span
                className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                  storeThemeTokens.isBlackFriday
                    ? 'text-amber-400 dark:text-amber-300'
                    : storeThemeTokens.isOutubroRosa
                    ? 'text-[#9D174D] dark:text-pink-300'
                    : 'text-[#003B73] dark:text-blue-300'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                    storeThemeTokens.isBlackFriday
                      ? 'bg-amber-400'
                      : storeThemeTokens.isOutubroRosa
                      ? 'bg-[#EC4899]'
                      : 'bg-[#006EDB]'
                  }`}
                />
                Tamanhos Disponíveis
              </span>
              <div className="flex flex-wrap items-center justify-center gap-1 max-h-[58px] overflow-y-auto no-scrollbar w-full">
                {availableSizes.slice(0, 6).map((size) => (
                  <span
                    key={size}
                    className={`min-w-[24px] h-6 px-1.5 rounded-lg text-[11px] font-black flex items-center justify-center border shadow-xs transition-colors ${cardTokens.sizePillBorder} ${cardTokens.sizePillText} ${cardTokens.sizePillHover}`}
                  >
                    {size}
                  </span>
                ))}
                {availableSizes.length > 6 && (
                  <span
                    className={`text-[10px] font-black px-1 py-0.5 ${
                      storeThemeTokens.isBlackFriday
                        ? 'text-amber-400'
                        : storeThemeTokens.isOutubroRosa
                        ? 'text-[#EC4899] dark:text-pink-400'
                        : 'text-[#006EDB] dark:text-blue-400'
                    }`}
                  >
                    +{availableSizes.length - 6}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Informações do Produto */}
      <div className="p-3 min-[390px]:p-4 sm:p-5 flex flex-col justify-between flex-1 space-y-2 min-[390px]:space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-1.5 min-[390px]:gap-2">
            <span className="text-[9.5px] min-[390px]:text-[10px] font-black uppercase tracking-widest text-[#52708F] dark:text-slate-400 truncate">
              {product.category || 'Evidência Calçados'}
            </span>

            {/* Selo Compacto de Grade para Mobile (sem hover) */}
            {availableSizes.length > 0 && (
              <span
                className={`sm:hidden text-[8.5px] min-[390px]:text-[9px] font-bold px-1.5 min-[390px]:px-2 py-0.5 rounded-full border shrink-0 ${cardTokens.mobileSizeBadge}`}
              >
                {availableSizes.length > 1
                  ? `${availableSizes[0]} ao ${availableSizes[availableSizes.length - 1]}`
                  : `Tam: ${availableSizes[0]}`}
              </span>
            )}
          </div>

          {/* Título com transição de cor suave */}
          <h3
            className={`text-xs min-[390px]:text-sm font-black tracking-tight line-clamp-2 min-h-[32px] min-[390px]:min-h-[40px] leading-snug transition-colors ${
              isDark
                ? `text-slate-100 ${cardTokens.titleHoverDark}`
                : `text-[#003B73] ${cardTokens.titleHoverLight}`
            }`}
          >
            {product.name}
          </h3>

          {/* Preço e Parcelamento */}
          <ProductPriceDisplay product={product} theme={theme} showInstallments={true} />
        </div>

        {/* Botão Comprar com Micro-animação */}
        <div className="pt-0.5 sm:pt-1">
          <button
            type="button"
            onClick={handleClick}
            className={`group/btn w-full py-2 min-[390px]:py-2.5 px-3 min-[390px]:px-4 rounded-full active:scale-[0.98] ${cardTokens.buyButtonText} text-[11px] min-[390px]:text-xs font-black tracking-wider transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center space-x-1.5 min-[390px]:space-x-2 cursor-pointer ${cardTokens.buyButtonGradient} ${cardTokens.buyButtonHover} ${cardTokens.buyButtonShadow}`}
          >
            <span>Comprar</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5] group-hover/btn:translate-x-1.5 transition-transform duration-300" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export const StorefrontProductCard = React.memo(StorefrontProductCardComponent);
export const ProductCard = StorefrontProductCard;
