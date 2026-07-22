import React from 'react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import { Eye, Heart, ArrowLeft, HeartOff, ShoppingCart } from 'lucide-react';

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
    <div id="favorites-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Header back navigation */}
      <button
        onClick={() => setCurrentView('home')}
        className={`flex items-center space-x-2 transition-colors text-xs font-bold mb-6 cursor-pointer ${
          theme === 'dark' ? 'text-slate-400 hover:text-amber-400' : 'text-slate-500 hover:text-primary'
        }`}
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Voltar para a Vitrine</span>
      </button>

      {/* Page Title */}
      <div className="flex items-center space-x-3 mb-8">
        <div className={`p-2.5 rounded-xl border ${
          theme === 'dark' ? 'bg-red-950/20 border-red-550/15 text-red-400' : 'bg-red-50 text-red-500 border-red-100'
        }`}>
          <Heart className="h-6 w-6 fill-current" />
        </div>
        <div>
          <h1 className={`text-2xl font-extrabold tracking-tight ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>Meus Favoritos</h1>
          <p className={`text-xs sm:text-sm font-light mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            Calçados e acessórios salvos na sua lista de desejos.
          </p>
        </div>
      </div>

      {favProducts.length === 0 ? (
        /* Empty State */
        <div className={`flex flex-col items-center justify-center text-center py-16 border rounded-2xl p-8 shadow-xs ${
          theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-100'
        }`}>
          <div className={`p-4 rounded-full mb-4 animate-pulse ${
            theme === 'dark' ? 'bg-slate-900 text-slate-500' : 'bg-slate-50 text-slate-300'
          }`}>
            <HeartOff className="h-12 w-12" />
          </div>
          <h2 className={`text-lg font-bold mb-2 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>Sua lista está vazia</h2>
          <p className={`text-sm max-w-md mb-6 leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            Você ainda não favoritou nenhum produto. Navegue pelo nosso catálogo e clique no ícone de coração para salvar seus calçados favoritos aqui!
          </p>
          <button
            onClick={() => setCurrentView('home')}
            className={`px-6 py-2.5 text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer hover:scale-102 active:scale-98 ${
              theme === 'dark'
                ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                : 'bg-primary text-white hover:bg-secondary'
            }`}
          >
            Explorar Vitrine
          </button>
        </div>
      ) : (
        /* Grid of Favorites */
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {favProducts.map((prod) => {
            const isOffer = prod.onSale && prod.originalPrice;
            const discountPercent = isOffer && prod.originalPrice
              ? Math.round(((prod.originalPrice - prod.price) / prod.originalPrice) * 100)
              : 0;

            return (
              <div 
                key={prod.id} 
                id={`fav-card-${prod.id}`}
                className={`group border rounded-xl overflow-hidden transition-all duration-300 flex flex-col justify-between ${
                  theme === 'dark' 
                    ? 'bg-[#0f172a] border-slate-800 hover:border-amber-400/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.05)]' 
                    : 'bg-white border-slate-100 hover:shadow-lg'
                }`}
              >
                {/* Image Container with Badge */}
                <div className={`relative aspect-square overflow-hidden ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}>
                  <img 
                    src={prod.images?.[0] || prod.foto_uri || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=600&auto=format&fit=crop'} 
                    alt={prod.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  {isOffer ? (
                    <span className={`absolute top-3 left-3 text-white text-[9px] font-extrabold tracking-widest px-2.5 py-1 rounded-sm shadow-md ${
                      theme === 'dark' ? 'bg-red-500' : 'bg-[#9a031e]'
                    }`}>
                      {discountPercent}% OFF
                    </span>
                  ) : (
                    <span className={`absolute top-3 left-3 text-[9px] font-bold tracking-wider px-2.5 py-1 rounded-sm uppercase border ${
                      theme === 'dark' 
                        ? 'bg-slate-900 text-slate-400 border-slate-800' 
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {prod.category}
                    </span>
                  )}

                  {/* Remove from Favorites Button Overlay */}
                  <button
                    onClick={() => toggleFavorite(prod.id)}
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

                {/* Details Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <span className={`text-[10px] font-bold uppercase tracking-widest block ${
                      theme === 'dark' ? 'text-amber-400' : 'text-[#9a031e]'
                    }`}>
                      {prod.category}
                    </span>
                    <h3 className={`text-xs sm:text-sm font-semibold tracking-tight leading-snug line-clamp-2 min-h-[36px] ${
                      theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                    }`}>
                      {prod.name}
                    </h3>
                    
                    <div className="flex flex-col pt-1">
                      {isOffer && prod.originalPrice ? (
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
