import React, { useState, useCallback } from "react";
import { useApp } from "../context/AppContext";
import {
  ShoppingBag,
  Search,
  User,
  LogOut,
  History,
  ChevronDown,
  Heart,
  Sun,
  Moon,
  Shield,
  CreditCard,
  Truck,
  RefreshCw,
  MessageSquare,
  MapPin,
  Menu,
  ShieldCheck,
  Headphones,
  Tag,
  Sparkles,
  ChevronRight,
  Gift,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BrandLogo } from "./BrandLogo";
import { CompleteProfileModal } from "./CompleteProfileModal";
import { CategorySandwichMenu } from "./CategorySandwichMenu";
import { checkIsProfileComplete } from "../App";
import { scrollToSectionWithOffset } from "../lib/scrollUtils";
import { normalizeCategoryName, normalizeSubcategoryName, isProductInCategory } from "../services/moblinkCategoriesService";
import { hasProductValidPhoto } from "../services/moblinkProductsService";

export const Header: React.FC = () => {
  const {
    cart,
    currentUser,
    currentAdminUser,
    logout,
    currentView,
    setCurrentView,
    searchQuery,
    setSearchQuery,
    selectedMenuTab,
    setSelectedMenuTab,
    selectedCategory,
    setSelectedCategory,
    selectedSubcategory = "TODAS",
    setSelectedSubcategory,
    favorites = [],
    theme,
    toggleTheme,
    categories = [],
    products = [],
    saldaoConfig,
  } = useApp();

  const isDark = theme === "dark";
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSandwichMenuOpen, setIsSandwichMenuOpen] = useState(false);
  const [activeMegaMenu, setActiveMegaMenu] = useState<'feminino' | 'masculino' | 'infantil' | null>(null);
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleNavMouseEnter = (menuKey: 'feminino' | 'masculino' | 'infantil') => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setActiveMegaMenu(menuKey);
  };

  const handleNavMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setActiveMegaMenu(null);
    }, 180);
  };

  const handleMegaMenuCategoryClick = (categoryName: string, subcategoryName: string) => {
    setActiveMegaMenu(null);
    if (categoryName.toUpperCase() === "OFERTAS") {
      setSelectedCategory("OFERTAS");
      if (setSelectedMenuTab) setSelectedMenuTab("ofertas");
      if (setSelectedSubcategory) setSelectedSubcategory("TODAS");
    } else if (categoryName.toUpperCase() === "TODOS") {
      setSelectedCategory("TODOS");
      if (setSelectedMenuTab) setSelectedMenuTab("todos");
      if (setSelectedSubcategory) setSelectedSubcategory(subcategoryName);
    } else {
      setSelectedCategory(categoryName);
      if (setSelectedMenuTab) setSelectedMenuTab(categoryName.toLowerCase());
      if (setSelectedSubcategory) setSelectedSubcategory(subcategoryName);
    }
    setCurrentView("category-page");
    setTimeout(() => {
      scrollToSectionWithOffset("category-all-items-section");
    }, 100);
  };

  const checkHasProductsWithPhoto = useCallback(
    (
      catTarget: string,
      subTarget: string,
      audience: 'feminino' | 'masculino' | 'infantil'
    ): boolean => {
      if (!products || products.length === 0) return true;

      const cleanSub = subTarget.trim().toUpperCase();
      const cleanCat = catTarget.trim().toUpperCase();

      return products.some((prod) => {
        if (prod.visible === false) return false;

        const hasStock = prod.stock !== undefined ? prod.stock > 0 : (prod.saldo_loja ?? 0) > 0;
        if (!hasStock) return false;

        if (!hasProductValidPhoto(prod)) return false;

        if (cleanCat !== "TODOS" && cleanCat !== "OFERTAS") {
          if (!isProductInCategory(prod, cleanCat)) return false;
        }

        const pCat = (prod.category || "").toUpperCase();
        const pGrupo = (prod.nome_grupo || "").toUpperCase();
        const pSub = (prod.nome_subgrupo || prod.subcategory || "").toUpperCase();
        const pName = (prod.name || "").toUpperCase();
        const normSub = normalizeSubcategoryName(pSub).toUpperCase();

        if (audience === "feminino") {
          const isFem =
            pSub.includes("FEMININ") ||
            normSub.includes("FEMININ") ||
            pCat.includes("FEMININ") ||
            pGrupo.includes("FEMININ") ||
            pName.includes("FEMININ") ||
            pName.includes("FEMINA") ||
            pName.includes("FEM ");
          if (!isFem && (pSub.includes("MASCULIN") || pCat.includes("MASCULIN"))) return false;
          if (!isFem && !cleanCat.includes("CALÇADO") && !cleanCat.includes("CALCADO")) {
            if (!pName.includes("FEMININ") && !pName.includes("FEM") && !pSub.includes("FEMININ")) {
              if (pName.includes("MASCULIN") || pSub.includes("MASCULIN")) return false;
            }
          }
        } else if (audience === "masculino") {
          const isMasc =
            pSub.includes("MASCULIN") ||
            normSub.includes("MASCULIN") ||
            pCat.includes("MASCULIN") ||
            pGrupo.includes("MASCULIN") ||
            pName.includes("MASCULIN") ||
            pName.includes("MASCULINO") ||
            pName.includes("MASC ");
          if (!isMasc && (pSub.includes("FEMININ") || pCat.includes("FEMININ"))) return false;
        } else if (audience === "infantil") {
          const isInf =
            pSub.includes("INFANTIL") ||
            normSub.includes("INFANTIL") ||
            pCat.includes("INFANTIL") ||
            pGrupo.includes("INFANTIL") ||
            pName.includes("INFANTIL") ||
            pSub.includes("BEBÊ") ||
            pSub.includes("BEBE") ||
            pName.includes("INFANTIL");
          if (!isInf) return false;
        }

        if (
          cleanSub === "FEMININO" ||
          cleanSub === "MASCULINO" ||
          cleanSub === "INFANTIL" ||
          cleanSub === "INFANTIL FEMININO" ||
          cleanSub === "INFANTIL MASCULINO" ||
          cleanSub === "BEBÊ" ||
          cleanSub === "ESCOLAR" ||
          cleanSub === "TODAS"
        ) {
          return true;
        }

        const subKeywords: string[] = [];
        if (cleanSub.includes("SANDÁLIA") || cleanSub.includes("SANDALIA")) subKeywords.push("SANDÁLIA", "SANDALIA");
        else if (cleanSub.includes("RASTEIRA") || cleanSub.includes("PAPETE")) subKeywords.push("RASTEIRA", "PAPETE");
        else if (cleanSub.includes("TÊNIS") || cleanSub.includes("TENIS")) subKeywords.push("TÊNIS", "TENIS", "SNEAKER");
        else if (cleanSub.includes("SAPATILHA")) subKeywords.push("SAPATILHA");
        else if (cleanSub.includes("SCARPIN") || cleanSub.includes("SALTO")) subKeywords.push("SCARPIN", "SALTO");
        else if (cleanSub.includes("BOTA") || cleanSub.includes("COTURNO")) subKeywords.push("BOTA", "COTURNO");
        else if (cleanSub.includes("CHINELO") || cleanSub.includes("SLIDE")) subKeywords.push("CHINELO", "SLIDE");
        else if (cleanSub.includes("MOCASSIM") || cleanSub.includes("SAPATO") || cleanSub.includes("DRIVERS")) subKeywords.push("MOCASSIM", "SAPATO", "DRIVER");
        else if (cleanSub.includes("BLUSA") || cleanSub.includes("CAMISA")) subKeywords.push("BLUSA", "CAMISA", "REGATA", "TOP");
        else if (cleanSub.includes("VESTIDO") || cleanSub.includes("MACACÃO") || cleanSub.includes("MACACAO")) subKeywords.push("VESTIDO", "MACACÃO", "MACACAO");
        else if (cleanSub.includes("CALÇA") || cleanSub.includes("CALCA") || cleanSub.includes("JEANS")) subKeywords.push("CALÇA", "CALCA", "JEANS");
        else if (cleanSub.includes("SHORT") || cleanSub.includes("SAIA") || cleanSub.includes("BERMUDA")) subKeywords.push("SHORT", "SAIA", "BERMUDA");
        else if (cleanSub.includes("JAQUETA") || cleanSub.includes("CASACO") || cleanSub.includes("MOLETON")) subKeywords.push("JAQUETA", "CASACO", "MOLETON", "BLAZER");
        else if (cleanSub.includes("BOLSA")) subKeywords.push("BOLSA");
        else if (cleanSub.includes("CARTEIRA")) subKeywords.push("CARTEIRA");
        else if (cleanSub.includes("CINTO")) subKeywords.push("CINTO");
        else if (cleanSub.includes("MOCHILA") || cleanSub.includes("NÉCESSAIRE") || cleanSub.includes("NECESSAIRE")) subKeywords.push("MOCHILA", "NECESSAIRE", "ESTOJO");
        else if (cleanSub.includes("PERFUME")) subKeywords.push("PERFUME", "FRAGRÂNCIA", "FRAGRANCIA");
        else if (cleanSub.includes("COLÔNIA") || cleanSub.includes("COLONIA")) subKeywords.push("COLÔNIA", "COLONIA");
        else if (cleanSub.includes("BODY SPLASH")) subKeywords.push("BODY SPLASH", "SPLASH");
        else if (cleanSub.includes("COSMÉTICO") || cleanSub.includes("COSMETICO") || cleanSub.includes("CUIDADOS") || cleanSub.includes("BARBEARIA")) subKeywords.push("COSMÉTICO", "COSMETICO", "CREME", "LOÇÃO", "LOCAO", "BARBA");

        if (subKeywords.length > 0) {
          return subKeywords.some((kw) => pSub.includes(kw) || normSub.includes(kw) || pName.includes(kw));
        }

        return pSub.includes(cleanSub) || normSub.includes(cleanSub) || pName.includes(cleanSub);
      });
    },
    [products]
  );

  const MEGAMENU_DATA: Record<'feminino' | 'masculino' | 'infantil', {
    title: string;
    badge: string;
    bannerTitle: string;
    bannerSubtitle: string;
    sections: {
      title: string;
      category: string;
      items: { name: string; category: string; subcategory: string }[];
    }[];
  }> = {
    feminino: {
      title: "Feminino",
      badge: "Coleção Feminina",
      bannerTitle: "Tudo para o Universo Feminino",
      bannerSubtitle: "Calçados, Roupas, Bolsas, Perfumes e Acessórios com pronta entrega",
      sections: [
        {
          title: "Calçados Femininos",
          category: "Calçados",
          items: [
            { name: "Ver Todos os Calçados", category: "Calçados", subcategory: "Feminino" },
            { name: "Sandálias", category: "Calçados", subcategory: "Sandálias" },
            { name: "Rasteiras & Papetes", category: "Calçados", subcategory: "Rasteiras" },
            { name: "Tênis Femininos", category: "Calçados", subcategory: "Tênis" },
            { name: "Sapatilhas", category: "Calçados", subcategory: "Sapatilhas" },
            { name: "Scarpins & Saltos", category: "Calçados", subcategory: "Scarpins" },
            { name: "Botas & Coturnos", category: "Calçados", subcategory: "Botas" },
            { name: "Chinelos & Slides", category: "Calçados", subcategory: "Chinelos" },
            { name: "Mocassins & Sapatos", category: "Calçados", subcategory: "Mocassins" },
          ],
        },
        {
          title: "Moda & Vestuário",
          category: "Confecções",
          items: [
            { name: "Ver Toda Confecção", category: "Confecções", subcategory: "Feminino" },
            { name: "Blusas & Camisas", category: "Confecções", subcategory: "Feminino" },
            { name: "Vestidos & Macacões", category: "Confecções", subcategory: "Feminino" },
            { name: "Calças & Jeans", category: "Confecções", subcategory: "Feminino" },
            { name: "Shorts & Saias", category: "Confecções", subcategory: "Feminino" },
            { name: "Jaquetas & Casacos", category: "Confecções", subcategory: "Feminino" },
          ],
        },
        {
          title: "Bolsas & Acessórios",
          category: "Acessórios",
          items: [
            { name: "Ver Todos Acessórios", category: "Acessórios", subcategory: "Feminino" },
            { name: "Bolsas Femininas", category: "Acessórios", subcategory: "Bolsas" },
            { name: "Carteiras", category: "Acessórios", subcategory: "Carteiras" },
            { name: "Cintos", category: "Acessórios", subcategory: "Cintos" },
            { name: "Mochilas & Nécessaires", category: "Acessórios", subcategory: "Mochilas" },
          ],
        },
        {
          title: "Perfumes & Beleza",
          category: "Perfumes",
          items: [
            { name: "Ver Todos Perfumes", category: "Perfumes", subcategory: "Feminino" },
            { name: "Perfumes Femininos", category: "Perfumes", subcategory: "Feminino" },
            { name: "Colônias & Deo Colônias", category: "Perfumes", subcategory: "Colônias" },
            { name: "Body Splash", category: "Perfumes", subcategory: "Body Splash" },
            { name: "Cosméticos & Cuidados", category: "Perfumes", subcategory: "Cosméticos" },
          ],
        },
      ],
    },
    masculino: {
      title: "Masculino",
      badge: "Coleção Masculina",
      bannerTitle: "Estilo & Conforto Masculino",
      bannerSubtitle: "Tênis, Sapatos, Roupas, Carteiras, Relógios e Perfumes",
      sections: [
        {
          title: "Calçados Masculinos",
          category: "Calçados",
          items: [
            { name: "Ver Todos os Calçados", category: "Calçados", subcategory: "Masculino" },
            { name: "Tênis Masculinos", category: "Calçados", subcategory: "Tênis" },
            { name: "Sapatos & Sapatênis", category: "Calçados", subcategory: "Sapatos" },
            { name: "Botas & Coturnos", category: "Calçados", subcategory: "Botas" },
            { name: "Chinelos & Slides", category: "Calçados", subcategory: "Chinelos" },
            { name: "Mocassins & Drivers", category: "Calçados", subcategory: "Mocassins" },
            { name: "Sandálias & Papetes", category: "Calçados", subcategory: "Papetes" },
          ],
        },
        {
          title: "Moda & Vestuário",
          category: "Confecções",
          items: [
            { name: "Ver Toda Confecção", category: "Confecções", subcategory: "Masculino" },
            { name: "Camisetas & Polos", category: "Confecções", subcategory: "Masculino" },
            { name: "Camisas Sociais", category: "Confecções", subcategory: "Masculino" },
            { name: "Calças & Jeans", category: "Confecções", subcategory: "Masculino" },
            { name: "Bermudas & Shorts", category: "Confecções", subcategory: "Masculino" },
            { name: "Jaquetas & Moletons", category: "Confecções", subcategory: "Masculino" },
          ],
        },
        {
          title: "Acessórios Masculinos",
          category: "Acessórios",
          items: [
            { name: "Ver Todos Acessórios", category: "Acessórios", subcategory: "Masculino" },
            { name: "Carteiras em Couro", category: "Acessórios", subcategory: "Carteiras" },
            { name: "Cintos Masculinos", category: "Acessórios", subcategory: "Cintos" },
            { name: "Bonés & Chapéus", category: "Acessórios", subcategory: "Boné" },
            { name: "Relógios & Óculos", category: "Acessórios", subcategory: "Relógio" },
          ],
        },
        {
          title: "Perfumes & Barbearia",
          category: "Perfumes",
          items: [
            { name: "Ver Todos Perfumes", category: "Perfumes", subcategory: "Masculino" },
            { name: "Perfumes Masculinos", category: "Perfumes", subcategory: "Masculino" },
            { name: "Colônias & Deo Colônias", category: "Perfumes", subcategory: "Colônias" },
            { name: "Cuidados & Barbearia", category: "Perfumes", subcategory: "Cosméticos" },
          ],
        },
      ],
    },
    infantil: {
      title: "Infantil",
      badge: "Coleção Infantil & Bebê",
      bannerTitle: "Diversão & Conforto para os Pequenos",
      bannerSubtitle: "Calçados, Roupas e Mochilas para Meninas, Meninos e Bebês",
      sections: [
        {
          title: "Meninas (Infantil Fem)",
          category: "Calçados",
          items: [
            { name: "Ver Todos Menina", category: "Calçados", subcategory: "Infantil Feminino" },
            { name: "Tênis & Sapatilhas", category: "Calçados", subcategory: "Infantil Feminino" },
            { name: "Sandálias & Tamancos", category: "Calçados", subcategory: "Sandálias" },
            { name: "Chinelos & Botinhas", category: "Calçados", subcategory: "Chinelos" },
            { name: "Roupas Infantil Feminina", category: "Confecções", subcategory: "Infantil Feminino" },
          ],
        },
        {
          title: "Meninos (Infantil Masc)",
          category: "Calçados",
          items: [
            { name: "Ver Todos Menino", category: "Calçados", subcategory: "Infantil Masculino" },
            { name: "Tênis & Chuteiras", category: "Calçados", subcategory: "Infantil Masculino" },
            { name: "Papetes & Chinelos", category: "Calçados", subcategory: "Chinelos" },
            { name: "Botas & Sapatênis", category: "Calçados", subcategory: "Tênis" },
            { name: "Roupas Infantil Masculina", category: "Confecções", subcategory: "Infantil Masculino" },
          ],
        },
        {
          title: "Bebês (Primeiros Passos)",
          category: "Calçados",
          items: [
            { name: "Sapatinhos de Bebê", category: "Calçados", subcategory: "Bebê" },
            { name: "Modinha Bebê", category: "Confecções", subcategory: "Infantil" },
          ],
        },
        {
          title: "Escolar & Mochilas",
          category: "Escolar",
          items: [
            { name: "Mochilas Escolares", category: "Escolar", subcategory: "Escolar" },
            { name: "Estojos & Lancheiras", category: "Escolar", subcategory: "Escolar" },
          ],
        },
      ],
    },
  };

  const activeUser = currentAdminUser || currentUser;
  const isAuthorizedCollaborator = Boolean(
    activeUser &&
    (activeUser.role === "admin" ||
      activeUser.role === "seller" ||
      activeUser.isAuthorizedCollaborator),
  );

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleSubcategoryFilter = (subName: string, isPromo?: boolean) => {
    const cleanSub = subName.toUpperCase();
    if (cleanSub.includes("SALDÃO") || cleanSub.includes("SALDAO") || cleanSub.includes("OFERTA") || cleanSub.includes("PROMOÇ")) {
      setSelectedCategory("OFERTAS");
      if (setSelectedMenuTab) setSelectedMenuTab("ofertas");
      if (setSelectedSubcategory) setSelectedSubcategory("TODAS");
    } else {
      setSelectedCategory("CALÇADOS");
      if (setSelectedMenuTab) setSelectedMenuTab("calçados");
      if (setSelectedSubcategory) setSelectedSubcategory(subName);
    }
    setCurrentView("category-page");
    setTimeout(() => {
      scrollToSectionWithOffset("category-all-items-section");
    }, 100);
  };

  // Subcategorias focadas estritamente em CALÇADOS que possuem produtos ativos disponíveis
  const navCategories = React.useMemo(() => {
    const activeProducts = (products || []).filter(p => p.visible !== false);
    const subsWithProducts = new Set<string>();

    // 1. Subcategorias candidatas padrão de Calçados
    const defaultFootwear = [
      "Feminino",
      "Masculino",
      "Infantil",
      "Sandálias",
      "Tênis",
      "Rasteiras",
      "Saltos",
      "Sapatilhas",
      "Botas",
      "Chuteiras",
      "Mocassim"
    ];

    // 2. Registra subcategorias com produtos ativos reais no catálogo
    activeProducts.forEach((p) => {
      if (!p.category) return;
      const catNorm = p.category.trim().toUpperCase();
      const isFootwear = catNorm.includes("CALÇADO") || catNorm.includes("CALCADO") || catNorm.includes("SAPATO");

      if (isFootwear && p.subcategory) {
        const subNorm = normalizeSubcategoryName(p.subcategory);
        if (subNorm && subNorm.toUpperCase() !== "TODAS") {
          subsWithProducts.add(subNorm);
        }
      }
    });

    // 3. Valida subcategorias candidatas contra produtos ativos (ou por nome/descrição se categoria for calçados)
    defaultFootwear.forEach((cand) => {
      const candUpper = cand.toUpperCase();
      const hasMatchingProduct = activeProducts.some((p) => {
        const pCat = (p.category || "").toUpperCase();
        const pSub = (p.subcategory || "").toUpperCase();
        const pName = (p.name || "").toUpperCase();
        const isFootwear = pCat === "" || pCat.includes("CALÇADO") || pCat.includes("CALCADO") || pCat.includes("SAPATO");
        return isFootwear && (pSub.includes(candUpper) || pName.includes(candUpper));
      });

      if (hasMatchingProduct) {
        subsWithProducts.add(cand);
      }
    });

    // Fallback prudente: se a lista de produtos ainda estiver carregando, exibe as subcategorias principais
    const finalSubs = (activeProducts.length > 0 && subsWithProducts.size > 0)
      ? Array.from(subsWithProducts)
      : defaultFootwear;

    const uniqueNavs: { name: string; key: string; isPromo?: boolean }[] = finalSubs.map(name => ({
      name,
      key: name.toUpperCase(),
    }));

    // Verifica se existem produtos em promoção disponíveis no catálogo
    const hasPromoProducts = activeProducts.some(p => p.originalPrice && p.originalPrice > p.price);

    const resultNavs: { name: string; key: string; isPromo?: boolean }[] = [];

    resultNavs.push({ name: "Ofertas & Saldão", key: "OFERTAS", isPromo: true });
    resultNavs.push(...uniqueNavs);

    return resultNavs;
  }, [categories, products]);

  return (
    <header
      id="store-header"
      className="sticky top-0 z-40 w-full transition-all duration-300"
    >
      {/* 1. TOP ANNOUNCEMENT BAR (Faixa Azul Escura de Benefícios - Oculta no Mobile 'hidden sm:block') */}
      <div className={`hidden sm:block py-2 px-4 text-xs font-semibold shadow-xs border-b ${
        isDark ? "bg-slate-950 text-white border-slate-800" : "bg-[#002850] text-[#DDF1FF] border-white/10"
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Esquerda: Crediário Próprio */}
          <div className="flex items-center space-x-2">
            <CreditCard className="h-4 w-4 text-[#FFC928] shrink-0" />
            <span>
              <strong>Crediário Próprio</strong> em até 6x sem juros
            </span>
          </div>

          {/* Centro: Parcelamento Cartão */}
          <div className="hidden md:flex items-center space-x-2">
            <ShieldCheck className="h-4 w-4 text-[#DDF1FF] shrink-0" />
            <span>
              <strong>Até 10x sem juros</strong> no cartão
            </span>
          </div>

          {/* Direita: WhatsApp Oficial da Loja */}
          <a
            href="https://wa.me/5599984684867"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 hover:text-[#FFC928] transition-colors cursor-pointer"
            title="Falar no WhatsApp da Evidência Calçados"
          >
            <MessageSquare className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              <strong>WhatsApp</strong> (99) 98468-4867
            </span>
          </a>
        </div>
      </div>

      {/* 2. MAIN HEADER BAR (Azul Bem Forte Âncora Visual #003B73) */}
      <div
        className={`transition-all duration-300 ${
          isDark
            ? "bg-slate-950 border-b border-slate-800 text-white"
            : "bg-[#003B73] text-white shadow-md border-b border-white/10"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 gap-6">
            {/* Logo Oficial Evidência Calçados (Branca) */}
            <div className="flex items-center space-x-3 shrink-0">
              <button
                id="sandwich-menu-button-main"
                onClick={() => setIsSandwichMenuOpen(true)}
                className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center sm:hidden ${
                  isDark
                    ? "bg-slate-900 border-slate-800 text-amber-400"
                    : "bg-white/20 border-white/30 text-white hover:bg-white/30"
                }`}
                title="Abrir Menu de Departamentos"
              >
                <Menu className="h-5 w-5" />
              </button>
              <BrandLogo size="md" variant="white" />
            </div>

            {/* Barra de Pesquisa em Formato Pílula Translucida */}
            <div className="flex-1 max-w-xl mx-2 hidden sm:block">
              <div className="relative w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="O que você procura?"
                  className={`w-full pl-6 pr-12 py-3 text-xs sm:text-sm rounded-full focus:outline-none transition-all border ${
                    isDark
                      ? "bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-400 focus:border-amber-400"
                      : "bg-white/15 border-white/25 text-white placeholder-white/75 focus:bg-white focus:text-neutral-900 focus:placeholder-neutral-400 focus:border-white shadow-inner"
                  }`}
                />
                <Search className={`absolute right-4 top-3.5 h-4 w-4 ${
                  isDark ? "text-slate-400" : "text-white/80"
                }`} />
              </div>
            </div>

            {/* Ícones de Utilidade & Conta (Direita) - Ajustado para Perfeita Leitura no Mobile */}
            <div className="flex items-center space-x-2.5 sm:space-x-6 shrink-0">
              {/* Botão Meus Favoritos */}
              <button
                id="favorites-button"
                onClick={() => setCurrentView("favorites")}
                className={`flex flex-col items-center justify-center text-[11px] font-medium transition-all cursor-pointer group ${
                  currentView === "favorites"
                    ? "text-amber-300 font-bold"
                    : isDark
                      ? "text-slate-300 hover:text-white"
                      : "text-white/90 hover:text-white"
                }`}
                title="Meus Favoritos"
              >
                <div className="relative mb-0.5">
                  <Heart
                    className={`h-5.5 w-5.5 sm:h-6 sm:w-6 transition-transform group-hover:scale-110 ${
                      favorites.length > 0
                        ? "fill-rose-500 text-rose-500"
                        : isDark ? "text-slate-200" : "text-white"
                    }`}
                  />
                  {favorites.length > 0 && (
                    <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full">
                      {favorites.length}
                    </span>
                  )}
                </div>
                <span className="hidden sm:inline">Favoritos</span>
              </button>

              {/* Botão Carrinho de Compras (Garantido Visível em Telas Mobile) */}
              <button
                id="cart-button"
                onClick={() => setCurrentView("cart")}
                className={`flex flex-col items-center justify-center text-[11px] font-medium transition-all cursor-pointer group ${
                  currentView === "cart"
                    ? "text-amber-300 font-bold"
                    : isDark
                      ? "text-slate-300 hover:text-white"
                      : "text-white/90 hover:text-white"
                }`}
                title="Meu Carrinho de Compras"
              >
                <div className="relative mb-0.5">
                  <ShoppingBag className={`h-5.5 w-5.5 sm:h-6 sm:w-6 transition-transform group-hover:scale-110 ${
                    isDark ? "text-slate-200" : "text-white"
                  }`} />
                  <span className={`absolute -top-1.5 -right-2 text-[10px] font-black w-4.5 h-4.5 flex items-center justify-center rounded-full shadow-xs ${
                    isDark ? "bg-amber-400 text-black" : "bg-white text-[#003e92]"
                  }`}>
                    {totalItems}
                  </span>
                </div>
                <span className="hidden sm:inline">Carrinho</span>
              </button>

              {/* Alternador de Tema Escuro/Claro */}
              <button
                id="theme-toggle-button"
                onClick={toggleTheme}
                className={`p-1.5 rounded-full transition-all cursor-pointer ${
                  isDark
                    ? "text-amber-400 hover:bg-slate-800"
                    : "text-white hover:bg-white/15"
                }`}
                title={isDark ? "Modo Claro" : "Modo Escuro"}
              >
                {isDark ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>

              {/* Entrar / Minha Conta (Garantido Visível em Telas Mobile) */}
              {activeUser ? (
                <div className="relative">
                  <button
                    id="user-profile-menu-button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center space-x-1.5 text-left cursor-pointer group"
                    title="Minha Conta"
                  >
                    <div className="p-1 rounded-full border border-neutral-200 dark:border-slate-800">
                      {activeUser.photoURL ? (
                        <img
                          src={activeUser.photoURL}
                          alt={activeUser.name || "Usuário"}
                          className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div
                          className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            isDark
                              ? "bg-slate-800 text-amber-400"
                              : "bg-neutral-200 text-neutral-800"
                          }`}
                        >
                          {(activeUser.name || activeUser.email || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="hidden sm:block text-left leading-tight">
                      <span className="text-[10px] text-neutral-400 block font-medium">
                        Olá,
                      </span>
                      <span className="text-[11px] font-bold block truncate max-w-[90px]">
                        {activeUser.name ? activeUser.name.split(" ")[0] : "Minha conta"}
                      </span>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-neutral-400 hidden sm:block" />
                  </button>

                  <AnimatePresence>
                    {isDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsDropdownOpen(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className={`absolute right-0 mt-3 w-60 border rounded-2xl shadow-xl py-2 z-50 backdrop-blur-xl ${
                            isDark
                              ? "bg-slate-900/95 border-slate-800 text-slate-100"
                              : "bg-white border-neutral-200 text-neutral-800"
                          }`}
                        >
                          <div
                            className={`px-4 py-2.5 border-b ${isDark ? "border-slate-800" : "border-neutral-100"}`}
                          >
                            <p className="text-xs font-bold truncate">
                              {activeUser.name || "Usuário"}
                            </p>
                            <p className="text-[10px] text-neutral-400 truncate">
                              {activeUser.email || ""}
                            </p>
                          </div>

                          <div className="py-1">
                            <button
                              onClick={() => {
                                setCurrentView("orders");
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors flex items-center space-x-2 cursor-pointer ${
                                isDark
                                  ? "text-slate-300 hover:bg-slate-800"
                                  : "text-neutral-700 hover:bg-neutral-100"
                              }`}
                            >
                              <History className="h-4 w-4 text-neutral-400" />
                              <span>Meus Pedidos</span>
                            </button>

                            <button
                              onClick={() => {
                                setCurrentView("meus-dados");
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors flex items-center space-x-2 cursor-pointer ${
                                isDark
                                  ? "text-slate-300 hover:bg-slate-800"
                                  : "text-neutral-700 hover:bg-neutral-100"
                              }`}
                            >
                              <User className="h-4 w-4 text-neutral-400" />
                              <span>Meus Dados Cadastrais</span>
                            </button>

                            <button
                              onClick={() => {
                                setCurrentView("meu-crediario");
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors flex items-center space-x-2 cursor-pointer ${
                                isDark
                                  ? "text-slate-300 hover:bg-slate-800"
                                  : "text-neutral-700 hover:bg-neutral-100"
                              }`}
                            >
                              <CreditCard className="h-4 w-4 text-neutral-400" />
                              <span>Meu Crediário / Faturas</span>
                            </button>

                            {isAuthorizedCollaborator && (
                              <button
                                onClick={() => {
                                  setCurrentView("admin");
                                  setIsDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors flex items-center space-x-2 cursor-pointer ${
                                  isDark
                                    ? "text-amber-400 hover:bg-slate-800"
                                    : "text-blue-600 hover:bg-neutral-100"
                                }`}
                              >
                                <Shield className="h-4 w-4 text-blue-600" />
                                <span>Painel Administrativo</span>
                              </button>
                            )}
                          </div>

                          <div
                            className={`border-t pt-1 mt-1 ${isDark ? "border-slate-800" : "border-neutral-100"}`}
                          >
                            <button
                              onClick={() => {
                                logout();
                                setIsDropdownOpen(false);
                                setCurrentView("home");
                              }}
                              className={`w-full text-left px-4 py-2 text-xs font-semibold transition-colors flex items-center space-x-2 cursor-pointer ${
                                isDark
                                  ? "text-rose-400 hover:bg-rose-500/10"
                                  : "text-rose-600 hover:bg-rose-50"
                              }`}
                            >
                              <LogOut className="h-4 w-4 text-rose-500" />
                              <span>Sair da Conta</span>
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <button
                  id="user-login-button"
                  onClick={() => setCurrentView("login")}
                  className={`flex flex-col items-center justify-center text-[11px] font-medium transition-all cursor-pointer group ${
                    currentView === "login"
                      ? "text-amber-300 font-bold"
                      : isDark
                        ? "text-slate-300 hover:text-white"
                        : "text-white/90 hover:text-white"
                  }`}
                  title="Entrar ou Criar Conta"
                >
                  <div className="relative mb-0.5">
                    <User className={`h-5.5 w-5.5 sm:h-6 sm:w-6 transition-transform group-hover:scale-110 ${
                      isDark ? "text-slate-200" : "text-white"
                    }`} />
                  </div>
                  <span className="hidden sm:inline">Entrar</span>
                </button>
              )}
            </div>
          </div>

          {/* Campo de Busca no Mobile */}
          <div className="pb-3 sm:hidden">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="O que você procura?"
                className={`w-full pl-4 pr-9 py-2 text-xs border rounded-full focus:outline-none transition-all ${
                  isDark
                    ? "bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500"
                    : "bg-white/15 border-white/25 text-white placeholder-white/75 focus:bg-white focus:text-neutral-900 focus:placeholder-neutral-400"
                }`}
              />
              <Search className={`absolute right-3 top-2.5 h-3.5 w-3.5 ${
                isDark ? "text-neutral-400" : "text-white/80"
              }`} />
            </div>
          </div>

          {/* 3. CATEGORY NAVIGATION CARD & MEGA-MENU CONTAINER */}
          <div className="py-2.5 pb-4 relative">
            <div
              className={`rounded-2xl border px-4 py-2 flex items-center justify-between overflow-x-auto no-scrollbar transition-all ${
                isDark
                  ? "bg-slate-900/90 border-slate-800 shadow-slate-950/50"
                  : "bg-white/95 backdrop-blur-md border-white/40 shadow-md text-neutral-800"
              }`}
            >
              <nav className="flex items-center space-x-4 sm:space-x-8 text-xs font-semibold tracking-tight whitespace-nowrap w-full">
                {/* Botão Azul com Hambúrguer + Setinha para Baixo */}
                <button
                  id="sandwich-menu-trigger-nav"
                  onClick={() => setIsSandwichMenuOpen(true)}
                  className="hidden sm:flex bg-[#003e92] hover:bg-[#003175] text-white font-extrabold text-xs px-4 py-2.5 rounded-xl items-center space-x-2.5 cursor-pointer transition-all shadow-xs shrink-0"
                >
                  <Menu className="h-4 w-4 text-white" />
                  <span>Todas as Categorias</span>
                  <ChevronDown className="h-3.5 w-3.5 text-white/80" />
                </button>

                {/* Links Principais: Ofertas & Saldão, Feminino, Masculino, Infantil */}
                <div className="flex items-center space-x-2 sm:space-x-4 overflow-x-auto no-scrollbar flex-1">
                  {/* Ofertas & Saldão */}
                  <button
                    onClick={() => handleMegaMenuCategoryClick("OFERTAS", "TODAS")}
                    className="py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 text-rose-600 font-extrabold hover:text-rose-700 hover:bg-rose-500/10 text-xs shrink-0"
                  >
                    <Tag className="h-3.5 w-3.5 text-rose-600" />
                    <span>Ofertas & Saldão</span>
                  </button>

                  {/* Feminino */}
                  <div
                    className="relative shrink-0"
                    onMouseEnter={() => handleNavMouseEnter('feminino')}
                    onMouseLeave={handleNavMouseLeave}
                  >
                    <button
                      onClick={() => {
                        if (activeMegaMenu === 'feminino') setActiveMegaMenu(null);
                        else setActiveMegaMenu('feminino');
                      }}
                      className={`py-2 px-3.5 rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 text-xs font-bold ${
                        activeMegaMenu === 'feminino' || (selectedSubcategory.toUpperCase() === 'FEMININO')
                          ? "font-extrabold text-[#003e92] dark:text-amber-400 bg-[#003e92]/10 dark:bg-amber-400/10"
                          : isDark
                            ? "text-slate-300 hover:text-white"
                            : "text-neutral-700 hover:text-black"
                      }`}
                    >
                      <span>Feminino</span>
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${
                        activeMegaMenu === 'feminino' ? "rotate-180 text-[#003e92] dark:text-amber-400" : "text-slate-400"
                      }`} />
                    </button>
                  </div>

                  {/* Masculino */}
                  <div
                    className="relative shrink-0"
                    onMouseEnter={() => handleNavMouseEnter('masculino')}
                    onMouseLeave={handleNavMouseLeave}
                  >
                    <button
                      onClick={() => {
                        if (activeMegaMenu === 'masculino') setActiveMegaMenu(null);
                        else setActiveMegaMenu('masculino');
                      }}
                      className={`py-2 px-3.5 rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 text-xs font-bold ${
                        activeMegaMenu === 'masculino' || (selectedSubcategory.toUpperCase() === 'MASCULINO')
                          ? "font-extrabold text-[#003e92] dark:text-amber-400 bg-[#003e92]/10 dark:bg-amber-400/10"
                          : isDark
                            ? "text-slate-300 hover:text-white"
                            : "text-neutral-700 hover:text-black"
                      }`}
                    >
                      <span>Masculino</span>
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${
                        activeMegaMenu === 'masculino' ? "rotate-180 text-[#003e92] dark:text-amber-400" : "text-slate-400"
                      }`} />
                    </button>
                  </div>

                  {/* Infantil */}
                  <div
                    className="relative shrink-0"
                    onMouseEnter={() => handleNavMouseEnter('infantil')}
                    onMouseLeave={handleNavMouseLeave}
                  >
                    <button
                      onClick={() => {
                        if (activeMegaMenu === 'infantil') setActiveMegaMenu(null);
                        else setActiveMegaMenu('infantil');
                      }}
                      className={`py-2 px-3.5 rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 text-xs font-bold ${
                        activeMegaMenu === 'infantil' || (selectedSubcategory.toUpperCase().includes('INFANTIL'))
                          ? "font-extrabold text-[#003e92] dark:text-amber-400 bg-[#003e92]/10 dark:bg-amber-400/10"
                          : isDark
                            ? "text-slate-300 hover:text-white"
                            : "text-neutral-700 hover:text-black"
                      }`}
                    >
                      <span>Infantil</span>
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${
                        activeMegaMenu === 'infantil' ? "rotate-180 text-[#003e92] dark:text-amber-400" : "text-slate-400"
                      }`} />
                    </button>
                  </div>
                </div>
              </nav>
            </div>

            {/* PAINEL MEGA-MENU DROPDOWN */}
            <AnimatePresence>
              {activeMegaMenu && MEGAMENU_DATA[activeMegaMenu] && (
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  onMouseEnter={() => handleNavMouseEnter(activeMegaMenu)}
                  onMouseLeave={handleNavMouseLeave}
                  className={`absolute left-0 right-0 top-full mt-2 z-50 rounded-3xl border shadow-2xl overflow-hidden backdrop-blur-xl transition-all ${
                    isDark
                      ? "bg-slate-900/98 border-slate-800 text-slate-100 shadow-slate-950/80"
                      : "bg-white/98 border-slate-200/80 text-slate-900 shadow-slate-900/15"
                  }`}
                >
                  <div className="p-6 md:p-8 max-w-7xl mx-auto">
                    {/* Banner Topo do Mega-Menu */}
                    <div className={`flex items-center justify-between p-4 px-6 rounded-2xl mb-6 border ${
                      isDark ? "bg-slate-950/80 border-slate-800" : "bg-gradient-to-r from-[#002850] to-[#003e92] text-white border-transparent"
                    }`}>
                      <div>
                        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-extrabold tracking-wider uppercase mb-1">
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          <span>{MEGAMENU_DATA[activeMegaMenu].badge}</span>
                        </div>
                        <h3 className="text-base md:text-lg font-black tracking-tight text-white">
                          {MEGAMENU_DATA[activeMegaMenu].bannerTitle}
                        </h3>
                        <p className="text-xs text-slate-200/90 font-medium">
                          {MEGAMENU_DATA[activeMegaMenu].bannerSubtitle}
                        </p>
                      </div>
                      <button
                        onClick={() => handleMegaMenuCategoryClick("TODOS", MEGAMENU_DATA[activeMegaMenu].title)}
                        className="hidden sm:inline-flex items-center gap-2 text-xs font-black px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer transition-all shadow-sm shrink-0"
                      >
                        <span>Explorar Tudo {MEGAMENU_DATA[activeMegaMenu].title}</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Colunas do Mega-Menu */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                      {MEGAMENU_DATA[activeMegaMenu].sections.map((sec, idx) => {
                        const validItems = sec.items.filter((item) =>
                          checkHasProductsWithPhoto(item.category, item.subcategory, activeMegaMenu)
                        );

                        if (validItems.length === 0) return null;

                        return (
                          <div key={idx} className="space-y-3">
                            <h4 className="text-xs font-black uppercase tracking-wider text-[#003e92] dark:text-amber-400 border-b pb-2 border-slate-200 dark:border-slate-800 flex items-center justify-between">
                              <span>{sec.title}</span>
                            </h4>
                            <ul className="space-y-1.5">
                              {validItems.map((item, itemIdx) => (
                                <li key={itemIdx}>
                                  <button
                                    onClick={() => handleMegaMenuCategoryClick(item.category, item.subcategory)}
                                    className={`text-xs w-full text-left py-1.5 px-2.5 rounded-lg transition-all cursor-pointer flex items-center justify-between group ${
                                      itemIdx === 0
                                        ? "font-extrabold text-[#003e92] dark:text-amber-300 hover:bg-[#003e92]/10 dark:hover:bg-amber-400/10"
                                        : isDark
                                          ? "text-slate-300 hover:text-white hover:bg-slate-800/60"
                                          : "text-slate-700 hover:text-black hover:bg-slate-100"
                                    }`}
                                  >
                                    <span className="group-hover:translate-x-1 transition-transform">{item.name}</span>
                                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <CompleteProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      <CategorySandwichMenu
        isOpen={isSandwichMenuOpen}
        onClose={() => setIsSandwichMenuOpen(false)}
      />
    </header>
  );
};
