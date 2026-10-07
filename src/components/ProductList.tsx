import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useApp, DEFAULT_FEATURED_PROMO_CARDS } from "../context/AppContext";
import { Product } from "../types";
import { Eye, Heart, ArrowRight, ArrowUpDown, Truck, CreditCard, RefreshCw, ShoppingBag, Sparkles, ChevronLeft, ChevronRight, Tag, Search, X, Headphones, ShoppingCart, Clock, FileText, QrCode, ShieldCheck, Laptop, Footprints } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { scrollToSectionWithOffset } from "../lib/scrollUtils";
import { normalizeCategoryName, normalizeSubcategoryName, isProductInCategory } from "../services/moblinkCategoriesService";
import { extractClassificacaoCategoria, isIgnoredClassification } from "../services/moblinkProductsService";
import { hasProductValidPhotos, hasProductValidPhoto } from "../utils/photoUtils";
import { isSaldaoProduct, getSaldaoProductPrice } from "../services/saldaoService";
import { getApplicablePromotion } from "../services/promotionsService";
import { NO_PHOTO_SVG } from "../utils/placeholder";

import { ProductCard, StorefrontProductCard } from "./products/storefront/StorefrontProductCard";
import { StorefrontProductGrid } from "./products/storefront/StorefrontProductGrid";
import { SubcategoryCarousel } from "./products/storefront/SubcategoryCarousel";
import { matchProductSearch } from "./products/utils/productFilterUtils";
import { resolveProductSubcategoryName } from "./products/utils/categoryNavigationUtils";
import { SaldaoBanner } from "./SaldaoBanner";

