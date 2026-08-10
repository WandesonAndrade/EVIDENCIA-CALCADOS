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
  const isDark = theme === "dark";
  const mainPrice = product.price;
  const originalPrice =
    product.originalPrice && product.originalPrice > product.price
      ? product.originalPrice
      : null;

  const discountPercent = originalPrice
    ? Math.round(((originalPrice - mainPrice) / originalPrice) * 100)
    : 0;

  const pixPrice = (mainPrice * 0.9).toFixed(2).replace(".", ",");
  const parcelas = 6;
  const valorParcela = (mainPrice / parcelas).toFixed(2).replace(".", ",");

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`group relative flex flex-col justify-between h-full rounded-3xl border transition-all duration-300 overflow-hidden cursor-pointer ${
        isDark
          ? "bg-[#161617] border-white/12 text-white hover:border-white/30 hover:shadow-2xl hover:shadow-black/80"
          : "bg-white border-black/10 text-[#1d1d1f] shadow-xs hover:border-black/20 hover:shadow-xl hover:shadow-black/10"
      }`}
      onClick={() => onViewDetails(product)}
    >
      {/* Moldura da Foto do Calçado com Contraste Destacado */}
      <div className={`relative aspect-square w-full overflow-hidden p-6 flex items-center justify-center border-b transition-colors ${
        isDark 
          ? "bg-[#242426] border-white/5" 
          : "bg-[#fafafa] border-black/5 group-hover:bg-[#f3f3f5]"
      }`}>
        <img
          src={
            product.images?.[0] ||
            product.foto_uri ||
            "https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=600&auto=format&fit=crop"
          }
          alt={product.name}
          className="w-full h-full object-contain drop-shadow-md group-hover:drop-shadow-xl group-hover:scale-106 transition-all duration-500 ease-out"
          loading="lazy"
          decoding="async"
        />

        {/* Badges Estilo Apple no Canto Superior Esquerdo */}
        <div className="absolute top-3.5 left-3.5 flex flex-col gap-1 z-10">
          {discountPercent > 0 ? (
            <span className="px-2.5 py-0.5 text-[10px] font-bold text-white bg-[#e30000] rounded-full shadow-xs uppercase tracking-wider">
              -{discountPercent}% OFF
            </span>
          ) : (
            <span className="px-2.5 py-0.5 text-[10px] font-bold text-white bg-[#0071e3] rounded-full shadow-xs uppercase tracking-wider">
              Novo
            </span>
          )}
        </div>

        {/* Botão Favoritos no Canto Superior Direito */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(String(product.id));
          }}
          className={`absolute top-3.5 right-3.5 p-2 rounded-full backdrop-blur-md transition-all z-20 ${
            isDark
              ? "bg-black/60 text-white/80 hover:text-rose-500 hover:bg-black/80 border border-white/10"
              : "bg-white/90 text-neutral-700 hover:text-rose-600 hover:bg-white shadow-xs border border-black/5"
          }`}
          title={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        >
          <Heart className={`h-4 w-4 ${isFavorite ? "fill-rose-500 text-rose-500" : ""}`} />
        </button>
      </div>

      {/* Detalhes do Produto & Tipografia Apple */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          {/* Categoria / Marca em Tag discreta */}
          {(product.category || product.nome_grupo) && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#86868b] block">
              {product.category || product.nome_grupo}
            </span>
          )}

          <h3 className={`text-sm font-semibold tracking-tight line-clamp-2 min-h-[40px] leading-snug ${
            isDark ? "text-slate-100" : "text-[#1d1d1f]"
          }`}>
            {product.name}
          </h3>

          {/* Matriz de Preços Estúdio */}
          <div className="space-y-1 pt-1">
            <div className="flex items-baseline space-x-2">
              <span className={`text-lg sm:text-xl font-bold tracking-tight ${isDark ? "text-white" : "text-[#1d1d1f]"}`}>
                R$ {mainPrice.toFixed(2).replace(".", ",")}
              </span>
              {originalPrice && (
                <span className="text-xs line-through text-[#86868b]">
                  R$ {originalPrice.toFixed(2).replace(".", ",")}
                </span>
              )}
            </div>

            <p className="text-xs text-[#86868b] font-medium">
              em até <strong className={isDark ? "text-slate-200" : "text-[#1d1d1f]"}>{parcelas}x de R$ {valorParcela}</strong> sem juros
            </p>

            {/* Selo PIX com 10% OFF */}
            <div className="pt-1">
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border inline-flex items-center space-x-1 ${
                isDark 
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}>
                <span>R$ {pixPrice} à vista no PIX (10% OFF)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Botão Pílula Apple */}
        <div className="pt-1">
          <button className="w-full py-2.5 px-4 rounded-full bg-[#0071e3] hover:bg-[#0077ed] active:scale-[0.98] text-white text-xs font-semibold tracking-wide transition-all shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer">
            <span>Comprar</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
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

    return products
      .filter((p) => p.visible && (p.stock !== undefined ? p.stock > 0 : (p.saldo_loja ?? 0) > 0))
      .slice(0, 10);
  }, [products]);

  // Produtos exibidos na Seção 'Coleção Calçados'
  const calcadosProducts = useMemo(() => {
    return products.filter((prod) => {
      const isAvailable = (prod.stock !== undefined ? prod.stock > 0 : (prod.saldo_loja ?? 0) > 0);
      if (!prod.visible || !isAvailable) return false;
      const cat = (prod.category || prod.nome_grupo || '').toUpperCase();
      const productType = (prod.productType || '').toUpperCase();
      const isBolsaOuAcessorio = cat.includes('ACESSÓRIO') || cat.includes('BOLSA') || productType.includes('BOLSA') || cat.includes('CONFEC');
      return !isBolsaOuAcessorio;
    });
  }, [products]);

  // Produtos exibidos na Seção 'Confecções'
  const confeccoesProducts = useMemo(() => {
    const list = products.filter((prod) => {
      const isAvailable = (prod.stock !== undefined ? prod.stock > 0 : (prod.saldo_loja ?? 0) > 0);
      if (!prod.visible || !isAvailable) return false;
      const cat = (prod.category || prod.nome_grupo || prod.nome_subgrupo || prod.productType || '').toUpperCase();
      return cat.includes('CONFEC') || cat.includes('ROUPA') || cat.includes('VESTU') || cat.includes('MODA') || cat.includes('CAMISA') || cat.includes('CALÇA');
    });

    if (list.length > 0) return list;

    return products.filter(p => p.visible && (p.stock !== undefined ? p.stock > 0 : (p.saldo_loja ?? 0) > 0)).slice(0, 5);
  }, [products]);

  // Produtos exibidos na Seção 'Bolsas & Acessórios'
  const acessoriosProducts = useMemo(() => {
    const list = products.filter((prod) => {
      const isAvailable = (prod.stock !== undefined ? prod.stock > 0 : (prod.saldo_loja ?? 0) > 0);
      if (!prod.visible || !isAvailable) return false;
      const cat = (prod.category || prod.nome_grupo || prod.nome_subgrupo || prod.productType || '').toUpperCase();
      return cat.includes('ACESSÓRIO') || cat.includes('ACESSORIO') || cat.includes('BOLSA') || cat.includes('CARTEIRA') || cat.includes('CINTO') || cat.includes('MOCHILA');
    });

    if (list.length > 0) return list;

    return products.filter(p => p.visible && (p.stock !== undefined ? p.stock > 0 : (p.saldo_loja ?? 0) > 0)).slice(2, 7);
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
                  ? 'bg-[#161617] border-white/10 hover:border-white/25 hover:shadow-lg'
                  : 'bg-white border-black/10 shadow-xs hover:border-black/20 hover:shadow-md'
              }`}
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 mb-2 overflow-hidden flex items-center justify-center rounded-xl p-1 bg-[#f5f5f7] dark:bg-[#242426]">
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
                {normalizeSubcategoryName(sub.name) || normalizeCategoryName(sub.name)}
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

      {/* 3. BENTO GRID (BANNERS DE DESTAQUE STUDIO APPLE) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Banner Esquerdo Grande (Lançamentos) */}
        <div className={`lg:col-span-6 rounded-3xl p-8 sm:p-10 flex items-center justify-between relative overflow-hidden transition-all min-h-[340px] border ${
          isDark ? 'bg-[#161617] border-white/10 text-white' : 'bg-[#eae6df] border-black/5 text-[#111111]'
        }`}>
          <div className="space-y-3 z-20 w-full sm:w-[58%] pr-2">
            <span className={`inline-block text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
              isDark ? 'text-blue-400 bg-blue-400/10 border-blue-400/20' : 'text-neutral-800 bg-white/60 border-black/10'
            }`}>
              Coleção 2025
            </span>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              Novos modelos todas as semanas
            </h3>
            <p className={`text-xs sm:text-sm font-medium leading-relaxed ${isDark ? 'text-slate-300' : 'text-neutral-700'}`}>
              As maiores tendências e lançamentos em calçados, sempre em primeira mão.
            </p>
            <div className="pt-2">
              <button
                onClick={() => handleSelectCategory('NOVIDADES')}
                className="bg-[#0071e3] text-white hover:bg-[#0077ed] text-xs font-extrabold tracking-wider px-6 py-3 rounded-full uppercase transition-all cursor-pointer shadow-xs"
              >
                VER NOVIDADES
              </button>
            </div>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-[45%] overflow-hidden">
            <div className={`absolute inset-0 z-10 bg-gradient-to-r ${
              isDark ? 'from-[#161617] via-[#161617]/60 to-transparent' : 'from-[#eae6df] via-[#eae6df]/60 to-transparent'
            }`} />
            <img 
              src="https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=800&auto=format&fit=crop" 
              alt="Novos Modelos" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Coluna Direita (2 Banners Menores Studio) */}
        <div className="lg:col-span-6 grid grid-rows-2 gap-6">
          {/* Top Card (Linha Esportiva) */}
          <div className={`rounded-3xl p-7 sm:p-8 flex items-center justify-between relative overflow-hidden transition-all min-h-[160px] border ${
            isDark ? 'bg-[#161617] border-white/10 text-white' : 'bg-[#f0eee9] border-black/5 text-[#111111]'
          }`}>
            <div className="space-y-2 z-20 w-full sm:w-[58%] pr-2">
              <span className={`inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 rounded-full ${
                isDark ? 'text-emerald-400 bg-emerald-400/10' : 'text-emerald-800 bg-emerald-900/10'
              }`}>
                Linha Performance
              </span>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight">
                Para todos os seus treinos
              </h3>
              <p className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-neutral-600'}`}>
                Desempenho, amortecimento e estilo para ir mais longe.
              </p>
              <div className="pt-1">
                <button
                  onClick={() => handleSelectCategory('ESPORTES')}
                  className="bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-[11px] font-extrabold tracking-wider px-5 py-2.5 rounded-full uppercase transition-all cursor-pointer shadow-xs"
                >
                  VER ESPORTIVOS
                </button>
              </div>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-[42%] overflow-hidden">
              <div className={`absolute inset-0 z-10 bg-gradient-to-r ${
                isDark ? 'from-[#161617] via-[#161617]/70 to-transparent' : 'from-[#f0eee9] via-[#f0eee9]/70 to-transparent'
              }`} />
              <img 
                src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop" 
                alt="Treinos" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Bottom Card (Bolsas & Acessórios) */}
          <div className={`rounded-3xl p-7 sm:p-8 flex items-center justify-between relative overflow-hidden transition-all min-h-[160px] border ${
            isDark ? 'bg-[#161617] border-white/10 text-white' : 'bg-[#eee8df] border-black/5 text-[#111111]'
          }`}>
            <div className="space-y-2 z-20 w-full sm:w-[58%] pr-2">
              <span className={`inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 rounded-full ${
                isDark ? 'text-purple-400 bg-purple-400/10' : 'text-purple-800 bg-purple-900/10'
              }`}>
                Acessórios & Bolsas
              </span>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight">
                Bolsas que completam você
              </h3>
              <p className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-neutral-600'}`}>
                Design contemporâneo e praticidade para todos os momentos.
              </p>
              <div className="pt-1">
                <button
                  onClick={() => handleSelectCategory('ACESSÓRIOS')}
                  className="bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-[11px] font-extrabold tracking-wider px-5 py-2.5 rounded-full uppercase transition-all cursor-pointer shadow-xs"
                >
                  VER BOLSAS
                </button>
              </div>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-[42%] overflow-hidden">
              <div className={`absolute inset-0 z-10 bg-gradient-to-r ${
                isDark ? 'from-[#161617] via-[#161617]/70 to-transparent' : 'from-[#eee8df] via-[#eee8df]/70 to-transparent'
              }`} />
              <img 
                src="https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=600&auto=format&fit=crop" 
                alt="Bolsas" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. SEÇÃO COLEÇÃO CALÇADOS */}
      {calcadosProducts.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl sm:text-2xl font-extrabold tracking-tight ${isDark ? "text-white" : "text-[#111111]"}`}>
                Coleção Calçados
              </h2>
              <p className="text-xs text-neutral-500 font-medium mt-0.5">
                Modelos exclusivos com design contemporâneo e máximo conforto.
              </p>
            </div>
            <button 
              onClick={() => handleSelectCategory('CALÇADOS')}
              className="text-xs font-semibold text-neutral-600 hover:text-black dark:text-neutral-300 dark:hover:text-white transition-colors cursor-pointer"
            >
              Ver todos os calçados →
            </button>
          </div>

          {/* Grid de 5 Colunas para Calçados */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {calcadosProducts.slice(0, 5).map((product) => (
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
      )}

      {/* 5. CREDIÁRIO & FACILIDADES */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className={`text-xl sm:text-2xl font-extrabold tracking-tight ${isDark ? "text-white" : "text-[#111111]"}`}>
            Crediário & Facilidades
          </h2>
          <button 
            onClick={() => setCurrentView('meu-crediario')}
            className="text-xs font-semibold text-neutral-600 hover:text-black dark:text-neutral-300 dark:hover:text-white transition-colors cursor-pointer"
          >
            Acessar crediário →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Banner Meu Crediário / Faturas (Escuro) */}
          <div className="bg-[#1a1a1a] text-white rounded-3xl p-7 sm:p-9 flex items-center justify-between relative overflow-hidden shadow-xs border border-white/5 min-h-[260px]">
            <div className="space-y-3 z-20 w-full sm:w-[58%] pr-2">
              <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
                Consulta & Pagamento PIX
              </span>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
                Meu Crediário & Faturas
              </h3>
              <p className="text-xs text-neutral-300 font-medium leading-relaxed">
                Acompanhe suas parcelas, consulte seu limite e pague suas faturas via PIX a qualquer momento.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setCurrentView('meu-crediario')}
                  className="bg-amber-400 text-slate-950 hover:bg-amber-300 text-xs font-extrabold tracking-wider px-5 py-2.5 rounded-full uppercase transition-all cursor-pointer shadow-xs"
                >
                  VER MINHAS FATURAS
                </button>
              </div>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-[45%] overflow-hidden">
              <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#1a1a1a] via-[#1a1a1a]/70 to-transparent" />
              <img 
                src="https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=600&auto=format&fit=crop" 
                alt="Meu Crediário Faturas" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Banner Crediário da Loja (Carnê Evidência) */}
          <div className={`rounded-3xl p-7 sm:p-9 flex items-center justify-between relative overflow-hidden transition-all min-h-[260px] ${
            isDark ? 'bg-amber-950/30 border border-amber-500/20 text-white' : 'bg-[#eee7dd] text-[#111111] border border-black/5'
          }`}>
            <div className="space-y-3 z-20 w-full sm:w-[58%] pr-2">
              <span className={`inline-block text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                isDark ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' : 'text-amber-800 bg-amber-900/10 border-amber-900/20'
              }`}>
                Facilidade de Pagamento
              </span>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
                Crediário da Loja
              </h3>
              <p className={`text-xs font-medium leading-relaxed ${isDark ? 'text-slate-300' : 'text-neutral-700'}`}>
                Parcele suas compras em até <strong className="font-extrabold text-black dark:text-white">10x sem juros</strong> no Carnê Evidência, sem burocracia.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setCurrentView('meu-crediario')}
                  className="bg-black text-white hover:bg-neutral-800 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300 text-xs font-extrabold tracking-wider px-5 py-2.5 rounded-full uppercase transition-all cursor-pointer shadow-xs"
                >
                  SIMULAR CREDIÁRIO
                </button>
              </div>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-[45%] overflow-hidden">
              <div className={`absolute inset-0 z-10 bg-gradient-to-r ${
                isDark ? 'from-[#1c150c] via-[#1c150c]/70 to-transparent' : 'from-[#eee7dd] via-[#eee7dd]/70 to-transparent'
              }`} />
              <img 
                src="https://images.unsplash.com/photo-1559526324-4b87b5e36e44?q=80&w=600&auto=format&fit=crop" 
                alt="Crediário Evidência" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 6. SEÇÃO CONFECÇÕES & MODA */}
      {confeccoesProducts.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl sm:text-2xl font-extrabold tracking-tight ${isDark ? "text-white" : "text-[#111111]"}`}>
                Confecções & Moda
              </h2>
              <p className="text-xs text-neutral-500 font-medium mt-0.5">
                Peças exclusivas e vestuário contemporâneo para compor o seu look.
              </p>
            </div>
            <button 
              onClick={() => handleSelectCategory('CONFECÇÕES')}
              className="text-xs font-semibold text-neutral-600 hover:text-black dark:text-neutral-300 dark:hover:text-white transition-colors cursor-pointer"
            >
              Ver todas as confecções →
            </button>
          </div>

          {/* Grid de 5 Colunas para Confecções */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {confeccoesProducts.slice(0, 5).map((product) => (
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
      )}

      {/* 7. SEÇÃO BOLSAS & ACESSÓRIOS */}
      {acessoriosProducts.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl sm:text-2xl font-extrabold tracking-tight ${isDark ? "text-white" : "text-[#111111]"}`}>
                Bolsas & Acessórios
              </h2>
              <p className="text-xs text-neutral-500 font-medium mt-0.5">
                Bolsas, cintos, carteiras e acessórios para complementar seu estilo.
              </p>
            </div>
            <button 
              onClick={() => handleSelectCategory('ACESSÓRIOS')}
              className="text-xs font-semibold text-neutral-600 hover:text-black dark:text-neutral-300 dark:hover:text-white transition-colors cursor-pointer"
            >
              Ver todos os acessórios →
            </button>
          </div>

          {/* Grid de 5 Colunas para Acessórios */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {acessoriosProducts.slice(0, 5).map((product) => (
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
      )}

      {/* BARRA DE BENEFÍCIOS ESTILO APPLE (CLEAN STUDIO BADGES) */}
      <div className={`py-10 px-6 my-10 rounded-3xl border transition-all ${
        isDark 
          ? 'bg-[#161617] border-white/10 text-slate-300' 
          : 'bg-white border-black/10 shadow-xs text-[#1d1d1f]'
      }`}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="p-3 rounded-2xl bg-[#f5f5f7] dark:bg-white/10 shadow-2xs border border-black/5 dark:border-white/10">
              <Truck className="h-6 w-6 text-[#0071e3]" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold tracking-tight">Entrega Rápida</h4>
              <p className="text-[11px] text-[#86868b] pt-0.5">Frete grátis para compras elegíveis</p>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-3">
            <div className="p-3 rounded-2xl bg-white dark:bg-white/10 shadow-xs border border-black/5 dark:border-white/10">
              <CreditCard className="h-6 w-6 text-[#0071e3]" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold tracking-tight">Crediário Próprio</h4>
              <p className="text-[11px] text-[#86868b] pt-0.5">Parcele em até 10x sem juros</p>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-3">
            <div className="p-3 rounded-2xl bg-white dark:bg-white/10 shadow-xs border border-black/5 dark:border-white/10">
              <RefreshCw className="h-6 w-6 text-[#0071e3]" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold tracking-tight">Troca Simplificada</h4>
              <p className="text-[11px] text-[#86868b] pt-0.5">Até 30 dias para efetuar sua troca</p>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-3">
            <div className="p-3 rounded-2xl bg-white dark:bg-white/10 shadow-xs border border-black/5 dark:border-white/10">
              <ShoppingBag className="h-6 w-6 text-[#0071e3]" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold tracking-tight">Retirada na Loja</h4>
              <p className="text-[11px] text-[#86868b] pt-0.5">Compre online e retire com facilidade</p>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
};
