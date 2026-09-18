var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  app: () => app2,
  default: () => server_default
});
module.exports = __toCommonJS(server_exports);
var import_config = require("dotenv/config");
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_multer = __toESM(require("multer"), 1);

// src/services/shipping/providers/melhorEnvio/melhorEnvioConfig.ts
var import_meta = {};
function readEnv(key) {
  if (typeof process !== "undefined" && process.env) {
    if (process.env[key]) return process.env[key];
    if (process.env[`VITE_${key}`]) return process.env[`VITE_${key}`];
  }
  try {
    const metaEnv = import_meta.env;
    if (metaEnv) {
      if (metaEnv[`VITE_${key}`]) return metaEnv[`VITE_${key}`];
      if (metaEnv[key]) return metaEnv[key];
    }
  } catch {
  }
  return "";
}
function getMelhorEnvioConfig() {
  const envVal = (readEnv("MELHOR_ENVIO_ENV") || readEnv("SHIPPING_ENV") || "sandbox").toLowerCase();
  const isSandbox = envVal !== "production";
  const baseUrl = isSandbox ? "https://sandbox.melhorenvio.com.br" : "https://melhorenvio.com.br";
  const apiToken = readEnv("MELHOR_ENVIO_TOKEN");
  const clientId = readEnv("MELHOR_ENVIO_CLIENT_ID");
  const clientSecret = readEnv("MELHOR_ENVIO_CLIENT_SECRET");
  const redirectUri = readEnv("MELHOR_ENVIO_REDIRECT_URI");
  const userAgent = readEnv("MELHOR_ENVIO_USER_AGENT") || "EvidenciaCalcados (wandesonandrade33@gmail.com)";
  return {
    environment: isSandbox ? "sandbox" : "production",
    baseUrl,
    apiToken,
    clientId,
    clientSecret,
    redirectUri,
    userAgent
  };
}

// src/services/shipping/providers/melhorEnvio/melhorEnvioAuth.ts
var MelhorEnvioAuth = class {
  constructor(customConfig) {
    this.cachedToken = null;
    this.config = customConfig || getMelhorEnvioConfig();
    if (this.config.apiToken) {
      this.cachedToken = this.config.apiToken;
    }
  }
  /**
   * Retorna os cabeçalhos padrão com Authorization e User-Agent exigido pela API do Melhor Envio
   */
  async getAuthHeaders() {
    const token = await this.getValidToken();
    return {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json",
      "Content-Type": "application/json",
      "User-Agent": this.config.userAgent
    };
  }
  /**
   * Obtém o token de acesso ativo ou lança exceção descritiva
   */
  async getValidToken() {
    if (this.cachedToken) {
      return this.cachedToken;
    }
    this.config = getMelhorEnvioConfig();
    if (this.config.apiToken) {
      this.cachedToken = this.config.apiToken;
      return this.cachedToken;
    }
    throw new Error(
      "[MelhorEnvioAuth] Token de API do Melhor Envio n\xE3o encontrado nas vari\xE1veis de ambiente (MELHOR_ENVIO_TOKEN / VITE_MELHOR_ENVIO_TOKEN)."
    );
  }
  /**
   * Verifica se o token de autenticação atual está presente e estruturalmente válido
   */
  isAuthenticated() {
    try {
      const token = this.cachedToken || this.config.apiToken;
      return Boolean(token && token.trim().length > 0);
    } catch {
      return false;
    }
  }
  /**
   * Define manualmente o token ativo na memória
   */
  setToken(token) {
    this.cachedToken = token;
  }
  /**
   * Fluxo OAuth 2.0: Troca o código de autorização por tokens de acesso
   */
  async exchangeCodeForToken(code) {
    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error("[MelhorEnvioAuth] MELHOR_ENVIO_CLIENT_ID e MELHOR_ENVIO_CLIENT_SECRET s\xE3o obrigat\xF3rios para fluxo OAuth2.");
    }
    const response = await fetch(`${this.config.baseUrl}/api/v2/oauth/token`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": this.config.userAgent
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        code
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`[MelhorEnvioAuth] Falha na troca do c\xF3digo OAuth2: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    this.cachedToken = data.access_token;
    return data;
  }
  /**
   * Fluxo OAuth 2.0: Renova o Access Token utilizando o Refresh Token
   */
  async refreshOAuthToken(refreshToken) {
    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error("[MelhorEnvioAuth] MELHOR_ENVIO_CLIENT_ID e MELHOR_ENVIO_CLIENT_SECRET s\xE3o obrigat\xF3rios para renova\xE7\xE3o OAuth2.");
    }
    const response = await fetch(`${this.config.baseUrl}/api/v2/oauth/token`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": this.config.userAgent
      },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`[MelhorEnvioAuth] Falha na renova\xE7\xE3o do refresh token: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    this.cachedToken = data.access_token;
    return data;
  }
  /**
   * Retorna as configurações ativas do ambiente (sem expor o token completo por segurança)
   */
  getInfo() {
    return {
      environment: this.config.environment,
      baseUrl: this.config.baseUrl,
      userAgent: this.config.userAgent,
      hasToken: Boolean(this.cachedToken || this.config.apiToken)
    };
  }
};

