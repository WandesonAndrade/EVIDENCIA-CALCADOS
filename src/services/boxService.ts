import { db } from "../lib/firebase.js";
import { collection, doc, getDocs, setDoc, deleteDoc, updateDoc, query, orderBy } from "firebase/firestore";

export interface IShippingBox {
  id: string;
  name: string;
  height: number; // cm
  width: number;  // cm
  length: number; // cm
  weight: number; // kg (peso bruto da embalagem com o calçado)
  isDefault?: boolean;
  createdAt?: number;
}

export interface IFreightDifferenceAudit {
  id: string;
  productId: string;
  productName: string;
  postalCode: string;
  serviceName: string;
  companyName: string;
  defaultBoxId: string;
  defaultBoxName: string;
  selectedBoxId: string;
  selectedBoxName: string;
  selectedBoxDimensions: string;
  clientFreightPrice: number;
  storeFreightPrice: number;
  difference: number; // storeFreightPrice - clientFreightPrice (positivo = custo extra para a loja, negativo = economia para a loja)
  updatedAt: string;
}

export const INITIAL_SHIPPING_BOXES: IShippingBox[] = [
  {
    id: "box-tenis-padrao",
    name: "Caixa Padrão Evidência (Tênis / Sapatos)",
    height: 12,
    width: 20,
    length: 30,
    weight: 0.8,
    isDefault: true,
    createdAt: Date.now(),
  },
  {
    id: "box-rasteirinha",
    name: "Caixa Compacta (Rasteirinhas / Sapatilhas)",
    height: 10,
    width: 15,
    length: 28,
    weight: 0.5,
    isDefault: false,
    createdAt: Date.now() - 1000,
  },
  {
    id: "box-botas-cano-alto",
    name: "Caixa Grande (Botas / Cano Alto / 2 Pares)",
    height: 16,
    width: 26,
    length: 36,
    weight: 1.4,
    isDefault: false,
    createdAt: Date.now() - 2000,
  },
];

const COLLECTION_NAME = "shipping_boxes";

