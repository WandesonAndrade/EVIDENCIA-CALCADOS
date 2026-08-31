import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import fs from "fs";
import os from "os";
import { createServer as createViteServer } from "vite";
import { ShippingService } from "./src/services/shipping/shippingService.js";
import { db } from "./src/lib/firebase.js";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where } from "firebase/firestore";

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

// --- INTEGRAÇÃO PIX MERCADO PAGO & PERSISTÊNCIA FIRESTORE (pix_transacoes) ---

export interface PixFirestoreRecord {
  parcelKey: string;
  payment_id: number;
  qr_code: string;
  qr_code_base64: string | null;
  transaction_amount: number;
  status: "pending" | "approved" | "cancelled" | "expired";
  emailCliente: string;
  nomeCliente?: string;
  cpfCliente?: string;
  descricao: string;
  externalReference?: string;
  createdAt: number;
  expires_at: number;
  expirationDateIso: string;
  audited?: boolean;
  auditedBy?: string | null;
  auditedAt?: string | null;
  updatedAt?: string;
}

interface PixCacheEntry {
  payment_id: number;
  qr_code: string;
  qr_code_base64: string | null;
  valor: number;
  descricao: string;
  emailCliente: string;
  createdAt: number;
  expiresAt: number;
  expirationDateIso: string;
}

const PIX_CACHE_FILE = path.join(os.tmpdir(), "evidencia_pix_cache.json");
let pixCacheMap = new Map<string, PixCacheEntry>();

function loadPixCache() {
  try {
    if (fs.existsSync(PIX_CACHE_FILE)) {
      const raw = fs.readFileSync(PIX_CACHE_FILE, "utf-8");
      const json = JSON.parse(raw);
      pixCacheMap = new Map(Object.entries(json));
      console.log(`[Pix Cache] Carregadas ${pixCacheMap.size} transações em cache de arquivo.`);
    }
  } catch (err: any) {
    console.warn("[Pix Cache] Falha ao carregar arquivo de cache:", err.message);
  }
}

function savePixCache() {
  try {
    const obj = Object.fromEntries(pixCacheMap.entries());
    fs.writeFileSync(PIX_CACHE_FILE, JSON.stringify(obj, null, 2), "utf-8");
  } catch (err: any) {
    console.warn("[Pix Cache] Falha ao salvar arquivo de cache:", err.message);
  }
}

loadPixCache();

// ── Funções de Apoio ao Firestore ('pix_transacoes') ──

function getPixDocId(parcelKey: string): string {
  return parcelKey.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
}

