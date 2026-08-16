import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ChevronRight,
  ArrowLeft,
  Menu,
  ShoppingBag,
  Sparkles,
  Footprints,
  Shirt,
  Tag,
  Grid,
  Heart,
  Smile,
  Layers,
  Compass,
  Gift,
  Check,
  Search,
  PackageCheck
} from 'lucide-react';
import { normalizeCategoryName, normalizeSubcategoryName } from '../services/moblinkCategoriesService';
import { scrollToSectionWithOffset } from '../lib/scrollUtils';

interface CategorySandwichMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CategoryMenuItem {
  name: string;
  key: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  isPromo?: boolean;
  subcategories: string[];
}

export const CategorySandwichMenu: React.FC<CategorySandwichMenuProps> = ({ isOpen, onClose }) => {
  const {
    categories = [],
    products = [],
    selectedCategory,
    setSelectedCategory,
    selectedSubcategory,
    setSelectedSubcategory,
    setSelectedMenuTab,
    setCurrentView,
    theme
  } = useApp();

  const isDark = theme === 'dark';

  // Level 1: null (Categorias Principais) | string (Nome da Categoria Selecionada)
  const [activeCategoryKey, setActiveCategoryKey] = useState<string | null>(null);
  const [menuSearchQuery, setMenuSearchQuery] = useState('');

  // Ícones e paleta visual para cada departamento
  const categoryMetaMap: Record<string, { icon: React.ElementType; bg: string; color: string }> = {
    'CALÇADOS': { icon: Footprints, bg: 'bg-amber-500/10 dark:bg-amber-400/10', color: 'text-amber-600 dark:text-amber-400' },
    'ACESSÓRIOS': { icon: ShoppingBag, bg: 'bg-sky-500/10 dark:bg-sky-400/10', color: 'text-sky-600 dark:text-sky-400' },
    'CONFECÇÕES': { icon: Shirt, bg: 'bg-purple-500/10 dark:bg-purple-400/10', color: 'text-purple-600 dark:text-purple-400' },
    'NOVIDADES': { icon: Sparkles, bg: 'bg-emerald-500/10 dark:bg-emerald-400/10', color: 'text-emerald-600 dark:text-emerald-400' },
    'PROMOÇÕES': { icon: Tag, bg: 'bg-rose-500/10 dark:bg-rose-400/10', color: 'text-rose-600 dark:text-rose-400' },
    'DIVERSOS': { icon: Grid, bg: 'bg-blue-500/10 dark:bg-blue-400/10', color: 'text-blue-600 dark:text-blue-400' },
    'COSMÉTICOS': { icon: Smile, bg: 'bg-pink-500/10 dark:bg-pink-400/10', color: 'text-pink-600 dark:text-pink-400' },
    'PERFUMES': { icon: Gift, bg: 'bg-indigo-500/10 dark:bg-indigo-400/10', color: 'text-indigo-600 dark:text-indigo-400' },
    'ESCOLAR': { icon: Compass, bg: 'bg-teal-500/10 dark:bg-teal-400/10', color: 'text-teal-600 dark:text-teal-400' },
  };

  // Mapeamento dinâmico de categorias e suas subcategorias do catálogo
  const menuCategories: CategoryMenuItem[] = useMemo(() => {
    const categoryMap = new Map<string, { name: string; key: string; isPromo?: boolean; subs: Set<string> }>();

    // 1. Categorias Padrão Essenciais
    const defaults = [
      { name: 'Calçados', key: 'CALÇADOS' },
      { name: 'Acessórios', key: 'ACESSÓRIOS' },
      { name: 'Confecções', key: 'CONFECÇÕES' },
      { name: 'Novidades', key: 'NOVIDADES' },
      { name: 'Diversos', key: 'DIVERSOS' },
      { name: 'Promoções', key: 'PROMOÇÕES', isPromo: true },
    ];

    defaults.forEach(d => {
      categoryMap.set(d.key, { name: d.name, key: d.key, isPromo: d.isPromo, subs: new Set<string>() });
    });

    // 2. Adiciona Categorias do Firestore
    categories.forEach(cat => {
      if (cat.visible === false || cat.active === false) return;
      const normalizedName = normalizeCategoryName(cat.name || 'Geral');
      const cleanKey = normalizedName.trim().toUpperCase();

      if (!categoryMap.has(cleanKey)) {
        categoryMap.set(cleanKey, {
          name: normalizedName,
          key: cleanKey,
          isPromo: cleanKey.includes('PROMO') || cleanKey.includes('OFERTA'),
          subs: new Set<string>()
        });
      }

      const target = categoryMap.get(cleanKey)!;
      if (Array.isArray(cat.subcategories)) {
        cat.subcategories.forEach((s: any) => {
          if (s.name) {
            const subNorm = normalizeSubcategoryName(s.name);
            if (subNorm && subNorm.toUpperCase() !== 'TODAS') target.subs.add(subNorm);
          }
        });
      }
    });

    // 3. Extrai subcategorias diretamente dos produtos cadastrados no Firestore
    products.forEach(p => {
      if (!p.category) return;
      const catKey = (p.category || '').trim().toUpperCase();
      if (!categoryMap.has(catKey)) {
        const catName = normalizeCategoryName(p.category);
        categoryMap.set(catKey, { name: catName, key: catKey, subs: new Set<string>() });
      }

      if (p.subcategory) {
        const subName = normalizeSubcategoryName(p.subcategory);
        if (subName && subName.toUpperCase() !== 'TODAS') {
          categoryMap.get(catKey)?.subs.add(subName);
        }
      }
    });

    // Converte para a estrutura de menu final
    return Array.from(categoryMap.values()).map(item => {
      const meta = categoryMetaMap[item.key] || { icon: Layers, bg: 'bg-slate-500/10', color: 'text-slate-600 dark:text-slate-400' };
      return {
        name: item.name,
        key: item.key,
        icon: meta.icon,
        iconBg: meta.bg,
        iconColor: meta.color,
        isPromo: item.isPromo,
        subcategories: Array.from(item.subs).sort()
      };
    });
  }, [categories, products]);

  // Filtra as categorias conforme busca no menu
  const filteredCategories = useMemo(() => {
    if (!menuSearchQuery.trim()) return menuCategories;
    const q = menuSearchQuery.toLowerCase().trim();
    return menuCategories.filter(
      c => c.name.toLowerCase().includes(q) || c.subcategories.some(s => s.toLowerCase().includes(q))
    );
  }, [menuCategories, menuSearchQuery]);

  // Categoria ativa no Nível 2 (Subcategorias)
  const activeCategory = useMemo(() => {
    if (!activeCategoryKey) return null;
    return menuCategories.find(c => c.key === activeCategoryKey) || null;
  }, [activeCategoryKey, menuCategories]);

  // Seleciona Categoria e Subcategoria e navega
  const handleSelectSubcategory = (categoryName: string, subcategoryName: string) => {
    const catUpper = categoryName.toUpperCase();
    setSelectedCategory(catUpper);
    if (setSelectedMenuTab) setSelectedMenuTab(categoryName.toLowerCase());
    if (setSelectedSubcategory) setSelectedSubcategory(subcategoryName);
    
    setCurrentView('category-page');
    onClose();
    setActiveCategoryKey(null);

    setTimeout(() => {
      scrollToSectionWithOffset('category-all-items-section');
    }, 120);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay Escuro com Desfoque */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs cursor-pointer"
          />

          {/* Painel do Menu Sanduíche (Slide-out da Esquerda) */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className={`fixed top-0 left-0 bottom-0 z-50 w-full max-w-sm sm:max-w-md h-full shadow-2xl flex flex-col overflow-hidden transition-colors ${
              isDark ? 'bg-slate-950 border-r border-slate-800 text-white' : 'bg-white border-r border-neutral-200 text-slate-900'
            }`}
          >
            {/* 1. TOP HEADER BAR DO MENU */}
            <div className={`px-5 py-4 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'border-slate-800 bg-slate-900/60' : 'border-neutral-200/90 bg-neutral-50/80'
            }`}>
              <div className="flex items-center space-x-3">
                {activeCategoryKey ? (
                  <button
                    onClick={() => setActiveCategoryKey(null)}
                    className={`p-2 rounded-xl border transition-colors cursor-pointer flex items-center space-x-1.5 text-xs font-bold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' : 'bg-white border-neutral-200 text-slate-800 hover:bg-neutral-100'
                    }`}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Voltar</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-2">
                    <div className="p-2 rounded-xl bg-black dark:bg-amber-400 text-white dark:text-black">
                      <Menu className="h-4 w-4" />
                    </div>
                    <span className="text-base font-black tracking-tight">Menú da Loja</span>
                  </div>
                )}
              </div>

              {/* Botão Fechar Menu */}
              <button
                onClick={onClose}
                className={`p-2 rounded-full transition-all cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-neutral-500 hover:text-black hover:bg-neutral-100'
                }`}
                title="Fechar Menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Campo de Busca Rápida no Menu */}
            <div className={`px-5 py-3 border-b shrink-0 ${isDark ? 'border-slate-800/80 bg-slate-900/40' : 'border-neutral-100 bg-neutral-50/50'}`}>
              <div className="relative">
                <input
                  type="text"
                  value={menuSearchQuery}
                  onChange={e => setMenuSearchQuery(e.target.value)}
                  placeholder={activeCategory ? `Buscar em ${activeCategory.name}...` : "Buscar categoria ou departamento..."}
                  className={`w-full pl-9 pr-4 py-2 text-xs rounded-2xl border focus:outline-none transition-all ${
                    isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-amber-400'
                      : 'bg-white border-neutral-200 text-neutral-800 placeholder-neutral-400 focus:border-neutral-400 shadow-xs'
                  }`}
                />
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
              </div>
            </div>

            {/* 2. CONTEÚDO SCROLLÁVEL DO MENU (LEVEL 1 OU LEVEL 2) */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-4">
              <AnimatePresence mode="wait">
                {/* LEVEL 2: SUBCATEGORIAS DA CATEGORIA SELECIONADA */}
                {activeCategory ? (
                  <motion.div
                    key={`level2-${activeCategory.key}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-4"
                  >
                    {/* Header da Categoria Selecionada */}
                    <div className={`p-4 rounded-3xl border flex items-center space-x-3.5 ${
                      isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-neutral-50 border-neutral-200/80 shadow-xs'
                    }`}>
                      <div className={`p-3 rounded-2xl ${activeCategory.iconBg}`}>
                        <activeCategory.icon className={`h-6 w-6 ${activeCategory.iconColor}`} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 dark:text-amber-400">
                          Departamento
                        </span>
                        <h3 className="text-lg font-black tracking-tight leading-tight">
                          {activeCategory.name}
                        </h3>
                      </div>
                    </div>

                    {/* Opção Rápida: Ver todos os produtos dessa Categoria */}
                    <button
                      onClick={() => handleSelectSubcategory(activeCategory.name, 'TODAS')}
                      className={`w-full p-3.5 rounded-2xl border flex items-center justify-between transition-all cursor-pointer font-bold text-xs ${
                        selectedCategory.toUpperCase() === activeCategory.key && selectedSubcategory === 'TODAS'
                          ? 'bg-amber-400/20 border-amber-400 text-amber-600 dark:text-amber-300'
                          : isDark
                            ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-200'
                            : 'bg-white border-neutral-200 hover:bg-neutral-50 text-slate-800 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <PackageCheck className="h-4 w-4 text-emerald-500" />
                        <span>Ver Todos em {activeCategory.name}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 opacity-50" />
                    </button>

                    {/* Título da Lista de Subcategorias */}
                    <div className="pt-2">
                      <p className={`text-[11px] font-extrabold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Subcategorias ({activeCategory.subcategories.length})
                      </p>
                    </div>

                    {/* Lista de Subcategorias */}
                    <div className="space-y-1.5">
                      {activeCategory.subcategories.length > 0 ? (
                        activeCategory.subcategories
                          .filter(s => !menuSearchQuery || s.toLowerCase().includes(menuSearchQuery.toLowerCase()))
                          .map(sub => {
                            const isSelected =
                              selectedCategory.toUpperCase() === activeCategory.key &&
                              selectedSubcategory.toUpperCase() === sub.toUpperCase();

                            return (
                              <button
                                key={sub}
                                onClick={() => handleSelectSubcategory(activeCategory.name, sub)}
                                className={`w-full px-4 py-3 rounded-2xl border text-left text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-black text-white dark:bg-amber-400 dark:text-black font-black border-transparent shadow-md'
                                    : isDark
                                      ? 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-800/80 text-slate-300'
                                      : 'bg-white border-neutral-200/70 hover:bg-neutral-100 text-neutral-800'
                                }`}
                              >
                                <span>{sub}</span>
                                {isSelected ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                                )}
                              </button>
                            );
                          })
                      ) : (
                        <div className={`p-6 text-center rounded-2xl border text-xs font-medium ${
                          isDark ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-neutral-50 border-neutral-200 text-neutral-500'
                        }`}>
                          Nenhuma subcategoria específica cadastrada. Clique acima para ver todos os produtos deste departamento.
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  /* LEVEL 1: LISTA PRINCIPAL DE DEPARTAMENTOS E CATEGORIAS */
                  <motion.div
                    key="level1-main"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-4"
                  >
                    {/* Banner de Destaque no Topo do Menu */}
                    <div
                      onClick={() => handleSelectSubcategory('NOVIDADES', 'TODAS')}
                      className={`p-4 rounded-3xl border flex items-center justify-between cursor-pointer transition-transform hover:scale-[1.01] shadow-sm ${
                        isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-900'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2.5 rounded-2xl bg-amber-400 text-black">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider opacity-80">Destaque de Hoje</p>
                          <h4 className="text-sm font-black tracking-tight">Novidades da Coleção</h4>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 opacity-70" />
                    </div>

                    {/* Cabeçalho de Seção */}
                    <div className="pt-1 flex items-center justify-between">
                      <p className={`text-[11px] font-extrabold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Departamentos ({filteredCategories.length})
                      </p>
                    </div>

                    {/* Lista de Categorias Principais com Ícones e Seta Drill-down */}
                    <div className="space-y-2">
                      {filteredCategories.map(cat => {
                        const IconComponent = cat.icon;
                        const isCurrentCategory = selectedCategory.toUpperCase() === cat.key;

                        return (
                          <button
                            key={cat.key}
                            onClick={() => {
                              if (cat.subcategories.length > 0) {
                                setActiveCategoryKey(cat.key);
                              } else {
                                handleSelectSubcategory(cat.name, 'TODAS');
                              }
                            }}
                            className={`w-full p-3.5 rounded-2xl border flex items-center justify-between transition-all cursor-pointer group ${
                              isCurrentCategory
                                ? 'bg-amber-400/15 border-amber-400/60 text-amber-500 font-bold'
                                : cat.isPromo
                                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold'
                                  : isDark
                                    ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-100'
                                    : 'bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 text-slate-900 shadow-xs'
                            }`}
                          >
                            <div className="flex items-center space-x-3.5">
                              <div className={`p-2.5 rounded-2xl transition-transform group-hover:scale-105 ${cat.iconBg}`}>
                                <IconComponent className={`h-5 w-5 ${cat.iconColor}`} />
                              </div>
                              <div className="text-left">
                                <span className={`text-xs font-bold block ${cat.isPromo ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                                  {cat.name}
                                </span>
                                {cat.subcategories.length > 0 && (
                                  <span className={`text-[10px] font-medium block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {cat.subcategories.length} subcategoria(s)
                                  </span>
                                )}
                              </div>
                            </div>

                            <ChevronRight className="h-4 w-4 opacity-50 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 3. FOOTER DO MENU */}
            <div className={`p-4 border-t text-center shrink-0 ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-neutral-200/80 bg-neutral-50/50'}`}>
              <p className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Evidência Calçados • Com você no seu dia a dia
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
