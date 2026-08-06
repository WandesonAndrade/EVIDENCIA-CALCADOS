import { MoblinkProduto, Product } from "../types";
import {
  moblinkCategoriesService,
  normalizeSubcategoryName,
} from "./moblinkCategoriesService";

export const MOBLINK_OFFICIAL_API_URL =
  (import.meta as any).env?.VITE_MOBLINK_API_URL ||
  (import.meta as any).env?.MOBLINK_API_URL ||
  "https://api.evidenciacalcados.com.br/api/v1/produtos?pdf=false";

export const MOBLINK_BEARER_TOKEN =
  (import.meta as any).env?.VITE_MOBLINK_TOKEN ||
  (import.meta as any).env?.MOBLINK_API_TOKEN ||
  (import.meta as any).env?.VITE_SINCOM_API_TOKEN ||
  "";

/**
 * Extrai o nome-base (modelo principal/raiz) e a variação de cor/estilo de um nome completo de produto.
 * Ignora termos comuns de cores no final (PRETO, BRANCO, OFF WHITE, VERNIZ, NUDE, etc.),
 * códigos numéricos de fábrica (231-032) e numeração de grades (25/26, 28/34) para normalizar o nome base.
 *
 * Exemplo: "BABUCHE MAS LUELUA 231-032 PRETO/LARANJA 25/26"
 *   -> { baseName: "BABUCHE MAS LUELUA", variant: "PRETO/LARANJA" }
 */
export const extractBaseNameAndVariant = (
  rawName: string,
): { baseName: string; variant: string } => {
  if (!rawName || typeof rawName !== "string") {
    return { baseName: "Produto Sem Nome", variant: "Padrão" };
  }

  let cleaned = rawName.trim();
  let extractedVariant = "";

  // 1. Remover numerações de grades no final (ex: "25/26", "28/34", "37-38", "TAM 28/34", "TAM. 35", "TAM 38", "N 41", "41")
  cleaned = cleaned
    .replace(
      /\s+[-/]?\s*(TAM\.?|TAMANHO|Nº?|NUMERAÇÃO)?\s*\b\d{2}\s*[/|-]\s*\d{2}\b\s*$/i,
      "",
    )
    .trim();
  cleaned = cleaned
    .replace(/\s+[-/]?\s*(TAM\.?|TAMANHO|Nº?|NUMERAÇÃO)\s*\d{2}\b\s*$/i, "")
    .trim();

  // 2. Lista de palavras-chave de cores e acabamentos no segmento de calçados
  const colorWordsPattern =
    "\\b(PRETO|BRANCO|OFF WHITE|OFF-WHITE|OFFWHITE|VERDE|VERMELHO|VERMEHO|AZUL|MARROM|VERNIZ|CARAMELO|NUDE|NUD|ROSA|PINK|ROXO|LILAS|DOURADO|PRATA|AMARELO|LARANJA|BEGE|GRAFITE|CINZA|CAFÉ|CAFE|PINHÃO|PINHAO|TAN|MARINHO|MUSTARDA|VINHO|BORDO|ICE|CHAMPAGNE|SAND|CONHAQUE|GELO|MUSTARD)\\b";
  const colorWordsRegex = new RegExp(colorWordsPattern, "i");

  // Se houver hífen (-), verificar a última parte
  const hyphenParts = cleaned.split(/\s*-\s*/);
  if (hyphenParts.length > 1) {
    const lastPart = hyphenParts[hyphenParts.length - 1].trim();
    if (colorWordsRegex.test(lastPart) || /^TAM\s/i.test(lastPart)) {
      extractedVariant = lastPart;
      cleaned = hyphenParts
        .slice(0, hyphenParts.length - 1)
        .join(" - ")
        .trim();
    }
  }

  // Tentar encontrar padrão de cor (única ou combinada como "PRETO/LARANJA" ou "AZUL / BRANCO") no final da string limpa
  const colorBlockRegex = new RegExp(
    `(?:[\\s-/]+)(${colorWordsPattern}(?:[\\s/\\-]+${colorWordsPattern})*)`,
    "i",
  );
  const match = cleaned.match(colorBlockRegex);
  if (match && typeof match.index === "number" && match.index > 2) {
    if (!extractedVariant) {
      extractedVariant = match[1].trim();
    }
    cleaned = cleaned.substring(0, match.index).trim();
  }

  // 3. Remover códigos numéricos isolados ou referências de fábrica no final do nome base (ex: "231-032", "REF 453", "1042", "231/032")
  cleaned = cleaned
    .replace(/\s+[-/]?\s*(REF\.?|CÓD\.?|COD\.?)?\s*\b\d+([-\/]\d+)*\b\s*$/i, "")
    .trim();

  // 4. Limpeza final de pontuações pendentes no final
  cleaned = cleaned.replace(/[-/:,\s]+$/, "").trim();

  const finalBaseName = cleaned.length >= 2 ? cleaned : rawName.trim();
  const finalVariant =
    extractedVariant ||
    rawName
      .trim()
      .replace(finalBaseName, "")
      .replace(/^[-/:,\s]+/, "")
      .trim() ||
    "Padrão";

  return {
    baseName: finalBaseName,
    variant: finalVariant,
  };
};

