import { MoblinkProduto, Product } from "../types";
import {
  moblinkCategoriesService,
  normalizeSubcategoryName,
} from "./moblinkCategoriesService";

export const MOBLINK_OFFICIAL_API_URL =
  (import.meta as any).env?.VITE_MOBLINK_API_URL ||
  (import.meta as any).env?.MOBLINK_API_URL ||
  "";

import { isJwtExpired } from "./moblinkCategoriesService";

export const getMoblinkBearerToken = (): string => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("evidencia_sincom_auth_token");
    if (saved && saved.trim() !== "") {
      if (!isJwtExpired(saved.trim())) {
        return saved.trim();
      } else {
        localStorage.removeItem("evidencia_sincom_auth_token");
        localStorage.removeItem("evidencia_sincom_auth_session");
      }
    }
  }

  const envToken =
    (import.meta as any).env?.VITE_MOBLINK_TOKEN ||
    (import.meta as any).env?.MOBLINK_API_TOKEN ||
    (import.meta as any).env?.VITE_SINCOM_API_TOKEN;

  if (envToken && !isJwtExpired(envToken.trim())) {
    return envToken.trim();
  }

  return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZFVzZXIiOiI3IiwiaWRMb2phIjoiMCIsImlhdCI6MTc4NjA0NjIwNCwiZXhwIjoxNzg2MTMyNjA0fQ.bZE205R0MlJwP0WyIl75j--xuNvC73y322FxV2wCgnM";
};

