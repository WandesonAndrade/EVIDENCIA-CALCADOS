import { getProdutosMoblink, extractSaldoLojaMoblink } from './moblinkProductsService';
import { getProdutoGradesFromApi } from './moblinkGradesService';

export interface DirectStockInfo {
  productId: string;
  stock: number;
  availableGrades: string[];
  inStock: boolean;
}

/**
 * Consulta o estoque em tempo real de TODOS os produtos diretamente da API do MobLink ERP
 * Retorna um Mapa: ID do Produto -> Saldo de Estoque
 */
export async function fetchLiveStockMapFromMoblink(): Promise<Map<string, number>> {
  const stockMap = new Map<string, number>();
  try {
    const rawMoblinkList = await getProdutosMoblink();
    if (Array.isArray(rawMoblinkList)) {
      rawMoblinkList.forEach(item => {
        const rawId = String((item as any).id_produto || item.id || '').trim();
        if (!rawId) return;

        const stock = extractSaldoLojaMoblink(item);
        const cleanId = rawId.replace(/^MOB-/i, '');

        stockMap.set(rawId, stock);
        stockMap.set(cleanId, stock);
        stockMap.set(`MOB-${cleanId}`, stock);
      });
    }
  } catch (err) {
    console.warn('[MoblinkDirectStock] Erro ao buscar saldo em tempo real da API MobLink:', err);
  }
  return stockMap;
}

/**
 * Consulta a disponibilidade em tempo real de um único produto e suas grades (tamanhos) diretamente do MobLink ERP
 */
export async function fetchDirectProductStockAndGrade(productId: string): Promise<DirectStockInfo> {
  const cleanId = String(productId).replace(/^MOB-/i, '');
  let stock = 0;
  let availableGrades: string[] = [];

  try {
    // 1. Busca saldo direto no MobLink ERP
    const rawMoblinkList = await getProdutosMoblink();
    const item = rawMoblinkList.find(p => String((p as any).id_produto || p.id).replace(/^MOB-/i, '') === cleanId);

    if (item) {
      stock = extractSaldoLojaMoblink(item);
    }

    // 2. Busca disponibilidade de tamanhos/grade direto no MobLink ERP
    const gradeResponse = await getProdutoGradesFromApi(cleanId);
    if (gradeResponse && Array.isArray(gradeResponse.tamanhos) && gradeResponse.tamanhos.length > 0) {
      availableGrades = gradeResponse.tamanhos.map(t => String(t).trim()).filter(Boolean);
    } else if (gradeResponse && Array.isArray(gradeResponse.variacoes)) {
      availableGrades = gradeResponse.variacoes
        .filter((v: any) => (Number(v.saldo) || 0) > 0)
        .map((v: any) => String(v.tamanho || v.grade || '').trim())
        .filter(Boolean);
    }
  } catch (err) {
    console.warn(`[MoblinkDirectStock] Erro ao validar estoque direto para produto ${productId}:`, err);
  }

  return {
    productId,
    stock,
    availableGrades,
    inStock: stock > 0,
  };
}
