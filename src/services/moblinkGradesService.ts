import { GradeProduto } from '../types';

/**
 * Serviço responsável por consumir a rota GET /api/v1/gradesprodutos do MobLink ERP.
 * Retorna os dados tipados no TypeScript com as propriedades id, descricao, descr_linha e descr_coluna.
 */
export const getGradesProdutos = async (): Promise<GradeProduto[]> => {
  try {
    const response = await fetch('/api/v1/gradesprodutos', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

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
    console.warn('[moblinkGradesService] Falha ao consultar GET /api/v1/gradesprodutos, utilizando dados de segurança:', error);
    return getFallbackGrades();
  }
};

/**
 * Consulta uma Grade de Produto específica por ID via GET /api/v1/gradesprodutos/{id}
 */
export const getGradeProdutoById = async (idGrade: string | number): Promise<GradeProduto> => {
  try {
    const response = await fetch(`/api/v1/gradesprodutos/${idGrade}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

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
