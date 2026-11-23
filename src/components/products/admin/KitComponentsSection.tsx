import React, { useMemo } from 'react';
import { Layers, Trash2 } from 'lucide-react';
import { KitItemComponent, Product } from '../../../types';
import { KitProductPicker } from '../../kits/KitProductPicker';
import { calculateKitPricing, computeKitStock } from '../../../services/kitService';

export interface KitComponentsSectionProps {
  kitItems: KitItemComponent[];
  setKitItems?: React.Dispatch<React.SetStateAction<KitItemComponent[]>>;
  kitPricingMode: 'sum_with_discount' | 'item_discounts' | 'fixed_price';
  setKitPricingMode?: (mode: 'sum_with_discount' | 'item_discounts' | 'fixed_price') => void;
  kitTotalDiscountPercent: number;
  setKitTotalDiscountPercent?: (val: number) => void;
  kitManualPrice: number;
  setKitManualPrice?: (val: number) => void;
  allProductsForKit: Product[];
  currentKitId?: string;
}

export const KitComponentsSection: React.FC<KitComponentsSectionProps> = ({
  kitItems,
  setKitItems,
  kitPricingMode,
  setKitPricingMode,
  kitTotalDiscountPercent,
  setKitTotalDiscountPercent,
  kitManualPrice,
  setKitManualPrice,
  allProductsForKit,
  currentKitId = 'temp'
}) => {
  const productsMap = useMemo(() => {
    const map = new Map<string, Product>();
    (allProductsForKit || []).forEach((p) => map.set(p.id, p));
    return map;
  }, [allProductsForKit]);

  const pricing = useMemo(() => {
    return calculateKitPricing(kitItems, kitPricingMode, kitTotalDiscountPercent, kitManualPrice);
  }, [kitItems, kitPricingMode, kitTotalDiscountPercent, kitManualPrice]);

  const stockData = useMemo(() => {
    const dummyKit = {
      id: currentKitId,
      name: '',
      description: '',
      images: [],
      items: kitItems,
      pricingMode: kitPricingMode,
      price: pricing.finalPrice,
      visible: true,
      createdAt: ''
    };
    return computeKitStock(dummyKit, productsMap);
  }, [kitItems, kitPricingMode, pricing.finalPrice, productsMap, currentKitId]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-blue-200/90 dark:border-blue-900/50 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
      {/* HEADER DA COMPOSIÇÃO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#0071E3] flex items-center justify-center shrink-0">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>Composição do Kit &amp; Produtos Inclusos</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-[#0071E3] font-mono uppercase font-bold">
                Estoque Calculado ({stockData.stock} un)
              </span>
            </h2>
            <p className="text-[11px] text-slate-500">
              O estoque deste combo é calculado dinamicamente com base no saldo de cada produto participante.
            </p>
          </div>
        </div>

        {pricing.effectiveDiscountPercent > 0 && (
          <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-xs font-black self-start sm:self-auto">
            {pricing.effectiveDiscountPercent.toFixed(0)}% OFF no Combo
          </span>
        )}
      </div>

      {/* SELETOR DE PRODUTOS COMPONENTES */}
      <KitProductPicker
        products={allProductsForKit}
        selectedItems={kitItems}
        onAddItem={(newItem) => {
          if (setKitItems) {
            setKitItems((prev) => [...prev, newItem]);
          }
        }}
      />

      {/* LISTAGEM DOS ITENS ADICIONADOS */}
      <div className="space-y-2">
        <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Itens Atuais do Kit ({kitItems.length})
        </label>

        {kitItems.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
            Nenhum produto adicionado ainda. Busque e adicione produtos acima.
          </div>
        ) : (
          <div className="space-y-2">
            {kitItems.map((item, index) => {
              const detail = stockData.itemDetails[index];
              return (
                <div
                  key={`${item.productId}-${index}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800"
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
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-[#0071E3] border border-blue-200 dark:border-blue-800 font-bold">
                            👤 Escolha do cliente na vitrine
                          </span>
                        ) : item.selectedSize ? (
                          <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold">
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
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          if (setKitItems) {
                            setKitItems((prev) =>
                              prev.map((it, idx) => (idx === index ? { ...it, quantity: Math.max(1, val) } : it))
                            );
                          }
                        }}
                        className="w-12 px-2 py-1 text-xs text-center font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                      />
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          detail?.hasStock
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                        }`}
                      >
                        {detail ? `Saldo: ${detail.availableStock}` : 'Sem estoque'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (setKitItems) {
                          setKitItems((prev) => prev.filter((_, idx) => idx !== index));
                        }
                      }}
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

      {/* PAINEL DE PRECIFICAÇÃO E DESCONTOS */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Precificação e Desconto do Kit
          </span>
          <span className="text-xs font-bold text-slate-500">
            Soma dos Itens: R$ {pricing.originalTotal.toFixed(2)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setKitPricingMode && setKitPricingMode('sum_with_discount')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              kitPricingMode === 'sum_with_discount'
                ? 'bg-white dark:bg-slate-900 border-[#0071E3] ring-1 ring-[#0071E3]'
                : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
            }`}
          >
            <p className="text-xs font-black text-slate-800 dark:text-slate-200">% Desconto no Total</p>
            <p className="text-[10px] text-slate-500">Desconto aplicado na soma dos itens</p>
          </button>

          <button
            type="button"
            onClick={() => setKitPricingMode && setKitPricingMode('item_discounts')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              kitPricingMode === 'item_discounts'
                ? 'bg-white dark:bg-slate-900 border-[#0071E3] ring-1 ring-[#0071E3]'
                : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
            }`}
          >
            <p className="text-xs font-black text-slate-800 dark:text-slate-200">Desconto por Item</p>
            <p className="text-[10px] text-slate-500">Cada produto tem seu % individual</p>
          </button>

          <button
            type="button"
            onClick={() => setKitPricingMode && setKitPricingMode('fixed_price')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              kitPricingMode === 'fixed_price'
                ? 'bg-white dark:bg-slate-900 border-[#0071E3] ring-1 ring-[#0071E3]'
                : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
            }`}
          >
            <p className="text-xs font-black text-slate-800 dark:text-slate-200">Preço Fixo Manual</p>
            <p className="text-[10px] text-slate-500">Valor digitado livremente</p>
          </button>
        </div>

        {kitPricingMode === 'sum_with_discount' && (
          <div className="flex items-center gap-3 pt-1">
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Desconto no Combo (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={kitTotalDiscountPercent || ''}
                onChange={(e) =>
                  setKitTotalDiscountPercent &&
                  setKitTotalDiscountPercent(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))
                }
                placeholder="Ex: 10"
                className="w-full px-3 py-1.5 text-xs font-black rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-emerald-600"
              />
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400">Preço com desconto:</span>
              <p className="text-sm font-black text-emerald-600">
                R$ {pricing.finalPrice.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {kitPricingMode === 'fixed_price' && (
          <div className="pt-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Preço Final de Venda (R$)
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={kitManualPrice || ''}
              onChange={(e) => setKitManualPrice && setKitManualPrice(Math.max(0, parseFloat(e.target.value) || 0))}
              placeholder="Ex: 189.90"
              className="w-full px-3 py-1.5 text-sm font-black rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[#0071E3]"
            />
          </div>
        )}
      </div>
    </div>
  );
};
