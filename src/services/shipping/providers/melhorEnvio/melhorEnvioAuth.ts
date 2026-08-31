/**
 * Gerenciador de Autenticação da API do Melhor Envio.
 * Suporta autenticação por Token de Acesso Pessoal (Bearer Token) e OAuth 2.0.
 */
import { getMelhorEnvioConfig, IMelhorEnvioConfig } from "./melhorEnvioConfig.js";

export interface IOAuthTokenResponse {
  token_type: string;
  expires_in: number;
  access_token: string;
  refresh_token?: string;
}

export class MelhorEnvioAuth {
  private config: IMelhorEnvioConfig;
  private cachedToken: string | null = null;

  constructor(customConfig?: IMelhorEnvioConfig) {
    this.config = customConfig || getMelhorEnvioConfig();
    if (this.config.apiToken) {
      this.cachedToken = this.config.apiToken;
    }
  }

  /**
   * Retorna os cabeçalhos padrão com Authorization e User-Agent exigido pela API do Melhor Envio
   */
  public async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getValidToken();
    return {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json",
      "Content-Type": "application/json",
      "User-Agent": this.config.userAgent,
    };
  }

  /**
   * Obtém o token de acesso ativo ou lança exceção descritiva
   */
  public async getValidToken(): Promise<string> {
    if (this.cachedToken) {
      return this.cachedToken;
    }

    // Tenta re-obter a config atualizada das envs
    this.config = getMelhorEnvioConfig();
    if (this.config.apiToken) {
      this.cachedToken = this.config.apiToken;
      return this.cachedToken;
    }

    throw new Error(
      "[MelhorEnvioAuth] Token de API do Melhor Envio não encontrado nas variáveis de ambiente (MELHOR_ENVIO_TOKEN / VITE_MELHOR_ENVIO_TOKEN)."
    );
  }

  /**
   * Verifica se o token de autenticação atual está presente e estruturalmente válido
   */
  public isAuthenticated(): boolean {
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
  public setToken(token: string): void {
    this.cachedToken = token;
  }

  /**
   * Fluxo OAuth 2.0: Troca o código de autorização por tokens de acesso
   */
  public async exchangeCodeForToken(code: string): Promise<IOAuthTokenResponse> {
    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error("[MelhorEnvioAuth] MELHOR_ENVIO_CLIENT_ID e MELHOR_ENVIO_CLIENT_SECRET são obrigatórios para fluxo OAuth2.");
    }

    const response = await fetch(`${this.config.baseUrl}/api/v2/oauth/token`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": this.config.userAgent,
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        code,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`[MelhorEnvioAuth] Falha na troca do código OAuth2: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as IOAuthTokenResponse;
    this.cachedToken = data.access_token;
    return data;
  }

  /**
   * Fluxo OAuth 2.0: Renova o Access Token utilizando o Refresh Token
   */
  public async refreshOAuthToken(refreshToken: string): Promise<IOAuthTokenResponse> {
    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error("[MelhorEnvioAuth] MELHOR_ENVIO_CLIENT_ID e MELHOR_ENVIO_CLIENT_SECRET são obrigatórios para renovação OAuth2.");
    }

    const response = await fetch(`${this.config.baseUrl}/api/v2/oauth/token`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": this.config.userAgent,
      },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`[MelhorEnvioAuth] Falha na renovação do refresh token: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as IOAuthTokenResponse;
    this.cachedToken = data.access_token;
    return data;
  }

  /**
   * Retorna as configurações ativas do ambiente (sem expor o token completo por segurança)
   */
  public getInfo() {
    return {
      environment: this.config.environment,
      baseUrl: this.config.baseUrl,
      userAgent: this.config.userAgent,
      hasToken: Boolean(this.cachedToken || this.config.apiToken),
    };
  }
}
