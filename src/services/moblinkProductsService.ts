import { MoblinkProduto, Product } from '../types';

export const MOBLINK_OFFICIAL_API_URL = 'https://api.evidenciacalcados.com.br/api/v1/produtos?pdf=false';
export const MOBLINK_BEARER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZFVzZXIiOiI3IiwiaWRMb2phIjoiMCIsImlhdCI6MTc4NTQyMzQ5NSwiZXhwIjoxNzg1NTA5ODk1fQ.Vmhm7qRc3e8hNudJjDPBkGfgpbZ0ejZ1vf2skw45fiY';

/**
 * Extrai o nome-base (modelo principal) e a variação de cor/estilo de um nome completo de produto.
 * Exemplo: "Sapatênis Sound Kids - Azul" -> { baseName: "Sapatênis Sound Kids", variant: "Azul" }
 */
export const extractBaseNameAndVariant = (rawName: string): { baseName: string; variant: string } => {
  if (!rawName || typeof rawName !== 'string') {
    return { baseName: 'Produto Sem Nome', variant: 'Padrão' };
  }

  const trimmed = rawName.trim();
  
  // Separador por hífen (-)
  const hyphenIndex = trimmed.lastIndexOf('-');
  if (hyphenIndex > 0) {
    const base = trimmed.substring(0, hyphenIndex).trim();
    const variant = trimmed.substring(hyphenIndex + 1).trim();
    if (base.length >= 2 && variant.length > 0) {
      return { baseName: base, variant };
    }
  }

  // Separador por barra (/)
  const slashIndex = trimmed.lastIndexOf('/');
  if (slashIndex > 0) {
    const base = trimmed.substring(0, slashIndex).trim();
    const variant = trimmed.substring(slashIndex + 1).trim();
    if (base.length >= 2 && variant.length > 0) {
      return { baseName: base, variant };
    }
  }

  // Palavras-chave de cores conhecidas no final
  const colorRegex = /\b(preto|café|cafe|caramelo|marrom|azul|branco|tan|pinhão|pinhao|marinho|gelo|off white|conhaque|grafite|nude|rosa|vermelho|vinho|verde|bege|amarelo)\b/i;
  const match = trimmed.match(colorRegex);
  if (match && typeof match.index === 'number' && match.index > 3) {
    const base = trimmed.substring(0, match.index).replace(/[-/:\s]+$/, '').trim();
    const variant = trimmed.substring(match.index).trim();
    return { baseName: base || trimmed, variant: variant || 'Padrão' };
  }

  return { baseName: trimmed, variant: 'Padrão' };
};

/**
 * Remove recursivamente qualquer propriedade com valor `undefined` de um objeto ou array.
 * Evita o erro do Firestore: 'Unsupported field value: undefined'.
 */
export const cleanUndefinedFields = <T extends Record<string, any>>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => (typeof item === 'object' && item !== null ? cleanUndefinedFields(item) : item)) as any;
  }

  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue; // Remove propriedades com valor undefined
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      cleaned[key] = cleanUndefinedFields(value);
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map(item => (typeof item === 'object' && item !== null ? cleanUndefinedFields(item) : item));
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned as T;
};

/**
 * Sanitiza rigorosamente um objeto de Produto antes de salvar no Firestore (setDoc/updateDoc).
 * Garante que originalPrice, price, stock, images e description nunca sejam undefined.
 */
export const sanitizeProductForFirestore = (product: Partial<Product>): Record<string, any> => {
  const price = typeof product.price === 'number' && !isNaN(product.price) 
    ? product.price 
    : (typeof product.preco_venda === 'number' && !isNaN(product.preco_venda) ? product.preco_venda : 0);

  const rawOriginalPrice = product.originalPrice ?? (product as any).precoOriginal;
  const originalPrice = (typeof rawOriginalPrice === 'number' && !isNaN(rawOriginalPrice) && rawOriginalPrice > 0) 
    ? rawOriginalPrice 
    : null; // Se ausente ou inválido, define como null (aceito pelo Firestore)

  const stock = typeof product.stock === 'number' && !isNaN(product.stock)
    ? Math.max(0, product.stock)
    : (typeof product.saldo_loja === 'number' && !isNaN(product.saldo_loja) ? Math.max(0, product.saldo_loja) : 0);

  const images = Array.isArray(product.images) && product.images.length > 0
    ? product.images.filter(img => typeof img === 'string' && img.trim() !== '')
    : (product.foto_uri ? [product.foto_uri] : ['https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=600&auto=format&fit=crop']);

  const description = typeof product.description === 'string' && product.description.trim() !== ''
    ? product.description
    : (product.descricao_completa || product.descricao || product.name || 'Produto Evidência Calçados');

  const name = product.name || product.descricao || 'Produto Evidência';
  const category = product.category || 'Geral';

  const baseSanitized = {
    ...product,
    name,
    category,
    price,
    preco_venda: price,
    originalPrice,
    stock,
    saldo_loja: stock,
    images,
    description,
    descricao_completa: product.descricao_completa || description,
    sizes: Array.isArray(product.sizes) ? product.sizes : [],
    crediarioProprio: product.crediarioProprio ?? true,
    visible: product.visible !== undefined ? (stock <= 0 ? false : product.visible) : stock > 0,
    stockControl: product.stockControl ?? true,
  };

  return cleanUndefinedFields(baseSanitized);
};

