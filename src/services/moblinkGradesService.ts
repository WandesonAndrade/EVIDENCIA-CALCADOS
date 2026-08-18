import { GradeProduto } from '../types';
import { evidenciaAuthService } from '../lib/evidenciaAuth';
import { API_ENDPOINTS } from './api';

export const MOBLINK_GRADES_API_URL = API_ENDPOINTS.GRADES_PRODUTOS;

/**
 * Serviço responsável por consumir a rota GET /api/v1/gradesprodutos do MobLink ERP.
 */
export const getGradesProdutos = async (): Promise<GradeProduto[]> => {
  try {
    let response: Response;
    try {
      response = await evidenciaAuthService.fetchWithAuth(MOBLINK_GRADES_API_URL, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
    } catch (e) {
      response = await evidenciaAuthService.fetchWithAuth('/api/v1/gradesprodutos', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
    }

    if (!response.ok) {
      throw new Error(`Erro na requisição da API de grades: Status HTTP ${response.status}`);
    }

    const data = await response.json();

    // Tratamento flexível de lista (array direto ou chave interna)
    const rawList: any[] = Array.isArray(data)
      ? data
      : (data.gradesprodutos || data.data || data.items || data.produtos || []);

    if (!Array.isArray(rawList) || rawList.length === 0) {
      return getFallbackGrades();
    }

    return rawList.map((item: any, index: number): GradeProduto => ({
      id: item.id ?? item.id_grade ?? (index + 1),
      descricao: item.descricao || item.descr || item.nome || `Grade de Produto #${index + 1}`,
      descr_linha: item.descr_linha || item.linha || 'Tamanho / Numeração',
      descr_coluna: item.descr_coluna || item.coluna || 'Cor / Acabamento',
    }));
  } catch (error) {
    console.warn('[moblinkGradesService] Falha ao consultar GET /api/v1/gradesprodutos:', error);
    return getFallbackGrades();
  }
};

/**
 * Consulta uma Grade de Produto específica por ID via GET /api/v1/gradesprodutos/{id}
 */
export const getGradeProdutoById = async (idGrade: string | number): Promise<GradeProduto> => {
  try {
    let response: Response;
    try {
      response = await evidenciaAuthService.fetchWithAuth(`${MOBLINK_GRADES_API_URL}/${idGrade}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
    } catch (e) {
      response = await evidenciaAuthService.fetchWithAuth(`/api/v1/gradesprodutos/${idGrade}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
    }

    if (response.ok) {
      const data = await response.json();
      const item = data.data || data.grade || data;
      if (item) {
        return {
          id: item.id ?? item.id_grade ?? idGrade,
          descricao: item.descricao || item.descr || item.nome || `Grade #${idGrade}`,
          descr_linha: item.descr_linha || item.linha || 'Tamanho / Numeração',
          descr_coluna: item.descr_coluna || item.coluna || 'Cor / Acabamento',
        };
      }
    }
  } catch (error) {
    console.warn(`[moblinkGradesService] Falha ao consultar GET /api/v1/gradesprodutos/${idGrade}:`, error);
  }

  // Fallback se a requisição individual falhar ou não retornar
  const all = await getGradesProdutos();
  const found = all.find(g => String(g.id) === String(idGrade));
  if (found) return found;

  return {
    id: Number(idGrade) || 1,
    descricao: `Grade #${idGrade}`,
    descr_linha: 'Numeração (Tamanho)',
    descr_coluna: 'Cor / Acabamento',
  };
};

/**
 * Retorna grades padrão de fallback caso a API esteja temporariamente indisponível.
 */
const getFallbackGrades = (): GradeProduto[] => [
  {
    id: 1,
    descricao: 'Grade Padrão Calçados',
    descr_linha: 'Numeração (Tamanho)',
    descr_coluna: 'Cor / Material',
  },
  {
    id: 2,
    descricao: 'Grade Vestuário e Confecção',
    descr_linha: 'Tamanho (PP ao EGG)',
    descr_coluna: 'Cor / Estampa',
  },
  {
    id: 3,
    descricao: 'Grade Acessórios e Cintos',
    descr_linha: 'Comprimento (cm)',
    descr_coluna: 'Acabamento Fivela',
  },
];

/**
 * Consulta as variações de grade de um produto específico via GET /api/v1/produtos/{idprod}/grades
 * Filtra estritamente e elimina todas as variações/cores/tamanhos com saldo <= 0.
 */
export const getProdutoGradesFromApi = async (
  productId: string | number
): Promise<import('../types').ProdutoGradesResult> => {
  const emptyResult: import('../types').ProdutoGradesResult = {
    id_produto: String(productId || ''),
    hasGrade: false,
    descr_linha: 'TAMANHO',
    descr_coluna: 'COR',
    tamanhos: [],
    cores: [],
    variacoes: [],
  };

  if (!productId) return emptyResult;

  try {
    // 1. Tenta a rota direta oficial do MobLink ERP com token Bearer
    let response: Response = await evidenciaAuthService.fetchWithAuth(
      API_ENDPOINTS.PRODUTO_GRADES(productId),
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      }
    );

    // 2. Se a chamada direta falhar, tenta a rota proxy backend local /api/v1/...
    if (!response.ok) {
      response = await evidenciaAuthService.fetchWithAuth(
        `/api/v1/produtos/${productId}/grades`,
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
        }
      );
    }

    // 3. Fallback adicional: consulta o próprio produto no ERP caso a sub-rota de grades retorne 404
    if (!response.ok) {
      response = await evidenciaAuthService.fetchWithAuth(
        API_ENDPOINTS.PRODUTO_SINGLE(productId),
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
        }
      );
    }

    if (!response.ok) {
      return emptyResult;
    }

    const data = await response.json();
    return parseAndFilterProdutoGrades(productId, data);
  } catch {
    return emptyResult;
  }
};

