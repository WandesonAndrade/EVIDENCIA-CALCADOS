import { db } from "../lib/firebase";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { Category, Subcategory, Product, MoblinkProduto } from "../types";

export const MOBLINK_GRUPOS_API_URL =
  "https://api.evidenciacalcados.com.br/api/v1/produtos/grupos";
export const MOBLINK_BEARER_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZFVzZXIiOiI3IiwiaWRMb2phIjoiMCIsImlhdCI6MTc4NTg0Mzg2MSwiZXhwIjoxNzg1OTMwMjYxfQ.-y3Ee_Pql3qa2Bp6g7li-ba3zzTSEJuL0JW3rEpvSIA";

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
    id: "cat-calcados",
    name: "Calçados",
    description: "Calçados femininos, masculinos e infantis",
    subcategories: [
      { id: "sub-calcados-fem", name: "Feminino", parentId: "cat-calcados" },
      { id: "sub-calcados-masc", name: "Masculino", parentId: "cat-calcados" },
      {
        id: "sub-calcados-inf-fem",
        name: "Infantil Feminino",
        parentId: "cat-calcados",
      },
      {
        id: "sub-calcados-inf-masc",
        name: "Infantil Masculino",
        parentId: "cat-calcados",
      },
      { id: "sub-calcados-tenis", name: "Tênis", parentId: "cat-calcados" },
      { id: "sub-calcados-botas", name: "Botas", parentId: "cat-calcados" },
      {
        id: "sub-calcados-rasteiras",
        name: "Rasteiras & Sandálias",
        parentId: "cat-calcados",
      },
      {
        id: "sub-calcados-sociais",
        name: "Sapatos Sociais",
        parentId: "cat-calcados",
      },
      {
        id: "sub-calcados-mocassim",
        name: "Mocassins",
        parentId: "cat-calcados",
      },
    ],
  },
  {
    id: "cat-acessorios",
    name: "Acessórios",
    description: "Bonés, relógios, bolsas, cintos e carteiras",
    subcategories: [
      { id: "sub-acessorios-bone", name: "Boné", parentId: "cat-acessorios" },
      {
        id: "sub-acessorios-relogio",
        name: "Relógio",
        parentId: "cat-acessorios",
      },
      {
        id: "sub-acessorios-perfume",
        name: "Perfume",
        parentId: "cat-acessorios",
      },
      { id: "sub-acessorios-bolsa", name: "Bolsa", parentId: "cat-acessorios" },
      { id: "sub-acessorios-cinto", name: "Cinto", parentId: "cat-acessorios" },
      {
        id: "sub-acessorios-carteira",
        name: "Carteira",
        parentId: "cat-acessorios",
      },
      {
        id: "sub-acessorios-oculos",
        name: "Óculos",
        parentId: "cat-acessorios",
      },
    ],
  },
  {
    id: "cat-cosmeticos",
    name: "Cosméticos",
    description: "Maquiagem e cuidados pessoais",
    subcategories: [
      {
        id: "sub-cosmeticos-make",
        name: "Maquiagem",
        parentId: "cat-cosmeticos",
      },
      {
        id: "sub-cosmeticos-pele",
        name: "Cuidados com a Pele",
        parentId: "cat-cosmeticos",
      },
      {
        id: "sub-cosmeticos-cabelo",
        name: "Cabelos",
        parentId: "cat-cosmeticos",
      },
    ],
  },
  {
    id: "cat-perfumes",
    name: "Perfumes",
    description: "Perfumes nacionais e importados",
    subcategories: [
      {
        id: "sub-perfumes-nacionais",
        name: "Nacionais",
        parentId: "cat-perfumes",
      },
      {
        id: "sub-perfumes-importados",
        name: "Importados",
        parentId: "cat-perfumes",
      },
    ],
  },
  {
    id: "cat-escolar",
    name: "Escolar",
    description: "Mochilas e estojos escolares",
    subcategories: [
      { id: "sub-escolar-mochilas", name: "Mochilas", parentId: "cat-escolar" },
      {
        id: "sub-escolar-estojos",
        name: "Estojos & Acessórios",
        parentId: "cat-escolar",
      },
    ],
  },
  {
    id: "cat-viagem",
    name: "Itens de Viagens",
    description: "Malas, frasqueiras e necessaires",
    subcategories: [
      {
        id: "sub-viagem-malas",
        name: "Malas de Viagem",
        parentId: "cat-viagem",
      },
      {
        id: "sub-viagem-necessaires",
        name: "Necessaires & Frasqueiras",
        parentId: "cat-viagem",
      },
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
 *
 * Populado pela chamada à API de grupos e atualizado a cada sync.
 */
export const classificacaoIndex = new Map<string, {
  category: string;
  subcategory: string;
  nome_grupo: string;
  nome_subgrupo: string;
}>();

export const moblinkCategoriesService = {
  /**
   * Consome a rota oficial de grupos do ERP MobLink: GET https://api.evidenciacalcados.com.br/api/v1/produtos/grupos
   */
  async fetchMoblinkGruposApi(): Promise<MoblinkGrupoRaw[]> {
    try {
      const response = await fetch(MOBLINK_GRUPOS_API_URL, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${MOBLINK_BEARER_TOKEN}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const rawList = Array.isArray(data)
          ? data
          : data.grupos || data.data || data.items || [];
        if (Array.isArray(rawList) && rawList.length > 0) {
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
   * Usa o índice classificacaoIndex populado após fetchMoblinkGruposApi.
   * Fallback: retorna 'Geral' quando não encontrado.
   */
  resolveClassificacao(code: string | number | undefined): {
    category: string;
    subcategory: string;
    nome_grupo: string;
    nome_subgrupo: string;
  } {
    if (!code) return { category: 'Geral', subcategory: '', nome_grupo: 'Geral', nome_subgrupo: '' };
    const key = String(code).trim();

    // Busca exata (ex: "002.004")
    if (classificacaoIndex.has(key)) return classificacaoIndex.get(key)!;

    // Busca pela parte do grupo pai (ex: "002" de "002.004")
    const parentCode = key.split('.')[0];
    if (classificacaoIndex.has(parentCode)) return classificacaoIndex.get(parentCode)!;

    return { category: 'Geral', subcategory: '', nome_grupo: key, nome_subgrupo: '' };
  },

  /**
   * Constrói a árvore hierárquica de categorias e subcategorias a partir dos grupos da API do ERP e da lista de produtos
   */
  buildCategoryTree(
    productsList?: (Product | MoblinkProduto)[],
    gruposApiList?: MoblinkGrupoRaw[],
  ): Category[] {
    const categoriesMap = new Map<
      string,
      { category: Category; subMap: Map<string, Subcategory> }
    >();

    // 1. Inicializar com as categorias padrão da loja
    DEFAULT_CATEGORY_TREE.forEach((cat) => {
      const subMap = new Map<string, Subcategory>();
      if (cat.subcategories) {
        cat.subcategories.forEach((sub) =>
          subMap.set(sub.name.toUpperCase(), sub),
        );
      }
      categoriesMap.set(cat.name.toUpperCase(), {
        category: { ...cat },
        subMap,
      });
    });

    // 2. Processar grupos retornados da API oficial MobLink ERP (/api/v1/produtos/grupos)
    if (Array.isArray(gruposApiList) && gruposApiList.length > 0) {
      gruposApiList.forEach((g) => {
        const rawGroup = (g.nome_grupo || g.grupo || "").trim();
        const rawSubgroup = (g.nome_subgrupo || g.subgrupo || "").trim();

        if (rawGroup) {
          const normCatName = normalizeCategoryName(rawGroup);
          const catKey = normCatName.toUpperCase();

          if (!categoriesMap.has(catKey)) {
            const newCat: Category = {
              id: `cat-${catKey.toLowerCase().replace(/\s+/g, "-")}`,
              name: normCatName,
              id_grupo: g.id_grupo || g.id,
              subcategories: [],
            };
            categoriesMap.set(catKey, { category: newCat, subMap: new Map() });
          }

          const catData = categoriesMap.get(catKey)!;

          // Popula o índice de resolução de classificacao numérica
          // Ex de item de grupo da API: { id: "002.003", nome_grupo: "CALCADOS", nome_subgrupo: "INFANTL MASCULINO", id_pai: "002" }
          const fullId = String(g.id || '').trim();
          const parentId = String(g.id_pai || g.id_grupo || '').trim();
          const subgrupoId = String(g.id_subgrupo || '').trim();
          const normSubName = rawSubgroup ? normalizeSubcategoryName(rawSubgroup) : '';

          const resolvedItem = {
            category: normCatName,
            subcategory: normSubName,
            nome_grupo: rawGroup,
            nome_subgrupo: rawSubgroup
          };

          // 1. Indexar pelo ID completo (ex: "002.003")
          if (fullId) {
            classificacaoIndex.set(fullId, resolvedItem);
          }

          // 2. Indexar pelo par parentId.subgrupoId se disponíveis separadamente
          if (parentId && subgrupoId) {
            classificacaoIndex.set(`${parentId}.${subgrupoId}`, resolvedItem);
          }

          // 3. Indexar subgrupoId se isolado
          if (subgrupoId && !classificacaoIndex.has(subgrupoId)) {
            classificacaoIndex.set(subgrupoId, resolvedItem);
          }

          // 4. Indexar o ID do pai isolado (ex: "002" -> CALCADOS)
          if (parentId && !classificacaoIndex.has(parentId)) {
            classificacaoIndex.set(parentId, {
              category: normCatName,
              subcategory: '',
              nome_grupo: rawGroup,
              nome_subgrupo: ''
            });
          }

          if (rawSubgroup) {
            const normSubName2 = normalizeSubcategoryName(rawSubgroup);
            const subKey = normSubName2.toUpperCase();

            if (!catData.subMap.has(subKey)) {
              const newSub: Subcategory = {
                id: `sub-${catKey.toLowerCase()}-${subKey.toLowerCase().replace(/\s+/g, "-")}`,
                name: normSubName2,
                parentId: catData.category.id,
                id_subgrupo: g.id_subgrupo || g.id,
                id_pai: g.id_pai || g.id_grupo,
              };
              catData.subMap.set(subKey, newSub);
            }
          }
        }
      });
    }

    // 3. Varrer lista de produtos para enriquecer a árvore com grupos/subgrupos dos itens
    if (Array.isArray(productsList) && productsList.length > 0) {
      productsList.forEach((p) => {
        const rawGroup = (
          p.nome_grupo ||
          (p as any).grupo ||
          p.category ||
          (p as any).categoria ||
          ""
        ).trim();
        const rawSubgroup = (
          p.nome_subgrupo ||
          (p as any).subgrupo ||
          p.subcategory ||
          (p as any).subcategoria ||
          ""
        ).trim();

        if (rawGroup) {
          const normCatName = normalizeCategoryName(rawGroup);
          const catKey = normCatName.toUpperCase();

          if (!categoriesMap.has(catKey)) {
            const newCat: Category = {
              id: `cat-${catKey.toLowerCase().replace(/\s+/g, "-")}`,
              name: normCatName,
              subcategories: [],
            };
            categoriesMap.set(catKey, { category: newCat, subMap: new Map() });
          }

          const catData = categoriesMap.get(catKey)!;

          if (rawSubgroup) {
            const normSubName = normalizeSubcategoryName(rawSubgroup);
            const subKey = normSubName.toUpperCase();

            if (!catData.subMap.has(subKey)) {
              const newSub: Subcategory = {
                id: `sub-${catKey.toLowerCase()}-${subKey.toLowerCase().replace(/\s+/g, "-")}`,
                name: normSubName,
                parentId: catData.category.id,
                id_subgrupo: (p as any).id_subgrupo,
                id_pai: (p as any).id_pai || (p as any).id_grupo,
              };
              catData.subMap.set(subKey, newSub);
            }
          }
        }
      });
    }

    // 4. Montar o resultado final com subcategorias estruturadas
    return Array.from(categoriesMap.values()).map(({ category, subMap }) => {
      return {
        ...category,
        subcategories: Array.from(subMap.values()),
      };
    });
  },

  /**
   * Consome a API oficial de grupos, constrói a árvore e sincroniza no Firestore
   */
  async syncCategoriesToFirestore(
    productsList?: (Product | MoblinkProduto)[],
  ): Promise<Category[]> {
    // 1. Busca os grupos diretamente na rota oficial da API MobLink
    const apiGrupos = await this.fetchMoblinkGruposApi();

    // 2. Constrói a árvore hierárquica combinando API e produtos
    const tree = this.buildCategoryTree(productsList, apiGrupos);

    // 3. Salva cada categoria e suas subcategorias no Firestore
    for (const cat of tree) {
      try {
        const catRef = doc(db, "categories", cat.id);
        await setDoc(
          catRef,
          {
            id: cat.id,
            name: cat.name,
            description: cat.description || "",
            id_grupo: cat.id_grupo || null,
            subcategories: cat.subcategories || [],
            createdAt: cat.createdAt || new Date().toISOString(),
          },
          { merge: true },
        );
      } catch (err) {
        console.warn(
          `Erro ao sincronizar categoria ${cat.name} no Firestore:`,
          err,
        );
      }
    }

    return tree;
  },
};