/**
 * Extrai o preço à vista preferencialmente do array `precos` ou do campo `preco_venda`.
 */
export const extractPrecoVistaMoblink = (item: any): number => {
  if (!item || typeof item !== 'object') return 0;

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
      if (typeof val === 'number' && !isNaN(val)) return val;
      if (typeof val === 'string') return Number(val.replace(',', '.')) || 0;
    }

    // Usa a primeira tabela de preços se não houver 'VISTA' explícito
    const first = item.precos[0];
    if (typeof first === 'number' && !isNaN(first)) return first;
    if (typeof first === 'object' && first !== null) {
      const val = first.preco ?? first.preco_venda ?? first.valor ?? first.price;
      if (typeof val === 'number' && !isNaN(val)) return val;
      if (typeof val === 'string') return Number(val.replace(',', '.')) || 0;
    }
  }

  // Fallback para campos diretos de preço
  const raw = item.preco_venda ?? item.preco_venda_fracao ?? item.preco ?? item.price;
  if (typeof raw === 'number' && !isNaN(raw)) return raw;
  if (typeof raw === 'string') return Number(raw.replace(',', '.')) || 0;
  return 0;
};

/**
 * Extrai o saldo_loja tratando valores negativos como 0.
 */
export const extractSaldoLojaMoblink = (item: any): number => {
  if (!item || typeof item !== 'object') return 0;
  let rawStock = 0;

  if (typeof item.saldo_loja === 'number' && !isNaN(item.saldo_loja)) {
    rawStock = item.saldo_loja;
  } else if (Array.isArray(item.saldos_lojas)) {
    rawStock = item.saldos_lojas.reduce((acc: number, curr: any) => {
      const val = Number(curr?.saldo ?? curr?.qtd ?? curr?.quantidade ?? curr?.saldo_loja) || 0;
      return acc + val;
    }, 0);
  } else if (typeof item.saldos_lojas === 'number' && !isNaN(item.saldos_lojas)) {
    rawStock = item.saldos_lojas;
  } else if (typeof item.estoque === 'number' && !isNaN(item.estoque)) {
    rawStock = item.estoque;
  } else if (typeof item.stock === 'number' && !isNaN(item.stock)) {
    rawStock = item.stock;
  } else {
    rawStock = Number(item.saldo_loja ?? item.estoque ?? item.stock ?? 0) || 0;
  }

  // Regra Rígida: Tratar valores negativos como 0
  return Math.max(0, rawStock);
};

/**
 * Consome a API oficial do MobLink ERP com Token Bearer e suporte a paginação completa
 * para buscar todos os lotes (suportando mais de 1.800 produtos).
 */
