import React, { useState } from "react";
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
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BrandLogo } from "./BrandLogo";
import { CompleteProfileModal } from "./CompleteProfileModal";
import { checkIsProfileComplete } from "../App";
import { scrollToSectionWithOffset } from "../lib/scrollUtils";
import { normalizeCategoryName } from "../services/moblinkCategoriesService";

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
    setSelectedSubcategory,
    favorites = [],
    theme,
    toggleTheme,
    categories = [],
  } = useApp();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const isDark = theme === "dark";

  const activeUser = currentAdminUser || currentUser;
  const isAuthorizedCollaborator = Boolean(
    activeUser &&
    (activeUser.role === "admin" ||
      activeUser.role === "seller" ||
      activeUser.isAuthorizedCollaborator),
  );

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleDeptFilter = (categoryName: string) => {
    const catUpper = categoryName.toUpperCase();
    setSelectedCategory(catUpper);
    if (setSelectedMenuTab) setSelectedMenuTab(categoryName.toLowerCase());
    if (setSelectedSubcategory) setSelectedSubcategory("TODAS");
    setCurrentView("category-page");
    setTimeout(() => {
      scrollToSectionWithOffset("category-all-items-section");
    }, 100);
  };

  const navCategories = React.useMemo(() => {
    const defaultNavs = [
      { name: "Diversos", key: "DIVERSOS" },
      { name: "Calçados", key: "CALÇADOS" },
      { name: "Acessórios", key: "ACESSÓRIOS" },
      { name: "Novidades", key: "NOVIDADES" },
      { name: "Confecções", key: "CONFECÇÕES" },
      { name: "Promoções", key: "PROMOÇÕES", isPromo: true },
    ];

    if (!categories || categories.length === 0) return defaultNavs;

    const seenKeys = new Set<string>();
    const uniqueNavs: { name: string; key: string; isPromo?: boolean }[] = [];

    categories.forEach((cat) => {
      if (cat.visible === false || cat.active === false) return;
      const catName = normalizeCategoryName(cat.name || "Geral");
      const cleanKey = catName.trim().toUpperCase();
      if (!seenKeys.has(cleanKey)) {
        seenKeys.add(cleanKey);
        uniqueNavs.push({
          name: catName,
          key: cleanKey,
          isPromo: cleanKey.includes("PROMO") || cleanKey.includes("OFERTA"),
        });
      }
    });

    // Garante que as categorias essenciais estejam sempre na barra sem duplicatas
    defaultNavs.forEach((nav) => {
      const cleanNavKey = nav.key.trim().toUpperCase();
      if (!seenKeys.has(cleanNavKey)) {
        seenKeys.add(cleanNavKey);
        if (nav.isPromo) {
          uniqueNavs.push(nav);
        } else {
          uniqueNavs.splice(Math.max(0, uniqueNavs.length - 1), 0, nav);
        }
      }
    });

    return uniqueNavs;
  }, [categories]);

  return (
    <header
      id="store-header"
      className="sticky top-0 z-40 w-full transition-all duration-300"
    >
      {/* 1. TOP ANNOUNCEMENT BAR (Faixa de Benefícios Preta Superior) */}
      <div className="bg-[#111111] text-white text-[11px] font-medium py-1.5 px-4 sm:px-8 border-b border-neutral-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-4 text-center sm:text-left">
          <div className="flex items-center space-x-2 text-neutral-200">
            <Truck className="h-3.5 w-3.5 text-amber-400" />
            <span>Frete grátis para compras acima de R$199</span>
          </div>

          <div className="hidden md:flex items-center space-x-4 text-neutral-300 font-normal">
            <span
              className="flex items-center space-x-1 hover:text-white transition-colors cursor-pointer"
              onClick={() => setCurrentView("support")}
            >
              <RefreshCw className="h-3 w-3 text-neutral-400" />
              <span>Trocas e devoluções</span>
            </span>
            <span className="text-neutral-600">|</span>
            <span
              className="flex items-center space-x-1 hover:text-white transition-colors cursor-pointer"
              onClick={() => setCurrentView("support")}
            >
              <MessageSquare className="h-3 w-3 text-neutral-400" />
              <span>Atendimento</span>
            </span>
            <span className="text-neutral-600">|</span>
            <span
              className="flex items-center space-x-1 hover:text-white transition-colors cursor-pointer"
              onClick={() => setCurrentView("about")}
            >
              <MapPin className="h-3 w-3 text-neutral-400" />
              <span>Nossas lojas</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER BAR (Logo Atual + Busca Pílula + Ações do Usuário) */}
      <div
        className={`border-b backdrop-blur-2xl transition-all duration-300 ${
          isDark
            ? "bg-[#000000]/80 border-white/10 text-white shadow-2xl shadow-black/60"
            : "bg-white/80 border-black/5 text-[#1d1d1f] shadow-xs"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
            {/* Logo Oficial Evidência Calçados (Mantido Conforme Solicitado) */}
            <BrandLogo size="md" />

            {/* Barra de Pesquisa em Formato Pílula (Centro) */}
            <div className="flex-1 max-w-lg mx-2 sm:mx-6 hidden sm:block">
              <div className="relative w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="O que você procura?"
                  className={`w-full pl-5 pr-11 py-2.5 text-xs sm:text-sm rounded-full focus:outline-none transition-all duration-300 border ${
                    isDark
                      ? "bg-slate-900/90 border-slate-800 text-slate-100 placeholder-slate-400 focus:border-amber-400 focus:bg-slate-950"
                      : "bg-neutral-100/90 border-neutral-200/90 rounded-full focus:border-neutral-400 focus:bg-white text-neutral-900 placeholder-neutral-400 shadow-inner"
                  }`}
                />
                <Search className="absolute right-4 top-3 h-4 w-4 text-neutral-400" />
              </div>
            </div>

            {/* Ícones de Utilidade & Conta (Direita) */}
            <div className="flex items-center space-x-3 sm:space-x-4 shrink-0">
              {/* Botão Meus Favoritos */}
              <button
                id="favorites-button"
                onClick={() => setCurrentView("favorites")}
                className={`relative flex items-center space-x-1.5 text-xs font-semibold transition-all cursor-pointer p-2 rounded-full ${
                  currentView === "favorites"
                    ? "text-rose-600 bg-rose-50"
                    : isDark
                      ? "text-slate-300 hover:text-white hover:bg-slate-800"
                      : "text-neutral-700 hover:text-black hover:bg-neutral-100"
                }`}
                title="Meus Favoritos"
              >
                <Heart
                  className={`h-4.5 w-4.5 ${favorites.length > 0 ? "fill-rose-500 text-rose-500" : ""}`}
                />
                <span className="hidden lg:inline text-xs">Favoritos</span>
                {favorites.length > 0 && (
                  <span className="bg-rose-500 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full">
                    {favorites.length}
                  </span>
                )}
              </button>

              {/* Botão Carrinho de Compras */}
              <button
                id="cart-button"
                onClick={() => setCurrentView("cart")}
                className={`relative flex items-center space-x-1.5 text-xs font-semibold transition-all cursor-pointer p-2 rounded-full ${
                  currentView === "cart"
                    ? "text-slate-900 bg-neutral-100 font-bold"
                    : isDark
                      ? "text-slate-300 hover:text-white hover:bg-slate-800"
                      : "text-neutral-700 hover:text-black hover:bg-neutral-100"
                }`}
              >
                <ShoppingBag className="h-4.5 w-4.5" />
                <span className="hidden lg:inline text-xs">Carrinho</span>
                {totalItems > 0 && (
                  <span className="bg-black text-white dark:bg-amber-400 dark:text-black text-[10px] font-black w-4.5 h-4.5 flex items-center justify-center rounded-full shadow-xs">
                    {totalItems}
                  </span>
                )}
              </button>

              {/* Alternador de Tema Escuro/Claro */}
              <button
                id="theme-toggle-button"
                onClick={toggleTheme}
                className={`p-2 rounded-full transition-all cursor-pointer ${
                  isDark
                    ? "text-amber-400 hover:bg-slate-800"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
                title={isDark ? "Modo Claro" : "Modo Escuro"}
              >
                {isDark ? (
                  <Sun className="h-4.5 w-4.5" />
                ) : (
                  <Moon className="h-4.5 w-4.5" />
                )}
              </button>

              {/* Menu do Usuário */}
              {activeUser ? (
                <div className="relative">
                  <button
                    id="user-profile-menu-button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className={`flex items-center space-x-1.5 text-xs font-semibold p-1.5 rounded-full border transition-all cursor-pointer ${
                      isDark
                        ? "bg-slate-900 border-slate-800"
                        : "bg-neutral-100 border-neutral-200"
                    }`}
                  >
                    {activeUser.photoURL ? (
                      <img
                        src={activeUser.photoURL}
                        alt={activeUser.name || "Usuário"}
                        className="w-7 h-7 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
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
                    <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
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
                                setIsProfileModalOpen(true);
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
                  onClick={() => setCurrentView("login")}
                  className={`flex items-center space-x-1.5 text-xs font-semibold hover:underline cursor-pointer ${
                    isDark ? "text-slate-200" : "text-neutral-800"
                  }`}
                >
                  <User className="h-4 w-4 text-neutral-500" />
                  <span className="hidden sm:inline">Entrar / Minha conta</span>
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
                    : "bg-neutral-100 border-neutral-200 text-neutral-800 placeholder-neutral-400"
                }`}
              />
              <Search className="absolute right-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
            </div>
          </div>

          {/* 3. CATEGORY NAVIGATION ROW (Menu Limpo Centralizado) */}
          <div
            className={`border-t py-2.5 flex items-center justify-center overflow-x-auto no-scrollbar ${
              isDark ? "border-slate-800/60" : "border-neutral-200/80"
            }`}
          >
            <nav className="flex items-center space-x-6 sm:space-x-8 text-xs font-medium tracking-tight whitespace-nowrap">
              {navCategories.map((item) => {
                const isActive = selectedCategory.toUpperCase() === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => handleDeptFilter(item.name)}
                    className={`transition-colors cursor-pointer hover:underline ${
                      item.isPromo
                        ? "text-rose-600 font-bold hover:text-rose-700"
                        : isActive
                          ? "font-bold underline text-black dark:text-white"
                          : isDark
                            ? "text-slate-300 hover:text-white"
                            : "text-neutral-700 hover:text-black"
                    }`}
                  >
                    {item.name}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      <CompleteProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </header>
  );
};
