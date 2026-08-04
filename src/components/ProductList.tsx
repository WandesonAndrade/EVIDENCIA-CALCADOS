import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { Product } from "../types";
import {
  Eye,
  Timer,
  Percent,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Heart,
  CreditCard,
  Zap,
  Filter,
  Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { scrollToSectionWithOffset } from "../lib/scrollUtils";
import { AboutUs } from "./AboutUs";
import { CrediarioBanner } from "./CrediarioBanner";
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
      ? Math.round(
          ((product.originalPrice - product.price) / product.originalPrice) *
            100,
        )
      : 0;

  const isDark = theme === "dark";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`group relative flex flex-col justify-between h-full rounded-2xl border transition-all duration-300 overflow-hidden ${
        isDark
          ? "bg-slate-900/60 backdrop-blur-xl border-slate-800/80 hover:border-amber-400/40 hover:shadow-[0_12px_30px_rgba(0,0,0,0.5)]"
          : "bg-white/80 backdrop-blur-xl border-slate-200/80 hover:border-slate-300 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)]"
      }`}
    >
      {/* Imagem do Produto & Badges Flutuantes */}
      <div
        className={`relative aspect-square w-full overflow-hidden ${isDark ? "bg-slate-950/80" : "bg-slate-50/80"}`}
      >
        <img
          src={
            product.images?.[0] ||
            product.foto_uri ||
            "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=600&auto=format&fit=crop"
          }
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=600&auto=format&fit=crop";
          }}
        />

        {/* Gradiente sutil sobre a imagem */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Badges do Produto */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {product.onSale && discountPercent > 0 ? (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest uppercase text-white bg-gradient-to-r from-red-600 to-rose-500 shadow-lg shadow-red-500/30 backdrop-blur-md animate-pulse">
              {discountPercent}% OFF
            </span>
          ) : product.newArrival ? (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest uppercase text-slate-950 bg-gradient-to-r from-amber-300 to-amber-400 shadow-md shadow-amber-400/20 backdrop-blur-md">
              LANÇAMENTO
            </span>
          ) : null}

          {product.stockControl && product.stock <= 5 && product.stock > 0 && (
            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold text-amber-950 bg-amber-400/90 shadow-sm backdrop-blur-md">
              Últimos Pares ({product.stock})
            </span>
          )}

          {product.stockControl && product.stock === 0 && (
            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold text-white bg-rose-700/90 shadow-sm backdrop-blur-md">
              Esgotado
            </span>
          )}
        </div>

        {/* Botão de Favoritar Animado */}
        <motion.button
          whileTap={{ scale: 0.8 }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(product.id);
          }}
          className={`absolute top-3 right-3 p-2.5 rounded-full backdrop-blur-md border transition-all duration-200 z-20 cursor-pointer ${
            isFavorite
              ? "bg-rose-500/10 border-rose-500/30 text-rose-500"
              : isDark
                ? "bg-slate-900/80 border-slate-700/60 text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                : "bg-white/80 border-slate-200/80 text-slate-400 hover:text-rose-500 hover:bg-white"
          }`}
          title={
            isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"
          }
        >
          <Heart
            className={`h-4 w-4 transition-colors ${isFavorite ? "fill-rose-500 text-rose-500" : ""}`}
          />
        </motion.button>

        {/* Categoria Badge (Inferior Esquerdo da Foto) */}
        <div className="absolute bottom-3 left-3 opacity-90">
          <span
            className={`text-[9px] font-bold px-2 py-0.5 rounded-full border backdrop-blur-md uppercase tracking-wider ${
              isDark
                ? "bg-slate-900/80 border-slate-700/60 text-slate-300"
                : "bg-white/80 border-slate-200/80 text-slate-700"
            }`}
          >
            {product.category}
          </span>
        </div>
      </div>

      {/* Detalhes do Produto */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          <h3
            className={`text-xs sm:text-sm font-semibold tracking-tight leading-snug line-clamp-2 min-h-[38px] transition-colors ${
              isDark
                ? "text-slate-100 group-hover:text-amber-400"
                : "text-slate-800 group-hover:text-slate-950"
            }`}
          >
            {product.name}
          </h3>

          {/* Exibição Dupla de Preços (Tabela vs. Preço à Vista no PIX) */}
          <div className="pt-1 space-y-1">
            <div className="flex items-center space-x-2 flex-wrap">
              <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Tabela: <span className="font-bold">R$ {product.price.toFixed(2).replace('.', ',')}</span>
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className={`text-[10px] line-through ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                  R$ {product.originalPrice.toFixed(2).replace('.', ',')}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2 flex-wrap">
              <p className={`text-base sm:text-lg font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                R$ {(product.precoVista || Math.round(product.price * 0.9 * 100) / 100).toFixed(2).replace('.', ',')}
              </p>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                ⚡ À Vista
              </span>
            </div>
          </div>
        </div>

        {/* Selos de Formas de Pagamento Aceitas */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {product.crediarioProprio && (
            <div
              className={`inline-flex items-center space-x-1 py-1 px-2 rounded-md border text-[9px] font-bold ${
                isDark
                  ? "bg-amber-400/10 border-amber-400/30 text-amber-300"
                  : "bg-amber-50 border-amber-200 text-amber-900"
              }`}
            >
              <CreditCard className="h-3 w-3 shrink-0 text-amber-500" />
              <span>Crediário Próprio</span>
            </div>
          )}

          <div
            className={`inline-flex items-center space-x-1 py-1 px-2 rounded-md border text-[9px] font-bold ${
              isDark
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-emerald-50 border-emerald-200 text-emerald-900"
            }`}
          >
            <Zap className="h-3 w-3 shrink-0 text-emerald-500" />
            <span>Pix</span>
          </div>

          <div
            className={`inline-flex items-center space-x-1 py-1 px-2 rounded-md border text-[9px] font-bold ${
              isDark
                ? "bg-sky-500/10 border-sky-500/30 text-sky-300"
                : "bg-sky-50 border-sky-200 text-sky-900"
            }`}
          >
            <CreditCard className="h-3 w-3 shrink-0 text-sky-500" />
            <span>Cartão de Crédito</span>
          </div>
        </div>

        {/* Botão Ver Detalhes */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onViewDetails(product)}
          className={`w-full flex items-center justify-center space-x-2 py-2.5 px-4 text-xs font-bold rounded-xl transition-all duration-200 shadow-sm cursor-pointer ${
            isDark
              ? "bg-gradient-to-r from-amber-400 via-amber-400 to-amber-500 text-slate-950 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] font-extrabold"
              : "bg-slate-900 text-white hover:bg-slate-800 shadow-md hover:shadow-lg"
          }`}
        >
          <Eye className="h-4 w-4" />
          <span>VER DETALHES</span>
        </motion.button>
      </div>
    </motion.div>
  );
};

export const ProductCard = React.memo(ProductCardComponent);

export const ProductList: React.FC = () => {
  const {
    products,
    isLoadingProducts,
    selectedCategory,
    setSelectedCategory,
    selectedSubcategory,
    setSelectedSubcategory,
    searchQuery,
    setCurrentView,
    setSelectedProduct,
    favorites = [],
    toggleFavorite,
    theme,
    homeSections,
    categories: dbCategories = [],
  } = useApp();

  const offersSection = homeSections?.find((s) => s.id === "offers");
  const launchesSection = homeSections?.find((s) => s.id === "launches");
  const shoesSection = homeSections?.find((s) => s.id === "shoes");
  const accessoriesSection = homeSections?.find((s) => s.id === "accessories");

  const ITEMS_PER_PAGE = 24;
  const [visibleShoesCount, setVisibleShoesCount] = useState(ITEMS_PER_PAGE);
  const [visibleAccCount, setVisibleAccCount] = useState(ITEMS_PER_PAGE);

  const [timeLeft, setTimeLeft] = useState({
    horas: 23,
    minutos: 59,
    segundos: 59,
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentLaunchIndex, setCurrentLaunchIndex] = useState(0);
  const [cardsPerPage, setCardsPerPage] = useState(4);
  const catalogSectionRef = useRef<HTMLElement | null>(null);
  const isMountedRef = useRef(false);

  const handleSelectCategory = (cat: string) => {
    setSelectedCategory(cat);
    scrollToSectionWithOffset(
      catalogSectionRef.current || "catalog-products-section",
    );
  };

  const isDark = theme === "dark";

  // Dynamic carousel window layout tracking
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
    window.addEventListener("resize", updateCardsPerPage);
    return () => window.removeEventListener("resize", updateCardsPerPage);
  }, []);

  // Reset carousel index and pagination when categories or search queries change & smooth scroll
  useEffect(() => {
    setCurrentIndex(0);
    setCurrentLaunchIndex(0);
    setVisibleShoesCount(ITEMS_PER_PAGE);
    setVisibleAccCount(ITEMS_PER_PAGE);

    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    scrollToSectionWithOffset(
      catalogSectionRef.current || "catalog-products-section",
    );
  }, [selectedCategory, searchQuery]);

  // Dynamic countdown timer for FOMO/conversion trigger
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
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

  // Departamentos oficiais do e-commerce
  const defaultSubcategories = [
    "Cosméticos",
    "Perfumes",
    "Escolar",
    "Acessórios",
    "Calçados infantil masculino",
    "Calçados infantil feminino",
    "Calçados masculinos",
    "Calçados femininos",
    "Itens de viagens"
  ];

  const allSubcategories = Array.from(
    new Set([
      ...defaultSubcategories,
      ...dbCategories.map((c) => c.name),
      ...products.map((p) => p.category).filter(Boolean),
    ]),
  );

  const filterTabs = ["TODOS", ...allSubcategories.map((c) => c.toUpperCase())];

  const handleVerDetalhes = (prod: Product) => {
    setSelectedProduct(prod);
    setCurrentView("product-detail");
  };

  const formatNumber = (num: number) => num.toString().padStart(2, "0");

  // Função de filtro universal combinada (Categoria/Grupo + Subcategoria/Subgrupo com normalização)
  const matchesFilter = useCallback((p: Product) => {
    // 1. Validação da Categoria (Grupo ERP)
    let catMatch = false;
    if (selectedCategory === "TODOS" || !selectedCategory) {
      catMatch = true;
    } else {
      const targetCat = selectedCategory.toUpperCase().trim();
      const pCatNorm = normalizeCategoryName(p.category || "").toUpperCase().trim();
      const pGrupoNorm = normalizeCategoryName(p.nome_grupo || "").toUpperCase().trim();
      const pClass = (p.classificacao || "").toUpperCase().trim();
      const pRawCat = (p.category || "").toUpperCase().trim();
      const pRawGrupo = (p.nome_grupo || "").toUpperCase().trim();

      catMatch =
        pCatNorm === targetCat ||
        pGrupoNorm === targetCat ||
        pRawCat === targetCat ||
        pRawGrupo === targetCat ||
        pClass === targetCat ||
        pCatNorm.includes(targetCat) ||
        pGrupoNorm.includes(targetCat);
    }

    if (!catMatch) return false;

    // 2. Validação da Subcategoria (Subgrupo ERP)
    if (!selectedSubcategory || selectedSubcategory === "TODAS" || selectedSubcategory === "TODOS") {
      return true;
    }

    const targetSub = selectedSubcategory.toUpperCase().trim();
    const pSubNorm = normalizeSubcategoryName(p.subcategory || "").toUpperCase().trim();
    const pSubGrupoNorm = normalizeSubcategoryName(p.nome_subgrupo || "").toUpperCase().trim();
    const pRawSub = (p.subcategory || "").toUpperCase().trim();
    const pRawSubGrupo = (p.nome_subgrupo || "").toUpperCase().trim();

    return (
      pSubNorm === targetSub ||
      pSubGrupoNorm === targetSub ||
      pRawSub === targetSub ||
      pRawSubGrupo === targetSub ||
      pSubNorm.includes(targetSub) ||
      pSubGrupoNorm.includes(targetSub)
    );
  }, [selectedCategory, selectedSubcategory]);

  // Filtra os produtos pela busca do usuário e visibilidade/estoque
  const baseFilteredProducts = products.filter((prod) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      prod.name.toLowerCase().includes(query) ||
      prod.description.toLowerCase().includes(query) ||
      prod.category.toLowerCase().includes(query) ||
      (prod.subcategory && prod.subcategory.toLowerCase().includes(query)) ||
      (prod.nome_grupo && prod.nome_grupo.toLowerCase().includes(query)) ||
      (prod.nome_subgrupo && prod.nome_subgrupo.toLowerCase().includes(query));
    const isAvailable = (prod.stock !== undefined ? prod.stock > 0 : (prod.saldo_loja ?? 0) > 0);
    return matchesSearch && prod.visible && isAvailable;
  });

  const offersProducts = baseFilteredProducts.filter(
    (p) => p.onSale && matchesFilter(p)
  );

  const newArrivalsProducts = baseFilteredProducts.filter(
    (p) => Boolean(p.newArrival) && matchesFilter(p)
  );

  const shoesProducts = baseFilteredProducts.filter(
    (p) => p.category.toUpperCase() !== "ACESSÓRIOS" && matchesFilter(p)
  );

  const accessoriesProducts = baseFilteredProducts.filter(
    (p) => p.category.toUpperCase() === "ACESSÓRIOS" && matchesFilter(p)
  );

  const totalFilteredCount =
    offersProducts.length + newArrivalsProducts.length + shoesProducts.length + accessoriesProducts.length;
  const maxIndex = Math.max(0, offersProducts.length - cardsPerPage);
  const activeIndex = Math.min(currentIndex, maxIndex);

  const maxLaunchIndex = Math.max(0, newArrivalsProducts.length - cardsPerPage);
  const activeLaunchIndex = Math.min(currentLaunchIndex, maxLaunchIndex);

  // Nível 1: Extração e Tratamento de Categorias (Grupos ERP + Banco de Categorias)
  const categoriesList = useMemo(() => {
    const uniqueMap = new Map<string, string>(); // UPPER -> Display Traduzido
    uniqueMap.set("TODOS", "TODOS");

    (dbCategories || []).filter((c) => c && c.name && c.active !== false).forEach((c) => {
      const normalized = normalizeCategoryName(c.name);
      if (normalized && normalized !== "Geral" && !/^\d+(\.\d+)?$/.test(normalized)) {
        uniqueMap.set(normalized.toUpperCase(), normalized);
      }
    });

    (products || []).forEach((p) => {
      const cat = (p.category || p.nome_grupo || "").trim();
      if (cat && !/^\d+(\.\d+)?$/.test(cat)) {
        const normalized = normalizeCategoryName(cat);
        if (normalized && normalized !== "Geral" && !/^\d+(\.\d+)?$/.test(normalized)) {
          if (!uniqueMap.has(normalized.toUpperCase())) {
            uniqueMap.set(normalized.toUpperCase(), normalized);
          }
        }
      }
    });

    return Array.from(uniqueMap.entries()).map(([key, label]) => ({
      id: key,
      label: label,
    }));
  }, [dbCategories, products]);

  // Pílulas principais do Nível 1 (primeiras 5 categorias + "TODOS")
  const primaryFootwearPills = useMemo(() => {
    return categoriesList.slice(0, 6);
  }, [categoriesList]);

  // Departamentos secundários do Nível 1 para o dropdown
  const secondaryDepartments = useMemo(() => {
    return categoriesList.slice(6);
  }, [categoriesList]);

  // Nível 2: Extração e Tratamento de Subcategorias (Subgrupos ERP) para a Categoria selecionada
  const availableSubcategories = useMemo(() => {
    const subMap = new Map<string, string>(); // UPPER -> Display Traduzido

    // Subcategorias associadas no dbCategories para a categoria ativa
    if (selectedCategory !== "TODOS") {
      const foundCat = (dbCategories || []).find(
        (c) => normalizeCategoryName(c.name).toUpperCase().trim() === selectedCategory
      );
      if (foundCat && Array.isArray(foundCat.subcategories)) {
        foundCat.subcategories.forEach((sub) => {
          if (sub && sub.name) {
            const normalizedSub = normalizeSubcategoryName(sub.name);
            if (normalizedSub && !/^\d+(\.\d+)?$/.test(normalizedSub)) {
              subMap.set(normalizedSub.toUpperCase(), normalizedSub);
            }
          }
        });
      }
    }

    // Subcategorias dos produtos pertencentes à categoria ativa
    (products || []).forEach((p) => {
      let isCategoryMatch = false;
      if (selectedCategory === "TODOS") {
        isCategoryMatch = true;
      } else {
        const pCatNorm = normalizeCategoryName(p.category || p.nome_grupo || "").toUpperCase().trim();
        isCategoryMatch = pCatNorm === selectedCategory || (p.nome_grupo && p.nome_grupo.toUpperCase().trim() === selectedCategory);
      }

      if (isCategoryMatch) {
        const rawSub = p.subcategory || p.nome_subgrupo || p.subcategoria || "";
        if (rawSub && !/^\d+(\.\d+)?$/.test(rawSub)) {
          const normalizedSub = normalizeSubcategoryName(rawSub);
          if (normalizedSub && !/^\d+(\.\d+)?$/.test(normalizedSub)) {
            if (!subMap.has(normalizedSub.toUpperCase())) {
              subMap.set(normalizedSub.toUpperCase(), normalizedSub);
            }
          }
        }
      }
    });

    const subList = Array.from(subMap.entries()).map(([key, label]) => ({
      id: key,
      label: label,
    }));

    if (subList.length > 0) {
      return [{ id: "TODAS", label: "Todas as Subcategorias" }, ...subList];
    }
    return [];
  }, [selectedCategory, dbCategories, products]);

  // Sequência ativa das seções da vitrine salva no Firestore (com Lançamentos fixo em #1)
  const activeHomeSections = useMemo(() => {
    const list = [
      ...(homeSections && homeSections.length > 0
        ? homeSections
        : [
            { id: "launches", name: "Novidades & Lançamentos", description: "As últimas tendências da estação", enabled: true },
            { id: "offers", name: "Ofertas Relâmpago & Outlet", description: "Descontos exclusivos por tempo limitado", enabled: true },
            { id: "shoes", name: "Calçados Premium", description: "Conforto, durabilidade e estilo", enabled: true },
            { id: "accessories", name: "Acessórios", description: "Cintos, carteiras e bolsas em couro", enabled: true },
            { id: "about", name: "Sobre Nós", description: "Nossa história e valores", enabled: true },
          ]),
    ];

    let launchesIdx = list.findIndex((s) => s.id === "launches");
    if (launchesIdx === -1) {
      list.unshift({
        id: "launches",
        name: "Novidades & Lançamentos",
        description: "As últimas tendências da estação",
        enabled: true,
      });
    } else if (launchesIdx > 0) {
      const [launchesSec] = list.splice(launchesIdx, 1);
      list.unshift(launchesSec);
    }

    return list;
  }, [homeSections]);

  const isSecondaryActive = secondaryDepartments.some(
    (d) => d.id === selectedCategory
  );
  const activeSecondaryLabel = secondaryDepartments.find(
    (d) => d.id === selectedCategory
  )?.label;

  return (
    <section
      id="catalog-products-section"
      ref={catalogSectionRef}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10"
    >
      {/* Categorias & Subcategorias em Destaque (Nível 1 & Nível 2) */}
      <div className="space-y-4">
        {/* CABEÇALHO DO FILTRO */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-amber-500" />
            <span
              className={`text-xs font-bold uppercase tracking-widest ${isDark ? "text-amber-400" : "text-slate-600"}`}
            >
              Navegação por Departamentos
            </span>
          </div>

          <div className="flex items-center gap-3">
            {searchQuery && (
              <span
                className={`text-xs font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}
              >
                Resultado para:{" "}
                <span
                  className={`${isDark ? "text-amber-400" : "text-slate-900"} font-bold`}
                >
                  "{searchQuery}"
                </span>
              </span>
            )}

            <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full border ${
              isDark ? 'bg-slate-900 border-slate-800 text-amber-400' : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}>
              {totalFilteredCount} {totalFilteredCount === 1 ? 'produto' : 'produtos'}
            </span>
          </div>
        </div>

        {/* NÍVEL 1: PILULAS DE CATEGORIAS PRINCIPAIS */}
        <div className="flex items-center space-x-2.5 overflow-x-auto no-scrollbar scroll-smooth py-2 px-1">
          {primaryFootwearPills.map((pill) => {
            const isSelected = selectedCategory === pill.id;

            return (
              <motion.button
                key={pill.id}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleSelectCategory(pill.id)}
                className={`whitespace-nowrap px-5 py-2.5 rounded-full text-xs font-bold tracking-wider transition-all duration-200 cursor-pointer border ${
                  isSelected
                    ? isDark
                      ? "bg-amber-400 text-slate-950 border-amber-300 font-black shadow-[0_0_20px_rgba(245,158,11,0.35)] scale-105 z-10"
                      : "bg-slate-900 text-white border-slate-900 font-black shadow-lg scale-105 z-10"
                    : isDark
                      ? "bg-slate-900/40 border-slate-800/80 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 backdrop-blur-md"
                      : "bg-white/70 border-slate-200/80 text-slate-600 hover:bg-slate-100 backdrop-blur-md"
                }`}
              >
                {pill.label}
              </motion.button>
            );
          })}

          {/* Combobox Dropdown para Departamentos Secundários */}
          {secondaryDepartments.length > 0 && (
            <div className="relative shrink-0">
              <select
                value={isSecondaryActive ? selectedCategory : ""}
                onChange={(e) => {
                  if (e.target.value) {
                    handleSelectCategory(e.target.value);
                  }
                }}
                className={`whitespace-nowrap px-4 py-2.5 rounded-full text-xs font-bold tracking-wider transition-all duration-200 cursor-pointer border focus:outline-none ${
                  isSecondaryActive
                    ? isDark
                      ? "bg-amber-400 text-slate-950 border-amber-300 font-black shadow-[0_0_20px_rgba(245,158,11,0.35)]"
                      : "bg-slate-900 text-white border-slate-900 font-black shadow-lg"
                    : isDark
                      ? "bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-800 hover:border-slate-700 backdrop-blur-md"
                      : "bg-white/80 border-slate-200 text-slate-700 hover:bg-slate-50 backdrop-blur-md"
                }`}
              >
                <option value="" disabled>
                  {isSecondaryActive ? `Outros: ${activeSecondaryLabel}` : "Outros Departamentos ▾"}
                </option>
                {secondaryDepartments.map((dept) => (
                  <option 
                    key={dept.id} 
                    value={dept.id}
                    className={isDark ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900"}
                  >
                    {dept.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* NÍVEL 2: SUBCATEGORIAS (Subgrupos ERP) - Exibidas dinamicamente */}
        {availableSubcategories.length > 1 && (
          <div className={`p-3.5 rounded-2xl border space-y-2 animate-fade-in ${
            isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-slate-50/90 border-slate-200/70'
          }`}>
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="h-3 w-3 text-amber-500" />
                Subcategorias {selectedCategory !== 'TODOS' ? `em ${selectedCategory}` : ''}
              </span>
              {selectedSubcategory !== 'TODAS' && (
                <button
                  type="button"
                  onClick={() => setSelectedSubcategory('TODAS')}
                  className="text-[10px] font-bold text-amber-500 hover:underline cursor-pointer"
                >
                  Limpar Subcategoria ✕
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
              {availableSubcategories.map((sub) => {
                const isSubSelected = selectedSubcategory === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSelectedSubcategory(sub.id)}
                    className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-200 cursor-pointer border ${
                      isSubSelected
                        ? isDark
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-sm'
                          : 'bg-slate-900 text-white border-slate-900 font-extrabold shadow-sm'
                        : isDark
                          ? 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:bg-slate-700/80 hover:text-white'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {sub.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* BANNER DE DESTAQUE: CREDIÁRIO PRÓPRIO EVIDÊNCIA */}
      <CrediarioBanner />

      {/* Skeleton Loading State */}
      {isLoadingProducts ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className={`border rounded-2xl p-4 animate-pulse space-y-4 ${
                isDark
                  ? "bg-slate-900/40 border-slate-800"
                  : "bg-white/60 border-slate-200"
              }`}
            >
              <div
                className={`aspect-square w-full rounded-xl ${isDark ? "bg-slate-800/60" : "bg-slate-200/60"}`}
              />
              <div
                className={`h-4 rounded-md w-2/3 ${isDark ? "bg-slate-800/60" : "bg-slate-200/60"}`}
              />
              <div
                className={`h-4 rounded-md w-1/3 ${isDark ? "bg-slate-800/60" : "bg-slate-200/60"}`}
              />
              <div
                className={`h-10 rounded-xl w-full ${isDark ? "bg-slate-800/60" : "bg-slate-200/60"}`}
              />
            </div>
          ))}
        </div>
      ) : totalFilteredCount === 0 ? (
        /* Empty State */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`text-center py-16 rounded-3xl border p-8 backdrop-blur-xl ${
            isDark
              ? "bg-slate-900/40 border-slate-800 text-slate-200"
              : "bg-white/70 border-slate-200 text-slate-800"
          }`}
        >
          <p className="text-base text-slate-400 mb-4 font-medium">
            Nenhum calçado ou acessório foi encontrado para os filtros
            selecionados.
          </p>
          <button
            onClick={() => handleSelectCategory("TODOS")}
            className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all shadow-md cursor-pointer ${
              isDark
                ? "bg-amber-400 text-slate-950 hover:bg-amber-300"
                : "bg-slate-900 text-white hover:bg-slate-800"
            }`}
          >
            Limpar Filtros e Ver Todos os Calçados
          </button>
        </motion.div>
      ) : (
        <div className="space-y-16">
          {activeHomeSections.map((sec) => {
            if (sec.enabled === false) return null;

            // 1. SECTION: OFERTAS RELÂMPAGO & OUTLET
            if (sec.id === "offers" && offersProducts.length > 0) {
              return (
                <div
                  key={sec.id}
                  id="offers-campaign-section"
                  className="space-y-6"
                >
                  <div
                    className={`flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b pb-4 ${
                      isDark ? "border-slate-800/80" : "border-slate-200/80"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500">
                        <Percent className="h-5 w-5 animate-spin-slow" />
                      </div>
                      <div>
                        <h2
                          className={`text-xl font-black tracking-tight ${isDark ? "text-slate-100" : "text-slate-900"}`}
                        >
                          {sec.name || "Ofertas Relâmpago & Outlet"}
                        </h2>
                        <p className="text-xs text-slate-400">
                          {sec.description ||
                            "Descontos exclusivos por tempo limitado"}
                        </p>
                      </div>
                    </div>

                    {/* Countdown Timer Badge */}
                    <div
                      className={`flex items-center space-x-2 px-4 py-2 rounded-2xl border font-mono text-xs font-bold backdrop-blur-md ${
                        isDark
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          : "bg-rose-50 text-rose-600 border-rose-200"
                      }`}
                    >
                      <Timer className="h-4 w-4 animate-pulse text-rose-500" />
                      <span className="text-[10px] tracking-wider uppercase font-sans hidden sm:inline">
                        TERMINA EM:
                      </span>
                      <span className="bg-rose-600 text-white px-2 py-0.5 rounded-lg text-xs font-bold">
                        {formatNumber(timeLeft.horas)}
                      </span>
                      <span>:</span>
                      <span className="bg-rose-600 text-white px-2 py-0.5 rounded-lg text-xs font-bold">
                        {formatNumber(timeLeft.minutos)}
                      </span>
                      <span>:</span>
                      <span className="bg-rose-600 text-white px-2 py-0.5 rounded-lg text-xs font-bold">
                        {formatNumber(timeLeft.segundos)}
                      </span>
                    </div>
                  </div>

                  {/* Carousel Container */}
                  <div className="relative group/carousel">
                    {offersProducts.length > cardsPerPage && (
                      <button
                        onClick={() =>
                          setCurrentIndex((prev) => Math.max(0, prev - 1))
                        }
                        disabled={activeIndex === 0}
                        className={`absolute top-1/2 -translate-y-1/2 -left-3 sm:-left-5 z-30 flex items-center justify-center h-11 w-11 rounded-full border backdrop-blur-xl transition-all duration-200 cursor-pointer shadow-xl ${
                          activeIndex === 0
                            ? "opacity-0 pointer-events-none scale-90"
                            : isDark
                              ? "bg-slate-900/90 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-amber-400"
                              : "bg-white/90 border-slate-200 text-slate-800 hover:bg-white shadow-lg"
                        }`}
                      >
                        <ChevronLeft className="h-6 w-6 stroke-[2.5]" />
                      </button>
                    )}

                    <div className="relative overflow-hidden py-3 px-1">
                      <motion.div
                        className="flex -mx-3 transition-transform duration-500 ease-out"
                        style={{
                          transform: `translateX(-${activeIndex * (100 / cardsPerPage)}%)`,
                        }}
                      >
                        {offersProducts.map((prod) => (
                          <div
                            key={prod.id}
                            className="shrink-0 px-3"
                            style={{ width: `${100 / cardsPerPage}%` }}
                          >
                            <ProductCard
                              product={prod}
                              theme={theme}
                              isFavorite={favorites.includes(prod.id)}
                              onToggleFavorite={toggleFavorite}
                              onViewDetails={handleVerDetalhes}
                            />
                          </div>
                        ))}
                      </motion.div>
                    </div>

                    {offersProducts.length > cardsPerPage && (
                      <button
                        onClick={() =>
                          setCurrentIndex((prev) =>
                            Math.min(
                              prev + 1,
                              offersProducts.length - cardsPerPage,
                            ),
                          )
                        }
                        disabled={activeIndex >= maxIndex}
                        className={`absolute top-1/2 -translate-y-1/2 -right-3 sm:-right-5 z-30 flex items-center justify-center h-11 w-11 rounded-full border backdrop-blur-xl transition-all duration-200 cursor-pointer shadow-xl ${
                          activeIndex >= maxIndex
                            ? "opacity-0 pointer-events-none scale-90"
                            : isDark
                              ? "bg-slate-900/90 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-amber-400"
                              : "bg-white/90 border-slate-200 text-slate-800 hover:bg-white shadow-lg"
                        }`}
                      >
                        <ChevronRight className="h-6 w-6 stroke-[2.5]" />
                      </button>
                    )}
                  </div>
                </div>
              );
            }

            // 2. SECTION: NOVIDADES & LANÇAMENTOS
            if (sec.id === "launches" && newArrivalsProducts.length > 0) {
              return (
                <div
                  key={sec.id}
                  id="launches-campaign-section"
                  className="space-y-6"
                >
                  <div
                    className={`flex justify-between items-center border-b pb-4 ${
                      isDark ? "border-slate-800/80" : "border-slate-200/80"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-500">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div>
                        <h2
                          className={`text-xl font-black tracking-tight ${isDark ? "text-slate-100" : "text-slate-900"}`}
                        >
                          {sec.name || "Novidades & Lançamentos"}
                        </h2>
                        <p className="text-xs text-slate-400">
                          {sec.description ||
                            "As últimas tendências da estação"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Carousel Container */}
                  <div className="relative group/carousel">
                    {newArrivalsProducts.length > cardsPerPage && (
                      <button
                        onClick={() =>
                          setCurrentLaunchIndex((prev) => Math.max(0, prev - 1))
                        }
                        disabled={activeLaunchIndex === 0}
                        className={`absolute top-1/2 -translate-y-1/2 -left-3 sm:-left-5 z-30 flex items-center justify-center h-11 w-11 rounded-full border backdrop-blur-xl transition-all duration-200 cursor-pointer shadow-xl ${
                          activeLaunchIndex === 0
                            ? "opacity-0 pointer-events-none scale-90"
                            : isDark
                              ? "bg-slate-900/90 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-amber-400"
                              : "bg-white/90 border-slate-200 text-slate-800 hover:bg-white shadow-lg"
                        }`}
                      >
                        <ChevronLeft className="h-6 w-6 stroke-[2.5]" />
                      </button>
                    )}

                    <div className="relative overflow-hidden py-3 px-1">
                      <motion.div
                        className="flex -mx-3 transition-transform duration-500 ease-out"
                        style={{
                          transform: `translateX(-${activeLaunchIndex * (100 / cardsPerPage)}%)`,
                        }}
                      >
                        {newArrivalsProducts.map((prod) => (
                          <div
                            key={prod.id}
                            className="shrink-0 px-3"
                            style={{ width: `${100 / cardsPerPage}%` }}
                          >
                            <ProductCard
                              product={prod}
                              theme={theme}
                              isFavorite={favorites.includes(prod.id)}
                              onToggleFavorite={toggleFavorite}
                              onViewDetails={handleVerDetalhes}
                            />
                          </div>
                        ))}
                      </motion.div>
                    </div>

                    {newArrivalsProducts.length > cardsPerPage && (
                      <button
                        onClick={() =>
                          setCurrentLaunchIndex((prev) =>
                            Math.min(
                              prev + 1,
                              newArrivalsProducts.length - cardsPerPage,
                            ),
                          )
                        }
                        disabled={activeLaunchIndex >= maxLaunchIndex}
                        className={`absolute top-1/2 -translate-y-1/2 -right-3 sm:-right-5 z-30 flex items-center justify-center h-11 w-11 rounded-full border backdrop-blur-xl transition-all duration-200 cursor-pointer shadow-xl ${
                          activeLaunchIndex >= maxLaunchIndex
                            ? "opacity-0 pointer-events-none scale-90"
                            : isDark
                              ? "bg-slate-900/90 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-amber-400"
                              : "bg-white/90 border-slate-200 text-slate-800 hover:bg-white shadow-lg"
                        }`}
                      >
                        <ChevronRight className="h-6 w-6 stroke-[2.5]" />
                      </button>
                    )}
                  </div>
                </div>
              );
            }

            // 3. SECTION: CALÇADOS PREMIUM
            if (sec.id === "shoes" && shoesProducts.length > 0) {
              const visibleShoesProducts = shoesProducts.slice(0, visibleShoesCount);

              return (
                <div
                  key={sec.id}
                  id="shoes-category-section"
                  className="space-y-6"
                >
                  <div
                    className={`flex justify-between items-center border-b pb-4 ${
                      isDark ? "border-slate-800/80" : "border-slate-200/80"
                    }`}
                  >
                    <div>
                      <h2
                        className={`text-xl font-black tracking-tight ${isDark ? "text-slate-100" : "text-slate-900"}`}
                      >
                        {sec.name || "Calçados Premium"}
                      </h2>
                      <p className="text-xs text-slate-400">
                        {sec.description ||
                          "Conforto, durabilidade e estilo para todas as ocasiões"}
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-400">
                      ({shoesProducts.length} itens)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-2">
                    {visibleShoesProducts.map((prod) => (
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

                  {shoesProducts.length > visibleShoesCount && (
                    <div className="flex flex-col items-center justify-center pt-4 pb-2 space-y-2">
                      <p className="text-xs font-semibold text-slate-400">
                        Exibindo {visibleShoesProducts.length} de {shoesProducts.length} calçados
                      </p>
                      <button
                        onClick={() => setVisibleShoesCount((prev) => prev + ITEMS_PER_PAGE)}
                        className={`px-8 py-3 rounded-2xl text-xs font-bold transition-all shadow-md flex items-center space-x-2 cursor-pointer ${
                          isDark
                            ? "bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-amber-400/10 font-extrabold"
                            : "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20"
                        }`}
                      >
                        <span>Carregar Mais Calçados ({shoesProducts.length - visibleShoesCount} restantes)</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            // 4. SECTION: ACESSÓRIOS DE COURO
            if (sec.id === "accessories" && accessoriesProducts.length > 0) {
              const visibleAccProducts = accessoriesProducts.slice(0, visibleAccCount);

              return (
                <div
                  key={sec.id}
                  id="accessories-category-section"
                  className="space-y-6"
                >
                  <div
                    className={`flex justify-between items-center border-b pb-4 ${
                      isDark ? "border-slate-800/80" : "border-slate-200/80"
                    }`}
                  >
                    <div>
                      <h2
                        className={`text-xl font-black tracking-tight ${isDark ? "text-slate-100" : "text-slate-900"}`}
                      >
                        {sec.name || "Acessórios"}
                      </h2>
                      <p className="text-xs text-slate-400">
                        {sec.description ||
                          "Cintos, carteiras e bolsas em couro nobre"}
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-400">
                      ({accessoriesProducts.length} itens)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-2">
                    {visibleAccProducts.map((prod) => (
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

                  {accessoriesProducts.length > visibleAccCount && (
                    <div className="flex flex-col items-center justify-center pt-4 pb-2 space-y-2">
                      <p className="text-xs font-semibold text-slate-400">
                        Exibindo {visibleAccProducts.length} de {accessoriesProducts.length} acessórios
                      </p>
                      <button
                        onClick={() => setVisibleAccCount((prev) => prev + ITEMS_PER_PAGE)}
                        className={`px-8 py-3 rounded-2xl text-xs font-bold transition-all shadow-md flex items-center space-x-2 cursor-pointer ${
                          isDark
                            ? "bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-amber-400/10 font-extrabold"
                            : "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20"
                        }`}
                      >
                        <span>Carregar Mais Acessórios ({accessoriesProducts.length - visibleAccCount} restantes)</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            // 5. RENDERIZADOR GENÉRICO PARA SEÇÕES PERSONALIZADAS DO ADMIN
            const customMatchedProducts = baseFilteredProducts.filter(
              (p) =>
                p.category.toLowerCase().includes(sec.id.toLowerCase()) ||
                p.category.toLowerCase().includes((sec.name || "").toLowerCase()) ||
                (sec.name || "").toLowerCase().includes(p.category.toLowerCase()),
            );

            if (customMatchedProducts.length > 0) {
              return (
                <div key={sec.id} className="space-y-6">
                  <div
                    className={`flex justify-between items-center border-b pb-4 ${
                      isDark ? "border-slate-800/80" : "border-slate-200/80"
                    }`}
                  >
                    <div>
                      <h2
                        className={`text-xl font-black tracking-tight ${
                          isDark ? "text-slate-100" : "text-slate-900"
                        }`}
                      >
                        {sec.name}
                      </h2>
                      {sec.description && (
                        <p className="text-xs text-slate-400">
                          {sec.description}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-400">
                      ({customMatchedProducts.length} itens)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-2">
                    {customMatchedProducts.slice(0, 8).map((prod) => (
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
              );
            }

            return null;
          })}
        </div>
      )}
    </section>
  );
};
