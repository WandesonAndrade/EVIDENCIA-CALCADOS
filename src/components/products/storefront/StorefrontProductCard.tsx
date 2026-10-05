import React, { useMemo } from 'react';
import { Product } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { Heart, ArrowRight, Layers } from 'lucide-react';
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

  const rawList: (string | number)[] = [];

  if (Array.isArray(product.sizes)) rawList.push(...product.sizes);
  if (Array.isArray(product.tamanhos)) rawList.push(...product.tamanhos);
  if (Array.isArray(product.grade)) {
    product.grade.forEach((g: any) => {
      if (typeof g === 'string' || typeof g === 'number') rawList.push(g);
      else if (g?.tamanho) rawList.push(g.tamanho);
      else if (g?.size) rawList.push(g.size);
    });
  } else if (product.grade && typeof product.grade === 'object') {
    if (Array.isArray(product.grade.tamanhos)) rawList.push(...product.grade.tamanhos);
  }
  if (Array.isArray(product.grades)) {
    product.grades.forEach((g: any) => {
      if (g?.tamanho) rawList.push(g.tamanho);
      else if (g?.size) rawList.push(g.size);
    });
  }
  if (Array.isArray(product.variacoes)) {
    product.variacoes.forEach((v: any) => {
      if (v?.tamanho) rawList.push(v.tamanho);
      else if (v?.size) rawList.push(v.size);
    });
  }
  if (Array.isArray(product.saldos_lojas_grade)) {
    product.saldos_lojas_grade.forEach((s: any) => {
      if (s?.tamanho) rawList.push(s.tamanho);
      else if (s?.tam) rawList.push(s.tam);
    });
  }
  const stockObj = product.stockBySize || product.sizeStockMap;
  if (stockObj && typeof stockObj === 'object') {
    Object.keys(stockObj).forEach((k) => {
      if ((stockObj[k] ?? 0) > 0) rawList.push(k);
    });
  }

  const cleaned = rawList
    .map((val) => String(val ?? '').trim())
    .filter(
      (val) =>
        val !== '' &&
        val !== '0' &&
        val !== 'null' &&
        val !== 'undefined' &&
        val !== 'UN' &&
        val !== 'ÚNICO'
    );

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
  const { storeTheme } = useApp();
  const isOutubroRosa = storeTheme === 'outubro-rosa';
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
      className={`group relative flex flex-col justify-between h-full rounded-3xl border transition-all duration-300 overflow-hidden cursor-pointer ${
        isDark
          ? isOutubroRosa
            ? 'bg-[#101828]/95 border-pink-500/15 text-white hover:border-[#EC4899]/60 hover:shadow-2xl hover:shadow-pink-950/80 backdrop-blur-md'
            : 'bg-[#101828]/95 border-white/10 text-white hover:border-blue-400/50 hover:shadow-2xl hover:shadow-blue-950/80 backdrop-blur-md'
          : isOutubroRosa
            ? 'bg-white border-pink-900/10 text-[#003B73] shadow-md shadow-pink-900/5 hover:border-[#EC4899]/70 hover:shadow-2xl hover:shadow-pink-900/15'
            : 'bg-white border-blue-900/10 text-[#003B73] shadow-md shadow-blue-900/5 hover:border-[#006EDB]/70 hover:shadow-2xl hover:shadow-blue-900/15'
      }`}
      onClick={handleClick}
    >
      {/* Moldura da Foto do Produto com Efeitos de Profundidade */}
      <div
        className={`relative aspect-square w-full overflow-hidden p-6 flex items-center justify-center border-b transition-all duration-500 ${
          isDark
            ? isOutubroRosa
              ? 'bg-gradient-to-b from-[#420626] to-[#101828] border-pink-500/10 group-hover:from-[#540832] group-hover:to-[#181124]'
              : 'bg-gradient-to-b from-[#162238] to-[#101828] border-white/5 group-hover:from-[#1B2A45] group-hover:to-[#121B2D]'
            : isOutubroRosa
              ? 'bg-gradient-to-b from-[#FFF5F8] via-[#FDF2F6] to-[#FAEDF3] border-pink-900/5 group-hover:from-[#FFEBF2] group-hover:to-[#FCE2EE]'
              : 'bg-gradient-to-b from-[#F2F8FF] via-[#EBF4FC] to-[#E3EFFB] border-blue-900/5 group-hover:from-[#EAF4FE] group-hover:to-[#DDF1FF]'
        }`}
      >
        {/* Glow ambiente sutil no hover */}
        <div
          className={`absolute inset-0 transition-colors duration-500 pointer-events-none ${
            isOutubroRosa ? 'bg-pink-500/0 group-hover:bg-pink-500/5' : 'bg-blue-500/0 group-hover:bg-blue-500/5'
          }`}
        />

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
            className={`absolute top-3.5 right-3.5 p-2 rounded-full border transition-all duration-300 z-10 cursor-pointer ${
              isFavorite
                ? 'bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-500/30 scale-105'
                : isDark
                  ? 'bg-slate-900/80 border-white/10 text-slate-400 hover:text-white hover:bg-slate-800 hover:scale-110'
                  : 'bg-white/90 border-blue-900/10 text-[#52708F] hover:text-rose-500 hover:bg-white hover:scale-110 shadow-xs'
            }`}
            title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-white' : ''}`} />
          </button>
        )}

        {/* Overlay Flutuante de Grade de Tamanhos ao passar o mouse */}
        {availableSizes.length > 0 && (
          <div className="absolute bottom-2.5 inset-x-2.5 z-20 opacity-0 translate-y-3 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 ease-out">
            <div
              className={`bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-2.5 border ${
                isOutubroRosa
                  ? 'border-pink-300/50 dark:border-pink-500/30 shadow-pink-500/10'
                  : 'border-blue-900/10 dark:border-white/10'
              } shadow-xl flex flex-col items-center gap-1.5`}
            >
              <span
                className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                  isOutubroRosa ? 'text-[#9D174D] dark:text-pink-300' : 'text-[#003B73] dark:text-blue-300'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                    isOutubroRosa ? 'bg-[#EC4899]' : 'bg-[#006EDB]'
                  }`}
                />
                Tamanhos Disponíveis
              </span>
              <div className="flex flex-wrap items-center justify-center gap-1 max-h-[58px] overflow-y-auto no-scrollbar w-full">
                {availableSizes.slice(0, 6).map((size) => (
                  <span
                    key={size}
                    className={`min-w-[24px] h-6 px-1.5 rounded-lg text-[11px] font-black flex items-center justify-center border shadow-xs transition-colors ${
                      isOutubroRosa
                        ? 'bg-pink-50 dark:bg-pink-950/50 text-[#9D174D] dark:text-pink-200 border-pink-200/70 dark:border-pink-800/60 hover:bg-[#EC4899] hover:text-white hover:border-[#EC4899]'
                        : 'bg-blue-50 dark:bg-slate-800 text-[#003B73] dark:text-blue-200 border-blue-200/60 dark:border-slate-700 hover:bg-[#006EDB] hover:text-white hover:border-[#006EDB]'
                    }`}
                  >
                    {size}
                  </span>
                ))}
                {availableSizes.length > 6 && (
                  <span
                    className={`text-[10px] font-black px-1 py-0.5 ${
                      isOutubroRosa ? 'text-[#EC4899] dark:text-pink-400' : 'text-[#006EDB] dark:text-blue-400'
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
      <div className="p-4 sm:p-5 flex flex-col justify-between flex-1 space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#52708F] dark:text-slate-400">
              {product.category || 'Evidência Calçados'}
            </span>

            {/* Selo Compacto de Grade para Mobile (sem hover) */}
            {availableSizes.length > 0 && (
              <span
                className={`sm:hidden text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                  isOutubroRosa
                    ? 'bg-pink-50 dark:bg-pink-950/60 text-[#BE185D] dark:text-pink-300 border-pink-200/60 dark:border-pink-800/40'
                    : 'bg-blue-50 dark:bg-blue-950/60 text-[#006EDB] dark:text-blue-300 border-blue-200/50 dark:border-blue-800/40'
                }`}
              >
                {availableSizes.length > 1
                  ? `${availableSizes[0]} ao ${availableSizes[availableSizes.length - 1]}`
                  : `Tam: ${availableSizes[0]}`}
              </span>
            )}
          </div>

          {/* Título com transição de cor suave */}
          <h3
            className={`text-sm font-black tracking-tight line-clamp-2 min-h-[40px] leading-snug transition-colors ${
              isDark
                ? isOutubroRosa
                  ? 'text-slate-100 group-hover:text-pink-400'
                  : 'text-slate-100 group-hover:text-blue-400'
                : isOutubroRosa
                  ? 'text-[#003B73] group-hover:text-[#EC4899]'
                  : 'text-[#003B73] group-hover:text-[#006EDB]'
            }`}
          >
            {product.name}
          </h3>

          {/* Preço e Parcelamento */}
          <ProductPriceDisplay product={product} theme={theme} showInstallments={true} />
        </div>

        {/* Botão Comprar com Micro-animação */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleClick}
            className={`group/btn w-full py-2.5 px-4 rounded-full active:scale-[0.98] text-white text-xs font-black tracking-wider transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center space-x-2 cursor-pointer ${
              isOutubroRosa
                ? 'bg-gradient-to-r from-[#DB2777] via-[#EC4899] to-[#F472B6] hover:from-[#BE185D] hover:to-[#DB2777] shadow-pink-500/25 hover:shadow-pink-500/35'
                : 'bg-gradient-to-r from-[#006EDB] to-[#00509E] hover:from-[#005AB5] hover:to-[#003B73] shadow-blue-600/20 hover:shadow-blue-600/30'
            }`}
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

