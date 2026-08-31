/**
 * Configurações da API do Melhor Envio (URLs, Tokens e Ambientes)
 * Compatível com Node.js (process.env) e Vite (import.meta.env).
 */

export interface IMelhorEnvioConfig {
  environment: "sandbox" | "production";
  baseUrl: string;
  apiToken: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  userAgent: string;
}

/**
 * Utilitário para ler variáveis de ambiente de forma segura tanto no Node.js quanto no Vite
 */
function readEnv(key: string): string {
  // 1. Tenta no process.env do Node.js
  if (typeof process !== "undefined" && process.env) {
    if (process.env[key]) return process.env[key]!;
    if (process.env[`VITE_${key}`]) return process.env[`VITE_${key}`]!;
  }

  // 2. Tenta no import.meta.env do Vite
  try {
    const metaEnv = (import.meta as any).env;
    if (metaEnv) {
      if (metaEnv[`VITE_${key}`]) return metaEnv[`VITE_${key}`];
      if (metaEnv[key]) return metaEnv[key];
    }
  } catch {
    // Ignora erro em ambiente sem import.meta
  }

  return "";
}

export function getMelhorEnvioConfig(): IMelhorEnvioConfig {
  const envVal = (readEnv("MELHOR_ENVIO_ENV") || readEnv("SHIPPING_ENV") || "sandbox").toLowerCase();
  const isSandbox = envVal !== "production";

  const baseUrl = isSandbox
    ? "https://sandbox.melhorenvio.com.br"
    : "https://melhorenvio.com.br";

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
    userAgent,
  };
}
