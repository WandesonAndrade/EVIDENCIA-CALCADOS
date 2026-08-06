import { db } from "../lib/firebase";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { Category, Subcategory, Product, MoblinkProduto } from "../types";

export const MOBLINK_GRUPOS_API_URL =
  "https://api.evidenciacalcados.com.br/api/v1/produtos/grupos";
export const MOBLINK_BEARER_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZFVzZXIiOiI3IiwiaWRMb2phIjoiMCIsImlhdCI6MTc4NjAxMjY3NCwiZXhwIjoxNzg2MDk5MDc0fQ.FqmMgmQa-4xYv47UR5GUrq1jBvcT4xr8ZErNbfw1O3Y";

export interface MoblinkGrupoRaw {
  id?: number | string;
  nome_grupo?: string;
  grupo?: string;
  nome_subgrupo?: string;
  subgrupo?: string;
  id_pai?: number | string;
  id_grupo?: number | string;
  id_subgrupo?: number | string;
}

export const DEFAULT_CATEGORY_TREE: Category[] = [
  {
    id: "002",
    code: "002",
    name: "Calçados",
    description: "Calçados femininos, masculinos e infantis",
    subcategories: [
      { id: "002.001", subCode: "001", name: "Masculino" },
      { id: "002.002", subCode: "002", name: "Feminino" },
      { id: "002.003", subCode: "003", name: "Infantil Masculino" },
      { id: "002.004", subCode: "004", name: "Infantil Feminino" },
      { id: "002.005", subCode: "005", name: "Tênis" },
      { id: "002.006", subCode: "006", name: "Botas" },
      { id: "002.007", subCode: "007", name: "Rasteiras & Sandálias" },
      { id: "002.008", subCode: "008", name: "Sapatos Sociais" },
      { id: "002.009", subCode: "009", name: "Mocassins" },
    ],
  },
  {
    id: "003",
    code: "003",
    name: "Acessórios",
    description: "Bonés, relógios, bolsas, cintos e carteiras",
    subcategories: [
      { id: "003.001", subCode: "001", name: "Boné" },
      { id: "003.002", subCode: "002", name: "Relógio" },
      { id: "003.003", subCode: "003", name: "Perfume" },
      { id: "003.004", subCode: "004", name: "Bolsa" },
      { id: "003.005", subCode: "005", name: "Cinto" },
      { id: "003.006", subCode: "006", name: "Carteira" },
      { id: "003.007", subCode: "007", name: "Óculos" },
    ],
  },
  {
    id: "004",
    code: "004",
    name: "Cosméticos",
    description: "Maquiagem e cuidados pessoais",
    subcategories: [
      { id: "004.001", subCode: "001", name: "Maquiagem" },
      { id: "004.002", subCode: "002", name: "Cuidados com a Pele" },
      { id: "004.003", subCode: "003", name: "Cabelos" },
    ],
  },
  {
    id: "005",
    code: "005",
    name: "Perfumes",
    description: "Perfumes nacionais e importados",
    subcategories: [
      { id: "005.001", subCode: "001", name: "Nacionais" },
      { id: "005.002", subCode: "002", name: "Importados" },
    ],
  },
  {
    id: "006",
    code: "006",
    name: "Escolar",
    description: "Mochilas e estojos escolares",
    subcategories: [
      { id: "006.001", subCode: "001", name: "Mochilas" },
      { id: "006.002", subCode: "002", name: "Estojos & Acessórios" },
    ],
  },
  {
    id: "007",
    code: "007",
    name: "Itens de Viagens",
    description: "Malas, frasqueiras e necessaires",
    subcategories: [
      { id: "007.001", subCode: "001", name: "Malas de Viagem" },
      { id: "007.002", subCode: "002", name: "Necessaires & Frasqueiras" },
    ],
  },
];

/**
 * Normaliza nomes de grupos do ERP MobLink para nomes amigáveis de exibição na loja
 */
