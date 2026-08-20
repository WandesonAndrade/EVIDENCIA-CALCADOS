import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { Product } from "../types";
import { Eye, Heart, ArrowRight, ArrowUpDown, Truck, CreditCard, RefreshCw, ShoppingBag, Sparkles, ChevronLeft, ChevronRight, Tag } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { scrollToSectionWithOffset } from "../lib/scrollUtils";
import { normalizeCategoryName, normalizeSubcategoryName } from "../services/moblinkCategoriesService";
import { hasProductValidGrade, extractClassificacaoCategoria } from "../services/moblinkProductsService";
import { isSaldaoProduct, getSaldaoProductPrice } from "../services/saldaoService";

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
  const { saldaoConfig } = useApp();
  const isDark = theme === "dark";
  const saldaoCalc = getSaldaoProductPrice(product, saldaoConfig);

  const mainPrice = saldaoCalc.price;
  const originalPrice = saldaoCalc.isSaldao
    ? saldaoCalc.originalPrice
    : product.originalPrice && product.originalPrice > product.price
      ? product.originalPrice
      : null;

  const discountPercent = saldaoCalc.isSaldao
    ? saldaoCalc.discountPercent
    : originalPrice
      ? Math.round(((originalPrice - mainPrice) / originalPrice) * 100)
      : 0;

  const pixPrice = saldaoCalc.isSaldao 
    ? mainPrice.toFixed(2).replace(".", ",") 
    : (mainPrice * 0.9).toFixed(2).replace(".", ",");
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
          ? "bg-[#101828]/90 border-white/12 text-white hover:border-blue-400/40 hover:shadow-2xl hover:shadow-blue-950/80 backdrop-blur-md"
          : "bg-white border border-blue-900/10 text-[#003B73] shadow-md shadow-blue-900/5 hover:border-[#006EDB] hover:shadow-xl hover:shadow-blue-900/15"
      }`}
      onClick={() => onViewDetails(product)}
    >
      {/* Moldura da Foto do Calçado */}
      <div className={`relative aspect-square w-full overflow-hidden p-6 flex items-center justify-center border-b transition-colors ${
        isDark 
          ? "bg-[#18233a] border-white/5" 
          : "bg-[#EEF8FF] border-blue-900/5 group-hover:bg-[#DDF1FF]"
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

        {/* Badges no Canto Superior Esquerdo */}
        <div className="absolute top-3.5 left-3.5 flex flex-col gap-1 z-10">
          {saldaoCalc.isSaldao ? (
            <span className="px-2.5 py-1 text-[10px] font-black text-white bg-gradient-to-r from-rose-600 to-amber-500 rounded-full shadow-md uppercase tracking-wider animate-pulse flex items-center gap-1">
              🔥 SALDÃO -{saldaoCalc.discountPercent}%
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

        {/* Botão Favoritos */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(String(product.id));
          }}
          className={`absolute top-3.5 right-3.5 p-2 rounded-full backdrop-blur-md transition-all z-20 ${
            isDark
              ? "bg-black/60 text-white/80 hover:text-rose-500 hover:bg-black/80 border border-white/10"
              : "bg-white/90 text-[#00509E] hover:text-rose-600 hover:bg-white shadow-xs border border-black/5"
          }`}
          title={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        >
          <Heart className={`h-4 w-4 ${isFavorite ? "fill-rose-500 text-rose-500" : ""}`} />
        </button>
      </div>

      {/* Detalhes do Produto */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          {/* Categoria / Marca */}
          {(product.category || product.nome_grupo) && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#52708F] block">
              {product.category || product.nome_grupo}
            </span>
          )}

          {/* Título: Azul Escuro #00509E */}
          <h3 className={`text-sm font-bold tracking-tight line-clamp-2 min-h-[40px] leading-snug ${
            isDark ? "text-slate-100" : "text-[#00509E]"
          }`}>
            {product.name}
          </h3>

          {/* Matriz de Preços: Preço à vista no PIX em Grande Destaque */}
          <div className="space-y-1 pt-1">
            {/* Preço À Vista no PIX em Destaque Principal */}
            <div className="space-y-0.5">
              <div className="flex items-center space-x-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-300/50">
                  {saldaoCalc.isSaldao ? `Saldão (${saldaoCalc.discountPercent}% OFF)` : 'À Vista no PIX (-10%)'}
                </span>
                {originalPrice && (
                  <span className="text-xs line-through text-[#52708F]">
                    R$ {originalPrice.toFixed(2).replace(".", ",")}
                  </span>
                )}
              </div>
              <div className="flex items-baseline space-x-1.5">
                <span className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? "text-white" : "text-[#003B73]"}`}>
                  R$ {pixPrice}
                </span>
              </div>
            </div>

            {/* Preço Parcelado / Regular Secundário */}
            <p className="text-xs text-[#52708F] font-medium pt-0.5">
              ou <strong className={isDark ? "text-slate-200" : "text-[#003B73]"}>R$ {mainPrice.toFixed(2).replace(".", ",")}</strong> em até <strong className={isDark ? "text-slate-200" : "text-[#003B73]"}>{parcelas}x de R$ {valorParcela}</strong> s/ juros
            </p>
          </div>
        </div>

        {/* Botão Comprar: Principal #006EDB hover #00509E */}
        <div className="pt-1">
          <button className="w-full py-2.5 px-4 rounded-full bg-[#006EDB] hover:bg-[#00509E] active:scale-[0.98] text-white text-xs font-extrabold tracking-wide transition-all shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer">
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
          image: img || "",
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
    if (setCurrentView) setCurrentView('category-page');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectSubcategoryItem = (subName: string) => {
    if (setSelectedSubcategory) setSelectedSubcategory(subName);
    if (setSelectedMenuTab) setSelectedMenuTab(subName);
    if (setCurrentView) setCurrentView('category-page');
  };

  const { saldaoConfig } = useApp();

  // Produtos do Saldão de Calçados (Calçados visíveis com grade válida e estoque <= saldaoConfig.maxStock)
  const saldaoProducts = useMemo(() => {
    return products.filter((prod) => {
      const isAvailable = (prod.stock !== undefined ? prod.stock > 0 : (prod.saldo_loja ?? 0) > 0);
      if (!prod.visible || !isAvailable || !hasProductValidGrade(prod)) return false;
      return isSaldaoProduct(prod, saldaoConfig);
    });
  }, [products, saldaoConfig]);

  // Produtos exibidos na Seção 'Novidades': EXCLUSIVAMENTE produtos marcados como Lançamento/Novidade, visíveis, com estoque e com grade ativa
  const novidadesProducts = useMemo(() => {
    return products.filter((p) => {
      const isAvailable = (p.stock !== undefined ? p.stock > 0 : (p.saldo_loja ?? 0) > 0);
      return p.visible && isAvailable && hasProductValidGrade(p) && (p.newArrival === true || (p as any).novo === true);
    });
  }, [products]);

  // Produtos exibidos na Seção 'Coleção Calçados' (Exclui estritamente Confecções, Bolsas, Acessórios, Malas e Itens de Viagem)
  const calcadosProducts = useMemo(() => {
    return products.filter((prod) => {
      const isAvailable = (prod.stock !== undefined ? prod.stock > 0 : (prod.saldo_loja ?? 0) > 0);
      if (!prod.visible || !isAvailable || !hasProductValidGrade(prod)) return false;

      const catInfo = extractClassificacaoCategoria(prod);
      const catUpper = (catInfo.category || prod.category || prod.nome_grupo || (prod as any).categoria || '').toUpperCase();
      const subUpper = (catInfo.subcategory || prod.subcategory || prod.nome_subgrupo || (prod as any).subcategoria || '').toUpperCase();
      const nameUpper = (prod.name || '').toUpperCase();

      const isNonFootwear = (
        catUpper.includes('CONFEC') || catUpper.includes('ROUPA') || catUpper.includes('VESTU') ||
        catUpper.includes('ACESSÓR') || catUpper.includes('ACESSOR') || catUpper.includes('BOLSA') ||
        catUpper.includes('VIAGEM') || catUpper.includes('MALA') || catUpper.includes('CARTEIR') ||
        catUpper.includes('CINTO') || catUpper.includes('PERFUM') || catUpper.includes('CREM') ||
        catUpper.includes('ESCOLAR') || catUpper.includes('COSMET') || catUpper.includes('COSMÉT') ||
        subUpper.includes('VIAGEM') || subUpper.includes('MALA') || subUpper.includes('BOLSA') ||
        nameUpper.includes('MALA ') || nameUpper.startsWith('MALA ') || nameUpper.includes('FRASQUEIRA') ||
        nameUpper.includes('CAMISA') || nameUpper.includes('BLUSA') || nameUpper.includes('CALÇA') ||
        nameUpper.includes('VESTIDO') || nameUpper.includes('SHORT') || nameUpper.includes('JAQUETA') ||
        nameUpper.includes('BOLSA') || nameUpper.includes('MOCHILA') || nameUpper.includes('CARTEIRA')
      );

      return !isNonFootwear;
    });
  }, [products]);

  // Produtos exibidos na Seção 'Confecções' (Strict Match Confecções / Vestuário com Grade Ativa)
  const confeccoesProducts = useMemo(() => {
    return products.filter((prod) => {
      const isAvailable = (prod.stock !== undefined ? prod.stock > 0 : (prod.saldo_loja ?? 0) > 0);
      if (!prod.visible || !isAvailable || !hasProductValidGrade(prod)) return false;

      const catInfo = extractClassificacaoCategoria(prod);
      const catUpper = (catInfo.category || prod.category || prod.nome_grupo || (prod as any).categoria || '').toUpperCase();
      const subUpper = (catInfo.subcategory || prod.subcategory || prod.nome_subgrupo || (prod as any).subcategoria || '').toUpperCase();
      const nameUpper = (prod.name || '').toUpperCase();

      return catUpper.includes('CONFEC') || catUpper.includes('ROUPA') || catUpper.includes('VESTU') || catUpper.includes('MODA') || subUpper.includes('CONFEC') || subUpper.includes('ROUPA') || nameUpper.includes('CAMISA') || nameUpper.includes('CALÇA') || nameUpper.includes('VESTIDO') || nameUpper.includes('SHORT') || nameUpper.includes('BLUSA') || nameUpper.includes('JAQUETA');
    });
  }, [products]);

  // Produtos exibidos na Seção 'Bolsas & Acessórios' (Inclui Bolsas, Acessórios, Malas & Itens de Viagem)
  const acessoriosProducts = useMemo(() => {
    return products.filter((prod) => {
      const isAvailable = (prod.stock !== undefined ? prod.stock > 0 : (prod.saldo_loja ?? 0) > 0);
      if (!prod.visible || !isAvailable || !hasProductValidGrade(prod)) return false;

      const catInfo = extractClassificacaoCategoria(prod);
      const catUpper = (catInfo.category || prod.category || prod.nome_grupo || (prod as any).categoria || '').toUpperCase();
      const subUpper = (catInfo.subcategory || prod.subcategory || prod.nome_subgrupo || (prod as any).subcategoria || '').toUpperCase();
      const nameUpper = (prod.name || '').toUpperCase();

      return (
        catUpper.includes('ACESSÓR') || catUpper.includes('ACESSOR') ||
        catUpper.includes('BOLSA') || catUpper.includes('CARTEIR') ||
        catUpper.includes('CINTO') || catUpper.includes('MOCHILA') ||
        catUpper.includes('VIAGEM') || catUpper.includes('MALA') ||
        catUpper.includes('PERFUM') || catUpper.includes('CREM') ||
        subUpper.includes('BOLSA') || subUpper.includes('ACESSÓR') ||
        subUpper.includes('VIAGEM') || subUpper.includes('MALA') ||
        nameUpper.includes('BOLSA') || nameUpper.includes('CARTEIRA') ||
        nameUpper.includes('CINTO') || nameUpper.includes('MOCHILA') ||
        nameUpper.includes('MALA') || nameUpper.includes('VIAGEM') ||
        nameUpper.includes('FRASQUEIRA') || nameUpper.includes('CHAVEIRO')
      );
    });
  }, [products]);

  return (
    <section
      id="catalog-products-section"
      ref={catalogSectionRef}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-16"
    >
      {/* 1. SEÇÃO COMPRE POR CATEGORIA (CARROSSEL DESLIZANTE DE SUBCATEGORIAS EM ESTOQUE) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b pb-3 border-blue-900/10 dark:border-white/10">
          <div>
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-[#DDF1FF] text-[#003B73] dark:bg-blue-900/30 dark:text-blue-200 border border-[#006EDB]/20 mb-1.5">
              Navegação Rápida
            </span>
            <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? "text-white" : "text-[#003B73]"}`}>
              Compre por Categoria
            </h2>
            <p className={`text-xs sm:text-sm font-medium mt-0.5 ${isDark ? "text-slate-400" : "text-[#52708F]"}`}>
              Subcategorias com modelos em estoque pronto para entrega imediata.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => scrollSubcatCarousel('left')}
              className={`p-2.5 rounded-full border transition-all cursor-pointer ${
                isDark ? 'bg-slate-900 border-slate-800 text-white hover:bg-slate-800' : 'bg-white border-blue-900/15 text-[#003B73] hover:bg-[#DDF1FF] shadow-xs'
              }`}
              title="Anterior"
            >
              <ChevronLeft className="h-4 w-4 stroke-[2.5]" />
            </button>
            <button
              onClick={() => scrollSubcatCarousel('right')}
              className={`p-2.5 rounded-full border transition-all cursor-pointer ${
                isDark ? 'bg-slate-900 border-slate-800 text-white hover:bg-slate-800' : 'bg-white border-blue-900/15 text-[#003B73] hover:bg-[#DDF1FF] shadow-xs'
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
          {/* Subcategorias Dinâmicas em Estoque (Item 5 Especificação) */}
          {activeSubcategoriesInStock.map((sub) => (
            <div
              key={sub.id}
              onClick={() => handleSelectSubcategoryItem(sub.name)}
              className={`group flex-shrink-0 min-w-[130px] sm:min-w-[150px] max-w-[170px] flex flex-col items-center p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer text-center select-none ${
                isDark
                  ? 'bg-[#101828]/90 border-white/10 text-white hover:bg-[#006EDB] hover:border-[#006EDB] hover:shadow-lg backdrop-blur-md'
                  : 'bg-white border-blue-900/10 text-[#003B73] shadow-md hover:bg-[#006EDB] hover:text-white hover:border-[#006EDB] hover:shadow-xl'
              }`}
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 mb-2 overflow-hidden flex items-center justify-center rounded-xl p-1 bg-[#EEF8FF] group-hover:bg-white/20 transition-colors">
                <img
                  src={sub.image}
                  alt={sub.name}
                  className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
              
              <span className={`text-xs font-bold line-clamp-1 transition-colors ${
                isDark ? 'text-slate-200 group-hover:text-white' : 'text-[#003B73] group-hover:text-white'
              }`}>
                {normalizeSubcategoryName(sub.name) || normalizeCategoryName(sub.name)}
              </span>

              <span className={`text-[10px] font-semibold mt-0.5 transition-colors ${
                isDark ? 'text-slate-400 group-hover:text-blue-100' : 'text-[#52708F] group-hover:text-[#DDF1FF]'
              }`}>
                {sub.itemCount} {sub.itemCount === 1 ? 'modelo' : 'modelos'}
              </span>
            </div>
          ))}
        </div>
      </div>


      {/* 1.5 SEÇÃO SALDÃO DE CALÇADOS (ESTOQUE BAIXO COM DESCONTO EM %) */}
      {saldaoConfig?.enabled && saldaoProducts.length > 0 && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-rose-900/90 via-slate-900 to-amber-950/90 text-white border border-rose-500/30 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-12 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-500 text-white shadow-md animate-pulse">
                  <Tag className="h-3 w-3" />
                  <span>ÚLTIMAS UNIDADES EM ESTOQUE</span>
                </span>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>🔥 Saldão de Calçados</span>
                  <span className="text-amber-400 text-lg sm:text-2xl font-black">-{saldaoConfig.discountPercent}% OFF</span>
                </h2>
                <p className="text-xs sm:text-sm font-medium text-slate-300">
                  {saldaoConfig.bannerText || `Aproveite calçados selecionados com até ${saldaoConfig.discountPercent}% de desconto por tempo limitado!`}
                </p>
              </div>

              <button 
                onClick={() => {
                  if (setSelectedSubcategory) setSelectedSubcategory('TODAS');
                  if (setSelectedCategory) setSelectedCategory('SALDÃO');
                  if (setSelectedMenuTab) setSelectedMenuTab('saldão');
                  if (setCurrentView) setCurrentView('category-page');
                }}
                className="px-5 py-2.5 rounded-xl bg-white text-slate-950 font-black text-xs hover:bg-amber-400 transition-colors shadow-lg cursor-pointer shrink-0"
              >
                Ver todos os calçados em saldão →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {saldaoProducts.slice(0, 5).map((product) => (
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

      {/* 2. SEÇÃO NOVIDADES */}
      {novidadesProducts.length > 0 && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b pb-3 border-blue-900/10 dark:border-white/10">
            <div>
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-[#DDF1FF] text-[#003B73] dark:bg-blue-900/30 dark:text-blue-200 border border-[#006EDB]/20 mb-1.5">
                Lançamentos Recentes
              </span>
              <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? "text-white" : "text-[#003B73]"}`}>
                Novidades da Estação
              </h2>
              <p className={`text-xs sm:text-sm font-medium mt-0.5 ${isDark ? "text-slate-400" : "text-[#52708F]"}`}>
                As últimas tendências que acabaram de chegar às nossas prateleiras.
              </p>
            </div>
            <button 
              onClick={() => {
                if (setSelectedSubcategory) setSelectedSubcategory('TODAS');
                if (setSelectedCategory) setSelectedCategory('NOVIDADES');
                if (setCurrentView) setCurrentView('category-page');
              }}
              className="text-xs font-extrabold text-[#006EDB] hover:text-[#00509E] dark:text-amber-300 dark:hover:text-white transition-colors cursor-pointer shrink-0"
            >
              Ver todas as novidades →
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
      )}

      {/* 3. BENTO GRID (BANNERS DE DESTAQUE PADRONIZADOS COM A MARCA EVIDÊNCIA) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Banner Esquerdo Grande (Lançamentos / Novidades) */}
        <div 
          onClick={() => handleSelectCategory('NOVIDADES')}
          className={`lg:col-span-6 rounded-3xl p-8 sm:p-10 flex items-center justify-between relative overflow-hidden transition-all min-h-[340px] border cursor-pointer group shadow-xl ${
            isDark ? 'bg-[#101828] border-white/10 text-white hover:border-white/20' : 'bg-gradient-to-br from-[#ffffff] via-[#f4f8fe] to-[#e8f1fc] border-blue-900/10 text-[#003B73] hover:shadow-2xl'
          }`}
        >
          <div className="space-y-3 z-20 w-full sm:w-[58%] pr-2">
            <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
              isDark ? 'text-blue-200 bg-blue-900/40 border-blue-800' : 'text-[#003B73] bg-[#DDF1FF] border-[#006EDB]/20'
            }`}>
              Coleção 2025
            </span>
            <h3 className={`text-2xl sm:text-3xl font-black tracking-tight leading-tight ${
              isDark ? 'text-white' : 'text-[#003B73]'
            }`}>
              Novos modelos todas as semanas
            </h3>
            <p className={`text-xs sm:text-sm font-medium leading-relaxed ${isDark ? 'text-slate-300' : 'text-[#52708F]'}`}>
              As maiores tendências e lançamentos em calçados, sempre em primeira mão.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleSelectCategory('NOVIDADES'); }}
                className="bg-[#006EDB] hover:bg-[#00509E] text-white text-xs font-extrabold tracking-wider px-6 py-3 rounded-full uppercase transition-all cursor-pointer shadow-md flex items-center space-x-2"
              >
                <span>VER NOVIDADES</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-[45%] overflow-hidden">
            <div className={`absolute inset-0 z-10 bg-gradient-to-r ${
              isDark ? 'from-[#101828] via-[#101828]/60 to-transparent' : 'from-[#ffffff] via-[#ffffff]/60 to-transparent'
            }`} />
            <img 
              src="https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=800&auto=format&fit=crop" 
              alt="Novos Modelos" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        </div>

        {/* Coluna Direita (2 Banners Menores Studio) */}
        <div className="lg:col-span-6 grid grid-rows-2 gap-6">
          {/* Top Card (Linha Sapatos / Calçados) */}
          <div 
            onClick={() => handleSelectCategory('CALÇADOS')}
            className={`rounded-3xl p-7 sm:p-8 flex items-center justify-between relative overflow-hidden transition-all min-h-[160px] border cursor-pointer group shadow-xl ${
              isDark ? 'bg-[#101828] border-white/10 text-white hover:border-white/20' : 'bg-gradient-to-br from-[#ffffff] via-[#f4f8fe] to-[#e8f1fc] border-blue-900/10 text-[#003B73] hover:shadow-2xl'
            }`}
          >
            <div className="space-y-2 z-20 w-full sm:w-[58%] pr-2">
              <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                isDark ? 'text-blue-200 bg-blue-900/40 border-blue-800' : 'text-[#003B73] bg-[#DDF1FF] border-[#006EDB]/20'
              }`}>
                Linha Sapatos
              </span>
              <h3 className={`text-lg sm:text-xl font-black tracking-tight ${
                isDark ? 'text-white' : 'text-[#003B73]'
              }`}>
                Para todos os seus momentos
              </h3>
              <p className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-[#52708F]'}`}>
                Desempenho, amortecimento e estilo para ir mais longe.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleSelectCategory('CALÇADOS'); }}
                  className="bg-[#006EDB] hover:bg-[#00509E] text-white text-[11px] font-extrabold tracking-wider px-5 py-2.5 rounded-full uppercase transition-all cursor-pointer shadow-md flex items-center space-x-1.5"
                >
                  <span>VER SAPATOS</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-[42%] overflow-hidden">
              <div className={`absolute inset-0 z-10 bg-gradient-to-r ${
                isDark ? 'from-[#101828] via-[#101828]/70 to-transparent' : 'from-[#ffffff] via-[#ffffff]/70 to-transparent'
              }`} />
              <img 
                src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop" 
                alt="Sapatos" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>

          {/* Bottom Card (Bolsas & Acessórios) */}
          <div 
            onClick={() => handleSelectCategory('ACESSÓRIOS')}
            className={`rounded-3xl p-7 sm:p-8 flex items-center justify-between relative overflow-hidden transition-all min-h-[160px] border cursor-pointer group shadow-xl ${
              isDark ? 'bg-[#101828] border-white/10 text-white hover:border-white/20' : 'bg-gradient-to-br from-[#ffffff] via-[#f4f8fe] to-[#e8f1fc] border-blue-900/10 text-[#003B73] hover:shadow-2xl'
            }`}
          >
            <div className="space-y-2 z-20 w-full sm:w-[58%] pr-2">
              <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                isDark ? 'text-blue-200 bg-blue-900/40 border-blue-800' : 'text-[#003B73] bg-[#DDF1FF] border-[#006EDB]/20'
              }`}>
                Acessórios & Bolsas
              </span>
              <h3 className={`text-lg sm:text-xl font-black tracking-tight ${
                isDark ? 'text-white' : 'text-[#003B73]'
              }`}>
                Bolsas que completam você
              </h3>
              <p className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-[#52708F]'}`}>
                Design contemporâneo e praticidade para todos os momentos.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleSelectCategory('ACESSÓRIOS'); }}
                  className="bg-[#006EDB] hover:bg-[#00509E] text-white text-[11px] font-extrabold tracking-wider px-5 py-2.5 rounded-full uppercase transition-all cursor-pointer shadow-md flex items-center space-x-1.5"
                >
                  <span>VER ACESSÓRIOS</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-[42%] overflow-hidden">
              <div className={`absolute inset-0 z-10 bg-gradient-to-r ${
                isDark ? 'from-[#101828] via-[#101828]/70 to-transparent' : 'from-[#ffffff] via-[#ffffff]/70 to-transparent'
              }`} />
              <img 
                src="https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=600&auto=format&fit=crop" 
                alt="Acessórios e Bolsas" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. SEÇÃO COLEÇÃO CALÇADOS */}
      {calcadosProducts.length > 0 && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b pb-3 border-blue-900/10 dark:border-white/10">
            <div>
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-[#DDF1FF] text-[#003B73] dark:bg-blue-900/30 dark:text-blue-200 border border-[#006EDB]/20 mb-1.5">
                Destaques da Marca
              </span>
              <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? "text-white" : "text-[#003B73]"}`}>
                Coleção Calçados
              </h2>
              <p className={`text-xs sm:text-sm font-medium mt-0.5 ${isDark ? "text-slate-400" : "text-[#52708F]"}`}>
                Modelos exclusivos com conforto anatômico e acabamento impecável.
              </p>
            </div>
            <button 
              onClick={() => handleSelectCategory('CALÇADOS')}
              className="text-xs font-extrabold text-[#006EDB] hover:text-[#00509E] dark:text-amber-300 dark:hover:text-white transition-colors cursor-pointer shrink-0"
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
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b pb-3 border-blue-900/10 dark:border-white/10">
          <div>
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-[#DDF1FF] text-[#003B73] dark:bg-blue-900/30 dark:text-blue-200 border border-[#006EDB]/20 mb-1.5">
              Soluções Financeiras
            </span>
            <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? "text-white" : "text-[#003B73]"}`}>
              Crediário & Facilidades
            </h2>
            <p className={`text-xs sm:text-sm font-medium mt-0.5 ${isDark ? "text-slate-400" : "text-[#52708F]"}`}>
              Parcelamento facilitation e consulta de faturas com baixa via PIX.
            </p>
          </div>
          <button 
            onClick={() => setCurrentView('meu-crediario')}
            className="text-xs font-extrabold text-[#006EDB] hover:text-[#00509E] dark:text-amber-300 dark:hover:text-white transition-colors cursor-pointer shrink-0"
          >
            Acessar crediário →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Banner Meu Crediário / Faturas (Escuro com Animação Hover) */}
          <div 
            onClick={() => setCurrentView('meu-crediario')}
            className="group bg-gradient-to-br from-[#040c1a] via-[#09162e] to-[#0e2145] text-white rounded-3xl p-7 sm:p-9 flex items-center justify-between relative overflow-hidden shadow-xl hover:shadow-2xl border border-white/20 hover:border-amber-400/50 min-h-[260px] cursor-pointer transition-all duration-300 transform hover:-translate-y-1.5"
          >
            <div className="space-y-3 z-20 w-full sm:w-[58%] pr-2">
              <span className="inline-block text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/30 shadow-xs">
                Consulta & Pagamento PIX
              </span>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-tight group-hover:text-amber-300 transition-colors">
                Meu Crediário & Faturas
              </h3>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                Acompanhe suas parcelas, consulte seu limite e pague suas faturas via PIX a qualquer momento.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setCurrentView('meu-crediario'); }}
                  className="bg-amber-400 text-slate-950 hover:bg-amber-300 text-xs font-black tracking-wider px-5 py-2.5 rounded-full uppercase transition-all cursor-pointer shadow-md group-hover:scale-105 flex items-center space-x-1.5"
                >
                  <span>VER MINHAS FATURAS</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5] group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-[45%] overflow-hidden">
              <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#040c1a] via-[#040c1a]/70 to-transparent" />
              <img 
                src="https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=600&auto=format&fit=crop" 
                alt="Meu Crediário Faturas" 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
              />
            </div>
          </div>

          {/* Banner Crediário da Loja (Carnê Evidência com Animação Hover) */}
          <div 
            onClick={() => setCurrentView('meu-crediario')}
            className={`group rounded-3xl p-7 sm:p-9 flex items-center justify-between relative overflow-hidden transition-all duration-300 transform hover:-translate-y-1.5 min-h-[260px] shadow-xl hover:shadow-2xl cursor-pointer border ${
              isDark ? 'bg-amber-950/30 border-amber-500/20 text-white hover:border-amber-400/40' : 'bg-gradient-to-br from-[#ffffff] via-[#f4f8fe] to-[#e8f1fc] text-[#003B73] border-blue-900/10 hover:border-[#006EDB]/40'
            }`}
          >
            <div className="space-y-3 z-20 w-full sm:w-[58%] pr-2">
              <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                isDark ? 'text-blue-200 bg-blue-900/40 border-blue-800' : 'text-[#003B73] bg-[#DDF1FF] border-[#006EDB]/20'
              }`}>
                Facilidade de Pagamento
              </span>
              <h3 className={`text-xl sm:text-2xl font-black tracking-tight leading-tight group-hover:text-[#006EDB] dark:group-hover:text-amber-300 transition-colors ${
                isDark ? 'text-white' : 'text-[#003B73]'
              }`}>
                Crediário da Loja
              </h3>
              <p className={`text-xs font-medium leading-relaxed ${isDark ? 'text-slate-300' : 'text-[#52708F]'}`}>
                Parcele suas compras em até <strong className="font-black text-[#003B73] dark:text-white">6x sem juros</strong> no Carnê Evidência, sem burocracia.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setCurrentView('meu-crediario'); }}
                  className="bg-[#006EDB] hover:bg-[#00509E] text-white text-xs font-black tracking-wider px-5 py-2.5 rounded-full uppercase transition-all cursor-pointer shadow-md group-hover:scale-105 flex items-center space-x-1.5"
                >
                  <span>SIMULAR CREDIÁRIO</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5] group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-[45%] overflow-hidden">
              <div className={`absolute inset-0 z-10 bg-gradient-to-r ${
                isDark ? 'from-[#1c150c] via-[#1c150c]/70 to-transparent' : 'from-[#ffffff] via-[#ffffff]/70 to-transparent'
              }`} />
              <img 
                src="https://images.unsplash.com/photo-1559526324-4b87b5e36e44?q=80&w=600&auto=format&fit=crop" 
                alt="Crediário Evidência" 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 6. SEÇÃO CONFECÇÕES & MODA */}
      {confeccoesProducts.length > 0 && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b pb-3 border-blue-900/10 dark:border-white/10">
            <div>
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-[#DDF1FF] text-[#003B73] dark:bg-blue-900/30 dark:text-blue-200 border border-[#006EDB]/20 mb-1.5">
                Vestuário & Estilo
              </span>
              <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? "text-white" : "text-[#003B73]"}`}>
                Confecções & Moda
              </h2>
              <p className={`text-xs sm:text-sm font-medium mt-0.5 ${isDark ? "text-slate-400" : "text-[#52708F]"}`}>
                Peças exclusivas e vestuário contemporâneo para renovar o seu visual.
              </p>
            </div>
            <button 
              onClick={() => handleSelectCategory('CONFECÇÕES')}
              className="text-xs font-extrabold text-[#006EDB] hover:text-[#00509E] dark:text-amber-300 dark:hover:text-white transition-colors cursor-pointer shrink-0"
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
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b pb-3 border-blue-900/10 dark:border-white/10">
            <div>
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-[#DDF1FF] text-[#003B73] dark:bg-blue-900/30 dark:text-blue-200 border border-[#006EDB]/20 mb-1.5">
                Complementos Essenciais
              </span>
              <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? "text-white" : "text-[#003B73]"}`}>
                Bolsas & Acessórios
              </h2>
              <p className={`text-xs sm:text-sm font-medium mt-0.5 ${isDark ? "text-slate-400" : "text-[#52708F]"}`}>
                Bolsas, cintos, carteiras e utilitários elegantes para finalizar seu look.
              </p>
            </div>
            <button 
              onClick={() => handleSelectCategory('ACESSÓRIOS')}
              className="text-xs font-extrabold text-[#006EDB] hover:text-[#00509E] dark:text-amber-300 dark:hover:text-white transition-colors cursor-pointer shrink-0"
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
              <p className="text-[11px] text-[#86868b] pt-0.5">Parcele em até 6x sem juros</p>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-3">
            <div className="p-3 rounded-2xl bg-white dark:bg-white/10 shadow-xs border border-black/5 dark:border-white/10">
              <RefreshCw className="h-6 w-6 text-[#0071e3]" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold tracking-tight">Troca Simplificada</h4>
              <p className="text-[11px] text-[#86868b] pt-0.5">Até 15 dias para efetuar sua troca</p>
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
