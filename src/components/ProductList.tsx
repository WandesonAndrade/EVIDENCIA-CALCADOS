import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { Product } from "../types";
import { Eye, Heart, ArrowRight, ArrowUpDown, Truck, CreditCard, RefreshCw, ShoppingBag, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { scrollToSectionWithOffset } from "../lib/scrollUtils";
import { normalizeCategoryName, normalizeSubcategoryName } from "../services/moblinkCategoriesService";

interface ProductCardProps {
  product: Product;
  theme: string;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onViewDetails: (product: Product) => void;
}

const ProductCardComponent: React.FC<ProductCardProps> = ({
  product,
  theme,
  isFavorite,
  onToggleFavorite,
  onViewDetails,
}) => {
  const discountPercent =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

  const isDark = theme === "dark";
  const mainPrice = product.price;
  const originalPrice =
    product.originalPrice && product.originalPrice > product.price
      ? product.originalPrice
      : null;

  const parcelas = 6;
  const valorParcela = (mainPrice / parcelas).toFixed(2).replace(".", ",");

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`group relative flex flex-col justify-between h-full border transition-all duration-300 overflow-hidden cursor-pointer ${
        isDark
          ? "bg-slate-900 border-slate-800 text-white"
          : "bg-white border-transparent hover:shadow-md"
      }`}
      onClick={() => onViewDetails(product)}
    >
      {/* Imagem do Calçado em Container Neutro */}
      <div className={`relative aspect-square w-full overflow-hidden p-3 ${
        isDark ? "bg-slate-950" : "bg-[#f5f3f0]"
      }`}>
        <img
          src={
            product.images?.[0] ||
            product.foto_uri ||
            "https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=600&auto=format&fit=crop"
          }
          alt={product.name}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
          decoding="async"
        />

        {/* Badge 'Novo' ou 'Desconto' no Canto Superior Esquerdo */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
          {discountPercent > 0 ? (
            <span className="px-2 py-0.5 text-[9px] font-black uppercase text-white bg-rose-600 rounded-xs">
              -{discountPercent}%
            </span>
          ) : (
            <span className="px-2 py-0.5 text-[9px] font-black uppercase text-white bg-black rounded-xs">
              Novo
            </span>
          )}
        </div>

        {/* Botão de Favoritar no Canto Superior Direito */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(String(product.id));
          }}
          className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-white/80 backdrop-blur-md text-neutral-600 hover:text-rose-600 transition-colors z-20"
          title={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        >
          <Heart className={`h-3.5 w-3.5 ${isFavorite ? "fill-rose-600 text-rose-600" : ""}`} />
        </button>
      </div>

      {/* Informações do Produto */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
        <div className="space-y-1">
          <h3 className={`text-xs font-semibold tracking-tight line-clamp-2 min-h-[32px] ${
            isDark ? "text-slate-100" : "text-neutral-900"
          }`}>
            {product.name}
          </h3>

          <div className="pt-1">
            <div className="flex items-baseline space-x-1.5">
              <span className={`text-sm sm:text-base font-black ${isDark ? "text-white" : "text-[#111111]"}`}>
                R$ {mainPrice.toFixed(2).replace(".", ",")}
              </span>
              {originalPrice && (
                <span className="text-[11px] line-through text-neutral-400">
                  R$ {originalPrice.toFixed(2).replace(".", ",")}
                </span>
              )}
            </div>
            <p className="text-[10px] text-neutral-500 font-medium">
              {parcelas}x de R$ {valorParcela}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const ProductCard = React.memo(ProductCardComponent);

// 8 Categorias da Linha 'Compre por Categoria'
const ESSENTIAL_CATEGORIES = [
  { name: 'Tênis', image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=400&auto=format&fit=crop' },
  { name: 'Sapatos', image: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?q=80&w=400&auto=format&fit=crop' },
  { name: 'Sandálias', image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=400&auto=format&fit=crop' },
  { name: 'Botas', image: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?q=80&w=400&auto=format&fit=crop' },
  { name: 'Sapatilhas', image: 'https://images.unsplash.com/photo-1560343090-f0409e92791a?q=80&w=400&auto=format&fit=crop' },
  { name: 'Papetes', image: 'https://images.unsplash.com/photo-1603808033192-082d6919d3e1?q=80&w=400&auto=format&fit=crop' },
  { name: 'Bolsas', image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=400&auto=format&fit=crop' },
  { name: 'Acessórios', image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=400&auto=format&fit=crop' },
];

export const ProductList: React.FC = () => {
  const {
    products,
    selectedCategory,
    setSelectedCategory,
    selectedSubcategory,
    setSelectedSubcategory,
    setSelectedMenuTab,
    searchQuery,
    setCurrentView,
    setSelectedProduct,
    favorites = [],
    toggleFavorite,
    theme,
    categories: dbCategories = [],
  } = useApp();

  const [sortBy, setSortBy] = useState<"relevant" | "price-asc" | "price-desc" | "launches">("relevant");
  const catalogSectionRef = useRef<HTMLElement | null>(null);
  const subcatCarouselRef = useRef<HTMLDivElement | null>(null);
  const isDark = theme === "dark";

  const scrollSubcatCarousel = (direction: 'left' | 'right') => {
    if (subcatCarouselRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      subcatCarouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Subcategorias dinâmicas extraídas prioritariamente dos produtos COM ESTOQUE DISPONÍVEL
  const activeSubcategoriesInStock = useMemo(() => {
    const subMap = new Map<string, { id: string; name: string; image?: string; itemCount: number }>();

    (products || []).forEach((p) => {
      const isAvailable = (p.stock !== undefined ? p.stock > 0 : (p.saldo_loja ?? 0) > 0);
      if (!p.visible || !isAvailable) return;

      const rawSub = (p.nome_subgrupo || p.subcategory || p.category || "").trim();
      if (!rawSub || /^\d+(\.\d+)?$/.test(rawSub)) return;

      const normSub = normalizeSubcategoryName(rawSub);
      if (!normSub || /^\d+(\.\d+)?$/.test(normSub)) return;

      const key = normSub.toUpperCase();
      const existing = subMap.get(key);
      const img = p.images?.[0] || p.foto_uri;

      if (existing) {
        existing.itemCount += 1;
        if (!existing.image && img) existing.image = img;
      } else {
        subMap.set(key, {
          id: key,
          name: normSub,
          image: img || "https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=400&auto=format&fit=crop",
          itemCount: 1,
        });
      }
    });

    // Fallbacks elegantes se a base de dados ainda não tiver subcategorias vinculadas
    if (subMap.size < 4) {
      ESSENTIAL_CATEGORIES.forEach((cat) => {
        const key = cat.name.toUpperCase();
        if (!subMap.has(key)) {
          subMap.set(key, {
            id: key,
            name: cat.name,
            image: cat.image,
            itemCount: 8,
          });
        }
      });
    }

    return Array.from(subMap.values()).sort((a, b) => b.itemCount - a.itemCount);
  }, [products]);

  const getParentGroupCode = (classificacao?: string): string => {
    if (!classificacao || typeof classificacao !== "string") return "";
    const clean = classificacao.replace(/\s+/g, "").trim();
    if (!clean) return "";
    const parts = clean.split(".");
    return parts[0] ? parts[0].trim() : "";
  };

  const matchesFilter = useCallback((p: Product) => {
    if (selectedCategory && selectedCategory !== "TODOS") {
      const target = selectedCategory.trim().toUpperCase();
      let targetCode = "";
      const matchedCat = (dbCategories || []).find(
        (c) =>
          c.id === target ||
          (c.code && c.code === target) ||
          c.name.toUpperCase().trim() === target ||
          normalizeCategoryName(c.name).toUpperCase().trim() === normalizeCategoryName(target)
      );

      if (matchedCat) {
        targetCode = matchedCat.code || matchedCat.id;
      } else if (/^\d+$/.test(target)) {
        targetCode = target;
      }

      const pParentCode = getParentGroupCode(String(p.classificacao || ''));
      let catMatch = false;

      if (targetCode && pParentCode) {
        catMatch = pParentCode === targetCode;
      }

      if (!catMatch) {
        const grupoRaw = (p.nome_grupo || p.category || "").toUpperCase().trim();
        const grupoNorm = normalizeCategoryName(p.nome_grupo || p.category || "").toUpperCase().trim();
        catMatch = grupoRaw === target || grupoNorm === target || grupoRaw.includes(target);
      }

      if (!catMatch) return false;
    }

    if (selectedSubcategory && selectedSubcategory !== "TODAS" && selectedSubcategory !== "TODOS") {
      const targetSub = selectedSubcategory.trim().toUpperCase();
      const subgrupoRaw = (p.nome_subgrupo || p.subcategory || p.category || "").toUpperCase().trim();
      if (!subgrupoRaw.includes(targetSub)) return false;
    }

    return true;
  }, [selectedCategory, selectedSubcategory, dbCategories]);

  const baseFilteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        prod.name.toLowerCase().includes(query) ||
        prod.description.toLowerCase().includes(query) ||
        (prod.nome_grupo && prod.nome_grupo.toLowerCase().includes(query)) ||
        prod.category.toLowerCase().includes(query);
      const isAvailable = (prod.stock !== undefined ? prod.stock > 0 : (prod.saldo_loja ?? 0) > 0);
      return matchesSearch && prod.visible && isAvailable;
    });
  }, [products, searchQuery]);

  const matchingCatalog = useMemo(() => {
    return baseFilteredProducts.filter(matchesFilter);
  }, [baseFilteredProducts, matchesFilter]);

  const sortedCatalog = useMemo(() => {
    const items = [...matchingCatalog];
    if (sortBy === "price-asc") return items.sort((a, b) => a.price - b.price);
    if (sortBy === "price-desc") return items.sort((a, b) => b.price - a.price);
    if (sortBy === "launches") return items.sort((a, b) => (b.newArrival ? 1 : 0) - (a.newArrival ? 1 : 0));
    return items;
  }, [matchingCatalog, sortBy]);

  const handleVerDetalhes = (prod: Product) => {
    setSelectedProduct(prod);
    setCurrentView("product-detail");
  };

  const handleSelectCategory = (catName: string) => {
    setSelectedCategory(catName.toUpperCase());
    if (setSelectedSubcategory) setSelectedSubcategory('TODAS');
    if (setSelectedMenuTab) setSelectedMenuTab(catName.toLowerCase());
    scrollToSectionWithOffset(catalogSectionRef.current || "catalog-products-section");
  };

  const handleSelectSubcategoryItem = (subName: string) => {
    if (setSelectedSubcategory) setSelectedSubcategory(subName);
    if (setSelectedMenuTab) setSelectedMenuTab(subName);
    if (setCurrentView) setCurrentView('category-page');
  };

  // Produtos exibidos na Seção 'Novidades': EXCLUSIVAMENTE produtos marcados como Marcar como Lançamento / Novidade (newArrival === true)
  const novidadesProducts = useMemo(() => {
    const onlyNewArrivals = products.filter(
      (p) => p.visible && (p.newArrival === true || (p as any).novo === true) && (p.stock !== undefined ? p.stock > 0 : (p.saldo_loja ?? 0) > 0)
    );

    if (onlyNewArrivals.length > 0) return onlyNewArrivals;

    // Fallbacks de exemplo explicitamente marcados como Lançamento/Novidade caso nenhum produto do banco esteja marcado
    return [
      { id: '1', name: 'Tênis Casual Evidência', description: 'Tênis casual com acabamento premium e máximo conforto.', price: 189.90, originalPrice: 229.90, category: 'Tênis', images: ['https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=600&auto=format&fit=crop'], sizes: [34,35,36,37,38,39], crediarioProprio: true, visible: true, stockControl: true, stock: 10, newArrival: true },
      { id: '2', name: 'Sandália Salto Bloco', description: 'Sandália feminina salto bloco para compor produções elegantes.', price: 159.90, originalPrice: 189.90, category: 'Sandálias', images: ['https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=600&auto=format&fit=crop'], sizes: [34,35,36,37,38], crediarioProprio: true, visible: true, stockControl: true, stock: 8, newArrival: true },
      { id: '3', name: 'Slip On Knit Feminino', description: 'Slip on leve e respirável em malha knit.', price: 129.90, originalPrice: 149.90, category: 'Sapatilhas', images: ['https://images.unsplash.com/photo-1560343090-f0409e92791a?q=80&w=600&auto=format&fit=crop'], sizes: [35,36,37,38], crediarioProprio: true, visible: true, stockControl: true, stock: 12, newArrival: true },
      { id: '4', name: 'Sapato Social Masculino', description: 'Sapato social confeccionado para o homem contemporâneo.', price: 199.90, originalPrice: 249.90, category: 'Sapatos', images: ['https://images.unsplash.com/photo-1533867617858-e7b97e060509?q=80&w=600&auto=format&fit=crop'], sizes: [38,39,40,41,42], crediarioProprio: true, visible: true, stockControl: true, stock: 6, newArrival: true },
      { id: '5', name: 'Bota Coturno Tratorada', description: 'Bota coturno masculina e feminina com solado tratorado.', price: 229.90, originalPrice: 279.90, category: 'Botas', images: ['https://images.unsplash.com/photo-1608256246200-53e635b5b65f?q=80&w=600&auto=format&fit=crop'], sizes: [36,37,38,39,40,41], crediarioProprio: true, visible: true, stockControl: true, stock: 5, newArrival: true },
    ];
  }, [products]);

  return (
    <section
      id="catalog-products-section"
      ref={catalogSectionRef}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-16"
    >
      {/* 1. SEÇÃO COMPRE POR CATEGORIA (CARROSSEL DESLIZANTE DE SUBCATEGORIAS EM ESTOQUE) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-xl sm:text-2xl font-extrabold tracking-tight ${isDark ? "text-white" : "text-[#111111]"}`}>
              Compre por Categoria
            </h2>
            <p className="text-xs text-neutral-500 font-medium mt-0.5">
              Subcategorias disponíveis com produtos em estoque pronto para envio.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => scrollSubcatCarousel('left')}
              className={`p-2 rounded-full border transition-all cursor-pointer ${
                isDark ? 'bg-slate-900 border-slate-800 text-white hover:bg-slate-800' : 'bg-white border-neutral-200 text-black hover:bg-neutral-100 shadow-2xs'
              }`}
              title="Anterior"
            >
              <ChevronLeft className="h-4 w-4 stroke-[2.5]" />
            </button>
            <button
              onClick={() => scrollSubcatCarousel('right')}
              className={`p-2 rounded-full border transition-all cursor-pointer ${
                isDark ? 'bg-slate-900 border-slate-800 text-white hover:bg-slate-800' : 'bg-white border-neutral-200 text-black hover:bg-neutral-100 shadow-2xs'
              }`}
              title="Próximo"
            >
              <ChevronRight className="h-4 w-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Carrossel Deslizante de Subcategorias */}
        <div
          ref={subcatCarouselRef}
          className="flex items-center space-x-3.5 sm:space-x-4 overflow-x-auto no-scrollbar scroll-smooth py-2 px-0.5"
        >
          {/* Subcategorias Dinâmicas em Estoque */}
          {activeSubcategoriesInStock.map((sub) => (
            <div
              key={sub.id}
              onClick={() => handleSelectSubcategoryItem(sub.name)}
              className={`group flex-shrink-0 min-w-[130px] sm:min-w-[150px] max-w-[170px] flex flex-col items-center p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer text-center select-none ${
                isDark
                  ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  : 'bg-[#f7f5f3] border-transparent hover:bg-[#efece7]'
              }`}
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 mb-2 overflow-hidden flex items-center justify-center rounded-xl p-1 bg-white/40 dark:bg-black/30">
                <img
                  src={sub.image}
                  alt={sub.name}
                  className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
              
              <span className={`text-xs font-bold line-clamp-1 ${
                isDark ? 'text-slate-200' : 'text-neutral-900'
              }`}>
                {sub.name}
              </span>

              <span className={`text-[10px] font-semibold mt-0.5 ${
                isDark ? 'text-slate-400' : 'text-neutral-500'
              }`}>
                {sub.itemCount} {sub.itemCount === 1 ? 'modelo' : 'modelos'}
              </span>
            </div>
          ))}
        </div>
      </div>


      {/* 2. SEÇÃO NOVIDADES (EXIBE EXCLUSIVAMENTE PRODUTOS MARCADOS COMO LANÇAMENTO / NOVIDADE) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className={`text-xl sm:text-2xl font-extrabold tracking-tight ${isDark ? "text-white" : "text-[#111111]"}`}>
            Novidades
          </h2>
          <button 
            onClick={() => {
              if (setSelectedSubcategory) setSelectedSubcategory('TODAS');
              if (setSelectedCategory) setSelectedCategory('NOVIDADES');
              if (setCurrentView) setCurrentView('category-page');
            }}
            className="text-xs font-semibold text-neutral-600 hover:text-black dark:text-neutral-300 dark:hover:text-white transition-colors cursor-pointer"
          >
            Ver todas
          </button>
        </div>

        {/* Grid de 5 Colunas Conforme Referência */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {novidadesProducts.slice(0, 5).map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              theme={theme}
              isFavorite={favorites.includes(product.id)}
              onToggleFavorite={toggleFavorite}
              onViewDetails={handleVerDetalhes}
            />
          ))}
        </div>
      </div>

      {/* 3. BENTO GRID (BANNERS DE DESTAQUE INTERMEDIÁRIOS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Banner Esquerdo Grande (Bege/Nude) */}
        <div className={`lg:col-span-6 rounded-2xl p-8 sm:p-10 flex flex-col justify-between min-h-[360px] relative overflow-hidden ${
          isDark ? 'bg-slate-900 text-white' : 'bg-[#eae6df] text-[#111111]'
        }`}>
          <div className="space-y-3 z-10 max-w-sm">
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              Novos modelos todas as semanas
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-slate-300 font-medium">
              As tendências que você ama, sempre aqui.
            </p>
            <div className="pt-2">
              <button
                onClick={() => handleSelectCategory('NOVIDADES')}
                className="bg-[#111111] text-white hover:bg-neutral-800 text-xs font-extrabold tracking-wider px-6 py-3 uppercase transition-all cursor-pointer"
              >
                VER NOVIDADES
              </button>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 w-3/5 h-4/5 overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=800&auto=format&fit=crop" 
              alt="Novos Modelos" 
              className="w-full h-full object-contain object-bottom-right"
            />
          </div>
        </div>

        {/* Coluna Direita (2 Banners Menores) */}
        <div className="lg:col-span-6 grid grid-rows-2 gap-6">
          {/* Top Card (Cinza Claro) */}
          <div className={`rounded-2xl p-6 sm:p-8 flex items-center justify-between relative overflow-hidden ${
            isDark ? 'bg-slate-900 text-white' : 'bg-[#f0eee9] text-[#111111]'
          }`}>
            <div className="space-y-2 z-10 max-w-xs">
              <h3 className="text-xl font-bold tracking-tight">
                Para todos os seus treinos
              </h3>
              <p className="text-xs text-neutral-600 dark:text-slate-300 font-medium">
                Desempenho com estilo para ir mais longe.
              </p>
              <div className="pt-1">
                <button
                  onClick={() => handleSelectCategory('ESPORTES')}
                  className="bg-[#111111] text-white hover:bg-neutral-800 text-[11px] font-extrabold tracking-wider px-5 py-2.5 uppercase transition-all cursor-pointer"
                >
                  VER ESPORTIVOS
                </button>
              </div>
            </div>
            <div className="w-2/5 h-full relative">
              <img 
                src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop" 
                alt="Treinos" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Bottom Card (Nude Suave) */}
          <div className={`rounded-2xl p-6 sm:p-8 flex items-center justify-between relative overflow-hidden ${
            isDark ? 'bg-slate-900 text-white' : 'bg-[#eee8df] text-[#111111]'
          }`}>
            <div className="space-y-2 z-10 max-w-xs">
              <h3 className="text-xl font-bold tracking-tight">
                Bolsas que completam você
              </h3>
              <p className="text-xs text-neutral-600 dark:text-slate-300 font-medium">
                Estilo e praticidade para todos os momentos.
              </p>
              <div className="pt-1">
                <button
                  onClick={() => handleSelectCategory('ACESSÓRIOS')}
                  className="bg-[#111111] text-white hover:bg-neutral-800 text-[11px] font-extrabold tracking-wider px-5 py-2.5 uppercase transition-all cursor-pointer"
                >
                  VER BOLSAS
                </button>
              </div>
            </div>
            <div className="w-2/5 h-full relative">
              <img 
                src="https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=600&auto=format&fit=crop" 
                alt="Bolsas" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. OFERTAS EM DESTAQUE */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className={`text-xl sm:text-2xl font-extrabold tracking-tight ${isDark ? "text-white" : "text-[#111111]"}`}>
            Ofertas em destaque
          </h2>
          <button 
            onClick={() => handleSelectCategory('PROMOÇÕES')}
            className="text-xs font-semibold text-neutral-600 hover:text-black dark:text-neutral-300 dark:hover:text-white transition-colors cursor-pointer"
          >
            Ver todas
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Banner Ofertas Exclusivas (Escuro) */}
          <div className="bg-[#1a1a1a] text-white rounded-2xl p-8 sm:p-10 flex flex-col justify-between min-h-[260px] relative overflow-hidden">
            <div className="space-y-2 z-10 max-w-xs">
              <h3 className="text-2xl font-black tracking-tight">
                Ofertas exclusivas
              </h3>
              <p className="text-xs text-neutral-300 font-medium">
                Descontos imperdíveis para renovar seu look.
              </p>
              <div className="pt-3">
                <button
                  onClick={() => handleSelectCategory('PROMOÇÕES')}
                  className="bg-white text-black hover:bg-neutral-200 text-xs font-extrabold tracking-wider px-6 py-3 uppercase transition-all cursor-pointer"
                >
                  APROVEITE AGORA
                </button>
              </div>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-1/2 overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=600&auto=format&fit=crop" 
                alt="Ofertas Exclusivas" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Banner Primeira Compra (Nude Ouro) */}
          <div className="bg-[#eee7dd] text-[#111111] rounded-2xl p-8 sm:p-10 flex flex-col justify-between min-h-[260px] relative overflow-hidden">
            <div className="space-y-2 z-10 max-w-xs">
              <h3 className="text-2xl font-black tracking-tight">
                Primeira compra?
              </h3>
              <p className="text-xs text-neutral-700 font-medium">
                Use o cupom <strong className="font-bold text-black">BEMVINDA</strong> e ganhe 10% OFF.
              </p>
              <div className="pt-3">
                <button
                  onClick={() => handleSelectCategory('PROMOÇÕES')}
                  className="bg-white text-black border border-neutral-300 hover:bg-neutral-100 text-xs font-extrabold tracking-wider px-6 py-3 uppercase transition-all cursor-pointer"
                >
                  EU QUERO
                </button>
              </div>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-1/2 overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=600&auto=format&fit=crop" 
                alt="Primeira Compra" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 5. INSPIRE-SE */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className={`text-xl sm:text-2xl font-extrabold tracking-tight ${isDark ? "text-white" : "text-[#111111]"}`}>
            Inspire-se
          </h2>
          <button className="text-xs font-semibold text-neutral-600 hover:text-black dark:text-neutral-300 dark:hover:text-white transition-colors cursor-pointer">
            Ver todas
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card Editorial 1 */}
          <div className="rounded-2xl p-8 sm:p-10 bg-[#eae6df] text-[#111111] flex flex-col justify-between min-h-[300px] relative overflow-hidden">
            <div className="space-y-2 z-10 max-w-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Look do dia</span>
              <h3 className="text-2xl font-black tracking-tight leading-tight">
                Produções estilosas para o dia a dia
              </h3>
              <div className="pt-3">
                <button 
                  onClick={() => setCurrentView('about')}
                  className="bg-[#111111] text-white hover:bg-neutral-800 text-xs font-extrabold tracking-wider px-6 py-3 uppercase transition-all cursor-pointer"
                >
                  VER LOOKS
                </button>
              </div>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-1/2 overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?q=80&w=600&auto=format&fit=crop" 
                alt="Look do dia" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Card Editorial 2 */}
          <div className="rounded-2xl p-8 sm:p-10 bg-[#f0eee9] text-[#111111] flex flex-col justify-between min-h-[300px] relative overflow-hidden">
            <div className="space-y-2 z-10 max-w-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Dicas</span>
              <h3 className="text-2xl font-black tracking-tight leading-tight">
                Como escolher o calçado ideal para cada ocasião
              </h3>
              <div className="pt-3">
                <button 
                  onClick={() => setCurrentView('support')}
                  className="bg-[#111111] text-white hover:bg-neutral-800 text-xs font-extrabold tracking-wider px-6 py-3 uppercase transition-all cursor-pointer"
                >
                  LEIA MAIS
                </button>
              </div>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-1/2 overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=600&auto=format&fit=crop" 
                alt="Dicas Calçados" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 7. BARRA DE BENEFÍCIOS (TRUST BADGES STRIP) */}
      <div className={`py-8 border-t border-b grid grid-cols-2 md:grid-cols-4 gap-6 text-center ${
        isDark ? 'border-slate-800 text-slate-300' : 'border-neutral-200 text-neutral-800'
      }`}>
        <div className="flex flex-col items-center space-y-2">
          <Truck className="h-6 w-6 text-neutral-700 dark:text-slate-300" />
          <span className="text-xs font-bold">Frete grátis acima de R$199</span>
        </div>
        <div className="flex flex-col items-center space-y-2">
          <CreditCard className="h-6 w-6 text-neutral-700 dark:text-slate-300" />
          <span className="text-xs font-bold">Parcele em até 6x sem juros</span>
        </div>
        <div className="flex flex-col items-center space-y-2">
          <RefreshCw className="h-6 w-6 text-neutral-700 dark:text-slate-300" />
          <span className="text-xs font-bold">Troca fácil em até 30 dias</span>
        </div>
        <div className="flex flex-col items-center space-y-2">
          <ShoppingBag className="h-6 w-6 text-neutral-700 dark:text-slate-300" />
          <span className="text-xs font-bold">Compre online e retire na loja</span>
        </div>
      </div>

    </section>
  );
};
