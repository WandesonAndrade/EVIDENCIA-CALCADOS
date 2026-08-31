import { db } from "../../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { OrderStatus } from "../../types";

export interface ITrackingSyncResult {
  updated: boolean;
  newStatus?: OrderStatus;
  statusText?: string;
  eventsCount?: number;
}

export class ShippingTrackerService {
  /**
   * Consulta o rastreamento do código informado via API backend
   * e atualiza automaticamente o status do pedido no Firestore conforme a régua de 4 etapas.
   */
  public static async syncOrderTracking(orderId: string, trackingCode: string): Promise<ITrackingSyncResult> {
    if (!trackingCode) {
      return { updated: false };
    }

    try {
      const response = await fetch("/api/shipping/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingCode }),
      });

      if (!response.ok) {
        return { updated: false };
      }

      const data = await response.json();
      const tracking = data.tracking;

      if (!tracking || !tracking.status) {
        return { updated: false };
      }

      let newStatus: OrderStatus | undefined;
      let labelStatus = "em_transito";

      if (tracking.status === "delivered") {
        newStatus = "Entregue"; // Avança para a Etapa 4 da Régua
        labelStatus = "entregue";
      } else if (tracking.status === "posted" || tracking.status === "in_transit") {
        newStatus = "Em Preparação"; // Avança para a Etapa 3 da Régua
        labelStatus = "em_transito";
      } else if (tracking.status === "canceled") {
        newStatus = "Cancelado";
        labelStatus = "cancelada";
      }

      if (newStatus && db && orderId) {
        const orderRef = doc(db, "orders", orderId);
        await updateDoc(orderRef, {
          status: newStatus,
          labelStatus,
          lastTrackingCheck: new Date().toISOString(),
          trackingEvents: tracking.events || [],
        });
      }

      return {
        updated: true,
        newStatus,
        statusText: tracking.statusText,
        eventsCount: tracking.events?.length || 0,
      };
    } catch (err) {
      console.warn("[ShippingTrackerService] Erro ao sincronizar rastreamento:", err);
      return { updated: false };
    }
  }
}
