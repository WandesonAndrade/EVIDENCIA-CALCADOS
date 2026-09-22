import { Product } from '../types';
import { 
  extractClassificacaoCategoria, 
  extractPrecoVistaMoblink, 
  extractSaldoLojaMoblink,
  hasProductValidGrade
} from './moblinkProductsService';
import { normalizeCategoryName } from './moblinkCategoriesService';

/**
 * Escapa células para o formato CSV compatível com Excel (delimitador ponto e vírgula)
 */
function escapeCsvCell(cell: any): string {
  if (cell === null || cell === undefined) return '';
  const str = String(cell);
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Gera e dispara o download do relatório Excel (.csv com BOM UTF-8)
 * baseado na listagem filtrada em tempo real pelo lojista.
 */
export function generateProductsExcelReport(
  filteredProducts: any[],
  dbProductsMap: Map<string, Product>,
  resolveSubcategory?: (item: any, existingDb?: Product | null) => string
): void {
  const headers = [
    'Ref MobLink ID',
    'Nome do Produto',
    'SKU',
    'Classificação ERP',
    'Categoria',
    'Subcategoria',
    'Preço à Vista (R$)',
    'Preço Tabela (R$)',
    'Preço Promoção (R$)',
    'Estoque Atual (un)',
    'Tamanhos / Numerações',
    'Status de Grade',
    'Status de Mídia',
    'Status no Site',
    'Origem'
  ];

  const rows: string[][] = filteredProducts.map((item) => {
    const mobId = String(item.id || item.moblinkId || 'MOB-000').trim();
    const existingDb = dbProductsMap.get(mobId) || dbProductsMap.get(mobId.toLowerCase());
    
    const name = String(item.nome || item.name || item.descricao || existingDb?.name || 'Sem nome').trim();
    const sku = String(item.sku || existingDb?.sku || mobId).trim();
    
    const catInfo = extractClassificacaoCategoria(existingDb || item);
    const isUnclassified = catInfo.category === 'Sem Classificação Definida' || !catInfo.isDefined;
    const classCode = catInfo.classificacao || String(item.classificacao || (item as any).id_grupo || '').trim();
    
    const category = isUnclassified ? 'Sem Classificação Definida' : (catInfo.category || normalizeCategoryName(item.categoria || item.category || 'Calçados'));
    const subcategory = isUnclassified ? '' : (resolveSubcategory ? resolveSubcategory(item, existingDb) : (item.subcategoria || item.subcategory || ''));

    const precoVista = extractPrecoVistaMoblink(item) || Number(item.preco_venda_fracao ?? item.preco_venda ?? item.preco ?? item.price ?? 0);
    const precoTabela = Number(item.preco_venda ?? item.preco ?? item.price ?? existingDb?.price ?? precoVista);
    const precoPromo = Number(item.preco_promocao ?? existingDb?.promoPrice ?? 0);

    const estoqueAtual = extractSaldoLojaMoblink(item);
    
    const sizesArr = Array.isArray(item.tamanhos) && item.tamanhos.length > 0 
      ? item.tamanhos 
      : (Array.isArray(existingDb?.sizes) && existingDb.sizes.length > 0 ? existingDb.sizes : []);
    const sizesStr = sizesArr.join(', ');

    const itemHasGrade = hasProductValidGrade(item);
    const statusGrade = itemHasGrade ? '✓ Grade Ativa' : 'Grade Livre / Única';

    const hasEnrichedMedia = Boolean(existingDb && existingDb.images && existingDb.images.length > 0);
    const hasMedia = hasEnrichedMedia || Boolean(item.foto_uri || item.foto_url || item.foto || item.imagem || item.image);
    const statusMidia = hasMedia ? `Com Fotos (${existingDb?.images?.length || 1})` : 'Pendente (Sem Foto)';

    const isManuallyActive = existingDb ? existingDb.visible !== false : (item.visible !== false);
    const isVisibleOnSite = !isUnclassified && isManuallyActive && estoqueAtual > 0 && hasMedia;
    
    let statusSite = '';
    if (isUnclassified) {
      statusSite = 'Oculto (Sem classificação definida)';
    } else if (!isManuallyActive) {
      statusSite = 'Oculto (Desativado no cadastro)';
    } else if (estoqueAtual <= 0) {
      statusSite = 'Oculto (Sem estoque)';
    } else if (!hasMedia) {
      statusSite = 'Oculto (Sem foto cadastrada)';
    } else {
      statusSite = 'Visível no Site';
    }

    const isErpItem = !item.isManual && (item.moblinkId || String(item.id).startsWith('MOB-') || true);
    const origem = hasEnrichedMedia ? 'Sincronizado MobLink + Lojista' : (isErpItem ? 'Sincronizado MobLink' : 'Cadastro Manual');

    return [
      mobId,
      name,
      sku,
      classCode ? `'${classCode}` : '',
      category,
      subcategory,
      precoVista.toFixed(2).replace('.', ','),
      precoTabela.toFixed(2).replace('.', ','),
      precoPromo > 0 ? precoPromo.toFixed(2).replace('.', ',') : '-',
      String(estoqueAtual),
      sizesStr,
      statusGrade,
      statusMidia,
      statusSite,
      origem
    ];
  });

  // Insere BOM UTF-8 (\uFEFF) para garantir abertura direta no Excel sem caracteres corrompidos
  const csvContent = '\uFEFF' + [headers.map(escapeCsvCell).join(';'), ...rows.map(row => row.map(escapeCsvCell).join(';'))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = `${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}`;
  const filename = `relatorio_produtos_evidencia_${dateStr}_${timeStr}.csv`;

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