export const boxService = {
  /**
   * Busca todas as caixas cadastradas no Firestore (ou retorna as predefinições iniciais se o Firestore estiver vazio/offline)
   */
  async getShippingBoxes(): Promise<IShippingBox[]> {
    try {
      if (!db) return INITIAL_SHIPPING_BOXES;

      const colRef = collection(db, COLLECTION_NAME);
      const snapshot = await getDocs(colRef);

      if (snapshot.empty) {
        // Se a coleção estiver vazia, grava os padrões iniciais no Firestore
        await this.initializeDefaultBoxes();
        return INITIAL_SHIPPING_BOXES;
      }

      const boxes: IShippingBox[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as IShippingBox[];

      return boxes.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
    } catch (err) {
      console.warn("📌 [boxService] Erro ao buscar caixas no Firestore, utilizando predefinições em memória:", err);
      return INITIAL_SHIPPING_BOXES;
    }
  },

  /**
   * Inicializa caixas padrões no Firestore
   */
  async initializeDefaultBoxes(): Promise<void> {
    try {
      if (!db) return;
      for (const box of INITIAL_SHIPPING_BOXES) {
        await setDoc(doc(db, COLLECTION_NAME, box.id), box);
      }
    } catch (err) {
      console.warn("📌 [boxService] Não foi possível inicializar caixas no Firestore:", err);
    }
  },

  /**
   * Retorna a caixa definida como padrão (ou a primeira caixa disponível)
   */
  async getDefaultBox(): Promise<IShippingBox> {
    const boxes = await this.getShippingBoxes();
    const defaultBox = boxes.find((b) => b.isDefault);
    return defaultBox || boxes[0] || INITIAL_SHIPPING_BOXES[0];
  },

  /**
   * Salva ou atualiza uma caixa no Firestore
   */
  async saveShippingBox(boxData: Omit<IShippingBox, "id"> & { id?: string }): Promise<IShippingBox> {
    const id = boxData.id || `box_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newBox: IShippingBox = {
      ...boxData,
      id,
      height: Number(boxData.height) || 12,
      width: Number(boxData.width) || 20,
      length: Number(boxData.length) || 30,
      weight: Number(boxData.weight) || 0.8,
      isDefault: Boolean(boxData.isDefault),
      createdAt: boxData.createdAt || Date.now(),
    };

    if (db) {
      // Se a nova caixa for marcada como padrão, remove o padrão de todas as outras
      if (newBox.isDefault) {
        await this.unsetOtherDefaults(id);
      }
      await setDoc(doc(db, COLLECTION_NAME, id), newBox, { merge: true });
    }

    return newBox;
  },

  /**
   * Define uma caixa específica como padrão e desmarca as outras
   */
  async setDefaultBox(boxId: string): Promise<void> {
    const boxes = await this.getShippingBoxes();
    for (const b of boxes) {
      const isTarget = b.id === boxId;
      if (b.isDefault !== isTarget && db) {
        await updateDoc(doc(db, COLLECTION_NAME, b.id), { isDefault: isTarget });
      }
    }
  },

  /**
   * Remove o status de padrão das outras caixas
   */
  async unsetOtherDefaults(targetId: string): Promise<void> {
    if (!db) return;
    const boxes = await this.getShippingBoxes();
    for (const b of boxes) {
      if (b.id !== targetId && b.isDefault) {
        await updateDoc(doc(db, COLLECTION_NAME, b.id), { isDefault: false });
      }
    }
  },

  /**
   * Exclui uma caixa do Firestore
   */
  async deleteShippingBox(boxId: string): Promise<void> {
    if (!db) return;
    await deleteDoc(doc(db, COLLECTION_NAME, boxId));
  },

  /**
   * Sugere automaticamente a caixa ideal com base nas características do produto
   * (Bota / Cano Alto / Mala -> Caixa Grande; Rasteirinha / Sapatilha / Chinelo -> Caixa Compacta; Demais -> Caixa Padrão)
   */
  suggestBoxForProduct(
    product: any,
    availableBoxes: IShippingBox[] = INITIAL_SHIPPING_BOXES
  ): { box: IShippingBox; reason: string } {
    const boxes = availableBoxes.length > 0 ? availableBoxes : INITIAL_SHIPPING_BOXES;
    const defaultBox = boxes.find((b) => b.isDefault) || boxes[0] || INITIAL_SHIPPING_BOXES[0];

    const compactBox =
      boxes.find((b) => b.id === "box-rasteirinha" || b.name.toLowerCase().includes("compacta") || b.name.toLowerCase().includes("rasteir")) ||
      [...boxes].sort((a, b) => a.weight - b.weight)[0] ||
      defaultBox;

    const largeBox =
      boxes.find((b) => b.id === "box-botas-cano-alto" || b.name.toLowerCase().includes("grande") || b.name.toLowerCase().includes("bota")) ||
      [...boxes].sort((a, b) => b.weight - a.weight)[0] ||
      defaultBox;

    if (!product) {
      return { box: defaultBox, reason: "Embalagem Padrão da Loja" };
    }

    const textToInspect = [
      product.name,
      product.nome,
      product.descricao,
      product.category,
      product.categoria,
      product.subcategory,
      product.subcategoria,
      product.nome_subgrupo,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (/\b(bota|botas|coturno|cano alto|galocha|mala|mochila|kit)\b/.test(textToInspect)) {
      return {
        box: largeBox,
        reason: "Produto volumoso (Bota / Cano Alto / Mochila) — sugerida Caixa Grande",
      };
    }

    if (/\b(rasteir|sapatilha|chinelo|slide|papete|tamanco|infantil|bebe|carteira|cinto|meia)\b/.test(textToInspect)) {
      return {
        box: compactBox,
        reason: "Calçado compacto/leve (Rasteirinha / Sapatilha / Chinelo) — sugerida Caixa Compacta",
      };
    }

    return {
      box: defaultBox,
      reason: "Calçado padrão (Tênis / Sapato / Sandália) — sugerida Caixa Padrão da Loja",
    };
  },

  /**
   * Retorna a embalagem efetiva de um produto (respeita shippingBoxId salvo no produto; caso não tenha, retorna a caixa padrão da loja)
   */
  resolveProductBox(
    product: any,
    availableBoxes: IShippingBox[] = INITIAL_SHIPPING_BOXES,
    useDefaultForStorefront = true
  ): IShippingBox {
    const boxes = availableBoxes.length > 0 ? availableBoxes : INITIAL_SHIPPING_BOXES;
    const defaultBox = boxes.find((b) => b.isDefault) || boxes[0] || INITIAL_SHIPPING_BOXES[0];

    if (product?.shippingBoxId) {
      const matched = boxes.find((b) => b.id === product.shippingBoxId);
      if (matched) return matched;
    }

    if (useDefaultForStorefront) {
      return defaultBox;
    }

    return this.suggestBoxForProduct(product, boxes).box;
  },

  /**
   * Sugere a embalagem para um pedido ou carrinho com base na quantidade de itens e nos produtos
   */
  suggestBoxForOrderItems(
    items: Array<{ name?: string; quantity?: number; product?: any }>,
    availableBoxes: IShippingBox[] = INITIAL_SHIPPING_BOXES,
    catalogProducts: any[] = []
  ): { box: IShippingBox; reason: string } {
    const boxes = availableBoxes.length > 0 ? availableBoxes : INITIAL_SHIPPING_BOXES;
    const defaultBox = boxes.find((b) => b.isDefault) || boxes[0] || INITIAL_SHIPPING_BOXES[0];
    const largeBox =
      boxes.find((b) => b.id === "box-botas-cano-alto" || b.name.toLowerCase().includes("grande") || b.name.toLowerCase().includes("bota")) ||
      [...boxes].sort((a, b) => b.weight - a.weight)[0] ||
      defaultBox;

    const totalQty = (items || []).reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);

    if (totalQty >= 2) {
      return {
        box: largeBox,
        reason: `Pedido com ${totalQty} itens/pares — sugerida Caixa Grande`,
      };
    }

    const firstItem = items?.[0];
    if (firstItem) {
      const prod =
        firstItem.product ||
        catalogProducts.find(
          (p) =>
            String(p.id) === String((firstItem as any).productId) ||
            String(p.moblinkId) === String((firstItem as any).productId)
        ) ||
        { name: firstItem.name };

      if (prod?.shippingBoxId) {
        const savedBox = boxes.find((b) => b.id === prod.shippingBoxId);
        if (savedBox) {
          return {
            box: savedBox,
            reason: `Embalagem vinculada ao cadastro do produto (${savedBox.name})`,
          };
        }
      }

      return this.suggestBoxForProduct(prod, boxes);
    }

    return { box: defaultBox, reason: "Embalagem Padrão da Loja" };
  },

  /**
   * Registra no banco/localStorage a diferença de frete (Cliente vs Loja) quando uma embalagem é alterada e recalculada,
   * permitindo que o comparativo fique visível apenas no Painel Admin.
   */
  async saveFreightDifferenceAudit(audit: Omit<IFreightDifferenceAudit, "id" | "updatedAt">): Promise<IFreightDifferenceAudit> {
    const id = `audit_${audit.productId}_${audit.postalCode.replace(/\D/g, "")}`;
    const record: IFreightDifferenceAudit = {
      ...audit,
      id,
      updatedAt: new Date().toISOString(),
    };

    try {
      const raw = localStorage.getItem("evidencia_freight_diff_audits");
      const list: IFreightDifferenceAudit[] = raw ? JSON.parse(raw) : [];
      const filtered = list.filter((item) => item.id !== id && item.productId !== audit.productId);
      filtered.unshift(record);
      localStorage.setItem("evidencia_freight_diff_audits", JSON.stringify(filtered.slice(0, 50)));
    } catch {
      // ignore storage errors
    }

    try {
      if (db) {
        await setDoc(doc(db, "shipping_freight_audits", id), record, { merge: true });
      }
    } catch (err) {
      console.warn("📌 [boxService] Erro ao salvar auditoria de diferença de frete no Firestore:", err);
    }

    return record;
  },

  /**
   * Lista os registros de diferença de frete (Cliente vs Loja) para exibição exclusiva no Painel Admin
   */
  async getFreightDifferenceAudits(): Promise<IFreightDifferenceAudit[]> {
    let localList: IFreightDifferenceAudit[] = [];
    try {
      const raw = localStorage.getItem("evidencia_freight_diff_audits");
      if (raw) localList = JSON.parse(raw);
    } catch {
      // ignore
    }

    try {
      if (!db) return localList;
      const snapshot = await getDocs(collection(db, "shipping_freight_audits"));
      if (snapshot.empty) return localList;

      const remoteList = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as IFreightDifferenceAudit[];

      const mergedMap = new Map<string, IFreightDifferenceAudit>();
      [...localList, ...remoteList].forEach((item) => {
        mergedMap.set(item.id, item);
      });

      return Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    } catch {
      return localList;
    }
  }
};
