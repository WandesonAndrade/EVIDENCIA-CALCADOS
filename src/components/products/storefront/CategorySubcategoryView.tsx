import React, { useState, useMemo } from 'react';
import { Sparkles, ChevronRight, Layers, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../../context/AppContext';
import { scrollToSectionWithOffset } from '../../../lib/scrollUtils';
import {
  AudienceKey,
  AUDIENCE_CONFIGS,
  extractAudienceSubcategories,
  buildCategoryUrl,
  isProductInAudience,
} from '../utils/categoryNavigationUtils';

export interface CategorySubcategoryViewProps {
  initialAudience?: AudienceKey;
  onNavigate?: (category: string, subcategory?: string) => void;
  className?: string;
  showTabs?: boolean;
}

export const CategorySubcategoryView: React.FC<CategorySubcategoryViewProps> = ({
  initialAudience = 'feminino',
  onNavigate,
  className = '',
  showTabs = true,
}) => {
  const {
    products = [],
    theme,
    setSelectedCategory,
    setSelectedMenuTab,
    setSelectedSubcategory,
    setCurrentView,
  } = useApp();

  const [activeAudience, setActiveAudience] = useState<AudienceKey>(initialAudience);
  const isDark = theme === 'dark';

  const audienceConfig = AUDIENCE_CONFIGS[activeAudience];

  // Extrai subcategorias reais e dinâmicas com base nos produtos em estoque com foto
  const subcategories = useMemo(() => {
    return extractAudienceSubcategories(products, activeAudience);
  }, [products, activeAudience]);

  // Contagem total de produtos para cada público-alvo
  const audienceTotals = useMemo(() => {
    const totals: Record<AudienceKey, number> = {
      feminino: 0,
      masculino: 0,
      infantil: 0,
    };

    products.forEach((p) => {
      const isAvailable = p.stock !== undefined ? p.stock > 0 : (p.saldo_loja ?? 0) > 0;
      if (p.visible === false || !isAvailable) return;

      if (isProductInAudience(p, 'feminino')) totals.feminino += 1;
      if (isProductInAudience(p, 'masculino')) totals.masculino += 1;
      if (isProductInAudience(p, 'infantil')) totals.infantil += 1;
    });

    return totals;
  }, [products]);

  // Handler unificado de navegação e atualização de rotas
  const handleCategoryNavigation = (categoryKey: AudienceKey, subcategoryName?: string) => {
    const catUpper = categoryKey.toUpperCase();
    const targetSub = subcategoryName && subcategoryName !== 'TODAS' && subcategoryName !== 'TODOS'
      ? subcategoryName
      : 'TODAS';

    if (onNavigate) {
      onNavigate(catUpper, targetSub);
      return;
    }

    // Atualiza estado global do AppContext
    setSelectedCategory(catUpper);
    if (setSelectedMenuTab) setSelectedMenuTab(categoryKey);
    if (setSelectedSubcategory) setSelectedSubcategory(targetSub);
    setCurrentView('category-page');

    // Sincroniza query params na URL da aplicação
    const newQueryString = buildCategoryUrl(categoryKey, targetSub);
    if (typeof window !== 'undefined') {
      try {
        const fullUrl = `${window.location.pathname}${newQueryString}#category-page`;
        window.history.pushState(null, '', fullUrl);
      } catch (err) {
        console.warn('Falha ao atualizar parâmetros de URL:', err);
      }
    }

    // Scroll suave para a seção de produtos
    setTimeout(() => {
      scrollToSectionWithOffset('category-all-items-section');
    }, 120);
  };

  return (
    <section className={`w-full space-y-4 text-left ${className}`}>
      {/* 1. SELETOR DE ABAS PRINCIPAIS (FEMININO, MASCULINO, INFANTIL) */}
      {showTabs && (
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar pb-1">
          <div className={`inline-flex p-1.5 rounded-2xl border ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-100/90 border-slate-200/70'
          }`}>
            {(['feminino', 'masculino', 'infantil'] as AudienceKey[]).map((key) => {
              const cfg = AUDIENCE_CONFIGS[key];
              const isActive = activeAudience === key;
              const totalCount = audienceTotals[key];

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveAudience(key)}
                  className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 relative shrink-0 ${
                    isActive
                      ? isDark
                        ? 'bg-[#0071E3] text-white shadow-md'
                        : 'bg-[#003B73] text-white shadow-md'
                      : isDark
                        ? 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
                >
                  <span>{cfg.label}</span>
                  {totalCount > 0 && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : isDark
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {totalCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. CONTAINER CARD COM BANNER SUPERIOR E GRID DE SUBCATEGORIAS */}
      <div
        className={`rounded-3xl border p-4 sm:p-6 transition-all shadow-md ${
          isDark
            ? 'bg-slate-900/95 border-slate-800 shadow-slate-950/50'
            : 'bg-white border-slate-200/80 shadow-slate-100'
        }`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeAudience}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="space-y-6"
          >
            {/* BANNER SUPERIOR (IDÊNTICO À IMAGEM DE REFERÊNCIA) */}
            <div
              className={`p-5 sm:p-7 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border text-white shadow-lg bg-gradient-to-r ${audienceConfig.bannerGradient}`}
            >
              <div className="space-y-1.5 max-w-2xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black tracking-wider uppercase border border-amber-400/30">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{audienceConfig.collectionBadge}</span>
                </div>

                <h3 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white">
                  {audienceConfig.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
                  {audienceConfig.subtitle}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleCategoryNavigation(activeAudience, 'TODAS')}
                className="px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md active:scale-95 shrink-0"
              >
                <span>{audienceConfig.ctaText}</span>
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>

            {/* GRID DE CARDS DE SUBCATEGORIAS DINÂMICAS */}
            {subcategories.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-3.5">
                {subcategories.map((item) => (
                  <button
                    key={item.slug}
                    type="button"
                    onClick={() => handleCategoryNavigation(activeAudience, item.name)}
                    className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between group active:scale-[0.98] ${
                      isDark
                        ? 'bg-slate-800/60 border-slate-700/80 hover:bg-[#0071E3]/20 hover:border-blue-400/50 text-slate-100 shadow-2xs'
                        : 'bg-white border-slate-200/80 hover:bg-[#003B73] hover:text-white hover:border-[#003B73] text-slate-800 shadow-2xs hover:shadow-md'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <span className="text-xs sm:text-sm font-bold block truncate group-hover:translate-x-0.5 transition-transform">
                        {item.name}
                      </span>
                      <span className="text-[11px] font-medium opacity-65 block mt-0.5">
                        {item.count} {item.count === 1 ? 'produto' : 'produtos'}
                      </span>
                    </div>

                    <ChevronRight className="w-4 h-4 shrink-0 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 space-y-2">
                <Layers className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Nenhuma subcategoria individual com estoque e foto no momento para {audienceConfig.label}.
                </p>
                <button
                  type="button"
                  onClick={() => handleCategoryNavigation(activeAudience, 'TODAS')}
                  className="text-xs font-extrabold text-[#0071E3] dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>Explorar todos os produtos de {audienceConfig.label}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};
