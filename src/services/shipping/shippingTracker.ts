import { db } from "../../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { Order, OrderStatus } from "../../types";
import { IMetricDivergence, ITrackingEvent } from "./shippingProvider.interface";

export interface ITrackingSyncResult {
  updated: boolean;
  newStatus?: OrderStatus;
  labelStatus?: string;
  statusText?: string;
  eventsCount?: number;
  events?: ITrackingEvent[];
  metricDivergence?: IMetricDivergence;
  trackingCode?: string;
}

export class ShippingTrackerService {
  /**
   * Consulta o rastreamento do código informado via API backend
   * e atualiza automaticamente o status e eventos do pedido no Firestore conforme a régua de 4 etapas.
   */
  public static async syncOrderTracking(
    orderId: string,
    trackingCode?: string,
    shipmentId?: string
  ): Promise<ITrackingSyncResult> {
    const code = (trackingCode || "").trim();
    const sId = (shipmentId || "").trim();

    if (!code && !sId) {
      return { updated: false };
    }

    try {
      const response = await fetch("/api/shipping/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingCode: code || undefined,
          shipmentId: sId || undefined,
          orderId,
        }),
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
      let labelStatus: string | undefined;

      if (tracking.status === "delivered") {
        newStatus = "Entregue"; // Avança para a Etapa 5 da Régua ("Entregue ao Cliente")
        labelStatus = "entregue";
      } else if (tracking.status === "in_transit" || tracking.status === "posted") {
        // Quando a transportadora registra postagem na agência ou trânsito, avança para Etapa 4
        newStatus = "Em Trânsito"; // Avança para a Etapa 4 da Régua ("Em Trânsito")
        labelStatus = tracking.status === "posted" ? "postado" : "em_transito";
      } else if (tracking.status === "pending") {
        // Etiqueta liberada/gerada pronta para postagem (Etapa 3 da Régua)
        newStatus = "Em Preparação";
        labelStatus = "gerada";
      } else if (tracking.status === "canceled") {
        newStatus = "Cancelado";
        labelStatus = "cancelada";
      } else {
        labelStatus = tracking.status || "pendente";
      }

      if (db && orderId) {
        const orderRef = doc(db, "orders", orderId);
        const updates: Record<string, any> = {
          lastTrackingCheck: new Date().toISOString(),
          trackingEvents: tracking.events || [],
        };

        if (newStatus) {
          updates.status = newStatus;
        }
        if (labelStatus) {
          updates.labelStatus = labelStatus;
        }
        if (tracking.metricDivergence) {
          updates.metricDivergence = tracking.metricDivergence;
        }
        if (tracking.trackingCode && tracking.trackingCode !== code) {
          updates.trackingCode = tracking.trackingCode;
        }

        await updateDoc(orderRef, updates);
      }

      console.log(`📦 [ShippingTracker] Pedido ${orderId} (${code || sId}) atualizado com sucesso:`, {
        orderId,
        trackingCode: tracking.trackingCode || code,
        newStatus: newStatus || "Status inalterado",
        statusText: tracking.statusText,
        eventsCount: tracking.events?.length || 0,
        events: tracking.events || [],
        metricDivergence: tracking.metricDivergence,
        dadosCompletosDaApi: tracking.rawResponse || tracking,
      });

      return {
        updated: true,
        newStatus,
        labelStatus,
        statusText: tracking.statusText,
        eventsCount: tracking.events?.length || 0,
        events: tracking.events || [],
        metricDivergence: tracking.metricDivergence,
        trackingCode: tracking.trackingCode || code,
      };
    } catch (err) {
      console.warn("[ShippingTrackerService] Erro ao sincronizar rastreamento:", err);
      return { updated: false };
    }
  }

  /**
   * Sincroniza em lote os pedidos pendentes com código de rastreio ou melhorEnvioId ao entrar na tela (Cliente ou Admin).
   * Aplica throttle para não sobrecarregar requisições nem ultrapassar cotas da API.
   */
  public static async syncPendingOrders(
    orders: Array<Pick<Order, "id" | "trackingCode" | "melhorEnvioId" | "status" | "lastTrackingCheck">>,
    minIntervalMinutes = 2
  ): Promise<number> {
    if (!orders || orders.length === 0) return 0;

    const now = Date.now();
    const minIntervalMs = minIntervalMinutes * 60 * 1000;

    // Filtra pedidos elegíveis: com trackingCode ou melhorEnvioId, não finalizados e que não foram checados recentemente
    const eligibleOrders = orders.filter((o) => {
      const hasCode = !!(o.trackingCode && o.trackingCode.trim());
      const hasMeId = !!(o.melhorEnvioId && o.melhorEnvioId.trim());
      if (!hasCode && !hasMeId) return false;
      if (o.status === "Entregue" || o.status === "Cancelado") return false;

      if (o.lastTrackingCheck) {
        const lastCheckTime = new Date(o.lastTrackingCheck).getTime();
        if (!isNaN(lastCheckTime) && now - lastCheckTime < minIntervalMs) {
          return false; // Verificado recentemente, economiza requisições
        }
      }
      return true;
    });

    let count = 0;
    for (const order of eligibleOrders) {
      try {
        await this.syncOrderTracking(order.id, order.trackingCode, order.melhorEnvioId);
        count++;
        // Pequena pausa entre requisições para evitar burst
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (e) {
        console.warn(`[ShippingTrackerService] Falha ao sincronizar pedido ${order.id}:`, e);
      }
    }

    return count;
  }
}
