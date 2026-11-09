/**
 * Implementação do Adapter para o Melhor Envio.
 * Envelopa os serviços de autenticação, localização, cotação, gestão de etiquetas e rastreamento conforme a interface IShippingProvider.
 */
import {
  IShippingProvider,
  IShippingAuthResponse,
  IAddressLocation,
  IShippingCalculatePayload,
  IShippingOption,
  IShippingBoxDimensions,
  ICreateLabelPayload,
  ILabelResult,
  IContactAddressPayload,
  ITrackingStatusResult,
  ITrackingEvent,
  IShippingWebhookResult,
  IMetricDivergence,
} from "../../shippingProvider.interface.js";
import { MelhorEnvioAuth } from "./melhorEnvioAuth.js";
import { getMelhorEnvioConfig } from "./melhorEnvioConfig.js";
import { getUfFromCep } from "../../../../utils/cepUf.js";
import { isUrbanCaxias } from "../../../../utils/localDelivery.js";

// CEP de Origem padrão da Loja Evidência Calçados (Caxias - MA)
const DEFAULT_ORIGIN_CEP = "65600060";

// Dados padrão do Remetente (Loja Evidência Calçados)
const DEFAULT_FROM_ADDRESS: IContactAddressPayload = {
  name: "Evidência Calçados",
  phone: "99984684867",
  email: "wandesonandrade33@gmail.com",
  document: "60997831000101",
  company_document: "60997831000101",
  address: "Rua Afonso Pena",
  number: "295",
  district: "Centro",
  city: "Caxias",
  state_abbr: "MA",
  postal_code: "65600060",
};

// Caixa padrão de sapatos (30 x 20 x 12 cm, 0.8 kg)
const DEFAULT_BOX: IShippingBoxDimensions = {
  height: 12,
  width: 20,
  length: 30,
  weight: 0.8,
};

export class MelhorEnvioAdapter implements IShippingProvider {
  public readonly providerName = "melhorenvio";
  private authService: MelhorEnvioAuth;

  constructor(customAuth?: MelhorEnvioAuth) {
    this.authService = customAuth || new MelhorEnvioAuth();
  }

  public get environment(): "sandbox" | "production" {
    return getMelhorEnvioConfig().environment;
  }

  public async getAuthHeaders(): Promise<Record<string, string>> {
    return this.authService.getAuthHeaders();
  }

  public async isAuthenticated(): Promise<boolean> {
    return this.authService.isAuthenticated();
  }

  public async refreshToken(): Promise<IShippingAuthResponse> {
    const token = await this.authService.getValidToken();
    return {
      accessToken: token,
      tokenType: "Bearer",
    };
  }

  public getAuthService(): MelhorEnvioAuth {
    return this.authService;
  }

  /**
   * Validação estrita dos dados do destinatário antes da compra de etiqueta
   */
  private validateRecipient(to: IContactAddressPayload): void {
    const missing: string[] = [];

    if (!to.name || to.name.trim().length < 2) missing.push("Nome completo");

    const docClean = (to.document || "").replace(/\D/g, "");
    if (!docClean || (docClean.length !== 11 && docClean.length !== 14)) {
      missing.push("CPF ou CNPJ válido");
    }

    const phoneClean = (to.phone || "").replace(/\D/g, "");
    if (!phoneClean || phoneClean.length < 10) {
      missing.push("Telefone com DDD");
    }

    const cepClean = (to.postal_code || "").replace(/\D/g, "");
    if (!cepClean || cepClean.length !== 8) {
      missing.push("CEP válido com 8 dígitos");
    }

    if (!to.address || to.address.trim().length < 2) missing.push("Logradouro (Rua/Avenida)");
    if (!to.number || to.number.trim().length === 0) missing.push("Número");
    if (!to.district || to.district.trim().length < 2) missing.push("Bairro");
    if (!to.city || to.city.trim().length < 2) missing.push("Cidade");
    if (!to.state_abbr || to.state_abbr.trim().length !== 2) missing.push("UF (Estado)");

    if (missing.length > 0) {
      throw new Error(
        `Dados incompletos do destinatário para emissão da etiqueta: ${missing.join(", ")}. Por favor, complete o cadastro do cliente.`
      );
    }
  }

