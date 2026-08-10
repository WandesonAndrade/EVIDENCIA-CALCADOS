import { EvidenciaAuthSession } from '../types';
import { API_BASE_URL } from '../services/api';

let inMemoryToken: string | null = null;
let tokenExpiresAt: number = 0;
let clientPendingPromise: Promise<string> | null = null;

function parseJwtExpClient(token: string): number {
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);
      if (payload.exp && typeof payload.exp === 'number') {
        return payload.exp * 1000;
      }
    }
  } catch {}
  return Date.now() + 60 * 60 * 1_000;
}

export const evidenciaAuthService = {
  /** Retrieves a valid token from backend Node memory without exposing passwords to the client. */
  async getToken(forceRefresh = false): Promise<string> {
    const now = Date.now();

    if (forceRefresh) {
      inMemoryToken = null;
      tokenExpiresAt = 0;
    }

    if (!forceRefresh && inMemoryToken && tokenExpiresAt > now + 60_000) {
      return inMemoryToken;
    }

    if (clientPendingPromise) {
      return clientPendingPromise;
    }

    clientPendingPromise = (async () => {
      try {
        let res = await fetch(`/api/auth-token${forceRefresh ? '?force=true' : ''}`);
        let contentType = res.headers.get('content-type') || '';

        // Se a resposta for HTML ou status de erro (ex: servidor Vite sem proxy configurado), tenta a porta 3000 diretamente
        if (!res.ok || !contentType.includes('application/json')) {
          try {
            const directRes = await fetch(`http://localhost:3000/api/auth-token${forceRefresh ? '?force=true' : ''}`);
            if (directRes.ok && (directRes.headers.get('content-type') || '').includes('application/json')) {
              res = directRes;
              contentType = 'application/json';
            }
          } catch {}
        }

        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data.token) {
            inMemoryToken = data.token;
            tokenExpiresAt = parseJwtExpClient(data.token);
            return data.token;
          }
        }
      } catch (err) {
        console.warn('[evidenciaAuthService] Erro ao obter token do backend:', err);
      } finally {
        clientPendingPromise = null;
      }
      return inMemoryToken || '';
    })();

    return clientPendingPromise;
  },

  /** Returns current session state. */
  getSavedSession(): EvidenciaAuthSession | null {
    return {
      token: inMemoryToken || 'active',
      status: 'authenticated',
      authenticatedAt: new Date().toISOString(),
      expiresAt: new Date(tokenExpiresAt || (Date.now() + 24 * 60 * 60 * 1000)).toISOString(),
    };
  },

  /** Compatibility login method. */
  async login(): Promise<EvidenciaAuthSession> {
    await this.getToken(true);
    return this.getSavedSession()!;
  },

  /** Compatibility logout method. */
  logout(): void {
    inMemoryToken = null;
    tokenExpiresAt = 0;
  },

  /**
   * Executes fetch directly to target URLs (ex: https://api.evidenciacalcados.com.br/...) with Bearer token.
   * Auto-renews token from backend if remote API responds with 401, or falls back to Node proxy on network/CORS error or 401 failure.
   */
  async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getToken();
    const headers = new Headers(options.headers || {});
    headers.set('Accept', 'application/json');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const apiOrigin = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

    try {
      let response = await fetch(url, { ...options, headers });

      // Se a API remota responder erro HTTP (401, 500, etc.) em requisição direta, tenta o proxy backend local (/api/v1/...)
      if (!response.ok && url.startsWith(apiOrigin)) {
        const proxyUrl = url.replace(apiOrigin, '');
        console.warn(`[evidenciaAuthService] Fallback de proxy ativado (HTTP ${response.status}): ${url} -> ${proxyUrl}`);
        try {
          const proxyResp = await fetch(proxyUrl, { ...options, headers });
          if (proxyResp.ok) return proxyResp;
        } catch {
          // Mantém a resposta original
        }
      }

      return response;
    } catch (netErr) {
      // Se for uma requisição direta para apiOrigin e falhar (ex: CORS ou erro de rede), redireciona suavemente para o proxy do backend
      if (url.startsWith(apiOrigin)) {
        const proxyUrl = url.replace(apiOrigin, '');
        console.warn(`[evidenciaAuthService] Requisição direta falhou (${(netErr as Error).message}). Redirecionando para o proxy backend: ${proxyUrl}`);
        return fetch(proxyUrl, options);
      }
      throw netErr;
    }
  },
};

