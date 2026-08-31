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
  }
};