  /**
   * Consulta um CEP na API do Melhor Envio
   */
  public async fetchAddressByCep(postalCode: string): Promise<IAddressLocation | null> {
    const cleanCep = postalCode.replace(/\D/g, "");
    if (cleanCep.length !== 8) return null;

    const config = getMelhorEnvioConfig();
    const headers = await this.getAuthHeaders();

    try {
      const response = await fetch(`${config.baseUrl}/api/v2/me/shipment/location/postal-code`, {
        method: "POST",
        headers,
        body: JSON.stringify({ postal_code: cleanCep }),
      });

      if (!response.ok) {
        const altResponse = await fetch(`${config.baseUrl}/api/v2/me/shipment/location/postal-code?postal_code=${cleanCep}`, {
          method: "GET",
          headers,
        });
        if (!altResponse.ok) return null;
        const altData = await altResponse.json();
        return this.normalizeAddressData(cleanCep, altData);
      }

      const data = await response.json();
      return this.normalizeAddressData(cleanCep, data);
    } catch (err: any) {
      console.warn("[MelhorEnvioAdapter] Falha na API de CEP do Melhor Envio:", err?.message || err);
      return null;
    }
  }

  /**
   * Realiza a cotação de frete no Melhor Envio (POST /api/v2/me/shipment/calculate)
   */
  public async calculateShipping(payload: IShippingCalculatePayload): Promise<IShippingOption[]> {
    const fromCep = (payload.fromPostalCode || DEFAULT_ORIGIN_CEP).replace(/\D/g, "");
    const toCep = payload.toPostalCode.replace(/\D/g, "");
    const box = payload.box || DEFAULT_BOX;
    const config = getMelhorEnvioConfig();

    if (toCep.length !== 8) {
      if (config.environment === "production") {
        throw new Error("CEP de destino inválido. Deve conter 8 dígitos.");
      }
      return this.getFallbackOptions("01001000", box, payload.cartTotal);
    }

    try {
      const headers = await this.getAuthHeaders();

      const requestBody: any = {
        from: { postal_code: fromCep },
        to: { postal_code: toCep },
        package: {
          height: Math.max(Number(box.height) || 12, 1),
          width: Math.max(Number(box.width) || 20, 1),
          length: Math.max(Number(box.length) || 30, 1),
          weight: Math.max(Number(box.weight) || 0.8, 0.1),
        },
      };

      if (payload.insuranceValue && payload.insuranceValue > 0) {
        requestBody.options = {
          insurance_value: Number(payload.insuranceValue),
        };
      }

      const response = await fetch(`${config.baseUrl}/api/v2/me/shipment/calculate`, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        if (config.environment === "production") {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.message || errData.error || `HTTP ${response.status}`;
          throw new Error(`Cotação oficial de frete indisponível no Melhor Envio (${errMsg}).`);
        }
        console.warn(`[MelhorEnvioAdapter] Cotação HTTP ${response.status} no Sandbox. Ativando estimativa contingencial.`);
        return this.getFallbackOptions(toCep, box, payload.cartTotal);
      }

      const rawData = await response.json();

      if (!Array.isArray(rawData)) {
        if (config.environment === "production") {
          throw new Error("Resposta inválida retornada pela API do Melhor Envio.");
        }
        return this.getFallbackOptions(toCep, box, payload.cartTotal);
      }

      const validOptions: IShippingOption[] = rawData
        .filter((item: any) => item && !item.error && Number(item.price) > 0)
        .map((item: any) => {
          const finalPrice = Number(item.custom_price || item.price || 0);
          const deliveryTime = Number(item.custom_delivery_time || item.delivery_time || 0);

          return {
            id: item.id || item.name,
            name: item.name || "Envio Padrão",
            company: {
              id: item.company?.id || 0,
              name: item.company?.name || "Transportadora",
              picture: item.company?.picture || "",
            },
            price: finalPrice,
            discount: Number(item.discount || 0),
            deliveryTime,
            estimated: false,
          };
        });

      if (validOptions.length === 0) {
        if (config.environment === "production") {
          throw new Error("Nenhuma modalidade oficial de envio disponível para este CEP na transportadora.");
        }
        return this.getFallbackOptions(toCep, box, payload.cartTotal);
      }

      // Regra de Entrega Própria para Caxias / MA (Zona Urbana)
      if (isUrbanCaxias({ cep: toCep }) && !validOptions.some(o => o.id === "entrega-propria-caxias" || o.id === "motoboy-local-caxias")) {
        const isFree = typeof payload.cartTotal === "number" ? payload.cartTotal > 100 : false;
        validOptions.unshift({
          id: "entrega-propria-caxias",
          name: "Entrega Própria (Caxias Urbana)",
          company: { id: 99, name: "Evidência Express (Entrega Local)", picture: "" },
          price: isFree ? 0 : 10.00,
          deliveryTime: 1,
          estimated: false,
        });
      }

      return this.enrichOptionsWithBadges(validOptions);
    } catch (err: any) {
      if (config.environment === "production") {
        throw err;
      }
      console.warn("[MelhorEnvioAdapter] Falha na requisição HTTP de cotação no Sandbox, ativando estimativa contingencial:", err?.message || err);
      return this.getFallbackOptions(toCep, box, payload.cartTotal);
    }
  }