/**
 * Remove recursivamente qualquer propriedade com valor `undefined` de um objeto ou array.
 * Evita o erro do Firestore: 'Unsupported field value: undefined'.
 */
export const cleanUndefinedFields = <T extends Record<string, any>>(
  obj: T,
): T => {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) =>
      typeof item === "object" && item !== null
        ? cleanUndefinedFields(item)
        : item,
    ) as any;
  }

  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue; // Remove propriedades com valor undefined
    } else if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      cleaned[key] = cleanUndefinedFields(value);
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map((item) =>
        typeof item === "object" && item !== null
          ? cleanUndefinedFields(item)
          : item,
      );
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
/**
 * Extrai o preço padrão de tabela (carnê / parcelado) do produto.
 * Prioridade: preco_venda (campo direto da API) > price > precos[0]
 */
export const extractPrecoTabelaMoblink = (item: any): number => {
  if (!item || typeof item !== "object") return 0;

  // Prioridade 1: preco_venda direto da API MobLink ERP
  const direct =
    item.preco_venda ?? item.price ?? item.preco_venda_fracao ?? item.preco;
  if (typeof direct === "number" && !isNaN(direct) && direct > 0) return direct;
  if (typeof direct === "string") {
    const parsed = Number(direct.replace(",", ".")) || 0;
    if (parsed > 0) return parsed;
  }

  // Prioridade 2: primeiro item do array precos (fallback)
  if (Array.isArray(item.precos) && item.precos.length > 0) {
    for (const p of item.precos) {
      if (typeof p === "number" && !isNaN(p) && p > 0) return p;
      if (typeof p === "object" && p !== null) {
        const val = p.preco ?? p.preco_venda ?? p.valor ?? p.price;
        if (typeof val === "number" && !isNaN(val) && val > 0) return val;
        if (typeof val === "string") {
          const parsed = Number(val.replace(",", ".")) || 0;
          if (parsed > 0) return parsed;
        }
      }
    }
  }

  return 0;
};

/**
 * Extrai o preço à vista buscando na lista `precos` pelo campo `nome_tab_preco === 'A VISTA'`.
 * Fallback: tabela que contenha 'VISTA' ou 'PIX', depois 10% de desconto sobre o preço de tabela.
 */
export const extractPrecoVistaMoblink = (item: any): number => {
  if (!item || typeof item !== "object") return 0;

  if (Array.isArray(item.precos) && item.precos.length > 0) {
    // Busca exata por nome_tab_preco: campo oficial da API MobLink
    const vistaObj = item.precos.find((p: any) => {
      if (typeof p !== "object" || p === null) return false;
      const nomTab = String(
        p.nome_tab_preco || p.tabela || p.tipo || p.nome || p.description || "",
      ).toUpperCase();
      return (
        nomTab === "A VISTA" ||
        nomTab.includes("VISTA") ||
        nomTab.includes("PIX")
      );
    });

    if (vistaObj) {
      const val =
        vistaObj.preco ??
        vistaObj.preco_venda ??
        vistaObj.valor ??
        vistaObj.price;
      if (typeof val === "number" && !isNaN(val) && val > 0) return val;
      if (typeof val === "string") {
        const parsed = Number(val.replace(",", ".")) || 0;
        if (parsed > 0) return parsed;
      }
    }
  }

  // Fallback: preco_vista ou precoVista diretamente no objeto
  const directVista = item.preco_vista ?? item.precoVista;
  if (typeof directVista === "number" && !isNaN(directVista) && directVista > 0)
    return directVista;

  // Fallback: preco_promocao (se houver)
  const rawPromo = item.preco_promocao;
  if (typeof rawPromo === "number" && !isNaN(rawPromo) && rawPromo > 0)
    return rawPromo;

  // Fallback final: 10% de desconto sobre o preço de tabela
  const basePrice = extractPrecoTabelaMoblink(item);
  if (basePrice > 0) return Math.round(basePrice * 0.9 * 100) / 100;

  return 0;
};

