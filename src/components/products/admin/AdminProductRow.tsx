import React from 'react';
import { Product } from '../../../types';
import { ProductImage } from '../atomic/ProductImage';
import { 
  extractClassificacaoCategoria, 
  extractPrecoVistaMoblink, 
  extractSaldoLojaMoblink,
  hasProductValidGrade
} from '../../../services/moblinkProductsService';
import { normalizeCategoryName } from '../../../services/moblinkCategoriesService';
import { 
  ShieldCheck, 
  Zap, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Layers, 
  Tag 
} from 'lucide-react';

export interface AdminProductRowProps {
  item: any;
  existingDb?: Product | null;
  isItemSelected: boolean;
  onToggleSelect: (mobId: string) => void;
  onEdit: (item: any) => void;
  onDelete: (mobId: string) => void;
  resolveSubcategory?: (item: any, existingDb?: Product | null) => string;
}

export const AdminProductRow: React.FC<AdminProductRowProps> = ({
  item,
  existingDb,
  isItemSelected,
  onToggleSelect,
  onEdit,
  onDelete,
  resolveSubcategory,
}) => {
  const mobId = String(item.id || item.moblinkId || 'MOB-000');
  const isErpSynced = !item.isManual && (item.moblinkId || String(item.id).startsWith('MOB-') || true);
  const hasEnrichedMedia = Boolean(existingDb && existingDb.images && existingDb.images.length > 0);
  const hasMedia = hasEnrichedMedia || Boolean(item.foto_uri || item.foto_url || item.foto || item.imagem || item.image);

  const precoVista = extractPrecoVistaMoblink(item) || Number(item.preco_venda_fracao ?? item.preco_venda ?? item.preco ?? item.price ?? 0);
  const estoqueAtual = extractSaldoLojaMoblink(item);

  const catInfo = extractClassificacaoCategoria(item);
  const classCode = catInfo.classificacao || String(item.classificacao || item.id_grupo || item.cod_classificacao || item.classificacao_erp || '').trim() || (existingDb as any)?.classificacao || '002.001';
  const subcategory = resolveSubcategory ? resolveSubcategory(item, existingDb) : (item.subcategoria || item.subcategory || existingDb?.subcategory || 'Geral');
  const rawCat = item.categoria || item.category || item.nome_grupo || existingDb?.category || 'Calçados';
  const normCat = normalizeCategoryName(rawCat) || 'Calçados';

  const itemSizesStr = Array.isArray(item.tamanhos) && item.tamanhos.length > 0
    ? item.tamanhos.join(', ')
    : (Array.isArray(existingDb?.sizes) && existingDb.sizes.length > 0 ? existingDb.sizes.join(', ') : '');

  const isExplicitSingle = Boolean(
    itemSizesStr && ['UN', 'UNICA', 'ÚNICA', 'U', 'TAMANHO ÚNICO', 'UNICO', 'ÚNICO'].includes(itemSizesStr.trim().toUpperCase())
  );
  const itemHasGrade = hasProductValidGrade(item);

  return (
    <tr
      onClick={() => onEdit(item)}
      className={`transition-all cursor-pointer group ${
        isItemSelected
          ? 'bg-[#0071E3]/10 dark:bg-[#0071E3]/10'
          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
      }`}
    >
      {/* CHECKBOX SELEÇÃO */}
      <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isItemSelected}
          onChange={() => onToggleSelect(mobId)}
          className="w-4 h-4 rounded text-[#0071E3] border-slate-300 focus:ring-[#0071E3] cursor-pointer"
        />
      </td>

      {/* ID MOBLINK PRIMARY KEY */}
      <td className="p-4">
        <span className="font-mono font-black text-xs px-3 py-1 bg-slate-100 dark:bg-slate-800 text-[#003B73] dark:text-blue-300 rounded-xl border border-slate-200 dark:border-slate-700">
          {mobId}
        </span>
      </td>

      {/* PRODUCT THUMBNAIL, NAME, SKU & CATEGORY */}
      <td className="p-4">
        <div className="flex items-center gap-3">
          <ProductImage
            product={existingDb || item}
            variant="thumb"
            containerClassName="w-11 h-11"
          />
          <div className="space-y-0.5">
            <p className="font-bold text-slate-900 dark:text-slate-100 text-xs group-hover:text-[#0071E3] dark:group-hover:text-blue-400 transition-colors">
              {item.nome || item.name || item.descricao}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[10px] text-slate-400 font-mono">SKU: {item.sku || mobId}</span>

              <span
                className="font-mono text-[9px] font-black px-2 py-0.5 bg-[#0071E3]/10 text-[#0071E3] dark:bg-blue-900/40 dark:text-blue-300 rounded-md border border-[#0071E3]/20 inline-flex items-center gap-1"
                title="Código de Classificação no MobLink ERP (ex: 002.001)"
              >
                <Layers className="h-2.5 w-2.5 text-[#0071E3] shrink-0" />
                <span>Classif ERP: {classCode}</span>
              </span>

              <span className="text-[9px] px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800/90 text-[#003B73] dark:text-slate-200 rounded-md font-extrabold border border-slate-200/60 dark:border-slate-700/60 inline-flex items-center gap-1">
                <Tag className="h-2.5 w-2.5 text-[#0071E3] shrink-0" />
                <span>{normCat}</span>
                <span className="text-[#0071E3] dark:text-blue-400 font-black"> › {subcategory}</span>
              </span>

              {isExplicitSingle ? (
                <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-500/20 inline-flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5 text-emerald-500" />
                  Tamanho Único
                </span>
              ) : itemSizesStr ? (
                <span className="text-[9px] font-mono px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded">
                  Tam: {itemSizesStr}
                </span>
              ) : null}

              {Boolean(existingDb?.newArrival || (item as any)?.newArrival || item.newArrival) && (
                <span className="text-[9px] font-extrabold px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-300 rounded-md border border-purple-500/30 inline-flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5 text-purple-500" />
                  Lançamento
                </span>
              )}

              {itemHasGrade ? (
                <span className="text-[9px] font-extrabold px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-500/30 inline-flex items-center gap-1">
                  <Layers className="h-2.5 w-2.5 text-emerald-500" />
                  ✓ Grade Ativa
                </span>
              ) : (
                <span
                  className="text-[9px] font-bold px-2 py-0.5 bg-slate-500/10 text-slate-600 dark:text-slate-400 rounded-md border border-slate-500/20 inline-flex items-center gap-1"
                  title="Produto com estoque global ou tamanho único"
                >
                  <Tag className="h-2.5 w-2.5 text-slate-400" />
                  Grade Livre / Única
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* INDICADOR VISUAL DE SINCRONIZAÇÃO */}
      <td className="p-4">
        {hasEnrichedMedia ? (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/50"
            title="Preço e estoque sincronizados via ERP com mídias salvas pelo lojista"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Sincronizado MobLink + Lojista</span>
          </span>
        ) : isErpSynced ? (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/50"
            title="Dados direto da API oficial MobLink ERP"
          >
            <Zap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Sincronizado MobLink</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200">
            <Edit3 className="h-3.5 w-3.5 text-[#0071E3]" />
            <span>Cadastro Manual</span>
          </span>
        )}
      </td>

      {/* PREÇO À VISTA */}
      <td className="p-4 font-black text-xs sm:text-sm text-[#003B73] dark:text-white">
        R$ {precoVista.toFixed(2).replace('.', ',')}
      </td>

      {/* ESTOQUE ATUAL */}
      <td className="p-4">
        {estoqueAtual > 0 ? (
          <span className="font-mono font-extrabold text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/80 px-2.5 py-1 rounded-xl border border-emerald-300/50">
            {estoqueAtual} un
          </span>
        ) : (
          <span className="font-mono font-extrabold text-xs text-rose-800 dark:text-rose-300 bg-rose-100/80 dark:bg-rose-950/80 px-2.5 py-1 rounded-xl border border-rose-300/50">
            Esgotado (0)
          </span>
        )}
      </td>

      {/* MEDIA STATUS BADGE */}
      <td className="p-4">
        {hasMedia ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-[#DDF1FF] text-[#003B73] dark:bg-blue-950/70 dark:text-blue-200 border border-[#006EDB]/20">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#006EDB]" />
            <span>Com Fotos ({existingDb?.images?.length || 1})</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
            <span>Pendente</span>
          </span>
        )}
      </td>

      {/* AÇÕES */}
      <td className="p-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item);
            }}
            className="px-4 py-2 bg-[#0071E3] hover:bg-[#00509E] text-white font-extrabold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 shrink-0"
            title="Editar nome, preço, estoque, mídias e descrição"
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Editar</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(mobId);
            }}
            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-800/40 text-xs cursor-pointer transition-all"
            title="Excluir produto do Firestore"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};