  /**
   * Adiciona o item ao carrinho, executa o checkout e gera a etiqueta no Melhor Envio.
   * Totalmente protegido contra dados fictícios e CEP sobrescrito.
   */
  public async createAndBuyLabel(payload: ICreateLabelPayload): Promise<ILabelResult> {
    const config = getMelhorEnvioConfig();
    const headers = await this.getAuthHeaders();
    const box = payload.box || DEFAULT_BOX;
    const from = { ...DEFAULT_FROM_ADDRESS, ...(payload.from || {}) };

    const fromDocRaw = (from.company_document || from.document || "").replace(/\D/g, "");
    const isCnpj = fromDocRaw.length === 14;

    const cleanFromCep = from.postal_code.replace(/\D/g, "") || DEFAULT_ORIGIN_CEP;
    const cleanToCep = (payload.to.postal_code || "").replace(/\D/g, "");

    // 1. Validação estrita de CEP
    if (cleanToCep.length !== 8) {
      throw new Error(`CEP de destino inválido ("${payload.to.postal_code}"). Deve conter 8 números.`);
    }

    // 2. Proteção contra CEP idêntico à origem
    if (cleanToCep === cleanFromCep) {
      throw new Error(
        `O CEP de destino (${cleanToCep}) é idêntico ao da loja física em Caxias-MA. Entregas no mesmo endereço de origem devem ser despachadas via Entrega Própria Local (Balcão ou Motoboy), e não via remessa externa de transportadora.`
      );
    }

    // 3. Validação dos dados obrigatórios do destinatário (sem valores fictícios)
    this.validateRecipient(payload.to);

    const cleanToDoc = (payload.to.document || "").replace(/\D/g, "");
    if (cleanToDoc === fromDocRaw || cleanToDoc === "04067032307") {
      throw new Error("O CPF do destinatário não pode ser igual ao CPF/CNPJ do remetente (lojista) no Melhor Envio. Em caso de pedidos de teste, altere o CPF do destinatário no pedido.");
    }

    const cleanToPhone = (payload.to.phone || "").replace(/\D/g, "");
    const detectedToUf = payload.to.state_abbr?.trim().toUpperCase() || getUfFromCep(cleanToCep);
    const fromEmail = (from.email || "wandesonandrade33@gmail.com").trim().toLowerCase();
    const cleanToEmail = (payload.to.email || "").trim().toLowerCase();
    const safeToEmail = cleanToEmail && cleanToEmail !== fromEmail ? cleanToEmail : "cliente@evidenciacalcados.com.br";

    const cartBody: any = {
      service: Number(payload.serviceId) || 2,
      from: {
        name: from.name || "Evidência Calçados",
        phone: from.phone || "99984684867",
        email: from.email || "wandesonandrade33@gmail.com",
        address: from.address || "Rua Afonso Pena",
        number: from.number || "295",
        district: from.district || "Centro",
        city: from.city || "Caxias",
        state_abbr: from.state_abbr || "MA",
        postal_code: cleanFromCep,
      },
      to: {
        name: payload.to.name.trim(),
        phone: cleanToPhone,
        email: safeToEmail,
        document: cleanToDoc,
        address: payload.to.address.trim(),
        number: payload.to.number.trim(),
        district: payload.to.district.trim(),
        city: payload.to.city.trim(),
        state_abbr: detectedToUf,
        postal_code: cleanToCep,
      },
      products: payload.products.map((p) => ({
        name: p.name,
        quantity: p.quantity,
        unitary_value: p.unitary_value,
      })),
      volumes: [
        {
          height: Math.max(Number(box.height) || 12, 1),
          width: Math.max(Number(box.width) || 20, 1),
          length: Math.max(Number(box.length) || 30, 1),
          weight: Math.max(Number(box.weight) || 0.8, 0.1),
        },
      ],
      options: {
        receipt: false,
        own_hand: false,
        reverse: false,
        non_commercial: true,
        insurance_value: payload.insuranceValue && payload.insuranceValue > 0 ? Number(payload.insuranceValue) : undefined,
      },
    };

    if (isCnpj) {
      cartBody.from.company_document = fromDocRaw;
    } else {
      cartBody.from.document = fromDocRaw;
    }

    try {
      // ETAPA 1: ADICIONAR AO CARRINHO DO MELHOR ENVIO
      const cartRes = await fetch(`${config.baseUrl}/api/v2/me/cart`, {
        method: "POST",
        headers,
        body: JSON.stringify(cartBody),
      });

      if (!cartRes.ok) {
        const errorData = await cartRes.json().catch(() => ({}));
        console.error("[MelhorEnvioAdapter] Falha ao adicionar ao carrinho do Melhor Envio:", cartRes.status, errorData);
        const errDetail = errorData.message || errorData.error || (errorData.errors ? Object.values(errorData.errors).flat().join(", ") : "");
        throw new Error(`Melhor Envio recusou criar a remessa: ${errDetail || `HTTP ${cartRes.status}`}`);
      }

      const cartData = await cartRes.json();
      const shipmentId = cartData.id || cartData.protocol;

      if (!shipmentId) {
        throw new Error("Melhor Envio não retornou o identificador (ID) da remessa criada.");
      }

      // ETAPA 2: CHECKOUT / PAGAMENTO DA ETIQUETA
      const checkoutRes = await fetch(`${config.baseUrl}/api/v2/me/shipment/checkout`, {
        method: "POST",
        headers,
        body: JSON.stringify({ orders: [shipmentId] }),
      });
      if (!checkoutRes.ok) {
        const checkErr = await checkoutRes.json().catch(() => ({}));
        console.error("[MelhorEnvioAdapter] Checkout error:", checkoutRes.status, checkErr);
        const checkDetail = checkErr.message || checkErr.error || "";
        throw new Error(`Remessa #${shipmentId} criada no carrinho, mas falhou ao comprar etiqueta no Melhor Envio (verifique saldo da carteira): ${checkDetail || `HTTP ${checkoutRes.status}`}`);
      }

      // ETAPA 3: GERAR O DOCUMENTO DA ETIQUETA
      const genRes = await fetch(`${config.baseUrl}/api/v2/me/shipment/generate`, {
        method: "POST",
        headers,
        body: JSON.stringify({ orders: [shipmentId] }),
      });
      if (!genRes.ok) {
        const genErr = await genRes.json().catch(() => ({}));
        console.error("[MelhorEnvioAdapter] Generate error:", genRes.status, genErr);
        const genDetail = genErr.message || genErr.error || "";
        throw new Error(`Etiqueta #${shipmentId} paga com sucesso, mas falhou ao enfileirar geração do PDF no Melhor Envio: ${genDetail || `HTTP ${genRes.status}`}`);
      }

      // ETAPA 4: LINK PÚBLICO DE IMPRESSÃO
      const printRes = await fetch(`${config.baseUrl}/api/v2/me/shipment/print`, {
        method: "POST",
        headers,
        body: JSON.stringify({ orders: [shipmentId], mode: "public" }),
      });

      let labelUrl = "";
      if (printRes.ok) {
        const printData = await printRes.json();
        labelUrl = printData.url || printData.link || "";
      } else {
        console.warn("[MelhorEnvioAdapter] Print warning:", printRes.status, await printRes.json().catch(() => ({})));
      }

      // ETAPA 5: CONSULTA RASTREIO OFICIAL LIBERADO
      const officialTracking = await this.getOfficialTracking(String(shipmentId));

      return {
        shipmentId: String(shipmentId),
        trackingCode: officialTracking || undefined,
        labelUrl: labelUrl || `${config.baseUrl}/imprimir/${shipmentId}`,
        status: "gerada",
        protocol: cartData.protocol,
      };
    } catch (err: any) {
      console.error("[MelhorEnvioAdapter] Falha na emissão da etiqueta no Melhor Envio:", err);
      throw err;
    }
  }

