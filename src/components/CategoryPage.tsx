import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import { 
  Percent, 
  ChevronLeft, 
  ChevronRight, 
  ArrowLeft, 
  Timer, 
  Filter, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  SlidersHorizontal,
  RotateCcw,
  Tag,
  Ruler
} from 'lucide-react';
import { Hero } from './Hero';
import { ProductCard } from './ProductList';
import { scrollToSectionWithOffset } from '../lib/scrollUtils';
import { normalizeCategoryName, normalizeSubcategoryName, isProductInCategory } from '../services/moblinkCategoriesService';

interface TabConfig {
  title: string;
  subtitle: string;
  bannerImage: string;
  badgeText: string;
  filter: (prod: Product) => boolean;
}

const TAB_CONFIGS: Record<string, TabConfig> = {
  'cosmeticos': {
    title: 'Cosméticos & Beleza',
    subtitle: 'Linha completa de cuidados pessoais, maquiagem, itens de estética e beleza.',
    bannerImage: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'BELEZA & BEM-ESTAR',
    filter: (prod) => isProductInCategory(prod, 'COSMÉTICOS')
  },
  'perfumes': {
    title: 'Perfumes & Fragrâncias',
    subtitle: 'Fragrâncias exclusivas, eau de parfum e colônias importadas para encantar.',
    bannerImage: 'https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'FRAGRÂNCIAS NOBRES',
    filter: (prod) => isProductInCategory(prod, 'PERFUMES')
  },
  'escolar': {
    title: 'Artigos Escolares & Mochilas',
    subtitle: 'Mochilas duráveis, estojos e utilitários escolares para o dia a dia de estudos.',
    bannerImage: 'https://images.unsplash.com/photo-1588072432836-e10032774350?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'VOLTA ÀS AULAS',
    filter: (prod) => isProductInCategory(prod, 'ESCOLAR')
  },
  'acessorios': {
    title: 'Acessórios Sofisticados',
    subtitle: 'Cintos, carteiras, bolsas e adornos refinados para complementar seu estilo.',
    bannerImage: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'DETALHES PREMIUM',
    filter: (prod) => isProductInCategory(prod, 'ACESSÓRIOS')
  },
  'acessórios': {
    title: 'Acessórios Sofisticados',
    subtitle: 'Cintos, carteiras, bolsas e adornos refinados para complementar seu estilo.',
    bannerImage: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'DETALHES PREMIUM',
    filter: (prod) => isProductInCategory(prod, 'ACESSÓRIOS')
  },
  'calcados': {
    title: 'Coleção de Calçados',
    subtitle: 'Tênis, sandálias, sapatos, botas e papetes com o máximo conforto e elegância.',
    bannerImage: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'CALÇADOS PREMIUM',
    filter: (prod) => isProductInCategory(prod, 'CALÇADOS')
  },
  'calçados': {
    title: 'Coleção de Calçados',
    subtitle: 'Tênis, sandálias, sapatos, botas e papetes com o máximo conforto e elegância.',
    bannerImage: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'CALÇADOS PREMIUM',
    filter: (prod) => isProductInCategory(prod, 'CALÇADOS')
  },
  'diversos': {
    title: 'Produtos Diversos',
    subtitle: 'Variedade de artigos selecionados com qualidade garantida Evidência Calçados.',
    bannerImage: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'DIVERSOS & NOVIDADES',
    filter: () => true
  },
  'confecções': {
    title: 'Moda & Confecções',
    subtitle: 'Roupas e peças de vestuário contemporâneas para renovar seu estilo.',
    bannerImage: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'CONFECÇÕES & VESTUÁRIO',
    filter: (prod) => isProductInCategory(prod, 'CONFECÇÕES')
  },
  'confeccoes': {
    title: 'Moda & Confecções',
    subtitle: 'Roupas e peças de vestuário contemporâneas para renovar seu estilo.',
    bannerImage: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'CONFECÇÕES & VESTUÁRIO',
    filter: (prod) => isProductInCategory(prod, 'CONFECÇÕES')
  },
  'confecção': {
    title: 'Moda & Confecções',
    subtitle: 'Roupas e peças de vestuário contemporâneas para renovar seu estilo.',
    bannerImage: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'CONFECÇÕES & VESTUÁRIO',
    filter: (prod) => isProductInCategory(prod, 'CONFECÇÕES')
  },
  'lançamentos': {
    title: 'Novidades & Lançamentos',
    subtitle: 'Confira as últimas novidades e as maiores tendências exclusivas da Evidência Calçados.',
    bannerImage: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'NOVA COLEÇÃO 2026',
    filter: (prod) => !!prod.newArrival
  },
  'novidades': {
    title: 'Novidades & Lançamentos',
    subtitle: 'Confira as últimas novidades e as maiores tendências exclusivas da Evidência Calçados.',
    bannerImage: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'NOVA COLEÇÃO 2026',
    filter: (prod) => !!prod.newArrival
  },
  'promoções': {
    title: 'Super Campanhas de Ofertas',
    subtitle: 'Descontos especiais com condições exclusivas no Crediário Próprio Evidência.',
    bannerImage: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'CAMPANHA PROMOCIONAL',
    filter: (prod) => !!prod.onSale || (prod.originalPrice && prod.originalPrice > prod.price)
  },
  'promocoes': {
    title: 'Super Campanhas de Ofertas',
    subtitle: 'Descontos especiais com condições exclusivas no Crediário Próprio Evidência.',
    bannerImage: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'CAMPANHA PROMOCIONAL',
    filter: (prod) => !!prod.onSale || (prod.originalPrice && prod.originalPrice > prod.price)
  },
  'ofertas': {
    title: 'Super Campanhas de Ofertas',
    subtitle: 'Descontos especiais com condições exclusivas no Crediário Próprio Evidência.',
    bannerImage: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=1600&auto=format&fit=crop',
    badgeText: 'CAMPANHA PROMOCIONAL',
    filter: (prod) => !!prod.onSale || (prod.originalPrice && prod.originalPrice > prod.price)
  }
};