// Salva registro de Pix no Firestore na coleção 'pix_transacoes'
async function savePixToFirestore(record: PixFirestoreRecord): Promise<void> {
  try {
    const docId = getPixDocId(record.parcelKey);
    const docRef = doc(db, "pix_transacoes", docId);
    await setDoc(
      docRef,
      {
        ...record,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    console.log(`[Firestore Pix] Documento 'pix_transacoes/${docId}' salvo no Firestore (Payment ID #${record.payment_id}).`);
  } catch (err: any) {
    console.warn(`[Firestore Pix Warn] Falha ao salvar 'pix_transacoes' no Firestore:`, err.message);
  }
}

// Consulta registro de Pix no Firestore
async function getPixFromFirestore(parcelKey: string): Promise<PixFirestoreRecord | null> {
  try {
    const docId = getPixDocId(parcelKey);
    const docRef = doc(db, "pix_transacoes", docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as PixFirestoreRecord;
    }
  } catch (err: any) {
    console.warn(`[Firestore Pix Warn] Erro ao consultar 'pix_transacoes/${parcelKey}':`, err.message);
  }
  return null;
}

// Atualiza status do Pix no Firestore (ex: approved, cancelled, expired)
async function updatePixStatusInFirestore(parcelKey: string, status: "pending" | "approved" | "cancelled" | "expired"): Promise<void> {
  try {
    const docId = getPixDocId(parcelKey);
    const docRef = doc(db, "pix_transacoes", docId);
    await updateDoc(docRef, {
      status,
      updatedAt: new Date().toISOString(),
    });
    console.log(`[Firestore Pix Status] Status de 'pix_transacoes/${docId}' atualizado para '${status}'.`);
  } catch (err: any) {
    console.warn(`[Firestore Pix Status Warn] Falha ao atualizar status no Firestore:`, err.message);
  }
}

app.post("/gerar-pix-parcela", async (req, res) => {
  const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN?.replace(/['"]/g, "").trim();
  if (!mpToken) {
    console.error("[Pix MP] MERCADO_PAGO_ACCESS_TOKEN não configurado no .env");
    return res
      .status(500)
      .json({ success: false, message: "Integração Pix não configurada no servidor. Adicione o MERCADO_PAGO_ACCESS_TOKEN no .env." });
  }

  const { valor, descricao, emailCliente, nomeCliente, cpfCliente, externalReference, forceNew } = req.body || {};

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

  const parcelKey = String(externalReference || descricao).trim().toLowerCase();
  const now = Date.now();

  // ── REUTILIZAÇÃO INTELIGENTE VIA FIRESTORE & CACHE ──
  let existing: PixFirestoreRecord | null = null;
  if (parcelKey) {
    existing = await getPixFromFirestore(parcelKey);
  }

  // Fallback cache local em memória RAM se não achou no Firestore
  if (!existing && parcelKey && pixCacheMap.has(parcelKey)) {
    const c = pixCacheMap.get(parcelKey)!;
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
      expirationDateIso: c.expirationDateIso,
    };
  }

  if (!forceNew && existing && (existing.status === "pending" || !existing.status)) {
    const isExpired = existing.expires_at <= now + 60_000; // resta menos de 1 minuto
    const amountChanged = Math.abs(existing.transaction_amount - valor) > 0.01; // valor mudou (juros MobLink ERP)

    // Se o valor for o mesmo e o QR Code ainda estiver dentro da validade (expires_at):
    if (!isExpired && !amountChanged) {
      const remainingMin = Math.max(1, Math.round((existing.expires_at - now) / 60_000));
      console.log(
        `[Pix MP Firestore] Reutilizando QR Code ativo no Firestore para '${parcelKey}' (Valor: R$ ${valor.toFixed(2)}, expira em ~${remainingMin} min, ID #${existing.payment_id})`
      );

      return res.json({
        success: true,
        payment_id: existing.payment_id,
        qr_code: existing.qr_code,
        qr_code_base64: existing.qr_code_base64,
        expires_at: existing.expires_at,
        reused: true,
      });
    }

    // Se o valor mudou (houve atualização de juros no MobLink ERP):
    if (amountChanged) {
      console.log(
        `[Pix MP Firestore] Valor da parcela mudou no MobLink ERP de R$ ${existing.transaction_amount.toFixed(2)} para R$ ${valor.toFixed(2)} (Juros/ERP). Cancelando Pix antigo #${existing.payment_id} no Mercado Pago & Firestore...`
      );

      // Cancela pagamento antigo no Mercado Pago
      fetch(`https://api.mercadopago.com/v1/payments/${existing.payment_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mpToken}`,
        },
        body: JSON.stringify({ status: "cancelled" }),
      }).catch((err) => console.warn("[Pix MP Cancel Error]", err.message));

      // Atualiza status no Firestore
      await updatePixStatusInFirestore(parcelKey, "cancelled");
    } else if (isExpired) {
      console.log(`[Pix MP Firestore] QR Code anterior para '${parcelKey}' expirou. Atualizando status no Firestore e gerando novo QR Code.`);
      await updatePixStatusInFirestore(parcelKey, "expired");
    }
  }

  // ── TEMPO DE VALIDADE DO PIX (30 MINUTOS) ──
  const EXPIRATION_MINUTES = 30;
  const expiresAtMs = now + EXPIRATION_MINUTES * 60_000;
  const dateOfExpirationIso = new Date(expiresAtMs).toISOString();

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

  const cleanAmount = Number(Number(valor || 0).toFixed(2));
  const finalAmount = Math.max(1.0, cleanAmount);

  const paymentBody: Record<string, any> = {
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
          unit_price: finalAmount,
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
    console.log(`[Pix MP] Criando novo pagamento Pix de R$ ${valor.toFixed(2)} para ${emailCliente} (Válido por ${EXPIRATION_MINUTES} min)...`);

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

    // ── PERSISTÊNCIA NO FIRESTORE ('pix_transacoes') & CACHE LOCAL ──
    const firestoreRecord: PixFirestoreRecord = {
      parcelKey,
      payment_id: data.id,
      qr_code: txData.qr_code,
      qr_code_base64: txData.qr_code_base64 || null,
      transaction_amount: Number(valor),
      status: "pending",
      emailCliente,
      nomeCliente: nomeCliente || undefined,
      cpfCliente: cpfCliente || undefined,
      descricao,
      externalReference: externalReference || undefined,
      createdAt: now,
      expires_at: expiresAtMs,
      expirationDateIso: dateOfExpirationIso,
      audited: false,
    };

    await savePixToFirestore(firestoreRecord);

    // Salva no cache local em memória RAM
    const cacheEntry: PixCacheEntry = {
      payment_id: data.id,
      qr_code: txData.qr_code,
      qr_code_base64: txData.qr_code_base64 || null,
      valor,
      descricao,
      emailCliente,
      createdAt: now,
      expiresAt: expiresAtMs,
      expirationDateIso: dateOfExpirationIso,
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
      reused: false,
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

    // Se o pagamento foi aprovado ou alterou status no Mercado Pago, atualiza no Firestore
    if (data.status) {
      const parcelKeyMatch = Array.from(pixCacheMap.entries()).find(([_, val]) => val.payment_id === data.id)?.[0];
      if (parcelKeyMatch) {
        updatePixStatusInFirestore(parcelKeyMatch, data.status).catch(() => {});
      }
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

// --- RECURSOS DO DASHBOARD FINANCEIRO & AUDITORIA DE PAGAMENTOS ---

const PIX_AUDIT_FILE = path.join(process.cwd(), ".pix_audit.json");
let pixAuditMap = new Map<string, { audited: boolean; auditedBy?: string; auditedAt?: string }>();

function loadPixAudit() {
  try {
    if (fs.existsSync(PIX_AUDIT_FILE)) {
      const raw = fs.readFileSync(PIX_AUDIT_FILE, "utf-8");
      const json = JSON.parse(raw);
      pixAuditMap = new Map(Object.entries(json));
    }
  } catch (err: any) {
    console.warn("[Pix Audit] Falha ao carregar auditorias:", err.message);
  }
}

function savePixAudit() {
  try {
    const obj = Object.fromEntries(pixAuditMap.entries());
    fs.writeFileSync(PIX_AUDIT_FILE, JSON.stringify(obj, null, 2), "utf-8");
  } catch (err: any) {
    console.warn("[Pix Audit] Falha ao salvar auditorias:", err.message);
  }
}

loadPixAudit();

// Retorna lista de pagamentos gerados/recebidos da coleção 'pix_transacoes' no Firestore
app.get("/listar-pix-transacoes", async (req, res) => {
  try {
    const colRef = collection(db, "pix_transacoes");
    const snap = await getDocs(colRef);

    if (!snap.empty) {
      const transactions = snap.docs.map((docSnap) => {
        const d = docSnap.data() as PixFirestoreRecord;
        const auditInfo = pixAuditMap.get(String(d.payment_id)) || { audited: Boolean(d.audited) };
        return {
          parcelKey: d.parcelKey,
          payment_id: d.payment_id,
          valor: d.transaction_amount || (d as any).valor,
          descricao: d.descricao,
          emailCliente: d.emailCliente,
          createdAt: d.createdAt,
          expiresAt: d.expires_at,
          expirationDateIso: d.expirationDateIso,
          audited: Boolean(auditInfo.audited || d.audited),
          auditedBy: auditInfo.auditedBy || d.auditedBy || null,
          auditedAt: auditInfo.auditedAt || d.auditedAt || null,
          status: d.status,
        };
      });

      return res.json({ success: true, transactions });
    }
  } catch (err: any) {
    console.warn("[Firestore List Warn] Falha ao consultar Firestore, usando cache local:", err.message);
  }

  // Fallback para cache local se Firestore não retornar resultados
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
      status: "pending",
    };
  });

  return res.json({ success: true, transactions });
});

// Permite ao Administrador marcar/desmarcar o Check de Conferência no Firestore & Local
app.post("/auditar-pix-transacao", async (req, res) => {
  const { paymentId, audited, auditedBy } = req.body || {};
  if (!paymentId) {
    return res.status(400).json({ success: false, message: "paymentId é obrigatório" });
  }

  const key = String(paymentId);
  const auditedByStr = auditedBy || "Administrador";
  const auditedAtStr = new Date().toISOString();

  if (audited) {
    pixAuditMap.set(key, {
      audited: true,
      auditedBy: auditedByStr,
      auditedAt: auditedAtStr,
    });
  } else {
    pixAuditMap.set(key, { audited: false });
  }

  savePixAudit();

  // Atualiza no Firestore ('pix_transacoes')
  try {
    const colRef = collection(db, "pix_transacoes");
    const q = query(colRef, where("payment_id", "==", Number(paymentId)));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const docSnap = snap.docs[0];
      await updateDoc(docSnap.ref, {
        audited: Boolean(audited),
        auditedBy: audited ? auditedByStr : null,
        auditedAt: audited ? auditedAtStr : null,
        updatedAt: auditedAtStr,
      });
      console.log(`[Firestore Audit] Atualizado documento '${docSnap.id}' para audited=${audited}`);
    }
  } catch (err: any) {
    console.warn("[Firestore Audit Warn] Falha ao atualizar auditoria no Firestore:", err.message);
  }

  return res.json({ success: true, paymentId, audited: Boolean(audited) });
});

// --- PROXY MERCADO PAGO (/mp-api) ---
app.use("/mp-api", async (req, res) => {
  const subPath = req.url; // ex: /payments
  const targetUrl = `https://api.mercadopago.com/v1${subPath}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  const options: RequestInit = {
    method: req.method,
    headers: {
      "Content-Type": "application/json",
    },
    signal: controller.signal,
  };

  // Repassa o header de Autorização do frontend, se houver
  if (req.headers.authorization) {
    (options.headers as Record<string, string>)["Authorization"] = req.headers.authorization;
  } else {
    const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN?.replace(/['"]/g, "").trim();
    if (mpToken) {
      (options.headers as Record<string, string>)["Authorization"] = `Bearer ${mpToken}`;
    }
  }

  if (req.headers["x-idempotency-key"]) {
    (options.headers as Record<string, string>)["X-Idempotency-Key"] = req.headers["x-idempotency-key"] as string;
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
  } catch (err: any) {
    clearTimeout(timeoutId);
    return res.status(503).json({ success: false, message: `Falha no proxy MP (Backend): ${err.message}` });
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

// --- ROTA PROXY DE STATUS DA AUTENTICAÇÃO DE FRETE ---
app.get("/api/shipping/auth/status", async (req, res) => {
  try {
    const provider = ShippingService.getProvider();
    const isAuth = await provider.isAuthenticated();
    const headers = await provider.getAuthHeaders();

    return res.json({
      success: true,
      provider: provider.providerName,
      environment: provider.environment,
      authenticated: isAuth,
      userAgent: headers["User-Agent"],
    });
  } catch (error: any) {
    console.error("[Shipping Auth API Error]:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Erro ao verificar autenticação do serviço de frete",
    });
  }
});

// --- ROTA PROXY DE CONSULTA DE CEP VIA PROVEDOR DE FRETE ---
app.get("/api/shipping/cep/:cep", async (req, res) => {
  try {
    const { cep } = req.params;
    const provider = ShippingService.getProvider();
    const location = await provider.fetchAddressByCep(cep);

    if (!location) {
      return res.status(404).json({ success: false, message: "CEP não encontrado pelo provedor" });
    }

    return res.json({ success: true, location });
  } catch (error: any) {
    console.error("[Shipping CEP API Error]:", error.message);
    return res.status(500).json({ success: false, error: error.message || "Erro ao consultar CEP" });
  }
});

// --- ROTA PROXY DE COTAÇÃO DE FRETE VIA PROVEDOR ATIVO ---
app.post("/api/shipping/calculate", async (req, res) => {
  try {
    const { toPostalCode, fromPostalCode, box } = req.body || {};

    if (!toPostalCode || typeof toPostalCode !== "string") {
      return res.status(400).json({ success: false, error: "CEP de destino (toPostalCode) é obrigatório." });
    }

    const cleanToCep = toPostalCode.replace(/\D/g, "");
    if (cleanToCep.length !== 8) {
      return res.status(400).json({ success: false, error: "CEP de destino inválido. Deve conter 8 números." });
    }

    const provider = ShippingService.getProvider();
    const options = await provider.calculateShipping({
      toPostalCode: cleanToCep,
      fromPostalCode,
      box,
    });

    return res.json({
      success: true,
      provider: provider.providerName,
      options,
    });
  } catch (error: any) {
    console.error("[Shipping Calculate API Error]:", error?.message || error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Erro ao realizar cotação de frete",
    });
  }
});

// --- ROTA PROXY DE GERAÇÃO E COMPRA DE ETIQUETAS DE FRETE ---
app.post("/api/shipping/labels/generate", async (req, res) => {
  try {
    const { orderId, serviceId, to, products, box, from } = req.body;

    if (!orderId || !to || !products) {
      return res.status(400).json({ success: false, error: "Dados incompletos para geração de etiqueta (orderId, to, products)." });
    }

    const provider = ShippingService.getProvider();
    const result = await provider.createAndBuyLabel({
      orderId,
      serviceId,
      to,
      products,
      box,
      from,
    });

    return res.json({
      success: true,
      provider: provider.providerName,
      label: result,
    });
  } catch (error: any) {
    console.error("[Shipping Label Generate API Error]:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Erro ao gerar etiqueta no Melhor Envio",
    });
  }
});

// --- ROTA PROXY DE CANCELAMENTO DE ETIQUETAS DE FRETE ---
app.post("/api/shipping/labels/cancel", async (req, res) => {
  try {
    const { shipmentId, reason } = req.body;

    if (!shipmentId) {
      return res.status(400).json({ success: false, error: "shipmentId é obrigatório para cancelamento." });
    }

    const provider = ShippingService.getProvider();
    const success = await provider.cancelLabel(shipmentId, reason);

    return res.json({
      success,
      provider: provider.providerName,
      message: "Solicitação de cancelamento enviada.",
    });
  } catch (error: any) {
    console.error("[Shipping Label Cancel API Error]:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Erro ao cancelar etiqueta de frete",
    });
  }
});

// --- ROTA PROXY DE RASTREAMENTO EM TEMPO REAL ---
app.post("/api/shipping/track", async (req, res) => {
  try {
    const { trackingCode } = req.body;

    if (!trackingCode || typeof trackingCode !== "string") {
      return res.status(400).json({ success: false, error: "trackingCode é obrigatório." });
    }

    const provider = ShippingService.getProvider();
    const tracking = await provider.trackShipment(trackingCode);

    return res.json({
      success: true,
      provider: provider.providerName,
      tracking,
    });
  } catch (error: any) {
    console.error("[Shipping Track API Error]:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Erro ao rastrear envio no Melhor Envio",
    });
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