export const MOBLINK_BEARER_TOKEN = getMoblinkBearerToken();

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
 * Extrai e normaliza a classificação numérica pura (chave mestra ex: "002.003"),
 * traduzindo dinamicamente a Categoria e Subcategoria através da tabela centralizada de categorias.
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
      classificacao: "",
    };
  }

  // 1. Extrair e limpar rigorosamente a chave mestra 'classificacao' (remove todos os espaços)
  let rawClassificacao = "";
  if (typeof item.classificacao === "string") {
    rawClassificacao = item.classificacao.replace(/\s+/g, "").trim();
  } else if (typeof item.classificacao === "number") {
    rawClassificacao = String(item.classificacao).trim();
  } else if (
    typeof item.classificacao === "object" &&
    item.classificacao?.nome
  ) {
    rawClassificacao = String(item.classificacao.nome)
      .replace(/\s+/g, "")
      .trim();
  } else if (item.id_grupo) {
    const parent = String(item.id_grupo).trim();
    const sub = item.id_subgrupo ? String(item.id_subgrupo).trim() : "";
    rawClassificacao = sub ? `${parent}.${sub}` : parent;
  }

  // 2. Extrair subclassificacao bruta de fallback
  let rawSubclassificacao = "";
  if (typeof item.subclassificacao === "string") {
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

  // 3. Tradução oficial dinâmica via tabela central de categorias (categories / classificacaoIndex)
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
  } else if (rawClassificacao && rawClassificacao !== "Geral") {
    category = rawClassificacao;
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
 * Mapeia um item da API oficial do MobLink ERP para a estrutura oficial limpa do Produto.
 * Zero auto-preenchimento de dados fantasmas (sem 'Preto', 'Evidência Calçados', etc. automáticos).
 */
export const mapMoblinkToProduct = (item: MoblinkProduto | any): Product => {
  const mobId = String(item.id || item.moblinkId || item.sku || "").trim();
  const name = String(item.descricao || item.nome || item.name || "").trim();
  const description = String(
    item.description ||
      item.descricao_completa ||
      item.compl_descr ||
      item.descr_compl ||
      "",
  ).trim();

  // URL da foto sem imagens fantasmas de stock ou Unsplash
  const rawImage =
    item.imageUrl ||
    item.foto_uri ||
    (Array.isArray(item.images) ? item.images[0] : "");
  const imageUrl = typeof rawImage === "string" ? rawImage.trim() : "";

  // Chave mestra numérica 'classificacao' sem espaços
  const rawClass = String(
    item.classificacao ||
      (item.id_grupo ? `${item.id_grupo}.${item.id_subgrupo || ""}` : ""),
  );
  const cleanClassificacao = rawClass.replace(/\s+/g, "").trim();

  // Preço principal e preço promocional (números estritos)
  const priceVal = extractPrecoTabelaMoblink(item);
  const price =
    typeof priceVal === "number" && !isNaN(priceVal) && priceVal >= 0
      ? priceVal
      : 0;

  const rawPromo =
    item.promoPrice ?? item.precoOriginal ?? extractPrecoVistaMoblink(item);
  const promoPrice =
    typeof rawPromo === "number" &&
    !isNaN(rawPromo) &&
    rawPromo > 0 &&
    rawPromo < price
      ? rawPromo
      : null;

  // Estoque único (não-negativo)
  const stockVal = extractSaldoLojaMoblink(item);
  const stock = Math.max(0, stockVal);

  // Visibilidade na vitrine
  const visible =
    item.visible !== undefined
      ? stock <= 0
        ? false
        : Boolean(item.visible)
      : stock > 0;

  const catInfo = extractClassificacaoCategoria({
    classificacao: cleanClassificacao,
  });

  return {
    id: mobId,
    name,
    description,
    imageUrl,
    classificacao: cleanClassificacao,
    price,
    promoPrice,
    stock,
    visible,
    updatedAt: item.updatedAt || new Date().toISOString(),

    // Aliases e propriedades derivadas para UI (sem inventar metadados nulos)
    category: catInfo.category,
    subcategory: catInfo.subcategory,
    images: imageUrl ? [imageUrl] : [],
    foto_uri: imageUrl,
    sizes: Array.isArray(item.tamanhos)
      ? item.tamanhos
      : Array.isArray(item.sizes)
        ? item.sizes
        : [],
    barcode: item.codigoBarras || item.barcode || undefined,
    brand: item.marca || item.brand || undefined,
    material: item.material || undefined,
    color: item.cor || item.color || undefined,
    cor: item.cor || item.color || undefined,
    gender: item.genero || item.gender || undefined,
    id_grade: item.id_grade,
  } as Product;
};

/**
 * Sanitiza um objeto de Produto para salvar estritamente o Contrato Limpo no Firestore.
 * Contrato Oficial: { id, name, description, imageUrl, classificacao, price, promoPrice, stock, visible, updatedAt }
 * Prevenção de Dados Fantasmas: Não preenche automaticamente cor, marca, material ou textos padronizados.
 */
export const sanitizeProductForFirestore = (
  product: Partial<Product>,
): Record<string, any> => {
  const id = String(
    product.id || (product as any).moblinkId || (product as any).sku || "",
  ).trim();

  const name = String(
    product.name || product.descricao || (product as any).nome || "",
  ).trim();
  const description = String(
    product.description ||
      product.descricao_completa ||
      (product as any).compl_descr ||
      "",
  ).trim();

  let imageUrl = "";
  if (
    product.imageUrl &&
    typeof product.imageUrl === "string" &&
    product.imageUrl.trim() !== ""
  ) {
    imageUrl = product.imageUrl.trim();
  } else if (
    Array.isArray(product.images) &&
    product.images.length > 0 &&
    product.images[0]
  ) {
    imageUrl = String(product.images[0]).trim();
  } else if (product.foto_uri && typeof product.foto_uri === "string") {
    imageUrl = product.foto_uri.trim();
  }

  // Chave mestra numérica 'classificacao'
  const rawClass = String(
    product.classificacao ||
      ((product as any).id_grupo
        ? `${(product as any).id_grupo}.${(product as any).id_subgrupo || ""}`
        : ""),
  );
  const cleanClassificacao = rawClass.replace(/\s+/g, "").trim();

  // Preços estritos
  const priceVal = extractPrecoTabelaMoblink(product);
  const price =
    typeof priceVal === "number" && !isNaN(priceVal) && priceVal >= 0
      ? priceVal
      : 0;

  const rawPromo =
    (product as any).promoPrice ??
    product.originalPrice ??
    extractPrecoVistaMoblink(product);
  const promoPrice =
    typeof rawPromo === "number" &&
    !isNaN(rawPromo) &&
    rawPromo > 0 &&
    rawPromo < price
      ? rawPromo
      : null;

  // Estoque único
  const stockVal =
    typeof product.stock === "number" && !isNaN(product.stock)
      ? product.stock
      : typeof product.saldo_loja === "number" && !isNaN(product.saldo_loja)
        ? product.saldo_loja
        : 0;
  const stock = Math.max(0, stockVal);

  // Visibilidade
  const visible =
    product.visible !== undefined
      ? stock <= 0
        ? false
        : Boolean(product.visible)
      : stock > 0;

  const updatedAt = product.updatedAt || new Date().toISOString();

  const catInfo = extractClassificacaoCategoria({
    classificacao: cleanClassificacao,
  });

  // Contrato Oficial Limpo para o Firestore
  const cleanPayload: Record<string, any> = {
    id,
    name,
    description,
    imageUrl,
    classificacao: cleanClassificacao,
    price,
    promoPrice,
    stock,
    visible,
    updatedAt,
    // Aliases para exibição imediata em componentes legados
    category: catInfo.category,
    subcategory: catInfo.subcategory,
    images: imageUrl ? [imageUrl] : [],
    foto_uri: imageUrl,
    preco_venda: price,
    saldo_loja: stock,
  };

  // Zero Auto-preenchimento de dados fantasmas (Insere apenas se explicitamente fornecido pelo usuário/API)
  if (Array.isArray(product.sizes) && product.sizes.length > 0) {
    cleanPayload.sizes = product.sizes;
  }
  if (product.id_grade) cleanPayload.id_grade = product.id_grade;
  if (product.barcode) cleanPayload.barcode = product.barcode;
  if (product.brand && product.brand.trim() !== "")
    cleanPayload.brand = product.brand.trim();
  if (product.material && product.material.trim() !== "")
    cleanPayload.material = product.material.trim();
  if (product.color || product.cor) {
    const cleanColor = (product.color || product.cor || "").trim();
    if (cleanColor) {
      cleanPayload.color = cleanColor;
      cleanPayload.cor = cleanColor;
    }
  }
  if (product.gender && product.gender.trim() !== "")
    cleanPayload.gender = product.gender.trim();
  if (product.stockBySize || product.sizeStockMap) {
    cleanPayload.stockBySize = product.stockBySize || product.sizeStockMap;
  }

  // Remoção permanente de campos redundantes e legados
  delete cleanPayload.nome_grupo;
  delete cleanPayload.nome_subgrupo;
  delete cleanPayload.grupo;
  delete cleanPayload.subgrupo;
  delete cleanPayload.sku;

  return cleanUndefinedFields(cleanPayload);
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
              const baseApiUrl = MOBLINK_OFFICIAL_API_URL.replace(
                /[\?&]page=\d+/,
                "",
              );
              const separator = baseApiUrl.includes("?") ? "&" : "?";
              const pageUrl = `${baseApiUrl}${separator}page=${page}`;
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
const getFallbackProdutos = (): MoblinkProduto[] => [];

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
