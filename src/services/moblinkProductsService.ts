import { MoblinkProduto } from '../types';

/**
 * Serviço responsável por consumir a rota GET /api/v1/produtos do MobLink ERP.
 * Retorna os produtos com a estrutura exata exigida: id, descricao, preco_venda, saldo_loja, foto_uri, id_grade.
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
      const id = item.id || item.moblinkId || item.codigo || `MOB-${101 + index}`;
      const descricao = item.descricao || item.nome || item.descricaoMoblink || item.name || `Produto MobLink ${id}`;
      
      const preco_venda = typeof item.preco_venda === 'number' 
        ? item.preco_venda 
        : typeof item.preco === 'number' 
          ? item.preco 
          : Number(item.price ?? 299.90);

      const saldo_loja = typeof item.saldo_loja === 'number'
        ? item.saldo_loja
        : typeof item.estoque === 'number'
          ? item.estoque
          : Number(item.stock ?? 10);

      const defaultCover = index % 2 === 0
        ? 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?q=80&w=600&auto=format&fit=crop'
        : 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=600&auto=format&fit=crop';

      const foto_uri = item.foto_uri || item.imagem || item.image || item.foto || (
        Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : defaultCover
      );

      // Tratamento para id_grade (pode vir como número, string ou nulo/vazio)
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
    id_grade: '4', // Grade com 4
  },
  {
    id: 'MOB-102',
    descricao: 'Mocassim Italiano Soft Confort Nobuck',
    preco_venda: 279.90,
    saldo_loja: 0, // Esgotado
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
    id_grade: '4', // Grade com 4
  },
  {
    id: 'MOB-105',
    descricao: 'Cinto Social Masculino Couro Nobre Fivela Escovada',
    preco_venda: 99.90,
    saldo_loja: 45,
    foto_uri: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=600&auto=format&fit=crop',
    id_grade: null, // Sem grade
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
