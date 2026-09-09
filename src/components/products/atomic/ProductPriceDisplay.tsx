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

  const rawPix = (saldaoCalc.isSaldao || applicablePromo) ? mainPrice : mainPrice * 0.9;
  const pixPrice = rawPix.toFixed(2).replace('.', ',');
  const parcelas = 6;
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
    applicablePromo,
  };
}

export const ProductPriceDisplay: React.FC<ProductPriceDisplayProps> = ({
  product,
  theme = 'light',
  showInstallments = true,
  compact = false,
}) => {
  const { saldaoConfig, promotions = [] } = useApp();
  const isDark = theme === 'dark';

  const {
    mainPrice,
    originalPrice,
    discountPercent,
    pixPrice,
    parcelas,
    valorParcela,
    isSaldao,
    applicablePromo,
  } = calculateProductPriceDetails(product, saldaoConfig, promotions);

  if (compact) {
    return (
      <div className="space-y-0.5">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="font-mono font-black text-sm text-[#003B73] dark:text-blue-400">
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
        <div className="flex items-center space-x-1.5 flex-wrap">
          <span
            className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
              isSaldao
                ? 'text-rose-800 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 border-rose-300/50'
                : applicablePromo
                  ? 'text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 border-amber-300/50'
                  : 'text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border-emerald-300/50'
            }`}
          >
            {isSaldao
              ? `Saldão (${discountPercent}% OFF)`
              : applicablePromo
                ? `Oferta (${applicablePromo.discountLabel} OFF)`
                : 'À Vista no PIX (-10%)'}
          </span>
          {originalPrice && (
            <span className="text-xs line-through text-[#52708F]">
              R$ {originalPrice.toFixed(2).replace('.', ',')}
            </span>
          )}
        </div>
        <div className="flex items-baseline space-x-1.5">
          <span className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-[#003B73]'}`}>
            R$ {pixPrice}
          </span>
        </div>
      </div>

      {showInstallments && (
        <p className="text-xs text-[#52708F] font-medium pt-0.5">
          ou <strong className={isDark ? 'text-slate-200' : 'text-[#003B73]'}>R$ {mainPrice.toFixed(2).replace('.', ',')}</strong> em até{' '}
          <strong className={isDark ? 'text-slate-200' : 'text-[#003B73]'}>{parcelas}x de R$ {valorParcela}</strong> s/ juros
        </p>
      )}
    </div>
  );
};
