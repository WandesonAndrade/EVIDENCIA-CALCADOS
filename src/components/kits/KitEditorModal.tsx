import React, { useState, useEffect, useMemo } from 'react';
import { X, Layers, Trash2, CheckCircle2, AlertCircle, Sparkles, Tag, Percent, DollarSign } from 'lucide-react';
import { KitProduct, KitItemComponent, Product } from '../../types';
import { KitProductPicker } from './KitProductPicker';
import { KitPhotosField } from './KitPhotosField';
import { calculateKitPricing, computeKitStock, saveKit } from '../../services/kitService';

interface KitEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (kitId: string) => void;
  initialKit?: KitProduct | null;
  products: Product[];
  theme?: string;
}

export const KitEditorModal: React.FC<KitEditorModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialKit,
  products,
  theme = 'light'
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [items, setItems] = useState<KitItemComponent[]>([]);
  const [pricingMode, setPricingMode] = useState<KitProduct['pricingMode']>('sum_with_discount');
  const [totalDiscountPercent, setTotalDiscountPercent] = useState<number>(0);
  const [manualFixedPrice, setManualFixedPrice] = useState<number>(0);
  const [visible, setVisible] = useState(true);
  const [category, setCategory] = useState('Kits');
  const [subcategory, setSubcategory] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mapeamento rápido de produtos por ID
  const productsMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  // Carrega dados iniciais na abertura
  useEffect(() => {
    if (initialKit) {
      setName(initialKit.name);
      setDescription(initialKit.description || '');
      setImages(initialKit.images || []);
      setItems(initialKit.items || []);
      setPricingMode(initialKit.pricingMode || 'sum_with_discount');
      setTotalDiscountPercent(initialKit.totalDiscountPercent || 0);
      setManualFixedPrice(initialKit.price || 0);
      setVisible(initialKit.visible !== false);
      setCategory(initialKit.category || 'Kits');
      setSubcategory(initialKit.subcategory || '');
    } else {
      setName('');
      setDescription('');
      setImages([]);
      setItems([]);
      setPricingMode('sum_with_discount');
      setTotalDiscountPercent(0);
      setManualFixedPrice(0);
      setVisible(true);
      setCategory('Kits');
      setSubcategory('');
    }
    setError(null);
  }, [initialKit, isOpen]);

  // Cálculo de estoque em tempo real baseado nos produtos e itens selecionados
  const calculatedStock = useMemo(() => {
    const dummyKit: KitProduct = {
      id: initialKit?.id || 'temp',
      name,
      description,
      images,
      items,
      pricingMode,
      price: 0,
      visible,
      createdAt: ''
    };
    return computeKitStock(dummyKit, productsMap);
  }, [items, productsMap, initialKit, name, description, images, pricingMode, visible]);

  // Cálculo de preços em tempo real
  const calculatedPricing = useMemo(() => {
    return calculateKitPricing(items, pricingMode, totalDiscountPercent, manualFixedPrice);
  }, [items, pricingMode, totalDiscountPercent, manualFixedPrice]);

  const handleAddItem = (newItem: KitItemComponent) => {
    setItems((prev) => [...prev, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateItemQuantity = (index: number, qty: number) => {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, quantity: Math.max(1, qty) } : item
      )
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Informe o nome do Kit.');
      return;
    }
    if (items.length === 0) {
      setError('Adicione pelo menos 1 produto ao Kit.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const savedId = await saveKit({
        id: initialKit?.id,
        name,
        description,
        images,
        items: calculatedPricing.processedItems,
        pricingMode,
        totalDiscountPercent: pricingMode === 'sum_with_discount' ? totalDiscountPercent : 0,
        originalTotal: calculatedPricing.originalTotal,
        price: calculatedPricing.finalPrice,
        category,
        subcategory,
        visible,
        createdAt: initialKit?.createdAt
      });

      onSaved(savedId);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar o Kit no banco de dados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div
        className={`w-full max-w-3xl my-8 rounded-3xl border shadow-2xl overflow-hidden transition-all flex flex-col max-h-[90vh] ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* HEADER MODAL */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center text-[#0071E3] shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                {initialKit ? 'Editar Kit de Produtos' : 'Criar Novo Kit de Produtos'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                O estoque do kit é calculado automaticamente a partir dos componentes.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY (SCROLLÁVEL) */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* DADOS BÁSICOS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Nome do Kit *
              </label>
              <input
                type="text"
                placeholder="Ex: Kit Verão Masculino (Camisa + Bermuda)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Descrição do Kit
              </label>
              <textarea
                rows={2}
                placeholder="Descrição dos benefícios ou detalhes dos itens que acompanham este combo..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
              />
            </div>
          </div>

          {/* FOTOS DO KIT */}
          <KitPhotosField
            images={images}
            onChange={setImages}
            kitId={initialKit?.id}
            theme={theme}
          />

          {/* SELETOR DE PRODUTOS COMPONENTES */}
          <KitProductPicker
            products={products}
            selectedItems={items}
            onAddItem={handleAddItem}
            theme={theme}
          />

          {/* ITENS ATUALMENTE NO KIT */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Itens Inclusos no Kit ({items.length})
              </label>
              <span className="text-[11px] font-bold text-slate-500">
                Subtotal original: R$ {calculatedPricing.originalTotal.toFixed(2)}
              </span>
            </div>

            {items.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                Nenhum produto adicionado ainda. Use o seletor acima.
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, index) => {
                  const detail = calculatedStock.itemDetails[index];
                  const hasStock = detail ? detail.hasStock : true;

                  return (
                    <div
                      key={`${item.productId}-${index}`}
                      className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                          {item.productImage ? (
                            <img src={item.productImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">📦</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-800 dark:text-slate-200 truncate">
                            {item.productName}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            {item.allowCustomerSize ? (
                              <span className="px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950 text-[#0071E3] font-bold">
                                👤 Escolha do cliente na vitrine
                              </span>
                            ) : item.selectedSize ? (
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 font-bold">
                                Tam: {item.selectedSize}
                              </span>
                            ) : null}
                            <span>Preço un: R$ {(item.unitPrice || 0).toFixed(2)}</span>
                            {item.itemDiscountPercent ? (
                              <span className="font-bold text-emerald-600">
                                (-{item.itemDiscountPercent}%)
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-bold">Qtd:</span>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => handleUpdateItemQuantity(index, parseInt(e.target.value) || 1)}
                            className="w-12 px-2 py-1 text-xs text-center font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                          />
                        </div>

                        <div className="text-right">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            hasStock
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                          }`}>
                            {detail ? `Saldo: ${detail.availableStock}` : 'Sem estoque'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* PRECIFICAÇÃO E DESCONTOS */}
          <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#0071E3]" />
                <span>Estratégia de Precificação do Kit</span>
              </label>
              <span className="text-[10px] font-bold text-slate-500">
                Soma dos itens: R$ {calculatedPricing.originalTotal.toFixed(2)}
              </span>
            </div>

            {/* Opções de Modo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPricingMode('sum_with_discount')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  pricingMode === 'sum_with_discount'
                    ? 'bg-white dark:bg-slate-900 border-[#0071E3] shadow-xs ring-1 ring-[#0071E3]'
                    : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-200">
                  <Percent className="w-3.5 h-3.5 text-[#0071E3]" />
                  <span>Desconto no Total</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Aplica % sobre a soma de todos os itens
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPricingMode('item_discounts')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  pricingMode === 'item_discounts'
                    ? 'bg-white dark:bg-slate-900 border-[#0071E3] shadow-xs ring-1 ring-[#0071E3]'
                    : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-200">
                  <Tag className="w-3.5 h-3.5 text-[#7C3AED]" />
                  <span>Desconto por Item</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Calculado pelos descontos individuais
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPricingMode('fixed_price')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  pricingMode === 'fixed_price'
                    ? 'bg-white dark:bg-slate-900 border-[#0071E3] shadow-xs ring-1 ring-[#0071E3]'
                    : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-200">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Preço Fixo Manual</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Você digita o valor final do Kit
                </p>
              </button>
            </div>

            {/* Configuração de acordo com o modo */}
            {pricingMode === 'sum_with_discount' && (
              <div className="flex items-center gap-3 pt-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Desconto Geral no Combo (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={totalDiscountPercent || ''}
                    onChange={(e) => setTotalDiscountPercent(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                    placeholder="Ex: 15"
                    className="w-full px-3 py-1.5 text-xs font-black rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-emerald-600"
                  />
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400">Economia:</span>
                  <p className="text-xs font-bold text-emerald-600">
                    - R$ {calculatedPricing.totalDiscountAmount.toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            {pricingMode === 'fixed_price' && (
              <div className="pt-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Preço de Venda do Kit (R$)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={manualFixedPrice || ''}
                  onChange={(e) => setManualFixedPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="Ex: 199.90"
                  className="w-full px-3 py-1.5 text-sm font-black rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[#0071E3]"
                />
              </div>
            )}

            {/* PREVIEW DO PREÇO FINAL */}
            <div className="pt-2 border-t border-blue-200/60 dark:border-blue-900/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Preço Final de Venda
                </span>
                <p className="text-lg font-black text-slate-900 dark:text-white">
                  R$ {calculatedPricing.finalPrice.toFixed(2)}
                </p>
              </div>

              {calculatedPricing.effectiveDiscountPercent > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-xs font-black">
                  {calculatedPricing.effectiveDiscountPercent.toFixed(0)}% OFF
                </span>
              )}
            </div>
          </div>

          {/* RESUMO DE ESTOQUE CALCULADO */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Estoque Calculado do Kit
              </span>
              <p className="text-base font-black text-slate-900 dark:text-white">
                {calculatedStock.stock}{' '}
                <span className="text-xs font-normal text-slate-500">unidades disponíveis</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visible}
                  onChange={(e) => setVisible(e.target.checked)}
                  className="rounded text-[#0071E3] focus:ring-[#0071E3] h-4 w-4 cursor-pointer"
                />
                <span>Visível na Vitrine</span>
              </label>
            </div>
          </div>
        </div>

        {/* FOOTER MODAL */}
        <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/40">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-black text-white bg-[#0071E3] hover:bg-[#005bb5] rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Salvando Kit...' : initialKit ? 'Atualizar Kit' : 'Salvar Kit'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
