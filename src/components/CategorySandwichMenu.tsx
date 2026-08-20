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

const cleanStringForMatch = (str: string) =>
  (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();

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
    theme,
    saldaoConfig
  } = useApp();

  const isDark = theme === 'dark';

  // Level 1: null (Categorias Principais) | string (Nome da Categoria Selecionada)
  const [activeCategoryKey, setActiveCategoryKey] = useState<string | null>(null);
  const [menuSearchQuery, setMenuSearchQuery] = useState('');

  // Ícones e paleta visual padronizada com as cores da marca (Azul Institucional & Azul Vibrante)
  const categoryMetaMap: Record<string, { icon: React.ElementType; bg: string; color: string }> = {
    'SALDÃO': { icon: Tag, bg: 'bg-rose-50 dark:bg-rose-950/50', color: 'text-rose-600 dark:text-rose-400' },
    'CALÇADOS': { icon: Footprints, bg: 'bg-[#EEF8FF] dark:bg-blue-950/60', color: 'text-[#006EDB] dark:text-blue-300' },
    'ACESSÓRIOS': { icon: ShoppingBag, bg: 'bg-[#EEF8FF] dark:bg-blue-950/60', color: 'text-[#006EDB] dark:text-blue-300' },
    'CONFECÇÕES': { icon: Shirt, bg: 'bg-[#EEF8FF] dark:bg-blue-950/60', color: 'text-[#006EDB] dark:text-blue-300' },
    'NOVIDADES': { icon: Sparkles, bg: 'bg-[#EEF8FF] dark:bg-blue-950/60', color: 'text-[#006EDB] dark:text-blue-300' },
    'PROMOÇÕES': { icon: Tag, bg: 'bg-rose-50 dark:bg-rose-950/50', color: 'text-rose-600 dark:text-rose-400' },
    'DIVERSOS': { icon: Grid, bg: 'bg-[#EEF8FF] dark:bg-blue-950/60', color: 'text-[#006EDB] dark:text-blue-300' },
    'COSMÉTICOS': { icon: Smile, bg: 'bg-[#EEF8FF] dark:bg-blue-950/60', color: 'text-[#006EDB] dark:text-blue-300' },
    'PERFUMES': { icon: Gift, bg: 'bg-[#EEF8FF] dark:bg-blue-950/60', color: 'text-[#006EDB] dark:text-blue-300' },
    'ESCOLAR': { icon: Compass, bg: 'bg-[#EEF8FF] dark:bg-blue-950/60', color: 'text-[#006EDB] dark:text-blue-300' },
  };

  // Mapeamento dinâmico de categorias e suas subcategorias do catálogo
  const menuCategories: CategoryMenuItem[] = useMemo(() => {
    const activeProducts = (products || []).filter(p => p.visible !== false);
    const categoryMap = new Map<string, { name: string; key: string; isPromo?: boolean; subs: Set<string> }>();

    // 1. Categorias Padrão Essenciais
    const defaults = [
      { name: 'Ofertas & Saldão', key: 'OFERTAS', isPromo: true },
      { name: 'Calçados', key: 'CALÇADOS' },
      { name: 'Acessórios', key: 'ACESSÓRIOS' },
      { name: 'Confecções', key: 'CONFECÇÕES' },
      { name: 'Novidades', key: 'NOVIDADES' },
      { name: 'Diversos', key: 'DIVERSOS' },
    ];

    defaults.forEach(d => {
      categoryMap.set(d.key, { name: d.name, key: d.key, isPromo: d.isPromo, subs: new Set<string>() });
    });

    // 2. Extrai subcategorias das categorias do Firestore
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

    // 3. Extrai subcategorias dos produtos visíveis no Firestore
    activeProducts.forEach(p => {
      if (!p.category) return;
      const rawCatName = normalizeCategoryName(p.category);
      const catKey = rawCatName.trim().toUpperCase();

      if (!categoryMap.has(catKey)) {
        categoryMap.set(catKey, { name: rawCatName, key: catKey, subs: new Set<string>() });
      }

      if (p.subcategory) {
        const subName = normalizeSubcategoryName(p.subcategory);
        if (subName && subName.toUpperCase() !== 'TODAS') {
          categoryMap.get(catKey)?.subs.add(subName);
        }
      }
    });

    // Retorna todas as categorias configuradas na loja sem descarte
    return Array.from(categoryMap.values()).map(item => {
      const itemMatchKey = cleanStringForMatch(item.key);
      const meta = categoryMetaMap[item.key] || categoryMetaMap[itemMatchKey] || { icon: Layers, bg: 'bg-[#EEF8FF] dark:bg-blue-950/60', color: 'text-[#006EDB] dark:text-blue-300' };

      const validSubs = Array.from(item.subs);

      // Se for Calçados e não tiver subcategorias dinâmicas registradas ainda, insere as subcategorias padrão
      if (validSubs.length === 0 && itemMatchKey === 'CALCADOS') {
        validSubs.push('Feminino', 'Masculino', 'Infantil', 'Sandálias', 'Tênis', 'Rasteiras', 'Saltos', 'Botas', 'Mocassim');
      }

      return {
        name: item.name,
        key: item.key,
        icon: meta.icon,
        iconBg: meta.bg,
        iconColor: meta.color,
        isPromo: item.isPromo,
        subcategories: validSubs.sort()
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
    if (catUpper.includes('SALDÃO') || catUpper.includes('SALDAO') || catUpper.includes('OFERTA') || catUpper.includes('PROMOÇ')) {
      setSelectedCategory('OFERTAS');
      if (setSelectedMenuTab) setSelectedMenuTab('ofertas');
      if (setSelectedSubcategory) setSelectedSubcategory('TODAS');
    } else {
      setSelectedCategory(catUpper);
      if (setSelectedMenuTab) setSelectedMenuTab(categoryName.toLowerCase());
      if (setSelectedSubcategory) setSelectedSubcategory(subcategoryName);
    }
    
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
              isDark ? 'bg-slate-950 border-r border-slate-800 text-white' : 'bg-[#EAF5FF] border-r border-blue-900/10 text-slate-900'
            }`}
          >
            {/* 1. TOP HEADER BAR DO MENU EM AZUL INSTITUCIONAL #003B73 */}
            <div className="px-5 py-4.5 bg-[#003B73] text-white flex items-center justify-between shrink-0 shadow-md">
              <div className="flex items-center space-x-3">
                {activeCategoryKey ? (
                  <button
                    onClick={() => setActiveCategoryKey(null)}
                    className="p-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 transition-all cursor-pointer flex items-center space-x-1.5 text-xs font-bold text-white shadow-xs"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Voltar</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-white/15 border border-white/20 text-white">
                      <Menu className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#DDF1FF] block">
                        EVÍDÊNCIA CALÇADOS
                      </span>
                      <h2 className="text-base font-black tracking-tight leading-none text-white">
                        Menu da Loja
                      </h2>
                    </div>
                  </div>
                )}
              </div>

              {/* Botão Fechar Menu */}
              <button
                onClick={onClose}
                className="p-2 rounded-full text-white/90 hover:text-white hover:bg-white/15 transition-all cursor-pointer"
                title="Fechar Menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Campo de Busca Rápida no Menu */}
            <div className={`px-5 py-3 border-b shrink-0 ${isDark ? 'border-slate-800/80 bg-slate-900/40' : 'border-blue-900/10 bg-white/60'}`}>
              <div className="relative">
                <input
                  type="text"
                  value={menuSearchQuery}
                  onChange={e => setMenuSearchQuery(e.target.value)}
                  placeholder={activeCategory ? `Buscar em ${activeCategory.name}...` : "Buscar categoria ou departamento..."}
                  className={`w-full pl-9 pr-4 py-2.5 text-xs rounded-2xl border focus:outline-none transition-all ${
                    isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-[#006EDB]'
                      : 'bg-white border-blue-900/15 text-[#003B73] font-medium placeholder-[#52708F] focus:border-[#006EDB] focus:ring-4 focus:ring-[#DDF1FF] shadow-xs'
                  }`}
                />
                <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-[#52708F]" />
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
                      isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-blue-900/10 shadow-xs'
                    }`}>
                      <div className={`p-3 rounded-2xl ${activeCategory.iconBg}`}>
                        <activeCategory.icon className={`h-6 w-6 ${activeCategory.iconColor}`} />
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#006EDB]">
                          DEPARTAMENTO
                        </span>
                        <h3 className="text-lg font-black tracking-tight leading-tight text-[#003B73] dark:text-white">
                          {activeCategory.name}
                        </h3>
                      </div>
                    </div>

                    {/* Opção Rápida: Ver todos os produtos dessa Categoria */}
                    <button
                      onClick={() => handleSelectSubcategory(activeCategory.name, 'TODAS')}
                      className={`w-full p-3.5 rounded-2xl border flex items-center justify-between transition-all cursor-pointer font-bold text-xs ${
                        selectedCategory.toUpperCase() === activeCategory.key && selectedSubcategory === 'TODAS'
                          ? 'bg-[#006EDB] border-[#006EDB] text-white shadow-md'
                          : isDark
                            ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-200'
                            : 'bg-white border-blue-900/10 hover:bg-[#EEF8FF] text-[#003B73] shadow-xs'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <PackageCheck className="h-4 w-4 text-[#006EDB]" />
                        <span>Ver Todos em {activeCategory.name}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 opacity-50" />
                    </button>

                    {/* Título da Lista de Subcategorias */}
                    <div className="pt-2">
                      <p className={`text-[11px] font-extrabold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-[#52708F]'}`}>
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
                                    ? 'bg-[#006EDB] text-white font-black border-transparent shadow-md'
                                    : isDark
                                      ? 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-800/80 text-slate-300'
                                      : 'bg-white border-blue-900/10 hover:bg-[#EEF8FF] text-[#003B73]'
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
                          isDark ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-white border-blue-900/10 text-[#52708F]'
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
                    {/* Banner de Destaque no Topo do Menu em Dourado Evidência */}
                    <div
                      onClick={() => handleSelectSubcategory('NOVIDADES', 'TODAS')}
                      className={`p-4 rounded-3xl border flex items-center justify-between cursor-pointer transition-transform hover:scale-[1.01] shadow-sm ${
                        isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-[#FFF8E1] border-[#FFC928]/40 text-[#003B73]'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2.5 rounded-2xl bg-[#FFC928] text-[#003B73] shadow-xs">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-[#52708F]">Destaque de Hoje</p>
                          <h4 className="text-sm font-black tracking-tight text-[#003B73]">Novidades da Coleção</h4>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-[#003B73] opacity-70" />
                    </div>

                    {/* Cabeçalho de Seção */}
                    <div className="pt-1 flex items-center justify-between">
                      <p className={`text-[11px] font-extrabold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-[#52708F]'}`}>
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
                                ? 'bg-[#EEF8FF] border-[#006EDB] text-[#006EDB] font-bold shadow-xs'
                                : cat.isPromo
                                  ? 'bg-rose-50 border-rose-200 text-rose-600 dark:text-rose-400 font-bold'
                                  : isDark
                                    ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-100'
                                    : 'bg-white border-blue-900/10 hover:border-blue-900/20 hover:bg-[#EEF8FF] text-[#003B73] shadow-xs'
                            }`}
                          >
                            <div className="flex items-center space-x-3.5">
                              <div className={`p-2.5 rounded-2xl transition-transform group-hover:scale-105 ${cat.iconBg}`}>
                                <IconComponent className={`h-5 w-5 ${cat.iconColor}`} />
                              </div>
                              <div className="text-left">
                                <span className={`text-xs font-bold block ${cat.isPromo ? 'text-rose-600 dark:text-rose-400' : 'text-[#003B73] dark:text-white'}`}>
                                  {cat.name}
                                </span>
                                {cat.subcategories.length > 0 && (
                                  <span className={`text-[10px] font-medium block ${isDark ? 'text-slate-400' : 'text-[#52708F]'}`}>
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
            <div className={`p-4 border-t text-center shrink-0 ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-blue-900/10 bg-white'}`}>
              <p className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-[#52708F]'}`}>
                Evidência Calçados • Com você no seu dia a dia
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
