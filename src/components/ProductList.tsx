import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { Product } from "../types";
import { Eye, Heart, ArrowRight, ArrowUpDown, Truck, CreditCard, RefreshCw, ShoppingBag, Sparkles, ChevronLeft, ChevronRight, Tag } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { scrollToSectionWithOffset } from "../lib/scrollUtils";
import { normalizeCategoryName, normalizeSubcategoryName, isProductInCategory } from "../services/moblinkCategoriesService";
import { extractClassificacaoCategoria } from "../services/moblinkProductsService";
import { hasProductValidPhotos, hasProductValidPhoto } from "../utils/photoUtils";
import { isSaldaoProduct, getSaldaoProductPrice } from "../services/saldaoService";
import { getApplicablePromotion } from "../services/promotionsService";
import { NO_PHOTO_SVG } from "../utils/placeholder";

import { ProductCard, StorefrontProductCard } from "./products/storefront/StorefrontProductCard";
import { SubcategoryCarousel } from "./products/storefront/SubcategoryCarousel";
import { matchProductSearch } from "./products/utils/productFilterUtils";

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
    setCurrentView,
    setSelectedProduct,
    favorites = [],
    toggleFavorite,
    theme,
    categories: dbCategories = [],
  } = useApp();

  const [sortBy, setSortBy] = useState<"relevant" | "price-asc" | "price-desc" | "launches">("relevant");
  const catalogSectionRef = useRef<HTMLElement | null>(null);
  const isDark = theme === "dark";

  // Subcategorias dinâmicas extraídas prioritariamente dos produtos COM ESTOQUE DISPONÍVEL E FOTO VÁLIDA
  const activeSubcategoriesInStock = useMemo(() => {
    const subMap = new Map<string, { id: string; name: string; image?: string; itemCount: number }>();

    (products || []).forEach((p) => {
      const isAvailable = (p.stock !== undefined ? p.stock > 0 : (p.saldo_loja ?? 0) > 0);
      if (!p.visible || !isAvailable || !hasProductValidPhoto(p)) return;

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

  // Produtos do Saldão de Calçados (Calçados visíveis com foto válida e estoque <= saldaoConfig.maxStock)
  const saldaoProducts = useMemo(() => {
    return products.filter((prod) => {
      const isAvailable = (prod.stock !== undefined ? prod.stock > 0 : (prod.saldo_loja ?? 0) > 0);
      if (!prod.visible || !isAvailable || !hasProductValidPhoto(prod)) return false;
      return isSaldaoProduct(prod, saldaoConfig);
    });
  }, [products, saldaoConfig]);

  // Produtos exibidos na Seção 'Novidades': EXCLUSIVAMENTE produtos marcados como Lançamento/Novidade, visíveis, com estoque e com foto real
  const novidadesProducts = useMemo(() => {
    return products.filter((p) => {
      const isAvailable = (p.stock !== undefined ? p.stock > 0 : (p.saldo_loja ?? 0) > 0);
      return p.visible && isAvailable && hasProductValidPhoto(p) && (p.newArrival === true || (p as any).novo === true);
    });
  }, [products]);

  // Produtos exibidos na Seção 'Coleção Calçados' (Exclui estritamente Confecções, Bolsas, Acessórios, Malas e Itens de Viagem)
  const calcadosProducts = useMemo(() => {
    return products.filter((prod) => {
      const isAvailable = (prod.stock !== undefined ? prod.stock > 0 : (prod.saldo_loja ?? 0) > 0);
      if (!prod.visible || !isAvailable || !hasProductValidPhoto(prod)) return false;

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

  // Produtos exibidos na Seção 'Confecções' (Strict Match Confecções / Vestuário com Foto Real)
  const confeccoesProducts = useMemo(() => {
    return products.filter((prod) => {
      const isAvailable = (prod.stock !== undefined ? prod.stock > 0 : (prod.saldo_loja ?? 0) > 0);
      if (!prod.visible || !isAvailable || !hasProductValidPhoto(prod)) return false;

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
      if (!prod.visible || !isAvailable || !hasProductValidPhoto(prod)) return false;

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
      <SubcategoryCarousel
        subcategories={activeSubcategoriesInStock}
        theme={theme}
        onSelectSubcategory={handleSelectSubcategoryItem}
      />


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
                src={NO_PHOTO_SVG} 
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
