import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShoppingBag, Search, User, LogOut, LayoutDashboard, History, ChevronDown, Heart, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BrandLogo } from './BrandLogo';

import { scrollToSectionWithOffset } from '../lib/scrollUtils';

export const Header: React.FC = () => {
  const { 
    cart, 
    currentUser, 
    logout, 
    currentView, 
    setCurrentView, 
    searchQuery, 
    setSearchQuery,
    selectedMenuTab,
    setSelectedMenuTab,
    favorites = [],
    theme,
    toggleTheme
  } = useApp();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const isDark = theme === 'dark';

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleMenuClick = (tab: string) => {
    setSelectedMenuTab(tab);
    setCurrentView('category-page');
    setTimeout(() => {
      scrollToSectionWithOffset('category-all-items-section');
    }, 100);
  };

  const getNavLinkClass = (tab: string) => {
    const isActive = currentView === 'category-page' && selectedMenuTab === tab;
    return `relative text-xs sm:text-sm font-black tracking-widest uppercase transition-all cursor-pointer px-4 py-1.5 rounded-full flex items-center space-x-1.5 ${
      isActive 
        ? isDark
          ? 'text-amber-400 bg-amber-400/10 border border-amber-400/30 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
          : 'text-slate-900 bg-slate-100 border border-slate-200/80 shadow-xs'
        : isDark
          ? 'text-slate-300 hover:text-amber-400 hover:bg-slate-800/50'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
    }`;
  };

  return (
    <header 
      id="store-header" 
      className={`sticky top-0 z-40 border-b backdrop-blur-2xl transition-all duration-300 ${
        isDark 
          ? 'bg-[#0B0F19]/90 border-slate-800/80 text-white shadow-xl shadow-black/30' 
          : 'bg-white/90 border-slate-200/80 text-slate-800 shadow-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* LINHA SUPERIOR (TIER 1): Logo Vetorial 100% HTML/Tailwind + Busca Proeminente + Ações do Usuário */}
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          
          {/* Logo da Marca Evidência Calçados (100% Código/Tailwind com Nitidez Total) */}
          <BrandLogo size="md" />

          {/* Barra de Pesquisa Proeminente & Larga (Centro) */}
          <div className="flex-1 max-w-xl mx-2 sm:mx-6 hidden sm:block">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar calçados, sapatos, sapatênis, botas ou acessórios..."
                className={`w-full pl-11 pr-5 py-2.5 text-xs sm:text-sm border rounded-full focus:outline-none transition-all duration-300 shadow-sm ${
                  isDark
                    ? 'bg-slate-900/90 border-slate-800 text-slate-100 placeholder-slate-400 focus:border-amber-400/90 focus:bg-slate-950 focus:shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                    : 'bg-slate-100/90 border-slate-200/90 rounded-full focus:border-slate-400 focus:bg-white text-slate-900 placeholder-slate-400 focus:shadow-md'
                }`}
              />
              <Search className="absolute left-4 top-3 h-4 w-4 text-slate-400" />
            </div>
          </div>

          {/* Ícones de Utilidade & Conta (Direita) */}
          <div className="flex items-center space-x-2.5 sm:space-x-3 shrink-0">

            {/* Alternador de Tema Escuro/Claro */}
            <motion.button
              whileTap={{ scale: 0.9, rotate: 180 }}
              id="theme-toggle-button"
              onClick={toggleTheme}
              className={`p-2.5 rounded-full backdrop-blur-md border transition-all duration-200 cursor-pointer ${
                isDark 
                  ? 'bg-slate-900/80 text-amber-400 border-slate-800 hover:bg-slate-800 shadow-[0_0_12px_rgba(245,158,11,0.15)]' 
                  : 'bg-slate-100/80 text-slate-700 border-slate-200/80 hover:bg-white shadow-xs'
              }`}
              title={isDark ? "Mudar para Modo Claro" : "Ativar Modo Escuro Premium"}
            >
              {isDark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </motion.button>

            {/* Botão Meus Favoritos */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              id="favorites-button"
              onClick={() => setCurrentView('favorites')}
              className={`relative p-2.5 rounded-full backdrop-blur-md border transition-all cursor-pointer ${
                currentView === 'favorites'
                  ? isDark ? 'text-rose-400 bg-rose-500/10 border-rose-500/30' : 'text-rose-600 bg-rose-50 border-rose-200'
                  : isDark ? 'text-slate-300 bg-slate-900/80 border-slate-800 hover:bg-slate-800' : 'text-slate-700 bg-slate-100/80 border-slate-200/80 hover:bg-white'
              }`}
              title="Meus Favoritos"
            >
              <Heart className={`h-4.5 w-4.5 ${favorites.length > 0 ? 'fill-rose-500 text-rose-500' : ''}`} />
              {favorites.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-4.5 h-4.5 flex items-center justify-center rounded-full shadow-sm">
                  {favorites.length}
                </span>
              )}
            </motion.button>

            {/* Botão Carrinho de Compras */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              id="cart-button"
              onClick={() => setCurrentView('cart')}
              className={`relative p-2.5 rounded-full backdrop-blur-md border transition-all cursor-pointer ${
                currentView === 'cart'
                  ? isDark ? 'text-amber-400 bg-amber-400/10 border-amber-400/30' : 'text-slate-900 bg-slate-200 border-slate-300'
                  : isDark ? 'text-slate-300 bg-slate-900/80 border-slate-800 hover:bg-slate-800' : 'text-slate-700 bg-slate-100/80 border-slate-200/80 hover:bg-white'
              }`}
            >
              <ShoppingBag className="h-4.5 w-4.5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 text-[9px] font-black w-4.5 h-4.5 flex items-center justify-center rounded-full shadow-md animate-bounce">
                  {totalItems}
                </span>
              )}
            </motion.button>

            {/* Painel Administrativo (Vendedor/Admin) */}
            {currentUser && (currentUser.role === 'admin' || currentUser.role === 'seller') && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                id="admin-panel-button"
                onClick={() => setCurrentView('admin')}
                className={`p-2.5 rounded-full backdrop-blur-md border transition-all cursor-pointer ${
                  currentView === 'admin'
                    ? isDark ? 'text-amber-400 bg-amber-400/10 border-amber-400/30' : 'text-slate-900 bg-slate-200 border-slate-300'
                    : isDark ? 'text-slate-300 bg-slate-900/80 border-slate-800 hover:bg-slate-800' : 'text-slate-700 bg-slate-100/80 border-slate-200/80 hover:bg-white'
                }`}
                title="Painel Administrativo"
              >
                <LayoutDashboard className="h-4.5 w-4.5" />
              </motion.button>
            )}

            {/* Perfil do Usuário com Dropdown */}
            {currentUser ? (
              <div className="relative">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  id="user-profile-menu-button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`flex items-center space-x-1.5 p-1 rounded-full border transition-all cursor-pointer ${
                    isDark ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700' : 'bg-slate-100/80 border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  {currentUser.photoURL ? (
                    <img 
                      src={currentUser.photoURL} 
                      alt={currentUser.name} 
                      className="w-7 h-7 rounded-full object-cover border border-slate-700"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center border text-xs font-bold ${
                      isDark ? 'bg-amber-400 text-slate-950 border-amber-400' : 'bg-slate-900 text-white border-slate-800'
                    }`}>
                      <User className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400 pr-0.5" />
                </motion.button>

                <AnimatePresence>
                  {isDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute right-0 mt-3 w-60 border rounded-2xl shadow-2xl py-2 z-50 backdrop-blur-xl ${
                          isDark 
                            ? 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-black/40' 
                            : 'bg-white/90 border-slate-200 text-slate-800 shadow-xl'
                        }`}
                      >
                        <div className={`px-4 py-2.5 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                          <p className="text-xs font-bold truncate">{currentUser.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
                        </div>

                        <div className="py-1">
                          <button
                            onClick={() => {
                              setCurrentView('orders');
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-xs font-semibold transition-colors flex items-center space-x-2 cursor-pointer ${
                              isDark ? 'text-slate-300 hover:bg-slate-800/80 hover:text-amber-400' : 'text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <History className="h-4 w-4 text-slate-400" />
                            <span>Meus Pedidos</span>
                          </button>

                          {currentUser.role === 'customer' && (
                            <button
                              onClick={() => {
                                window.dispatchEvent(new CustomEvent('open-profile-modal'));
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2 text-xs font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                                isDark ? 'text-slate-300 hover:bg-slate-800/80 hover:text-amber-400' : 'text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <User className="h-4 w-4 text-slate-400" />
                                <span>Dados Cadastrais</span>
                              </div>
                              {!(currentUser.rg && currentUser.cpf) && (
                                <span className="bg-amber-400/20 text-amber-400 text-[9px] font-bold px-2 py-0.5 rounded-full border border-amber-400/30">
                                  Pendente
                                </span>
                              )}
                            </button>
                          )}
                        </div>

                        <div className={`border-t pt-1 mt-1 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                          <button
                            onClick={() => {
                              logout();
                              setIsDropdownOpen(false);
                              setCurrentView('home');
                            }}
                            className={`w-full text-left px-4 py-2 text-xs font-semibold transition-colors flex items-center space-x-2 cursor-pointer ${
                              isDark ? 'text-rose-400 hover:bg-rose-500/10' : 'text-rose-600 hover:bg-rose-50'
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
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setCurrentView('orders')}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-full border text-xs font-bold transition-all cursor-pointer ${
                  isDark
                    ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                    : 'bg-slate-900 text-white border-slate-900 shadow-sm'
                }`}
              >
                <User className="h-4 w-4" />
                <span>Entrar</span>
              </motion.button>
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
              placeholder="Buscar calçados ou acessórios..."
              className={`w-full pl-9 pr-4 py-2 text-xs border rounded-full focus:outline-none transition-all ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-amber-400'
                  : 'bg-slate-100 border-slate-200 text-slate-800 placeholder-slate-400'
              }`}
            />
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>

        {/* LINHA INFERIOR (TIER 2): Barra de Navegação Dedicada aos Macro-Departamentos */}
        <div className={`border-t py-2 flex items-center justify-center overflow-x-auto no-scrollbar ${
          isDark ? 'border-slate-800/60' : 'border-slate-200/60'
        }`}>
          <nav id="macro-departments-nav" className="flex items-center space-x-6 sm:space-x-10 md:space-x-14 py-0.5">
            <button 
              onClick={() => handleMenuClick('lançamentos')}
              className={getNavLinkClass('lançamentos')}
            >
              LANÇAMENTOS
            </button>

            <button 
              onClick={() => handleMenuClick('feminino')}
              className={getNavLinkClass('feminino')}
            >
              FEMININO
            </button>

            <button 
              onClick={() => handleMenuClick('masculino')}
              className={getNavLinkClass('masculino')}
            >
              MASCULINO
            </button>

            <button 
              onClick={() => handleMenuClick('ofertas')}
              className={getNavLinkClass('ofertas')}
            >
              OFERTAS
            </button>
          </nav>
        </div>

      </div>
    </header>
  );
};