export { ProductCard, StorefrontProductCard };

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
    setSearchQuery,
    setCurrentView,
    setSelectedProduct,
    favorites = [],
    toggleFavorite,
    theme,
    categories: dbCategories = [],
    storeTheme,
    featuredPromoCards,
  } = useApp();

  const isOutubroRosa = storeTheme === 'outubro-rosa';
  const [sortBy, setSortBy] = useState<"relevant" | "price-asc" | "price-desc" | "launches">("relevant");
  const catalogSectionRef = useRef<HTMLElement | null>(null);
  const isDark = theme === "dark";

  // Estados e controle para carrossel dos cards promocionais em dispositivos móveis
  const [activePromoIndex, setActivePromoIndex] = useState(0);
  const promoCarouselRef = useRef<HTMLDivElement | null>(null);

  const handlePromoScroll = useCallback(() => {
    if (!promoCarouselRef.current) return;
    const el = promoCarouselRef.current;
    const card = el.firstElementChild as HTMLElement | null;
    const cardWidth = card ? card.offsetWidth : el.offsetWidth * 0.85;
    const index = Math.round(el.scrollLeft / (cardWidth + 14));
    setActivePromoIndex(Math.min(Math.max(index, 0), 2));
  }, []);

  const scrollToPromoCard = useCallback((index: number) => {
    if (!promoCarouselRef.current) return;
    const el = promoCarouselRef.current;
    const targetCard = el.children[index] as HTMLElement | undefined;
    if (targetCard) {
      targetCard.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
      setActivePromoIndex(index);
    }
  }, []);

  // Subcategorias dinâmicas extraídas prioritariamente dos produtos COM ESTOQUE DISPONÍVEL E FOTO VÁLIDA
  const activeSubcategoriesInStock = useMemo(() => {
    const subMap = new Map<string, { id: string; name: string; image?: string; itemCount: number }>();
    const EXCLUDED_NAMES = new Set([
      'FEMININO', 'MASCULINO', 'INFANTIL', 'BEBÊ', 'BEBE', 'GERAL', 'TODAS', 'TODOS', 'UNISSEX',
      'CALÇADOS', 'CALCADOS', 'SEM CLASSIFICAÇÃO DEFINIDA'
    ]);

    (products || []).forEach((p) => {
      // Regra do E-commerce: Produtos com classificação 001.001 NUNCA entram no e-commerce
      if (isIgnoredClassification(p)) return;

      const isAvailable = (p.stock !== undefined ? p.stock > 0 : (p.saldo_loja ?? 0) > 0);
      const catInfo = extractClassificacaoCategoria(p);
      const isUnclassified = catInfo.category === 'Sem Classificação Definida' || !catInfo.isDefined;

      if (!p.visible || !isAvailable || !hasProductValidPhoto(p) || isUnclassified) return;

      const resolvedSub = resolveProductSubcategoryName(p);
      if (!resolvedSub || /^\d+(\.\d+)?$/.test(resolvedSub)) return;

      const upper = resolvedSub.toUpperCase();
      if (EXCLUDED_NAMES.has(upper) || upper.includes('SEM CLASSIFICA')) return;

      const key = upper;
      const existing = subMap.get(key);
      const img = p.images?.[0] || p.foto_uri;

      if (existing) {
        existing.itemCount += 1;
        if (!existing.image && img) existing.image = img;
      } else {
        subMap.set(key, {
          id: key,
          name: resolvedSub,
          image: img || "",
          itemCount: 1,
        });
      }
    });

    // Fallbacks elegantes se a base de dados ainda não tiver subcategorias suficientes vinculadas
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
        catMatch = isProductInCategory(p, selectedCategory);
      }

      if (!catMatch) return false;
    }

    if (selectedSubcategory && selectedSubcategory !== "TODAS" && selectedSubcategory !== "TODOS") {
      const targetSub = selectedSubcategory.trim().toUpperCase();
      const normTargetSub = normalizeSubcategoryName(targetSub).toUpperCase();

      const subgrupoRaw = (p.nome_subgrupo || p.subcategory || "").toUpperCase().trim();
      const normSubRaw = normalizeSubcategoryName(subgrupoRaw).toUpperCase();
      const nameRaw = (p.name || "").toUpperCase();

      const subMatch = subgrupoRaw.includes(targetSub) || normSubRaw.includes(normTargetSub) || nameRaw.includes(targetSub);
      if (!subMatch) return false;
    }

    return true;
  }, [selectedCategory, selectedSubcategory, dbCategories]);

  const baseFilteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const isAvailable = (prod.stock !== undefined ? prod.stock > 0 : (prod.saldo_loja ?? 0) > 0);
      return prod.visible && isAvailable && hasProductValidPhoto(prod) && matchProductSearch(prod, searchQuery);
    });
  }, [products, searchQuery]);

  const matchingCatalog = useMemo(() => {
    // Quando houver busca ativa por texto livre, buscamos dinamicamente em TODO o catálogo ativo
    // (igual à busca global do MobLink ERP), evitando que uma categoria ou subcategoria anterior oculte resultados válidos.
    if (searchQuery && searchQuery.trim()) {
      return baseFilteredProducts;
    }
    return baseFilteredProducts.filter(matchesFilter);
  }, [baseFilteredProducts, matchesFilter, searchQuery]);

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
    if (setSelectedCategory) setSelectedCategory('TODOS', subName);
    if (setSelectedMenuTab) setSelectedMenuTab('todos');
    if (setSelectedSubcategory) setSelectedSubcategory(subName);
    if (setCurrentView) setCurrentView('category-page');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePromoCardClick = (link?: string) => {
    if (!link) return;
    const cleanLink = link.trim();
    if (cleanLink === 'meu-crediario' || cleanLink === '/meu-crediario') {
      if (setCurrentView) setCurrentView('meu-crediario');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (cleanLink.startsWith('categoria:')) {
      handleSelectCategory(cleanLink.replace('categoria:', ''));
    } else if (cleanLink.startsWith('subcategoria:')) {
      handleSelectSubcategoryItem(cleanLink.replace('subcategoria:', ''));
    } else if (cleanLink.startsWith('promo:')) {
      if (setSelectedSubcategory) setSelectedSubcategory('TODAS');
      if (setSelectedCategory) setSelectedCategory(cleanLink);
      if (setCurrentView) setCurrentView('category-page');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      handleSelectCategory(cleanLink);
    }
  };

  const { saldaoConfig } = useApp();

  // Produtos do Saldão de Calçados (Calçados visíveis com foto válida e estoque <= saldaoConfig.maxStock)
  const saldaoProducts = useMemo(() => {
    return products.filter((prod) => {
      const isAvailable = (prod.stock !== undefined ? prod.stock > 0 : (prod.saldo_loja ?? 0) > 0);
      if (!prod.visible || !isAvailable || !hasProductValidPhoto(prod)) return false;
      return isSaldaoProduct(prod, saldaoConfig);
    });
  }, [products, saldaoConfig]);

  // Função utilitária que identifica se o produto é estritamente calçado (exclui confecções, bolsas, perfumes, cosméticos e malas)
  const isFootwearProduct = useCallback((prod: Product): boolean => {
    const catInfo = extractClassificacaoCategoria(prod);
    const isUnclassified = catInfo.category === 'Sem Classificação Definida' || !catInfo.isDefined;
    if (isUnclassified) return false;

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
      subUpper.includes('PERFUM') || subUpper.includes('COSMET') ||
      nameUpper.includes('MALA ') || nameUpper.startsWith('MALA ') || nameUpper.includes('FRASQUEIRA') ||
      nameUpper.includes('CAMISA') || nameUpper.includes('BLUSA') || nameUpper.includes('CALÇA') ||
      nameUpper.includes('VESTIDO') || nameUpper.includes('SHORT') || nameUpper.includes('JAQUETA') ||
      nameUpper.includes('BOLSA') || nameUpper.includes('MOCHILA') || nameUpper.includes('CARTEIRA') ||
      nameUpper.includes('PERFUME') || nameUpper.includes('DEO COLÔNIA') || nameUpper.includes('DEO COLONIA') ||
      nameUpper.includes('EAU DE')
    );

    return !isNonFootwear;
  }, []);

  // Produtos exibidos na Seção 'Novidades': Prioriza ESTRITAMENTE calçados com estoque e foto real
  const novidadesProducts = useMemo(() => {
    const activeProducts = products.filter((p) => {
      const isAvailable = (p.stock !== undefined ? p.stock > 0 : (p.saldo_loja ?? 0) > 0);
      return p.visible && isAvailable && hasProductValidPhoto(p);
    });

    // 1. Calçados explicitamente com a flag de novidade/lançamento
    const footwearNewArrivals = activeProducts.filter((p) => 
      isFootwearProduct(p) && (p.newArrival === true || (p as any).novo === true)
    );

    // 2. Outros calçados ativos em estoque (para compor a vitrine caso faltem para 5)
    const otherFootwear = activeProducts.filter((p) => 
      isFootwearProduct(p) && !(p.newArrival === true || (p as any).novo === true)
    );

    // 3. Outros itens não-calçados marcados como novidade (fallback)
    const nonFootwearNewArrivals = activeProducts.filter((p) => 
      !isFootwearProduct(p) && (p.newArrival === true || (p as any).novo === true)
    );

    // Garante que calçados sempre tenham precedência máxima nos 5 primeiros slots da vitrine de novidades
    const ordered = [...footwearNewArrivals, ...otherFootwear, ...nonFootwearNewArrivals];
    return ordered.slice(0, 10);
  }, [products, isFootwearProduct]);

  // Produtos exibidos na Seção 'Coleção Calçados' (Exclui estritamente Confecções, Bolsas, Acessórios, Malas e Itens de Viagem)
  const calcadosProducts = useMemo(() => {
    return products.filter((prod) => {
      const isAvailable = (prod.stock !== undefined ? prod.stock > 0 : (prod.saldo_loja ?? 0) > 0);
      if (!prod.visible || !isAvailable || !hasProductValidPhoto(prod)) return false;
      return isFootwearProduct(prod);
    });
  }, [products, isFootwearProduct]);

  // Produtos exibidos na Seção 'Confecções' (Strict Match Confecções / Vestuário com Foto Real)
  const confeccoesProducts = useMemo(() => {
    return products.filter((prod) => {
      const isAvailable = (prod.stock !== undefined ? prod.stock > 0 : (prod.saldo_loja ?? 0) > 0);
      const catInfo = extractClassificacaoCategoria(prod);
      const isUnclassified = catInfo.category === 'Sem Classificação Definida' || !catInfo.isDefined;
      if (!prod.visible || !isAvailable || !hasProductValidPhoto(prod) || isUnclassified) return false;

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
      const catInfo = extractClassificacaoCategoria(prod);
      const isUnclassified = catInfo.category === 'Sem Classificação Definida' || !catInfo.isDefined;
      if (!prod.visible || !isAvailable || !hasProductValidPhoto(prod) || isUnclassified) return false;

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
      className="w-full max-w-7xl mx-auto px-2.5 min-[390px]:px-3 sm:px-6 lg:px-8 py-5 min-[390px]:py-6 sm:py-8 space-y-10 sm:space-y-16 overflow-hidden"
    >
      {/* RESULTADOS DA BUSCA INTELIGENTE (QUANDO HOUVER TERMO DE PESQUISA DIGITADO) */}
      {searchQuery && searchQuery.trim() ? (
        <div className="space-y-6 pt-2 w-full">
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${
            isOutubroRosa ? 'border-pink-900/15 dark:border-pink-500/20' : 'border-blue-900/10 dark:border-white/10'
          }`}>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  isOutubroRosa
                    ? 'bg-pink-100 text-[#9D174D] dark:bg-pink-950/70 dark:text-pink-300 border border-pink-300/40'
                    : 'bg-[#006EDB]/10 text-[#006EDB] dark:bg-amber-400/10 dark:text-amber-300 border border-[#006EDB]/20'
                }`}>
                  <Search className="w-3 h-3 stroke-[2.5]" />
                  <span>Busca Inteligente</span>
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {matchingCatalog.length} {matchingCatalog.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
                </span>
              </div>
              <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-[#003B73]'}`}>
                Resultados para <span className={isOutubroRosa ? 'text-[#EC4899] dark:text-pink-400' : 'text-[#006EDB] dark:text-amber-400'}>"{searchQuery.trim()}"</span>
              </h2>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              {/* Seletor de Ordenação */}
              <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent focus:outline-none text-slate-700 dark:text-slate-200 cursor-pointer text-xs"
                >
                  <option value="relevant">Mais Relevantes</option>
                  <option value="price-asc">Menor Preço</option>
                  <option value="price-desc">Maior Preço</option>
                  <option value="launches">Lançamentos</option>
                </select>
              </div>

              {/* Botão de Limpar Busca */}
              <button
                type="button"
                onClick={() => setSearchQuery?.('')}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
                title="Limpar pesquisa"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>
            </div>
          </div>

          {/* Grid Dinâmica com Todos os Produtos Encontrados */}
          <StorefrontProductGrid
            products={sortedCatalog}
            theme={theme}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            onViewDetails={handleVerDetalhes}
            onResetFilters={() => setSearchQuery?.('')}
          />
        </div>
      ) : (
        <>
          {/* BARRA DE VANTAGENS & CONFIANÇA (POSICIONADA NO TOPO, LOGO ABAIXO DO HERO BANNER) */}
          <div className={`p-2.5 min-[390px]:p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border transition-all w-full ${
            isDark 
              ? isOutubroRosa
                ? 'bg-[#1F0314]/90 border-pink-500/20 text-slate-200 shadow-xl shadow-pink-950/20'
                : 'bg-[#0E1627]/90 border-blue-900/30 text-slate-200 shadow-xl' 
              : isOutubroRosa
                ? 'bg-white border-pink-900/10 shadow-sm text-[#003B73]'
                : 'bg-white border-blue-900/10 shadow-sm text-[#003B73]'
          }`}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 min-[390px]:gap-2.5 sm:gap-6">
              
              {/* Vantagem 1: Entrega Rápida */}
              <div className="flex items-center space-x-2 min-[390px]:space-x-2.5 sm:space-x-3.5 p-1 min-[390px]:p-1.5 sm:p-2 rounded-xl sm:rounded-2xl group transition-transform hover:scale-[1.02]">
                <div className={`p-2 min-[390px]:p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shrink-0 transition-all ${
                  isDark 
                    ? isOutubroRosa
                      ? 'bg-pink-500/15 text-pink-300 border border-pink-500/25 group-hover:bg-[#EC4899] group-hover:text-white group-hover:border-[#EC4899]'
                      : 'bg-blue-500/15 text-blue-400 border border-blue-500/20' 
                    : isOutubroRosa
                      ? 'bg-[#FFF0F5] text-[#EC4899] border border-pink-200/70 group-hover:bg-[#EC4899] group-hover:text-white group-hover:border-[#EC4899]'
                      : 'bg-[#EAF5FF] text-[#006EDB] border border-blue-100'
                }`}>
                  <Truck className="h-4.5 w-4.5 sm:h-5 sm:w-5 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className={`text-[11px] min-[390px]:text-xs sm:text-sm font-extrabold tracking-tight transition-colors ${
                    isDark 
                      ? isOutubroRosa ? 'text-white group-hover:text-pink-300' : 'text-white'
                      : isOutubroRosa ? 'text-[#003B73] group-hover:text-[#BE185D]' : 'text-[#003B73]'
                  }`}>
                    Entrega Rápida
                  </h4>
                  <p className={`text-[9px] min-[390px]:text-[10px] sm:text-[11px] font-medium leading-tight ${isDark ? 'text-slate-400' : 'text-[#52708F]'}`}>
                    Para todo o Brasil ou retirada em Caxias
                  </p>
                </div>
              </div>

              {/* Vantagem 2: Parcelamento Facilitado */}
              <div className="flex items-center space-x-2 min-[390px]:space-x-2.5 sm:space-x-3.5 p-1 min-[390px]:p-1.5 sm:p-2 rounded-xl sm:rounded-2xl group transition-transform hover:scale-[1.02]">
                <div className={`p-2 min-[390px]:p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shrink-0 transition-all ${
                  isDark 
                    ? isOutubroRosa
                      ? 'bg-pink-500/15 text-pink-300 border border-pink-500/25 group-hover:bg-[#EC4899] group-hover:text-white group-hover:border-[#EC4899]'
                      : 'bg-blue-500/15 text-blue-400 border border-blue-500/20' 
                    : isOutubroRosa
                      ? 'bg-[#FFF0F5] text-[#EC4899] border border-pink-200/70 group-hover:bg-[#EC4899] group-hover:text-white group-hover:border-[#EC4899]'
                      : 'bg-[#EAF5FF] text-[#006EDB] border border-blue-100'
                }`}>
                  <CreditCard className="h-4.5 w-4.5 sm:h-5 sm:w-5 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className={`text-[11px] min-[390px]:text-xs sm:text-sm font-extrabold tracking-tight transition-colors ${
                    isDark 
                      ? isOutubroRosa ? 'text-white group-hover:text-pink-300' : 'text-white'
                      : isOutubroRosa ? 'text-[#003B73] group-hover:text-[#BE185D]' : 'text-[#003B73]'
                  }`}>
                    Parcele em até 10x
                  </h4>
                  <p className={`text-[9px] min-[390px]:text-[10px] sm:text-[11px] font-medium leading-tight ${isDark ? 'text-slate-400' : 'text-[#52708F]'}`}>
                    No cartão ou desconto exclusivo no Pix
                  </p>
                </div>
              </div>

              {/* Vantagem 3: Troca Simplificada */}
              <div className="flex items-center space-x-2 min-[390px]:space-x-2.5 sm:space-x-3.5 p-1 min-[390px]:p-1.5 sm:p-2 rounded-xl sm:rounded-2xl group transition-transform hover:scale-[1.02]">
                <div className={`p-2 min-[390px]:p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shrink-0 transition-all ${
                  isDark 
                    ? isOutubroRosa
                      ? 'bg-pink-500/15 text-pink-300 border border-pink-500/25 group-hover:bg-[#EC4899] group-hover:text-white group-hover:border-[#EC4899]'
                      : 'bg-blue-500/15 text-blue-400 border border-blue-500/20' 
                    : isOutubroRosa
                      ? 'bg-[#FFF0F5] text-[#EC4899] border border-pink-200/70 group-hover:bg-[#EC4899] group-hover:text-white group-hover:border-[#EC4899]'
                      : 'bg-[#EAF5FF] text-[#006EDB] border border-blue-100'
                }`}>
                  <RefreshCw className="h-4.5 w-4.5 sm:h-5 sm:w-5 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className={`text-[11px] min-[390px]:text-xs sm:text-sm font-extrabold tracking-tight transition-colors ${
                    isDark 
                      ? isOutubroRosa ? 'text-white group-hover:text-pink-300' : 'text-white'
                      : isOutubroRosa ? 'text-[#003B73] group-hover:text-[#BE185D]' : 'text-[#003B73]'
                  }`}>
                    Troca Simplificada
                  </h4>
                  <p className={`text-[9px] min-[390px]:text-[10px] sm:text-[11px] font-medium leading-tight ${isDark ? 'text-slate-400' : 'text-[#52708F]'}`}>
                    Até 7 dias garantidos sem complicações
                  </p>
                </div>
              </div>

              {/* Vantagem 4: Atendimento Humanizado */}
              <div className="flex items-center space-x-2 min-[390px]:space-x-2.5 sm:space-x-3.5 p-1 min-[390px]:p-1.5 sm:p-2 rounded-xl sm:rounded-2xl group transition-transform hover:scale-[1.02]">
                <div className={`p-2 min-[390px]:p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shrink-0 transition-all ${
                  isDark 
                    ? isOutubroRosa
                      ? 'bg-pink-500/15 text-pink-300 border border-pink-500/25 group-hover:bg-[#EC4899] group-hover:text-white group-hover:border-[#EC4899]'
                      : 'bg-blue-500/15 text-blue-400 border border-blue-500/20' 
                    : isOutubroRosa
                      ? 'bg-[#FFF0F5] text-[#EC4899] border border-pink-200/70 group-hover:bg-[#EC4899] group-hover:text-white group-hover:border-[#EC4899]'
                      : 'bg-[#EAF5FF] text-[#006EDB] border border-blue-100'
                }`}>
                  <Headphones className="h-4.5 w-4.5 sm:h-5 sm:w-5 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className={`text-[11px] min-[390px]:text-xs sm:text-sm font-extrabold tracking-tight transition-colors ${
                    isDark 
                      ? isOutubroRosa ? 'text-white group-hover:text-pink-300' : 'text-white'
                      : isOutubroRosa ? 'text-[#003B73] group-hover:text-[#BE185D]' : 'text-[#003B73]'
                  }`}>
                    Atendimento Humano
                  </h4>
                  <p className={`text-[9px] min-[390px]:text-[10px] sm:text-[11px] font-medium leading-tight ${isDark ? 'text-slate-400' : 'text-[#52708F]'}`}>
                    Tire suas dúvidas direto no WhatsApp
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* 1. SEÇÃO COMPRE POR CATEGORIA (CARROSSEL DESLIZANTE DE SUBCATEGORIAS EM ESTOQUE) */}
          <SubcategoryCarousel
            subcategories={activeSubcategoriesInStock}
            theme={theme}
            onSelectSubcategory={handleSelectSubcategoryItem}
          />


      {/* 1.5 SEÇÃO SALDÃO DE CALÇADOS (ESTOQUE BAIXO COM DESCONTO EM %) */}
      {saldaoConfig?.enabled && saldaoProducts.length > 0 && (
        <div className="space-y-6">
          <SaldaoBanner 
            discountPercent={saldaoConfig.discountPercent}
            bannerText={saldaoConfig.bannerText}
            onViewAll={() => {
              if (setSelectedSubcategory) setSelectedSubcategory('TODAS');
              if (setSelectedCategory) setSelectedCategory('SALDÃO');
              if (setSelectedMenuTab) setSelectedMenuTab('saldão');
              if (setCurrentView) setCurrentView('category-page');
            }}
          />

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
          <div className={`flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b pb-3 ${
            isOutubroRosa ? 'border-pink-900/15 dark:border-pink-500/20' : 'border-blue-900/10 dark:border-white/10'
          }`}>
            <div>
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
              className={`text-xs font-extrabold ${
                isOutubroRosa
                  ? 'text-[#BE185D] hover:text-[#9D174D] dark:text-pink-300 dark:hover:text-white'
                  : 'text-[#006EDB] hover:text-[#00509E] dark:text-amber-300 dark:hover:text-white'
              } transition-colors cursor-pointer shrink-0`}
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

      {/* 3. BANNERS DE DESTAQUE PROMOCIONAIS (ESTILO RETAIL DE ALTO IMPACTO DINÂMICOS DO CMS) */}
      {(() => {
        const promoCards = (featuredPromoCards && featuredPromoCards.length === 3 ? featuredPromoCards : DEFAULT_FEATURED_PROMO_CARDS);
        const card1 = promoCards[0] || DEFAULT_FEATURED_PROMO_CARDS[0];
        const card2 = promoCards[1] || DEFAULT_FEATURED_PROMO_CARDS[1];
        const card3 = promoCards[2] || DEFAULT_FEATURED_PROMO_CARDS[2];

        return (
          <div className="space-y-2.5 sm:space-y-3 w-full">
            <div
              ref={promoCarouselRef}
              onScroll={handlePromoScroll}
              className="flex md:grid md:grid-cols-3 overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none no-scrollbar gap-3.5 sm:gap-4 lg:gap-5 w-full pb-2 md:pb-0 scroll-smooth -mx-2.5 min-[390px]:-mx-3 sm:mx-0 px-2.5 min-[390px]:px-3 sm:px-0"
            >
              
              {/* CARD 1: CALÇADOS & LANÇAMENTOS (RETAIL IMPACT RED / PINK) */}
              <div
                onClick={() => handlePromoCardClick(card1.buttonLink)}
                className={`group relative rounded-2xl lg:rounded-3xl overflow-hidden flex flex-row items-stretch w-[86vw] min-[390px]:w-[84vw] sm:w-[380px] md:w-auto shrink-0 snap-center md:snap-none md:shrink min-h-[175px] min-[390px]:min-h-[185px] sm:min-h-[195px] lg:min-h-[205px] border cursor-pointer select-none transition-all duration-300 hover:shadow-2xl hover:-translate-y-0.5 ${
                  !card1.active ? 'hidden' : ''
                } ${
                  isDark
                    ? isOutubroRosa
                      ? 'border-pink-500/30 shadow-lg shadow-pink-950/40'
                      : 'border-white/10 shadow-lg shadow-black/40'
                    : isOutubroRosa
                      ? 'border-pink-300/40 shadow-md shadow-pink-900/10'
                      : 'border-slate-200/60 shadow-md shadow-slate-900/5'
                }`}
              >
                {/* Lado Esquerdo: Painel Gráfico Promocional */}
                <div className={`w-[56%] min-[390px]:w-[58%] sm:w-[56%] p-3 min-[390px]:p-3.5 sm:p-4.5 flex flex-col justify-between relative z-10 shrink-0 ${
                  isOutubroRosa
                    ? 'bg-gradient-to-r from-[#BE185D] via-[#DB2777] to-[#BE185D]'
                    : 'bg-gradient-to-r from-[#E50914] via-[#DC2626] to-[#B91C1C]'
                }`}>
                  <div className="space-y-0.5">
                    <span className="text-[9.5px] min-[390px]:text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-white/95 block leading-tight">
                      {card1.badge}
                    </span>
                    <h3 className="text-xl min-[390px]:text-2xl sm:text-2xl lg:text-[26px] font-black text-white uppercase tracking-tight leading-[0.95] drop-shadow-xs">
                      {card1.title}
                    </h3>
                    {(card1.discountHighlight || card1.highlightCondition) && (
                      <div className="pt-0.5">
                        {card1.highlightCondition && (
                          <span className="text-[8px] min-[390px]:text-[9px] font-extrabold text-white uppercase tracking-wide block leading-none">
                            {card1.highlightCondition}
                          </span>
                        )}
                        {card1.discountHighlight && (
                          <span className="text-xl min-[390px]:text-2xl sm:text-2xl lg:text-[28px] font-black text-[#FFE600] tracking-tight leading-none drop-shadow-xs block">
                            {card1.discountHighlight}
                          </span>
                        )}
                      </div>
                    )}
                    {card1.subtitle && (
                      <p className="text-[8px] min-[390px]:text-[8.5px] font-medium text-slate-200 leading-snug pt-0.5">
                        {card1.subtitle}
                      </p>
                    )}
                  </div>

                  <div className="pt-1.5 min-[390px]:pt-2">
                    <span className={`inline-flex items-center space-x-1.5 px-3 min-[390px]:px-3.5 py-1.5 rounded-full bg-white font-black text-[9.5px] min-[390px]:text-[10.5px] uppercase tracking-wider shadow-md group-hover:scale-105 active:scale-95 transition-transform duration-200 ${
                      isOutubroRosa ? 'text-[#BE185D]' : 'text-[#DC2626]'
                    }`}>
                      <span>{card1.buttonText || 'VER OFERTAS'}</span>
                      <ShoppingCart className="w-3.5 h-3.5 stroke-[2.5]" />
                    </span>
                    {card1.footnote && (
                      <p className="text-[6.5px] min-[390px]:text-[7px] font-semibold text-white/70 uppercase tracking-tighter mt-1 leading-none">
                        {card1.footnote}
                      </p>
                    )}
                  </div>
                </div>

                {/* Lado Direito: Foto do Produto */}
                <div className="w-[44%] min-[390px]:w-[42%] sm:w-[44%] relative overflow-hidden bg-slate-100 dark:bg-slate-900">
                  <img
                    src={card1.image}
                    alt={card1.title}
                    className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700 ease-out"
                  />
                </div>
              </div>

              {/* CARD 2: MEU CREDIÁRIO (INSPIRADO NA REFERÊNCIA EVIDÊNCIA CALÇADOS) */}
              <div
                onClick={() => handlePromoCardClick(card2.buttonLink)}
                className={`group relative rounded-2xl lg:rounded-3xl overflow-hidden flex flex-row items-stretch w-[86vw] min-[390px]:w-[84vw] sm:w-[380px] md:w-auto shrink-0 snap-center md:snap-none md:shrink min-h-[175px] min-[390px]:min-h-[185px] sm:min-h-[195px] lg:min-h-[205px] border cursor-pointer select-none transition-all duration-300 hover:shadow-2xl hover:-translate-y-0.5 ${
                  !card2.active ? 'hidden' : ''
                } ${
                  isDark
                    ? 'border-pink-500/30 shadow-lg shadow-pink-950/40'
                    : 'border-pink-900/15 shadow-md shadow-pink-950/10'
                }`}
              >
                {/* Selo Circular Flutuante Superior: Ícone de Tênis + 100% ONLINE (Idêntico à Nova Referência) */}
                <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 z-20 flex flex-col items-center justify-center w-11 h-11 min-[390px]:w-12 min-[390px]:h-12 rounded-full border-2 border-white/90 bg-[#4A0429]/95 backdrop-blur-xs text-white shadow-xl pointer-events-none">
                  <div className="flex space-x-0.5 -mt-0.5 mb-0.5">
                    <span className="w-0.5 h-1 bg-pink-400 rotate-[-25deg] inline-block" />
                    <span className="w-0.5 h-1.5 bg-pink-300 inline-block" />
                    <span className="w-0.5 h-1 bg-pink-400 rotate-[25deg] inline-block" />
                  </div>
                  <Footprints className="w-2.5 h-2.5 text-pink-300 mb-0.5" />
                  <span className="text-[9.5px] min-[390px]:text-[10px] font-black leading-none tracking-tight">100%</span>
                  <span className="text-[5px] min-[390px]:text-[5.5px] font-black uppercase tracking-tighter leading-none text-pink-200">
                    {card2.badgeTopRight || 'ONLINE'}
                  </span>
                </div>

                {/* Lado Esquerdo: Painel Gráfico Promocional (Vinho / Pink Gradient Fiel à Inspiração) */}
                <div className="w-[58%] min-[390px]:w-[60%] sm:w-[58%] p-3 min-[390px]:p-3.5 sm:p-4.5 flex flex-col justify-between relative z-10 shrink-0 bg-gradient-to-br from-[#450529] via-[#5C0837] to-[#3D0324]">
                  <div className="absolute bottom-0 left-0 w-24 h-12 bg-pink-500/20 rounded-tr-full blur-xl pointer-events-none" />

                  <div className="space-y-1 relative z-10">
                    {/* Eyebrow com Linha Guia */}
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[8.5px] min-[390px]:text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider text-pink-200/90 leading-none">
                        {card2.badge}
                      </span>
                      <span className="w-5 sm:w-8 h-[1.5px] bg-pink-400/50 inline-block rounded-full" />
                    </div>

                    {/* Título: MEU + Ícone Card Iluminado + CREDIÁRIO */}
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xl min-[390px]:text-2xl font-black text-white leading-none tracking-tight drop-shadow-xs">
                          MEU
                        </span>
                        <div className="p-1 rounded-md bg-pink-500/25 border border-pink-400/40 text-pink-300 shadow-xs">
                          <CreditCard className="w-3.5 h-3.5 stroke-[2.5]" />
                        </div>
                      </div>
                      <h3 className="text-xl min-[390px]:text-2xl sm:text-2xl lg:text-[25px] font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#FF6EA7] via-[#F472B6] to-[#FDA4AF] uppercase leading-none drop-shadow-xs">
                        {card2.title.replace(/^MEU\s*/i, '') || 'CREDIÁRIO'}
                      </h3>
                    </div>

                    {/* Subtítulo com Destaque em Baixa Instantânea */}
                    <p className="text-[8px] min-[390px]:text-[8.5px] sm:text-[9.5px] font-medium text-slate-200 leading-snug pt-0.5">
                      {card2.subtitle || 'Consulte seus calçados, faturas e pague parcelas no Pix com baixa instantânea.'}
                    </p>

                    {/* 3 Pilares de Benefícios Conforme a Nova Imagem */}
                    <div className="grid grid-cols-3 gap-1 py-1 sm:py-1.5 border-y border-pink-500/20 my-1 text-center bg-black/10 rounded-lg px-0.5">
                      <div className="space-y-0.5">
                        <div className="w-4 h-4 rounded-full bg-pink-500/20 border border-pink-400/30 flex items-center justify-center mx-auto">
                          <Footprints className="w-2.5 h-2.5 text-pink-300" />
                        </div>
                        <p className="text-[7px] min-[390px]:text-[7.5px] font-bold text-white leading-tight">Calçados</p>
                        <p className="text-[5.5px] min-[390px]:text-[6px] text-pink-200/70 leading-none">Rápido e fácil</p>
                      </div>
                      <div className="space-y-0.5 border-x border-pink-500/20">
                        <div className="w-4 h-4 rounded-full bg-pink-500/20 border border-pink-400/30 flex items-center justify-center mx-auto">
                          <QrCode className="w-2.5 h-2.5 text-pink-300" />
                        </div>
                        <p className="text-[7px] min-[390px]:text-[7.5px] font-bold text-white leading-tight">Via Pix</p>
                        <p className="text-[5.5px] min-[390px]:text-[6px] text-pink-200/70 leading-none">Baixa na hora</p>
                      </div>
                      <div className="space-y-0.5">
                        <div className="w-4 h-4 rounded-full bg-pink-500/20 border border-pink-400/30 flex items-center justify-center mx-auto">
                          <ShieldCheck className="w-2.5 h-2.5 text-pink-300" />
                        </div>
                        <p className="text-[7px] min-[390px]:text-[7.5px] font-bold text-white leading-tight">Seguro</p>
                        <p className="text-[5.5px] min-[390px]:text-[6px] text-pink-200/70 leading-none">100% online</p>
                      </div>
                    </div>
                  </div>

                  {/* Botão Pill Branco */}
                  <div className="pt-1 relative z-10">
                    <span className="inline-flex items-center space-x-1.5 min-[390px]:space-x-2 px-3 min-[390px]:px-4 py-1.5 rounded-full bg-white text-[#4A0429] font-black text-[9px] min-[390px]:text-[10px] sm:text-[10.5px] uppercase tracking-wider shadow-md group-hover:scale-105 active:scale-95 transition-transform duration-200">
                      <span>{card2.buttonText || 'ACESSAR CREDIÁRIO'}</span>
                      <span className="w-3.5 h-3.5 min-[390px]:w-4 min-[390px]:h-4 rounded-full bg-[#4A0429] text-white flex items-center justify-center">
                        <ArrowRight className="w-2 min-[390px]:w-2.5 h-2 min-[390px]:h-2.5 stroke-[3]" />
                      </span>
                    </span>
                    {card2.footnote && (
                      <p className="text-[6px] min-[390px]:text-[6.5px] font-semibold text-white/70 uppercase tracking-tighter mt-1 leading-none">
                        {card2.footnote}
                      </p>
                    )}
                  </div>
                </div>

                {/* Lado Direito: Foto do Mockup de Smartphone + Caixa Evidência Calçados */}
                <div className="w-[42%] min-[390px]:w-[40%] sm:w-[42%] relative overflow-hidden bg-slate-900">
                  <img
                    src={card2.image}
                    alt={card2.title}
                    className="w-full h-full object-cover object-right group-hover:scale-108 transition-transform duration-700 ease-out"
                  />
                </div>
              </div>

              {/* CARD 3: BOLSAS & ACESSÓRIOS (RETAIL IMPACT RED / PINK) */}
              <div
                onClick={() => handlePromoCardClick(card3.buttonLink)}
                className={`group relative rounded-2xl lg:rounded-3xl overflow-hidden flex flex-row items-stretch w-[86vw] min-[390px]:w-[84vw] sm:w-[380px] md:w-auto shrink-0 snap-center md:snap-none md:shrink min-h-[175px] min-[390px]:min-h-[185px] sm:min-h-[195px] lg:min-h-[205px] border cursor-pointer select-none transition-all duration-300 hover:shadow-2xl hover:-translate-y-0.5 ${
                  !card3.active ? 'hidden' : ''
                } ${
                  isDark
                    ? isOutubroRosa
                      ? 'border-pink-500/30 shadow-lg shadow-pink-950/40'
                      : 'border-white/10 shadow-lg shadow-black/40'
                    : isOutubroRosa
                      ? 'border-pink-300/40 shadow-md shadow-pink-900/10'
                      : 'border-slate-200/60 shadow-md shadow-slate-900/5'
                }`}
              >
                {/* Lado Esquerdo: Painel Gráfico Promocional */}
                <div className={`w-[56%] min-[390px]:w-[58%] sm:w-[56%] p-3 min-[390px]:p-3.5 sm:p-4.5 flex flex-col justify-between relative z-10 shrink-0 ${
                  isOutubroRosa
                    ? 'bg-gradient-to-r from-[#BE185D] via-[#DB2777] to-[#BE185D]'
                    : 'bg-gradient-to-r from-[#E50914] via-[#DC2626] to-[#B91C1C]'
                }`}>
                  <div className="space-y-0.5">
                    <span className="text-[9.5px] min-[390px]:text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-white/95 block leading-tight">
                      {card3.badge}
                    </span>
                    <h3 className="text-lg min-[390px]:text-xl sm:text-xl lg:text-[22px] font-black text-white uppercase tracking-tight leading-[0.95] drop-shadow-xs">
                      {card3.title}
                    </h3>
                    {(card3.discountHighlight || card3.highlightCondition) && (
                      <div className="pt-0.5">
                        {card3.highlightCondition && (
                          <span className="text-[8px] min-[390px]:text-[9px] font-extrabold text-white uppercase tracking-wide block leading-none">
                            {card3.highlightCondition}
                          </span>
                        )}
                        {card3.discountHighlight && (
                          <span className="text-xl min-[390px]:text-2xl sm:text-2xl lg:text-[28px] font-black text-[#FFE600] tracking-tight leading-none drop-shadow-xs block">
                            {card3.discountHighlight}
                          </span>
                        )}
                      </div>
                    )}
                    {card3.subtitle && (
                      <p className="text-[8px] min-[390px]:text-[8.5px] font-medium text-slate-200 leading-snug pt-0.5">
                        {card3.subtitle}
                      </p>
                    )}
                  </div>

                  <div className="pt-1.5 min-[390px]:pt-2">
                    <span className={`inline-flex items-center space-x-1.5 px-3 min-[390px]:px-3.5 py-1.5 rounded-full bg-white font-black text-[9.5px] min-[390px]:text-[10.5px] uppercase tracking-wider shadow-md group-hover:scale-105 active:scale-95 transition-transform duration-200 ${
                      isOutubroRosa ? 'text-[#BE185D]' : 'text-[#DC2626]'
                    }`}>
                      <span>{card3.buttonText || 'VER OFERTAS'}</span>
                      <ShoppingCart className="w-3.5 h-3.5 stroke-[2.5]" />
                    </span>
                    {card3.footnote && (
                      <p className="text-[6.5px] min-[390px]:text-[7px] font-semibold text-white/70 uppercase tracking-tighter mt-1 leading-none">
                        {card3.footnote}
                      </p>
                    )}
                  </div>
                </div>

                {/* Lado Direito: Foto do Produto */}
                <div className="w-[44%] min-[390px]:w-[42%] sm:w-[44%] relative overflow-hidden bg-slate-100 dark:bg-slate-900">
                  <img
                    src={card3.image}
                    alt={card3.title}
                    className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700 ease-out"
                  />
                </div>
              </div>

            </div>

            {/* Indicador de Paginação do Carrossel em Dispositivos Móveis */}
            <div className="flex items-center justify-center space-x-1.5 pt-0.5 md:hidden">
              {[0, 1, 2].map((idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => scrollToPromoCard(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    activePromoIndex === idx
                      ? isOutubroRosa
                        ? 'w-6 bg-[#EC4899]'
                        : 'w-6 bg-[#006EDB] dark:bg-amber-400'
                      : 'w-1.5 bg-slate-300 dark:bg-slate-700'
                  }`}
                  aria-label={`Ir para card promocional ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        );
      })()}

      {/* 4. SEÇÃO COLEÇÃO CALÇADOS */}
      {calcadosProducts.length > 0 && (
        <div className="space-y-6">
          <div className={`flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b pb-3 ${
            isOutubroRosa ? 'border-pink-900/15 dark:border-pink-500/20' : 'border-blue-900/10 dark:border-white/10'
          }`}>
            <div>
              <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? "text-white" : "text-[#003B73]"}`}>
                Coleção Calçados
              </h2>
              <p className={`text-xs sm:text-sm font-medium mt-0.5 ${isDark ? "text-slate-400" : "text-[#52708F]"}`}>
                Modelos exclusivos com conforto anatômico e acabamento impecável.
              </p>
            </div>
            <button 
              onClick={() => handleSelectCategory('CALÇADOS')}
              className={`text-xs font-extrabold ${
                isOutubroRosa
                  ? 'text-[#BE185D] hover:text-[#9D174D] dark:text-pink-300 dark:hover:text-white'
                  : 'text-[#006EDB] hover:text-[#00509E] dark:text-amber-300 dark:hover:text-white'
              } transition-colors cursor-pointer shrink-0`}
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

      {/* 5. SEÇÃO CONFECÇÕES & MODA */}
      {confeccoesProducts.length > 0 && (
        <div className="space-y-6">
          <div className={`flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b pb-3 ${
            isOutubroRosa ? 'border-pink-900/15 dark:border-pink-500/20' : 'border-blue-900/10 dark:border-white/10'
          }`}>
            <div>
              <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? "text-white" : "text-[#003B73]"}`}>
                Confecções & Moda
              </h2>
              <p className={`text-xs sm:text-sm font-medium mt-0.5 ${isDark ? "text-slate-400" : "text-[#52708F]"}`}>
                Peças exclusivas e vestuário contemporâneo para renovar o seu visual.
              </p>
            </div>
            <button 
              onClick={() => handleSelectCategory('CONFECÇÕES')}
              className={`text-xs font-extrabold ${
                isOutubroRosa
                  ? 'text-[#BE185D] hover:text-[#9D174D] dark:text-pink-300 dark:hover:text-white'
                  : 'text-[#006EDB] hover:text-[#00509E] dark:text-amber-300 dark:hover:text-white'
              } transition-colors cursor-pointer shrink-0`}
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
          <div className={`flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b pb-3 ${
            isOutubroRosa ? 'border-pink-900/15 dark:border-pink-500/20' : 'border-blue-900/10 dark:border-white/10'
          }`}>
            <div>
              <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? "text-white" : "text-[#003B73]"}`}>
                Bolsas & Acessórios
              </h2>
              <p className={`text-xs sm:text-sm font-medium mt-0.5 ${isDark ? "text-slate-400" : "text-[#52708F]"}`}>
                Bolsas, cintos, carteiras e utilitários elegantes para finalizar seu look.
              </p>
            </div>
            <button 
              onClick={() => handleSelectCategory('ACESSÓRIOS')}
              className={`text-xs font-extrabold ${
                isOutubroRosa
                  ? 'text-[#BE185D] hover:text-[#9D174D] dark:text-pink-300 dark:hover:text-white'
                  : 'text-[#006EDB] hover:text-[#00509E] dark:text-amber-300 dark:hover:text-white'
              } transition-colors cursor-pointer shrink-0`}
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
      </>
      )}

    </section>
  );
};
