import React from 'react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import { Eye, Heart, ArrowLeft, HeartOff, ShoppingCart } from 'lucide-react';

import { normalizeCategoryName } from '../services/moblinkCategoriesService';

export const FavoritesList: React.FC = () => {
  const { 
    products, 
    favorites = [], 
    toggleFavorite, 
    setCurrentView, 
    setSelectedProduct,
    theme
  } = useApp();

  const favProducts = products.filter((prod) => favorites.includes(prod.id));

  const handleVerDetalhes = (prod: Product) => {
    setSelectedProduct(prod);
    setCurrentView('product-detail');
  };

  return (
    <div id="favorites-list-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Top Bar: Navigation Back Button & Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6 dark:border-slate-800">
        <div>
          <button
            onClick={() => setCurrentView('home')}
            className={`inline-flex items-center space-x-2 text-xs font-semibold cursor-pointer mb-2 transition-colors ${
              theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar para a Vitrine</span>
          </button>
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-2xl ${
              theme === 'dark' ? 'bg-amber-400/10 text-amber-400' : 'bg-red-50 text-red-600'
            }`}>
              <Heart className="h-6 w-6 fill-current" />
            </div>
            <div>
              <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>
                Meus Calçados Favoritos
              </h1>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                {favProducts.length} {favProducts.length === 1 ? 'modelo salvo na sua lista de desejos' : 'modelos salvos na sua lista de desejos'}
              </p>
            </div>
          </div>
        </div>

        {favProducts.length > 0 && (
          <button
            onClick={() => setCurrentView('home')}
            className={`self-start sm:self-auto inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
              theme === 'dark'
                ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ShoppingCart className="h-4 w-4" />
            <span>Continuar Comprando</span>
          </button>
        )}
      </div>

      {/* Main Grid Content */}
      {favProducts.length === 0 ? (
        <div className={`text-center py-16 px-4 rounded-3xl border ${
          theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-100 shadow-sm'
        }`}>
          <div className="max-w-md mx-auto space-y-4">
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
              theme === 'dark' ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'
            }`}>
              <HeartOff className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Sua lista de favoritos está vazia
              </h3>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Você ainda não adicionou nenhum calçado aos favoritos. Toque no ícone de coração nos produtos da vitrine para salvá-los aqui!
              </p>
            </div>
            <button
              onClick={() => setCurrentView('home')}
              className={`inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md cursor-pointer ${
                theme === 'dark'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700'
                  : 'bg-gradient-to-r from-[#9a031e] to-[#5c0099] hover:opacity-95'
              }`}
            >
              <span>Explorar Vitrine de Calçados</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {favProducts.map((prod) => {
            const hasDiscount = prod.originalPrice && prod.originalPrice > prod.price;
            const discountPercent = hasDiscount 
              ? Math.round(((prod.originalPrice! - prod.price) / prod.originalPrice!) * 100)
              : 0;

            return (
              <div
                key={prod.id}
                className={`group flex flex-col justify-between rounded-2xl border overflow-hidden transition-all duration-300 ${
                  theme === 'dark'
                    ? 'bg-slate-900 border-slate-800 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5'
                    : 'bg-white border-slate-100 shadow-sm hover:shadow-md hover:border-red-100'
                }`}
              >
                {/* Image Container with Badges */}
                <div 
                  onClick={() => handleVerDetalhes(prod)}
                  className={`relative aspect-square w-full overflow-hidden cursor-pointer ${
                    theme === 'dark' ? 'bg-slate-950/50' : 'bg-slate-50'
                  }`}
                >
                  <img
                    src={prod.images?.[0] || prod.foto_uri || ''}
                    alt={prod.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />

                  {/* Off Badge */}
                  {hasDiscount ? (
                    <span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm uppercase tracking-wider">
                      -{discountPercent}% OFF
                    </span>
                  ) : (
                    <span className={`absolute top-3 left-3 text-[9px] font-bold tracking-wider px-2.5 py-1 rounded-sm uppercase border ${
                      theme === 'dark' 
                        ? 'bg-slate-900 text-slate-400 border-slate-800' 
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {normalizeCategoryName(prod.category)}
                    </span>
                  )}

                  {/* Remove from Favorites Button Overlay */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(prod.id);
                    }}
                    className={`absolute top-3 right-3 p-2 rounded-full shadow-sm transition-colors z-10 cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-slate-950/90 text-red-400 hover:bg-red-950/40 hover:text-red-300'
                        : 'bg-white/95 text-red-500 hover:bg-red-50 hover:text-red-600'
                    }`}
                    title="Remover dos favoritos"
                  >
                    <Heart className="h-4 w-4 fill-current text-current" />
                  </button>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <span className={`text-[10px] font-bold uppercase tracking-widest block ${
                      theme === 'dark' ? 'text-amber-400' : 'text-[#9a031e]'
                    }`}>
                      {normalizeCategoryName(prod.category)}
                    </span>
                    <h3 className={`text-xs sm:text-sm font-semibold tracking-tight leading-snug line-clamp-2 min-h-[36px] ${
                      theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                    }`}>
                      {prod.name}
                    </h3>
                    
                    <div className="flex flex-col pt-1">
                      {hasDiscount && prod.originalPrice ? (
                        <div className="flex items-baseline space-x-1.5">
                          <span className={`text-[10px] sm:text-xs line-through font-medium ${
                            theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                          }`}>
                            R$ {prod.originalPrice.toFixed(2).replace('.', ',')}
                          </span>
                          <p className={`text-sm sm:text-base font-black ${
                            theme === 'dark' ? 'text-red-400' : 'text-[#9a031e]'
                          }`}>
                            R$ {prod.price.toFixed(2).replace('.', ',')}
                          </p>
                        </div>
                      ) : (
                        <p className={`text-sm sm:text-base font-extrabold ${
                          theme === 'dark' ? 'text-amber-400' : 'text-primary'
                        }`}>
                          R$ {prod.price.toFixed(2).replace('.', ',')}
                        </p>
                      )}
                    </div>
                  </div>

                  {prod.crediarioProprio && (
                    <div className={`flex items-center space-x-1.5 py-1 px-2 rounded-md border ${
                      theme === 'dark' 
                        ? 'bg-slate-950/60 border-slate-850 text-slate-400' 
                        : 'bg-slate-50 border-slate-100 text-slate-505'
                    }`}>
                      <div className="w-3.5 h-2.5 bg-yellow-400 rounded-xs flex items-center justify-center text-[6px] text-slate-950 font-bold">💳</div>
                      <span className="text-[9px] font-medium tracking-tight">Crediário Próprio</span>
                    </div>
                  )}

                  {/* View details action */}
                  <button
                    onClick={() => handleVerDetalhes(prod)}
                    className={`w-full flex items-center justify-center space-x-1.5 py-2.5 px-3 text-[10px] sm:text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                        : 'bg-primary text-white hover:bg-secondary'
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>VER DETALHES</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
