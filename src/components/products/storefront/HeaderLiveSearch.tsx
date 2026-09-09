import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Zap, ChevronRight, Package, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../../context/AppContext';
import { Product } from '../../../types';
import { matchProductSearch } from '../utils/productFilterUtils';
import { hasProductValidPhoto } from '../../../utils/photoUtils';
import { calculateProductPriceDetails } from '../atomic/ProductPriceDisplay';
import { ProductImage } from '../atomic/ProductImage';
import { scrollToSectionWithOffset } from '../../../lib/scrollUtils';
import { extractBaseNameAndVariant } from '../../../services/moblinkProductsService';

interface HeaderLiveSearchProps {
  isMobile?: boolean;
}

export const HeaderLiveSearch: React.FC<HeaderLiveSearchProps> = ({ isMobile = false }) => {
  const {
    searchQuery,
    setSearchQuery,
    products = [],
    setCurrentView,
    setSelectedProduct,
    theme,
    saldaoConfig,
    promotions = [],
  } = useApp();

  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isDark = theme === 'dark';

  // Fechar dropdown ao clicar fora do componente
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fechar com Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFocused(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Busca Reativa e Instantânea em Tempo Real (Idêntica ao ERP MobLink)
  const searchResults = useMemo(() => {
    const query = (searchQuery || '').trim();
    if (!query) {
      return { matches: [], total: 0 };
    }

    const filtered = products.filter((prod) => {
      const isAvailable = prod.stock !== undefined ? prod.stock > 0 : (prod.saldo_loja ?? 0) > 0;
      return prod.visible && isAvailable && hasProductValidPhoto(prod) && matchProductSearch(prod, query);
    });

    const maxItems = isMobile ? 5 : 6;
    return {
      matches: filtered.slice(0, maxItems),
      total: filtered.length,
    };
  }, [products, searchQuery, isMobile]);

  const showDropdown = isFocused && Boolean(searchQuery.trim());

  const handleSelectProduct = (product: Product) => {
    setIsFocused(false);
    setSelectedProduct(product);
    setCurrentView('product-detail');
  };

  const handleViewAllCatalog = () => {
    setIsFocused(false);
    setCurrentView('home');
    setTimeout(() => {
      scrollToSectionWithOffset('catalog-products-section');
    }, 60);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      handleViewAllCatalog();
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Campo de Entrada de Busca */}
      <div className="relative w-full">
        <Search
          className={`absolute pointer-events-none transition-colors ${
            isMobile ? 'left-3 top-2.5 h-3.5 w-3.5' : 'left-4 top-3.5 h-4 w-4'
          } ${isDark ? 'text-slate-400' : 'text-white/80'}`}
        />

        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onFocus={() => setIsFocused(true)}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isMobile ? 'O que você procura?' : 'O que você procura? (ex: sandália, tênis, rasteira...)'}
          className={`w-full focus:outline-none transition-all border ${
            isMobile
              ? 'pl-9 pr-9 py-2 text-xs rounded-full'
              : 'pl-11 pr-10 py-3 text-xs sm:text-sm rounded-full'
          } ${
            isDark
              ? 'bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-400 focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 shadow-inner'
              : 'bg-white/15 border-white/25 text-white placeholder-white/75 focus:bg-white focus:text-neutral-900 focus:placeholder-neutral-400 focus:border-white shadow-inner focus:shadow-md'
          }`}
          autoComplete="off"
          spellCheck="false"
        />

        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              inputRef.current?.focus();
            }}
            className={`absolute p-1 rounded-full transition-colors cursor-pointer ${
              isMobile ? 'right-2.5 top-1.5' : 'right-3.5 top-2.5'
            } ${
              isDark
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                : 'text-white/80 hover:text-white hover:bg-white/20'
            }`}
            title="Limpar busca"
          >
            <X className={isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
          </button>
        )}
      </div>

      {/* Popover / Dropdown Flutuante de Busca Dinâmica */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className={`absolute top-full mt-2 left-0 right-0 z-50 rounded-2xl border shadow-2xl backdrop-blur-xl overflow-hidden ${
              isDark
                ? 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-slate-950/80'
                : 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-900/15'
            } ${isMobile ? 'max-h-[80vh] overflow-y-auto' : ''}`}
          >
            {/* Cabeçalho do Dropdown */}
            <div className={`px-4 py-2.5 border-b flex items-center justify-between text-xs ${
              isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50/80'
            }`}>
              <div className="flex items-center space-x-1.5">
                <span className="p-1 rounded-lg bg-[#0071E3]/10 text-[#0071E3] dark:bg-blue-500/20 dark:text-blue-400">
                  <Zap className="h-3.5 w-3.5 stroke-[2.5]" />
                </span>
                <span className="font-extrabold text-[11px] tracking-tight text-slate-700 dark:text-slate-200">
                  Sugestões da Vitrine
                </span>
              </div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {searchResults.total} {searchResults.total === 1 ? 'resultado' : 'resultados'}
              </span>
            </div>

            {/* Lista de Resultados Instantâneos */}
            {searchResults.total > 0 ? (
              <div className="p-1.5 divide-y divide-slate-100 dark:divide-slate-800/60">
                {searchResults.matches.map((product) => {
                  const priceInfo = calculateProductPriceDetails(product, saldaoConfig, promotions);
                  const { baseName } = extractBaseNameAndVariant(product.name || '');
                  const mobId = product.id || product.moblinkId;

                  return (
                    <div
                      key={product.id}
                      onClick={() => handleSelectProduct(product)}
                      className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                        isDark
                          ? 'hover:bg-slate-800/70 text-slate-100'
                          : 'hover:bg-blue-50/60 text-slate-900'
                      }`}
                    >
                      {/* Foto e Informações do Produto */}
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200/60 dark:border-slate-700/60 shadow-xs">
                          <ProductImage
                            product={product}
                            alt={product.name}
                            variant="thumb"
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold truncate group-hover:text-[#0071E3] dark:group-hover:text-blue-400 transition-colors">
                            {product.name}
                          </h4>

                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                            {product.brand && (
                              <span className="font-semibold text-slate-600 dark:text-slate-300">
                                {product.brand}
                              </span>
                            )}
                            {product.category && (
                              <>
                                <span>•</span>
                                <span className="truncate">{product.category}</span>
                              </>
                            )}
                            {mobId && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-[9px] px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                                  #{mobId}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Preço e Ação */}
                      <div className="text-right shrink-0 flex items-center space-x-2">
                        <div>
                          <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                            R$ {priceInfo.pixPrice}
                            <span className="text-[9px] font-medium ml-1">à vista</span>
                          </div>
                          <div className="text-[10px] font-medium text-slate-400">
                            ou R$ {priceInfo.mainPrice.toFixed(2).replace('.', ',')}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#0071E3] group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Estado Vazio Quando Não Encontra Produtos */
              <div className="p-6 text-center space-y-2">
                <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  <Package className="w-5 h-5 stroke-[1.5]" />
                </div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Nenhum produto encontrado para "{searchQuery.trim()}"
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Tente buscar pelo modelo (ex: Sound Kids), marca, categoria ou numeração (ex: 37).
                </p>
              </div>
            )}

            {/* Rodapé: Ver todos no Catálogo */}
            {searchResults.total > 0 && (
              <div className={`p-2 border-t text-center ${
                isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50/80'
              }`}>
                <button
                  type="button"
                  onClick={handleViewAllCatalog}
                  className="w-full py-2 px-3 rounded-xl bg-[#0071E3] hover:bg-[#005bb5] text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 shadow-sm active:scale-[0.99]"
                >
                  <span>Ver todos os {searchResults.total} produtos no catálogo</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
