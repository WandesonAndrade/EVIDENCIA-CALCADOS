import React from 'react';
import { Product } from '../../../types';
import { AdminProductRow } from './AdminProductRow';
import { CheckSquare, Square, Package } from 'lucide-react';

export interface AdminProductsTableProps {
  products: any[];
  selectedMobIds: Record<string, boolean>;
  onToggleSelectProduct: (mobId: string) => void;
  onToggleSelectAll: () => void;
  onEditProduct: (item: any) => void;
  onDeleteProduct: (mobId: string) => void;
  getExistingDbProduct: (mobId: string) => Product | null | undefined;
  resolveSubcategory?: (item: any, existingDb?: Product | null) => string;
}

export const AdminProductsTable: React.FC<AdminProductsTableProps> = ({
  products,
  selectedMobIds,
  onToggleSelectProduct,
  onToggleSelectAll,
  onEditProduct,
  onDeleteProduct,
  getExistingDbProduct,
  resolveSubcategory,
}) => {
  const allSelected =
    products.length > 0 &&
    products.every((i) => selectedMobIds[String(i.id || i.moblinkId || 'MOB-000')]);

  if (products.length === 0) {
    return (
      <div className="py-16 text-center space-y-3">
        <Package className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
          Nenhum produto encontrado com os filtros selecionados.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200/60 dark:border-slate-800 text-slate-400 font-extrabold uppercase text-[9px] tracking-wider">
            <th className="p-4 w-10 text-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelectAll();
                }}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                title="Selecionar/Desselecionar todos os produtos desta página"
              >
                {allSelected ? (
                  <CheckSquare className="h-4 w-4 text-[#0071E3]" />
                ) : (
                  <Square className="h-4 w-4 text-slate-400" />
                )}
              </button>
            </th>
            <th className="p-4 text-left">Ref MobLink</th>
            <th className="p-4 text-left">Produto &amp; SKU</th>
            <th className="p-4 text-left">Indicador de Sincronização</th>
            <th className="p-4 text-left">Preço à Vista</th>
            <th className="p-4 text-left">Estoque Actual</th>
            <th className="p-4 text-left">Status de Mídia</th>
            <th className="p-4 text-right">Ação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
          {products.map((item) => {
            const mobId = String(item.id || item.moblinkId || 'MOB-000');
            const existingDb = getExistingDbProduct(mobId);
            const isItemSelected = Boolean(selectedMobIds[mobId]);

            return (
              <AdminProductRow
                key={mobId}
                item={item}
                existingDb={existingDb}
                isItemSelected={isItemSelected}
                onToggleSelect={onToggleSelectProduct}
                onEdit={onEditProduct}
                onDelete={onDeleteProduct}
                resolveSubcategory={resolveSubcategory}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
