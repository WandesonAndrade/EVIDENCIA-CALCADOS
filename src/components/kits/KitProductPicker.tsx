import React, { useState, useMemo } from 'react';
import { Search, Plus, Check, Filter, X, Package } from 'lucide-react';
import { Product, KitItemComponent } from '../../types';
import { matchProductSearch } from '../products/utils/productFilterUtils';
import { isProductInCategory, normalizeCategoryName } from '../../services/moblinkCategoriesService';
import { resolveProductSubcategoryName, isSubcategoryMatch } from '../products/utils/categoryNavigationUtils';
import { resolveProductBrand } from '../../utils/brandUtils';
import { resolveProductGender } from '../../utils/genderUtils';

interface KitProductPickerProps {
  products: Product[];
  selectedItems: KitItemComponent[];
  onAddItem: (item: KitItemComponent) => void;
  theme?: string;
}

export const KitProductPicker: React.FC<KitProductPickerProps> = ({
  products,
  selectedItems,
  onAddItem,
  theme = 'light'
}) => {
  // Filtros de busca
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('TODAS');
  const [subcategoryFilter, setSubcategoryFilter] = useState('TODAS');
  const [brandFilter, setBrandFilter] = useState('TODAS');
  const [genderFilter, setGenderFilter] = useState('TODOS');
  const [onlyInStock, setOnlyInStock] = useState(true);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Estados de seleção de item para inclusão
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [itemDiscount, setItemDiscount] = useState<number>(0);

  // Lista de Categorias dinâmicas com contagem
  const availableCategories = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => {
      const cat = normalizeCategoryName(p.category || p.nome_grupo || (p as any).categoria || 'Geral');
      if (cat) {
        map.set(cat, (map.get(cat) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [products]);

  // Lista de Subcategorias dinâmicas baseadas na categoria selecionada
  const availableSubcategories = useMemo(() => {
    const map = new Map<string, number>();
    const filtered = categoryFilter === 'TODAS'
      ? products
      : products.filter((p) => isProductInCategory(p, categoryFilter));

    filtered.forEach((p) => {
      const sub = resolveProductSubcategoryName(p);
      if (sub && sub !== 'Geral') {
        map.set(sub, (map.get(sub) || 0) + 1);
      }
    });

    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [products, categoryFilter]);

  // Lista de Marcas dinâmicas com contagem
  const availableBrands = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => {
      const brand = resolveProductBrand(p);
      if (brand && brand !== 'Diversos') {
        map.set(brand, (map.get(brand) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);
  }, [products]);

  // Contagem de filtros ativos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (categoryFilter !== 'TODAS') count++;
    if (subcategoryFilter !== 'TODAS') count++;
    if (brandFilter !== 'TODAS') count++;
    if (genderFilter !== 'TODOS') count++;
    if (!onlyInStock) count++;
    return count;
  }, [categoryFilter, subcategoryFilter, brandFilter, genderFilter, onlyInStock]);

  // Filtra produtos de forma combinada e inteligente
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Filtro de estoque
      if (onlyInStock) {
        const stock = p.stock ?? p.saldo_loja ?? 0;
        if (stock <= 0) return false;
      }

      // 2. Filtro de Categoria
      if (categoryFilter !== 'TODAS') {
        if (!isProductInCategory(p, categoryFilter)) return false;
      }

      // 3. Filtro de Subcategoria
      if (subcategoryFilter !== 'TODAS') {
        if (!isSubcategoryMatch(p, subcategoryFilter)) return false;
      }

      // 4. Filtro de Marca
      if (brandFilter !== 'TODAS') {
        const brand = resolveProductBrand(p);
        if (brand?.toUpperCase() !== brandFilter.toUpperCase()) return false;
      }

      // 5. Filtro de Gênero
      if (genderFilter !== 'TODOS') {
        const gen = resolveProductGender(p);
        if (gen?.toUpperCase() !== genderFilter.toUpperCase()) return false;
      }

      // 6. Busca por texto (nome, referência, código de barras)
      if (searchQuery.trim()) {
        if (!matchProductSearch(p, searchQuery)) return false;
      }

      return true;
    });
  }, [products, searchQuery, categoryFilter, subcategoryFilter, brandFilter, genderFilter, onlyInStock]);

  const handleSelectProduct = (prod: Product) => {
    setSelectedProduct(prod);
    setQuantity(1);
    setItemDiscount(0);

    const availableSizes = prod.sizes || (prod.stockBySize ? Object.keys(prod.stockBySize) : []);
    if (availableSizes.length > 0) {
      setSelectedSize(String(availableSizes[0]));
    } else {
      setSelectedSize('');
    }
  };

  const handleConfirmAdd = () => {
    if (!selectedProduct) return;

    const unitPrice = selectedProduct.preco_vista ?? selectedProduct.price ?? 0;
    const itemDiscountPercent = Math.max(0, Math.min(100, itemDiscount));
    const subtotal = unitPrice * quantity;
    const itemPrice = Math.max(0, subtotal - subtotal * (itemDiscountPercent / 100));

    const newItem: KitItemComponent = {
      productId: String(selectedProduct.id),
      productName: selectedProduct.name || (selectedProduct as any).nome || 'Produto',
      productImage: selectedProduct.images?.[0] || selectedProduct.imageUrl || (selectedProduct as any).foto_uri || '',
      quantity: Math.max(1, quantity),
      unitPrice,
      itemDiscountPercent,
      itemPrice,
      ...(selectedSize ? { selectedSize: String(selectedSize) } : {})
    };

    onAddItem(newItem);
    setSelectedProduct(null);
  };

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setCategoryFilter('TODAS');
    setSubcategoryFilter('TODAS');
    setBrandFilter('TODAS');
    setGenderFilter('TODOS');
    setOnlyInStock(true);
  };

  return (
    <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
      {/* CABEÇALHO COM TÍTULO E BOTÃO DE EXPANDIR FILTROS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-[#0071E3] flex items-center justify-center">
            <Plus className="w-4 h-4 stroke-[3]" />
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Adicionar Produtos ao Kit
            </label>
            <p className="text-[10px] text-slate-400">
              {filteredProducts.length} produto(s) encontrado(s) no catálogo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              showFiltersPanel || activeFiltersCount > 0
                ? 'bg-blue-50 dark:bg-blue-950/50 text-[#0071E3] border-blue-200 dark:border-blue-800'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#0071E3] text-white text-[9px] font-black inline-flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={handleClearAllFilters}
              className="text-[11px] font-bold text-slate-400 hover:text-rose-500 cursor-pointer"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* BARRA DE BUSCA RÁPIDA */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar por nome, modelo, referência ou código de barras..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* PAINEL EXPANSÍVEL DE FILTROS AVANÇADOS */}
      {showFiltersPanel && (
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 animate-fade-in shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Categoria */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Categoria
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setSubcategoryFilter('TODAS');
                }}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-semibold"
              >
                <option value="TODAS">Todas as Categorias</option>
                {availableCategories.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Subcategoria */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Subcategoria
              </label>
              <select
                value={subcategoryFilter}
                onChange={(e) => setSubcategoryFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-semibold"
              >
                <option value="TODAS">Todas as Subcategorias</option>
                {availableSubcategories.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name} ({s.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Marca */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Marca
              </label>
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-semibold"
              >
                <option value="TODAS">Todas as Marcas</option>
                {availableBrands.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name} ({b.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Gênero / Público */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Público / Gênero
              </label>
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-semibold"
              >
                <option value="TODOS">Todos os Públicos</option>
                <option value="Feminino">Feminino</option>
                <option value="Masculino">Masculino</option>
                <option value="Infantil">Infantil</option>
                <option value="Unissex">Unissex</option>
              </select>
            </div>
          </div>

          {/* Toggle de Estoque */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => setOnlyInStock(e.target.checked)}
                className="rounded text-[#0071E3] focus:ring-[#0071E3] h-4 w-4 cursor-pointer"
              />
              <span>Exibir apenas produtos com estoque disponível (&gt; 0)</span>
            </label>

            <span className="text-[11px] text-slate-400">
              {filteredProducts.length} itens encontrados
            </span>
          </div>
        </div>
      )}

      {/* LISTA DE PRODUTOS RESULTANTES */}
      {!selectedProduct && (
        <div className="max-h-56 overflow-y-auto space-y-1 pr-1 divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900 rounded-xl p-2 border border-slate-200/80 dark:border-slate-800">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-6 space-y-1">
              <Package className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-500">
                Nenhum produto atende aos filtros selecionados.
              </p>
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="text-[11px] font-bold text-[#0071E3] hover:underline cursor-pointer"
              >
                Limpar todos os filtros
              </button>
            </div>
          ) : (
            filteredProducts.slice(0, 40).map((p) => {
              const price = p.preco_vista ?? p.price ?? 0;
              const stock = p.stock ?? p.saldo_loja ?? 0;
              const img = p.images?.[0] || p.imageUrl;
              const brand = resolveProductBrand(p);
              const isAlreadyAdded = selectedItems.some((it) => it.productId === p.id);

              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectProduct(p)}
                  className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${
                    isAlreadyAdded
                      ? 'bg-blue-50/60 dark:bg-blue-950/30 hover:bg-blue-100/50'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center border border-slate-200/60 dark:border-slate-800">
                      {img ? (
                        <img src={img} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                        {p.name}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        {brand && <span className="font-bold text-slate-600 dark:text-slate-300">{brand}</span>}
                        {p.modelOrSku || p.referencia ? <span>Ref: {p.modelOrSku || p.referencia}</span> : null}
                        <span>•</span>
                        <span>
                          Estoque:{' '}
                          <strong className={stock > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}>
                            {stock} un
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-2">
                    <p className="text-xs font-black text-slate-900 dark:text-white">
                      R$ {price.toFixed(2)}
                    </p>
                    <span className="text-[10px] font-bold text-[#0071E3] hover:underline">
                      {isAlreadyAdded ? '+ Adicionar mais' : 'Selecionar'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* PAINEL DE CONFIGURAÇÃO DO PRODUTO SELECIONADO */}
      {selectedProduct && (
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 space-y-3 animate-fade-in shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200/60">
                {selectedProduct.images?.[0] || selectedProduct.imageUrl ? (
                  <img
                    src={selectedProduct.images?.[0] || selectedProduct.imageUrl}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package className="w-5 h-5 text-slate-400 m-3" />
                )}
              </div>
              <div>
                <p className="text-xs font-black text-slate-900 dark:text-white">
                  {selectedProduct.name}
                </p>
                <p className="text-[11px] text-slate-500">
                  Preço base: R$ {(selectedProduct.preco_vista ?? selectedProduct.price ?? 0).toFixed(2)} • Estoque total: {selectedProduct.stock ?? selectedProduct.saldo_loja ?? 0}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Trocar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            {/* Tamanho Fixo */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Tamanho Fixo
              </label>
              {selectedProduct.sizes && selectedProduct.sizes.length > 0 ? (
                <select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
                >
                  <option value="">Qualquer tamanho (estoque total)</option>
                  {selectedProduct.sizes.map((s) => {
                    const stock = selectedProduct.stockBySize?.[String(s)] ?? selectedProduct.sizeStockMap?.[String(s)];
                    return (
                      <option key={String(s)} value={String(s)}>
                        Tam: {s} {stock !== undefined ? `(${stock} un)` : ''}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Único / Sem grade"
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold"
                />
              )}
            </div>

            {/* Quantidade no Kit */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Qtd no Kit
              </label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
              />
            </div>

            {/* Desconto Individual (%) */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Desconto Individual (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                placeholder="0%"
                value={itemDiscount || ''}
                onChange={(e) => setItemDiscount(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-emerald-600"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleConfirmAdd}
              className="px-4 py-2 text-xs font-bold text-white bg-[#0071E3] hover:bg-[#005bb5] rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Confirmar Inclusão no Kit</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
