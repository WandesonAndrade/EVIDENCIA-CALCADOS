import { db } from "../lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { Category, Subcategory, Product, MoblinkProduto } from "../types";
import { evidenciaAuthService } from "../lib/evidenciaAuth";
import { API_ENDPOINTS } from "./api";

export const MOBLINK_GRUPOS_API_URL = API_ENDPOINTS.PRODUTOS_GRUPOS;

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
  if (!raw || raw.trim() === '') return "Geral";
  const clean = raw.trim().toUpperCase();

  // Dicionário de Correção Gramatical para Categorias do ERP / Banco de Dados
  if (clean.includes("CONFEC") || clean.includes("ROUPA") || clean.includes("VESTU") || clean.includes("CONFECOES") || clean.includes("CONFECCOES")) return "Confecções";
  if (clean.includes("CALCAD") || clean.includes("CALÇAD")) return "Calçados";
  if (clean.includes("ACESSOR") || clean.includes("ACESSÓR")) return "Acessórios";
  if (clean.includes("PROMO") || clean.includes("OFERTA")) return "Promoções";
  if (clean.includes("NOVIDAD") || clean.includes("LANÇAMEN") || clean.includes("LANCAMEN")) return "Novidades";
  if (clean.includes("COSMET") || clean.includes("COSMÉT")) return "Cosméticos";
  if (clean.includes("PERFUM")) return "Perfumes";
  if (clean.includes("ESCOLAR") || clean.includes("ESCOLA")) return "Escolar";
  if (clean.includes("VIAGEM") || clean.includes("VIAGENS") || clean.includes("MALA")) return "Itens de Viagem";
  if (clean.includes("DIVERSO")) return "Diversos";
  if (clean.includes("BOLSA")) return "Bolsas";
  if (clean.includes("CARTEIR")) return "Carteiras";
  if (clean.includes("CINTO")) return "Cintos";
  if (clean.includes("TENIS") || clean.includes("TÊNIS")) return "Tênis";
  if (clean.includes("SAPATILH")) return "Sapatilhas";
  if (clean.includes("SANDAL")) return "Sandálias";
  if (clean.includes("CHINEL")) return "Chinelos";
  if (clean.includes("RASTEIR")) return "Rasteiras";
  if (clean.includes("MOCASSIM") || clean.includes("MOCASSIN")) return "Mocassins";
  if (clean.includes("SAPATO")) return "Sapatos";
  if (clean.includes("BOTA")) return "Botas";
  if (clean.includes("PAPETE")) return "Papetes";

  if (clean === "GERAL") return "Geral";

  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

