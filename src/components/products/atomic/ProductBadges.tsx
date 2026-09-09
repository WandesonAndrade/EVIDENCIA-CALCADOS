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
  const { saldaoConfig, promotions = [] } = useApp();
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

  if (position === 'corner') {
    return (
      <div className="absolute top-3.5 left-3.5 flex flex-col gap-1 z-10">
        {saldaoCalc.isSaldao ? (
          <span className="px-2.5 py-1 text-[10px] font-black text-white bg-gradient-to-r from-rose-600 to-amber-500 rounded-full shadow-md uppercase tracking-wider animate-pulse flex items-center gap-1">
            🔥 SALDÃO -{saldaoCalc.discountPercent}%
          </span>
        ) : applicablePromo ? (
          <span className="px-2.5 py-1 text-[10px] font-black text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full shadow-md uppercase tracking-wider animate-bounce flex items-center gap-1">
            🏷️ {applicablePromo.discountLabel}
          </span>
        ) : discountPercent > 0 ? (
          <span className="px-2.5 py-0.5 text-[10px] font-bold text-white bg-[#e30000] rounded-full shadow-xs uppercase tracking-wider">
            -{discountPercent}% OFF
          </span>
        ) : (
          <span className="px-2.5 py-0.5 text-[10px] font-bold text-white bg-[#006EDB] rounded-full shadow-xs uppercase tracking-wider">
            Novo
          </span>
        )}
      </div>
    );
  }

  // Inline mode (usado em listas ou cards detalhados)
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {saldaoCalc.isSaldao && (
        <span className="px-2 py-0.5 text-[9px] font-black text-white bg-rose-600 rounded-md uppercase">
          Saldão -{saldaoCalc.discountPercent}%
        </span>
      )}
      {applicablePromo && (
        <span className="px-2 py-0.5 text-[9px] font-black text-amber-950 bg-amber-400 rounded-md uppercase">
          {applicablePromo.discountLabel}
        </span>
      )}
      {discountPercent > 0 && !saldaoCalc.isSaldao && !applicablePromo && (
        <span className="px-2 py-0.5 text-[9px] font-bold text-white bg-[#e30000] rounded-md uppercase">
          -{discountPercent}% OFF
        </span>
      )}
      {Boolean(product.newArrival) && (
        <span className="px-2 py-0.5 text-[9px] font-extrabold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 rounded-md border border-purple-300/40 inline-flex items-center gap-1">
          <Sparkles className="h-2.5 w-2.5" />
          Lançamento
        </span>
      )}
      {showErpInfo && product.classificacao && (
        <span className="px-2 py-0.5 text-[9px] font-mono font-bold text-[#0071E3] bg-blue-50 dark:bg-blue-950/50 rounded-md border border-blue-200/50 inline-flex items-center gap-1">
          <Layers className="h-2.5 w-2.5" />
          {String(product.classificacao)}
        </span>
      )}
    </div>
  );
};