/**
 * Processa os dados brutos da API de grade do produto e filtra estritamente saldos <= 0.
 * Apenas combinações com saldo > 0 são contabilizadas e retornadas.
 */
export function parseAndFilterProdutoGrades(
  productId: string | number,
  rawData: any
): import('../types').ProdutoGradesResult {
  const result: import('../types').ProdutoGradesResult = {
    id_produto: String(productId || ''),
    hasGrade: false,
    descr_linha: 'TAMANHO',
    descr_coluna: 'COR',
    tamanhos: [],
    cores: [],
    variacoes: [],
  };

  if (!rawData) return result;

  const data = rawData.data || rawData.grade || rawData.produto || rawData;

  if (data.descr_linha) result.descr_linha = data.descr_linha;
  if (data.descr_coluna) result.descr_coluna = data.descr_coluna;

  const variacoes: import('../types').ProdutoGradeVariacao[] = [];

  // Formato A: Estrutura Matriz "linhas" x "colunas"
  const linhas = Array.isArray(data.linhas) ? data.linhas : Array.isArray(data.rows) ? data.rows : [];
  if (linhas.length > 0) {
    linhas.forEach((linhaItem: any) => {
      const tamanhoName = String(linhaItem.descricao || linhaItem.nome || linhaItem.tamanho || linhaItem.pos_grade || '').trim();
      const colunas = Array.isArray(linhaItem.colunas) ? linhaItem.colunas : Array.isArray(linhaItem.cols) ? linhaItem.cols : [];

      colunas.forEach((colunaItem: any) => {
        const corName = String(colunaItem.descricao || colunaItem.nome || colunaItem.cor || colunaItem.pos_grade || '').trim();
        const saldoVal = Number(
          colunaItem.saldo_loja ??
          colunaItem.saldo ??
          colunaItem.estoque ??
          colunaItem.quant ??
          colunaItem.quantidade ??
          0
        );

        // REGRA DE NEGÓCIO MANDATÓRIA: Não contabiliza saldo <= 0
        if (saldoVal > 0 && (tamanhoName || corName)) {
          variacoes.push({
            id: `${tamanhoName}-${corName}`,
            tamanho: tamanhoName,
            cor: corName,
            saldo_loja: saldoVal,
            pos_grade: colunaItem.pos_grade || linhaItem.pos_grade,
            cod_barras: colunaItem.cod_barras || colunaItem.barcode,
          });
        }
      });
    });
  }

  // Formato B: Lista direta de variações (array de objetos { tamanho, cor, saldo_loja })
  const directList = Array.isArray(data)
    ? data
    : Array.isArray(data.variacoes)
    ? data.variacoes
    : Array.isArray(data.itens)
    ? data.itens
    : Array.isArray(data.saldos_lojas_grade)
    ? data.saldos_lojas_grade
    : [];

  if (directList.length > 0) {
    directList.forEach((item: any) => {
      const tamanhoName = String(item.tamanho || item.tamanho_nome || item.size || item.linha || item.pos_grade || '').trim();
      const corName = String(item.cor || item.cor_nome || item.color || item.coluna || '').trim();
      const saldoVal = Number(
        item.saldo_loja ??
        item.saldo ??
        item.estoque ??
        item.quant ??
        item.quantidade ??
        0
      );

      // REGRA DE NEGÓCIO MANDATÓRIA: Não contabiliza saldo <= 0
      if (saldoVal > 0 && (tamanhoName || corName)) {
        variacoes.push({
          id: item.id ? String(item.id) : `${tamanhoName}-${corName}`,
          tamanho: tamanhoName,
          cor: corName,
          saldo_loja: saldoVal,
          pos_grade: item.pos_grade || item.codigo_grade,
          cod_barras: item.cod_barras || item.barcode || item.codigo,
        });
      }
    });
  }

  // Formato C: Lista simples de tamanhos / numerações (ex: tamanhos: ["34", "35", "36"])
  const directSizes = Array.isArray(data.tamanhos)
    ? data.tamanhos
    : Array.isArray(data.sizes)
    ? data.sizes
    : [];

  if (directSizes.length > 0 && variacoes.length === 0) {
    directSizes.forEach((sz: any) => {
      const szStr = String(sz || '').trim();
      if (szStr && szStr !== '0') {
        variacoes.push({
          id: szStr,
          tamanho: szStr,
          cor: '',
          saldo_loja: 1,
        });
      }
    });
  }

  // Extrai listas únicas de tamanhos e cores que possuem saldo > 0
  const uniqueTamanhos = Array.from(
    new Set(variacoes.map(v => v.tamanho).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const uniqueCores = Array.from(
    new Set(variacoes.map(v => v.cor).filter(Boolean))
  );

  result.variacoes = variacoes;
  result.tamanhos = uniqueTamanhos;
  result.cores = uniqueCores;
  result.hasGrade = variacoes.length > 0;

  return result;
}