/**
 * Extrai e normaliza a categoria a partir do campo `classificacao` da API MobLink.
 *
 * O campo `classificacao` pode ser:
 * - Uma string legível: "CALCADOS", "ACESSORIO", "COSMETICO"
 * - Um código numérico: "002.004" (cruzar com tabela de grupos via /api/v1/produtos/grupos)
 * - Um objeto: { nome: "CALCADOS" }
 */
export const extractClassificacaoCategoria = (
  item: any,
): {
  category: string;
  subcategory: string;
  nome_grupo: string;
  nome_subgrupo: string;
  classificacao: string;
} => {
  if (!item || typeof item !== "object") {
    return {
      category: "Geral",
      subcategory: "",
      nome_grupo: "Geral",
      nome_subgrupo: "",
      classificacao: "Geral",
    };
  }

  // 1. Extrair o valor bruto do campo classificacao
  let rawClassificacao = "";
  if (
    typeof item.classificacao === "string" &&
    item.classificacao.trim() !== ""
  ) {
    rawClassificacao = item.classificacao.trim();
  } else if (typeof item.classificacao === "number") {
    rawClassificacao = String(item.classificacao);
  } else if (
    typeof item.classificacao === "object" &&
    item.classificacao?.nome
  ) {
    rawClassificacao = String(item.classificacao.nome).trim();
  } else {
    // Sem fallback para nome_grupo; usa apenas a classificação pura ou 'Geral'
    rawClassificacao = "Geral";
  }

  // 2. Extrair subclassificacao
  let rawSubclassificacao = "";
  if (
    typeof item.subclassificacao === "string" &&
    item.subclassificacao.trim() !== ""
  ) {
    rawSubclassificacao = item.subclassificacao.trim();
  } else if (
    typeof item.subclassificacao === "object" &&
    item.subclassificacao?.nome
  ) {
    rawSubclassificacao = String(item.subclassificacao.nome).trim();
  } else {
    rawSubclassificacao =
      item.nome_subgrupo ||
      item.subgrupo ||
      item.subcategoria ||
      item.subcategory ||
      "";
  }

  // 3. Normalizar (tratando tanto nomes legíveis quanto códigos numéricos ex: '002.004')
  const isNumericCode = /^\d+(\.\d+)?$/.test(rawClassificacao);
  let category = "Geral";
  let subcategory = normalizeSubcategoryName(rawSubclassificacao);
  let resolvedGrupo = rawClassificacao;
  let resolvedSubgrupo = rawSubclassificacao;

  if (isNumericCode) {
    const resolved =
      moblinkCategoriesService.resolveClassificacao(rawClassificacao);
    if (resolved && resolved.category !== "Geral") {
      category = resolved.category;
      subcategory = resolved.subcategory || subcategory;
      resolvedGrupo = resolved.nome_grupo || resolvedGrupo;
      resolvedSubgrupo = resolved.nome_subgrupo || resolvedSubgrupo;
    }
  } else {
    // Se for string, tentamos capitalizar normalmente e usar como categoria
    category = rawClassificacao || "Geral";
  }

  return {
    category,
    subcategory,
    nome_grupo: resolvedGrupo,
    nome_subgrupo: resolvedSubgrupo,
    classificacao: rawClassificacao,
  };
};

/**
 * Sanitiza rigorosamente um objeto de Produto antes de salvar no Firestore (setDoc/updateDoc).
 * Garante que originalPrice, price, precoVista, stock, images e description nunca sejam undefined.
 */