// Lista de marcas conhecidas para inferência caso o produto não possua marca explícita
const KNOWN_FOOTWEAR_BRANDS = [
  'Nike', 'Adidas', 'Moleca', 'Beira Rio', 'Dakota', 'Via Marte', 'Olympikus', 
  'Havaianas', 'Vizzano', 'Modare', 'Pampili', 'Schutz', 'Arezzo', 'Santa Lolla', 
  'Usaflex', 'Anacapri', 'Zaxy', 'Rider', 'Ipanema', 'Cartago', 'Mizuno', 'Puma', 
  'Under Armour', 'Asics', 'Fila', 'Pegada', 'Democrata', 'Ferracini', 'Crocs'
];

export const CategoryPage: React.FC = () => {
  const { 
    products, 
    selectedMenuTab, 
    setCurrentView, 
    setSelectedProduct,
    searchQuery,
    theme,
    categories,
    favorites = [],
    toggleFavorite,
    selectedSubcategory: globalSubcategory,
    setSelectedSubcategory: setGlobalSubcategory
  } = useApp();

  const isDark = theme === 'dark';
  const [cardsPerPage, setCardsPerPage] = useState(4);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('TODAS');
  const [timeLeft, setTimeLeft] = useState({ horas: 23, minutos: 59, segundos: 59 });
  const gridSectionRef = useRef<HTMLDivElement | null>(null);

  // ESTADOS DOS FILTROS (MARCA, GRADE/TAMANHO, PREÇO, OFERTAS)
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<string>('all');
  const [onlySale, setOnlySale] = useState<boolean>(false);
  const [brandSearch, setBrandSearch] = useState<string>('');

  // ESTADOS DOS ACCORDIONS DA BARRA LATERAL DE FILTROS
  const [isBrandOpen, setIsBrandOpen] = useState<boolean>(true);
  const [isGradeOpen, setIsGradeOpen] = useState<boolean>(true);
  const [isPriceOpen, setIsPriceOpen] = useState<boolean>(true);

  // MODAL / DRAWER MOBILE DE FILTROS
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState<boolean>(false);

  useEffect(() => {
    if (globalSubcategory && globalSubcategory !== 'TODAS' && globalSubcategory !== 'TODOS') {
      setSelectedSubcategory(globalSubcategory);
    }
  }, [globalSubcategory]);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToSectionWithOffset(gridSectionRef.current || 'category-all-items-section');
    }, 120);

    return () => clearTimeout(timer);
  }, [selectedMenuTab, globalSubcategory]);

  const activeSubcategory = (globalSubcategory && globalSubcategory !== 'TODAS' && globalSubcategory !== 'TODOS')
    ? globalSubcategory
    : (selectedSubcategory && selectedSubcategory !== 'TODAS' && selectedSubcategory !== 'TODOS')
    ? selectedSubcategory
    : null;

  const getTabConfig = () => {
    if (activeSubcategory) {
      const cleanSub = activeSubcategory.trim().toUpperCase();
      const normSub = normalizeSubcategoryName(cleanSub).toUpperCase();
      return {
        title: activeSubcategory.toUpperCase(),
        subtitle: `Confira todos os modelos de ${activeSubcategory} disponíveis com pronta entrega na Evidência Calçados.`,
        bannerImage: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=1600&auto=format&fit=crop',
        badgeText: `SUBCATEGORIA: ${activeSubcategory.toUpperCase()}`,
        filter: (prod: Product) => {
          const catRaw = (prod.category || '').toUpperCase();
          const grupoRaw = (prod.nome_grupo || '').toUpperCase();
          const subRaw = (prod.nome_subgrupo || prod.subcategory || '').toUpperCase();
          const normSubRaw = normalizeSubcategoryName(subRaw).toUpperCase();
          const nameRaw = (prod.name || '').toUpperCase();

          return (
            subRaw.includes(cleanSub) ||
            normSubRaw.includes(normSub) ||
            catRaw.includes(cleanSub) ||
            grupoRaw.includes(cleanSub) ||
            nameRaw.includes(cleanSub)
          );
        }
      };
    }

    const cleanTabKey = (selectedMenuTab || '').trim().toLowerCase();

    if (TAB_CONFIGS[cleanTabKey]) {
      return TAB_CONFIGS[cleanTabKey];
    }

    if (cleanTabKey === 'todos') {
      return {
        title: 'TODOS OS PRODUTOS',
        subtitle: 'Confira nosso catálogo completo de calçados, bolsas e acessórios.',
        bannerImage: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=1600&auto=format&fit=crop',
        badgeText: 'CATÁLOGO COMPLETO',
        filter: () => true
      };
    }
    
    const foundCategory = categories.find(c => c.id === selectedMenuTab || c.name.toLowerCase() === selectedMenuTab.toLowerCase() || normalizeCategoryName(c.name).toLowerCase() === selectedMenuTab.toLowerCase());
    if (foundCategory) {
      const normCatName = normalizeCategoryName(foundCategory.name);
      return {
        title: normCatName,
        subtitle: foundCategory.description || `Confira nossa coleção de ${normCatName} com condições e qualidade exclusivas Evidência Calçados.`,
        bannerImage: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=1600&auto=format&fit=crop',
        badgeText: normCatName.toUpperCase(),
        filter: (prod: Product) => isProductInCategory(prod, foundCategory.name)
      };
    }

    const cleanTabStr = (selectedMenuTab || '').trim();
    const normTabName = normalizeCategoryName(cleanTabStr);
    return {
      title: normTabName ? normTabName.toUpperCase() : 'COLEÇÃO EVIDÊNCIA',
      subtitle: `Confira nossa coleção de ${normTabName} com condições e qualidade exclusivas Evidência Calçados.`,
      bannerImage: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=1600&auto=format&fit=crop',
      badgeText: normTabName.toUpperCase(),
      filter: (prod: Product) => isProductInCategory(prod, cleanTabStr)
    };
  };

  const config = getTabConfig();

  useEffect(() => {
    const updateCardsPerPage = () => {
      if (window.innerWidth >= 1280) setCardsPerPage(5);
      else if (window.innerWidth >= 1024) setCardsPerPage(4);
      else if (window.innerWidth >= 768) setCardsPerPage(3);
      else setCardsPerPage(2);
    };
    
    updateCardsPerPage();
    window.addEventListener('resize', updateCardsPerPage);
    return () => window.removeEventListener('resize', updateCardsPerPage);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.segundos > 0) return { ...prev, segundos: prev.segundos - 1 };
        if (prev.minutos > 0) return { ...prev, minutos: prev.minutos - 1, segundos: 59 };
        if (prev.horas > 0) return { horas: prev.horas - 1, minutos: 59, segundos: 59 };
        return { horas: 23, minutos: 59, segundos: 59 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [selectedMenuTab]);

  const handleVerDetalhes = (prod: Product) => {
    setSelectedProduct(prod);
    setCurrentView('product-detail');
  };

  const formatNumber = (num: number) => num.toString().padStart(2, '0');

  // PRODUTOS BASE QUE PERTENCEM À CATEGORIA OU SUBCATEGORIA ATIVA
  const baseCategoryItems = useMemo(() => {
    return products.filter((prod) => {
      const matchesSearch = searchQuery 
        ? prod.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          prod.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          prod.category.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      
      const isAvailable = (prod.stock !== undefined ? prod.stock > 0 : (prod.saldo_loja ?? 0) > 0);
      return prod.visible && isAvailable && matchesSearch && config.filter(prod);
    });
  }, [products, searchQuery, config]);

  // EXTRATOR DINÂMICO DE MARCAS DISPONÍVEIS
  const availableBrands = useMemo(() => {
    const brandMap = new Map<string, number>();
    
    baseCategoryItems.forEach(prod => {
      let b = (prod.brand || (prod as any).marca || '').trim();
      if (!b) {
        const found = KNOWN_FOOTWEAR_BRANDS.find(kb => new RegExp(`\\b${kb}\\b`, 'i').test(prod.name));
        if (found) b = found;
      }
      if (!b) b = 'Outras Marcas';

      brandMap.set(b, (brandMap.get(b) || 0) + 1);
    });

    return Array.from(brandMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [baseCategoryItems]);

  // EXTRATOR DINÂMICO DE GRADES E TAMANHOS DISPONÍVEIS
  const availableSizes = useMemo(() => {
    const sizeSet = new Set<string>();

    baseCategoryItems.forEach(prod => {
      if (Array.isArray(prod.sizes) && prod.sizes.length > 0) {
        prod.sizes.forEach(s => sizeSet.add(String(s).trim()));
      }
      if (prod.stockBySize) {
        Object.keys(prod.stockBySize).forEach(s => {
          if ((prod.stockBySize?.[s] ?? 0) > 0) sizeSet.add(String(s).trim());
        });
      }
      if (prod.sizeStockMap) {
        Object.keys(prod.sizeStockMap).forEach(s => {
          if ((prod.sizeStockMap?.[s] ?? 0) > 0) sizeSet.add(String(s).trim());
        });
      }
    });

    return Array.from(sizeSet).sort((a, b) => {
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [baseCategoryItems]);

  // PRODUTOS FILTRADOS PELOS CRITÉRIOS SELECIONADOS (MARCA, TAMANHO, PREÇO, OFERTA)
  const filteredItems = useMemo(() => {
    return baseCategoryItems.filter(prod => {
      // 1. Filtro por Marca
      if (selectedBrands.length > 0) {
        let prodBrand = (prod.brand || (prod as any).marca || '').trim();
        if (!prodBrand) {
          const found = KNOWN_FOOTWEAR_BRANDS.find(kb => new RegExp(`\\b${kb}\\b`, 'i').test(prod.name));
          if (found) prodBrand = found;
        }
        if (!prodBrand) prodBrand = 'Outras Marcas';

        if (!selectedBrands.includes(prodBrand)) {
          return false;
        }
      }

      // 2. Filtro por Grade / Tamanho
      if (selectedSizes.length > 0) {
        let prodSizes: string[] = [];
        if (Array.isArray(prod.sizes)) prodSizes.push(...prod.sizes.map(String));
        if (prod.stockBySize) {
          Object.entries(prod.stockBySize).forEach(([sz, st]) => {
            if (st > 0) prodSizes.push(String(sz));
          });
        }
        if (prod.sizeStockMap) {
          Object.entries(prod.sizeStockMap).forEach(([sz, st]) => {
            if (st > 0) prodSizes.push(String(sz));
          });
        }

        const hasMatchingSize = selectedSizes.some(sz => prodSizes.includes(sz));
        if (!hasMatchingSize) {
          return false;
        }
      }

      // 3. Filtro por Faixa de Preço
      if (priceRange !== 'all') {
        const price = prod.price;
        if (priceRange === 'under100' && price > 100) return false;
        if (priceRange === '100to200' && (price < 100 || price > 200)) return false;
        if (priceRange === '200to300' && (price < 200 || price > 300)) return false;
        if (priceRange === 'above300' && price < 300) return false;
      }

      // 4. Filtro por Apenas Promoções
      if (onlySale) {
        const isSale = !!prod.onSale || (prod.originalPrice && prod.originalPrice > prod.price);
        if (!isSale) return false;
      }

      return true;
    });
  }, [baseCategoryItems, selectedBrands, selectedSizes, priceRange, onlySale]);

  const offersItems = baseCategoryItems.filter(prod => !!prod.onSale || (prod.originalPrice && prod.originalPrice > prod.price));
  const maxIndex = Math.max(0, offersItems.length - cardsPerPage);
  const finalActiveIndex = Math.min(activeIndex, maxIndex);

  const toggleBrandFilter = (brandName: string) => {
    setSelectedBrands(prev => 
      prev.includes(brandName) ? prev.filter(b => b !== brandName) : [...prev, brandName]
    );
  };

  const toggleSizeFilter = (size: string) => {
    setSelectedSizes(prev => 
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  const clearAllFilters = () => {
    setSelectedBrands([]);
    setSelectedSizes([]);
    setPriceRange('all');
    setOnlySale(false);
  };

  const hasActiveFilters = selectedBrands.length > 0 || selectedSizes.length > 0 || priceRange !== 'all' || onlySale;

  // COMPONENTE SIDEBAR DE FILTROS (ESTILO REFRIGERANTE E-COMMERCE CONFORME IMAGEM DE REFERÊNCIA)
  const FilterSidebarContent = () => (
    <div className="space-y-6">
      {/* Cabeçalho do Filtro com Botão de Limpar */}
      <div className="flex items-center justify-between pb-3 border-b border-blue-900/10">
        <div className="flex items-center space-x-2">
          <SlidersHorizontal className="h-4 w-4 text-[#003B73]" />
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-[#003B73]">
            Filtros da Loja
          </h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-[11px] font-bold text-[#006EDB] hover:text-[#00509E] flex items-center space-x-1 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Limpar</span>
          </button>
        )}
      </div>

      {/* 1. SEÇÃO MARCA (ACCORDION SANFONADO CONFORME REFERÊNCIA DO CLIENTE) */}
      <div className="border-b border-blue-900/10 pb-5">
        <button
          onClick={() => setIsBrandOpen(!isBrandOpen)}
          className="w-full flex items-center justify-between font-extrabold text-sm text-[#003B73] py-1 cursor-pointer transition-colors hover:text-[#006EDB]"
        >
          <div className="flex items-center space-x-2">
            <Tag className="h-4 w-4 text-[#006EDB]" />
            <span>Marca</span>
          </div>
          {isBrandOpen ? <ChevronUp className="h-4 w-4 text-[#003B73]" /> : <ChevronDown className="h-4 w-4 text-[#003B73]" />}
        </button>

        {isBrandOpen && (
          <div className="mt-3 space-y-3 pt-1">
            {/* Busca rápida de marca se houver muitas marcas */}
            {availableBrands.length > 6 && (
              <input
                type="text"
                placeholder="Buscar marca..."
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                className="w-full text-xs px-3 py-1.5 rounded-lg border border-blue-900/15 bg-white text-[#003B73] focus:outline-none focus:border-[#006EDB] placeholder:text-[#52708F]"
              />
            )}

            <div className="max-h-60 overflow-y-auto no-scrollbar space-y-2 pr-1">
              {availableBrands
                .filter(b => !brandSearch || b.name.toLowerCase().includes(brandSearch.toLowerCase()))
                .map(({ name, count }) => {
                  const isChecked = selectedBrands.includes(name);
                  return (
                    <label
                      key={name}
                      onClick={() => toggleBrandFilter(name)}
                      className={`flex items-center justify-between text-xs py-1 px-1.5 rounded-lg cursor-pointer transition-all select-none ${
                        isChecked 
                          ? 'bg-[#DDF1FF] text-[#003B73] font-bold' 
                          : 'text-[#00509E] hover:bg-blue-50/60'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                          isChecked 
                            ? 'bg-[#003B73] border-[#003B73] text-white' 
                            : 'border-blue-900/20 bg-white hover:border-[#006EDB]'
                        }`}>
                          {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <span className="capitalize">{name}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-[#52708F] px-1.5 py-0.5 rounded-md bg-white border border-blue-900/10">
                        {count}
                      </span>
                    </label>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* 2. SEÇÃO GRADE / TAMANHO (GRADE EM PÍLULAS ESTÍLO VITRINE E-COMMERCE) */}
      {availableSizes.length > 0 && (
        <div className="border-b border-blue-900/10 pb-5">
          <button
            onClick={() => setIsGradeOpen(!isGradeOpen)}
            className="w-full flex items-center justify-between font-extrabold text-sm text-[#003B73] py-1 cursor-pointer transition-colors hover:text-[#006EDB]"
          >
            <div className="flex items-center space-x-2">
              <Ruler className="h-4 w-4 text-[#006EDB]" />
              <span>Tamanho / Grade</span>
            </div>
            {isGradeOpen ? <ChevronUp className="h-4 w-4 text-[#003B73]" /> : <ChevronDown className="h-4 w-4 text-[#003B73]" />}
          </button>

          {isGradeOpen && (
            <div className="mt-3 grid grid-cols-4 gap-1.5 pt-1">
              {availableSizes.map((size) => {
                const isSelected = selectedSizes.includes(size);
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggleSizeFilter(size)}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center ${
                      isSelected
                        ? 'bg-[#003B73] text-white border-[#003B73] shadow-xs scale-[1.03]'
                        : 'bg-white text-[#00509E] border-blue-900/15 hover:border-[#006EDB] hover:bg-[#DDF1FF]'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. SEÇÃO FAIXA DE PREÇO */}
      <div className="border-b border-blue-900/10 pb-5">
        <button
          onClick={() => setIsPriceOpen(!isPriceOpen)}
          className="w-full flex items-center justify-between font-extrabold text-sm text-[#003B73] py-1 cursor-pointer transition-colors hover:text-[#006EDB]"
        >
          <span>Faixa de Preço</span>
          {isPriceOpen ? <ChevronUp className="h-4 w-4 text-[#003B73]" /> : <ChevronDown className="h-4 w-4 text-[#003B73]" />}
        </button>

        {isPriceOpen && (
          <div className="mt-3 space-y-2 pt-1 text-xs">
            {[
              { id: 'all', label: 'Todos os preços' },
              { id: 'under100', label: 'Até R$ 100,00' },
              { id: '100to200', label: 'R$ 100,00 até R$ 200,00' },
              { id: '200to300', label: 'R$ 200,00 até R$ 300,00' },
              { id: 'above300', label: 'Acima de R$ 300,00' },
            ].map(option => (
              <label
                key={option.id}
                onClick={() => setPriceRange(option.id)}
                className={`flex items-center space-x-2.5 py-1 px-1.5 rounded-lg cursor-pointer transition-colors ${
                  priceRange === option.id 
                    ? 'bg-[#DDF1FF] text-[#003B73] font-bold' 
                    : 'text-[#00509E] hover:bg-blue-50/60'
                }`}
              >
                <input
                  type="radio"
                  name="priceRange"
                  checked={priceRange === option.id}
                  onChange={() => setPriceRange(option.id)}
                  className="accent-[#003B73] h-3.5 w-3.5"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* 4. SEÇÃO PROMOÇÕES & OFERTAS */}
      <div className="pt-1">
        <label
          onClick={() => setOnlySale(!onlySale)}
          className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
            onlySale 
              ? 'bg-[#003B73] text-white border-[#003B73] shadow-xs' 
              : 'bg-white text-[#003B73] border-blue-900/15 hover:border-[#006EDB]'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Percent className="h-4 w-4 text-[#FFC928]" />
            <span className="text-xs font-bold">Apenas em Promoção</span>
          </div>
          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
            onlySale ? 'bg-white text-[#003B73]' : 'border-blue-900/30'
          }`}>
            {onlySale && <Check className="h-3 w-3 stroke-[3]" />}
          </div>
        </label>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Botão de Retorno Superior */}
      <button 
        onClick={() => {
          if (activeSubcategory) {
            if (setGlobalSubcategory) setGlobalSubcategory('TODAS');
            setSelectedSubcategory('TODAS');
          } else {
            setCurrentView('home');
          }
        }}
        className={`flex items-center space-x-2 text-xs font-bold transition-all group cursor-pointer ${
          isDark ? 'text-slate-400 hover:text-[#FFC928]' : 'text-[#003B73] hover:text-[#006EDB]'
        }`}
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        <span>{activeSubcategory ? `VOLTAR PARA ${config.title}` : 'VOLTAR PARA A PÁGINA INICIAL'}</span>
      </button>

      {/* Hero Banner da Categoria */}
      <Hero />

      {/* Carrossel de Ofertas da Categoria se houver */}
      {offersItems.length > 0 && !activeSubcategory && (
        <div id="category-offers-section" className="space-y-6">
          <div className={`flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b ${
            isDark ? 'border-slate-800' : 'border-blue-900/15'
          }`}>
            <div className="flex items-center space-x-2.5">
              <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-rose-50 text-rose-600 border border-rose-200">
                <Percent className="h-4 w-4 animate-bounce" />
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-[#003B73]">
                Ofertas Especiais em {config.title}
                <span className="ml-2 text-xs font-normal text-[#52708F]">
                  ({offersItems.length} {offersItems.length === 1 ? 'oferta' : 'ofertas'})
                </span>
              </h2>
            </div>

            <div className="flex items-center w-full sm:w-auto justify-end">
              <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full border font-mono text-xs font-bold bg-rose-50 text-rose-600 border-rose-200">
                <Timer className="h-4 w-4 animate-pulse" />
                <span>Expira em:</span>
                <span className="px-1.5 py-0.5 rounded-xs bg-rose-600 text-white">
                  {formatNumber(timeLeft.horas)}
                </span>
                <span>:</span>
                <span className="px-1.5 py-0.5 rounded-xs bg-rose-600 text-white">
                  {formatNumber(timeLeft.minutos)}
                </span>
                <span>:</span>
                <span className="px-1.5 py-0.5 rounded-xs bg-rose-600 text-white">
                  {formatNumber(timeLeft.segundos)}
                </span>
              </div>
            </div>
          </div>

          <div className="relative group/carousel">
            {offersItems.length > cardsPerPage && (
              <button
                onClick={() => setActiveIndex(prev => Math.max(0, prev - 1))}
                disabled={finalActiveIndex === 0}
                className={`absolute top-1/2 -translate-y-1/2 -left-3 sm:-left-5 z-20 flex items-center justify-center h-10 w-10 rounded-full border shadow-md transition-all duration-200 cursor-pointer ${
                  finalActiveIndex === 0 
                    ? 'opacity-0 pointer-events-none' 
                    : 'border-blue-900/15 bg-white text-[#003B73] hover:bg-[#DDF1FF]'
                }`}
                title="Anterior"
              >
                <ChevronLeft className="h-5 w-5 stroke-[2.5]" />
              </button>
            )}

            <div className="relative overflow-hidden py-1 px-0.5">
              <div 
                className="flex transition-transform duration-500 ease-out gap-4"
                style={{ transform: `translateX(-${finalActiveIndex * (100 / cardsPerPage)}%)` }}
              >
                {offersItems.map((prod) => (
                  <div key={prod.id} className="w-full shrink-0" style={{ width: `calc(${100 / cardsPerPage}% - ${(16 * (cardsPerPage - 1)) / cardsPerPage}px)` }}>
                    <ProductCard
                      product={prod}
                      theme={theme}
                      isFavorite={favorites.includes(prod.id)}
                      onToggleFavorite={toggleFavorite}
                      onViewDetails={handleVerDetalhes}
                    />
                  </div>
                ))}
              </div>
            </div>

            {offersItems.length > cardsPerPage && (
              <button
                onClick={() => setActiveIndex(prev => Math.min(prev + 1, offersItems.length - cardsPerPage))}
                disabled={finalActiveIndex >= maxIndex}
                className={`absolute top-1/2 -translate-y-1/2 -right-3 sm:-right-5 z-20 flex items-center justify-center h-10 w-10 rounded-full border shadow-md transition-all duration-200 cursor-pointer ${
                  finalActiveIndex >= maxIndex 
                    ? 'opacity-0 pointer-events-none' 
                    : 'border-blue-900/15 bg-white text-[#003B73] hover:bg-[#DDF1FF]'
                }`}
                title="Próximo"
              >
                <ChevronRight className="h-5 w-5 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* SEÇÃO PRINCIPAL DE PRODUTOS COM FILTROS LATERAIS (DESKTOP E MOBILE) */}
      <div id="category-all-items-section" ref={gridSectionRef} className="space-y-6 pt-2">
        {/* Cabeçalho da Seção */}
        <div className="border-b border-blue-900/15 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#003B73]">
              {config.title}
            </h2>
            <p className="text-xs font-medium mt-0.5 text-[#52708F]">
              {config.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Botão Mobile para Abrir Filtros Drawer */}
            <button
              onClick={() => setIsMobileFilterOpen(true)}
              className="lg:hidden inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-[#003B73] text-white text-xs font-bold shadow-xs cursor-pointer hover:bg-[#002850] transition-colors"
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Filtrar por Marca & Tamanho</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-[#FFC928]" />
              )}
            </button>

            {activeSubcategory && (
              <button
                onClick={() => setSelectedSubcategory('TODAS')}
                className="text-xs font-extrabold text-[#006EDB] hover:text-[#00509E] underline cursor-pointer mr-2"
              >
                Ver todas as subcategorias
              </button>
            )}

            <span className="text-xs font-extrabold px-3.5 py-1.5 rounded-full border bg-white border-blue-900/15 text-[#003B73] shadow-xs">
              {filteredItems.length} {filteredItems.length === 1 ? 'modelo encontrado' : 'modelos encontrados'}
            </span>
          </div>
        </div>

        {/* PÍLULAS DOS FILTROS ATIVOS PARA REMOÇÃO RÁPIDA */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-[#DDF1FF]/60 border border-blue-900/10">
            <span className="text-xs font-bold text-[#003B73] flex items-center space-x-1 mr-1">
              <Filter className="h-3.5 w-3.5 text-[#006EDB]" />
              <span>Filtros ativos:</span>
            </span>

            {selectedBrands.map(b => (
              <span key={b} className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-white text-[#003B73] border border-blue-900/20 text-xs font-bold shadow-2xs">
                <span>Marca: {b}</span>
                <button onClick={() => toggleBrandFilter(b)} className="hover:text-rose-600 cursor-pointer ml-1">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}

            {selectedSizes.map(s => (
              <span key={s} className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-white text-[#003B73] border border-blue-900/20 text-xs font-bold shadow-2xs">
                <span>Tam: {s}</span>
                <button onClick={() => toggleSizeFilter(s)} className="hover:text-rose-600 cursor-pointer ml-1">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}

            {priceRange !== 'all' && (
              <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-white text-[#003B73] border border-blue-900/20 text-xs font-bold shadow-2xs">
                <span>Preço filtrado</span>
                <button onClick={() => setPriceRange('all')} className="hover:text-rose-600 cursor-pointer ml-1">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}

            {onlySale && (
              <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-white text-[#003B73] border border-blue-900/20 text-xs font-bold shadow-2xs">
                <span>Em promoção</span>
                <button onClick={() => setOnlySale(false)} className="hover:text-rose-600 cursor-pointer ml-1">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}

            <button
              onClick={clearAllFilters}
              className="text-xs font-bold text-rose-600 hover:underline cursor-pointer ml-auto"
            >
              Limpar Todos
            </button>
          </div>
        )}

        {/* GRID DE FILTROS LATERAL + GRID DE PRODUTOS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* BARRA LATERAL FIXA DE FILTROS EM DESKTOP */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-28 bg-white p-5 rounded-3xl border border-blue-900/10 shadow-md">
            <FilterSidebarContent />
          </aside>

          {/* ÁREA PRINCIPAL DOS CARDS DE PRODUTO */}
          <main className="lg:col-span-9 space-y-6">
            {filteredItems.length === 0 ? (
              <div className="py-16 text-center border rounded-3xl bg-white border-blue-900/10 text-[#003B73] shadow-md space-y-4">
                <Filter className="h-10 w-10 text-[#006EDB] mx-auto opacity-50" />
                <p className="text-sm font-bold text-[#003B73]">
                  Nenhum produto encontrado com os filtros selecionados.
                </p>
                <p className="text-xs text-[#52708F] max-w-sm mx-auto">
                  Tente desmarcar algumas marcas ou tamanhos para visualizar mais modelos da coleção.
                </p>
                <button 
                  onClick={clearAllFilters}
                  className="bg-[#003B73] text-white text-xs font-extrabold px-6 py-3 uppercase tracking-wider hover:bg-[#002850] transition-all cursor-pointer rounded-full shadow-xs"
                >
                  Limpar Filtros
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {filteredItems.map((prod) => (
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
            )}
          </main>
        </div>
      </div>

      {/* MODAL / DRAWER SLIDE-OVER DE FILTROS PARA MOBILE */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden lg:hidden">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity" 
            onClick={() => setIsMobileFilterOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-xs bg-white shadow-2xl p-6 overflow-y-auto flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-blue-900/10">
                  <h2 className="text-base font-extrabold text-[#003B73]">Filtros do Catálogo</h2>
                  <button 
                    onClick={() => setIsMobileFilterOpen(false)}
                    className="p-2 rounded-full hover:bg-blue-50 text-[#003B73] cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <FilterSidebarContent />
              </div>

              <div className="pt-6 border-t border-blue-900/10">
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="w-full py-3 rounded-full bg-[#003B73] text-white text-xs font-extrabold uppercase tracking-wider shadow-md hover:bg-[#002850]"
                >
                  Ver {filteredItems.length} Modelos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
