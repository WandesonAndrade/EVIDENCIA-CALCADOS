import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { Product } from "../types";
import { Eye, Heart, ArrowRight, ArrowUpDown, Truck, CreditCard, RefreshCw, ShoppingBag, Sparkles, ChevronLeft, ChevronRight, Tag, Search, X, Headphones } from "lucide-react";
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
  } = useApp();

  const isOutubroRosa = storeTheme === 'outubro-rosa';
  const [sortBy, setSortBy] = useState<"relevant" | "price-asc" | "price-desc" | "launches">("relevant");
  const catalogSectionRef = useRef<HTMLElement | null>(null);
  const isDark = theme === "dark";

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
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-16"
    >
      {/* RESULTADOS DA BUSCA INTELIGENTE (QUANDO HOUVER TERMO DE PESQUISA DIGITADO) */}
      {searchQuery && searchQuery.trim() ? (
        <div className="space-y-6 pt-2">
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
          <div className={`p-4 sm:p-6 rounded-3xl border transition-all ${
            isDark 
              ? isOutubroRosa
                ? 'bg-[#1F0314]/90 border-pink-500/20 text-slate-200 shadow-xl shadow-pink-950/20'
                : 'bg-[#0E1627]/90 border-blue-900/30 text-slate-200 shadow-xl' 
              : isOutubroRosa
                ? 'bg-white border-pink-900/10 shadow-sm text-[#003B73]'
                : 'bg-white border-blue-900/10 shadow-sm text-[#003B73]'
          }`}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              
              {/* Vantagem 1: Entrega Rápida */}
              <div className="flex items-center space-x-3.5 p-2 rounded-2xl group transition-transform hover:scale-[1.02]">
                <div className={`p-3 rounded-2xl shrink-0 transition-all ${
                  isDark 
                    ? isOutubroRosa
                      ? 'bg-pink-500/15 text-pink-300 border border-pink-500/25 group-hover:bg-[#EC4899] group-hover:text-white group-hover:border-[#EC4899]'
                      : 'bg-blue-500/15 text-blue-400 border border-blue-500/20' 
                    : isOutubroRosa
                      ? 'bg-[#FFF0F5] text-[#EC4899] border border-pink-200/70 group-hover:bg-[#EC4899] group-hover:text-white group-hover:border-[#EC4899]'
                      : 'bg-[#EAF5FF] text-[#006EDB] border border-blue-100'
                }`}>
                  <Truck className="h-5 w-5 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className={`text-xs sm:text-sm font-extrabold tracking-tight transition-colors ${
                    isDark 
                      ? isOutubroRosa ? 'text-white group-hover:text-pink-300' : 'text-white'
                      : isOutubroRosa ? 'text-[#003B73] group-hover:text-[#BE185D]' : 'text-[#003B73]'
                  }`}>
                    Entrega Rápida
                  </h4>
                  <p className={`text-[11px] font-medium leading-tight ${isDark ? 'text-slate-400' : 'text-[#52708F]'}`}>
                    Para todo o Brasil ou retirada em Caxias
                  </p>
                </div>
              </div>

              {/* Vantagem 2: Parcelamento Facilitado */}
              <div className="flex items-center space-x-3.5 p-2 rounded-2xl group transition-transform hover:scale-[1.02]">
                <div className={`p-3 rounded-2xl shrink-0 transition-all ${
                  isDark 
                    ? isOutubroRosa
                      ? 'bg-pink-500/15 text-pink-300 border border-pink-500/25 group-hover:bg-[#EC4899] group-hover:text-white group-hover:border-[#EC4899]'
                      : 'bg-blue-500/15 text-blue-400 border border-blue-500/20' 
                    : isOutubroRosa
                      ? 'bg-[#FFF0F5] text-[#EC4899] border border-pink-200/70 group-hover:bg-[#EC4899] group-hover:text-white group-hover:border-[#EC4899]'
                      : 'bg-[#EAF5FF] text-[#006EDB] border border-blue-100'
                }`}>
                  <CreditCard className="h-5 w-5 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className={`text-xs sm:text-sm font-extrabold tracking-tight transition-colors ${
                    isDark 
                      ? isOutubroRosa ? 'text-white group-hover:text-pink-300' : 'text-white'
                      : isOutubroRosa ? 'text-[#003B73] group-hover:text-[#BE185D]' : 'text-[#003B73]'
                  }`}>
                    Parcele em até 10x
                  </h4>
                  <p className={`text-[11px] font-medium leading-tight ${isDark ? 'text-slate-400' : 'text-[#52708F]'}`}>
                    No cartão ou desconto exclusivo no Pix
                  </p>
                </div>
              </div>

              {/* Vantagem 3: Troca Simplificada */}
              <div className="flex items-center space-x-3.5 p-2 rounded-2xl group transition-transform hover:scale-[1.02]">
                <div className={`p-3 rounded-2xl shrink-0 transition-all ${
                  isDark 
                    ? isOutubroRosa
                      ? 'bg-pink-500/15 text-pink-300 border border-pink-500/25 group-hover:bg-[#EC4899] group-hover:text-white group-hover:border-[#EC4899]'
                      : 'bg-blue-500/15 text-blue-400 border border-blue-500/20' 
                    : isOutubroRosa
                      ? 'bg-[#FFF0F5] text-[#EC4899] border border-pink-200/70 group-hover:bg-[#EC4899] group-hover:text-white group-hover:border-[#EC4899]'
                      : 'bg-[#EAF5FF] text-[#006EDB] border border-blue-100'
                }`}>
                  <RefreshCw className="h-5 w-5 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className={`text-xs sm:text-sm font-extrabold tracking-tight transition-colors ${
                    isDark 
                      ? isOutubroRosa ? 'text-white group-hover:text-pink-300' : 'text-white'
                      : isOutubroRosa ? 'text-[#003B73] group-hover:text-[#BE185D]' : 'text-[#003B73]'
                  }`}>
                    Troca Simplificada
                  </h4>
                  <p className={`text-[11px] font-medium leading-tight ${isDark ? 'text-slate-400' : 'text-[#52708F]'}`}>
                    Até 7 dias garantidos sem complicações
                  </p>
                </div>
              </div>

              {/* Vantagem 4: Atendimento Humanizado */}
              <div className="flex items-center space-x-3.5 p-2 rounded-2xl group transition-transform hover:scale-[1.02]">
                <div className={`p-3 rounded-2xl shrink-0 transition-all ${
                  isDark 
                    ? isOutubroRosa
                      ? 'bg-pink-500/15 text-pink-300 border border-pink-500/25 group-hover:bg-[#EC4899] group-hover:text-white group-hover:border-[#EC4899]'
                      : 'bg-blue-500/15 text-blue-400 border border-blue-500/20' 
                    : isOutubroRosa
                      ? 'bg-[#FFF0F5] text-[#EC4899] border border-pink-200/70 group-hover:bg-[#EC4899] group-hover:text-white group-hover:border-[#EC4899]'
                      : 'bg-[#EAF5FF] text-[#006EDB] border border-blue-100'
                }`}>
                  <Headphones className="h-5 w-5 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className={`text-xs sm:text-sm font-extrabold tracking-tight transition-colors ${
                    isDark 
                      ? isOutubroRosa ? 'text-white group-hover:text-pink-300' : 'text-white'
                      : isOutubroRosa ? 'text-[#003B73] group-hover:text-[#BE185D]' : 'text-[#003B73]'
                  }`}>
                    Atendimento Humano
                  </h4>
                  <p className={`text-[11px] font-medium leading-tight ${isDark ? 'text-slate-400' : 'text-[#52708F]'}`}>
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

      {/* 3. BENTO GRID (BANNERS DE DESTAQUE PADRONIZADOS COM A MARCA EVIDÊNCIA) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Banner Esquerdo Grande (Lançamentos / Novidades) */}
        <div 
          onClick={() => handleSelectCategory('NOVIDADES')}
          className={`lg:col-span-6 rounded-3xl p-8 sm:p-10 flex items-center justify-between relative overflow-hidden transition-all duration-500 min-h-[340px] border cursor-pointer group shadow-xl ${
            isDark 
              ? isOutubroRosa
                ? 'bg-gradient-to-br from-[#540832] via-[#750C44] to-[#400627] border-pink-400/30 text-white hover:border-[#EC4899]/50 hover:shadow-2xl hover:shadow-pink-950/80'
                : 'bg-gradient-to-br from-[#111A2E] via-[#0E1627] to-[#0A101D] border-white/10 text-white hover:border-blue-400/40 hover:shadow-2xl hover:shadow-blue-500/10' 
              : isOutubroRosa
                ? 'bg-gradient-to-br from-[#FFFFFF] via-[#FFF5F8] to-[#FCE8F0] border-pink-900/10 text-[#003B73] hover:border-[#EC4899]/50 hover:shadow-2xl hover:shadow-pink-900/15'
                : 'bg-gradient-to-br from-[#FFFFFF] via-[#F8FBFF] to-[#EAF2FC] border-blue-900/10 text-[#003B73] hover:border-[#006EDB]/40 hover:shadow-2xl hover:shadow-blue-900/10'
          }`}
        >
          <div className="space-y-3.5 z-20 w-full sm:w-[58%] pr-2">
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full border shadow-xs transition-all ${
              isOutubroRosa
                ? 'text-[#9D174D] dark:text-pink-300 bg-pink-100 dark:bg-pink-950/70 border-pink-300/50'
                : isDark ? 'text-blue-300 bg-blue-950/60 border-blue-500/30' : 'text-[#003B73] bg-[#EAF4FE] border-[#006EDB]/25'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOutubroRosa ? 'bg-[#EC4899]' : 'bg-[#006EDB]'} animate-pulse`} />
              COLEÇÃO 2026
            </span>
            <h3 className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight transition-colors ${
              isDark
                ? isOutubroRosa ? 'text-white group-hover:text-pink-300' : 'text-white'
                : isOutubroRosa ? 'text-[#003B73] group-hover:text-[#BE185D]' : 'text-[#003B73]'
            }`}>
              Novos modelos todas as semanas
            </h3>
            <p className={`text-xs sm:text-sm font-medium leading-relaxed max-w-[95%] ${isDark ? 'text-slate-300' : 'text-[#4A6B8C]'}`}>
              As maiores tendências e lançamentos em calçados femininos, masculinos e infantis, sempre em primeira mão.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleSelectCategory('NOVIDADES'); }}
                className={`group/btn ${
                  isOutubroRosa
                    ? 'bg-gradient-to-r from-[#DB2777] via-[#EC4899] to-[#F472B6] hover:from-[#BE185D] hover:to-[#DB2777] shadow-pink-500/25 hover:shadow-pink-500/35'
                    : 'bg-gradient-to-r from-[#006EDB] to-[#00509E] hover:from-[#005AB5] hover:to-[#003B73] shadow-blue-600/20 hover:shadow-blue-600/30'
                } text-white text-xs font-black tracking-wider px-6 py-3.5 rounded-full uppercase transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl flex items-center space-x-2.5 active:scale-95`}
              >
                <span>VER NOVIDADES</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5] group-hover/btn:translate-x-1.5 transition-transform duration-300" />
              </button>
            </div>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-[46%] sm:w-[48%] overflow-hidden pointer-events-none">
            <div className={`absolute inset-0 z-10 bg-gradient-to-r ${
              isDark ? 'from-[#0F172A] via-[#0F172A]/70 to-transparent' : 'from-[#FFFFFF] via-[#FFFFFF]/60 to-transparent'
            }`} />
            <div className={`absolute right-[-20%] top-[10%] w-[120%] h-[120%] ${
              isOutubroRosa ? 'bg-pink-400/15' : 'bg-blue-400/10'
            } rounded-full blur-2xl pointer-events-none`} />
            <img 
              src="https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=900&auto=format&fit=crop" 
              alt="Novos Modelos de Calçados" 
              className="w-full h-full object-cover object-center group-hover:scale-108 group-hover:-rotate-1 transition-all duration-700 ease-out"
            />
          </div>
        </div>

        {/* Coluna Direita (2 Banners Menores Studio) */}
        <div className="lg:col-span-6 grid grid-rows-2 gap-6">
          {/* Top Card (Linha Sapatos / Calçados) */}
          <div 
            onClick={() => handleSelectCategory('CALÇADOS')}
            className={`rounded-3xl p-7 sm:p-8 flex items-center justify-between relative overflow-hidden transition-all duration-500 min-h-[165px] border cursor-pointer group shadow-xl ${
              isDark 
                ? isOutubroRosa
                  ? 'bg-gradient-to-br from-[#540832] via-[#750C44] to-[#400627] border-pink-400/30 text-white hover:border-[#EC4899]/50 hover:shadow-2xl hover:shadow-pink-950/80'
                  : 'bg-gradient-to-br from-[#111A2E] via-[#0E1627] to-[#0A101D] border-white/10 text-white hover:border-blue-400/40 hover:shadow-2xl hover:shadow-blue-500/10' 
                : isOutubroRosa
                  ? 'bg-gradient-to-br from-[#FFFFFF] via-[#FFF5F8] to-[#FCE8F0] border-pink-900/10 text-[#003B73] hover:border-[#EC4899]/50 hover:shadow-2xl hover:shadow-pink-900/15'
                  : 'bg-gradient-to-br from-[#FFFFFF] via-[#F8FBFF] to-[#EAF2FC] border-blue-900/10 text-[#003B73] hover:border-[#006EDB]/40 hover:shadow-2xl hover:shadow-blue-900/10'
            }`}
          >
            <div className="space-y-2 z-20 w-full sm:w-[58%] pr-2">
              <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border shadow-xs transition-all ${
                isOutubroRosa
                  ? 'text-[#9D174D] dark:text-pink-300 bg-pink-100 dark:bg-pink-950/70 border-pink-300/50'
                  : isDark ? 'text-blue-300 bg-blue-950/60 border-blue-500/30' : 'text-[#003B73] bg-[#EAF4FE] border-[#006EDB]/25'
              }`}>
                <Sparkles className={`w-3 h-3 ${isOutubroRosa ? 'text-[#EC4899]' : 'text-[#006EDB]'}`} />
                LINHA CALÇADOS
              </span>
              <h3 className={`text-lg sm:text-xl font-black tracking-tight transition-colors ${
                isDark
                  ? isOutubroRosa ? 'text-white group-hover:text-pink-300' : 'text-white'
                  : isOutubroRosa ? 'text-[#003B73] group-hover:text-[#BE185D]' : 'text-[#003B73]'
              }`}>
                Para todos os seus momentos
              </h3>
              <p className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-[#4A6B8C]'}`}>
                Desempenho, amortecimento e elegância do casual ao sofisticado.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleSelectCategory('CALÇADOS'); }}
                  className={`group/btn ${
                    isOutubroRosa
                      ? 'bg-gradient-to-r from-[#DB2777] via-[#EC4899] to-[#F472B6] hover:from-[#BE185D] hover:to-[#DB2777] shadow-pink-500/20 hover:shadow-pink-500/30'
                      : 'bg-[#006EDB] hover:bg-[#00509E] shadow-blue-600/15 hover:shadow-blue-600/25'
                  } text-white text-[11px] font-black tracking-wider px-5 py-2.5 rounded-full uppercase transition-all duration-300 cursor-pointer shadow-md hover:shadow-lg flex items-center space-x-2 active:scale-95`}
                >
                  <span>VER CALÇADOS</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5] group-hover/btn:translate-x-1 transition-transform duration-300" />
                </button>
              </div>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-[44%] overflow-hidden pointer-events-none">
              <div className={`absolute inset-0 z-10 bg-gradient-to-r ${
                isDark ? 'from-[#0F172A] via-[#0F172A]/70 to-transparent' : 'from-[#FFFFFF] via-[#FFFFFF]/60 to-transparent'
              }`} />
              <div className={`absolute right-[-10%] top-[-10%] w-[100%] h-[100%] ${
                isOutubroRosa ? 'bg-pink-500/15' : 'bg-blue-500/10'
              } rounded-full blur-xl pointer-events-none`} />
              <img 
                src="https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=800&auto=format&fit=crop" 
                alt="Linha Calçados" 
                className="w-full h-full object-cover object-center group-hover:scale-108 transition-all duration-700 ease-out"
              />
            </div>
          </div>

          {/* Bottom Card (Bolsas & Acessórios) */}
          <div 
            onClick={() => handleSelectCategory('ACESSÓRIOS')}
            className={`rounded-3xl p-7 sm:p-8 flex items-center justify-between relative overflow-hidden transition-all duration-500 min-h-[165px] border cursor-pointer group shadow-xl ${
              isDark 
                ? isOutubroRosa
                  ? 'bg-gradient-to-br from-[#540832] via-[#750C44] to-[#400627] border-pink-400/30 text-white hover:border-[#EC4899]/50 hover:shadow-2xl hover:shadow-pink-950/80'
                  : 'bg-gradient-to-br from-[#111A2E] via-[#0E1627] to-[#0A101D] border-white/10 text-white hover:border-blue-400/40 hover:shadow-2xl hover:shadow-blue-500/10' 
                : isOutubroRosa
                  ? 'bg-gradient-to-br from-[#FFFFFF] via-[#FFF5F8] to-[#FCE8F0] border-pink-900/10 text-[#003B73] hover:border-[#EC4899]/50 hover:shadow-2xl hover:shadow-pink-900/15'
                  : 'bg-gradient-to-br from-[#FFFFFF] via-[#F8FBFF] to-[#EAF2FC] border-blue-900/10 text-[#003B73] hover:border-[#006EDB]/40 hover:shadow-2xl hover:shadow-blue-900/10'
            }`}
          >
            <div className="space-y-2 z-20 w-full sm:w-[58%] pr-2">
              <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border shadow-xs transition-all ${
                isOutubroRosa
                  ? 'text-[#9D174D] dark:text-pink-300 bg-pink-100 dark:bg-pink-950/70 border-pink-300/50'
                  : isDark ? 'text-blue-300 bg-blue-950/60 border-blue-500/30' : 'text-[#003B73] bg-[#EAF4FE] border-[#006EDB]/25'
              }`}>
                <ShoppingBag className={`w-3 h-3 ${isOutubroRosa ? 'text-[#EC4899]' : 'text-[#006EDB]'}`} />
                BOLSAS & ACESSÓRIOS
              </span>
              <h3 className={`text-lg sm:text-xl font-black tracking-tight transition-colors ${
                isDark
                  ? isOutubroRosa ? 'text-white group-hover:text-pink-300' : 'text-white'
                  : isOutubroRosa ? 'text-[#003B73] group-hover:text-[#BE185D]' : 'text-[#003B73]'
              }`}>
                Bolsas que completam você
              </h3>
              <p className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-[#4A6B8C]'}`}>
                Design contemporâneo, acabamento refinado e versatilidade em cada detalhe.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleSelectCategory('ACESSÓRIOS'); }}
                  className={`group/btn ${
                    isOutubroRosa
                      ? 'bg-gradient-to-r from-[#DB2777] via-[#EC4899] to-[#F472B6] hover:from-[#BE185D] hover:to-[#DB2777] shadow-pink-500/20 hover:shadow-pink-500/30'
                      : 'bg-[#006EDB] hover:bg-[#00509E] shadow-blue-600/15 hover:shadow-blue-600/25'
                  } text-white text-[11px] font-black tracking-wider px-5 py-2.5 rounded-full uppercase transition-all duration-300 cursor-pointer shadow-md hover:shadow-lg flex items-center space-x-2 active:scale-95`}
                >
                  <span>VER ACESSÓRIOS</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5] group-hover/btn:translate-x-1 transition-transform duration-300" />
                </button>
              </div>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-[44%] overflow-hidden pointer-events-none">
              <div className={`absolute inset-0 z-10 bg-gradient-to-r ${
                isDark ? 'from-[#0F172A] via-[#0F172A]/70 to-transparent' : 'from-[#FFFFFF] via-[#FFFFFF]/60 to-transparent'
              }`} />
              <div className={`absolute right-[-10%] top-[-10%] w-[100%] h-[100%] ${
                isOutubroRosa ? 'bg-pink-500/15' : 'bg-blue-500/10'
              } rounded-full blur-xl pointer-events-none`} />
              <img 
                src="https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=800&auto=format&fit=crop" 
                alt="Acessórios e Bolsas" 
                className="w-full h-full object-cover object-center group-hover:scale-108 transition-all duration-700 ease-out"
              />
            </div>
          </div>
        </div>
      </div>

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