export const sanitizeProductForFirestore = (
  product: Partial<Product>,
): Record<string, any> => {
  const price = extractPrecoTabelaMoblink(product);
  const precoVista = extractPrecoVistaMoblink(product);

  const rawOriginalPrice =
    product.originalPrice ?? (product as any).precoOriginal;
  const originalPrice =
    typeof rawOriginalPrice === "number" &&
    !isNaN(rawOriginalPrice) &&
    rawOriginalPrice > 0
      ? rawOriginalPrice
      : null;

  const stock =
    typeof product.stock === "number" && !isNaN(product.stock)
      ? Math.max(0, product.stock)
      : typeof product.saldo_loja === "number" && !isNaN(product.saldo_loja)
        ? Math.max(0, product.saldo_loja)
        : 0;

  const images =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images.filter(
          (img) => typeof img === "string" && img.trim() !== "",
        )
      : product.foto_uri
        ? [product.foto_uri]
        : [
            "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=600&auto=format&fit=crop",
          ];

  const description =
    typeof product.description === "string" && product.description.trim() !== ""
      ? product.description
      : product.descricao_completa ||
        product.descricao ||
        product.name ||
        "Produto Evidência Calçados";

  const name = product.name || product.descricao || "Produto Evidência";

  const catInfo = extractClassificacaoCategoria(product);
  const category = catInfo.category;
  const subcategory = catInfo.subcategory;
  const classificacao = catInfo.classificacao;

  const modelCode = product.modelCode || product.referenceCode || null;
  const referenceCode = product.referenceCode || product.modelCode || null;

  const baseSanitized = {
    ...product,
    name,
    category,
    subcategory,
    // Preserva os campos de grupo ERP originais (ex: "CALCADOS", "INFANTIL MASCULINO")
    // sem sobrescrever com a versão normalizada que perderia a estrutura hierárquica do ERP
    nome_grupo: catInfo.nome_grupo || (product as any).nome_grupo || category,
    nome_subgrupo: catInfo.nome_subgrupo || (product as any).nome_subgrupo || subcategory,
    classificacao: classificacao || (product as any).classificacao || '',
    price,
    preco_venda: price,
    precoVista,
    preco_vista: precoVista,
    originalPrice,
    stock,
    saldo_loja: stock,
    images,
    description,
    descricao_completa: product.descricao_completa || description,
    sizes: Array.isArray(product.sizes) ? product.sizes : [],
    crediarioProprio: product.crediarioProprio ?? true,
    visible:
      product.visible !== undefined
        ? stock <= 0
          ? false
          : product.visible
        : stock > 0,
    stockControl: product.stockControl ?? true,
    modelCode,
    referenceCode,
    color: product.color || product.cor || "Preto",
    cor: product.cor || product.color || "Preto",
    stockBySize: product.stockBySize || product.sizeStockMap || {},
    sizeStockMap: product.sizeStockMap || product.stockBySize || {},
  };

  return cleanUndefinedFields(baseSanitized);
};

/**
 * Extrai o saldo_loja tratando valores negativos como 0.
 */
