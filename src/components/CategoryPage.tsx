import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import { Eye, Percent, ChevronLeft, ChevronRight, ArrowLeft, Timer } from 'lucide-react';
import { Hero } from './Hero';

interface TabConfig {
  title: string;
  subtitle: string;
  bannerImage: string;
  badgeText: string;
  filter: (prod: Product) => boolean;
}

const TAB_CONFIGS: Record<string, TabConfig> = {
  'lançamentos': {
    title: 'Novidades & Lançamentos',
    subtitle: 'Confira as últimas novidades e as maiores tendências exclusivas que acabaram de chegar na Evidência Calçados.',
    bannerImage: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'NOVA COLEÇÃO 2026',
    filter: (prod) => !!prod.newArrival
  },
  'feminino': {
    title: 'Coleção Feminina',
    subtitle: 'Charme, sofisticação e conforto extremo em calçados, sandálias e acessórios refinados para a mulher moderna.',
    bannerImage: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'ELEGÂNCIA & CHARME',
    filter: (prod) => {
      const cat = prod.category.toLowerCase();
      const name = prod.name.toLowerCase();
      const desc = prod.description.toLowerCase();
      return cat === 'acessórios' || name.includes('argola') || name.includes('brinco') || name.includes('femin') || desc.includes('femin') || desc.includes('mulher') || name.includes('sapatilha');
    }
  },
  'masculino': {
    title: 'Coleção Masculina',
    subtitle: 'Estilo, atitude, robustez e alta performance para o homem contemporâneo que valoriza durabilidade e design atemporal.',
    bannerImage: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'ESTILO & ROBUSTEZ',
    filter: (prod) => {
      const cat = prod.category.toLowerCase();
      const name = prod.name.toLowerCase();
      const desc = prod.description.toLowerCase();
      return cat === 'sapatos sociais' || cat === 'botas' || name.includes('masculin') || desc.includes('masculin') || desc.includes('homem') || name.includes('run performance');
    }
  },
  'ofertas': {
    title: 'Super Campanhas de Ofertas',
    subtitle: 'Aproveite descontos especiais de até 50% em calçados selecionados com condições exclusivas no Crediário Próprio Evidência.',
    bannerImage: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'CAMPANHA PROMOCIONAL',
    filter: (prod) => !!prod.onSale
  },
  'sapatos-sociais': {
    title: 'Sapatos Sociais Premium',
    subtitle: 'Elegância artesanal em couro nobre, ideal para momentos formais, reuniões de negócios e trajes esporte fino.',
    bannerImage: 'https://images.unsplash.com/photo-1486308512493-ae648944baac?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'ESTILO CLÁSSICO',
    filter: (prod) => prod.category.toLowerCase() === 'sapatos sociais'
  },
  'tenis-esportivos': {
    title: 'Tênis Esportivos & Performance',
    subtitle: 'Amortecimento responsivo, respirabilidade extrema e leveza ideal para impulsionar suas atividades físicas e treinos.',
    bannerImage: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'ALTA PERFORMANCE',
    filter: (prod) => prod.category.toLowerCase() === 'tênis esportivos'
  },
  'infantil': {
    title: 'Universo Infantil',
    subtitle: 'Calçados ultra leves, anatômicos, seguros e divertidos, desenvolvidos especialmente para acompanhar os passos dos pequenos.',
    bannerImage: 'https://images.unsplash.com/photo-1515645726563-716416c4361e?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'MUNDO KIDS COMFORT',
    filter: (prod) => prod.category.toLowerCase() === 'infantil'
  },
  'botas': {
    title: 'Botas & Coturnos',
    subtitle: 'Companheiras indestrutíveis para todas as estações do ano, oferecendo impermeabilidade, aderência e visual marcante.',
    bannerImage: 'https://images.unsplash.com/photo-1638247025967-b4e38f787b76?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'URBAN EXPLORATION',
    filter: (prod) => prod.category.toLowerCase() === 'botas'
  },
  'acessorios': {
    title: 'Acessórios Sofisticados',
    subtitle: 'Adornos e complementos premium banhados a ouro 18k para adicionar brilho e refinamento ao seu estilo pessoal.',
    bannerImage: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'DETALHES DE BRILHO',
    filter: (prod) => prod.category.toLowerCase() === 'acessórios'
  }
};

