import React from 'react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import { Eye, Heart, ArrowLeft, HeartOff, ShoppingCart } from 'lucide-react';

import { normalizeCategoryName } from '../services/moblinkCategoriesService';
import { StorefrontProductCard } from './products';

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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-6">
          {favProducts.map((prod) => (
            <StorefrontProductCard
              key={prod.id}
              product={prod}
              theme={theme}
              isFavorite={true}
              onToggleFavorite={toggleFavorite}
              onViewDetails={handleVerDetalhes}
            />
          ))}
        </div>
      )}
    </div>
  );
};
