import React from 'react';
import { Tag, AlertTriangle, HelpCircle } from 'lucide-react';
import { Product, Category } from '../../../types';
import { useApp } from '../../../context/AppContext';
import {
  normalizeCategoryName,
  normalizeSubcategoryName,
  moblinkCategoriesService,
} from '../../../services/moblinkCategoriesService';

export interface ProductCategoryClassificationProps {
  /** Produto completo ou parcial para extração automática dos dados */
  product?: Partial<Product> | any;
  /** Categoria nominal forçada/opcional */
  category?: string;
  /** Subcategoria nominal forçada/opcional */
  subcategory?: string;
  /** Código numérico de classificação do ERP MobLink (ex: '001.001') */
  classificacao?: string;
  /** Forçar flag de classificação inválida manualmente */
  isInvalid?: boolean;
  /** Árvore de categorias da loja para validação (se omitido, consulta useApp) */
  storeCategories?: Category[];
  /** Variante visual de exibição */
  variant?: 'card' | 'inline' | 'badge-only';
  /** Se deve exibir o badge com o código numérico do ERP */
  showErpCode?: boolean;
  /** Classes CSS adicionais para o container */
  className?: string;
}

export const ProductCategoryClassification: React.FC<ProductCategoryClassificationProps> = ({
  product,
  category: propCategory,
  subcategory: propSubcategory,
  classificacao: propClassificacao,
  isInvalid: propIsInvalid,
  storeCategories: propStoreCategories,
  variant = 'card',
  showErpCode = true,
  className = '',
}) => {
  let contextCategories: Category[] = [];
  try {
    // Tenta obter as categorias do AppContext com segurança
    const appContext = useApp();
    if (appContext && Array.isArray(appContext.categories)) {
      contextCategories = appContext.categories;
    }
  } catch {
    // Permite uso fora do AppProvider sem quebrar
    contextCategories = [];
  }

  const activeCategories = propStoreCategories || contextCategories;

  // Extração unificada dos campos com prioridade
  const rawClass = String(
    propClassificacao ??
      product?.classificacao ??
      (product as any)?.codigo_classificacao ??
      (product as any)?.cod_classificacao ??
      '',
  ).trim();

  const rawCat = String(
    propCategory ??
      product?.category ??
      (product as any)?.categoria ??
      product?.nome_grupo ??
      (product as any)?.grupo ??
      '',
  ).trim();

  const rawSub = String(
    propSubcategory ??
      product?.subcategory ??
      (product as any)?.subcategoria ??
      product?.nome_subgrupo ??
      (product as any)?.subgrupo ??
      '',
  ).trim();

  // Resolução da classificação através do serviço dinâmico
  const resolved = rawClass
    ? moblinkCategoriesService.resolveClassificacao(rawClass, activeCategories)
    : null;

  // Detecção de classificação inválida:
  // Se veio flag explícita, se o serviço marcou como inválido, ou se tem código que não está nas categorias da loja
  const isInvalid = Boolean(
    propIsInvalid ||
      (product as any)?.isInvalid ||
      resolved?.isInvalid ||
      rawCat === 'Classificação Inválida' ||
      rawSub === 'Classificação Inválida',
  );

  // Normalização final dos nomes para exibição
  const displayCategory = isInvalid
    ? 'Classificação Inválida'
    : normalizeCategoryName(rawCat || resolved?.category || 'Geral');

  const displaySubcategory = isInvalid
    ? ''
    : normalizeSubcategoryName(rawSub || resolved?.subcategory || '');

  // ----------------------------------------------------
  // Variante 1: 'badge-only' (Apenas o Badge do ERP)
  // ----------------------------------------------------
  if (variant === 'badge-only') {
    if (!rawClass) return null;

    if (isInvalid) {
      return (
        <span
          title={`Código ERP ${rawClass} não cadastrado na árvore de categorias da loja.`}
          className={`inline-flex items-center gap-1 font-mono font-black text-[11px] text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-lg shrink-0 ${className}`}
        >
          <AlertTriangle className="h-3 w-3 text-rose-500 shrink-0" />
          <span>{rawClass}</span>
        </span>
      );
    }

    return (
      <span
        title={`Classificação MobLink ERP: ${rawClass}`}
        className={`font-mono font-black text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-lg shrink-0 ${className}`}
      >
        {rawClass}
      </span>
    );
  }

  // ----------------------------------------------------
  // Variante 2: 'inline' (Formato compacto horizontal)
  // ----------------------------------------------------
  if (variant === 'inline') {
    return (
      <div className={`inline-flex items-center gap-2 flex-wrap ${className}`}>
        {isInvalid ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 px-2 py-0.5 rounded-md">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
            <span>Classificação Inválida</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800 dark:text-slate-100">
            <Tag className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>{displayCategory}</span>
            {displaySubcategory && (
              <span className="text-slate-400 font-medium">
                {' › '}{displaySubcategory}
              </span>
            )}
          </span>
        )}

        {showErpCode && rawClass && (
          <span
            title={isInvalid ? 'Código não cadastrado na árvore da loja' : `Código ERP: ${rawClass}`}
            className={`font-mono font-black text-[10px] px-1.5 py-0.5 rounded-md shrink-0 ${
              isInvalid
                ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/30'
                : 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/25'
            }`}
          >
            {rawClass}
          </span>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // Variante 3: 'card' (Padrão: Fiel ao Painel Gestor Moblink)
  // ----------------------------------------------------
  return (
    <div className={`space-y-1.5 ${className}`}>
      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
        Categoria / Classificação
      </span>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* ESQUERDA: Categoria e Subcategoria traduzidas */}
        {isInvalid ? (
          <div className="inline-flex items-center gap-1.5 text-xs font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 px-2.5 py-1 rounded-lg">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0 animate-pulse" />
            <span>Classificação Inválida</span>
            <span
              title="Este produto possui um código de classificação que não existe na lista de categorias da loja."
              className="cursor-help"
            >
              <HelpCircle className="h-3 w-3 text-rose-400 shrink-0" />
            </span>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-800 dark:text-slate-100">
            <Tag className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>{displayCategory}</span>
            {displaySubcategory && (
              <span className="text-slate-400 font-medium">
                {' › '}{displaySubcategory}
              </span>
            )}
          </span>
        )}

        {/* DIREITA: Código bruto do MobLink ERP */}
        {showErpCode && rawClass && (
          <span
            title={
              isInvalid
                ? `Código ERP ${rawClass} não encontrado na lista de categorias da loja.`
                : `Código numérico oficial no MobLink ERP: ${rawClass}`
            }
            className={`font-mono font-black text-[11px] px-2 py-0.5 rounded-lg shrink-0 ${
              isInvalid
                ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/30'
                : 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/25'
            }`}
          >
            {rawClass}
          </span>
        )}
      </div>
    </div>
  );
};