export const extractSaldoLojaMoblink = (item: any): number => {
  if (!item || typeof item !== "object") return 0;
  let rawStock = 0;

  if (typeof item.saldo_loja === "number" && !isNaN(item.saldo_loja)) {
    rawStock = item.saldo_loja;
  } else if (Array.isArray(item.saldos_lojas)) {
    rawStock = item.saldos_lojas.reduce((acc: number, curr: any) => {
      const val =
        Number(
          curr?.saldo ?? curr?.qtd ?? curr?.quantidade ?? curr?.saldo_loja,
        ) || 0;
      return acc + val;
    }, 0);
  } else if (
    typeof item.saldos_lojas === "number" &&
    !isNaN(item.saldos_lojas)
  ) {
    rawStock = item.saldos_lojas;
  } else if (typeof item.estoque === "number" && !isNaN(item.estoque)) {
    rawStock = item.estoque;
  } else if (typeof item.stock === "number" && !isNaN(item.stock)) {
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
export const getProdutosMoblink = async (
  onProgress?: (current: number, total: number, phase: string) => void,
): Promise<MoblinkProduto[]> => {
  const allItemsRaw: any[] = [];
  let lastPage = 1;

  try {
    const fetchHeaders = {
      Accept: "application/json",
      Authorization: `Bearer ${MOBLINK_BEARER_TOKEN}`,
    };

    if (onProgress) {
      onProgress(0, 1, "Iniciando sincronização com ERP (página 1/1)...");
    }

    // 1. Carrega a página 1 para detectar o número total de páginas (lastPage)
    let response: Response;
    try {
      response = await fetch(MOBLINK_OFFICIAL_API_URL, {
        method: "GET",
        headers: fetchHeaders,
      });
    } catch (networkErr) {
      const fallbackUrl = "/api/v1/produtos?pdf=false";
      response = await fetch(fallbackUrl, {
        method: "GET",
        headers: fetchHeaders,
      });
    }

    if (!response.ok) {
      throw new Error(
        `Erro HTTP ${response.status} na API do MobLink (página 1)`,
      );
    }

    const data = await response.json();
    const page1List: any[] = Array.isArray(data)
      ? data
      : data.produtos || data.data || data.items || [];

    if (Array.isArray(page1List) && page1List.length > 0) {
      allItemsRaw.push(...page1List);
    }

    // Detecção dinâmica do número de páginas
    const meta = data.meta || data.pagination || data;
    const detectedLastPage =
      meta.last_page ||
      meta.lastPage ||
      meta.total_pages ||
      meta.totalPages ||
      data.last_page;

    if (typeof detectedLastPage === "number" && detectedLastPage > lastPage) {
      lastPage = detectedLastPage;
    }

    const totalCount = meta.total || data.total;
    if (typeof totalCount === "number" && totalCount > 0) {
      const itemsPerPage =
        meta.per_page || data.per_page || page1List.length || 15;
      const calculatedLastPage = Math.ceil(totalCount / itemsPerPage);
      if (calculatedLastPage > lastPage) {
        lastPage = calculatedLastPage;
      }
    }

    // Se houver mais páginas, carrega em paralelo com limite de concorrência de 5
    if (lastPage > 1) {
      const remainingPages = Array.from(
        { length: lastPage - 1 },
        (_, i) => i + 2,
      );
      const concurrencyLimit = 5;
      let completedCount = 1;

      if (onProgress) {
        onProgress(
          completedCount,
          lastPage,
          `Lendo página 1/${lastPage} obtida...`,
        );
      }

      for (let i = 0; i < remainingPages.length; i += concurrencyLimit) {
        const chunk = remainingPages.slice(i, i + concurrencyLimit);
        const chunkResults = await Promise.all(
          chunk.map(async (page) => {
            try {
              const pageUrl = `https://api.evidenciacalcados.com.br/api/v1/produtos?pdf=false&page=${page}`;
              let pageRes: Response;
              try {
                pageRes = await fetch(pageUrl, {
                  method: "GET",
                  headers: fetchHeaders,
                });
              } catch (err) {
                const fallbackPageUrl = `/api/v1/produtos?pdf=false&page=${page}`;
                pageRes = await fetch(fallbackPageUrl, {
                  method: "GET",
                  headers: fetchHeaders,
                });
              }

              if (!pageRes.ok) return [];
              const pageData = await pageRes.json();
              const list = Array.isArray(pageData)
                ? pageData
                : pageData.produtos || pageData.data || pageData.items || [];

              completedCount++;
              if (onProgress) {
                onProgress(
                  completedCount,
                  lastPage,
                  `Baixando dados do ERP MobLink (${completedCount}/${lastPage} páginas)`,
                );
              }
              return list;
            } catch (err) {
              console.error(`Erro ao sincronizar página ${page}:`, err);
              return [];
            }
          }),
        );

        chunkResults.forEach((list) => {
          if (Array.isArray(list)) {
            allItemsRaw.push(...list);
          }
        });
      }
    }

    if (allItemsRaw.length === 0) {
      return getFallbackProdutos();
    }

    return allItemsRaw.map((item: any, index: number): MoblinkProduto => {
      const id = String(
        item.id || item.moblinkId || item.codigo || `MOB-${101 + index}`,
      );
      const descricao =
        item.descricao ||
        item.nome ||
        item.descricaoMoblink ||
        item.name ||
        `Produto MobLink ${id}`;

      const preco_venda = extractPrecoVistaMoblink(item);
      const saldo_loja = extractSaldoLojaMoblink(item);

      const defaultCover =
        index % 2 === 0
          ? "https://images.unsplash.com/photo-1533867617858-e7b97e060509?q=80&w=600&auto=format&fit=crop"
          : "https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=600&auto=format&fit=crop";

      const foto_uri =
        item.foto_uri ||
        item.imagem ||
        item.image ||
        item.foto ||
        (Array.isArray(item.images) && item.images.length > 0
          ? item.images[0]
          : defaultCover);

      let id_grade = item.id_grade ?? item.gradeId ?? item.grade_id;
      if (
        id_grade === undefined ||
        id_grade === "" ||
        id_grade === "0" ||
        id_grade === 0
      ) {
        id_grade = null;
      }

      const catInfo = extractClassificacaoCategoria(item);

      // Extrair preço de tabela (carnê) e preço à vista separadamente
      const precoTabela = extractPrecoTabelaMoblink(item);
      const precoVista = extractPrecoVistaMoblink(item);

      // Extrair preço promocional (se existir)
      const precoPromo =
        typeof item.preco_promocao === "number" && item.preco_promocao > 0
          ? item.preco_promocao
          : undefined;

      return {
        id,
        descricao,
        nome: item.nome || item.name || descricao,
        /** Preço de tabela (carnê / parcelado) */
        preco_venda: precoTabela,
        /** Preço à vista (PIX / dinheiro) */
        preco_vista: precoVista,
        precoVista: precoVista,
        /** Preço promocional opcional */
        preco_promocao: precoPromo,
        saldo_loja,
        foto_uri,
        id_grade,
        precos: item.precos,
        saldos_lojas: item.saldos_lojas,
        compl_descr: item.compl_descr || item.descr_compl,
        tamanhos: item.tamanhos,
        /** Código de classificação original do ERP */
        classificacao: catInfo.classificacao,
        categoria: catInfo.category,
        subcategoria: catInfo.subcategory,
        nome_grupo: catInfo.nome_grupo,
        nome_subgrupo: catInfo.nome_subgrupo,
        barcode: item.codigoBarras || item.barcode || item.codigo,
        marca: item.marca,
        material: item.material,
        cor: item.cor,
        genero: item.genero,
      };
    });
  } catch (error) {
    console.warn(
      "[moblinkProductsService] Erro ao consumir API oficial do MobLink ERP com Token Bearer:",
      error,
    );
    return getFallbackProdutos();
  }
};

/**
 * Produtos de contingência estruturados conforme os campos exigidos.
 */
const getFallbackProdutos = (): MoblinkProduto[] => [
  {
    id: "MOB-101",
    descricao: "Sapato Social Oxford Mazerati Couro Legítimo",
    preco_venda: 389.9,
    saldo_loja: 24,
    foto_uri:
      "https://images.unsplash.com/photo-1533867617858-e7b97e060509?q=80&w=600&auto=format&fit=crop",
    id_grade: "4",
  },
  {
    id: "MOB-102",
    descricao: "Mocassim Italiano Soft Confort Nobuck",
    preco_venda: 279.9,
    saldo_loja: 0,
    foto_uri:
      "https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=600&auto=format&fit=crop",
    id_grade: "1",
  },
  {
    id: "MOB-103",
    descricao: "Sapato Social Derby Verniz Black Tie",
    preco_venda: 349.9,
    saldo_loja: 12,
    foto_uri:
      "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?q=80&w=600&auto=format&fit=crop",
    id_grade: "2",
  },
  {
    id: "MOB-104",
    descricao: "Bota Chelsea Urban Couro Rústico Cafe",
    preco_venda: 429.9,
    saldo_loja: 8,
    foto_uri:
      "https://images.unsplash.com/photo-1638247025967-b4e38f787b76?q=80&w=600&auto=format&fit=crop",
    id_grade: "4",
  },
  {
    id: "MOB-105",
    descricao: "Cinto Social Masculino Couro Nobre Fivela Escovada",
    preco_venda: 99.9,
    saldo_loja: 45,
    foto_uri:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=600&auto=format&fit=crop",
    id_grade: null,
  },
  {
    id: "MOB-106",
    descricao: "Carteira Slim Couro Bovino Evidência",
    preco_venda: 69.9,
    saldo_loja: 0,
    foto_uri:
      "https://images.unsplash.com/photo-1627123424574-724758594e93?q=80&w=600&auto=format&fit=crop",
    id_grade: null,
  },
];

/**
 * Compara se houve alteração real em preço, estoque ou nome do produto em relação ao banco (Delta Check).
 * Evita regravações desnecessárias no Firestore quando os dados não mudaram.
 */
export const hasProductChanged = (
  existing?: Partial<Product>,
  fresh?: Partial<Product> | MoblinkProduto,
): boolean => {
  if (!existing || !fresh) return true;

  // 1. Preço de Tabela (Carnê / Prazo)
  const freshPrice =
    (fresh as any).price ??
    (fresh as any).preco_venda ??
    extractPrecoTabelaMoblink(fresh);
  const existingPrice = existing.price ?? existing.preco_venda ?? 0;
  if (Math.abs(freshPrice - existingPrice) > 0.01) return true;

  // 2. Preço à Vista (PIX)
  const freshVista =
    (fresh as any).precoVista ??
    (fresh as any).preco_vista ??
    extractPrecoVistaMoblink(fresh);
  const existingVista = existing.precoVista ?? existing.preco_vista ?? 0;
  if (Math.abs(freshVista - existingVista) > 0.01) return true;

  // 3. Estoque
  const freshStock =
    (fresh as any).stock ??
    (fresh as any).saldo_loja ??
    extractSaldoLojaMoblink(fresh);
  const existingStock = existing.stock ?? existing.saldo_loja ?? 0;
  if (freshStock !== existingStock) return true;

  // 4. Nome / Descrição
  const freshName =
    (fresh as any).name ?? (fresh as any).nome ?? (fresh as any).descricao;
  if (freshName && existing.name !== freshName) return true;

  // 5. Classificação ERP
  const freshClass = String((fresh as any).classificacao || "").trim();
  const existingClass = String((existing as any).classificacao || "").trim();
  if (freshClass && existingClass && freshClass !== existingClass) return true;

  // 6. Complemento de descrição
  const freshCompl = String(
    (fresh as any).compl_descr || (fresh as any).descr_compl || "",
  ).trim();
  const existingCompl = String(
    (existing as any).compl_descr ||
      (existing as any).description_completa ||
      "",
  ).trim();
  // Se antes não tinha descrição e agora tem, ou se mudou
  if (freshCompl && existingCompl && freshCompl !== existingCompl) return true;

  return false;
};

/**
 * Processa a sincronização incremental (Delta Sync).
 * Retorna apenas os produtos que sofreram alterações reais de preço ou estoque.
 */
export const filterProductsRequiringSync = (
  existingProducts: Product[],
  freshMoblinkList: MoblinkProduto[],
): MoblinkProduto[] => {
  const existingMap = new Map<string, Product>();
  existingProducts.forEach((p) => {
    const key = String(p.id || p.moblinkId);
    existingMap.set(key, p);
  });

  return freshMoblinkList.filter((freshItem) => {
    const freshId = String(freshItem.id);
    const existing = existingMap.get(freshId);
    return hasProductChanged(existing, freshItem);
  });
};

/**
 * Salva a lista de produtos retornada pelo ERP Moblink em cache local (localStorage) com TTL.
 */
export const saveMoblinkCache = (items: MoblinkProduto[]): void => {
  try {
    const data = {
      items,
      cachedAt: new Date().toISOString(),
    };
    localStorage.setItem("moblink_products_cache", JSON.stringify(data));
  } catch (err) {
    console.warn(
      "[moblinkProductsService] Falha ao salvar cache no localStorage:",
      err,
    );
  }
};

/**
 * Recupera a lista de produtos salvos no cache. Retorna null se não houver ou se for inválido.
 */
export const loadMoblinkCache = (
  maxAgeMinutes = 30,
): MoblinkProduto[] | null => {
  try {
    const cacheStr = localStorage.getItem("moblink_products_cache");
    if (!cacheStr) return null;

    const cacheData = JSON.parse(cacheStr);
    if (!cacheData || !cacheData.cachedAt || !Array.isArray(cacheData.items)) {
      return null;
    }

    const cachedTime = new Date(cacheData.cachedAt).getTime();
    const now = new Date().getTime();
    const diffMin = (now - cachedTime) / (1000 * 60);

    if (diffMin > maxAgeMinutes) {
      localStorage.removeItem("moblink_products_cache"); // Expira o cache antigo
      return null;
    }

    return cacheData.items;
  } catch (err) {
    console.warn(
      "[moblinkProductsService] Falha ao ler cache do localStorage:",
      err,
    );
    return null;
  }
};