export const CategoryPage: React.FC = () => {
  const { 
    products, 
    selectedMenuTab, 
    setCurrentView, 
    setSelectedProduct,
    searchQuery,
    theme,
    categories
  } = useApp();

  const [cardsPerPage, setCardsPerPage] = useState(4);
  const [activeIndex, setActiveIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState({ horas: 23, minutos: 59, segundos: 59 });

  // Get current active config based on selectedMenuTab or custom categories
  const getTabConfig = () => {
    if (TAB_CONFIGS[selectedMenuTab]) {
      return TAB_CONFIGS[selectedMenuTab];
    }
    
    const foundCategory = categories.find(c => c.id === selectedMenuTab || c.name.toLowerCase() === selectedMenuTab.toLowerCase());
    if (foundCategory) {
      return {
        title: foundCategory.name,
        subtitle: foundCategory.description || `Confira nossa coleção de ${foundCategory.name} com condições e qualidade exclusivas Evidência Calçados.`,
        bannerImage: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=1600&auto=format&fit=crop',
        badgeText: foundCategory.name.toUpperCase(),
        filter: (prod: Product) => prod.category.toLowerCase() === foundCategory.name.toLowerCase()
      };
    }

    return TAB_CONFIGS['lançamentos'];
  };

  const config = getTabConfig();

  // Window resize observer for carousel
  useEffect(() => {
    const updateCardsPerPage = () => {
      if (window.innerWidth >= 1024) {
        setCardsPerPage(4);
      } else if (window.innerWidth >= 768) {
        setCardsPerPage(3);
      } else if (window.innerWidth >= 640) {
        setCardsPerPage(2);
      } else {
        setCardsPerPage(1);
      }
    };
    
    updateCardsPerPage();
    window.addEventListener('resize', updateCardsPerPage);
    return () => window.removeEventListener('resize', updateCardsPerPage);
  }, []);

  // Countdown timer for FOMO
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.segundos > 0) {
          return { ...prev, segundos: prev.segundos - 1 };
        } else if (prev.minutos > 0) {
          return { ...prev, minutos: prev.minutos - 1, segundos: 59 };
        } else if (prev.horas > 0) {
          return { horas: prev.horas - 1, minutos: 59, segundos: 59 };
        } else {
          return { horas: 23, minutos: 59, segundos: 59 };
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Reset activeIndex when tab changes
  useEffect(() => {
    setActiveIndex(0);
  }, [selectedMenuTab]);

  const handleVerDetalhes = (prod: Product) => {
    setSelectedProduct(prod);
    setCurrentView('product-detail');
  };

  const formatNumber = (num: number) => num.toString().padStart(2, '0');

  // Filter base products belonging to this menu selection and matches search bar if active
  const baseItems = products.filter((prod) => {
    const matchesSearch = searchQuery 
      ? prod.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        prod.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.category.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    
    return prod.visible && matchesSearch && config.filter(prod);
  });

  // Section 1: Ofertas relacionadas (items on sale inside this category selection)
  const offersItems = baseItems.filter(prod => !!prod.onSale);

  // Section 2: Todos os itens disponíveis (all items in this selection)
  const allItems = baseItems;

  const maxIndex = Math.max(0, offersItems.length - cardsPerPage);
  const finalActiveIndex = Math.min(activeIndex, maxIndex);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* Back button */}
      <button 
        onClick={() => setCurrentView('home')}
        className={`mb-6 flex items-center space-x-2 text-xs font-bold transition-all group cursor-pointer ${
          theme === 'dark' ? 'text-slate-400 hover:text-amber-400' : 'text-slate-500 hover:text-primary'
        }`}
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        <span>VOLTAR PARA A LOJA</span>
      </button>

      {/* Interactive Hero Banner */}
      <Hero />

      <div className="mt-8"></div>

      {/* SECTION 1: OFERTAS RELACIONADAS AO ITEM (Render only if offers exist) */}
      {offersItems.length > 0 && (
        <div id="category-offers-section" className="mb-12 space-y-6">
          <div className={`flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b ${
            theme === 'dark' ? 'border-slate-800' : 'border-slate-100'
          }`}>
            <div className="flex items-center space-x-2.5">
              <span className={`flex items-center justify-center h-8 w-8 rounded-lg ${
                theme === 'dark' ? 'bg-red-500/10 text-red-400' : 'bg-[#9a031e]/10 text-[#9a031e]'
              }`}>
                <Percent className="h-4 w-4 animate-bounce" />
              </span>
              <h2 className={`text-base sm:text-lg font-bold tracking-tight ${
                theme === 'dark' ? 'text-slate-100' : 'text-slate-800'
              }`}>
                Ofertas Imperdíveis em {config.title}
                <span className={`ml-2 text-xs font-light ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                  ({offersItems.length} {offersItems.length === 1 ? 'oferta' : 'ofertas'})
                </span>
              </h2>
            </div>

            <div className="flex items-center w-full sm:w-auto justify-end">
              {/* Countdown Timer */}
              <div className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-full border font-mono text-xs font-bold mr-4 ${
                theme === 'dark'
                  ? 'bg-red-950/20 text-red-400 border-red-550/20'
                  : 'bg-[#9a031e]/5 text-[#9a031e] border-[#9a031e]/10'
              }`}>
                <Timer className="h-4 w-4 animate-pulse" />
                <span>Oferta Expira em:</span>
                <span className={`px-1.5 py-0.5 rounded-sm text-white ${theme === 'dark' ? 'bg-red-500' : 'bg-[#9a031e]'}`}>
                  {formatNumber(timeLeft.horas)}
                </span>
                <span>:</span>
                <span className={`px-1.5 py-0.5 rounded-sm text-white ${theme === 'dark' ? 'bg-red-500' : 'bg-[#9a031e]'}`}>
                  {formatNumber(timeLeft.minutos)}
                </span>
                <span>:</span>
                <span className={`px-1.5 py-0.5 rounded-sm text-white ${theme === 'dark' ? 'bg-red-500' : 'bg-[#9a031e]'}`}>
                  {formatNumber(timeLeft.segundos)}
                </span>
              </div>
            </div>
          </div>

          {/* Carousel Wrapper */}
          <div className="relative group/carousel">
            {/* Left navigation arrow */}
            {offersItems.length > cardsPerPage && (
              <button
                onClick={() => setActiveIndex(prev => Math.max(0, prev - 1))}
                disabled={finalActiveIndex === 0}
                className={`absolute top-1/2 -translate-y-1/2 -left-2 sm:-left-5 z-20 flex items-center justify-center h-10 w-10 rounded-full border shadow-md transition-all duration-200 cursor-pointer ${
                  finalActiveIndex === 0 
                    ? 'opacity-0 pointer-events-none scale-90' 
                    : theme === 'dark'
                      ? 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:scale-110 active:scale-95'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:scale-110 active:scale-95'
                }`}
                title="Anterior"
              >
                <ChevronLeft className="h-5 w-5 stroke-[2.5]" />
              </button>
            )}

            {/* Carousel Window */}
            <div className="relative overflow-hidden py-1 px-0.5">
              <div 
                className="flex transition-transform duration-500 ease-out -mx-3"
                style={{ transform: `translateX(-${finalActiveIndex * (100 / cardsPerPage)}%)` }}
              >
                {offersItems.map((prod) => {
                  const discountPercent = prod.originalPrice 
                    ? Math.round(((prod.originalPrice - prod.price) / prod.originalPrice) * 100) 
                    : 15;

                  return (
                    <div 
                      key={prod.id} 
                      className="shrink-0 px-3 flex flex-col justify-between"
                      style={{ width: `${100 / cardsPerPage}%` }}
                    >
                      <div className={`group border rounded-xl overflow-hidden transition-all duration-300 flex flex-col justify-between h-full ${
                        theme === 'dark' 
                          ? 'bg-[#0f172a] border-slate-800 hover:border-amber-400/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.05)]' 
                          : 'bg-white border-slate-100 hover:shadow-lg'
                      }`}>
                        <div className={`relative aspect-square overflow-hidden ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}>
                          <img 
                            src={prod.images?.[0] || prod.foto_uri || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=600&auto=format&fit=crop'} 
                            alt={prod.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          
                          <span className={`absolute top-3 left-3 text-white text-[9px] font-extrabold tracking-widest px-2.5 py-1 rounded-sm shadow-md animate-pulse ${
                            theme === 'dark' ? 'bg-red-500' : 'bg-[#9a031e]'
                          }`}>
                            {discountPercent}% OFF
                          </span>

                          {prod.stockControl && prod.stock <= 5 && prod.stock > 0 && (
                            <span className="absolute top-3 right-3 bg-amber-500/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-sm">
                              Pouco Estoque
                            </span>
                          )}
                          {prod.stockControl && prod.stock === 0 && (
                            <span className="absolute top-3 right-3 bg-red-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-sm">
                              Esgotado
                            </span>
                          )}
                        </div>

                        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                          <div className="space-y-1">
                            <h3 className={`text-xs sm:text-sm font-semibold tracking-tight leading-snug line-clamp-2 min-h-[36px] ${
                              theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                            }`}>
                              {prod.name}
                            </h3>
                            
                            <div className="flex flex-col pt-1">
                              <div className="flex items-baseline space-x-1.5">
                                <span className={`text-[10px] sm:text-xs line-through font-medium ${
                                  theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                                }`}>
                                  R$ {prod.originalPrice?.toFixed(2).replace('.', ',')}
                                </span>
                                <p className={`text-sm sm:text-base font-black ${
                                  theme === 'dark' ? 'text-red-400' : 'text-[#9a031e]'
                                }`}>
                                  R$ {prod.price.toFixed(2).replace('.', ',')}
                                </p>
                              </div>
                            </div>
                          </div>

                          {prod.crediarioProprio && (
                            <div className={`flex items-center space-x-1.5 py-1 px-2 rounded-md border ${
                              theme === 'dark' 
                                ? 'bg-slate-950/60 border-slate-850 text-slate-400' 
                                : 'bg-slate-50 border-slate-100 text-slate-505'
                            }`}>
                              <div className="w-3.5 h-2.5 bg-yellow-400 rounded-xs flex items-center justify-center text-[6px] text-slate-950 font-bold">💳</div>
                              <span className="text-[9px] font-medium tracking-tight">Crediário Próprio Evidência</span>
                            </div>
                          )}

                          <button
                            onClick={() => handleVerDetalhes(prod)}
                            className={`w-full flex items-center justify-center space-x-1.5 py-2 px-3 text-[10px] sm:text-xs font-bold rounded-lg transition-colors cursor-pointer ${
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
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right navigation arrow */}
            {offersItems.length > cardsPerPage && (
              <button
                onClick={() => setActiveIndex(prev => Math.min(prev + 1, offersItems.length - cardsPerPage))}
                disabled={finalActiveIndex >= maxIndex}
                className={`absolute top-1/2 -translate-y-1/2 -right-2 sm:-right-5 z-20 flex items-center justify-center h-10 w-10 rounded-full border shadow-md transition-all duration-200 cursor-pointer ${
                  finalActiveIndex >= maxIndex 
                    ? 'opacity-0 pointer-events-none scale-90' 
                    : theme === 'dark'
                      ? 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:scale-110 active:scale-95'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:scale-110 active:scale-95'
                }`}
                title="Próximo"
              >
                <ChevronRight className="h-5 w-5 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: TODOS OS ITENS DISPONÍVEIS */}
      <div id="category-all-items-section" className="space-y-6">
        <div className={`border-b pb-4 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
          <h2 className={`text-base sm:text-lg font-bold tracking-tight ${
            theme === 'dark' ? 'text-slate-100' : 'text-slate-800'
          }`}>
            Todos os Itens em {config.title}
            <span className={`ml-2 text-xs font-light font-mono ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
              ({allItems.length} {allItems.length === 1 ? 'item disponível' : 'itens disponíveis'})
            </span>
          </h2>
        </div>

        {allItems.length === 0 ? (
          <div className={`py-12 text-center border rounded-xl space-y-3 ${
            theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-100'
          }`}>
            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Nenhum produto disponível para esta categoria no momento.</p>
            <button 
              onClick={() => setCurrentView('home')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                  : 'bg-primary text-white hover:bg-secondary'
              }`}
            >
              Ir para Página Inicial
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {allItems.map((prod) => {
              const discountPercent = prod.originalPrice 
                ? Math.round(((prod.originalPrice - prod.price) / prod.originalPrice) * 100) 
                : 15;

              return (
                <div 
                  key={prod.id} 
                  className={`group border rounded-xl overflow-hidden transition-all duration-300 flex flex-col justify-between ${
                    theme === 'dark' 
                      ? 'bg-[#0f172a] border-slate-800 hover:border-amber-400/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.05)]' 
                      : 'bg-white border-slate-100 hover:shadow-lg hover:border-slate-200/60'
                  }`}
                >
                  <div className={`relative aspect-square overflow-hidden ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}>
                    <img 
                      src={prod.images?.[0] || prod.foto_uri || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=600&auto=format&fit=crop'} 
                      alt={prod.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    
                    {prod.onSale && prod.originalPrice ? (
                      <span className={`absolute top-3 left-3 text-white text-[9px] font-extrabold tracking-widest px-2.5 py-1 rounded-sm shadow-md animate-pulse ${
                        theme === 'dark' ? 'bg-red-500' : 'bg-[#9a031e]'
                      }`}>
                        {discountPercent}% OFF
                      </span>
                    ) : prod.newArrival ? (
                      <span className="absolute top-3 left-3 bg-emerald-600 text-white text-[9px] font-extrabold tracking-widest px-2.5 py-1 rounded-sm shadow-md">
                        NOVO
                      </span>
                    ) : null}

                    {prod.stockControl && prod.stock <= 5 && prod.stock > 0 && (
                      <span className="absolute top-3 right-3 bg-amber-500/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-sm">
                        Pouco Estoque
                      </span>
                    )}
                    {prod.stockControl && prod.stock === 0 && (
                      <span className="absolute top-3 right-3 bg-red-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-sm">
                        Esgotado
                      </span>
                    )}
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <span className={`text-[9px] font-extrabold tracking-widest uppercase block ${
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
                        {prod.onSale && prod.originalPrice ? (
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
                          : 'bg-slate-50 border-slate-100 text-slate-500'
                      }`}>
                        <div className="w-3.5 h-2.5 bg-yellow-400 rounded-xs flex items-center justify-center text-[6px] text-slate-950 font-bold">💳</div>
                        <span className="text-[9px] font-medium tracking-tight">Crediário Próprio Evidência</span>
                      </div>
                    )}

                    <button
                      onClick={() => handleVerDetalhes(prod)}
                      className={`w-full flex items-center justify-center space-x-1.5 py-2 px-3 text-[10px] sm:text-xs font-bold rounded-lg transition-colors cursor-pointer ${
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
    </div>
  );
};
