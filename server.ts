import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

export const app = express();
const PORT = 3000;

const EVIDENCIA_API_BASE = process.env.VITE_API_URL
  ? process.env.VITE_API_URL.replace(/\/api\/v1\/?$/, "")
  : "";
const EVIDENCIA_LOGIN_URL = process.env.VITE_API_URL
  ? `${process.env.VITE_API_URL.replace(/\/$/, "")}/login`
  : `${EVIDENCIA_API_BASE}/api/v1/login`;
const EVIDENCIA_CREDENTIALS = {
  usuario: process.env.EVIDENCIA_API_USER,
  senha: process.env.EVIDENCIA_API_PASSWORD,
  loja: process.env.EVIDENCIA_API_LOJA,
};

// Guardado com segurança em memória RAM apenas no servidor backend Node.js
let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;
let pendingTokenPromise: Promise<string> | null = null;

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// --- GERENCIAMENTO DE AUTENTICAÇÃO E RENOVAÇÃO NO BACKEND ---

function parseJwtExp(token: string): number {
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
        return payload.exp * 1000;
      }
    }
  } catch (err) {
    console.warn("[Backend Auth] Falha ao decodificar exp do JWT:", err);
  }
  return Date.now() + 1 * 60 * 60 * 1_000;
}

/**
 * Obtém um token válido exclusivamente no backend Node.js.
 * Se EVIDENCIA_API_TOKEN estiver definido no .env, utiliza-o diretamente.
 * Caso contrário, faz login automático junto à API remota.
 */
