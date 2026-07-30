import { MoblinkProduto } from '../types';

/**
 * Extrai o preço à vista preferencialmente do array `precos` ou do campo `preco_venda`.
 */
export const extractPrecoVistaMoblink = (item: any): number => {
  if (Array.isArray(item.precos) && item.precos.length > 0) {
    // Busca por tabela/tipo de preço à vista
    const vistaObj = item.precos.find((p: any) => {
      if (typeof p === 'object' && p !== null) {
        const tab = String(p.tabela || p.tipo || p.nome || p.description || '').toUpperCase();
        return tab.includes('VISTA');
      }
      return false;
    });

    if (vistaObj) {
      const val = vistaObj.preco ?? vistaObj.preco_venda ?? vistaObj.valor ?? vistaObj.price;
      if (typeof val === 'number') return val;
      if (typeof val === 'string') return Number(val.replace(',', '.')) || 0;
    }

    // Usa a primeira tabela de preços se não houver 'VISTA' explícito
    const first = item.precos[0];
    if (typeof first === 'number') return first;
    if (typeof first === 'object' && first !== null) {
      const val = first.preco ?? first.preco_venda ?? first.valor ?? first.price;
      if (typeof val === 'number') return val;
      if (typeof val === 'string') return Number(val.replace(',', '.')) || 0;
    }
  }

  // Fallback para campos diretos de preço
  const raw = item.preco_venda ?? item.preco_venda_fracao ?? item.preco ?? item.price;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') return Number(raw.replace(',', '.')) || 0;
  return 0;
};

/**
 * Extrai o saldo_loja tratando valores negativos como 0.
 */
export const extractSaldoLojaMoblink = (item: any): number => {
  let rawStock = 0;

  if (typeof item.saldo_loja === 'number') {
    rawStock = item.saldo_loja;
  } else if (Array.isArray(item.saldos_lojas)) {
    rawStock = item.saldos_lojas.reduce((acc: number, curr: any) => {
      const val = Number(curr?.saldo ?? curr?.qtd ?? curr?.quantidade ?? curr?.saldo_loja) || 0;
      return acc + val;
    }, 0);
  } else if (typeof item.saldos_lojas === 'number') {
    rawStock = item.saldos_lojas;
  } else if (typeof item.estoque === 'number') {
    rawStock = item.estoque;
  } else if (typeof item.stock === 'number') {
    rawStock = item.stock;
  } else {
    rawStock = Number(item.saldo_loja ?? item.estoque ?? item.stock ?? 0);
  }

  // Regra Rígida: Tratar valores negativos como 0
  return Math.max(0, rawStock);
};

/**
 * Serviço responsável por consumir a rota GET /api/v1/produtos do MobLink ERP.
 * Mapeia id, descricao, preco (à vista), saldo_loja (>= 0) e trata cada variação como produto único.
 */
export const getProdutosMoblink = async (): Promise<MoblinkProduto[]> => {
  try {
    const response = await fetch('/api/v1/produtos', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erro na requisição da API de produtos: Status HTTP ${response.status}`);
    }

    const data = await response.json();

    // Aceita array direto ou em propriedades encapsuladas
    const rawList: any[] = Array.isArray(data)
      ? data
      : (data.produtos || data.data || data.items || data.gradesprodutos || []);

    if (!Array.isArray(rawList) || rawList.length === 0) {
      return getFallbackProdutos();
    }

    return rawList.map((item: any, index: number): MoblinkProduto => {
      const id = String(item.id || item.moblinkId || item.codigo || `MOB-${101 + index}`);
      const descricao = item.descricao || item.nome || item.descricaoMoblink || item.name || `Produto MobLink ${id}`;
      
      const preco_venda = extractPrecoVistaMoblink(item);
      const saldo_loja = extractSaldoLojaMoblink(item);

      const defaultCover = index % 2 === 0
        ? 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?q=80&w=600&auto=format&fit=crop'
        : 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=600&auto=format&fit=crop';

      const foto_uri = item.foto_uri || item.imagem || item.image || item.foto || (
        Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : defaultCover
      );

      let id_grade = item.id_grade ?? item.gradeId ?? item.grade_id;
      if (id_grade === undefined || id_grade === '' || id_grade === '0' || id_grade === 0) {
        id_grade = null;
      }

      return {
        id,
        descricao,
        preco_venda,
        saldo_loja,
        foto_uri,
        id_grade
      };
    });
  } catch (error) {
    console.warn('[moblinkProductsService] Erro ao consumir GET /api/v1/produtos, utilizando produtos de fallback:', error);
    return getFallbackProdutos();
  }
};

/**
 * Produtos de contingência estruturados conforme os campos exigidos.
 */
const getFallbackProdutos = (): MoblinkProduto[] => [
  {
    id: 'MOB-101',
    descricao: 'Sapato Social Oxford Mazerati Couro Legítimo',
    preco_venda: 389.90,
    saldo_loja: 24,
    foto_uri: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?q=80&w=600&auto=format&fit=crop',
    id_grade: '4',
  },
  {
    id: 'MOB-102',
    descricao: 'Mocassim Italiano Soft Confort Nobuck',
    preco_venda: 279.90,
    saldo_loja: 0, // Esgotado (0)
    foto_uri: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=600&auto=format&fit=crop',
    id_grade: '1',
  },
  {
    id: 'MOB-103',
    descricao: 'Sapato Social Derby Verniz Black Tie',
    preco_venda: 349.90,
    saldo_loja: 12,
    foto_uri: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?q=80&w=600&auto=format&fit=crop',
    id_grade: '2',
  },
  {
    id: 'MOB-104',
    descricao: 'Bota Chelsea Urban Couro Rústico Cafe',
    preco_venda: 429.90,
    saldo_loja: 8,
    foto_uri: 'https://images.unsplash.com/photo-1638247025967-b4e38f787b76?q=80&w=600&auto=format&fit=crop',
    id_grade: '4',
  },
  {
    id: 'MOB-105',
    descricao: 'Cinto Social Masculino Couro Nobre Fivela Escovada',
    preco_venda: 99.90,
    saldo_loja: 45,
    foto_uri: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=600&auto=format&fit=crop',
    id_grade: null,
  },
  {
    id: 'MOB-106',
    descricao: 'Carteira Slim Couro Bovino Evidência',
    preco_venda: 69.90,
    saldo_loja: 0, // Esgotado e sem grade
    foto_uri: 'https://images.unsplash.com/photo-1627123424574-724758594e93?q=80&w=600&auto=format&fit=crop',
    id_grade: null,
  }
];

