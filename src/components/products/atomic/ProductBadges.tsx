import React from 'react';
import { Product } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { getSaldaoProductPrice } from '../../../services/saldaoService';
import { getApplicablePromotion } from '../../../services/promotionsService';
import { Sparkles, Layers, Tag } from 'lucide-react';

export interface ProductBadgesProps {
  product: Product;
  position?: 'corner' | 'inline';
  showErpInfo?: boolean;
}

export const ProductBadges: React.FC<ProductBadgesProps> = ({
  product,
  position = 'corner',
  showErpInfo = false,
}) => {
  const { saldaoConfig, promotions = [], storeThemeTokens } = useApp();
  const cardTokens = storeThemeTokens.cards;
  const saldaoCalc = getSaldaoProductPrice(product, saldaoConfig);
  const applicablePromo = getApplicablePromotion(product, promotions);

  let mainPrice = saldaoCalc.price;
  let originalPrice = saldaoCalc.isSaldao
    ? saldaoCalc.originalPrice
    : product.originalPrice && product.originalPrice > product.price
      ? product.originalPrice
      : null;

  if (!saldaoCalc.isSaldao && applicablePromo) {
    mainPrice = applicablePromo.promoPrice;
    originalPrice = applicablePromo.originalPrice;
  }

  const discountPercent = saldaoCalc.isSaldao
    ? saldaoCalc.discountPercent
    : applicablePromo
      ? (applicablePromo.campaign.discountType === 'percentage'
          ? applicablePromo.campaign.discountValue
          : (originalPrice ? Math.round(((originalPrice - mainPrice) / originalPrice) * 100) : 0))
      : originalPrice
        ? Math.round(((originalPrice - mainPrice) / originalPrice) * 100)
        : 0;

  const saldaoLabel = (saldaoConfig?.tagLabel?.trim() || 'SALDÃO').toUpperCase();
  const saldaoBadgeText = `${saldaoLabel} -${saldaoCalc.discountPercentVista}%`;

  const saldaoCustomStyle: React.CSSProperties | undefined = saldaoConfig?.tagColor ? {
    background: `linear-gradient(135deg, ${saldaoConfig.tagColor}, ${saldaoConfig.tagColorEnd || saldaoConfig.tagColor})`,
    color: saldaoConfig.tagTextColor || '#FFFFFF',
  } : undefined;

  const promoCustomStyle: React.CSSProperties | undefined = applicablePromo?.tagColor ? {
    background: `linear-gradient(135deg, ${applicablePromo.tagColor}, ${applicablePromo.tagColorEnd || applicablePromo.tagColor})`,
    color: applicablePromo.tagTextColor || '#FFFFFF',
  } : undefined;

  const promoLabelText = applicablePromo
    ? `${(applicablePromo.tagLabel || 'OFERTA').toUpperCase()} ${applicablePromo.discountLabelVista || applicablePromo.discountLabel}`
    : '';

  if (position === 'corner') {
    return (
      <div className="absolute top-2 min-[390px]:top-2.5 left-2 min-[390px]:left-2.5 flex flex-col gap-1 z-10">
        {saldaoCalc.isSaldao ? (
          <span
            style={saldaoCustomStyle}
            className={`px-2 min-[390px]:px-2.5 py-0.5 min-[390px]:py-1 text-[9px] min-[390px]:text-[10px] font-black ${
              !saldaoConfig?.tagColor ? cardTokens.cornerBadgeSaldao : 'shadow-md shadow-black/20'
            } rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1`}
          >
            {saldaoBadgeText}
          </span>
        ) : applicablePromo ? (
          <span
            style={promoCustomStyle}
            className={`px-2 min-[390px]:px-2.5 py-0.5 min-[390px]:py-1 text-[9px] min-[390px]:text-[10px] font-black ${
              !applicablePromo.tagColor ? cardTokens.cornerBadgePromo : 'shadow-md shadow-black/20'
            } rounded-full uppercase tracking-wider animate-bounce flex items-center gap-1`}
          >
            {promoLabelText}
          </span>
        ) : discountPercent > 0 ? (
          <span
            className={`px-2 min-[390px]:px-2.5 py-0.5 text-[9px] min-[390px]:text-[10px] font-bold ${cardTokens.cornerBadgeDiscount} rounded-full shadow-xs uppercase tracking-wider`}
          >
            {cardTokens.cornerBadgeLabel(false, discountPercent)}
          </span>
        ) : (
          <span
            className={`px-2 min-[390px]:px-2.5 py-0.5 text-[9px] min-[390px]:text-[10px] font-bold ${cardTokens.cornerBadgeNew} rounded-full shadow-xs uppercase tracking-wider`}
          >
            {cardTokens.cornerBadgeLabel(false, 0)}
          </span>
        )}
      </div>
    );
  }

  // Inline mode (usado em listas ou cards detalhados)
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {saldaoCalc.isSaldao && (
        <span
          style={saldaoCustomStyle}
          className={`px-2 py-0.5 text-[9px] font-black ${
            !saldaoConfig?.tagColor ? cardTokens.cornerBadgeSaldao : 'shadow-xs'
          } rounded-md uppercase`}
        >
          {saldaoBadgeText}
        </span>
      )}
      {applicablePromo && (
        <span
          style={promoCustomStyle}
          className={`px-2 py-0.5 text-[9px] font-black ${
            !applicablePromo.tagColor ? cardTokens.cornerBadgePromo : 'shadow-xs'
          } rounded-md uppercase`}
        >
          {promoLabelText}
        </span>
      )}
      {discountPercent > 0 && !saldaoCalc.isSaldao && !applicablePromo && (
        <span
          className={`px-2 py-0.5 text-[9px] font-bold ${cardTokens.cornerBadgeDiscount} rounded-md uppercase`}
        >
          {cardTokens.cornerBadgeLabel(false, discountPercent)}
        </span>
      )}
      {Boolean(product.newArrival) && (
        <span className="px-2 py-0.5 text-[9px] font-extrabold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 rounded-md border border-purple-300/40 inline-flex items-center gap-1">
          <Sparkles className="h-2.5 w-2.5" />
          Lançamento
        </span>
      )}
      {showErpInfo && product.classificacao && (
        <span className="px-1.5 py-0.5 text-[8.5px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1">
          <Layers className="h-2.5 w-2.5" />
          {product.classificacao}
        </span>
      )}
      {showErpInfo && ((product as any).marca || (product as any).brand) && (
        <span className="px-1.5 py-0.5 text-[8.5px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1">
          <Tag className="h-2.5 w-2.5" />
          {(product as any).marca || (product as any).brand}
        </span>
      )}
    </div>
  );
};