async function getValidToken(forceRefresh = false): Promise<string> {
  const now = Date.now();

  if (forceRefresh) {
    cachedToken = null;
    tokenExpiresAt = 0;
  }

  // Se houver um token estático no .env e não for forceRefresh, verifica a expiração
  const envToken =
    process.env.EVIDENCIA_API_TOKEN?.trim() ||
    process.env.EVIDENCIA_TOKEN?.trim();

  if (envToken && !forceRefresh) {
    const exp = parseJwtExp(envToken);
    if (exp > now + 60_000) {
      cachedToken = envToken;
      tokenExpiresAt = exp;
      return cachedToken;
    }
  }

  if (!forceRefresh && cachedToken && tokenExpiresAt > now + 60_000) {
    return cachedToken;
  }

  if (pendingTokenPromise) {
    return pendingTokenPromise;
  }

  pendingTokenPromise = (async () => {
    console.log(
      "[Backend Auth] Renovando token via login na API da Evidência Calçados...",
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8_000);

    try {
      const res = await fetch(EVIDENCIA_LOGIN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(EVIDENCIA_CREDENTIALS),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Login falhou na API Evidência: HTTP ${res.status}`);
      }

      const data = await res.json();
      const token: string =
        data.token ||
        data.access_token ||
        data.accessToken ||
        (data.data && (data.data.token || data.data.access_token));

      if (!token) {
        throw new Error("Token de acesso não retornado pela API remota.");
      }

      cachedToken = token;
      tokenExpiresAt = parseJwtExp(token);

      console.log(
        `[Backend Auth] Token obtido com sucesso via login. Válido até: ${new Date(tokenExpiresAt).toLocaleString("pt-BR")}`,
      );
      return token;
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error("[Backend Auth Error]", err.message);
      throw new Error(`Falha na autenticação do backend: ${err.message}`);
    } finally {
      pendingTokenPromise = null;
    }
  })();

  return pendingTokenPromise;
}

// Endpoint para fornecer token válido ao frontend para requisições diretas à API
app.get("/api/auth-token", async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const force = req.query.force === "true";
    const token = await getValidToken(force);
    return res.json({ success: true, token });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// --- INTEGRAÇÃO PIX MERCADO PAGO ---

app.post("/gerar-pix-parcela", async (req, res) => {
  const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN?.replace(/['"]/g, "").trim();
  if (!mpToken) {
    console.error("[Pix MP] MERCADO_PAGO_ACCESS_TOKEN não configurado no .env");
    return res
      .status(500)
      .json({ success: false, message: "Integração Pix não configurada no servidor. Adicione o MERCADO_PAGO_ACCESS_TOKEN no .env." });
  }

  const { valor, descricao, emailCliente, nomeCliente, cpfCliente, externalReference } = req.body || {};

  if (!valor || typeof valor !== "number" || valor <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "Campo 'valor' inválido. Informe um número positivo." });
  }
  if (!descricao || typeof descricao !== "string") {
    return res
      .status(400)
      .json({ success: false, message: "Campo 'descricao' é obrigatório." });
  }
  if (!emailCliente || typeof emailCliente !== "string" || !emailCliente.includes("@")) {
    return res
      .status(400)
      .json({ success: false, message: "Campo 'emailCliente' inválido." });
  }

  // Montagem do payload Mercado Pago seguindo a documentação oficial
  const payerObj: Record<string, any> = { email: emailCliente };

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
        number: cleanCpf,
      };
    }
  }

  const paymentBody: Record<string, any> = {
    transaction_amount: Number(valor),
    description: String(descricao).slice(0, 200),
    payment_method_id: "pix",
    payer: payerObj,
    additional_info: {
      items: [
        {
          id: String(externalReference || `parcela-${Date.now()}`).slice(0, 64),
          title: String(descricao).slice(0, 255),
          description: String(descricao).slice(0, 255),
          quantity: 1,
          unit_price: Number(valor),
        },
      ],
    },
  };

  if (externalReference && typeof externalReference === "string") {
    paymentBody.external_reference = String(externalReference).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  try {
    console.log(`[Pix MP] Gerando pagamento Pix de R$ ${valor.toFixed(2)} para ${emailCliente}...`);

    const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mpToken}`,
        "X-Idempotency-Key": `pix-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      },
      body: JSON.stringify(paymentBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data: any = await mpRes.json();

    if (!mpRes.ok) {
      console.error("[Pix MP] Erro na API do Mercado Pago:", data);
      const detail = data?.message || data?.cause?.[0]?.description || `HTTP ${mpRes.status}`;
      return res
        .status(mpRes.status >= 400 && mpRes.status < 500 ? 400 : 502)
        .json({ success: false, message: `Erro ao gerar Pix: ${detail}` });
    }

    const txData = data.point_of_interaction?.transaction_data;
    if (!txData?.qr_code) {
      console.error("[Pix MP] Resposta inesperada – sem qr_code:", JSON.stringify(data).slice(0, 500));
      return res
        .status(502)
        .json({ success: false, message: "QR Code Pix não retornado pelo Mercado Pago." });
    }

    console.log(`[Pix MP] Pagamento #${data.id} gerado com sucesso.`);

    return res.json({
      success: true,
      payment_id: data.id,
      qr_code: txData.qr_code,
      qr_code_base64: txData.qr_code_base64 || null,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error("[Pix MP Error]", err.message);
    return res
      .status(503)
      .json({ success: false, message: `Falha ao conectar com Mercado Pago: ${err.message}` });
  }
});

// --- VERIFICAÇÃO DE STATUS PIX MERCADO PAGO ---

app.get("/verificar-pix/:paymentId", async (req, res) => {
  const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN?.replace(/['"]/g, "").trim();
  if (!mpToken) {
    return res
      .status(500)
      .json({ success: false, message: "Integração Pix não configurada no servidor." });
  }

  const { paymentId } = req.params;
  if (!paymentId || !/^\d+$/.test(paymentId)) {
    return res
      .status(400)
      .json({ success: false, message: "ID de pagamento inválido." });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mpToken}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data: any = await mpRes.json();

    if (!mpRes.ok) {
      const detail = data?.message || `HTTP ${mpRes.status}`;
      return res
        .status(mpRes.status === 404 ? 404 : 502)
        .json({ success: false, message: `Erro ao consultar pagamento: ${detail}` });
    }

    return res.json({
      success: true,
      payment_id: data.id,
      status: data.status,
      status_detail: data.status_detail,
      date_approved: data.date_approved || null,
      transaction_amount: data.transaction_amount,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    return res
      .status(503)
      .json({ success: false, message: `Falha ao consultar Mercado Pago: ${err.message}` });
  }
});

// --- PROXY BACKEND TRANSPARENTE E SEGURO ---

app.use(["/api/v1", "/v1"], async (req, res, next) => {
  // Ignora requisições que não se referem às rotas da API Evidência
  if (
    !req.originalUrl.startsWith("/api/v1") &&
    !req.originalUrl.startsWith("/v1")
  ) {
    return next();
  }

  let subPath = req.originalUrl.split("?")[0];
  if (!subPath.startsWith("/api/v1")) {
    subPath = `/api/v1${subPath.replace(/^\/v1/, "")}`;
  }

  const query = new URLSearchParams(
    req.query as Record<string, string>,
  ).toString();
  const fullUrl = `${EVIDENCIA_API_BASE}${subPath}${query ? `?${query}` : ""}`;

  let token: string;
  try {
    token = await getValidToken();
  } catch (err: any) {
    return res.status(503).json({ success: false, message: err.message });
  }

  const makeProxyRequest = async (authToken: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12_000);

    const options: RequestInit = {
      method: req.method,
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    };

    if (
      ["POST", "PUT", "PATCH"].includes(req.method) &&
      req.body &&
      Object.keys(req.body).length > 0
    ) {
      options.body = JSON.stringify(req.body);
    }

    const apiRes = await fetch(fullUrl, options);
    clearTimeout(timeoutId);
    return apiRes;
  };

  try {
    let apiRes = await makeProxyRequest(token);

    // Se a API remota retornar 401, força a renovação imediata do token e tenta 1x mais
    if (apiRes.status === 401) {
      console.warn(
        `[Backend Proxy] HTTP 401 em ${subPath}. Forçando renovação imediata do token...`,
      );
      token = await getValidToken(true);
      apiRes = await makeProxyRequest(token);
    }

    if (!apiRes.ok) {
      // Se a rota remota de grupos de produtos retornar 404, retorna [] com status 200 para fallback suave
      if (apiRes.status === 404 && subPath.includes("/produtos/grupos")) {
        console.info(
          "[Backend Proxy] Rota remota de grupos indisponível (404). Retornando lista vazia de grupos para geração dinâmica via catálogo.",
        );
        return res.json([]);
      }

      return res.status(apiRes.status).json({
        success: false,
        message: `API remota retornou HTTP ${apiRes.status}`,
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
  } catch (err: any) {
    console.error(`[Backend Proxy Error] ${fullUrl}:`, err.message);
    return res.status(503).json({ success: false, message: err.message });
  }
});

// --- VITE MIDDLEWARE & STATIC SERVER ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `Servidor Evidência Calçados backend proxy rodando na porta ${PORT}`,
    );
  });
}

if (!process.env.VERCEL) {
  startServer();
}

// Vercel serverless entry point
export default (req: any, res: any) => app(req, res);
