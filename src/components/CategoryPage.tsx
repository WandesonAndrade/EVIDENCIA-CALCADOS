import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import { Eye, Percent, ChevronLeft, ChevronRight, ArrowLeft, Timer } from 'lucide-react';
import { Hero } from './Hero';
import { ProductCard } from './ProductList';
import { scrollToSectionWithOffset } from '../lib/scrollUtils';
import { normalizeCategoryName, normalizeSubcategoryName, isProductInCategory } from '../services/moblinkCategoriesService';

interface TabConfig {
  title: string;
  subtitle: string;
  bannerImage: string;
  badgeText: string;
  filter: (prod: Product) => boolean;
}

const TAB_CONFIGS: Record<string, TabConfig> = {
  'cosmeticos': {
    title: 'Cosméticos & Beleza',
    subtitle: 'Linha completa de cuidados pessoais, maquiagem, itens de estética e beleza.',
    bannerImage: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'BELEZA & BEM-ESTAR',
    filter: (prod) => isProductInCategory(prod, 'COSMÉTICOS')
  },
  'perfumes': {
    title: 'Perfumes & Fragrâncias',
    subtitle: 'Fragrâncias exclusivas, eau de parfum e colônias importadas para encantar.',
    bannerImage: 'https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'FRAGRÂNCIAS NOBRES',
    filter: (prod) => isProductInCategory(prod, 'PERFUMES')
  },
  'escolar': {
    title: 'Artigos Escolares & Mochilas',
    subtitle: 'Mochilas duráveis, estojos e utilitários escolares para o dia a dia de estudos.',
    bannerImage: 'https://images.unsplash.com/photo-1588072432836-e10032774350?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'VOLTA ÀS AULAS',
    filter: (prod) => isProductInCategory(prod, 'ESCOLAR')
  },
  'acessorios': {
    title: 'Acessórios Sofisticados',
    subtitle: 'Cintos, carteiras, bolsas e adornos refinados para complementar seu estilo.',
    bannerImage: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'DETALHES PREMIUM',
    filter: (prod) => isProductInCategory(prod, 'ACESSÓRIOS')
  },
  'acessórios': {
    title: 'Acessórios Sofisticados',
    subtitle: 'Cintos, carteiras, bolsas e adornos refinados para complementar seu estilo.',
    bannerImage: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'DETALHES PREMIUM',
    filter: (prod) => isProductInCategory(prod, 'ACESSÓRIOS')
  },
  'calcados': {
    title: 'Coleção de Calçados',
    subtitle: 'Tênis, sandálias, sapatos, botas e papetes com o máximo conforto e elegância.',
    bannerImage: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'CALÇADOS PREMIUM',
    filter: (prod) => isProductInCategory(prod, 'CALÇADOS')
  },
  'calçados': {
    title: 'Coleção de Calçados',
    subtitle: 'Tênis, sandálias, sapatos, botas e papetes com o máximo conforto e elegância.',
    bannerImage: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'CALÇADOS PREMIUM',
    filter: (prod) => isProductInCategory(prod, 'CALÇADOS')
  },
  'diversos': {
    title: 'Produtos Diversos',
    subtitle: 'Variedade de artigos selecionados com qualidade garantida Evidência Calçados.',
    bannerImage: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'DIVERSOS & NOVIDADES',
    filter: () => true
  },
  'confecções': {
    title: 'Moda & Confecções',
    subtitle: 'Roupas e peças de vestuário contemporâneas para renovar seu estilo.',
    bannerImage: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'CONFECÇÕES & VESTUÁRIO',
    filter: (prod) => isProductInCategory(prod, 'CONFECÇÕES')
  },
  'confeccoes': {
    title: 'Moda & Confecções',
    subtitle: 'Roupas e peças de vestuário contemporâneas para renovar seu estilo.',
    bannerImage: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'CONFECÇÕES & VESTUÁRIO',
    filter: (prod) => isProductInCategory(prod, 'CONFECÇÕES')
  },
  'confecção': {
    title: 'Moda & Confecções',
    subtitle: 'Roupas e peças de vestuário contemporâneas para renovar seu estilo.',
    bannerImage: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'CONFECÇÕES & VESTUÁRIO',
    filter: (prod) => isProductInCategory(prod, 'CONFECÇÕES')
  },
  'lançamentos': {
    title: 'Novidades & Lançamentos',
    subtitle: 'Confira as últimas novidades e as maiores tendências exclusivas da Evidência Calçados.',
    bannerImage: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'NOVA COLEÇÃO 2026',
    filter: (prod) => !!prod.newArrival
  },
  'novidades': {
    title: 'Novidades & Lançamentos',
    subtitle: 'Confira as últimas novidades e as maiores tendências exclusivas da Evidência Calçados.',
    bannerImage: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'NOVA COLEÇÃO 2026',
    filter: (prod) => !!prod.newArrival
  },
  'promoções': {
    title: 'Super Campanhas de Ofertas',
    subtitle: 'Descontos especiais com condições exclusivas no Crediário Próprio Evidência.',
    bannerImage: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'CAMPANHA PROMOCIONAL',
    filter: (prod) => !!prod.onSale || (prod.originalPrice && prod.originalPrice > prod.price)
  },
  'promocoes': {
    title: 'Super Campanhas de Ofertas',
    subtitle: 'Descontos especiais com condições exclusivas no Crediário Próprio Evidência.',
    bannerImage: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'CAMPANHA PROMOCIONAL',
    filter: (prod) => !!prod.onSale || (prod.originalPrice && prod.originalPrice > prod.price)
  },
  'ofertas': {
    title: 'Super Campanhas de Ofertas',
    subtitle: 'Descontos especiais com condições exclusivas no Crediário Próprio Evidência.',
    bannerImage: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'CAMPANHA PROMOCIONAL',
    filter: (prod) => !!prod.onSale || (prod.originalPrice && prod.originalPrice > prod.price)
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
    categories,
    favorites = [],
    toggleFavorite,
    selectedSubcategory: globalSubcategory,
    setSelectedSubcategory: setGlobalSubcategory
  } = useApp();

  const ITEMS_PER_PAGE = 24;
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [cardsPerPage, setCardsPerPage] = useState(4);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('TODAS');
  const [timeLeft, setTimeLeft] = useState({ horas: 23, minutos: 59, segundos: 59 });
  const gridSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (globalSubcategory && globalSubcategory !== 'TODAS' && globalSubcategory !== 'TODOS') {
      setSelectedSubcategory(globalSubcategory);
    }
  }, [globalSubcategory]);

  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
    const timer = setTimeout(() => {
      scrollToSectionWithOffset(gridSectionRef.current || 'category-all-items-section');
    }, 120);

    return () => clearTimeout(timer);
  }, [selectedMenuTab, globalSubcategory]);

  const activeSubcategory = (globalSubcategory && globalSubcategory !== 'TODAS' && globalSubcategory !== 'TODOS')
    ? globalSubcategory
    : (selectedSubcategory && selectedSubcategory !== 'TODAS' && selectedSubcategory !== 'TODOS')
    ? selectedSubcategory
    : null;

  const getTabConfig = () => {
    if (activeSubcategory) {
      const cleanSub = activeSubcategory.trim().toUpperCase();
      const normSub = normalizeSubcategoryName(cleanSub).toUpperCase();
      return {
        title: activeSubcategory.toUpperCase(),
        subtitle: `Confira todos os modelos de ${activeSubcategory} disponíveis com pronta entrega na Evidência Calçados.`,
        bannerImage: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=1600&auto=format&fit=crop',
        badgeText: `SUBCATEGORIA: ${activeSubcategory.toUpperCase()}`,
        filter: (prod: Product) => {
          const catRaw = (prod.category || '').toUpperCase();
          const grupoRaw = (prod.nome_grupo || '').toUpperCase();
          const subRaw = (prod.nome_subgrupo || prod.subcategory || '').toUpperCase();
          const normSubRaw = normalizeSubcategoryName(subRaw).toUpperCase();
          const nameRaw = (prod.name || '').toUpperCase();

          return (
            subRaw.includes(cleanSub) ||
            normSubRaw.includes(normSub) ||
            catRaw.includes(cleanSub) ||
            grupoRaw.includes(cleanSub) ||
            nameRaw.includes(cleanSub)
          );
        }
      };
    }

    const cleanTabKey = (selectedMenuTab || '').trim().toLowerCase();

    if (TAB_CONFIGS[cleanTabKey]) {
      return TAB_CONFIGS[cleanTabKey];
    }

    if (cleanTabKey === 'todos') {
      return {
        title: 'TODOS OS PRODUTOS',
        subtitle: 'Confira nosso catálogo completo de calçados, bolsas e acessórios.',
        bannerImage: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=1600&auto=format&fit=crop',
        badgeText: 'CATÁLOGO COMPLETO',
        filter: () => true
      };
    }
    
    const foundCategory = categories.find(c => c.id === selectedMenuTab || c.name.toLowerCase() === selectedMenuTab.toLowerCase() || normalizeCategoryName(c.name).toLowerCase() === selectedMenuTab.toLowerCase());
    if (foundCategory) {
      const normCatName = normalizeCategoryName(foundCategory.name);
      return {
        title: normCatName,
        subtitle: foundCategory.description || `Confira nossa coleção de ${normCatName} com condições e qualidade exclusivas Evidência Calçados.`,
        bannerImage: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=1600&auto=format&fit=crop',
        badgeText: normCatName.toUpperCase(),
        filter: (prod: Product) => isProductInCategory(prod, foundCategory.name)
      };
    }

    const cleanTabStr = (selectedMenuTab || '').trim();
    const normTabName = normalizeCategoryName(cleanTabStr);
    return {
      title: normTabName ? normTabName.toUpperCase() : 'COLEÇÃO EVIDÊNCIA',
      subtitle: `Confira nossa coleção de ${normTabName} com condições e qualidade exclusivas Evidência Calçados.`,
      bannerImage: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=1600&auto=format&fit=crop',
      badgeText: normTabName.toUpperCase(),
      filter: (prod: Product) => isProductInCategory(prod, cleanTabStr)
    };
  };

  const config = getTabConfig();

  useEffect(() => {
    const updateCardsPerPage = () => {
      if (window.innerWidth >= 1280) setCardsPerPage(5);
      else if (window.innerWidth >= 1024) setCardsPerPage(4);
      else if (window.innerWidth >= 768) setCardsPerPage(3);
      else setCardsPerPage(2);
    };
    
    updateCardsPerPage();
    window.addEventListener('resize', updateCardsPerPage);
    return () => window.removeEventListener('resize', updateCardsPerPage);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.segundos > 0) return { ...prev, segundos: prev.segundos - 1 };
        if (prev.minutos > 0) return { ...prev, minutos: prev.minutos - 1, segundos: 59 };
        if (prev.horas > 0) return { horas: prev.horas - 1, minutos: 59, segundos: 59 };
        return { horas: 23, minutos: 59, segundos: 59 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [selectedMenuTab]);

  const handleVerDetalhes = (prod: Product) => {
    setSelectedProduct(prod);
    setCurrentView('product-detail');
  };

  const handleViewAllSubcategory = (subName: string) => {
    if (setGlobalSubcategory) setGlobalSubcategory(subName);
    setSelectedSubcategory(subName);
    scrollToSectionWithOffset(gridSectionRef.current || 'category-all-items-section');
  };

  const formatNumber = (num: number) => num.toString().padStart(2, '0');

  const baseItems = products.filter((prod) => {
    const matchesSearch = searchQuery 
      ? prod.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        prod.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.category.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    
    const isAvailable = (prod.stock !== undefined ? prod.stock > 0 : (prod.saldo_loja ?? 0) > 0);
    return prod.visible && isAvailable && matchesSearch && config.filter(prod);
  });

  const offersItems = baseItems.filter(prod => !!prod.onSale || (prod.originalPrice && prod.originalPrice > prod.price));
  const allItems = baseItems;

  const itemsBySubcategory = useMemo(() => {
    const map = new Map<string, Product[]>();

    allItems.forEach((prod) => {
      const rawSub = (prod.nome_subgrupo || prod.subcategory || '').trim();
      const normSub = rawSub ? normalizeSubcategoryName(rawSub) : (prod.category || 'Outros Modelos');
      const key = normSub || 'Outros Modelos';

      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(prod);
    });

    return Array.from(map.entries()).map(([subName, prods]) => ({
      subName,
      products: prods,
    }));
  }, [allItems]);

  const maxIndex = Math.max(0, offersItems.length - cardsPerPage);
  const finalActiveIndex = Math.min(activeIndex, maxIndex);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <button 
        onClick={() => {
          if (activeSubcategory) {
            if (setGlobalSubcategory) setGlobalSubcategory('TODAS');
            setSelectedSubcategory('TODAS');
          } else {
            setCurrentView('home');
          }
        }}
        className={`flex items-center space-x-2 text-xs font-bold transition-all group cursor-pointer ${
          theme === 'dark' ? 'text-slate-400 hover:text-amber-400' : 'text-neutral-600 hover:text-black'
        }`}
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        <span>{activeSubcategory ? `VOLTAR PARA ${config.title}` : 'VOLTAR PARA A PÁGINA INICIAL'}</span>
      </button>

      <Hero />

      {offersItems.length > 0 && !activeSubcategory && (
        <div id="category-offers-section" className="space-y-6">
          <div className={`flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b ${
            theme === 'dark' ? 'border-slate-800' : 'border-neutral-200'
          }`}>
            <div className="flex items-center space-x-2.5">
              <span className={`flex items-center justify-center h-8 w-8 rounded-lg ${
                theme === 'dark' ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600'
              }`}>
                <Percent className="h-4 w-4 animate-bounce" />
              </span>
              <h2 className={`text-lg sm:text-xl font-extrabold tracking-tight ${
                theme === 'dark' ? 'text-slate-100' : 'text-[#111111]'
              }`}>
                Ofertas Especiais em {config.title}
                <span className={`ml-2 text-xs font-normal ${theme === 'dark' ? 'text-slate-500' : 'text-neutral-500'}`}>
                  ({offersItems.length} {offersItems.length === 1 ? 'oferta' : 'ofertas'})
                </span>
              </h2>
            </div>

            <div className="flex items-center w-full sm:w-auto justify-end">
              <div className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-full border font-mono text-xs font-bold ${
                theme === 'dark'
                  ? 'bg-rose-950/20 text-rose-400 border-rose-900/30'
                  : 'bg-rose-50 text-rose-600 border-rose-200'
              }`}>
                <Timer className="h-4 w-4 animate-pulse" />
                <span>Expira em:</span>
                <span className="px-1.5 py-0.5 rounded-xs bg-rose-600 text-white">
                  {formatNumber(timeLeft.horas)}
                </span>
                <span>:</span>
                <span className="px-1.5 py-0.5 rounded-xs bg-rose-600 text-white">
                  {formatNumber(timeLeft.minutos)}
                </span>
                <span>:</span>
                <span className="px-1.5 py-0.5 rounded-xs bg-rose-600 text-white">
                  {formatNumber(timeLeft.segundos)}
                </span>
              </div>
            </div>
          </div>

          <div className="relative group/carousel">
            {offersItems.length > cardsPerPage && (
              <button
                onClick={() => setActiveIndex(prev => Math.max(0, prev - 1))}
                disabled={finalActiveIndex === 0}
                className={`absolute top-1/2 -translate-y-1/2 -left-3 sm:-left-5 z-20 flex items-center justify-center h-10 w-10 rounded-full border shadow-md transition-all duration-200 cursor-pointer ${
                  finalActiveIndex === 0 
                    ? 'opacity-0 pointer-events-none' 
                    : theme === 'dark'
                      ? 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
                      : 'border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-100'
                }`}
                title="Anterior"
              >
                <ChevronLeft className="h-5 w-5 stroke-[2.5]" />
              </button>
            )}

            <div className="relative overflow-hidden py-1 px-0.5">
              <div 
                className="flex transition-transform duration-500 ease-out gap-4"
                style={{ transform: `translateX(-${finalActiveIndex * (100 / cardsPerPage)}%)` }}
              >
                {offersItems.map((prod) => (
                  <div key={prod.id} className="w-full shrink-0" style={{ width: `calc(${100 / cardsPerPage}% - ${(16 * (cardsPerPage - 1)) / cardsPerPage}px)` }}>
                    <ProductCard
                      product={prod}
                      theme={theme}
                      isFavorite={favorites.includes(prod.id)}
                      onToggleFavorite={toggleFavorite}
                      onViewDetails={handleVerDetalhes}
                    />
                  </div>
                ))}
              </div>
            </div>

            {offersItems.length > cardsPerPage && (
              <button
                onClick={() => setActiveIndex(prev => Math.min(prev + 1, offersItems.length - cardsPerPage))}
                disabled={finalActiveIndex >= maxIndex}
                className={`absolute top-1/2 -translate-y-1/2 -right-3 sm:-right-5 z-20 flex items-center justify-center h-10 w-10 rounded-full border shadow-md transition-all duration-200 cursor-pointer ${
                  finalActiveIndex >= maxIndex 
                    ? 'opacity-0 pointer-events-none' 
                    : theme === 'dark'
                      ? 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
                      : 'border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-100'
                }`}
                title="Próximo"
              >
                <ChevronRight className="h-5 w-5 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
      )}

      <div id="category-all-items-section" ref={gridSectionRef} className="space-y-12 pt-4">
        <div className={`border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
          theme === 'dark' ? 'border-slate-800' : 'border-neutral-200'
        }`}>
          <div>
            <h2 className={`text-xl sm:text-2xl font-extrabold tracking-tight ${
              theme === 'dark' ? 'text-slate-100' : 'text-[#111111]'
            }`}>
              {config.title}
            </h2>
            <p className="text-xs text-neutral-500 font-medium mt-0.5">
              {config.subtitle}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {activeSubcategory && (
              <button
                onClick={() => setSelectedSubcategory('TODAS')}
                className="text-xs font-bold text-neutral-700 hover:text-black dark:text-slate-300 underline cursor-pointer mr-2"
              >
                Ver todas as subcategorias
              </button>
            )}
            <span className={`text-xs font-bold px-3.5 py-1.5 rounded-full border ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-[#f7f5f3] border-neutral-200 text-neutral-800'
            }`}>
              {allItems.length} {allItems.length === 1 ? 'modelo disponível' : 'modelos disponíveis'}
            </span>
          </div>
        </div>

        {allItems.length === 0 ? (
          <div className={`py-16 text-center border rounded-2xl space-y-4 ${
            theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-[#f7f5f3] border-neutral-200'
          }`}>
            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-neutral-600'}`}>
              Nenhum produto disponível nesta categoria no momento.
            </p>
            <button 
              onClick={() => setCurrentView('home')}
              className="bg-[#111111] text-white text-xs font-bold px-6 py-3 uppercase tracking-wider hover:bg-neutral-800 transition-all cursor-pointer rounded-xs"
            >
              Voltar para a Página Inicial
            </button>
          </div>
        ) : activeSubcategory ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
              {allItems.map((prod) => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  theme={theme}
                  isFavorite={favorites.includes(prod.id)}
                  onToggleFavorite={toggleFavorite}
                  onViewDetails={handleVerDetalhes}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            {itemsBySubcategory.map(({ subName, products: subProducts }) => (
              <div key={subName} className="space-y-6">
                <div className={`flex items-center justify-between pb-3 border-b ${
                  theme === 'dark' ? 'border-slate-800' : 'border-neutral-200/80'
                }`}>
                  <div className="flex items-center space-x-3">
                    <span className={`w-2.5 h-6 rounded-full ${
                      theme === 'dark' ? 'bg-amber-400' : 'bg-[#111111]'
                    }`} />
                    <h3 className={`text-lg sm:text-xl font-extrabold tracking-tight ${
                      theme === 'dark' ? 'text-white' : 'text-[#111111]'
                    }`}>
                      {subName}
                    </h3>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600 dark:bg-slate-800 dark:text-slate-300">
                      {subProducts.length} {subProducts.length === 1 ? 'modelo' : 'modelos'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleViewAllSubcategory(subName)}
                    className="text-xs font-bold text-neutral-700 hover:text-black dark:text-slate-300 dark:hover:text-white flex items-center space-x-1 cursor-pointer transition-colors"
                    title={`Ver todos os ${subProducts.length} modelos de ${subName}`}
                  >
                    <span>Ver todos</span>
                    <ChevronRight className="h-3.5 w-3.5 stroke-[2.5]" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                  {subProducts.slice(0, 10).map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      theme={theme}
                      isFavorite={favorites.includes(prod.id)}
                      onToggleFavorite={toggleFavorite}
                      onViewDetails={handleVerDetalhes}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
