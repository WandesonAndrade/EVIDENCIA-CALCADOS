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
  if (clean.includes("INFANTL MASC") || clean.includes("INFANTIL MASC") || clean === "INF MASC") return "Infantil Masculino";
  if (clean.includes("INFANTL FEM") || clean.includes("INFANTIL FEM") || clean === "INF FEM") return "Infantil Feminino";

  // Tratamento Especial para Perfumaria / Fragrâncias / Cosméticos
  if (clean.includes("PERFUM") || clean.includes("COLONIA") || clean.includes("COLÔNIA") || clean.includes("FRAGRANC") || clean.includes("FRAGRÂNC")) {
    if (clean.includes("FEMININ") || clean.includes("FEM")) return "Feminino";
    if (clean.includes("MASCULIN") || clean.includes("MASC")) return "Masculino";
    if (clean.includes("INFANT") || clean.includes("KID") || clean.includes("BEBE") || clean.includes("BEBÊ")) return "Infantil";
    if (clean.includes("UNISSEX") || clean.includes("UNISEX")) return "Unissex";
    if (clean.includes("COLONIA") || clean.includes("COLÔNIA")) return "Colônias";
    if (clean.includes("BODY SPLASH")) return "Body Splash";
    if (clean.includes("KIT") || clean.includes("PRESENT")) return "Kits & Presentes";
    return "Perfumes";
  }

  if (clean.includes("COSMETICO") || clean.includes("COSMÉTICO") || clean.includes("COSMETIC")) return "Cosméticos";
  if (clean.includes("BODY SPLASH")) return "Body Splash";
  if (clean.includes("COLONIA") || clean.includes("COLÔNIA")) return "Colônias";

  if (clean === "MASCULINO" || clean === "MASC") return "Masculino";
  if (clean === "FEMININO" || clean === "FEM") return "Feminino";
  if (clean.includes("CONFECOES") || clean.includes("CONFECCOES") || clean.includes("CONFECÇ")) return "Confecções";
  if (clean.includes("CALCADO") || clean.includes("CALÇADO")) return "Calçados";
  if (clean.includes("ACESSORIO") || clean.includes("ACESSÓRIO")) return "Acessórios";
  if (clean.includes("PROMOCOES") || clean.includes("PROMOÇÃO")) return "Promoções";
  if (clean.includes("SAPATILHA") || clean.includes("SAPATILHAS")) return "Sapatilhas";
  if (clean.includes("SANDALIA") || clean.includes("SANDÁLIA") || clean.includes("SANDALIAS") || clean.includes("SANDÁLIAS")) return "Sandálias";
  if (clean.includes("SAPATENIS") || clean.includes("SAPATÊNIS")) return "Sapatênis";
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

  if (targetNorm === "PERFUMES" || targetClean.includes("PERFUM") || targetClean.includes("COSMET") || targetClean.includes("COLONIA")) {
    return (
      cat.includes("PERFUM") || cat.includes("COSMET") ||
      grupo.includes("PERFUM") || grupo.includes("COSMET") ||
      rawCat.includes("PERFUM") || rawGrupo.includes("PERFUM") || rawSubgrupo.includes("PERFUM") ||
      rawCat.includes("COSMET") || rawGrupo.includes("COSMET") || rawSubgrupo.includes("COSMET") ||
      rawCat.includes("COLONIA") || rawGrupo.includes("COLONIA") ||
      name.includes("PERFUME") || name.includes("COLONIA") || name.includes("COLÔNIA") || name.includes("FRAGRANC") || name.includes("BODY SPLASH")
    );
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

export interface ResolvedClassificacao {
  category: string;
  subcategory: string;
  nome_grupo: string;
  nome_subgrupo: string;
  isInvalid?: boolean;
}

export const classificacaoIndex = new Map<string, ResolvedClassificacao>();

// Mapeamento pré-populado básico para códigos numéricos de grupos macro do ERP MobLink
// (Apenas grupos pai conhecidos. Subcategorias NUNCA são hardcoded, devendo vir da árvore oficial da loja ou do MobLink).
const defaultClassificacaoEntries: [string, ResolvedClassificacao][] = [
  ["001", { category: "Calçados", subcategory: "", nome_grupo: "Calçados", nome_subgrupo: "" }],
  ["002", { category: "Calçados", subcategory: "", nome_grupo: "Calçados", nome_subgrupo: "" }],
  ["003", { category: "Confecções", subcategory: "", nome_grupo: "Confecções", nome_subgrupo: "" }],
  ["004", { category: "Acessórios", subcategory: "", nome_grupo: "Acessórios", nome_subgrupo: "" }],
  ["005", { category: "Cosméticos", subcategory: "", nome_grupo: "Cosméticos", nome_subgrupo: "" }],
  ["006", { category: "Perfumes", subcategory: "", nome_grupo: "Perfumes", nome_subgrupo: "" }],
  ["007", { category: "Escolar", subcategory: "", nome_grupo: "Escolar", nome_subgrupo: "" }],
  ["008", { category: "Itens de Viagem", subcategory: "", nome_grupo: "Itens de Viagem", nome_subgrupo: "" }],
  // Equivalentes sem zeros à esquerda
  ["1", { category: "Calçados", subcategory: "", nome_grupo: "Calçados", nome_subgrupo: "" }],
  ["2", { category: "Calçados", subcategory: "", nome_grupo: "Calçados", nome_subgrupo: "" }],
  ["3", { category: "Confecções", subcategory: "", nome_grupo: "Confecções", nome_subgrupo: "" }],
  ["4", { category: "Acessórios", subcategory: "", nome_grupo: "Acessórios", nome_subgrupo: "" }],
  ["5", { category: "Cosméticos", subcategory: "", nome_grupo: "Cosméticos", nome_subgrupo: "" }],
  ["6", { category: "Perfumes", subcategory: "", nome_grupo: "Perfumes", nome_subgrupo: "" }],
  ["7", { category: "Escolar", subcategory: "", nome_grupo: "Escolar", nome_subgrupo: "" }],
  ["8", { category: "Itens de Viagem", subcategory: "", nome_grupo: "Itens de Viagem", nome_subgrupo: "" }],
];

defaultClassificacaoEntries.forEach(([k, v]) => classificacaoIndex.set(k, v));

export const moblinkCategoriesService = {
  /**
   * Alimenta e atualiza o índice de classificação com base na árvore oficial de categorias da loja.
   */
  updateIndexFromStoreCategories(categories: Category[]) {
    if (!Array.isArray(categories) || categories.length === 0) return;

    categories.forEach((cat) => {
      if (!cat || !cat.name) return;
      const catName = normalizeCategoryName(cat.name);
      const catCode = String(cat.code || cat.id || "").trim();

      if (catCode) {
        const groupEntry: ResolvedClassificacao = {
          category: catName,
          subcategory: "",
          nome_grupo: catName,
          nome_subgrupo: "",
          isInvalid: false,
        };
        classificacaoIndex.set(catCode, groupEntry);
        const unpaddedCode = catCode.replace(/^0+/, "");
        if (unpaddedCode && unpaddedCode !== catCode) {
          classificacaoIndex.set(unpaddedCode, groupEntry);
        }
      }

      if (Array.isArray(cat.subcategories)) {
        cat.subcategories.forEach((sub) => {
          if (!sub || !sub.name) return;
          const subName = normalizeSubcategoryName(sub.name);
          const subId = String(sub.id || "").trim();
          const subCode = String(sub.subCode || "").trim();

          const subEntry: ResolvedClassificacao = {
            category: catName,
            subcategory: subName,
            nome_grupo: catName,
            nome_subgrupo: subName,
            isInvalid: false,
          };

          if (subId) {
            classificacaoIndex.set(subId, subEntry);
            const parts = subId.split(".");
            if (parts.length === 2) {
              const unpaddedSubId = `${parts[0].replace(/^0+/, "")}.${parts[1].replace(/^0+/, "")}`;
              classificacaoIndex.set(unpaddedSubId, subEntry);
            }
          }

          if (catCode && subCode) {
            const combinedCode = `${catCode}.${subCode}`;
            classificacaoIndex.set(combinedCode, subEntry);
            const unpaddedCombined = `${catCode.replace(/^0+/, "")}.${subCode.replace(/^0+/, "")}`;
            classificacaoIndex.set(unpaddedCombined, subEntry);
          }
        });
      }
    });
  },

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
   * Verifica se um código de classificação é reconhecido na loja.
   */
  isClassificacaoValid(code: string | number | undefined, storeCategories?: Category[]): boolean {
    if (!code) return true;
    const resolved = this.resolveClassificacao(code, storeCategories);
    return !resolved.isInvalid;
  },

  /**
   * Resolve e traduz o código numérico de classificação do ERP MobLink para nomes limpos e padronizados.
   * Quando o código não existe na árvore de categorias da loja, sinaliza como 'Classificação Inválida'.
   */
  resolveClassificacao(
    code: string | number | undefined,
    storeCategories?: Category[],
  ): ResolvedClassificacao {
    if (storeCategories && storeCategories.length > 0) {
      this.updateIndexFromStoreCategories(storeCategories);
    }

    if (!code) {
      return {
        category: "Calçados",
        subcategory: "",
        nome_grupo: "Calçados",
        nome_subgrupo: "",
        isInvalid: false,
      };
    }

    const key = String(code).trim();
    if (!key) {
      return {
        category: "Calçados",
        subcategory: "",
        nome_grupo: "Calçados",
        nome_subgrupo: "",
        isInvalid: false,
      };
    }

    // 1. Tenta correspondência exata no índice dinâmico
    if (classificacaoIndex.has(key)) {
      return { ...classificacaoIndex.get(key)!, isInvalid: false };
    }

    // 2. Tenta com padding de 3 dígitos (ex: "1.1" -> "001.001", "1" -> "001")
    const parts = key.split(".");
    const paddedCode = parts.map((p) => p.padStart(3, "0")).join(".");
    if (classificacaoIndex.has(paddedCode)) {
      return { ...classificacaoIndex.get(paddedCode)!, isInvalid: false };
    }

    // 3. Tenta sem padding (ex: "001.001" -> "1.1")
    const unpaddedCode = parts.map((p) => p.replace(/^0+/, "") || "0").join(".");
    if (classificacaoIndex.has(unpaddedCode)) {
      return { ...classificacaoIndex.get(unpaddedCode)!, isInvalid: false };
    }

    // 4. Tenta pelo código do grupo pai
    const parentCode = parts[0];
    const parentEntry =
      classificacaoIndex.get(parentCode) ||
      classificacaoIndex.get(parentCode.padStart(3, "0")) ||
      classificacaoIndex.get(parentCode.replace(/^0+/, ""));

    if (parentEntry) {
      // O grupo pai é válido, mas se o código tinha subcódigo (ex: "001.999") e não foi achado na loja,
      // a subcategoria é inválida / não mapeada na árvore da loja!
      if (parts.length > 1 && parts[1]) {
        return {
          category: parentEntry.category,
          subcategory: "Classificação Inválida",
          nome_grupo: parentEntry.nome_grupo,
          nome_subgrupo: "Classificação Inválida",
          isInvalid: true,
        };
      }
      return { ...parentEntry, isInvalid: false };
    }

    // 5. Código completamente desconhecido na loja
    return {
      category: "Classificação Inválida",
      subcategory: "Classificação Inválida",
      nome_grupo: "Classificação Inválida",
      nome_subgrupo: "Classificação Inválida",
      isInvalid: true,
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
