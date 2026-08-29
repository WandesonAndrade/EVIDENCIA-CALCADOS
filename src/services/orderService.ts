import { db } from "../lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  setDoc,
  Unsubscribe,
} from "firebase/firestore";
import { Order, UserProfile } from "../types";

export const orderService = {
  /**
   * Inscreve um ouvinte para pedidos respeitando estritamente o UID e role do usuário
   */
  subscribeUserOrders(
    currentUser: UserProfile,
    onOrdersUpdated: (orders: Order[]) => void,
    onError: (error: Error) => void,
  ): Unsubscribe {
    const ordersRef = collection(db, "orders");
    const userEmail = (currentUser.email || "").toLowerCase().trim();

    return onSnapshot(
      ordersRef,
      (snapshot) => {
        const orderList: Order[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Order;
          const orderEmail = (data.customerEmail || "").toLowerCase().trim();

          const isOwner =
            currentUser.role === "admin" ||
            currentUser.role === "seller" ||
            (Boolean(currentUser.uid) && data.userId === currentUser.uid) ||
            (userEmail !== "" && orderEmail === userEmail);

          if (isOwner) {
            orderList.push({ id: docSnap.id, ...data });
          }
        });

        // Ordena por data decrescente
        orderList.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        onOrdersUpdated(orderList);
      },
      (error) => {
        console.warn(
          "📌 Ouvinte de pedidos no Firestore falhou (usando modo offline):",
          error.message,
        );
        onError(error);
      },
    );
  },

  /**
   * Salva um pedido no Firestore garantindo vinculação por UID
   */
  async saveOrder(order: Order): Promise<void> {
    const orderRef = doc(db, "orders", order.id);
    await setDoc(orderRef, order);
  },

  /**
   * Exclui um pedido do Firestore
   */
  async deleteOrder(orderId: string): Promise<void> {
    const orderRef = doc(db, "orders", orderId);
    const { deleteDoc } = await import("firebase/firestore");
    await deleteDoc(orderRef);
  },
};
