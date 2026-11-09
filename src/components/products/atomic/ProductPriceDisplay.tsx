import React from 'react';
import { Product } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { getSaldaoProductPrice } from '../../../services/saldaoService';
import { getApplicablePromotion } from '../../../services/promotionsService';

export interface ProductPriceDisplayProps {
  product: Product;
  theme?: string;
  showInstallments?: boolean;
  compact?: boolean;
}

export function calculateProductPriceDetails(
  product: Product,
  saldaoConfig?: any,
  promotions: any[] = []
) {
  const saldaoCalc = getSaldaoProductPrice(product, saldaoConfig);
  const applicablePromo = getApplicablePromotion(product, promotions);

  let mainPrice = saldaoCalc.isSaldao ? saldaoCalc.pricePrazo : saldaoCalc.price;
  let originalPrice = saldaoCalc.isSaldao
    ? saldaoCalc.originalPrice
    : product.originalPrice && product.originalPrice > product.price
      ? product.originalPrice
      : null;

  if (!saldaoCalc.isSaldao && applicablePromo) {
    mainPrice = applicablePromo.pricePrazo ?? applicablePromo.promoPrice;
    originalPrice = applicablePromo.originalPrice;
  }

  const discountPercent = saldaoCalc.isSaldao
    ? saldaoCalc.discountPercentVista
    : applicablePromo
      ? (applicablePromo.campaign.discountType === 'percentage'
          ? (applicablePromo.campaign.discountValueVista ?? applicablePromo.campaign.discountValue)
          : (originalPrice ? Math.round(((originalPrice - (applicablePromo.priceVista ?? mainPrice)) / originalPrice) * 100) : 0))
      : originalPrice
        ? Math.round(((originalPrice - mainPrice) / originalPrice) * 100)
        : 0;

  const rawPix = saldaoCalc.isSaldao
    ? saldaoCalc.priceVista
    : applicablePromo
      ? (applicablePromo.priceVista ?? mainPrice)
      : mainPrice * 0.9;
  const pixPrice = rawPix.toFixed(2).replace('.', ',');
  const parcelas = 10;
  const valorParcela = (mainPrice / parcelas).toFixed(2).replace('.', ',');

  return {
    mainPrice,
    originalPrice,
    discountPercent,
    rawPix,
    pixPrice,
    parcelas,
    valorParcela,
    isSaldao: saldaoCalc.isSaldao,
    saldaoCalc,
    applicablePromo,
  };
}

