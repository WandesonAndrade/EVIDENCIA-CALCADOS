import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import { getApplicablePromotion, isCampaignActive, getCampaignDiscountLabels } from '../services/promotionsService';
import { hasProductValidPhoto } from '../utils/photoUtils';
import { isIgnoredClassification } from '../services/moblinkProductsService';
import { ProductCard } from './products/storefront/StorefrontProductCard';

interface PromotionsSectionProps {
  onViewDetails: (product: Product) => void;
}

export const PromotionsSection: React.FC<PromotionsSectionProps> = ({ onViewDetails }) => {
  const {
    products = [],
    promotions = [],
    favorites = [],
    toggleFavorite,
    theme = 'light',
    storeThemeTokens,
    homeSections,
    setSelectedCategory,
    setSelectedSubcategory,
    setSelectedMenuTab,
    setCurrentView,
  } = useApp();

  const isDark = theme === 'dark';
  const navTokens = storeThemeTokens.navigation;

  // Verifica se a seção de ofertas/promoções está habilitada no CMS da Home
  const offersSection = homeSections?.find((s) => s.id === 'offers');
  if (offersSection?.enabled === false) {
    return null;
  }

  // 1. Identifica todas as campanhas ativas vigentes
  const activeCampaigns = useMemo(() => {
    return (promotions || []).filter((c) => isCampaignActive(c));
  }, [promotions]);

  // Produtos ativos em estoque com foto válida
  const availableProducts = useMemo(() => {
    return products.filter((p) => {
      const isAvailable = (p.stock !== undefined ? p.stock > 0 : (p.saldo_loja ?? 0) > 0);
      return p.visible && isAvailable && hasProductValidPhoto(p) && !isIgnoredClassification(p);
    });
  }, [products]);

  // 2. Mapeia cada campanha ativa aos seus respectivos produtos correspondentes
  const campaignsWithProducts = useMemo(() => {
    return activeCampaigns.map((campaign) => {
      const campaignProducts = availableProducts.filter((prod) => {
        const promo = getApplicablePromotion(prod, [campaign]);
        return !!promo;
      });

      return {
        campaign,
        products: campaignProducts,
      };
    }).filter((entry) => entry.products.length > 0);
  }, [activeCampaigns, availableProducts]);

  // 3. Fallback de produtos gerais em oferta (caso não haja campanhas específicas ativas)
  const generalSaleProducts = useMemo(() => {
    if (campaignsWithProducts.length > 0) return [];

    const matches = availableProducts.filter(
      (p) => p.onSale || (p.originalPrice && p.originalPrice > p.price)
    );

    if (matches.length > 0) return matches.slice(0, 5);

    // Fallback de calçados ativos para vitrine não ficar vazia
    return availableProducts.slice(0, 5);
  }, [campaignsWithProducts.length, availableProducts]);

  if (campaignsWithProducts.length === 0 && generalSaleProducts.length === 0) {
    return null;
  }

  const handleViewAll = (campaignId?: string) => {
    if (setSelectedSubcategory) setSelectedSubcategory('TODAS');
    if (campaignId) {
      if (setSelectedCategory) setSelectedCategory(`promo:${campaignId}`);
      if (setSelectedMenuTab) setSelectedMenuTab(`promo:${campaignId}`);
    } else {
      if (setSelectedCategory) setSelectedCategory('PROMOÇÕES');
      if (setSelectedMenuTab) setSelectedMenuTab('promoções');
    }
    if (setCurrentView) setCurrentView('category-page');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Se houver campanhas ativas configuradas, renderiza cada campanha com seu próprio cabeçalho e produtos
  if (campaignsWithProducts.length > 0) {
    return (
      <div id="promotions-vitrine-section" className="space-y-10 sm:space-y-16">
        {campaignsWithProducts.map(({ campaign, products: campProducts }) => {
          const discountLabels = getCampaignDiscountLabels(campaign);
          const sectionTitle = campaign.headerLabel?.trim() || campaign.title;
          const sectionDescription = campaign.description?.trim() || 
            `Aproveite descontos especiais com ${discountLabels.generalLabel} aplicados diretamente no carrinho.`;

          return (
            <div key={campaign.id} className="space-y-6">
              
              {/* CABEÇALHO DA CAMPANHA */}
              <div className={`flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b pb-3 ${navTokens.sectionDivider}`}>
                <div>
                  <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-[#003B73]'}`}>
                    {sectionTitle}
                  </h2>
                  <p className={`text-xs sm:text-sm font-medium mt-0.5 ${isDark ? 'text-slate-400' : 'text-[#52708F]'}`}>
                    {sectionDescription}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleViewAll(campaign.id)}
                  className={`text-xs font-extrabold ${navTokens.seeAllTextLight} ${navTokens.seeAllHover} ${navTokens.seeAllTextDark} transition-colors cursor-pointer shrink-0`}
                >
                  Ver todos de {campaign.title} →
                </button>
              </div>

              {/* GRID RESPONSIVA DE 5 COLUNAS */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {campProducts.slice(0, 5).map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    theme={theme}
                    isFavorite={favorites.includes(product.id)}
                    onToggleFavorite={toggleFavorite}
                    onViewDetails={onViewDetails}
                  />
                ))}
              </div>

            </div>
          );
        })}
      </div>
    );
  }

  // Fallback: exibição de ofertas gerais quando não houver campanhas ativas
  return (
    <div id="promotions-vitrine-section" className="space-y-6">
      
      {/* CABEÇALHO GERAL DE PROMOÇÕES */}
      <div className={`flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b pb-3 ${navTokens.sectionDivider}`}>
        <div>
          <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-[#003B73]'}`}>
            Destaques em Promoção
          </h2>
          <p className={`text-xs sm:text-sm font-medium mt-0.5 ${isDark ? 'text-slate-400' : 'text-[#52708F]'}`}>
            Os produtos mais desejados com descontos exclusivos aplicados diretamente no carrinho.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleViewAll()}
          className={`text-xs font-extrabold ${navTokens.seeAllTextLight} ${navTokens.seeAllHover} ${navTokens.seeAllTextDark} transition-colors cursor-pointer shrink-0`}
        >
          Ver todas as promoções →
        </button>
      </div>

      {/* GRID RESPONSIVA DE 5 COLUNAS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {generalSaleProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            theme={theme}
            isFavorite={favorites.includes(product.id)}
            onToggleFavorite={toggleFavorite}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>

    </div>
  );
};