export function normalizeSubcategoryName(raw: string): string {
  if (!raw) return "";
  const clean = raw.trim().toUpperCase();

  // Dicionário de Correção Gramatical para Subcategorias do ERP / Banco de Dados
  if (clean === "MASCULINO" || clean === "MASC") return "Masculino";
  if (clean === "FEMININO" || clean === "FEM") return "Feminino";
  if (clean.includes("INFANTL MASC") || clean.includes("INFANTIL MASC") || clean === "INF MASC") return "Infantil Masculino";
  if (clean.includes("INFANTL FEM") || clean.includes("INFANTIL FEM") || clean === "INF FEM") return "Infantil Feminino";
  if (clean.includes("CONFECOES") || clean.includes("CONFECCOES") || clean.includes("CONFECÇ")) return "Confecções";
  if (clean.includes("CALCADO") || clean.includes("CALÇADO")) return "Calçados";
  if (clean.includes("ACESSORIO") || clean.includes("ACESSÓRIO")) return "Acessórios";
  if (clean.includes("PROMOCOES") || clean.includes("PROMOÇÃO")) return "Promoções";
  if (clean.includes("COSMETICO") || clean.includes("COSMÉTICO")) return "Cosméticos";
  if (clean.includes("PERFUME") || clean.includes("PERFUMES")) return "Perfumes";
  if (clean.includes("SAPATILHA") || clean.includes("SAPATILHAS")) return "Sapatilhas";
  if (clean.includes("SANDALIA") || clean.includes("SANDÁLIA") || clean.includes("SANDALIAS") || clean.includes("SANDÁLIAS")) return "Sandálias";
  if (clean.includes("TENIS") || clean.includes("TÊNIS")) return "Tênis";
  if (clean.includes("CHINELO") || clean.includes("CHINELOS")) return "Chinelos";
  if (clean.includes("RASTEIRA") || clean.includes("RASTEIRAS") || clean.includes("RASTEIRINHA")) return "Rasteiras";
  if (clean.includes("MOCASSIM") || clean.includes("MOCASSINS")) return "Mocassins";
  if (clean.includes("SAPATO") || clean.includes("SAPATOS")) return "Sapatos";
  if (clean.includes("BOTA") || clean.includes("BOTAS")) return "Botas";
  if (clean.includes("PAPETE") || clean.includes("PAPETES")) return "Papetes";
  if (clean.includes("SCARPIN") || clean.includes("SCARPINS")) return "Scarpins";
  if (clean.includes("BONE") || clean.includes("BONÉS") || clean.includes("BONES")) return "Boné";
  if (clean.includes("RELOGIO") || clean.includes("RELÓGIOS") || clean.includes("RELOGIOS")) return "Relógio";
  if (clean.includes("BOLSA") || clean.includes("BOLSAS")) return "Bolsa";
  if (clean.includes("CINTO") || clean.includes("CINTOS")) return "Cinto";
  if (clean.includes("CARTEIRA") || clean.includes("CARTEIRAS")) return "Carteira";
  if (clean.includes("OCULOS") || clean.includes("ÓCULOS")) return "Óculos";
  if (clean.includes("MOCHILA") || clean.includes("MOCHILAS")) return "Mochila";
  if (clean.includes("TAMANHO") || clean.includes("TAMANHOS")) return "Tamanhos";

  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

export function isProductInCategory(prod: Product, targetCategory: string): boolean {
  if (!prod || !targetCategory) return false;
  const targetNorm = normalizeCategoryName(targetCategory).toUpperCase();
  const targetClean = targetCategory.trim().toUpperCase();

  if (targetClean === "DIVERSOS" || targetClean === "TODOS" || targetClean === "ALL") {
    return true;
  }

  const cat = normalizeCategoryName(prod.category || "").toUpperCase();
  const categoria = normalizeCategoryName((prod as any).categoria || "").toUpperCase();
  const grupo = normalizeCategoryName(prod.nome_grupo || "").toUpperCase();
  const subgrupo = normalizeSubcategoryName(prod.nome_subgrupo || "").toUpperCase();
  const productType = (prod.productType || "").toUpperCase();
  const name = (prod.name || "").toUpperCase();

  const rawCat = (prod.category || "").toUpperCase();
  const rawGrupo = (prod.nome_grupo || "").toUpperCase();
  const rawSubgrupo = (prod.nome_subgrupo || "").toUpperCase();

  if (cat === targetNorm || categoria === targetNorm || grupo === targetNorm) {
    return true;
  }

  if (targetNorm === "CONFECÇÕES" || targetClean.includes("CONFEC") || targetClean.includes("ROUPA") || targetClean.includes("VESTU")) {
    return (
      cat.includes("CONFEC") ||
      cat.includes("ROUPA") ||
      cat.includes("VESTU") ||
      grupo.includes("CONFEC") ||
      grupo.includes("ROUPA") ||
      grupo.includes("VESTU") ||
      rawCat.includes("CONFEC") ||
      rawGrupo.includes("CONFEC") ||
      rawSubgrupo.includes("CONFEC") ||
      productType.includes("ROUPA") ||
      productType.includes("CONFEC")
    );
  }

  if (targetNorm === "CALÇADOS" || targetClean.includes("CALCAD")) {
    const isNonFootwear =
      cat.includes("ACESSÓRIO") || cat.includes("ACESSORIO") ||
      cat.includes("BOLSA") || cat.includes("VIAGEM") || cat.includes("MALA") ||
      cat.includes("CONFEC") || cat.includes("ROUPA") || cat.includes("VESTU") ||
      cat.includes("COSMET") || cat.includes("PERFUM") || cat.includes("ESCOLAR") ||
      grupo.includes("ACESSÓRIO") || grupo.includes("ACESSORIO") ||
      grupo.includes("BOLSA") || grupo.includes("VIAGEM") || grupo.includes("MALA") ||
      grupo.includes("CONFEC") || grupo.includes("ROUPA") || grupo.includes("VESTU") ||
      grupo.includes("COSMET") || grupo.includes("PERFUM") || grupo.includes("ESCOLAR") ||
      productType.includes("BOLSA") || productType.includes("ROUPA") || productType.includes("VIAGEM") ||
      rawCat.includes("VIAGEM") || rawGrupo.includes("VIAGEM") || rawSubgrupo.includes("VIAGEM") ||
      rawCat.includes("MALA") || rawGrupo.includes("MALA") || rawSubgrupo.includes("MALA") ||
      name.includes("MALA ") || name.startsWith("MALA ") || name.includes("FRASQUEIRA");
    return !isNonFootwear;
  }

  if (targetNorm === "ACESSÓRIOS" || targetClean.includes("ACESSOR") || targetClean.includes("BOLSA") || targetClean.includes("VIAGEM") || targetClean.includes("MALA")) {
    return (
      cat.includes("ACESSÓRIO") || cat.includes("ACESSORIO") ||
      cat.includes("BOLSA") || cat.includes("VIAGEM") || cat.includes("MALA") ||
      grupo.includes("ACESSÓRIO") || grupo.includes("ACESSORIO") ||
      grupo.includes("BOLSA") || grupo.includes("VIAGEM") || grupo.includes("MALA") ||
      subgrupo.includes("BOLSA") || subgrupo.includes("CINTO") || subgrupo.includes("CARTEIRA") || subgrupo.includes("VIAGEM") || subgrupo.includes("MALA") ||
      rawCat.includes("ACESSOR") || rawGrupo.includes("ACESSOR") ||
      rawCat.includes("BOLSA") || rawGrupo.includes("BOLSA") ||
      rawCat.includes("VIAGEM") || rawGrupo.includes("VIAGEM") ||
      name.includes("MALA ") || name.startsWith("MALA ")
    );
  }

  const cleanTargetNoAccents = targetClean.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const rawCatNoAccents = rawCat.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const rawGrupoNoAccents = rawGrupo.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const rawSubNoAccents = rawSubgrupo.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  return (
    rawCatNoAccents.includes(cleanTargetNoAccents) ||
    rawGrupoNoAccents.includes(cleanTargetNoAccents) ||
    rawSubNoAccents.includes(cleanTargetNoAccents) ||
    name.includes(targetClean)
  );
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

// Mapeamento pré-populado para códigos numéricos de classificação do ERP MobLink
const defaultClassificacaoEntries: [string, { category: string; subcategory: string; nome_grupo: string; nome_subgrupo: string }][] = [
  ["001", { category: "Calçados", subcategory: "", nome_grupo: "Calçados", nome_subgrupo: "" }],
  ["001.001", { category: "Calçados", subcategory: "Masculino", nome_grupo: "Calçados", nome_subgrupo: "Masculino" }],
  ["001.002", { category: "Calçados", subcategory: "Feminino", nome_grupo: "Calçados", nome_subgrupo: "Feminino" }],
  ["001.003", { category: "Calçados", subcategory: "Infantil", nome_grupo: "Calçados", nome_subgrupo: "Infantil" }],
  ["002", { category: "Calçados", subcategory: "", nome_grupo: "Calçados", nome_subgrupo: "" }],
  ["002.001", { category: "Calçados", subcategory: "Masculino", nome_grupo: "Calçados", nome_subgrupo: "Masculino" }],
  ["002.002", { category: "Calçados", subcategory: "Feminino", nome_grupo: "Calçados", nome_subgrupo: "Feminino" }],
  ["002.003", { category: "Calçados", subcategory: "Infantil", nome_grupo: "Calçados", nome_subgrupo: "Infantil" }],
  ["002.004", { category: "Calçados", subcategory: "Bebê", nome_grupo: "Calçados", nome_subgrupo: "Bebê" }],
  ["003", { category: "Confecções", subcategory: "", nome_grupo: "Confecções", nome_subgrupo: "" }],
  ["003.001", { category: "Confecções", subcategory: "Masculino", nome_grupo: "Confecções", nome_subgrupo: "Masculino" }],
  ["003.002", { category: "Confecções", subcategory: "Feminino", nome_grupo: "Confecções", nome_subgrupo: "Feminino" }],
  ["003.003", { category: "Confecções", subcategory: "Infantil", nome_grupo: "Confecções", nome_subgrupo: "Infantil" }],
  ["004", { category: "Acessórios", subcategory: "Bolsas & Acessórios", nome_grupo: "Acessórios", nome_subgrupo: "Bolsas & Acessórios" }],
  ["004.001", { category: "Acessórios", subcategory: "Bolsas", nome_grupo: "Acessórios", nome_subgrupo: "Bolsas" }],
  ["004.002", { category: "Acessórios", subcategory: "Cintos", nome_grupo: "Acessórios", nome_subgrupo: "Cintos" }],
  ["004.003", { category: "Acessórios", subcategory: "Carteiras", nome_grupo: "Acessórios", nome_subgrupo: "Carteiras" }],
  // Mapeamentos equivalentes sem padding de zeros
  ["1", { category: "Calçados", subcategory: "", nome_grupo: "Calçados", nome_subgrupo: "" }],
  ["1.1", { category: "Calçados", subcategory: "Masculino", nome_grupo: "Calçados", nome_subgrupo: "Masculino" }],
  ["1.2", { category: "Calçados", subcategory: "Feminino", nome_grupo: "Calçados", nome_subgrupo: "Feminino" }],
  ["1.3", { category: "Calçados", subcategory: "Infantil", nome_grupo: "Calçados", nome_subgrupo: "Infantil" }],
  ["2", { category: "Calçados", subcategory: "", nome_grupo: "Calçados", nome_subgrupo: "" }],
  ["2.1", { category: "Calçados", subcategory: "Masculino", nome_grupo: "Calçados", nome_subgrupo: "Masculino" }],
  ["2.2", { category: "Calçados", subcategory: "Feminino", nome_grupo: "Calçados", nome_subgrupo: "Feminino" }],
  ["2.3", { category: "Calçados", subcategory: "Infantil", nome_grupo: "Calçados", nome_subgrupo: "Infantil" }],
  ["2.4", { category: "Calçados", subcategory: "Bebê", nome_grupo: "Calçados", nome_subgrupo: "Bebê" }],
  ["3", { category: "Confecções", subcategory: "", nome_grupo: "Confecções", nome_subgrupo: "" }],
  ["3.1", { category: "Confecções", subcategory: "Masculino", nome_grupo: "Confecções", nome_subgrupo: "Masculino" }],
  ["3.2", { category: "Confecções", subcategory: "Feminino", nome_grupo: "Confecções", nome_subgrupo: "Feminino" }],
  ["3.3", { category: "Confecções", subcategory: "Infantil", nome_grupo: "Confecções", nome_subgrupo: "Infantil" }],
  ["4", { category: "Acessórios", subcategory: "Bolsas & Acessórios", nome_grupo: "Acessórios", nome_subgrupo: "Bolsas & Acessórios" }],
  ["4.1", { category: "Acessórios", subcategory: "Bolsas", nome_grupo: "Acessórios", nome_subgrupo: "Bolsas" }],
  ["4.2", { category: "Acessórios", subcategory: "Cintos", nome_grupo: "Acessórios", nome_subgrupo: "Cintos" }],
  ["4.3", { category: "Acessórios", subcategory: "Carteiras", nome_grupo: "Acessórios", nome_subgrupo: "Carteiras" }],
];

defaultClassificacaoEntries.forEach(([k, v]) => classificacaoIndex.set(k, v));

export const moblinkCategoriesService = {
  /**
   * Consulta a API de grupos/categorias do MobLink ERP.
   * Tenta múltiplos endpoints conhecidos da API para garantir resiliência máxima.
   */
  async fetchMoblinkGruposApi(): Promise<MoblinkGrupoRaw[]> {
    const endpointsToTry = [
      API_ENDPOINTS.PRODUTOS_GRUPOS,
      API_ENDPOINTS.PRODUTOS_CATEGORIAS,
      API_ENDPOINTS.GRUPOS,
      API_ENDPOINTS.CATEGORIAS,
    ];

    for (const url of endpointsToTry) {
      try {
        const response = await evidenciaAuthService.fetchWithAuth(url, {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (response.ok) {
          const data = await response.json();
          const rawList = Array.isArray(data)
            ? data
            : data.grupos || data.categorias || data.subgrupos || data.data || data.items || [];

          if (Array.isArray(rawList) && rawList.length > 0) {
            return rawList;
          }
        }
      } catch (err) {
        console.warn(`[moblinkCategoriesService] Aviso ao consultar rota de grupos/categorias (${url}):`, err);
      }
    }
    return [];
  },

  /**
   * Resolve e traduz o código numérico de classificação do ERP MobLink para nomes limpos e padronizados.
   */
  resolveClassificacao(code: string | number | undefined): {
    category: string;
    subcategory: string;
    nome_grupo: string;
    nome_subgrupo: string;
  } {
    if (!code) {
      return {
        category: "Calçados",
        subcategory: "",
        nome_grupo: "Calçados",
        nome_subgrupo: "",
      };
    }
    const key = String(code).trim();
    if (!key) {
      return {
        category: "Calçados",
        subcategory: "",
        nome_grupo: "Calçados",
        nome_subgrupo: "",
      };
    }

    // 1. Tenta correspondência exata
    if (classificacaoIndex.has(key)) return classificacaoIndex.get(key)!;

    // 2. Tenta com padding de 3 dígitos (ex: "1.1" -> "001.001", "1" -> "001")
    const parts = key.split(".");
    const paddedCode = parts.map((p) => p.padStart(3, "0")).join(".");
    if (classificacaoIndex.has(paddedCode)) return classificacaoIndex.get(paddedCode)!;

    // 3. Tenta pelo código do grupo pai (ex: "001.001" -> "001" ou "1.1" -> "1")
    const parentCode = parts[0];
    if (classificacaoIndex.has(parentCode)) return classificacaoIndex.get(parentCode)!;
    const paddedParent = parentCode.padStart(3, "0");
    if (classificacaoIndex.has(paddedParent)) return classificacaoIndex.get(paddedParent)!;

    return {
      category: "Calçados",
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

        if (classCode) {
          const parentCode = classCode.includes(".") ? classCode.split(".")[0].trim() : classCode.trim();
          const subCode = classCode.includes(".") ? classCode.split(".")[1].trim() : "";

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
              const fullSubId = `${parentCode}.${subCode}`;
              if (!groupData.subMap.has(fullSubId)) {
                groupData.subMap.set(fullSubId, {
                  id: fullSubId,
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
      } catch (err: any) {
        if (
          err?.code === "permission-denied" ||
          err?.message?.includes("permission") ||
          err?.message?.includes("permissions")
        ) {
          // Ignora silenciosamente erros de permissão de escrita em sincronizações automáticas em segundo plano
          continue;
        }
        console.warn(
          `Erro ao sincronizar categoria ${cat.name} (${cat.id}) no Firestore:`,
          err,
        );
      }
    }
    return tree;
  },
};