export const ProductPriceDisplay: React.FC<ProductPriceDisplayProps> = ({
  product,
  theme = 'light',
  showInstallments = true,
  compact = false,
}) => {
  const { saldaoConfig, promotions = [], storeThemeTokens } = useApp();
  const isDark = theme === 'dark';
  const cardTokens = storeThemeTokens.cards;

  const {
    mainPrice,
    originalPrice,
    discountPercent,
    pixPrice,
    parcelas,
    valorParcela,
    isSaldao,
    saldaoCalc,
    applicablePromo,
  } = calculateProductPriceDetails(product, saldaoConfig, promotions);

  const priceColorClass = isDark ? cardTokens.priceColorDark : cardTokens.priceColorLight;

  const saldaoLabel = saldaoConfig?.tagLabel?.trim() || 'Saldão';
  const isSaldaoCustomColor = isSaldao && Boolean(saldaoConfig?.tagColor);
  const saldaoPriceBadgeStyle: React.CSSProperties | undefined = isSaldaoCustomColor ? {
    backgroundColor: `${saldaoConfig.tagColor}18`,
    borderColor: `${saldaoConfig.tagColor}40`,
    color: saldaoConfig.tagColor,
  } : undefined;

  const isPromoCustomColor = !isSaldao && Boolean(applicablePromo?.tagColor);
  const promoPriceBadgeStyle: React.CSSProperties | undefined = isPromoCustomColor ? {
    backgroundColor: `${applicablePromo!.tagColor}18`,
    borderColor: `${applicablePromo!.tagColor}40`,
    color: applicablePromo!.tagColor,
  } : undefined;

  const priceBadgeCustomStyle = saldaoPriceBadgeStyle || promoPriceBadgeStyle;

  if (compact) {
    return (
      <div className="space-y-0.5">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className={`font-mono font-black text-sm ${priceColorClass}`}>
            R$ {pixPrice}
          </span>
          {originalPrice && (
            <span className="text-[10px] line-through text-slate-400">
              R$ {originalPrice.toFixed(2).replace('.', ',')}
            </span>
          )}
        </div>
        <span className="text-[9px] text-slate-400 block">
          À vista (ou {parcelas}x de R$ {valorParcela})
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-1 pt-1">
      <div className="space-y-0.5">
        <div className="flex items-center space-x-1 min-[390px]:space-x-1.5 flex-wrap gap-y-0.5">
          <span
            style={priceBadgeCustomStyle}
            className={`text-[9px] min-[390px]:text-[10px] font-black uppercase tracking-wider px-1.5 min-[390px]:px-2 py-0.5 rounded-md border ${
              isSaldaoCustomColor || isPromoCustomColor
                ? 'shadow-xs font-black'
                : storeThemeTokens.isBlackFriday
                ? 'text-amber-300 dark:text-amber-300 bg-neutral-900 border-amber-500/40 shadow-xs'
                : storeThemeTokens.isOutubroRosa
                ? 'text-[#9D174D] dark:text-pink-300 bg-pink-100 dark:bg-pink-950/80 border-pink-300/60'
                : isSaldao
                  ? 'text-rose-800 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 border-rose-300/50'
                  : applicablePromo
                    ? 'text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 border-amber-300/50'
                    : 'text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border-emerald-300/50'
            }`}
          >
            {isSaldao
              ? (saldaoCalc.discountPercentVista !== saldaoCalc.discountPercentPrazo
                  ? `${saldaoLabel} (${saldaoCalc.discountPercentVista}% À Vista • ${saldaoCalc.discountPercentPrazo}% A Prazo)`
                  : `${saldaoLabel} (${saldaoCalc.discountPercentVista}% OFF)`)
              : applicablePromo
                ? (applicablePromo.discountLabelVista !== applicablePromo.discountLabelPrazo
                    ? `${applicablePromo.tagLabel || 'Oferta'} (${applicablePromo.discountLabelVista} À Vista • ${applicablePromo.discountLabelPrazo} A Prazo)`
                    : `${applicablePromo.tagLabel || 'Oferta'} (${applicablePromo.discountLabelVista || applicablePromo.discountLabel} OFF)`)
                : 'À Vista no PIX (-10%)'}
          </span>
          {originalPrice && (
            <span className="text-[10.5px] min-[390px]:text-xs line-through text-[#52708F]">
              R$ {originalPrice.toFixed(2).replace('.', ',')}
            </span>
          )}
        </div>
        <div className="flex items-baseline space-x-1.5">
          <span
            className={`text-xl min-[390px]:text-2xl sm:text-3xl font-black tracking-tight ${priceColorClass}`}
          >
            R$ {pixPrice}
          </span>
        </div>
      </div>

      {showInstallments && (
        <p className="text-[10.5px] min-[390px]:text-xs text-[#52708F] font-medium pt-0.5 leading-tight">
          ou{' '}
          <strong
            className={
              storeThemeTokens.isBlackFriday
                ? isDark ? 'text-amber-300' : 'text-neutral-900'
                : storeThemeTokens.isOutubroRosa
                ? isDark ? 'text-pink-300' : 'text-[#9D174D]'
                : isDark ? 'text-slate-200' : 'text-[#003B73]'
            }
          >
            R$ {mainPrice.toFixed(2).replace('.', ',')}
          </strong>{' '}
          em até{' '}
          <strong
            className={
              storeThemeTokens.isBlackFriday
                ? isDark ? 'text-amber-300' : 'text-neutral-900'
                : storeThemeTokens.isOutubroRosa
                ? isDark ? 'text-pink-300' : 'text-[#9D174D]'
                : isDark ? 'text-slate-200' : 'text-[#003B73]'
            }
          >
            {parcelas}x de R$ {valorParcela}
          </strong>{' '}
          s/ juros
        </p>
      )}
    </div>
  );
};
