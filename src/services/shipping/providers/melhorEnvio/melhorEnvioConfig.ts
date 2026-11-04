/**
 * Configurações da API do Melhor Envio (URLs, Tokens e Ambientes)
 * Os segredos (token, client secret, webhook secret) residem exclusivamente no backend (process.env).
 */

export interface IMelhorEnvioConfig {
  environment: "sandbox" | "production";
  baseUrl: string;
  apiToken: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  userAgent: string;
  webhookSecret?: string;
}

/**
 * Utilitário seguro para ler variáveis de ambiente do backend Node.js
 */
function readServerEnv(key: string): string {
  if (typeof process !== "undefined" && process.env) {
    if (process.env[key]) return process.env[key]!.trim();
  }
  return "";
}

export function getMelhorEnvioConfig(): IMelhorEnvioConfig {
  const envVal = (readServerEnv("MELHOR_ENVIO_ENV") || readServerEnv("SHIPPING_ENV") || "sandbox").toLowerCase();
  const isSandbox = envVal !== "production";

  const baseUrl = isSandbox
    ? "https://sandbox.melhorenvio.com.br"
    : "https://melhorenvio.com.br";

  const apiToken = readServerEnv("MELHOR_ENVIO_TOKEN");
  const clientId = readServerEnv("MELHOR_ENVIO_CLIENT_ID");
  const clientSecret = readServerEnv("MELHOR_ENVIO_CLIENT_SECRET");
  const redirectUri = readServerEnv("MELHOR_ENVIO_REDIRECT_URI");
  const userAgent = readServerEnv("MELHOR_ENVIO_USER_AGENT") || "EvidenciaCalcados (wandesonandrade33@gmail.com)";
  const webhookSecret = readServerEnv("MELHOR_ENVIO_WEBHOOK_SECRET");

  return {
    environment: isSandbox ? "sandbox" : "production",
    baseUrl,
    apiToken,
    clientId,
    clientSecret,
    redirectUri,
    userAgent,
    webhookSecret,
  };
}
