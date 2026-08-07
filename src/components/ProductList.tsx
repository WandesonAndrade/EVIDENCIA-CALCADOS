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
  ArrowRight,
  ArrowUpDown,
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
    setSearchQuery,
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

  const handleVerDetalhes = (prod: Product) => {
    setSelectedProduct(prod);
    setCurrentView("product-detail");
  };

  const formatNumber = (num: number) => num.toString().padStart(2, "0");

  // Extrai o código numérico do grupo pai localizado antes do ponto na chave classificacao (ex: "002" de "002.003")
  const getParentGroupCode = (classificacao?: string): string => {
    if (!classificacao || typeof classificacao !== "string") return "";
    const clean = classificacao.replace(/\s+/g, "").trim();
    if (!clean) return "";
    const parts = clean.split(".");
    return parts[0] ? parts[0].trim() : "";
  };

  // Função de filtro oficial baseada na 'classificacao' (Código do Grupo Pai antes do ponto)
  const matchesFilter = useCallback((p: Product) => {
    // 1. Validação do Grupo / Categoria por 'classificacao' (Número antes do ponto)
    if (selectedCategory && selectedCategory !== "TODOS") {
      const target = selectedCategory.trim();
      const targetUpper = target.toUpperCase();

      // Resolver o código numérico do grupo (ID pai antes do ponto)
      let targetCode = "";
      const matchedCat = (dbCategories || []).find(
        (c) =>
          c.id === target ||
          (c.code && c.code === target) ||
          c.name.toUpperCase().trim() === targetUpper ||
          normalizeCategoryName(c.name).toUpperCase().trim() === normalizeCategoryName(targetUpper)
      );

      if (matchedCat) {
        targetCode = matchedCat.code || matchedCat.id;
      } else if (/^\d+$/.test(target)) {
        targetCode = target;
      }

      // Extrair o código antes do ponto do produto (ex: "002" de "002.003")
      const pParentCode = getParentGroupCode(p.classificacao);

      let catMatch = false;

      // Regra 1 (Prioritária): Comparar código numérico antes do ponto
      if (targetCode && pParentCode) {
        catMatch = pParentCode === targetCode;
      }

      // Fallback: Se o produto não possui classificacao numérica ou não bateu por código, comparar nome da categoria
      if (!catMatch) {
        const grupoRaw = (p.nome_grupo || p.category || "").toUpperCase().trim();
        const grupoNorm = normalizeCategoryName(p.nome_grupo || p.category || "").toUpperCase().trim();
        const catNorm = normalizeCategoryName(p.category || "").toUpperCase().trim();

        catMatch =
          grupoRaw === targetUpper ||
          grupoNorm === targetUpper ||
          catNorm === targetUpper ||
          (grupoNorm && (grupoNorm.includes(targetUpper) || targetUpper.includes(grupoNorm))) ||
          (grupoRaw && (grupoRaw.includes(targetUpper) || targetUpper.includes(grupoRaw)));
      }

      if (!catMatch) return false;
    }

    // 2. Validação do Subgrupo / Subcategoria
    if (selectedSubcategory && selectedSubcategory !== "TODAS" && selectedSubcategory !== "TODOS") {
      const targetSub = selectedSubcategory.trim();
      const targetSubUpper = targetSub.toUpperCase();

      // Código da subcategoria (depois do ponto)
      let pSubCode = "";
      if (p.classificacao && p.classificacao.includes(".")) {
        const parts = p.classificacao.replace(/\s+/g, "").split(".");
        if (parts.length > 1) pSubCode = parts[1].trim();
      }

      let subMatch = false;

      // Comparação por subCode/ID de subcategoria (ex: "002.003" ou "003")
      if (pSubCode && (/^\d+$/.test(targetSub) || targetSub.includes("."))) {
        subMatch = p.classificacao === targetSub || pSubCode === targetSub || targetSub.endsWith("." + pSubCode);
      }

      // Comparação por nome da subcategoria
      if (!subMatch) {
        const subgrupoRaw = (p.nome_subgrupo || p.subcategory || "").toUpperCase().trim();
        const subgrupoNorm = normalizeSubcategoryName(p.nome_subgrupo || p.subcategory || "").toUpperCase().trim();
        const subNorm = normalizeSubcategoryName(p.subcategory || "").toUpperCase().trim();

        subMatch =
          subgrupoRaw === targetSubUpper ||
          subgrupoNorm === targetSubUpper ||
          subNorm === targetSubUpper ||
          (subgrupoNorm && (subgrupoNorm.includes(targetSubUpper) || targetSubUpper.includes(subgrupoNorm))) ||
          (subgrupoRaw && (subgrupoRaw.includes(targetSubUpper) || targetSubUpper.includes(subgrupoRaw)));
      }

      if (!subMatch) return false;
    }

    return true;
  }, [selectedCategory, selectedSubcategory, dbCategories]);

  // Filtra os produtos pela busca do usuário e visibilidade/estoque
  const baseFilteredProducts = products.filter((prod) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      prod.name.toLowerCase().includes(query) ||
      prod.description.toLowerCase().includes(query) ||
      (prod.nome_grupo && prod.nome_grupo.toLowerCase().includes(query)) ||
      (prod.nome_subgrupo && prod.nome_subgrupo.toLowerCase().includes(query)) ||
      prod.category.toLowerCase().includes(query) ||
      (prod.subcategory && prod.subcategory.toLowerCase().includes(query));
    const isAvailable = (prod.stock !== undefined ? prod.stock > 0 : (prod.saldo_loja ?? 0) > 0);
    return matchesSearch && prod.visible && isAvailable;
  });

  const matchingCatalog = useMemo(() => {
    return baseFilteredProducts.filter(matchesFilter);
  }, [baseFilteredProducts, matchesFilter]);

  const [sortBy, setSortBy] = useState<"relevant" | "price-asc" | "price-desc" | "launches">("relevant");

  const sortedCatalog = useMemo(() => {
    const items = [...matchingCatalog];
    if (sortBy === "price-asc") {
      return items.sort((a, b) => a.price - b.price);
    }
    if (sortBy === "price-desc") {
      return items.sort((a, b) => b.price - a.price);
    }
    if (sortBy === "launches") {
      return items.sort((a, b) => (b.newArrival ? 1 : 0) - (a.newArrival ? 1 : 0));
    }
    return items;
  }, [matchingCatalog, sortBy]);



  const offersProducts = matchingCatalog.filter((p) => p.onSale);

  const newArrivalsProducts = matchingCatalog.filter((p) => Boolean(p.newArrival));

  const shoesProducts = matchingCatalog.filter((p) => {
    const groupUpper = (p.nome_grupo || p.category || "").toUpperCase();
    return !groupUpper.includes("ACESSÓRIO") && !groupUpper.includes("ACESSORIO");
  });

  const accessoriesProducts = matchingCatalog.filter((p) => {
    const groupUpper = (p.nome_grupo || p.category || "").toUpperCase();
    return groupUpper.includes("ACESSÓRIO") || groupUpper.includes("ACESSORIO");
  });

  const totalFilteredCount = matchingCatalog.length;
  const maxIndex = Math.max(0, offersProducts.length - cardsPerPage);
  const activeIndex = Math.min(currentIndex, maxIndex);

  const maxLaunchIndex = Math.max(0, newArrivalsProducts.length - cardsPerPage);
  const activeLaunchIndex = Math.min(currentLaunchIndex, maxLaunchIndex);

  // Nível 1: Extração de Grupos para Categorias (centrado em nome_grupo)
  const categoriesList = useMemo(() => {
    const uniqueMap = new Map<string, string>();
    (dbCategories || []).forEach((cat) => {
      if (cat && cat.name) {
        const norm = normalizeCategoryName(cat.name);
        if (norm) uniqueMap.set(norm.toUpperCase(), norm);
      }
    });
    return Array.from(uniqueMap.values());
  }, [dbCategories]);

  const primaryCategories = useMemo(() => {
    return categoriesList.slice(0, 6);
  }, [categoriesList]);

  const extraCategories = useMemo(() => {
    return categoriesList.slice(6);
  }, [categoriesList]);

  // Nível 2: Extração e Tratamento de Subgrupos para a Categoria/Grupo selecionado
  const availableSubcategories = useMemo(() => {
    const subMap = new Map<string, string>();

    // Subcategorias associadas no dbCategories para a categoria ativa
    if (selectedCategory !== "TODOS") {
      const target = selectedCategory.trim().toUpperCase();
      const foundCat = (dbCategories || []).find(
        (c) =>
          c.id === target ||
          c.code === target ||
          c.name.toUpperCase().trim() === target ||
          normalizeCategoryName(c.name).toUpperCase().trim() === normalizeCategoryName(target)
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

    // Subgrupos dos produtos pertencentes ao grupo ativo
    (products || []).forEach((p) => {
      let isCategoryMatch = false;
      if (selectedCategory === "TODOS") {
        isCategoryMatch = true;
      } else {
        const target = selectedCategory.trim().toUpperCase();
        let targetCode = "";
        const matchedCat = (dbCategories || []).find(
          (c) =>
            c.id === target ||
            c.code === target ||
            c.name.toUpperCase().trim() === target ||
            normalizeCategoryName(c.name).toUpperCase().trim() === normalizeCategoryName(target)
        );
        if (matchedCat) {
          targetCode = matchedCat.code || matchedCat.id;
        } else if (/^\d+$/.test(target)) {
          targetCode = target;
        }
        const pParentCode = getParentGroupCode(p.classificacao);
        if (targetCode && pParentCode) {
          isCategoryMatch = pParentCode === targetCode;
        } else {
          const pGrupoNorm = normalizeCategoryName(p.nome_grupo || p.category || "").toUpperCase().trim();
          const pGrupoRaw = (p.nome_grupo || p.category || "").toUpperCase().trim();
          isCategoryMatch = pGrupoNorm === target || pGrupoRaw === target;
        }
      }

      if (isCategoryMatch) {
        const rawSub = (p.nome_subgrupo || p.subcategory || p.subcategoria || "").trim();
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



  return (
    <section
      id="catalog-products-section"
      ref={catalogSectionRef}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10"
    >
      {/* CAIXA DE SUBCATEGORIAS & FILTROS DA VITRINE */}
      <div className={`p-4 sm:p-6 rounded-3xl border transition-all space-y-4 shadow-xs backdrop-blur-xl ${
        isDark ? 'bg-slate-900/70 border-slate-800/90' : 'bg-white/80 border-slate-200/90'
      }`}>
        {/* CABEÇALHO DO FILTRO DA VITRINE */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <span className={`text-xs font-black uppercase tracking-widest block ${isDark ? "text-amber-400" : "text-slate-800"}`}>
                {selectedCategory !== 'TODOS'
                  ? `Subcategorias • ${normalizeCategoryName(selectedCategory)}`
                  : 'Navegação por Subcategorias (Todos os Departamentos)'}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {selectedCategory !== 'TODOS'
                  ? `Filtre os subgrupos de ${normalizeCategoryName(selectedCategory)}`
                  : 'Selecione a subcategoria para refinar os produtos exibidos na vitrine'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {searchQuery && (
              <span
                className={`text-xs font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}
              >
                Busca por:{" "}
                <span
                  className={`${isDark ? "text-amber-400" : "text-slate-900"} font-bold`}
                >
                  "{searchQuery}"
                </span>
              </span>
            )}

            <span className={`text-xs font-black px-3.5 py-1.5 rounded-xl border flex items-center gap-1.5 ${
              isDark ? 'bg-slate-950 border-slate-800 text-amber-400' : 'bg-slate-100 border-slate-200 text-slate-800'
            }`}>
              <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              {totalFilteredCount} {totalFilteredCount === 1 ? 'produto encontrado' : 'produtos encontrados'}
            </span>
          </div>
        </div>

        {/* CONTROLES DA VITRINE: ORDENAÇÃO E CONTADOR */}
        <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-400">
              Mostrando <span className="font-extrabold text-slate-900 dark:text-slate-100">{totalFilteredCount}</span> {totalFilteredCount === 1 ? 'produto' : 'produtos'} {selectedCategory !== 'TODOS' ? `em ${normalizeCategoryName(selectedCategory)}` : 'em Todos os Departamentos'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <label htmlFor="sort-select" className="text-xs font-bold text-slate-400 flex items-center gap-1.5 shrink-0">
              <ArrowUpDown className="h-3.5 w-3.5 text-amber-500" />
              <span>Ordenar por:</span>
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400/50 ${
                isDark
                  ? "bg-slate-950 border-slate-800 text-slate-200 hover:border-amber-400/40"
                  : "bg-white border-slate-200 text-slate-800 hover:border-slate-300"
              }`}
            >
              <option value="relevant">Mais relevantes</option>
              <option value="price-asc">Menor preço</option>
              <option value="price-desc">Maior preço</option>
              <option value="launches">Lançamentos</option>
            </select>
          </div>
        </div>

        {/* PÍLULAS DE SUBCATEGORIAS (SUBGRUPOS ERP) DA CATEGORIA SELECIONADA NO HEADER */}
        {availableSubcategories.length > 0 && (
          <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
            {availableSubcategories.map((sub) => {
              const isSubSelected = selectedSubcategory === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSelectedSubcategory(sub.id)}
                  className={`whitespace-nowrap px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all duration-200 cursor-pointer border flex items-center gap-2 ${
                    isSubSelected
                      ? isDark
                        ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-[0_0_20px_rgba(245,158,11,0.35)] scale-105 z-10'
                        : 'bg-slate-900 text-white border-slate-900 font-black shadow-lg scale-105 z-10'
                      : isDark
                        ? 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/80 hover:text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {sub.label}
                </button>
              );
            })}
          </div>
        )}

        {/* BARRA DE FILTROS ATIVOS E ATALHO DE LIMPEZA GERAL */}
        {(selectedCategory !== 'TODOS' || selectedSubcategory !== 'TODAS' || searchQuery) && (
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Filtros Ativos:
            </span>
            {selectedCategory !== 'TODOS' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
                <span>Dep: {normalizeCategoryName(selectedCategory)}</span>
                <button 
                  type="button"
                  onClick={() => setSelectedCategory('TODOS')} 
                  className="hover:text-rose-500 cursor-pointer ml-1 font-black"
                  title="Remover filtro de departamento"
                >
                  ✕
                </button>
              </span>
            )}
            {selectedSubcategory !== 'TODAS' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
                <span>Sub: {selectedSubcategory}</span>
                <button 
                  type="button"
                  onClick={() => setSelectedSubcategory('TODAS')} 
                  className="hover:text-rose-500 cursor-pointer ml-1 font-black"
                  title="Remover filtro de subcategoria"
                >
                  ✕
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
                <span>Busca: "{searchQuery}"</span>
                <button 
                  type="button"
                  onClick={() => setSearchQuery && setSearchQuery('')} 
                  className="hover:text-rose-500 cursor-pointer ml-1 font-black"
                  title="Limpar busca"
                >
                  ✕
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('TODOS');
                setSelectedSubcategory('TODAS');
                if (setSearchQuery) setSearchQuery('');
              }}
              className="text-[10px] font-extrabold text-rose-500 hover:underline cursor-pointer ml-auto"
            >
              Limpar Todos os Filtros ✕
            </button>
          </div>
        )}
      </div>

      {/* BANNER DE DESTAQUE: CREDIÁRIO PRÓPRIO EVIDÊNCIA */}
      <CrediarioBanner />

      {/* Skeleton Loading State */}
      {isLoadingProducts ? (
        <div className="space-y-8 py-4">
          {/* Skeleton de Pílulas de Subcategoria */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className={`h-9 w-28 rounded-2xl animate-pulse shrink-0 ${
                  isDark ? "bg-slate-900/60 border border-slate-800" : "bg-slate-200/60 border border-slate-200"
                }`}
              />
            ))}
          </div>

          {/* Skeleton de Cards de Produtos (2 cols mobile, 3 tablet, 4 desktop) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div
                key={n}
                className={`border rounded-2xl p-4 animate-pulse space-y-4 ${
                  isDark
                    ? "bg-slate-900/40 border-slate-800/80"
                    : "bg-white/70 border-slate-200/80"
                }`}
              >
                <div
                  className={`aspect-square w-full rounded-xl ${isDark ? "bg-slate-800/60" : "bg-slate-200/60"}`}
                />
                <div
                  className={`h-4 rounded-md w-3/4 ${isDark ? "bg-slate-800/60" : "bg-slate-200/60"}`}
                />
                <div
                  className={`h-5 rounded-md w-1/2 ${isDark ? "bg-slate-800/60" : "bg-slate-200/60"}`}
                />
                <div
                  className={`h-10 rounded-xl w-full ${isDark ? "bg-slate-800/60" : "bg-slate-200/60"}`}
                />
              </div>
            ))}
          </div>
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
      ) : selectedCategory !== "TODOS" || selectedSubcategory !== "TODAS" || searchQuery ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                {selectedCategory !== "TODOS" ? normalizeCategoryName(selectedCategory) : "Resultado da Busca"}
                {selectedSubcategory !== "TODAS" && (
                  <span className="text-amber-500 text-sm ml-2 font-bold">• {selectedSubcategory}</span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                {sortedCatalog.length} {sortedCatalog.length === 1 ? "produto encontrado" : "produtos encontrados"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 py-2">
            {sortedCatalog.map((prod) => (
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

            // 3. RENDERIZADOR DINÂMICO DE SEÇÕES DE CATEGORIA (Calçados, Acessórios, Cosméticos, Perfumes, Escolar, etc.)
            const catDoc = (dbCategories || []).find(
              (c) =>
                c.id === sec.id ||
                (c.code && c.code === sec.id) ||
                c.name.toUpperCase().trim() === (sec.name || "").toUpperCase().trim() ||
                normalizeCategoryName(c.name).toUpperCase().trim() === normalizeCategoryName(sec.name || "").toUpperCase().trim()
            );

            const catCode = catDoc?.code || catDoc?.id || "";

            const categoryMatchedProducts = matchingCatalog.filter((p) => {
              const pCode = getParentGroupCode(p.classificacao);
              if (catCode && pCode) {
                return pCode === catCode;
              }

              const pCatNorm = normalizeCategoryName(p.nome_grupo || p.category || "").toUpperCase();
              const pGrupoRaw = (p.nome_grupo || p.category || "").toUpperCase();
              const secNameNorm = normalizeCategoryName(sec.name || "").toUpperCase();
              const secIdUpper = (sec.id || "").toUpperCase();

              return (
                pCatNorm === secNameNorm ||
                pCatNorm === secIdUpper ||
                pGrupoRaw.includes(secNameNorm) ||
                secNameNorm.includes(pCatNorm)
              );
            });

            if (categoryMatchedProducts.length > 0) {
              const subcategoriesList = Array.isArray(catDoc?.subcategories) ? catDoc.subcategories : [];

              return (
                <div key={sec.id} className="space-y-6">
                  {/* Cabeçalho da Seção */}
                  <div
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 ${
                      isDark ? "border-slate-800/80" : "border-slate-200/80"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-500">
                        <Layers className="h-5 w-5" />
                      </div>
                      <div>
                        <h2
                          className={`text-xl font-black tracking-tight ${
                            isDark ? "text-slate-100" : "text-slate-900"
                          }`}
                        >
                          {catDoc?.name || sec.name}
                        </h2>
                        <p className="text-xs text-slate-400">
                          {sec.description || catDoc?.description || `Coleção exclusiva de ${catDoc?.name || sec.name}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 sm:space-x-4">
                      <span className="text-xs font-mono font-bold text-slate-400">
                        ({categoryMatchedProducts.length} itens)
                      </span>
                      <button
                        onClick={() => handleSelectCategory(catDoc?.name || sec.name)}
                        className={`text-xs font-extrabold transition-all flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full border cursor-pointer ${
                          isDark
                            ? "bg-slate-900/80 text-amber-400 border-amber-400/30 hover:bg-amber-400/10"
                            : "bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200"
                        }`}
                      >
                        <span>Ver Todos</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Pílulas de Subcategorias da Categoria */}
                  {subcategoriesList.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 shrink-0">
                        Subcategorias:
                      </span>
                      {subcategoriesList.map((sub) => (
                        <button
                          key={sub.id || sub.subCode || sub.name}
                          onClick={() => {
                            handleSelectCategory(catDoc?.name || sec.name);
                            setSelectedSubcategory(sub.name);
                          }}
                          className={`text-[11px] font-bold px-3 py-1 rounded-full border transition-all shrink-0 cursor-pointer ${
                            isDark
                              ? "bg-slate-900/80 border-slate-800 text-slate-300 hover:border-amber-400/50 hover:text-amber-400"
                              : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {sub.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Grade de Produtos */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-2">
                    {categoryMatchedProducts.slice(0, 8).map((prod) => (
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