export function normalizeCategoryName(raw: string): string {
  if (!raw) return "Geral";
  const clean = raw.trim().toUpperCase();

  if (clean.includes("CALCADO") || clean.includes("CALÇADO")) return "Calçados";
  if (clean.includes("ACESSORIO") || clean.includes("ACESSÓRIO"))
    return "Acessórios";
  if (clean.includes("COSMETICO") || clean.includes("COSMÉTICO"))
    return "Cosméticos";
  if (clean.includes("PERFUME")) return "Perfumes";
  if (clean.includes("ESCOLAR")) return "Escolar";
  if (clean.includes("VIAGEM") || clean.includes("VIAGENS"))
    return "Itens de Viagens";
  if (clean.includes("ROUPA") || clean.includes("VESTUARIO")) return "Roupas";

  // Capitalize normal text
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

/**
 * Normaliza nomes de subgrupos do ERP para subcategorias no e-commerce
 */
export function normalizeSubcategoryName(raw: string): string {
  if (!raw) return "";
  const clean = raw.trim().toUpperCase();

  if (clean === "MASCULINO" || clean === "MASC") return "Masculino";
  if (clean === "FEMININO" || clean === "FEM") return "Feminino";
  if (
    clean.includes("INFANTL MASC") ||
    clean.includes("INFANTIL MASC") ||
    clean === "INF MASC"
  )
    return "Infantil Masculino";
  if (
    clean.includes("INFANTL FEM") ||
    clean.includes("INFANTIL FEM") ||
    clean === "INF FEM"
  )
    return "Infantil Feminino";
  if (clean === "BONE" || clean === "BONÉS" || clean === "BONES") return "Boné";
  if (clean === "RELOGIO" || clean === "RELÓGIOS" || clean === "RELOGIOS")
    return "Relógio";
  if (clean === "PERFUME" || clean === "PERFUMES") return "Perfume";
  if (clean === "BOLSA" || clean === "BOLSAS") return "Bolsa";
  if (clean === "CINTO" || clean === "CINTOS") return "Cinto";
  if (clean === "CARTEIRA" || clean === "CARTEIRAS") return "Carteira";
  if (clean === "OCULOS" || clean === "ÓCULOS") return "Óculos";

  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

/**
 * Mapa de resolução de classificacao numérica para categoria/subcategoria.
 * Chave: código de classificacao (ex: "002", "002.004")
 * Valor: { category, subcategory, nome_grupo, nome_subgrupo }
 */
export const classificacaoIndex = new Map<
  string,
  {
    category: string;
    subcategory: string;
    nome_grupo: string;
    nome_subgrupo: string;
  }
>();

// Guard global: evita spam de retries após 401 (token expirado)
let _gruposApiFailed = false;

export const moblinkCategoriesService = {
  /**
   * Consome a rota oficial de grupos do ERP MobLink: GET https://api.evidenciacalcados.com.br/api/v1/produtos/grupos
   */
  async fetchMoblinkGruposApi(): Promise<MoblinkGrupoRaw[]> {
    if (_gruposApiFailed) {
      return [];
    }

    try {
      const response = await fetch(MOBLINK_GRUPOS_API_URL, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${MOBLINK_BEARER_TOKEN}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        _gruposApiFailed = true;
        console.warn(
          `[moblinkCategoriesService] Token Bearer expirado ou inválido (${response.status}). ` +
            "Sincronização de grupos suspensa até renovação do token.",
        );
        return [];
      }

      if (response.ok) {
        const data = await response.json();
        const rawList = Array.isArray(data)
          ? data
          : data.grupos || data.data || data.items || [];
        if (Array.isArray(rawList) && rawList.length > 0) {
          _gruposApiFailed = false;
          return rawList;
        }
      }
    } catch (err) {
      console.warn(
        "📌 Erro ao consultar a rota oficial de grupos MobLink:",
        err,
      );
    }
    return [];
  },

  /**
   * Resolve o campo `classificacao` numérico (ex: "002.004") para {category, subcategory}.
   */
  resolveClassificacao(code: string | number | undefined): {
    category: string;
    subcategory: string;
    nome_grupo: string;
    nome_subgrupo: string;
  } {
    if (!code)
      return {
        category: "Geral",
        subcategory: "",
        nome_grupo: "Geral",
        nome_subgrupo: "",
      };
    const key = String(code).trim();

    if (classificacaoIndex.has(key)) return classificacaoIndex.get(key)!;

    const parentCode = key.split(".")[0];
    if (classificacaoIndex.has(parentCode))
      return classificacaoIndex.get(parentCode)!;

    return {
      category: "Geral",
      subcategory: "",
      nome_grupo: key,
      nome_subgrupo: "",
    };
  },

  /**
   * Constrói a árvore hierárquica de categorias e subcategorias a partir dos grupos da API do ERP e dos produtos.
   * Regras de Agrupamento:
   * 1. Grupo Pai (Categoria): ID isolado antes do ponto (ex: "002"). Documento no Firestore com ID "002".
   * 2. Nome da Categoria: 'nome_grupo' limpo e formatado com primeira letra maiúscula (ex: "Calçados").
   * 3. Subcategorias: Objetos limpos contendo { id: "002.003", subCode: "003", name: "Infantil Masculino" }.
   */
  buildCategoryTree(
    productsList?: (Product | MoblinkProduto)[],
    gruposApiList?: MoblinkGrupoRaw[],
  ): Category[] {
    const groupsMap = new Map<
      string,
      {
        id: string;
        code: string;
        name: string;
        description?: string;
        subMap: Map<string, Subcategory>;
      }
    >();

    // 1. Processar grupos retornados da API oficial MobLink ERP (/api/v1/produtos/grupos)
    if (Array.isArray(gruposApiList) && gruposApiList.length > 0) {
      gruposApiList.forEach((g) => {
        const rawId = String(g.id || "").trim();
        const rawGroup = (g.nome_grupo || g.grupo || "").trim();
        const rawSubgroup = (g.nome_subgrupo || g.subgrupo || "").trim();

        // 1. Agrupamento por ID Pai (Antes do Ponto)
        let parentCode = String(g.id_pai || g.id_grupo || "").trim();
        let subCode = String(g.id_subgrupo || "").trim();

        if (rawId.includes(".")) {
          const parts = rawId.split(".");
          if (!parentCode) parentCode = parts[0].trim();
          if (!subCode) subCode = parts[1].trim();
        } else if (!parentCode) {
          parentCode = rawId;
        }

        if (!parentCode) return;

        const fullSubId = rawId.includes(".")
          ? rawId
          : subCode
            ? `${parentCode}.${subCode}`
            : parentCode;

        // Sanitização do nome da Categoria (nome_grupo)
        const normCatName = rawGroup
          ? normalizeCategoryName(rawGroup)
          : "Geral";
        // Sanitização do nome do Subgrupo (nome_subgrupo)
        const normSubName = rawSubgroup
          ? normalizeSubcategoryName(rawSubgroup)
          : "";

        if (!groupsMap.has(parentCode)) {
          groupsMap.set(parentCode, {
            id: parentCode,
            code: parentCode,
            name: normCatName,
            subMap: new Map(),
          });
        } else {
          const existing = groupsMap.get(parentCode)!;
          if (existing.name === "Geral" && normCatName !== "Geral") {
            existing.name = normCatName;
          }
        }

        const groupData = groupsMap.get(parentCode)!;

        // Popula o índice classificacaoIndex para resolução rápida
        const resolvedItem = {
          category: normCatName,
          subcategory: normSubName,
          nome_grupo: rawGroup,
          nome_subgrupo: rawSubgroup,
        };

        if (fullSubId) classificacaoIndex.set(fullSubId, resolvedItem);
        if (parentCode) {
          classificacaoIndex.set(parentCode, {
            category: normCatName,
            subcategory: "",
            nome_grupo: rawGroup,
            nome_subgrupo: "",
          });
        }
        if (subCode && !classificacaoIndex.has(subCode)) {
          classificacaoIndex.set(subCode, resolvedItem);
        }

        // Adiciona a subcategoria estruturada no array subcategories
        if (subCode && rawSubgroup) {
          const cleanSubName = (normSubName || rawSubgroup).trim();
          groupData.subMap.set(fullSubId, {
            id: fullSubId,
            subCode: subCode,
            name: cleanSubName,
            parentId: parentCode,
            id_subgrupo: g.id_subgrupo || subCode,
            id_pai: parentCode,
          });
        }
      });
    }

    // 2. Se a API de grupos falhou ou retornou vazia, inicializar com fallback de segurança
    if (groupsMap.size === 0) {
      DEFAULT_CATEGORY_TREE.forEach((cat) => {
        const parentCode = cat.code || cat.id;
        const subMap = new Map<string, Subcategory>();
        if (cat.subcategories) {
          cat.subcategories.forEach((sub) => {
            const subCode =
              sub.subCode ||
              (sub.id.includes(".") ? sub.id.split(".")[1] : sub.id);
            subMap.set(sub.id, {
              id: sub.id,
              subCode: subCode,
              name: sub.name.trim(),
              parentId: parentCode,
            });
          });
        }
        groupsMap.set(parentCode, {
          id: parentCode,
          code: parentCode,
          name: cat.name,
          description: cat.description,
          subMap,
        });
      });
    }

    // 3. Varrer lista de produtos para enriquecer a árvore se existirem classificações nos produtos
    if (Array.isArray(productsList) && productsList.length > 0) {
      productsList.forEach((p) => {
        const classCode = String(p.classificacao || "").trim();
        const rawGroup = (
          p.nome_grupo ||
          (p as any).grupo ||
          p.category ||
          ""
        ).trim();
        const rawSubgroup = (
          p.nome_subgrupo ||
          (p as any).subgrupo ||
          p.subcategory ||
          ""
        ).trim();

        if (classCode.includes(".")) {
          const parts = classCode.split(".");
          const parentCode = parts[0].trim();
          const subCode = parts[1].trim();
          const normCatName = rawGroup
            ? normalizeCategoryName(rawGroup)
            : "Geral";
          const normSubName = rawSubgroup
            ? normalizeSubcategoryName(rawSubgroup)
            : "";

          if (parentCode) {
            if (!groupsMap.has(parentCode)) {
              groupsMap.set(parentCode, {
                id: parentCode,
                code: parentCode,
                name: normCatName,
                subMap: new Map(),
              });
            }

            if (subCode && rawSubgroup) {
              const groupData = groupsMap.get(parentCode)!;
              if (!groupData.subMap.has(classCode)) {
                groupData.subMap.set(classCode, {
                  id: classCode,
                  subCode: subCode,
                  name: (normSubName || rawSubgroup).trim(),
                  parentId: parentCode,
                });
              }
            }
          }
        }
      });
    }

    // 4. Montar o resultado final formatado conforme exigido no Firestore
    return Array.from(groupsMap.values()).map(
      ({ id, code, name, description, subMap }) => {
        const subcategories: Subcategory[] = Array.from(subMap.values()).sort(
          (a, b) =>
            (a.subCode || a.id).localeCompare(b.subCode || b.id, undefined, {
              numeric: true,
            }),
        );

        return {
          id,
          code,
          name,
          description: description || "",
          subcategories,
          updatedAt: new Date().toISOString(),
        };
      },
    );
  },

  /**
   * Consome a API oficial de grupos, constrói a árvore e sincroniza na coleção 'categories' no Firestore
   * Estrutura do documento em categories/{id}:
   * {
   *   "id": "002",
   *   "code": "002",
   *   "name": "Calçados",
   *   "subcategories": [
   *     { "id": "002.001", "subCode": "001", "name": "Masculino" },
   *     { "id": "002.002", "subCode": "002", "name": "Feminino" },
   *     { "id": "002.003", "subCode": "003", "name": "Infantil Masculino" }
   *   ],
   *   "updatedAt": "ISO_DATE"
   * }
   */
  async syncCategoriesToFirestore(
    productsList?: (Product | MoblinkProduto)[],
  ): Promise<Category[]> {
    const apiGrupos = await this.fetchMoblinkGruposApi();
    const tree = this.buildCategoryTree(productsList, apiGrupos);
    const nowIso = new Date().toISOString();

    for (const cat of tree) {
      try {
        const catRef = doc(db, "categories", cat.id);
        await setDoc(
          catRef,
          {
            id: cat.id,
            code: cat.code || cat.id,
            name: cat.name,
            subcategories: (cat.subcategories || []).map((sub) => ({
              id: sub.id,
              subCode:
                sub.subCode ||
                (sub.id.includes(".") ? sub.id.split(".")[1] : sub.id),
              name: sub.name.trim(),
            })),
            updatedAt: nowIso,
          },
          { merge: true },
        );
      } catch (err) {
        console.warn(
          `Erro ao sincronizar categoria ${cat.name} (${cat.id}) no Firestore:`,
          err,
        );
      }
    }

    return tree;
  },
};
