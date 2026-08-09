import { db } from "../lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { Category, Subcategory, Product, MoblinkProduto } from "../types";
import { evidenciaAuthService } from "../lib/evidenciaAuth";

export const MOBLINK_GRUPOS_API_URL =
  (import.meta as any).env?.VITE_MOBLINK_GRUPOS_API_URL ||
  "https://api.evidenciacalcados.com.br/api/v1/produtos/grupos";

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

export const DEFAULT_CATEGORY_TREE: Category[] = [];

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

  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

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

export const classificacaoIndex = new Map<
  string,
  {
    category: string;
    subcategory: string;
    nome_grupo: string;
    nome_subgrupo: string;
  }
>();

export const moblinkCategoriesService = {
  async fetchMoblinkGruposApi(): Promise<MoblinkGrupoRaw[]> {
    try {
      const response = await evidenciaAuthService.fetchWithAuth(
        MOBLINK_GRUPOS_API_URL,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        },
      );

      if (
        response.status === 401 ||
        response.status === 403 ||
        response.status === 404
      ) {
        return [];
      }

      if (response.ok) {
        const data = await response.json();
        const rawList = Array.isArray(data)
          ? data
          : data.grupos || data.data || data.items || [];
        if (Array.isArray(rawList)) return rawList;
      }
    } catch (err) {
      console.warn(
        "[moblinkCategoriesService] Erro ao consultar API de grupos:",
        err,
      );
    }
    return [];
  },

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

    if (Array.isArray(gruposApiList) && gruposApiList.length > 0) {
      gruposApiList.forEach((g) => {
        const rawId = String(g.id || "").trim();
        const rawGroup = (g.nome_grupo || g.grupo || "").trim();
        const rawSubgroup = (g.nome_subgrupo || g.subgrupo || "").trim();
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
        const normCatName = rawGroup
          ? normalizeCategoryName(rawGroup)
          : "Geral";
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
        }

        const groupData = groupsMap.get(parentCode)!;
        const resolvedItem = {
          category: normCatName,
          subcategory: normSubName,
          nome_grupo: rawGroup,
          nome_subgrupo: rawSubgroup,
        };

        if (fullSubId) classificacaoIndex.set(fullSubId, resolvedItem);
        if (parentCode)
          classificacaoIndex.set(parentCode, {
            ...resolvedItem,
            subcategory: "",
          });
        if (subCode && !classificacaoIndex.has(subCode))
          classificacaoIndex.set(subCode, resolvedItem);

        if (subCode && rawSubgroup) {
          groupData.subMap.set(fullSubId, {
            id: fullSubId,
            subCode: subCode,
            name: (normSubName || rawSubgroup).trim(),
            parentId: parentCode,
            id_subgrupo: g.id_subgrupo || subCode,
            id_pai: parentCode,
          });
        }
      });
    }

    if (groupsMap.size === 0) {
      DEFAULT_CATEGORY_TREE.forEach((cat) => {
        const parentCode = cat.code || cat.id;
        const subMap = new Map<string, Subcategory>();
        cat.subcategories?.forEach((sub) => {
          const subCode =
            sub.subCode ||
            (sub.id.includes(".") ? sub.id.split(".")[1] : sub.id);
          subMap.set(sub.id, {
            id: sub.id,
            subCode,
            name: sub.name.trim(),
            parentId: parentCode,
          });
        });
        groupsMap.set(parentCode, {
          id: parentCode,
          code: parentCode,
          name: cat.name,
          description: cat.description,
          subMap,
        });
      });
    }

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
          const [parentCode, subCode] = classCode.split(".");
          if (parentCode) {
            if (!groupsMap.has(parentCode)) {
              groupsMap.set(parentCode, {
                id: parentCode,
                code: parentCode,
                name: normalizeCategoryName(rawGroup),
                subMap: new Map(),
              });
            }
            if (subCode && rawSubgroup) {
              const groupData = groupsMap.get(parentCode)!;
              if (!groupData.subMap.has(classCode)) {
                groupData.subMap.set(classCode, {
                  id: classCode,
                  subCode,
                  name: normalizeSubcategoryName(rawSubgroup),
                  parentId: parentCode,
                });
              }
            }
          }
        }
      });
    }

    return Array.from(groupsMap.values()).map(
      ({ id, code, name, description, subMap }) => ({
        id,
        code,
        name,
        description: description || "",
        subcategories: Array.from(subMap.values()).sort((a, b) =>
          (a.subCode || a.id).localeCompare(b.subCode || b.id, undefined, {
            numeric: true,
          }),
        ),
        updatedAt: new Date().toISOString(),
      }),
    );
  },

  async syncCategoriesToFirestore(
    productsList?: (Product | MoblinkProduto)[],
  ): Promise<Category[]> {
    const apiGrupos = await this.fetchMoblinkGruposApi();
    const tree = this.buildCategoryTree(productsList, apiGrupos);
    const nowIso = new Date().toISOString();

    for (const cat of tree) {
      try {
        await setDoc(
          doc(db, "categories", cat.id),
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