// src/services/shipping/providers/melhorEnvio/melhorEnvioAdapter.ts
var DEFAULT_ORIGIN_CEP = "65600060";
var DEFAULT_FROM_ADDRESS = {
  name: "Evid\xEAncia Cal\xE7ados",
  phone: "99984684867",
  email: "wandesonandrade33@gmail.com",
  document: "60997831000101",
  address: "Rua Afonso Pena",
  number: "295",
  district: "Centro",
  city: "Caxias",
  state_abbr: "MA",
  postal_code: "65600060"
};
var DEFAULT_BOX = {
  height: 12,
  width: 20,
  length: 30,
  weight: 0.8
};
var MelhorEnvioAdapter = class {
  constructor(customAuth) {
    this.providerName = "melhorenvio";
    this.authService = customAuth || new MelhorEnvioAuth();
  }
  get environment() {
    return getMelhorEnvioConfig().environment;
  }
  async getAuthHeaders() {
    return this.authService.getAuthHeaders();
  }
  async isAuthenticated() {
    return this.authService.isAuthenticated();
  }
  async refreshToken() {
    const token = await this.authService.getValidToken();
    return {
      accessToken: token,
      tokenType: "Bearer"
    };
  }
  getAuthService() {
    return this.authService;
  }
  /**
   * Consulta um CEP na API do Melhor Envio
   */
  async fetchAddressByCep(postalCode) {
    const cleanCep = postalCode.replace(/\D/g, "");
    if (cleanCep.length !== 8) return null;
    const config = getMelhorEnvioConfig();
    const headers = await this.getAuthHeaders();
    try {
      const response = await fetch(`${config.baseUrl}/api/v2/me/shipment/location/postal-code`, {
        method: "POST",
        headers,
        body: JSON.stringify({ postal_code: cleanCep })
      });
      if (!response.ok) {
        const altResponse = await fetch(`${config.baseUrl}/api/v2/me/shipment/location/postal-code?postal_code=${cleanCep}`, {
          method: "GET",
          headers
        });
        if (!altResponse.ok) return null;
        const altData = await altResponse.json();
        return this.normalizeAddressData(cleanCep, altData);
      }
      const data = await response.json();
      return this.normalizeAddressData(cleanCep, data);
    } catch (err) {
      console.warn("[MelhorEnvioAdapter] Falha na API de CEP do Melhor Envio:", err?.message || err);
      return null;
    }
  }
  /**
   * Realiza a cotação de frete no Melhor Envio (POST /api/v2/me/shipment/calculate)
   */
  async calculateShipping(payload) {
    const fromCep = (payload.fromPostalCode || DEFAULT_ORIGIN_CEP).replace(/\D/g, "");
    const toCep = payload.toPostalCode.replace(/\D/g, "");
    const box = payload.box || DEFAULT_BOX;
    if (toCep.length !== 8) {
      return this.getFallbackOptions("01001000", box);
    }
    try {
      const config = getMelhorEnvioConfig();
      const headers = await this.getAuthHeaders();
      const requestBody = {
        from: { postal_code: fromCep },
        to: { postal_code: toCep },
        package: {
          height: Math.max(Number(box.height) || 12, 1),
          width: Math.max(Number(box.width) || 20, 1),
          length: Math.max(Number(box.length) || 30, 1),
          weight: Math.max(Number(box.weight) || 0.8, 0.1)
        }
      };
      const response = await fetch(`${config.baseUrl}/api/v2/me/shipment/calculate`, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody)
      });
      if (!response.ok) {
        return this.getFallbackOptions(toCep, box);
      }
      const rawData = await response.json();
      if (!Array.isArray(rawData)) {
        return this.getFallbackOptions(toCep, box);
      }
      const validOptions = rawData.filter((item) => item && !item.error && Number(item.price) > 0).map((item) => {
        const finalPrice = Number(item.custom_price || item.price || 0);
        const deliveryTime = Number(item.custom_delivery_time || item.delivery_time || 0);
        return {
          id: item.id || item.name,
          name: item.name || "Envio Padr\xE3o",
          company: {
            id: item.company?.id || 0,
            name: item.company?.name || "Transportadora",
            picture: item.company?.picture || ""
          },
          price: finalPrice,
          discount: Number(item.discount || 0),
          deliveryTime
        };
      });
      if (validOptions.length === 0) {
        return this.getFallbackOptions(toCep, box, payload.cartTotal);
      }
      if (toCep.startsWith("6560") && !validOptions.some((o) => o.id === "entrega-propria-caxias" || o.id === "motoboy-local-caxias")) {
        const isFree = typeof payload.cartTotal === "number" ? payload.cartTotal > 100 : false;
        validOptions.unshift({
          id: "entrega-propria-caxias",
          name: "Entrega Pr\xF3pria (Caxias Urbana)",
          company: { id: 99, name: "Evid\xEAncia Express (Entrega Local)", picture: "" },
          price: isFree ? 0 : 10,
          deliveryTime: 1
        });
      }
      return this.enrichOptionsWithBadges(validOptions);
    } catch (err) {
      console.warn("[MelhorEnvioAdapter] Falha na requisi\xE7\xE3o HTTP de cota\xE7\xE3o, ativando estimativa Sandbox:", err?.message || err);
      return this.getFallbackOptions(toCep, box, payload.cartTotal);
    }
  }
  /**
   * Adiciona o item ao carrinho, executa o checkout e gera a etiqueta no Melhor Envio
   */
  async createAndBuyLabel(payload) {
    const config = getMelhorEnvioConfig();
    const headers = await this.getAuthHeaders();
    const box = payload.box || DEFAULT_BOX;
    const from = { ...DEFAULT_FROM_ADDRESS, ...payload.from || {} };
    const fromDocRaw = (from.company_document || from.document || "").replace(/\D/g, "");
    const isCnpj = fromDocRaw.length === 14;
    const cleanFromCep = from.postal_code.replace(/\D/g, "") || DEFAULT_ORIGIN_CEP;
    let cleanToCep = (payload.to.postal_code || "").replace(/\D/g, "");
    if (cleanToCep.startsWith("6560")) {
      if (cleanToCep === cleanFromCep || cleanToCep === "65600000" || cleanToCep === "65606441" || cleanToCep.length !== 8) {
        cleanToCep = "65604000";
      }
    } else if (cleanToCep.length !== 8 || cleanToCep === "00000000") {
      cleanToCep = "65604000";
    }
    const cleanCepNumbers = cleanToCep.replace(/\D/g, "");
    const getUfFromCep = (cepStr) => {
      const p2 = parseInt(cepStr.substring(0, 2), 10);
      if (p2 >= 1 && p2 <= 19) return "SP";
      if (p2 >= 20 && p2 <= 28) return "RJ";
      if (p2 === 29) return "ES";
      if (p2 >= 30 && p2 <= 39) return "MG";
      if (p2 >= 40 && p2 <= 48) return "BA";
      if (p2 === 49) return "SE";
      if (p2 >= 50 && p2 <= 56) return "PE";
      if (p2 === 57) return "AL";
      if (p2 === 58) return "PB";
      if (p2 === 59) return "RN";
      if (p2 >= 60 && p2 <= 63) return "CE";
      if (p2 === 64) return "PI";
      if (p2 === 65) return "MA";
      if (p2 >= 66 && p2 <= 68) return "PA";
      if (p2 === 69) return "AM";
      if (p2 >= 70 && p2 <= 72) return "DF";
      if (p2 >= 73 && p2 <= 76) return "GO";
      if (p2 === 77) return "TO";
      if (p2 >= 78 && p2 <= 79) return "MT";
      if (p2 >= 80 && p2 <= 87) return "PR";
      if (p2 >= 88 && p2 <= 89) return "SC";
      if (p2 >= 90 && p2 <= 99) return "RS";
      return "MA";
    };
    const detectedToUf = getUfFromCep(cleanCepNumbers);
    const cartBody = {
      service: Number(payload.serviceId) || 2,
      from: {
        name: from.name || "Evid\xEAncia Cal\xE7ados",
        phone: from.phone || "99984684867",
        email: from.email || "wandesonandrade33@gmail.com",
        address: from.address || "Rua Afonso Pena",
        number: from.number || "295",
        district: from.district || "Centro",
        city: from.city || "Caxias",
        state_abbr: from.state_abbr || "MA",
        postal_code: cleanFromCep
      },
      to: {
        name: payload.to.name,
        phone: payload.to.phone || "99999999999",
        email: payload.to.email,
        document: (payload.to.document || "04067032307").replace(/\D/g, ""),
        address: payload.to.address,
        number: payload.to.number || "S/N",
        district: payload.to.district || "Centro",
        city: payload.to.city || (detectedToUf === "PI" ? "Teresina" : "Caxias"),
        state_abbr: detectedToUf || payload.to.state_abbr || "MA",
        postal_code: cleanToCep
      },
      products: payload.products.map((p) => ({
        name: p.name,
        quantity: p.quantity,
        unitary_value: p.unitary_value
      })),
      volumes: [
        {
          height: Math.max(Number(box.height) || 12, 1),
          width: Math.max(Number(box.width) || 20, 1),
          length: Math.max(Number(box.length) || 30, 1),
          weight: Math.max(Number(box.weight) || 0.8, 0.1)
        }
      ],
      options: {
        receipt: false,
        own_hand: false,
        reverse: false,
        non_commercial: true
      }
    };
    if (isCnpj) {
      cartBody.from.company_document = fromDocRaw;
    } else {
      cartBody.from.document = fromDocRaw || "04067032307";
    }
    try {
      const cartRes = await fetch(`${config.baseUrl}/api/v2/me/cart`, {
        method: "POST",
        headers,
        body: JSON.stringify(cartBody)
      });
      if (!cartRes.ok) {
        const errorData = await cartRes.json().catch(() => ({}));
        console.error("[MelhorEnvioAdapter] Falha ao adicionar ao carrinho do Melhor Envio:", cartRes.status, errorData, "Payload:", JSON.stringify({ from: cartBody.from, to: cartBody.to }));
        const errDetail = errorData.message || errorData.error || (errorData.errors ? Object.values(errorData.errors).flat().join(", ") : "");
        throw new Error(`Melhor Envio recusou criar a remessa: ${errDetail || `HTTP ${cartRes.status}`}`);
      }
      const cartData = await cartRes.json();
      const shipmentId = cartData.id || cartData.protocol;
      if (!shipmentId) {
        throw new Error("Melhor Envio n\xE3o retornou o identificador (ID) da remessa criada.");
      }
      const checkoutRes = await fetch(`${config.baseUrl}/api/v2/me/shipment/checkout`, {
        method: "POST",
        headers,
        body: JSON.stringify({ orders: [shipmentId] })
      });
      if (!checkoutRes.ok) {
        const checkErr = await checkoutRes.json().catch(() => ({}));
        console.error("[MelhorEnvioAdapter] Checkout error:", checkoutRes.status, checkErr);
        const checkDetail = checkErr.message || checkErr.error || "";
        throw new Error(`Falha ao comprar etiqueta no Melhor Envio (verifique o saldo da sua carteira): ${checkDetail || `HTTP ${checkoutRes.status}`}`);
      }
      const genRes = await fetch(`${config.baseUrl}/api/v2/me/shipment/generate`, {
        method: "POST",
        headers,
        body: JSON.stringify({ orders: [shipmentId] })
      });
      if (!genRes.ok) {
        const genErr = await genRes.json().catch(() => ({}));
        console.error("[MelhorEnvioAdapter] Generate error:", genRes.status, genErr);
        const genDetail = genErr.message || genErr.error || "";
        throw new Error(`Falha ao gerar o documento da etiqueta no Melhor Envio: ${genDetail || `HTTP ${genRes.status}`}`);
      }
      const printRes = await fetch(`${config.baseUrl}/api/v2/me/shipment/print`, {
        method: "POST",
        headers,
        body: JSON.stringify({ orders: [shipmentId], mode: "public" })
      });
      let labelUrl = "";
      if (printRes.ok) {
        const printData = await printRes.json();
        labelUrl = printData.url || printData.link || "";
      } else {
        console.warn("[MelhorEnvioAdapter] Print error:", printRes.status, await printRes.json().catch(() => ({})));
      }
      const officialTracking = await this.getOfficialTracking(String(shipmentId));
      return {
        shipmentId: String(shipmentId),
        trackingCode: officialTracking || void 0,
        labelUrl: labelUrl || `${config.baseUrl}/imprimir/${shipmentId}`,
        status: "gerada"
      };
    } catch (err) {
      console.error("[MelhorEnvioAdapter] Falha na emiss\xE3o da etiqueta no Melhor Envio:", err);
      throw err;
    }
  }
  /**
   * Cancela uma etiqueta no Melhor Envio (POST /api/v2/me/shipment/cancel)
   */
  async cancelLabel(shipmentId, reason = "Cancelamento pelo lojista") {
    const config = getMelhorEnvioConfig();
    const headers = await this.getAuthHeaders();
    try {
      await fetch(`${config.baseUrl}/api/v2/me/shipment/cancel`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          order: {
            id: shipmentId,
            reason_id: 2,
            description: reason
          }
        })
      });
      return true;
    } catch {
      return true;
    }
  }
  /**
   * Consulta o rastreamento em tempo real do pacote no Melhor Envio / Melhor Rastreio
   */
  async trackShipment(trackingCode) {
    if (!trackingCode) return null;
    const config = getMelhorEnvioConfig();
    try {
      const headers = await this.getAuthHeaders();
      const cleanSearch = trackingCode.trim().toUpperCase();
      let matchedOrder = null;
      const isUuidOrId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trackingCode.trim()) || /^\d+$/.test(trackingCode.trim());
      if (isUuidOrId) {
        try {
          const directOrderRes = await fetch(`${config.baseUrl}/api/v2/me/orders/${trackingCode.trim()}`, {
            headers
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
              const list = searchData?.data || (Array.isArray(searchData) ? searchData : []);
              matchedOrder = list.find(
                (o) => o.tracking && o.tracking.toUpperCase() === cleanSearch || o.self_tracking && o.self_tracking.toUpperCase() === cleanSearch || o.protocol && o.protocol.toUpperCase() === cleanSearch || o.id && o.id.toUpperCase() === cleanSearch
              );
            }
          }
        } catch (searchErr) {
          console.warn("[MelhorEnvioAdapter] Falha na busca direcionada por q:", searchErr);
        }
      }
      if (!matchedOrder) {
        const ordersRes = await fetch(`${config.baseUrl}/api/v2/me/orders?per_page=50`, {
          headers
        });
        if (ordersRes.ok && ordersRes.status !== 204) {
          const text = await ordersRes.text();
          if (text && text.trim()) {
            const ordersData = JSON.parse(text);
            const ordersList = ordersData?.data || (Array.isArray(ordersData) ? ordersData : []);
            matchedOrder = ordersList.find(
              (o) => o.tracking && o.tracking.toUpperCase() === cleanSearch || o.self_tracking && o.self_tracking.toUpperCase() === cleanSearch || o.protocol && o.protocol.toUpperCase() === cleanSearch || o.id && o.id.toUpperCase() === cleanSearch
            );
          }
        }
      }
      if (matchedOrder) {
        console.log(`\u{1F4E6} [MelhorEnvioAdapter] Remessa encontrada na API do Melhor Envio:`, {
          id: matchedOrder.id,
          protocol: matchedOrder.protocol,
          status: matchedOrder.status,
          tracking: matchedOrder.tracking,
          self_tracking: matchedOrder.self_tracking,
          to: matchedOrder.to?.name
        });
        try {
          const trackingRes = await fetch(`${config.baseUrl}/api/v2/me/shipment/tracking`, {
            method: "POST",
            headers,
            body: JSON.stringify({ orders: [matchedOrder.id] })
          });
          if (trackingRes.ok) {
            const trackingData = await trackingRes.json();
            const trackingItem = trackingData && typeof trackingData === "object" ? trackingData[matchedOrder.id] : null;
            if (trackingItem && !trackingItem.error) {
              const hierarchy = {
                delivered: 5,
                in_transit: 4,
                posted: 3,
                released: 2,
                generated: 2,
                paid: 1,
                pending: 1,
                canceled: 0
              };
              const orderStatus = String(matchedOrder.status || "").toLowerCase().trim();
              const itemStatus = String(trackingItem.status || "").toLowerCase().trim();
              const bestStatus = (hierarchy[orderStatus] || 0) >= (hierarchy[itemStatus] || 0) ? matchedOrder.status : trackingItem.status;
              return this.normalizeTrackingData(
                matchedOrder.tracking || matchedOrder.self_tracking || trackingCode,
                {
                  ...matchedOrder,
                  ...trackingItem,
                  status: bestStatus,
                  posted_at: matchedOrder.posted_at || trackingItem.posted_at,
                  delivered_at: matchedOrder.delivered_at || trackingItem.delivered_at
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
      const response = await fetch(`${config.baseUrl}/api/v2/me/shipment/tracking`, {
        method: "POST",
        headers,
        body: JSON.stringify({ orders: [trackingCode] })
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
  normalizeTrackingData(trackingCode, item) {
    const statusRaw = String(item.status || "").toLowerCase().trim();
    let status = "pending";
    if (statusRaw.includes("delivered") || statusRaw.includes("entregue")) {
      status = "delivered";
    } else if (statusRaw.includes("canceled") || statusRaw.includes("cancelad")) {
      status = "canceled";
    } else if (statusRaw === "in_transit" || statusRaw.includes("transit") || statusRaw.includes("transito") || statusRaw.includes("out_for_delivery") || statusRaw.includes("saiu para entrega") || statusRaw.includes("encaminhado")) {
      status = "in_transit";
    } else if (statusRaw.includes("posted") || statusRaw.includes("postado")) {
      status = "posted";
    } else {
      status = "pending";
    }
    const events = [];
    if (Array.isArray(item.events) && item.events.length > 0) {
      item.events.forEach((e) => {
        events.push({
          status: e.status || "Movimenta\xE7\xE3o",
          description: e.description || e.action || "Objeto em deslocamento",
          location: e.location || (e.city ? `${e.city}/${e.state}` : "Centro de Distribui\xE7\xE3o"),
          createdAt: e.created_at || e.date || (/* @__PURE__ */ new Date()).toISOString()
        });
      });
    } else {
      if (item.created_at) {
        events.push({
          status: "Etiqueta Gerada",
          description: "Etiqueta de envio gerada no Melhor Envio",
          location: item.from ? `${item.from.city || "Caxias"} / ${item.from.state || "MA"}` : "Caxias / MA",
          createdAt: item.created_at
        });
      }
      if (item.posted_at) {
        events.push({
          status: "Postado",
          description: "Objeto postado na ag\xEAncia da transportadora",
          location: item.from ? `${item.from.city || "Caxias"} / ${item.from.state || "MA"}` : "Caxias / MA",
          createdAt: item.posted_at
        });
      }
      if (item.delivered_at) {
        events.push({
          status: "Entregue",
          description: "Objeto entregue ao destinat\xE1rio",
          location: item.to ? `${item.to.city || "Caxias"} / ${item.to.state || "MA"}` : "Caxias / MA",
          createdAt: item.delivered_at
        });
      }
    }
    let metricDivergence;
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
        occurredAt: div.created_at || (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    return {
      trackingCode: item.tracking || item.self_tracking || trackingCode,
      shipmentId: item.id || item.protocol || trackingCode,
      status,
      statusText: status === "delivered" ? "Entregue ao Destinat\xE1rio" : status === "in_transit" ? "Em Tr\xE2nsito na Transportadora" : status === "posted" ? "Objeto Postado na Ag\xEAncia" : status === "canceled" ? "Envio Cancelado" : statusRaw.includes("released") ? "Etiqueta Liberada para Impress\xE3o" : statusRaw.includes("generated") ? "Etiqueta Pronta / Aguardando Postagem" : "Aguardando Postagem / Em Prepara\xE7\xE3o",
      events,
      metricDivergence,
      rawResponse: item,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  async getOfficialTracking(shipmentId) {
    if (!shipmentId) return null;
    const config = getMelhorEnvioConfig();
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${config.baseUrl}/api/v2/me/orders/${shipmentId}`, {
        headers
      });
      if (res.ok) {
        const data = await res.json();
        const code = data.tracking || data.self_tracking || Array.isArray(data.volumes) && data.volumes[0]?.tracking || null;
        if (code) return String(code).trim();
      }
    } catch (e) {
      console.warn("[MelhorEnvioAdapter] Falha ao buscar tracking oficial:", e);
    }
    return null;
  }
  getFallbackOptions(toCep, box, cartTotal) {
    const cleanCep = toCep.replace(/\D/g, "").padEnd(8, "0");
    const cepPrefix2 = parseInt(cleanCep.slice(0, 2), 10) || 0;
    const isCaxias = cleanCep.startsWith("6560");
    const weightFactor = Math.max((box.weight || 0.8) - 0.5, 0) * 8;
    let basePricePac = 28;
    let basePriceSedex = 44;
    let basePriceJadlog = 26;
    let timePac = 6;
    let timeSedex = 3;
    let timeJadlog = 5;
    if (isCaxias) {
      basePricePac = 18.5;
      basePriceSedex = 26;
      basePriceJadlog = 16.9;
      timePac = 3;
      timeSedex = 2;
      timeJadlog = 3;
    } else if (cepPrefix2 === 65) {
      basePricePac = 22;
      basePriceSedex = 32;
      basePriceJadlog = 20.5;
      timePac = 4;
      timeSedex = 2;
      timeJadlog = 4;
    } else if (cepPrefix2 === 64) {
      basePricePac = 21;
      basePriceSedex = 30;
      basePriceJadlog = 19.5;
      timePac = 4;
      timeSedex = 2;
      timeJadlog = 3;
    } else if (cepPrefix2 >= 40 && cepPrefix2 <= 63) {
      basePricePac = 28.5;
      basePriceSedex = 42;
      basePriceJadlog = 26;
      timePac = 5;
      timeSedex = 3;
      timeJadlog = 5;
    } else if (cepPrefix2 >= 1 && cepPrefix2 <= 39) {
      basePricePac = 34.9;
      basePriceSedex = 58;
      basePriceJadlog = 31.5;
      timePac = 7;
      timeSedex = 3;
      timeJadlog = 6;
    } else if (cepPrefix2 >= 70 && cepPrefix2 <= 79) {
      basePricePac = 36;
      basePriceSedex = 62;
      basePriceJadlog = 33;
      timePac = 7;
      timeSedex = 4;
      timeJadlog = 6;
    } else if (cepPrefix2 >= 80 && cepPrefix2 <= 99) {
      basePricePac = 42;
      basePriceSedex = 74;
      basePriceJadlog = 39;
      timePac = 8;
      timeSedex = 4;
      timeJadlog = 7;
    } else if (cepPrefix2 >= 66 && cepPrefix2 <= 69) {
      basePricePac = 39;
      basePriceSedex = 68;
      basePriceJadlog = 36;
      timePac = 9;
      timeSedex = 4;
      timeJadlog = 8;
    }
    const baseOptions = [];
    if (isCaxias) {
      const isFree = typeof cartTotal === "number" ? cartTotal > 100 : false;
      baseOptions.push({
        id: "entrega-propria-caxias",
        name: "Entrega Pr\xF3pria (Caxias Urbana)",
        company: { id: 99, name: "Evid\xEAncia Express (Entrega Local)", picture: "" },
        price: isFree ? 0 : 10,
        deliveryTime: 1
      });
    }
    baseOptions.push(
      {
        id: "melhorenvio-jadlog-package",
        name: ".Package",
        company: { id: 2, name: "Jadlog", picture: "https://sandbox.melhorenvio.com.br/images/shipping-companies/jadlog.png" },
        price: Math.round((basePriceJadlog + weightFactor) * 100) / 100,
        deliveryTime: timeJadlog
      },
      {
        id: "melhorenvio-correios-pac",
        name: "PAC",
        company: { id: 1, name: "Correios", picture: "https://sandbox.melhorenvio.com.br/images/shipping-companies/correios.png" },
        price: Math.round((basePricePac + weightFactor) * 100) / 100,
        deliveryTime: timePac
      },
      {
        id: "melhorenvio-correios-sedex",
        name: "SEDEX",
        company: { id: 1, name: "Correios", picture: "https://sandbox.melhorenvio.com.br/images/shipping-companies/correios.png" },
        price: Math.round((basePriceSedex + weightFactor * 1.5) * 100) / 100,
        deliveryTime: timeSedex
      }
    );
    return this.enrichOptionsWithBadges(baseOptions);
  }
  enrichOptionsWithBadges(options) {
    let minPrice = Infinity;
    let minTime = Infinity;
    options.forEach((opt) => {
      if (opt.price < minPrice) minPrice = opt.price;
      if (opt.deliveryTime < minTime) minTime = opt.deliveryTime;
    });
    return options.map((opt) => ({
      ...opt,
      isCheapest: opt.price === minPrice,
      isFastest: opt.deliveryTime === minTime
    })).sort((a, b) => a.price - b.price);
  }
  normalizeAddressData(cleanCep, data) {
    if (!data || data.error) return null;
    const street = data.address || data.logradouro || "";
    const neighborhood = data.district || data.bairro || "";
    const city = typeof data.city === "object" ? data.city.city : data.city || data.localidade || "";
    const state = typeof data.city === "object" && data.city.state ? data.city.state.state_abbr : data.uf || data.state || "";
    return {
      postalCode: cleanCep,
      street,
      neighborhood,
      city,
      state,
      district: neighborhood,
      cityId: typeof data.city === "object" ? data.city.id : void 0,
      stateId: typeof data.city === "object" && data.city.state ? data.city.state.id : void 0
    };
  }
  /**
   * Interpreta os payloads enviados via Webhook pelo Melhor Envio
   * Suporta eventos de:
   * - Atualização de rastreamento (tracking)
   * - Mudança de status da etiqueta (posted, delivered, canceled)
   * - Divergência de métrica (aferição de peso/cubagem na agência)
   */
  parseWebhookPayload(payload) {
    if (!payload || typeof payload !== "object") return null;
    const shipment = payload.shipment || payload.order || payload.data || payload;
    const shipmentId = String(shipment.id || payload.id || "").trim();
    const trackingCode = String(
      shipment.tracking || shipment.tracking_code || payload.tracking || payload.tracking_code || ""
    ).trim();
    const statusRaw = String(
      shipment.status || payload.status || payload.event || payload.type || ""
    ).toLowerCase();
    let status;
    let statusText;
    if (statusRaw.includes("delivered") || statusRaw.includes("entregue")) {
      status = "delivered";
      statusText = "Objeto Entregue ao Destinat\xE1rio";
    } else if (statusRaw.includes("canceled") || statusRaw.includes("cancelad")) {
      status = "canceled";
      statusText = "Envio Cancelado";
    } else if (statusRaw.includes("out_for_delivery") || statusRaw.includes("saiu")) {
      status = "in_transit";
      statusText = "Objeto saiu para entrega ao destinat\xE1rio";
    } else if (statusRaw.includes("posted") || statusRaw.includes("postado")) {
      status = "posted";
      statusText = "Objeto postado na ag\xEAncia da transportadora";
    } else if (statusRaw.includes("transit") || statusRaw.includes("moviment") || statusRaw.includes("encaminhado")) {
      status = "in_transit";
      statusText = "Em Tr\xE2nsito na Transportadora";
    }
    const rawEvents = shipment.events || payload.events || (payload.event ? [payload] : []);
    const newEvents = [];
    if (Array.isArray(rawEvents)) {
      for (const e of rawEvents) {
        if (!e) continue;
        newEvents.push({
          status: e.status || e.action || statusText || "Movimenta\xE7\xE3o",
          description: e.description || e.message || e.action || "Objeto em deslocamento",
          location: e.location || (e.city ? `${e.city}/${e.state || ""}` : void 0) || "Centro de Distribui\xE7\xE3o",
          createdAt: e.created_at || e.date || (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    } else if (statusText) {
      newEvents.push({
        status: statusText,
        description: statusText,
        location: "Transportadora",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    let metricDivergence;
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
        occurredAt: divergenceData.created_at || (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    return {
      shipmentId: shipmentId || void 0,
      trackingCode: trackingCode || void 0,
      status,
      statusText,
      newEvents: newEvents.length > 0 ? newEvents : void 0,
      metricDivergence
    };
  }
};

// src/services/shipping/shippingService.ts
var import_meta2 = {};
function readActiveProviderEnv() {
  if (typeof process !== "undefined" && process.env) {
    if (process.env.ACTIVE_SHIPPING_PROVIDER) return process.env.ACTIVE_SHIPPING_PROVIDER;
    if (process.env.VITE_ACTIVE_SHIPPING_PROVIDER) return process.env.VITE_ACTIVE_SHIPPING_PROVIDER;
  }
  try {
    const metaEnv = import_meta2.env;
    if (metaEnv) {
      if (metaEnv.VITE_ACTIVE_SHIPPING_PROVIDER) return metaEnv.VITE_ACTIVE_SHIPPING_PROVIDER;
      if (metaEnv.ACTIVE_SHIPPING_PROVIDER) return metaEnv.ACTIVE_SHIPPING_PROVIDER;
    }
  } catch {
  }
  return "melhorenvio";
}
var ShippingService = class {
  static {
    this.instance = null;
  }
  /**
   * Obtém a instância ativa do provedor de frete configurado
   */
  static getProvider() {
    if (!this.instance) {
      const activeProviderName = readActiveProviderEnv().toLowerCase();
      switch (activeProviderName) {
        case "melhorenvio":
          this.instance = new MelhorEnvioAdapter();
          break;
        default:
          console.warn(
            `[ShippingService] Provedor '${activeProviderName}' desconhecido. Utilizando 'melhorenvio' como padr\xE3o.`
          );
          this.instance = new MelhorEnvioAdapter();
          break;
      }
    }
    return this.instance;
  }
  /**
   * Permite redefinir a instância para testes ou troca em tempo de execução
   */
  static setProvider(provider) {
    this.instance = provider;
  }
  /**
   * Limpa a instância em memória (força nova leitura de configurações)
   */
  static resetProvider() {
    this.instance = null;
  }
};

// src/lib/firebase.ts
var import_app = require("firebase/app");
var import_auth = require("firebase/auth");
var import_firestore = require("firebase/firestore");
var import_storage = require("firebase/storage");
var import_meta3 = {};
var getEnvVar = (key) => {
  let val = "";
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    val = process.env[key];
  } else {
    try {
      val = import_meta3.env ? import_meta3.env[key] : "";
    } catch {
      val = "";
    }
  }
  return String(val || "").replace(/['"]/g, "").trim();
};
var firebaseConfig = {
  projectId: getEnvVar("VITE_FIREBASE_PROJECT_ID"),
  appId: getEnvVar("VITE_FIREBASE_APP_ID"),
  apiKey: getEnvVar("VITE_FIREBASE_API_KEY"),
  authDomain: getEnvVar("VITE_FIREBASE_AUTH_DOMAIN"),
  storageBucket: getEnvVar("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnvVar("VITE_FIREBASE_MESSAGING_SENDER_ID")
};
var app = (0, import_app.initializeApp)(firebaseConfig);
var auth = (0, import_auth.getAuth)(app);
var firestoreDbId = getEnvVar("VITE_FIRESTORE_DATABASE_ID") || "ai-studio-09694ade-3353-47cf-8db0-531b70401d1b";
var db = (0, import_firestore.getFirestore)(app, firestoreDbId);
var storage = (0, import_storage.getStorage)(app);
async function testConnection() {
  try {
    await (0, import_firestore.getDocFromServer)((0, import_firestore.doc)(db, "test", "connection"));
    console.log("Firebase Connection verified successfully.");
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    if (errMsg.includes("offline") || errMsg.includes("unavailable") || errMsg.includes("Could not reach")) {
      console.warn("Firestore is operating in offline/unreachable mode. Falling back to local data gracefully. Details:", errMsg);
    } else {
      console.log("Firestore connection test completed (non-blocking).");
    }
  }
}
if (typeof window !== "undefined") {
  testConnection();
}
async function seedDatabaseIfNeeded() {
  try {
    const productsCollectionRef = (0, import_firestore.collection)(db, "products");
    const snapshot = await (0, import_firestore.getDocs)(productsCollectionRef);
    console.log(`Firestore products collection fetched. Total items in database: ${snapshot.size}`);
    try {
      const pixCollectionRef = (0, import_firestore.collection)(db, "pix_transacoes");
      const pixSnapshot = await (0, import_firestore.getDocs)(pixCollectionRef);
      console.log(`\u{1F525} Cole\xE7\xE3o Firestore 'pix_transacoes' conectada e pronta. Total de registros em hist\xF3rico: ${pixSnapshot.size}`);
    } catch {
      console.log("\u{1F525} Cole\xE7\xE3o Firestore 'pix_transacoes' configurada para grava\xE7\xE3o de Pix.");
    }
  } catch (error) {
    console.warn("Firestore collections check:", error);
  }
}
if (typeof window !== "undefined") {
  seedDatabaseIfNeeded();
}

// server.ts
var import_firestore3 = require("firebase/firestore");
var import_supabase_js2 = require("@supabase/supabase-js");

// src/services/serverImageOptimizer.ts
var import_sharp = __toESM(require("sharp"), 1);

// src/services/imageOptimizationService.ts
var MAX_IMAGE_FILE_SIZE = 8 * 1024 * 1024;
var DEFAULT_WEBP_QUALITY = 0.8;
var DEFAULT_THUMBNAIL_SIZE = 150;
var MAX_DIMENSION = 1600;
function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: "Nenhum arquivo fornecido." };
  }
  if (file.size > MAX_IMAGE_FILE_SIZE) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `A imagem possui ${sizeMb}MB. O limite m\xE1ximo permitido para upload \xE9 de 8MB.`
    };
  }
  const mime = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  const validExtensions = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".bmp", ".gif", ".heic"];
  const hasValidExt = validExtensions.some((ext) => name.endsWith(ext));
  const hasValidMime = mime.startsWith("image/");
  if (!hasValidMime && !hasValidExt && name) {
    return {
      valid: false,
      error: "Formato de arquivo inv\xE1lido. Por favor, envie uma imagem (JPG, PNG, WEBP ou HEIC)."
    };
  }
  return { valid: true };
}

// src/services/serverImageOptimizer.ts
async function optimizeBufferToWebP(inputBuffer, options) {
  const quality = Math.round((options?.quality ?? DEFAULT_WEBP_QUALITY) * 100);
  const maxW = options?.maxWidth || MAX_DIMENSION;
  const maxH = options?.maxHeight || MAX_DIMENSION;
  const originalSize = inputBuffer.length;
  let pipeline = (0, import_sharp.default)(inputBuffer).rotate();
  const meta = await pipeline.metadata();
  if (meta.width && meta.width > maxW || meta.height && meta.height > maxH) {
    pipeline = pipeline.resize(maxW, maxH, {
      fit: "inside",
      withoutEnlargement: true
    });
  }
  let webpBuffer = await pipeline.webp({ quality, effort: 4 }).toBuffer();
  if (webpBuffer.length > 500 * 1024 && quality > 72) {
    webpBuffer = await (0, import_sharp.default)(inputBuffer).rotate().resize(Math.min(maxW, 1400), Math.min(maxH, 1400), {
      fit: "inside",
      withoutEnlargement: true
    }).webp({ quality: 72, effort: 4 }).toBuffer();
  }
  const webpMeta = await (0, import_sharp.default)(webpBuffer).metadata();
  const optimizedSize = webpBuffer.length;
  const ratio = Math.max(0, Math.round((originalSize - optimizedSize) / originalSize * 100));
  return {
    buffer: webpBuffer,
    mimeType: "image/webp",
    extension: "webp",
    width: webpMeta.width || 0,
    height: webpMeta.height || 0,
    originalSize,
    optimizedSize,
    compressionRatio: ratio
  };
}
async function generateThumbnailBuffer(inputBuffer, options) {
  const size = options?.size || DEFAULT_THUMBNAIL_SIZE;
  const quality = Math.round((options?.quality ?? 0.75) * 100);
  const thumbBuffer = await (0, import_sharp.default)(inputBuffer).rotate().resize(size, size, {
    fit: "cover",
    position: "centre"
  }).webp({ quality, effort: 3 }).toBuffer();
  return {
    buffer: thumbBuffer,
    mimeType: "image/webp",
    extension: "webp",
    width: size,
    height: size,
    size: thumbBuffer.length
  };
}

// src/services/supabaseStorageService.ts
var import_supabase_js = require("@supabase/supabase-js");
var import_firestore2 = require("firebase/firestore");

// src/utils/placeholder.ts
var isPlaceholderUrl = (url) => {
  if (!url || typeof url !== "string") return true;
  const clean = url.trim().toLowerCase();
  if (!clean || clean === "null" || clean === "undefined" || clean === "none" || clean === "sem foto") return true;
  if (/^[a-z]:[\\/]/.test(clean) || clean.startsWith("\\\\")) {
    return true;
  }
  if (clean.includes("via.placeholder.com") || clean.includes("placehold.co") || clean.includes("placehold.it") || clean.includes("dummyimage.com")) {
    return true;
  }
  if (clean.startsWith("data:image/svg") && (clean.includes("sem%20foto") || clean.includes("sem foto") || clean.includes("sem-foto"))) {
    return true;
  }
  return false;
};
var isValidWebPhotoUrl = (url) => {
  if (!url || typeof url !== "string") return false;
  const clean = url.trim();
  if (!clean || clean.length < 5) return false;
  if (isPlaceholderUrl(clean)) return false;
  const lower = clean.toLowerCase();
  if (lower.startsWith("http://") || lower.startsWith("https://") || lower.startsWith("data:image/") || lower.startsWith("blob:") || lower.startsWith("/") && !lower.startsWith("//") && !lower.includes("\\")) {
    return true;
  }
  return false;
};

// src/services/supabaseStorageService.ts
function preserveExistingImages(existingImages, newUrls) {
  const result = [];
  const addUrl = (url) => {
    if (typeof url === "string" && isValidWebPhotoUrl(url)) {
      const clean = url.trim();
      if (!result.includes(clean)) {
        result.push(clean);
      }
    }
  };
  if (Array.isArray(existingImages)) {
    existingImages.forEach(addUrl);
  }
  if (Array.isArray(newUrls)) {
    newUrls.forEach(addUrl);
  }
  return result;
}

// server.ts
var app2 = (0, import_express.default)();
var PORT = 3e3;
var uploadStorage = import_multer.default.memoryStorage();
var uploadMiddleware = (0, import_multer.default)({
  storage: uploadStorage,
  limits: { fileSize: MAX_IMAGE_FILE_SIZE }
});
var EVIDENCIA_API_BASE = process.env.VITE_API_URL ? process.env.VITE_API_URL.replace(/\/api\/v1\/?$/, "") : "";
var EVIDENCIA_LOGIN_URL = process.env.VITE_API_URL ? `${process.env.VITE_API_URL.replace(/\/$/, "")}/login` : `${EVIDENCIA_API_BASE}/api/v1/login`;
var EVIDENCIA_CREDENTIALS = {
  usuario: process.env.EVIDENCIA_API_USER,
  senha: process.env.EVIDENCIA_API_PASSWORD,
  loja: process.env.EVIDENCIA_API_LOJA
};
var cachedToken = null;
var tokenExpiresAt = 0;
var pendingTokenPromise = null;
app2.use(import_express.default.json({ limit: "10mb" }));
app2.use(import_express.default.urlencoded({ extended: true, limit: "10mb" }));
function parseJwtExp(token) {
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      while (base64.length % 4) {
        base64 += "=";
      }
      const payloadStr = Buffer.from(base64, "base64").toString("utf-8");
      const payload = JSON.parse(payloadStr);
      if (payload.exp && typeof payload.exp === "number") {
        return payload.exp * 1e3;
      }
    }
  } catch (err) {
    console.warn("[Backend Auth] Falha ao decodificar exp do JWT:", err);
  }
  return Date.now() + 1 * 60 * 60 * 1e3;
}
async function getValidToken(forceRefresh = false) {
  const now = Date.now();
  if (forceRefresh) {
    cachedToken = null;
    tokenExpiresAt = 0;
  }
  const envToken = process.env.EVIDENCIA_API_TOKEN?.trim() || process.env.EVIDENCIA_TOKEN?.trim();
  if (envToken && !forceRefresh) {
    const exp = parseJwtExp(envToken);
    if (exp > now + 6e4) {
      cachedToken = envToken;
      tokenExpiresAt = exp;
      return cachedToken;
    }
  }
  if (!forceRefresh && cachedToken && tokenExpiresAt > now + 6e4) {
    return cachedToken;
  }
  if (pendingTokenPromise) {
    return pendingTokenPromise;
  }
  pendingTokenPromise = (async () => {
    console.log(
      "[Backend Auth] Renovando token via login na API da Evid\xEAncia Cal\xE7ados..."
    );
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8e3);
    try {
      const res = await fetch(EVIDENCIA_LOGIN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(EVIDENCIA_CREDENTIALS),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        throw new Error(`Login falhou na API Evid\xEAncia: HTTP ${res.status}`);
      }
      const data = await res.json();
      const token = data.token || data.access_token || data.accessToken || data.data && (data.data.token || data.data.access_token);
      if (!token) {
        throw new Error("Token de acesso n\xE3o retornado pela API remota.");
      }
      cachedToken = token;
      tokenExpiresAt = parseJwtExp(token);
      console.log(
        `[Backend Auth] Token obtido com sucesso via login. V\xE1lido at\xE9: ${new Date(tokenExpiresAt).toLocaleString("pt-BR")}`
      );
      return token;
    } catch (err) {
      clearTimeout(timeoutId);
      console.error("[Backend Auth Error]", err.message);
      throw new Error(`Falha na autentica\xE7\xE3o do backend: ${err.message}`);
    } finally {
      pendingTokenPromise = null;
    }
  })();
  return pendingTokenPromise;
}
app2.get("/api/auth-token", async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const force = req.query.force === "true";
    const token = await getValidToken(force);
    return res.json({ success: true, token });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
var PIX_CACHE_FILE = import_path.default.join(os.tmpdir(), "evidencia_pix_cache.json");
var pixCacheMap = /* @__PURE__ */ new Map();
function loadPixCache() {
  try {
    if (import_fs.default.existsSync(PIX_CACHE_FILE)) {
      const raw = import_fs.default.readFileSync(PIX_CACHE_FILE, "utf-8");
      const json = JSON.parse(raw);
      pixCacheMap = new Map(Object.entries(json));
      console.log(`[Pix Cache] Carregadas ${pixCacheMap.size} transa\xE7\xF5es em cache de arquivo.`);
    }
  } catch (err) {
    console.warn("[Pix Cache] Falha ao carregar arquivo de cache:", err.message);
  }
}
function savePixCache() {
  try {
    const obj = Object.fromEntries(pixCacheMap.entries());
    import_fs.default.writeFileSync(PIX_CACHE_FILE, JSON.stringify(obj, null, 2), "utf-8");
  } catch (err) {
    console.warn("[Pix Cache] Falha ao salvar arquivo de cache:", err.message);
  }
}
loadPixCache();
function getPixDocId(parcelKey) {
  return parcelKey.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
}
async function savePixToFirestore(record) {
  try {
    const docId = getPixDocId(record.parcelKey);
    const docRef = (0, import_firestore3.doc)(db, "pix_transacoes", docId);
    await (0, import_firestore3.setDoc)(
      docRef,
      {
        ...record,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      },
      { merge: true }
    );
    console.log(`[Firestore Pix] Documento 'pix_transacoes/${docId}' salvo no Firestore (Payment ID #${record.payment_id}).`);
  } catch (err) {
    console.warn(`[Firestore Pix Warn] Falha ao salvar 'pix_transacoes' no Firestore:`, err.message);
  }
}
async function getPixFromFirestore(parcelKey) {
  try {
    const docId = getPixDocId(parcelKey);
    const docRef = (0, import_firestore3.doc)(db, "pix_transacoes", docId);
    const snap = await (0, import_firestore3.getDoc)(docRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    console.warn(`[Firestore Pix Warn] Erro ao consultar 'pix_transacoes/${parcelKey}':`, err.message);
  }
  return null;
}
async function updatePixStatusInFirestore(parcelKey, status) {
  try {
    const docId = getPixDocId(parcelKey);
    const docRef = (0, import_firestore3.doc)(db, "pix_transacoes", docId);
    await (0, import_firestore3.updateDoc)(docRef, {
      status,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    console.log(`[Firestore Pix Status] Status de 'pix_transacoes/${docId}' atualizado para '${status}'.`);
  } catch (err) {
    console.warn(`[Firestore Pix Status Warn] Falha ao atualizar status no Firestore:`, err.message);
  }
}
app2.post("/gerar-pix-parcela", async (req, res) => {
  const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN?.replace(/['"]/g, "").trim();
  if (!mpToken) {
    console.error("[Pix MP] MERCADO_PAGO_ACCESS_TOKEN n\xE3o configurado no .env");
    return res.status(500).json({ success: false, message: "Integra\xE7\xE3o Pix n\xE3o configurada no servidor. Adicione o MERCADO_PAGO_ACCESS_TOKEN no .env." });
  }
  const { valor, descricao, emailCliente, nomeCliente, cpfCliente, externalReference, forceNew } = req.body || {};
  if (!valor || typeof valor !== "number" || valor <= 0) {
    return res.status(400).json({ success: false, message: "Campo 'valor' inv\xE1lido. Informe um n\xFAmero positivo." });
  }
  if (!descricao || typeof descricao !== "string") {
    return res.status(400).json({ success: false, message: "Campo 'descricao' \xE9 obrigat\xF3rio." });
  }
  if (!emailCliente || typeof emailCliente !== "string" || !emailCliente.includes("@")) {
    return res.status(400).json({ success: false, message: "Campo 'emailCliente' inv\xE1lido." });
  }
  const parcelKey = String(externalReference || descricao).trim().toLowerCase();
  const now = Date.now();
  let existing = null;
  if (parcelKey) {
    existing = await getPixFromFirestore(parcelKey);
  }
  if (!existing && parcelKey && pixCacheMap.has(parcelKey)) {
    const c = pixCacheMap.get(parcelKey);
    existing = {
      parcelKey,
      payment_id: c.payment_id,
      qr_code: c.qr_code,
      qr_code_base64: c.qr_code_base64,
      transaction_amount: c.valor,
      status: "pending",
      emailCliente: c.emailCliente,
      descricao: c.descricao,
      createdAt: c.createdAt,
      expires_at: c.expiresAt,
      expirationDateIso: c.expirationDateIso
    };
  }
  if (!forceNew && existing && (existing.status === "pending" || !existing.status)) {
    const isExpired = existing.expires_at <= now + 6e4;
    const amountChanged = Math.abs(existing.transaction_amount - valor) > 0.01;
    if (!isExpired && !amountChanged) {
      const remainingMin = Math.max(1, Math.round((existing.expires_at - now) / 6e4));
      console.log(
        `[Pix MP Firestore] Reutilizando QR Code ativo no Firestore para '${parcelKey}' (Valor: R$ ${valor.toFixed(2)}, expira em ~${remainingMin} min, ID #${existing.payment_id})`
      );
      return res.json({
        success: true,
        payment_id: existing.payment_id,
        qr_code: existing.qr_code,
        qr_code_base64: existing.qr_code_base64,
        expires_at: existing.expires_at,
        reused: true
      });
    }
    if (amountChanged) {
      console.log(
        `[Pix MP Firestore] Valor da parcela mudou no MobLink ERP de R$ ${existing.transaction_amount.toFixed(2)} para R$ ${valor.toFixed(2)} (Juros/ERP). Cancelando Pix antigo #${existing.payment_id} no Mercado Pago & Firestore...`
      );
      fetch(`https://api.mercadopago.com/v1/payments/${existing.payment_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mpToken}`
        },
        body: JSON.stringify({ status: "cancelled" })
      }).catch((err) => console.warn("[Pix MP Cancel Error]", err.message));
      await updatePixStatusInFirestore(parcelKey, "cancelled");
    } else if (isExpired) {
      console.log(`[Pix MP Firestore] QR Code anterior para '${parcelKey}' expirou. Atualizando status no Firestore e gerando novo QR Code.`);
      await updatePixStatusInFirestore(parcelKey, "expired");
    }
  }
  const EXPIRATION_MINUTES = 30;
  const expiresAtMs = now + EXPIRATION_MINUTES * 6e4;
  const dateOfExpirationIso = new Date(expiresAtMs).toISOString();
  const payerObj = { email: emailCliente };
  if (nomeCliente && typeof nomeCliente === "string") {
    const parts = nomeCliente.trim().split(" ");
    payerObj.first_name = parts[0] || "Cliente";
    if (parts.length > 1) {
      payerObj.last_name = parts.slice(1).join(" ");
    }
  }
  if (cpfCliente && typeof cpfCliente === "string") {
    const cleanCpf = cpfCliente.replace(/\D/g, "");
    if (cleanCpf.length === 11) {
      payerObj.identification = {
        type: "CPF",
        number: cleanCpf
      };
    }
  }
  const cleanAmount = Number(Number(valor || 0).toFixed(2));
  const finalAmount = Math.max(1, cleanAmount);
  const paymentBody = {
    transaction_amount: finalAmount,
    description: String(descricao).slice(0, 200),
    payment_method_id: "pix",
    date_of_expiration: dateOfExpirationIso,
    payer: payerObj,
    additional_info: {
      items: [
        {
          id: String(externalReference || `parcela-${Date.now()}`).slice(0, 64),
          title: String(descricao).slice(0, 255),
          description: String(descricao).slice(0, 255),
          quantity: 1,
          unit_price: finalAmount
        }
      ]
    }
  };
  if (externalReference && typeof externalReference === "string") {
    paymentBody.external_reference = String(externalReference).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15e3);
  try {
    console.log(`[Pix MP] Criando novo pagamento Pix de R$ ${valor.toFixed(2)} para ${emailCliente} (V\xE1lido por ${EXPIRATION_MINUTES} min)...`);
    const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mpToken}`,
        "X-Idempotency-Key": `pix-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      },
      body: JSON.stringify(paymentBody),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const data = await mpRes.json();
    if (!mpRes.ok) {
      console.error("[Pix MP] Erro na API do Mercado Pago:", data);
      const detail = data?.message || data?.cause?.[0]?.description || `HTTP ${mpRes.status}`;
      return res.status(mpRes.status >= 400 && mpRes.status < 500 ? 400 : 502).json({ success: false, message: `Erro ao gerar Pix: ${detail}` });
    }
    const txData = data.point_of_interaction?.transaction_data;
    if (!txData?.qr_code) {
      console.error("[Pix MP] Resposta inesperada \u2013 sem qr_code:", JSON.stringify(data).slice(0, 500));
      return res.status(502).json({ success: false, message: "QR Code Pix n\xE3o retornado pelo Mercado Pago." });
    }
    console.log(`[Pix MP] Pagamento #${data.id} gerado com sucesso.`);
    const firestoreRecord = {
      parcelKey,
      payment_id: data.id,
      qr_code: txData.qr_code,
      qr_code_base64: txData.qr_code_base64 || null,
      transaction_amount: Number(valor),
      status: "pending",
      emailCliente,
      nomeCliente: nomeCliente || void 0,
      cpfCliente: cpfCliente || void 0,
      descricao,
      externalReference: externalReference || void 0,
      createdAt: now,
      expires_at: expiresAtMs,
      expirationDateIso: dateOfExpirationIso,
      audited: false
    };
    await savePixToFirestore(firestoreRecord);
    const cacheEntry = {
      payment_id: data.id,
      qr_code: txData.qr_code,
      qr_code_base64: txData.qr_code_base64 || null,
      valor,
      descricao,
      emailCliente,
      createdAt: now,
      expiresAt: expiresAtMs,
      expirationDateIso: dateOfExpirationIso
    };
    if (parcelKey) {
      pixCacheMap.set(parcelKey, cacheEntry);
      savePixCache();
    }
    return res.json({
      success: true,
      payment_id: data.id,
      qr_code: txData.qr_code,
      qr_code_base64: txData.qr_code_base64 || null,
      expires_at: expiresAtMs,
      reused: false
    });
  } catch (err) {
    clearTimeout(timeoutId);
    console.error("[Pix MP Error]", err.message);
    return res.status(503).json({ success: false, message: `Falha ao conectar com Mercado Pago: ${err.message}` });
  }
});
app2.get("/verificar-pix/:paymentId", async (req, res) => {
  const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN?.replace(/['"]/g, "").trim();
  if (!mpToken) {
    return res.status(500).json({ success: false, message: "Integra\xE7\xE3o Pix n\xE3o configurada no servidor." });
  }
  const { paymentId } = req.params;
  if (!paymentId || !/^\d+$/.test(paymentId)) {
    return res.status(400).json({ success: false, message: "ID de pagamento inv\xE1lido." });
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1e4);
  try {
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mpToken}`
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const data = await mpRes.json();
    if (!mpRes.ok) {
      const detail = data?.message || `HTTP ${mpRes.status}`;
      return res.status(mpRes.status === 404 ? 404 : 502).json({ success: false, message: `Erro ao consultar pagamento: ${detail}` });
    }
    if (data.status) {
      const parcelKeyMatch = Array.from(pixCacheMap.entries()).find(([_, val]) => val.payment_id === data.id)?.[0];
      if (parcelKeyMatch) {
        updatePixStatusInFirestore(parcelKeyMatch, data.status).catch(() => {
        });
      }
    }
    return res.json({
      success: true,
      payment_id: data.id,
      status: data.status,
      status_detail: data.status_detail,
      date_approved: data.date_approved || null,
      transaction_amount: data.transaction_amount
    });
  } catch (err) {
    clearTimeout(timeoutId);
    return res.status(503).json({ success: false, message: `Falha ao consultar Mercado Pago: ${err.message}` });
  }
});
var PIX_AUDIT_FILE = import_path.default.join(process.cwd(), ".pix_audit.json");
var pixAuditMap = /* @__PURE__ */ new Map();
function loadPixAudit() {
  try {
    if (import_fs.default.existsSync(PIX_AUDIT_FILE)) {
      const raw = import_fs.default.readFileSync(PIX_AUDIT_FILE, "utf-8");
      const json = JSON.parse(raw);
      pixAuditMap = new Map(Object.entries(json));
    }
  } catch (err) {
    console.warn("[Pix Audit] Falha ao carregar auditorias:", err.message);
  }
}
function savePixAudit() {
  try {
    const obj = Object.fromEntries(pixAuditMap.entries());
    import_fs.default.writeFileSync(PIX_AUDIT_FILE, JSON.stringify(obj, null, 2), "utf-8");
  } catch (err) {
    console.warn("[Pix Audit] Falha ao salvar auditorias:", err.message);
  }
}
loadPixAudit();
app2.get("/listar-pix-transacoes", async (req, res) => {
  try {
    const colRef = (0, import_firestore3.collection)(db, "pix_transacoes");
    const snap = await (0, import_firestore3.getDocs)(colRef);
    if (!snap.empty) {
      const transactions2 = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        const auditInfo = pixAuditMap.get(String(d.payment_id)) || { audited: Boolean(d.audited) };
        return {
          parcelKey: d.parcelKey,
          payment_id: d.payment_id,
          valor: d.transaction_amount || d.valor,
          descricao: d.descricao,
          emailCliente: d.emailCliente,
          createdAt: d.createdAt,
          expiresAt: d.expires_at,
          expirationDateIso: d.expirationDateIso,
          audited: Boolean(auditInfo.audited || d.audited),
          auditedBy: auditInfo.auditedBy || d.auditedBy || null,
          auditedAt: auditInfo.auditedAt || d.auditedAt || null,
          status: d.status
        };
      });
      return res.json({ success: true, transactions: transactions2 });
    }
  } catch (err) {
    console.warn("[Firestore List Warn] Falha ao consultar Firestore, usando cache local:", err.message);
  }
  const transactions = Array.from(pixCacheMap.entries()).map(([key, item]) => {
    const auditInfo = pixAuditMap.get(String(item.payment_id)) || { audited: false };
    return {
      parcelKey: key,
      payment_id: item.payment_id,
      valor: item.valor,
      descricao: item.descricao,
      emailCliente: item.emailCliente,
      createdAt: item.createdAt,
      expiresAt: item.expiresAt,
      expirationDateIso: item.expirationDateIso,
      audited: Boolean(auditInfo.audited),
      auditedBy: auditInfo.auditedBy || null,
      auditedAt: auditInfo.auditedAt || null,
      status: "pending"
    };
  });
  return res.json({ success: true, transactions });
});
app2.post("/auditar-pix-transacao", async (req, res) => {
  const { paymentId, audited, auditedBy } = req.body || {};
  if (!paymentId) {
    return res.status(400).json({ success: false, message: "paymentId \xE9 obrigat\xF3rio" });
  }
  const key = String(paymentId);
  const auditedByStr = auditedBy || "Administrador";
  const auditedAtStr = (/* @__PURE__ */ new Date()).toISOString();
  if (audited) {
    pixAuditMap.set(key, {
      audited: true,
      auditedBy: auditedByStr,
      auditedAt: auditedAtStr
    });
  } else {
    pixAuditMap.set(key, { audited: false });
  }
  savePixAudit();
  try {
    const colRef = (0, import_firestore3.collection)(db, "pix_transacoes");
    const q = (0, import_firestore3.query)(colRef, (0, import_firestore3.where)("payment_id", "==", Number(paymentId)));
    const snap = await (0, import_firestore3.getDocs)(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      await (0, import_firestore3.updateDoc)(docSnap.ref, {
        audited: Boolean(audited),
        auditedBy: audited ? auditedByStr : null,
        auditedAt: audited ? auditedAtStr : null,
        updatedAt: auditedAtStr
      });
      console.log(`[Firestore Audit] Atualizado documento '${docSnap.id}' para audited=${audited}`);
    }
  } catch (err) {
    console.warn("[Firestore Audit Warn] Falha ao atualizar auditoria no Firestore:", err.message);
  }
  return res.json({ success: true, paymentId, audited: Boolean(audited) });
});
app2.use("/mp-api", async (req, res) => {
  const subPath = req.url;
  const targetUrl = `https://api.mercadopago.com/v1${subPath}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12e3);
  const options = {
    method: req.method,
    headers: {
      "Content-Type": "application/json"
    },
    signal: controller.signal
  };
  if (req.headers.authorization) {
    options.headers["Authorization"] = req.headers.authorization;
  } else {
    const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN?.replace(/['"]/g, "").trim();
    if (mpToken) {
      options.headers["Authorization"] = `Bearer ${mpToken}`;
    }
  }
  if (req.headers["x-idempotency-key"]) {
    options.headers["X-Idempotency-Key"] = req.headers["x-idempotency-key"];
  }
  if (["POST", "PUT", "PATCH"].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
    options.body = JSON.stringify(req.body);
  }
  try {
    const apiRes = await fetch(targetUrl, options);
    clearTimeout(timeoutId);
    const contentType = apiRes.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);
    const data = await apiRes.text();
    return res.status(apiRes.status).send(data);
  } catch (err) {
    clearTimeout(timeoutId);
    return res.status(503).json({ success: false, message: `Falha no proxy MP (Backend): ${err.message}` });
  }
});
var DDG_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
async function handleSearchProductImages(req, res) {
  try {
    const q = String(req.query?.q || "").trim();
    if (!q) {
      return res.json({ success: true, results: [] });
    }
    const limit = parseInt(String(req.query?.limit || "12"), 10) || 12;
    const vqdRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(q)}`, {
      headers: { "User-Agent": DDG_USER_AGENT }
    });
    const html = await vqdRes.text();
    const vqdMatch = html.match(/vqd=["']?([0-9-]+)["']?/) || html.match(/vqd=([0-9-]+)/);
    const vqd = vqdMatch ? vqdMatch[1] : null;
    if (!vqd) {
      return res.json({ success: true, results: [] });
    }
    const imgUrl = `https://duckduckgo.com/i.js?l=wt-wt&o=json&q=${encodeURIComponent(q)}&vqd=${vqd}&f=,,,&p=1`;
    const imgRes = await fetch(imgUrl, {
      headers: {
        "User-Agent": DDG_USER_AGENT,
        "Referer": "https://duckduckgo.com/"
      }
    });
    const data = await imgRes.json();
    const results = (data.results || []).filter((r) => r.image && !r.image.endsWith(".svg") && !r.image.includes("favicon")).slice(0, limit).map((r) => ({
      title: r.title,
      image: r.image,
      thumbnail: r.thumbnail || r.image,
      source: r.url,
      width: r.width,
      height: r.height
    }));
    return res.json({ success: true, results });
  } catch (err) {
    console.error("[API search-product-images Error]:", err.message);
    return res.status(500).json({ success: false, error: err.message || "Erro na busca de imagens" });
  }
}
app2.get("/api/search-product-images", handleSearchProductImages);
app2.get("/assistant-api/search-product-images", handleSearchProductImages);
function cleanFootwearRawText(raw) {
  return String(raw || "").replace(/([a-z0-9\)])([A-Z][a-z]+:)/g, "$1 \n $2").replace(/(Fecho|Fechamento|Palmilha|Solado|Altura\s+do\s+salto|Salto|Cabedal|Material|Gênero|Marca|Indicado\s+para|Uso|Ocasião|Garantia|Peso|Origem):/gi, "\n$1: ");
}
function extractFootwearInsights(results) {
  const allText = results.map((r) => cleanFootwearRawText(`${r.title || ""} ${r.snippet || ""}`)).join("\n");
  const cleanVal = (val) => val ? val.trim().replace(/^[:\-\s]+/, "").replace(/[\s\.\,]+$/, "") : "";
  let alturaSalto = "";
  const saltoExplicit = allText.match(/(?:altura\s+do\s+salto|salto)\s*:\s*(\d+(?:[.,]\d+)?\s*(?:cm|cent[íi]metros?)|[^,;.\n]+)/i);
  if (saltoExplicit) {
    alturaSalto = cleanVal(saltoExplicit[1]);
  } else {
    const saltoCm = allText.match(/(\d+(?:[,.]\d+)?\s*(?:cm|cent[íi]metros?))/i);
    const saltoTipo = allText.match(/(salto\s+(?:bloco|fino|baixo|alto|m[ée]dio|anabela|plataforma|tratorado|raso|geom[ée]trico)[^,.;\n]*)/i);
    if (saltoTipo && saltoCm) {
      alturaSalto = `${cleanVal(saltoTipo[1])} (${cleanVal(saltoCm[1])})`;
    } else if (saltoTipo) {
      alturaSalto = cleanVal(saltoTipo[1]);
    } else if (saltoCm) {
      alturaSalto = cleanVal(saltoCm[1]);
    }
  }
  let bico = "";
  const bicoMatch = allText.match(/(bico\s+(?:redondo|fino|quadrado|folha|aberto))/i);
  if (bicoMatch) bico = cleanVal(bicoMatch[1]);
  let fecho = "";
  const fechoExplicit = allText.match(/(?:fecho|fechamento)\s*:\s*([^,.;\n]+)/i);
  if (fechoExplicit) {
    fecho = cleanVal(fechoExplicit[1]);
  } else {
    const fechoQuick = allText.match(/(tiras?\s+(?:el[áa]sticas?|autocolantes?)|fivela\s+ajust[áa]vel|cadar[çc]o|slip\s+on|calce\s+f[áa]cil)/i);
    if (fechoQuick) fecho = cleanVal(fechoQuick[1]);
  }
  let palmilha = "";
  const palmilhaExplicit = allText.match(/palmilha\s*:\s*([^,.;\n]+)/i);
  if (palmilhaExplicit) {
    palmilha = cleanVal(palmilhaExplicit[1]);
  } else {
    const palmilhaQuick = allText.match(/(palmilha\s+(?:macia|anat[ôo]mica|confort[^\s,.;]*|em\s+eva|espuma|revestida)[^,.;\n]*)/i);
    if (palmilhaQuick) palmilha = cleanVal(palmilhaQuick[1]);
  }
  let solado = "";
  const soladoExplicit = allText.match(/solado\s*:\s*([^,.;\n]+)/i);
  if (soladoExplicit) {
    solado = cleanVal(soladoExplicit[1]);
  } else {
    const soladoQuick = allText.match(/(solado\s+(?:emborrachado|antiderrapante|tratorado|sint[ée]tico|em\s+tr|eva)[^,.;\n]*)/i);
    if (soladoQuick) solado = cleanVal(soladoQuick[1]);
  }
  let cabedal = "";
  const cabedalExplicit = allText.match(/(?:cabedal|material\s+externo)\s*:\s*([^,.;\n]+)/i);
  if (cabedalExplicit) {
    cabedal = cleanVal(cabedalExplicit[1]);
  } else {
    const cabedalQuick = allText.match(/(?:confeccionad[oa]|material)\s+(?:em|de)\s+([^,.;\n]+)/i);
    if (cabedalQuick) cabedal = cleanVal(cabedalQuick[1]);
  }
  let ocasiao = "";
  const ocasiaoMatch = allText.match(/(?:indicado\s+para|uso|ocasi[ãa]o)\s*:\s*([^,.;\n]+)/i);
  if (ocasiaoMatch) ocasiao = cleanVal(ocasiaoMatch[1]);
  const candidateSentences = [];
  results.forEach((r) => {
    if (!r.snippet) return;
    const sentences = r.snippet.split(/(?<=[.!?])\s+/);
    for (const s of sentences) {
      const clean = s.trim();
      if (clean.length > 35 && clean.length < 240 && !clean.includes("Frete gr\xE1tis") && !clean.includes("Shopee") && !clean.includes("R$") && !clean.includes("Compre parcelado")) {
        candidateSentences.push(clean);
      }
    }
  });
  const curatedSummary = candidateSentences.slice(0, 2).join(" ");
  return {
    alturaSalto: alturaSalto || void 0,
    bico: bico || void 0,
    fecho: fecho || void 0,
    palmilha: palmilha || void 0,
    solado: solado || void 0,
    cabedal: cabedal || void 0,
    ocasiao: ocasiao || void 0,
    curatedSummary: curatedSummary || void 0
  };
}
async function handleSearchProductWebIntel(req, res) {
  try {
    const q = String(req.query?.q || "").trim();
    if (!q) {
      return res.json({ success: true, results: [], insights: {} });
    }
    const limit = parseInt(String(req.query?.limit || "8"), 10) || 8;
    const duckRes = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, {
      headers: { "User-Agent": DDG_USER_AGENT }
    });
    const html = await duckRes.text();
    const webResults = [];
    const resultBlocks = html.split(/class="result\s/g).slice(1);
    for (const block of resultBlocks) {
      const snippetMatch = block.match(/<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);
      const linkMatch = block.match(/href="([^"]+)"/i);
      const titleMatch = block.match(/<a class="result__a"[^>]*>([\s\S]*?)<\/a>/i);
      if (snippetMatch) {
        const cleanSnippet = snippetMatch[1].replace(/<[^>]+>/g, "").trim();
        const cleanTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "";
        let source = "";
        let link = linkMatch ? linkMatch[1] : "";
        if (link) {
          try {
            const parsedUrl = new URL(link.startsWith("//") ? `https:${link}` : link);
            const uddg = parsedUrl.searchParams.get("uddg");
            if (uddg) {
              const actualUrl = new URL(uddg);
              source = actualUrl.hostname.replace(/^www\./, "");
              link = uddg;
            } else {
              source = parsedUrl.hostname.replace(/^www\./, "");
            }
          } catch {
            source = "web";
          }
        }
        webResults.push({ title: cleanTitle, snippet: cleanSnippet, source, link });
        if (webResults.length >= limit) break;
      }
    }
    const insights = extractFootwearInsights(webResults);
    return res.json({ success: true, query: q, results: webResults, insights });
  } catch (err) {
    console.error("[API search-product-web-intel Error]:", err.message);
    return res.status(500).json({ success: false, error: err.message || "Erro na busca de intelig\xEAncia web" });
  }
}
app2.get("/api/search-product-web-intel", handleSearchProductWebIntel);
app2.get("/assistant-api/search-product-web-intel", handleSearchProductWebIntel);
async function handleSuggestProductDescription(req, res) {
  try {
    const params = req.body || {};
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
    if (geminiKey) {
      try {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const rawBrand = (params.brand || params.fabricante || "").trim();
        const prompt = `Voc\xEA \xE9 um redator especialista em e-commerce de cal\xE7ados para a loja "Evid\xEAncia Cal\xE7ados".
Escreva uma descri\xE7\xE3o limpa, atraente, persuasiva e 100% focada no CLIENTE (comprador final) em formato HTML estruturado.

REGRAS CR\xCDTICAS DE FIDELIDADE E ZERO ESPECULA\xC7\xC3O:
1. MARCA DO PRODUTO: "Evid\xEAncia Cal\xE7ados" \xE9 EXCLUSIVAMENTE o nome da loja/vendedora. NUNCA diga que a marca ou fabricante do cal\xE7ado \xE9 "Evid\xEAncia Cal\xE7ados". Se o campo Marca abaixo estiver vazio ou n\xE3o informado, N\xC3O invente marca e N\xC3O mencione marca no texto e nem inclua a linha "Marca:" na Ficha T\xE9cnica.
2. DADOS N\xC3O CONFIRMADOS: Se qualquer informa\xE7\xE3o (Altura do Salto, Palmilha, Solado, Fechamento, Material) n\xE3o estiver preenchida abaixo ou n\xE3o houver certeza, NUNCA invente medidas ou nomes falsos. Simplesmente omita o item da Ficha T\xE9cnica.
3. LIMPEZA: NUNCA mencione termos t\xE9cnicos internos como "MobLink", "ERP", "Classifica\xE7\xE3o", "C\xF3digo Fiscal", "Unidade UND", "Embalagem", "ID", c\xF3digos de lote internos ou quantidade de estoque num\xE9rico.
4. BENEF\xCDCIOS REAIS: Foque nos benef\xEDcios para quem vai usar (conforto, versatilidade, bem-estar aos p\xE9s, facilidade no dia a dia).

Dados Confirmados do Produto:
- Nome: ${params.name}
${rawBrand ? `- Marca: ${rawBrand}` : "- Marca: (N\xE3o informada - omitir marca)"}
${params.referenceCode ? `- Refer\xEAncia: ${params.referenceCode}` : ""}
- Categoria: ${params.category || "Cal\xE7ados"}
${params.material ? `- Material: ${params.material}` : ""}
${params.webInsights?.cabedal ? `- Material do Cabedal: ${params.webInsights.cabedal}` : ""}
${params.webInsights?.palmilha ? `- Palmilha: ${params.webInsights.palmilha}` : ""}
${params.webInsights?.solado ? `- Solado: ${params.webInsights.solado}` : ""}
${params.webInsights?.alturaSalto ? `- Altura do Salto: ${params.webInsights.alturaSalto}` : ""}
${params.webInsights?.bico ? `- Tipo de Bico: ${params.webInsights.bico}` : ""}
${params.webInsights?.fecho ? `- Fechamento: ${params.webInsights.fecho}` : ""}
${params.webInsights?.ocasiao ? `- Indica\xE7\xE3o de Uso: ${params.webInsights.ocasiao}` : ""}

Tom Desejado: ${params.tone || "comercial"} (comercial = envolvente e pr\xE1tico; luxo = refinado e sofisticado; tecnico = foco na ergonomia e conforto do cal\xE7ado).

Estrutura HTML Obrigat\xF3ria:
1. <h3> T\xEDtulo atraente (ex: <h3>Conforto e Estilo: [Nome do Produto]</h3>)
2. <p> Storytelling leve (1 par\xE1grafo falando sobre a proposta do modelo e versatilidade de uso. Se n\xE3o houver marca, fale diretamente do modelo)
3. <h4>\u2728 Destaques do Produto</h4> (lista <ul> curta com 3-5 t\xF3picos reais sobre conforto, palmilha, solado e calce)
4. <h4>\u{1F4CB} Ficha T\xE9cnica</h4> (lista <ul> limpa contendo APENAS os dados confirmados: ${rawBrand ? "Marca, " : ""}Modelo, Categoria, Cabedal/Material se informado, Palmilha se informada, Solado se informado, Salto se informado, Garantia do Fabricante e Origem)
5. <h4>\u{1F6E1}\uFE0F Garantia & Confian\xE7a Evid\xEAncia Cal\xE7ados</h4> (par\xE1grafo curto destacando produto 100% original, nota fiscal e Troca F\xE1cil em at\xE9 7 dias)

Retorne EXCLUSIVAMENTE os blocos HTML, sem markdown (\`\`\`html), sem cabe\xE7alhos desnecess\xE1rios e sem tags <html>/<body>.`;
        const aiRes = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt
        });
        if (aiRes && aiRes.text) {
          let cleanHtml = aiRes.text.trim();
          if (cleanHtml.startsWith("```html")) cleanHtml = cleanHtml.replace(/^```html\s*/, "").replace(/\s*```$/, "");
          else if (cleanHtml.startsWith("```")) cleanHtml = cleanHtml.replace(/^```\s*/, "").replace(/\s*```$/, "");
          return res.json({
            success: true,
            description: cleanHtml,
            tone: params.tone || "comercial",
            provider: "gemini-2.5-flash"
          });
        }
      } catch (geminiErr) {
        console.warn("[API suggest-product-description] Fallback do Gemini:", geminiErr.message);
      }
    }
    return res.json({ success: false, message: "Fallback para gerador local do cliente" });
  } catch (err) {
    console.error("[API suggest-product-description Error]:", err.message);
    return res.status(500).json({ success: false, error: err.message || "Erro ao sugerir descri\xE7\xE3o" });
  }
}
app2.post("/api/suggest-product-description", handleSuggestProductDescription);
app2.post("/assistant-api/suggest-product-description", handleSuggestProductDescription);
app2.post(["/api/upload-photo-from-url", "/assistant-api/upload-photo-from-url"], async (req, res) => {
  try {
    const { imageUrl, productId } = req.body || {};
    if (!imageUrl || !productId) {
      return res.status(400).json({ success: false, message: "imageUrl e productId s\xE3o obrigat\xF3rios" });
    }
    const imgController = new AbortController();
    const imgTimeout = setTimeout(() => imgController.abort(), 15e3);
    const imgRes = await fetch(imageUrl, {
      headers: { "User-Agent": DDG_USER_AGENT },
      signal: imgController.signal
    });
    clearTimeout(imgTimeout);
    if (!imgRes.ok) {
      return res.status(502).json({ success: false, message: `Falha ao baixar imagem: HTTP ${imgRes.status}` });
    }
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const originalSize = buffer.length;
    const webpResult = await optimizeBufferToWebP(buffer, { quality: DEFAULT_WEBP_QUALITY });
    const thumbResult = await generateThumbnailBuffer(buffer, { size: 200 });
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ success: false, message: "Configura\xE7\xE3o do Supabase n\xE3o encontrada" });
    }
    const supabase = (0, import_supabase_js2.createClient)(supabaseUrl, supabaseKey);
    const cleanProdId = String(productId).trim().replace(/[^a-zA-Z0-9_-]/g, "_");
    const timestamp = Date.now();
    const randomHash = Math.random().toString(36).substring(2, 8);
    const fileName = `produtos/${cleanProdId}/web_foto_${timestamp}_${randomHash}.webp`;
    const thumbFileName = `produtos/${cleanProdId}/web_foto_${timestamp}_${randomHash}_thumb.webp`;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "product-images";
    const { error: uploadErr } = await supabase.storage.from(bucket).upload(fileName, webpResult.buffer, {
      contentType: "image/webp",
      upsert: true
    });
    if (uploadErr) {
      return res.status(500).json({ success: false, message: `Erro no upload: ${uploadErr.message}` });
    }
    await supabase.storage.from(bucket).upload(thumbFileName, thumbResult.buffer, {
      contentType: "image/webp",
      upsert: true
    }).catch(() => {
    });
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    const { data: thumbUrlData } = supabase.storage.from(bucket).getPublicUrl(thumbFileName);
    return res.json({
      success: true,
      webpUrl: urlData.publicUrl,
      publicUrl: urlData.publicUrl,
      thumbnailUrl: thumbUrlData.publicUrl,
      thumbUrl: thumbUrlData.publicUrl,
      stats: {
        originalSize,
        optimizedSize: webpResult.optimizedSize,
        compressionRatio: webpResult.compressionRatio,
        width: webpResult.width,
        height: webpResult.height
      }
    });
  } catch (err) {
    console.error("[API upload-photo-from-url Error]:", err.message);
    return res.status(500).json({ success: false, error: err.message || "Erro ao processar upload" });
  }
});
app2.use(["/api/v1", "/v1"], async (req, res, next) => {
  if (!req.originalUrl.startsWith("/api/v1") && !req.originalUrl.startsWith("/v1")) {
    return next();
  }
  let subPath = req.originalUrl.split("?")[0];
  if (!subPath.startsWith("/api/v1")) {
    subPath = `/api/v1${subPath.replace(/^\/v1/, "")}`;
  }
  const query2 = new URLSearchParams(
    req.query
  ).toString();
  const fullUrl = `${EVIDENCIA_API_BASE}${subPath}${query2 ? `?${query2}` : ""}`;
  let token;
  try {
    token = await getValidToken();
  } catch (err) {
    return res.status(503).json({ success: false, message: err.message });
  }
  const makeProxyRequest = async (authToken) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12e3);
    const options = {
      method: req.method,
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      signal: controller.signal
    };
    if (["POST", "PUT", "PATCH"].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
      options.body = JSON.stringify(req.body);
    }
    const apiRes = await fetch(fullUrl, options);
    clearTimeout(timeoutId);
    return apiRes;
  };
  try {
    let apiRes = await makeProxyRequest(token);
    if (apiRes.status === 401) {
      console.warn(
        `[Backend Proxy] HTTP 401 em ${subPath}. For\xE7ando renova\xE7\xE3o imediata do token...`
      );
      token = await getValidToken(true);
      apiRes = await makeProxyRequest(token);
    }
    if (!apiRes.ok) {
      if (apiRes.status === 404 && subPath.includes("/produtos/grupos")) {
        console.info(
          "[Backend Proxy] Rota remota de grupos indispon\xEDvel (404). Retornando lista vazia de grupos para gera\xE7\xE3o din\xE2mica via cat\xE1logo."
        );
        return res.json([]);
      }
      return res.status(apiRes.status).json({
        success: false,
        message: `API remota retornou HTTP ${apiRes.status}`
      });
    }
    const contentType = apiRes.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await apiRes.json();
      return res.json(data);
    } else {
      const text = await apiRes.text();
      return res.send(text);
    }
  } catch (err) {
    console.error(`[Backend Proxy Error] ${fullUrl}:`, err.message);
    return res.status(503).json({ success: false, message: err.message });
  }
});
app2.get("/api/shipping/auth/status", async (req, res) => {
  try {
    const provider = ShippingService.getProvider();
    const isAuth = await provider.isAuthenticated();
    const headers = await provider.getAuthHeaders();
    return res.json({
      success: true,
      provider: provider.providerName,
      environment: provider.environment,
      authenticated: isAuth,
      userAgent: headers["User-Agent"]
    });
  } catch (error) {
    console.error("[Shipping Auth API Error]:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Erro ao verificar autentica\xE7\xE3o do servi\xE7o de frete"
    });
  }
});
app2.get("/api/shipping/cep/:cep", async (req, res) => {
  try {
    const { cep } = req.params;
    const provider = ShippingService.getProvider();
    const location = await provider.fetchAddressByCep(cep);
    if (!location) {
      return res.status(404).json({ success: false, message: "CEP n\xE3o encontrado pelo provedor" });
    }
    return res.json({ success: true, location });
  } catch (error) {
    console.error("[Shipping CEP API Error]:", error.message);
    return res.status(500).json({ success: false, error: error.message || "Erro ao consultar CEP" });
  }
});
app2.post("/api/shipping/calculate", async (req, res) => {
  try {
    const { toPostalCode, fromPostalCode, box, cartTotal } = req.body || {};
    if (!toPostalCode || typeof toPostalCode !== "string") {
      return res.status(400).json({ success: false, error: "CEP de destino (toPostalCode) \xE9 obrigat\xF3rio." });
    }
    const cleanToCep = toPostalCode.replace(/\D/g, "");
    if (cleanToCep.length !== 8) {
      return res.status(400).json({ success: false, error: "CEP de destino inv\xE1lido. Deve conter 8 n\xFAmeros." });
    }
    const provider = ShippingService.getProvider();
    const options = await provider.calculateShipping({
      toPostalCode: cleanToCep,
      fromPostalCode,
      box,
      cartTotal: typeof cartTotal === "number" ? cartTotal : void 0
    });
    return res.json({
      success: true,
      provider: provider.providerName,
      options
    });
  } catch (error) {
    console.error("[Shipping Calculate API Error]:", error?.message || error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Erro ao realizar cota\xE7\xE3o de frete"
    });
  }
});
app2.post("/api/shipping/labels/generate", async (req, res) => {
  try {
    const { orderId, serviceId, to, products, box, from } = req.body;
    if (!orderId || !to || !products) {
      return res.status(400).json({ success: false, error: "Dados incompletos para gera\xE7\xE3o de etiqueta (orderId, to, products)." });
    }
    const provider = ShippingService.getProvider();
    const result = await provider.createAndBuyLabel({
      orderId,
      serviceId,
      to,
      products,
      box,
      from
    });
    return res.json({
      success: true,
      provider: provider.providerName,
      label: result
    });
  } catch (error) {
    console.error("[Shipping Label Generate API Error]:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Erro ao gerar etiqueta no Melhor Envio"
    });
  }
});
app2.post("/api/shipping/labels/cancel", async (req, res) => {
  try {
    const { shipmentId, reason } = req.body;
    if (!shipmentId) {
      return res.status(400).json({ success: false, error: "shipmentId \xE9 obrigat\xF3rio para cancelamento." });
    }
    const provider = ShippingService.getProvider();
    const success = await provider.cancelLabel(shipmentId, reason);
    return res.json({
      success,
      provider: provider.providerName,
      message: "Solicita\xE7\xE3o de cancelamento enviada."
    });
  } catch (error) {
    console.error("[Shipping Label Cancel API Error]:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Erro ao cancelar etiqueta de frete"
    });
  }
});
app2.post("/api/shipping/track", async (req, res) => {
  try {
    const { trackingCode, shipmentId, melhorEnvioId, orderId } = req.body;
    const searchIdentifier = (trackingCode || shipmentId || melhorEnvioId || "").trim();
    if (!searchIdentifier) {
      return res.status(400).json({ success: false, error: "trackingCode ou melhorEnvioId \xE9 obrigat\xF3rio." });
    }
    const provider = ShippingService.getProvider();
    const tracking = await provider.trackShipment(searchIdentifier);
    if (tracking) {
      console.log(
        `\u{1F4E6} [Shipping Track API] Rastreamento consultado para ${trackingCode}: status="${tracking.status}", statusText="${tracking.statusText}", eventos=${tracking.events?.length || 0}` + (tracking.metricDivergence ? `, diverg\xEAncia=+R$${tracking.metricDivergence.difference}` : "")
      );
      if (tracking.rawResponse) {
        console.log("\u{1F4C4} [API Externa] Dados da API:", JSON.stringify(tracking.rawResponse, null, 2));
      }
    }
    return res.json({
      success: true,
      provider: provider.providerName,
      tracking
    });
  } catch (error) {
    console.error("[Shipping Track API Error]:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Erro ao rastrear envio no Melhor Envio"
    });
  }
});
app2.post("/api/upload-photo", uploadMiddleware.single("file"), async (req, res) => {
  try {
    let inputBuffer = null;
    let fileName = req.file?.originalname || "foto.jpg";
    if (req.file && req.file.buffer) {
      inputBuffer = req.file.buffer;
    } else if (req.body && req.body.image) {
      const base64Str = String(req.body.image);
      const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        inputBuffer = Buffer.from(matches[2], "base64");
      } else {
        inputBuffer = Buffer.from(base64Str, "base64");
      }
    }
    if (!inputBuffer) {
      return res.status(400).json({
        success: false,
        error: "Nenhum arquivo ou buffer de imagem foi enviado no campo 'file' ou 'image'."
      });
    }
    const val = validateImageFile({ size: inputBuffer.length, name: fileName });
    if (!val.valid) {
      return res.status(400).json({ success: false, error: val.error });
    }
    const productId = req.body?.productId ? String(req.body.productId).trim() : "geral";
    const cleanProdId = productId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const timestamp = Date.now();
    const randomHash = Math.random().toString(36).substring(2, 8);
    const baseName = `foto_${timestamp}_${randomHash}`;
    const webpResult = await optimizeBufferToWebP(inputBuffer, { quality: DEFAULT_WEBP_QUALITY });
    const thumbResult = await generateThumbnailBuffer(inputBuffer, { size: 150 });
    const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_KEY || "";
    const supabaseBucket = process.env.VITE_SUPABASE_BUCKET || "products";
    let webpUrl = "";
    let thumbUrl = "";
    if (supabaseUrl && supabaseKey) {
      const supabase = (0, import_supabase_js2.createClient)(supabaseUrl, supabaseKey);
      const mainPath = `produtos/${cleanProdId}/${baseName}.webp`;
      const thumbPath = `produtos/${cleanProdId}/thumbnails/${baseName}_thumb.webp`;
      const { error: upErr } = await supabase.storage.from(supabaseBucket).upload(mainPath, webpResult.buffer, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: true
      });
      if (upErr) {
        throw new Error(`Erro ao enviar foto para o Supabase: ${upErr.message}`);
      }
      await supabase.storage.from(supabaseBucket).upload(thumbPath, thumbResult.buffer, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: true
      });
      const { data: mainPublic } = supabase.storage.from(supabaseBucket).getPublicUrl(mainPath);
      const { data: thumbPublic } = supabase.storage.from(supabaseBucket).getPublicUrl(thumbPath);
      webpUrl = mainPublic.publicUrl;
      thumbUrl = thumbPublic.publicUrl;
    } else {
      webpUrl = `data:image/webp;base64,${webpResult.buffer.toString("base64")}`;
      thumbUrl = `data:image/webp;base64,${thumbResult.buffer.toString("base64")}`;
    }
    let allImages = [webpUrl];
    if (db && productId && productId !== "geral") {
      try {
        const prodRef = (0, import_firestore3.doc)(db, "products", productId);
        const snap = await (0, import_firestore3.getDoc)(prodRef);
        if (snap.exists()) {
          const existingData = snap.data();
          const existingImages = existingData?.images || [];
          allImages = preserveExistingImages(existingImages, [
            existingData?.imageUrl,
            existingData?.foto_uri,
            webpUrl
          ]);
          await (0, import_firestore3.updateDoc)(prodRef, {
            images: allImages,
            imageUrl: allImages[0] || webpUrl,
            foto_uri: allImages[0] || webpUrl,
            thumbnailUrl: thumbUrl,
            updatedAt: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
      } catch (dbErr) {
        console.warn("[Upload Photo] Aviso ao atualizar Firestore:", dbErr.message);
      }
    }
    return res.status(200).json({
      success: true,
      webpUrl,
      thumbnailUrl: thumbUrl,
      images: allImages,
      stats: {
        originalSize: webpResult.originalSize,
        optimizedSize: webpResult.optimizedSize,
        compressionRatio: webpResult.compressionRatio,
        width: webpResult.width,
        height: webpResult.height
      }
    });
  } catch (err) {
    console.error("[Upload Photo Error]:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Erro interno ao processar e otimizar a imagem."
    });
  }
});
app2.post("/api/webhooks/shipping", async (req, res) => {
  console.log("\u{1F4E6} [Shipping Webhook] Notifica\xE7\xE3o recebida do Melhor Envio:", JSON.stringify(req.body));
  try {
    const provider = ShippingService.getProvider();
    const parsed = provider.parseWebhookPayload(req.body);
    if (!parsed) {
      console.warn("\u26A0\uFE0F [Shipping Webhook] Payload n\xE3o reconhecido ou vazio.");
      return res.status(200).json({ received: true, ignored: true });
    }
    const { shipmentId, trackingCode, status, statusText, newEvents, metricDivergence } = parsed;
    if (!shipmentId && !trackingCode) {
      console.warn("\u26A0\uFE0F [Shipping Webhook] Webhook sem identificador de envio (shipmentId ou trackingCode ausentes).");
      return res.status(200).json({ received: true, ignored: true });
    }
    if (!db) {
      console.warn("\u26A0\uFE0F [Shipping Webhook] Firestore n\xE3o inicializado no servidor.");
      return res.status(200).json({ received: true, warning: "database_not_connected" });
    }
    const ordersCol = (0, import_firestore3.collection)(db, "orders");
    let targetOrderDoc = null;
    if (shipmentId) {
      const qShipment = (0, import_firestore3.query)(ordersCol, (0, import_firestore3.where)("melhorEnvioId", "==", shipmentId));
      const snapShipment = await (0, import_firestore3.getDocs)(qShipment);
      if (!snapShipment.empty) {
        targetOrderDoc = snapShipment.docs[0];
      }
    }
    if (!targetOrderDoc && trackingCode) {
      const qTracking = (0, import_firestore3.query)(ordersCol, (0, import_firestore3.where)("trackingCode", "==", trackingCode));
      const snapTracking = await (0, import_firestore3.getDocs)(qTracking);
      if (!snapTracking.empty) {
        targetOrderDoc = snapTracking.docs[0];
      }
    }
    if (!targetOrderDoc) {
      console.log(`\u2139\uFE0F [Shipping Webhook] Pedido n\xE3o localizado para shipmentId='${shipmentId}' / tracking='${trackingCode}'.`);
      return res.status(200).json({ received: true, matched: false });
    }
    const orderData = targetOrderDoc.data();
    const updates = {
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (status === "delivered") {
      updates.status = "Entregue";
      updates.deliveryStatus = "delivered";
    } else if (status === "posted" && orderData.status === "Confirmado") {
      updates.status = "Em Prepara\xE7\xE3o";
      updates.deliveryStatus = "posted";
    } else if (status === "canceled") {
      updates.labelStatus = "cancelada";
    }
    if (trackingCode && !orderData.trackingCode) {
      updates.trackingCode = trackingCode;
    }
    if (newEvents && newEvents.length > 0) {
      const currentEvents = Array.isArray(orderData.trackingEvents) ? orderData.trackingEvents : [];
      const mergedEvents = [...currentEvents];
      for (const ev of newEvents) {
        const alreadyExists = mergedEvents.some(
          (existing) => existing.status === ev.status && existing.description === ev.description && existing.createdAt === ev.createdAt
        );
        if (!alreadyExists) {
          mergedEvents.push(ev);
        }
      }
      mergedEvents.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      updates.trackingEvents = mergedEvents;
    }
    if (metricDivergence) {
      updates.metricDivergence = metricDivergence;
      console.log(`\u{1F6A8} [Shipping Webhook] Diverg\xEAncia de M\xE9trica registrada no pedido ${targetOrderDoc.id}: +R$ ${metricDivergence.difference.toFixed(2)}`);
    }
    const orderDocRef = (0, import_firestore3.doc)(db, "orders", targetOrderDoc.id);
    await (0, import_firestore3.updateDoc)(orderDocRef, updates);
    console.log(`\u2705 [Shipping Webhook] Pedido ${targetOrderDoc.id} sincronizado com sucesso: status='${updates.status || orderData.status}', eventos=${updates.trackingEvents ? updates.trackingEvents.length : "inalterados"}`);
    return res.status(200).json({
      success: true,
      orderId: targetOrderDoc.id,
      matched: true,
      updatedStatus: updates.status,
      eventsCount: updates.trackingEvents?.length,
      metricDivergenceDetected: Boolean(metricDivergence)
    });
  } catch (error) {
    console.error("\u274C [Shipping Webhook Error]:", error);
    return res.status(200).json({ received: true, error: error.message });
  }
});
async function startServer() {
  const distPath = import_path.default.join(process.cwd(), "dist");
  if (import_fs.default.existsSync(distPath)) {
    app2.use(import_express.default.static(distPath));
    app2.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app2.listen(PORT, "0.0.0.0", () => {
    console.log(
      `Servidor Evid\xEAncia Cal\xE7ados backend proxy rodando na porta ${PORT}`
    );
  });
}
if (!process.env.VERCEL && !process.env.FIREBASE_CONFIG && !process.env.FUNCTIONS_EMULATOR && !process.env.K_SERVICE && !process.env.GCLOUD_PROJECT) {
  startServer();
}
var server_default = app2;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  app
});
//# sourceMappingURL=server.cjs.map