  /**
   * Cancela uma etiqueta no Melhor Envio (POST /api/v2/me/shipment/cancel)
   * Validação real da resposta HTTP
   */
  public async cancelLabel(shipmentId: string, reason = "Cancelamento pelo lojista"): Promise<boolean> {
    const config = getMelhorEnvioConfig();
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${config.baseUrl}/api/v2/me/shipment/cancel`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        order: {
          id: shipmentId,
          reason_id: 2,
          description: reason,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData.message || errorData.error || `HTTP ${response.status}`;
      console.error(`[MelhorEnvioAdapter] Falha ao cancelar remessa ${shipmentId}:`, msg);
      throw new Error(`Melhor Envio recusou cancelamento da etiqueta: ${msg}`);
    }

    const data = await response.json().catch(() => ({}));
    const orderResult = data && typeof data === "object" ? (data[shipmentId] || data) : null;
    if (orderResult && orderResult.canceled === false) {
      throw new Error(orderResult.error || "A transportadora não autorizou o cancelamento desta remessa.");
    }

    return true;
  }

  /**
   * Consulta o rastreamento em tempo real do pacote no Melhor Envio / Melhor Rastreio
   */
  public async trackShipment(trackingCode: string): Promise<ITrackingStatusResult | null> {
    if (!trackingCode) return null;

    const config = getMelhorEnvioConfig();

    try {
      const headers = await this.getAuthHeaders();
      const cleanSearch = trackingCode.trim().toUpperCase();

      // 0. Se for um UUID/ID de envio (ex: melhorEnvioId), tenta consultar direto o pedido
      let matchedOrder: any = null;
      const isUuidOrId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trackingCode.trim()) || /^\d+$/.test(trackingCode.trim());
      if (isUuidOrId) {
        try {
          const directOrderRes = await fetch(`${config.baseUrl}/api/v2/me/orders/${trackingCode.trim()}`, {
            headers,
          });
          if (directOrderRes.ok && directOrderRes.status !== 204) {
            const directData = await directOrderRes.json();
            if (directData && directData.id) {
              matchedOrder = directData;
            }
          }
        } catch (directErr) {
          console.warn("[MelhorEnvioAdapter] Falha ao consultar pedido direto por ID:", directErr);
        }
      }

      // 1. Busca inteligente direcionada: tenta encontrar pelo parâmetro de busca q
      if (!matchedOrder) {
        try {
          const searchRes = await fetch(
            `${config.baseUrl}/api/v2/me/orders?q=${encodeURIComponent(cleanSearch)}&per_page=10`,
            { headers }
          );
          if (searchRes.ok && searchRes.status !== 204) {
            const text = await searchRes.text();
            if (text && text.trim()) {
              const searchData = JSON.parse(text);
              const list: any[] = searchData?.data || (Array.isArray(searchData) ? searchData : []);
              matchedOrder = list.find((o: any) =>
                (o.tracking && o.tracking.toUpperCase() === cleanSearch) ||
                (o.self_tracking && o.self_tracking.toUpperCase() === cleanSearch) ||
                (o.protocol && o.protocol.toUpperCase() === cleanSearch) ||
                (o.id && o.id.toUpperCase() === cleanSearch)
              );
            }
          }
        } catch (searchErr) {
          console.warn("[MelhorEnvioAdapter] Falha na busca direcionada por q:", searchErr);
        }
      }

      // 2. Se não achou na busca direcionada, tenta listar as remessas recentes
      if (!matchedOrder) {
        const ordersRes = await fetch(`${config.baseUrl}/api/v2/me/orders?per_page=20`, {
          headers,
        });

        if (ordersRes.ok && ordersRes.status !== 204) {
          const text = await ordersRes.text();
          if (text && text.trim()) {
            const ordersData = JSON.parse(text);
            const ordersList: any[] = ordersData?.data || (Array.isArray(ordersData) ? ordersData : []);

            matchedOrder = ordersList.find((o: any) =>
              (o.tracking && o.tracking.toUpperCase() === cleanSearch) ||
              (o.self_tracking && o.self_tracking.toUpperCase() === cleanSearch) ||
              (o.protocol && o.protocol.toUpperCase() === cleanSearch) ||
              (o.id && o.id.toUpperCase() === cleanSearch)
            );
          }
        }
      }

      if (matchedOrder) {
        // Tenta obter os eventos detalhados do endpoint de tracking com o UUID oficial
        try {
          const trackingRes = await fetch(`${config.baseUrl}/api/v2/me/shipment/tracking`, {
            method: "POST",
            headers,
            body: JSON.stringify({ orders: [matchedOrder.id] }),
          });
          if (trackingRes.ok) {
            const trackingData = await trackingRes.json();
            const trackingItem = trackingData && typeof trackingData === "object" ? trackingData[matchedOrder.id] : null;
            if (trackingItem && !trackingItem.error) {
              const hierarchy: Record<string, number> = {
                delivered: 5,
                in_transit: 4,
                posted: 3,
                released: 2,
                generated: 2,
                paid: 1,
                pending: 1,
                canceled: 0,
              };

              const orderStatus = String(matchedOrder.status || "").toLowerCase().trim();
              const itemStatus = String(trackingItem.status || "").toLowerCase().trim();
              const bestStatus = (hierarchy[orderStatus] || 0) >= (hierarchy[itemStatus] || 0)
                ? matchedOrder.status
                : trackingItem.status;

              return this.normalizeTrackingData(
                matchedOrder.tracking || matchedOrder.self_tracking || trackingCode,
                {
                  ...matchedOrder,
                  ...trackingItem,
                  status: bestStatus,
                  posted_at: matchedOrder.posted_at || trackingItem.posted_at,
                  delivered_at: matchedOrder.delivered_at || trackingItem.delivered_at,
                }
              );
            }
          }
        } catch (trackErr) {
          console.warn("[MelhorEnvioAdapter] Falha ao consultar endpoint de tracking detalhado:", trackErr);
        }

        return this.normalizeTrackingData(
          matchedOrder.tracking || matchedOrder.self_tracking || trackingCode,
          matchedOrder
        );
      }

      // 3. Se não encontrou na listagem, tenta consultar diretamente pelo UUID/código no endpoint de tracking
      const response = await fetch(`${config.baseUrl}/api/v2/me/shipment/tracking`, {
        method: "POST",
        headers,
        body: JSON.stringify({ orders: [trackingCode] }),
      });

      if (response.ok) {
        const data = await response.json();
        const item = data && typeof data === "object" ? data[trackingCode] : null;
        if (item && item.status && !item.error) {
          return this.normalizeTrackingData(trackingCode, item);
        }
      }
    } catch (err) {
      console.warn("[MelhorEnvioAdapter] Falha na consulta de rastreamento da API:", err);
      return null;
    }

    return null;
  }

  private normalizeTrackingData(trackingCode: string, item: any): ITrackingStatusResult {
    const statusRaw = String(item.status || "").toLowerCase().trim();
    let status: 'posted' | 'in_transit' | 'delivered' | 'canceled' | 'pending' = 'pending';

    if (statusRaw.includes("delivered") || statusRaw.includes("entregue")) {
      status = "delivered";
    } else if (statusRaw.includes("canceled") || statusRaw.includes("cancelad")) {
      status = "canceled";
    } else if (
      statusRaw === "in_transit" ||
      statusRaw.includes("transit") ||
      statusRaw.includes("transito") ||
      statusRaw.includes("out_for_delivery") ||
      statusRaw.includes("saiu para entrega") ||
      statusRaw.includes("encaminhado")
    ) {
      status = "in_transit";
    } else if (statusRaw.includes("posted") || statusRaw.includes("postado")) {
      status = "posted";
    } else {
      status = "pending";
    }

    const events: ITrackingEvent[] = [];

    if (Array.isArray(item.events) && item.events.length > 0) {
      item.events.forEach((e: any) => {
        events.push({
          status: e.status || "Movimentação",
          description: e.description || e.action || "Objeto em deslocamento",
          location: e.location || (e.city ? `${e.city}/${e.state}` : "Centro de Distribuição"),
          createdAt: e.created_at || e.date || new Date().toISOString(),
        });
      });
    } else {
      if (item.created_at) {
        events.push({
          status: "Etiqueta Gerada",
          description: "Etiqueta de envio gerada no Melhor Envio",
          location: item.from ? `${item.from.city || 'Caxias'} / ${item.from.state || 'MA'}` : "Caxias / MA",
          createdAt: item.created_at,
        });
      }
      if (item.posted_at) {
        events.push({
          status: "Postado",
          description: "Objeto postado na agência da transportadora",
          location: item.from ? `${item.from.city || 'Caxias'} / ${item.from.state || 'MA'}` : "Caxias / MA",
          createdAt: item.posted_at,
        });
      }
      if (item.delivered_at) {
        events.push({
          status: "Entregue",
          description: "Objeto entregue ao destinatário",
          location: item.to ? `${item.to.city || 'Caxias'} / ${item.to.state || 'MA'}` : "Caxias / MA",
          createdAt: item.delivered_at,
        });
      }
    }

    let metricDivergence: IMetricDivergence | undefined;
    const div = item.metric_divergence || item.divergence || item.differences || item.metric_difference;
    if (div) {
      const origPrice = Number(div.original_price ?? div.price ?? 0);
      const diffPrice = Number(div.difference ?? div.additional_value ?? div.value ?? 0);
      metricDivergence = {
        originalPrice: origPrice,
        difference: diffPrice,
        finalPrice: origPrice + diffPrice,
        originalWeight: Number(div.original_weight ?? 0.8),
        measuredWeight: Number(div.measured_weight ?? div.weight ?? 0),
        occurredAt: div.created_at || new Date().toISOString(),
      };
    }

    return {
      trackingCode: item.tracking || item.self_tracking || trackingCode,
      shipmentId: item.id || item.protocol || trackingCode,
      status,
      statusText: 
        status === "delivered" ? "Entregue ao Destinatário" :
        status === "in_transit" ? "Em Trânsito na Transportadora" :
        status === "posted" ? "Objeto Postado na Agência" :
        status === "canceled" ? "Envio Cancelado" :
        (statusRaw.includes("released") ? "Etiqueta Liberada para Impressão" :
         statusRaw.includes("generated") ? "Etiqueta Pronta / Aguardando Postagem" :
         "Aguardando Postagem / Em Preparação"),
      events,
      metricDivergence,
      rawResponse: item,
      updatedAt: new Date().toISOString(),
    };
  }

  public async getOfficialTracking(shipmentId: string): Promise<string | null> {
    if (!shipmentId) return null;
    const config = getMelhorEnvioConfig();
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${config.baseUrl}/api/v2/me/orders/${shipmentId}`, {
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        const code =
          data.tracking ||
          data.self_tracking ||
          (Array.isArray(data.volumes) && data.volumes[0]?.tracking) ||
          null;
        if (code) return String(code).trim();
      }
    } catch (e) {
      console.warn("[MelhorEnvioAdapter] Falha ao buscar tracking oficial:", e);
    }
    return null;
  }

  private getFallbackOptions(toCep: string, box: IShippingBoxDimensions, cartTotal?: number): IShippingOption[] {
    const config = getMelhorEnvioConfig();
    const cleanCep = toCep.replace(/\D/g, "").padEnd(8, "0");
    const cepPrefix2 = parseInt(cleanCep.slice(0, 2), 10) || 0;
    const isCaxias = isUrbanCaxias({ cep: cleanCep });
    const weightFactor = Math.max((box.weight || 0.8) - 0.5, 0) * 8;

    let basePricePac = 28.00;
    let basePriceSedex = 44.00;
    let basePriceJadlog = 26.00;
    let timePac = 6;
    let timeSedex = 3;
    let timeJadlog = 5;

    if (isCaxias) {
      basePricePac = 18.50;
      basePriceSedex = 26.00;
      basePriceJadlog = 16.90;
      timePac = 3;
      timeSedex = 2;
      timeJadlog = 3;
    } else if (cepPrefix2 === 65) {
      basePricePac = 22.00;
      basePriceSedex = 32.00;
      basePriceJadlog = 20.50;
      timePac = 4;
      timeSedex = 2;
      timeJadlog = 4;
    } else if (cepPrefix2 === 64) {
      basePricePac = 21.00;
      basePriceSedex = 30.00;
      basePriceJadlog = 19.50;
      timePac = 4;
      timeSedex = 2;
      timeJadlog = 3;
    } else if (cepPrefix2 >= 40 && cepPrefix2 <= 63) {
      basePricePac = 28.50;
      basePriceSedex = 42.00;
      basePriceJadlog = 26.00;
      timePac = 5;
      timeSedex = 3;
      timeJadlog = 5;
    } else if (cepPrefix2 >= 1 && cepPrefix2 <= 39) {
      basePricePac = 34.90;
      basePriceSedex = 58.00;
      basePriceJadlog = 31.50;
      timePac = 7;
      timeSedex = 3;
      timeJadlog = 6;
    } else if (cepPrefix2 >= 70 && cepPrefix2 <= 79) {
      basePricePac = 36.00;
      basePriceSedex = 62.00;
      basePriceJadlog = 33.00;
      timePac = 7;
      timeSedex = 4;
      timeJadlog = 6;
    } else if (cepPrefix2 >= 80 && cepPrefix2 <= 99) {
      basePricePac = 42.00;
      basePriceSedex = 74.00;
      basePriceJadlog = 39.00;
      timePac = 8;
      timeSedex = 4;
      timeJadlog = 7;
    } else if (cepPrefix2 >= 66 && cepPrefix2 <= 69) {
      basePricePac = 39.00;
      basePriceSedex = 68.00;
      basePriceJadlog = 36.00;
      timePac = 9;
      timeSedex = 4;
      timeJadlog = 8;
    }

    const baseOptions: IShippingOption[] = [];

    if (isCaxias) {
      const isFree = typeof cartTotal === "number" ? cartTotal > 100 : false;
      baseOptions.push({
        id: "entrega-propria-caxias",
        name: "Entrega Própria (Caxias Urbana)",
        company: { id: 99, name: "Evidência Express (Entrega Local)", picture: "" },
        price: isFree ? 0 : 10.00,
        deliveryTime: 1,
        estimated: false,
      });
    }

    baseOptions.push(
      {
        id: "melhorenvio-jadlog-package",
        name: ".Package (Estimativa)",
        company: { id: 2, name: "Jadlog", picture: `${config.baseUrl}/images/shipping-companies/jadlog.png` },
        price: Math.round((basePriceJadlog + weightFactor) * 100) / 100,
        deliveryTime: timeJadlog,
        estimated: true,
      },
      {
        id: "melhorenvio-correios-pac",
        name: "PAC (Estimativa)",
        company: { id: 1, name: "Correios", picture: `${config.baseUrl}/images/shipping-companies/correios.png` },
        price: Math.round((basePricePac + weightFactor) * 100) / 100,
        deliveryTime: timePac,
        estimated: true,
      },
      {
        id: "melhorenvio-correios-sedex",
        name: "SEDEX (Estimativa)",
        company: { id: 1, name: "Correios", picture: `${config.baseUrl}/images/shipping-companies/correios.png` },
        price: Math.round((basePriceSedex + weightFactor * 1.5) * 100) / 100,
        deliveryTime: timeSedex,
        estimated: true,
      }
    );

    return this.enrichOptionsWithBadges(baseOptions);
  }

  private enrichOptionsWithBadges(options: IShippingOption[]): IShippingOption[] {
    let minPrice = Infinity;
    let minTime = Infinity;

    options.forEach((opt) => {
      if (opt.price < minPrice) minPrice = opt.price;
      if (opt.deliveryTime < minTime) minTime = opt.deliveryTime;
    });

    return options
      .map((opt) => ({
        ...opt,
        isCheapest: opt.price === minPrice,
        isFastest: opt.deliveryTime === minTime,
      }))
      .sort((a, b) => a.price - b.price);
  }

  private normalizeAddressData(cleanCep: string, data: any): IAddressLocation | null {
    if (!data || data.error) return null;

    const street = data.address || data.logradouro || "";
    const neighborhood = data.district || data.bairro || "";
    const city = typeof data.city === "object" ? data.city.city : (data.city || data.localidade || "");
    const state = typeof data.city === "object" && data.city.state ? data.city.state.state_abbr : (data.uf || data.state || "");

    return {
      postalCode: cleanCep,
      street,
      neighborhood,
      city,
      state,
      district: neighborhood,
      cityId: typeof data.city === "object" ? data.city.id : undefined,
      stateId: typeof data.city === "object" && data.city.state ? data.city.state.id : undefined,
    };
  }

  /**
   * Interpreta os payloads enviados via Webhook pelo Melhor Envio
   */
  public parseWebhookPayload(payload: any): IShippingWebhookResult | null {
    if (!payload || typeof payload !== "object") return null;

    const shipment = payload.shipment || payload.order || payload.data || payload;
    const shipmentId = String(shipment.id || payload.id || "").trim();
    const trackingCode = String(
      shipment.tracking ||
      shipment.tracking_code ||
      payload.tracking ||
      payload.tracking_code ||
      ""
    ).trim();

    const statusRaw = String(
      shipment.status ||
      payload.status ||
      payload.event ||
      payload.type ||
      ""
    ).toLowerCase();

    let status: 'posted' | 'in_transit' | 'delivered' | 'canceled' | 'pending' | undefined;
    let statusText: string | undefined;

    if (statusRaw.includes("delivered") || statusRaw.includes("entregue")) {
      status = "delivered";
      statusText = "Objeto Entregue ao Destinatário";
    } else if (statusRaw.includes("canceled") || statusRaw.includes("cancelad")) {
      status = "canceled";
      statusText = "Envio Cancelado";
    } else if (statusRaw.includes("out_for_delivery") || statusRaw.includes("saiu")) {
      status = "in_transit";
      statusText = "Objeto saiu para entrega ao destinatário";
    } else if (statusRaw.includes("posted") || statusRaw.includes("postado")) {
      status = "posted";
      statusText = "Objeto postado na agência da transportadora";
    } else if (statusRaw.includes("transit") || statusRaw.includes("moviment") || statusRaw.includes("encaminhado")) {
      status = "in_transit";
      statusText = "Em Trânsito na Transportadora";
    }

    const rawEvents = shipment.events || payload.events || (payload.event ? [payload] : []);
    const newEvents: ITrackingEvent[] = [];

    if (Array.isArray(rawEvents)) {
      for (const e of rawEvents) {
        if (!e) continue;
        newEvents.push({
          status: e.status || e.action || statusText || "Movimentação",
          description: e.description || e.message || e.action || "Objeto em deslocamento",
          location: e.location || (e.city ? `${e.city}/${e.state || ''}` : undefined) || "Centro de Distribuição",
          createdAt: e.created_at || e.date || new Date().toISOString(),
        });
      }
    } else if (statusText) {
      newEvents.push({
        status: statusText,
        description: statusText,
        location: "Transportadora",
        createdAt: new Date().toISOString(),
      });
    }

    let metricDivergence: IMetricDivergence | undefined;
    const divergenceData = shipment.metric_divergence || payload.metric_divergence || payload.divergence;
    if (divergenceData) {
      const origPrice = Number(divergenceData.original_price || divergenceData.price || 0);
      const diffPrice = Number(divergenceData.difference || divergenceData.additional_value || 0);
      metricDivergence = {
        originalPrice: origPrice,
        difference: diffPrice,
        finalPrice: origPrice + diffPrice,
        originalWeight: Number(divergenceData.original_weight || 0.8),
        measuredWeight: Number(divergenceData.measured_weight || divergenceData.weight || 0),
        occurredAt: divergenceData.created_at || new Date().toISOString(),
      };
    }

    return {
      shipmentId: shipmentId || undefined,
      trackingCode: trackingCode || undefined,
      status,
      statusText,
      newEvents: newEvents.length > 0 ? newEvents : undefined,
      metricDivergence,
    };
  }
}