export const getProdutosMoblink = async (): Promise<MoblinkProduto[]> => {
  const allItemsRaw: any[] = [];
  let currentPage = 1;
  let lastPage = 1;
  let hasMorePages = true;

  try {
    while (hasMorePages && currentPage <= lastPage) {
      const fetchHeaders = {
        'Accept': 'application/json',
        'Authorization': `Bearer ${MOBLINK_BEARER_TOKEN}`
      };

      const primaryUrl = currentPage === 1 
        ? MOBLINK_OFFICIAL_API_URL 
        : `https://api.evidenciacalcados.com.br/api/v1/produtos?pdf=false&page=${currentPage}`;

      let response: Response;
      try {
        response = await fetch(primaryUrl, {
          method: 'GET',
          headers: fetchHeaders
        });
      } catch (networkErr) {
        // Fallback local se a chamada direta falhar por restrição do ambiente de desenvolvimento
        const fallbackUrl = currentPage === 1 
          ? '/api/v1/produtos?pdf=false' 
          : `/api/v1/produtos?pdf=false&page=${currentPage}`;
        
        response = await fetch(fallbackUrl, {
          method: 'GET',
          headers: fetchHeaders
        });
      }

      if (!response.ok) {
        if (currentPage === 1) {
          throw new Error(`Erro HTTP ${response.status} na API oficial do MobLink`);
        }
        break;
      }

      const data = await response.json();

      // Suporte flexível à estrutura da resposta (array direto ou chave interna data/produtos)
      const pageList: any[] = Array.isArray(data)
        ? data
        : (data.produtos || data.data || data.items || []);

      if (Array.isArray(pageList) && pageList.length > 0) {
        allItemsRaw.push(...pageList);
      } else if (currentPage > 1) {
        break;
      }

      // Detecção dinâmica de Metadados de Paginação
      const meta = data.meta || data.pagination || data;
      const detectedLastPage = meta.last_page || meta.lastPage || meta.total_pages || meta.totalPages || data.last_page;

      if (typeof detectedLastPage === 'number' && detectedLastPage > lastPage) {
        lastPage = detectedLastPage;
      }

      // Cálculo por Total de itens vs Itens por página
      const totalCount = meta.total || data.total;
      if (typeof totalCount === 'number' && totalCount > 0) {
        const itemsPerPage = meta.per_page || data.per_page || pageList.length || 15;
        const calculatedLastPage = Math.ceil(totalCount / itemsPerPage);
        if (calculatedLastPage > lastPage) {
          lastPage = calculatedLastPage;
        }
      }

      const nextPageUrl = meta.next_page_url || data.next_page_url;

      if (currentPage >= lastPage && !nextPageUrl) {
        hasMorePages = false;
      } else {
        currentPage++;
      }

      // Trava de segurança para evitar loops infinitos (máximo 150 páginas = até ~15.000 produtos)
      if (currentPage > 150) {
        break;
      }
    }

    if (allItemsRaw.length === 0) {
      return getFallbackProdutos();
    }

    return allItemsRaw.map((item: any, index: number): MoblinkProduto => {
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
        nome: item.nome || item.name || descricao,
        preco_venda,
        saldo_loja,
        foto_uri,
        id_grade,
        precos: item.precos,
        saldos_lojas: item.saldos_lojas,
        compl_descr: item.compl_descr || item.descr_compl,
        tamanhos: item.tamanhos,
        categoria: item.categoria || item.category,
        barcode: item.codigoBarras || item.barcode || item.codigo,
        marca: item.marca,
        material: item.material,
        cor: item.cor,
        genero: item.genero
      };
    });
  } catch (error) {
    console.warn('[moblinkProductsService] Erro ao consumir API oficial do MobLink ERP com Token Bearer:', error);
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
    saldo_loja: 0,
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
    saldo_loja: 0,
    foto_uri: 'https://images.unsplash.com/photo-1627123424574-724758594e93?q=80&w=600&auto=format&fit=crop',
    id_grade: null,
  }
];

/**
 * Compara se houve alteração real em preço, estoque ou nome do produto em relação ao banco (Delta Check).
 * Evita regravações desnecessárias no Firestore quando os dados não mudaram.
 */
export const hasProductChanged = (existing?: Partial<Product>, fresh?: Partial<Product> | MoblinkProduto): boolean => {
  if (!existing || !fresh) return true;

  const freshPrice = (fresh as any).price ?? (fresh as any).preco_venda ?? extractPrecoVistaMoblink(fresh);
  const existingPrice = existing.price ?? existing.preco_venda ?? 0;
  if (Math.abs(freshPrice - existingPrice) > 0.001) return true;

  const freshStock = (fresh as any).stock ?? (fresh as any).saldo_loja ?? extractSaldoLojaMoblink(fresh);
  const existingStock = existing.stock ?? existing.saldo_loja ?? 0;
  if (freshStock !== existingStock) return true;

  const freshName = (fresh as any).name ?? (fresh as any).nome ?? (fresh as any).descricao;
  if (freshName && existing.name !== freshName) return true;

  return false;
};

/**
 * Processa a sincronização incremental (Delta Sync).
 * Retorna apenas os produtos que sofreram alterações reais de preço ou estoque.
 */
export const filterProductsRequiringSync = (existingProducts: Product[], freshMoblinkList: MoblinkProduto[]): MoblinkProduto[] => {
  const existingMap = new Map<string, Product>();
  existingProducts.forEach(p => {
    const key = String(p.id || p.moblinkId);
    existingMap.set(key, p);
  });

  return freshMoblinkList.filter(freshItem => {
    const freshId = String(freshItem.id);
    const existing = existingMap.get(freshId);
    return hasProductChanged(existing, freshItem);
  });
};


