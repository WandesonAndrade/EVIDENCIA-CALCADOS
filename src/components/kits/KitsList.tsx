import React, { useState, useEffect, useMemo } from 'react';
import { Layers, Plus, Edit2, Trash2, Eye, EyeOff, Package, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { KitProduct, Product } from '../../types';
import { subscribeToKits, deleteKit, toggleKitVisibility, computeKitStock } from '../../services/kitService';
import { KitEditorModal } from './KitEditorModal';

interface KitsListProps {
  products: Product[];
  theme?: string;
  onCreateNew?: () => void;
  onEditKit?: (kit: KitProduct) => void;
}

export const KitsList: React.FC<KitsListProps> = ({
  products,
  theme = 'light',
  onCreateNew,
  onEditKit
}) => {
  const [kits, setKits] = useState<KitProduct[]>([]);
  const [selectedKit, setSelectedKit] = useState<KitProduct | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Mapeamento rápido de produtos
  const productsMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  // Carrega kits em tempo real
  useEffect(() => {
    const unsubscribe = subscribeToKits((fetchedKits) => {
      setKits(fetchedKits);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateNew = () => {
    if (onCreateNew) {
      onCreateNew();
    } else {
      setSelectedKit(null);
      setIsModalOpen(true);
    }
  };

  const handleEdit = (kit: KitProduct) => {
    if (onEditKit) {
      onEditKit(kit);
    } else {
      setSelectedKit(kit);
      setIsModalOpen(true);
    }
  };

  const handleDelete = async (kit: KitProduct) => {
    if (!window.confirm(`Tem certeza que deseja excluir o kit "${kit.name}"?`)) {
      return;
    }
    try {
      await deleteKit(kit.id);
      setFeedback({ success: true, message: `Kit "${kit.name}" excluído com sucesso.` });
    } catch (err: any) {
      setFeedback({ success: false, message: `Erro ao excluir kit: ${err.message}` });
    }
  };

  const handleToggleVisibility = async (kit: KitProduct) => {
    try {
      await toggleKitVisibility(kit.id, !kit.visible);
      setFeedback({
        success: true,
        message: `Kit "${kit.name}" agora está ${!kit.visible ? 'visível' : 'oculto'} na vitrine.`
      });
    } catch (err: any) {
      setFeedback({ success: false, message: `Erro ao alterar visibilidade: ${err.message}` });
    }
  };

  return (
    <div className={`p-4 sm:p-5 rounded-2xl border transition-all shadow-xs space-y-4 ${
      theme === 'dark' ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white/95 border-slate-200/80 text-slate-900'
    }`}>
      {/* HEADER DA SEÇÃO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#0071E3] dark:text-blue-400 shrink-0">
            <Layers className="h-4 w-4 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black tracking-tight">
                Kits de Produtos &amp; Combos
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-[#0071E3] text-[10px] font-black">
                {kits.length} cadastrado(s)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Agrupe produtos e ofereça combos com estoque calculado e fotos personalizadas.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCreateNew}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-black text-white bg-[#0071E3] hover:bg-[#005bb5] rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Kit</span>
        </button>
      </div>

      {feedback && (
        <div className={`flex items-center justify-between p-3 rounded-xl text-xs font-semibold ${
          feedback.success
            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60'
            : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* GRID / LISTA DE KITS */}
      {kits.length === 0 ? (
        <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#0071E3] flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <p className="text-xs font-black text-slate-700 dark:text-slate-300">
            Nenhum kit de produtos cadastrado ainda
          </p>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            Crie combos exclusivos para aumentar o ticket médio. O estoque será sincronizado automaticamente a partir dos itens.
          </p>
          <button
            type="button"
            onClick={handleCreateNew}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#0071E3] hover:underline cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Criar meu primeiro kit</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {kits.map((kit) => {
            const stockData = computeKitStock(kit, productsMap);
            const coverImage = kit.images?.[0];

            return (
              <div
                key={kit.id}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                  kit.visible
                    ? 'bg-white dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 shadow-xs'
                    : 'bg-slate-50/70 dark:bg-slate-950/40 border-slate-200/50 dark:border-slate-800/50 opacity-80'
                }`}
              >
                <div>
                  {/* TOPO CARD: IMAGEM + TÍTULO + STATUS */}
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200/60 dark:border-slate-800">
                      {coverImage ? (
                        <img src={coverImage} alt={kit.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {kit.items?.length || 0} produto(s)
                        </span>
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            kit.visible
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400'
                              : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {kit.visible ? 'Ativo' : 'Oculto'}
                        </span>
                      </div>

                      <h3 className="text-xs font-black text-slate-900 dark:text-white truncate mt-0.5" title={kit.name}>
                        {kit.name}
                      </h3>

                      <p className="text-sm font-black text-[#0071E3] mt-1">
                        R$ {kit.price.toFixed(2)}
                        {kit.originalTotal && kit.originalTotal > kit.price ? (
                          <span className="text-[10px] text-slate-400 line-through font-normal ml-1.5">
                            R$ {kit.originalTotal.toFixed(2)}
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>

                  {/* ESTOQUE CALCULADO */}
                  <div className="mt-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500 font-medium">Estoque calculado:</span>
                    <span
                      className={`font-black text-xs px-2 py-0.5 rounded-lg ${
                        stockData.stock > 0
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                      }`}
                    >
                      {stockData.stock} disp.
                    </span>
                  </div>

                  {/* DETALHE DOS ITENS */}
                  <div className="mt-2 space-y-1">
                    {stockData.itemDetails.slice(0, 3).map((det, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[10px] text-slate-500">
                        <span className="truncate max-w-[150px]">
                          {det.requiredQty}x {det.productName} {det.size ? `(Tam: ${det.size})` : ''}
                        </span>
                        <span className={det.hasStock ? 'text-slate-600 dark:text-slate-400' : 'text-rose-500 font-bold'}>
                          {det.availableStock} em estoque
                        </span>
                      </div>
                    ))}
                    {stockData.itemDetails.length > 3 && (
                      <p className="text-[9px] text-slate-400 italic">
                        +{stockData.itemDetails.length - 3} outro(s) item(ns)...
                      </p>
                    )}
                  </div>
                </div>

                {/* AÇÕES */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggleVisibility(kit)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                    title={kit.visible ? 'Ocultar kit da vitrine' : 'Tornar kit visível na vitrine'}
                  >
                    {kit.visible ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4" />}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleEdit(kit)}
                      className="px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3 text-[#0071E3]" />
                      <span>Editar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(kit)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                      title="Excluir kit"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL EDITOR */}
      <KitEditorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => {
          setFeedback({
            success: true,
            message: selectedKit ? 'Kit atualizado com sucesso!' : 'Novo kit criado com sucesso!'
          });
        }}
        initialKit={selectedKit}
        products={products}
        theme={theme}
      />
    </div>
  );
};
