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
const getStaticFallbackToken = (): string => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    const envVar = (import.meta as any).env.VITE_EVIDENCIA_API_TOKEN || (import.meta as any).env.VITE_API_TOKEN;
    if (envVar) return String(envVar).replace(/['"]/g, '').trim();
  }
  return '';
};

const renewTokenViaDirectLogin = async (): Promise<string> => {
  try {
    const user = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_EVIDENCIA_API_USER) || 'site';
    const pass = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_EVIDENCIA_API_PASSWORD) || '987654';
    const loja = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_EVIDENCIA_API_LOJA) || '0';

    const loginUrl = `${API_BASE_URL.replace(/\/$/, '')}/login`;
    const res = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ usuario: user, senha: pass, loja }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        console.log('✅ [evidenciaAuthService] Token renovado com sucesso via Login Direto na API do ERP!');
        inMemoryToken = data.token;
        tokenExpiresAt = parseJwtExpClient(data.token);
        return data.token;
      }
    }
  } catch (e) {
    console.warn('[evidenciaAuthService] Falha na renovação via Login Direto:', e);
  }
  return '';
};

export const evidenciaAuthService = {
  /** Retrieves a valid token from backend Node memory or auto-renews via direct ERP login if expired. */
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

        // Tenta porta 3000 apenas se estiver rodando localmente (evita erro de CORS em produção)
        const isLocalhost = typeof window !== 'undefined' && (
          window.location.hostname === 'localhost' || 
          window.location.hostname === '127.0.0.1'
        );

        if ((!res.ok || !contentType.includes('application/json')) && isLocalhost) {
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

        // Tenta o login direto com as credenciais da loja caso o token estático esteja ausente ou expirado
        const freshToken = await renewTokenViaDirectLogin();
        if (freshToken) {
          return freshToken;
        }

        // Fallback de contingência final
        const fallbackToken = getStaticFallbackToken();
        if (fallbackToken) {
          inMemoryToken = fallbackToken;
          tokenExpiresAt = parseJwtExpClient(fallbackToken);
          return fallbackToken;
        }
      } catch (err) {
        console.warn('[evidenciaAuthService] Erro ao obter token do backend:', err);
      } finally {
        clientPendingPromise = null;
      }

      const finalFallback = getStaticFallbackToken();
      return inMemoryToken || finalFallback || '';
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
    let token = await this.getToken();
    const headers = new Headers(options.headers || {});
    headers.set('Accept', 'application/json');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const apiOrigin = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

    try {
      let response = await fetch(url, { ...options, headers });

      // Se a API remota responder HTTP 401, força a renovação imediata do token no backend (forceRefresh = true) e tenta 1x mais
      if (response.status === 401) {
        console.warn(`[evidenciaAuthService] HTTP 401 retornado em ${url}. Forçando renovação de token...`);
        const freshToken = await this.getToken(true);
        if (freshToken) {
          const retryHeaders = new Headers(options.headers || {});
          retryHeaders.set('Accept', 'application/json');
          retryHeaders.set('Authorization', `Bearer ${freshToken}`);
          response = await fetch(url, { ...options, headers: retryHeaders });
          if (response.ok) return response;
        }
      }

      // Se a API remota responder erro HTTP (401, 500, etc.) em requisição direta, tenta o proxy backend local (/api/v1/...) se for JSON
      if (!response.ok && url.startsWith(apiOrigin)) {
        const proxyUrl = url.replace(apiOrigin, '');
        console.warn(`[evidenciaAuthService] Fallback de proxy ativado (HTTP ${response.status}): ${url} -> ${proxyUrl}`);
        try {
          const proxyHeaders = new Headers(options.headers || {});
          proxyHeaders.set('Accept', 'application/json');
          const proxyResp = await fetch(proxyUrl, { ...options, headers: proxyHeaders });
          const proxyContentType = proxyResp.headers.get('content-type') || '';
          if (proxyResp.ok && proxyContentType.includes('application/json')) {
            return proxyResp;
          }
        } catch {
          // Mantém a resposta original de erro 401/500
        }
      }

      return response;
    } catch (netErr) {
      // Se for uma requisição direta para apiOrigin e falhar (ex: CORS ou erro de rede), tenta o proxy apenas se responder JSON
      if (url.startsWith(apiOrigin)) {
        const proxyUrl = url.replace(apiOrigin, '');
        console.warn(`[evidenciaAuthService] Requisição direta falhou (${(netErr as Error).message}). Redirecionando para o proxy backend: ${proxyUrl}`);
        try {
          const proxyHeaders = new Headers(options.headers || {});
          proxyHeaders.set('Accept', 'application/json');
          const proxyResp = await fetch(proxyUrl, { ...options, headers: proxyHeaders });
          const proxyContentType = proxyResp.headers.get('content-type') || '';
          if (proxyResp.ok && proxyContentType.includes('application/json')) {
            return proxyResp;
          }
        } catch {}
      }
      throw netErr;
    }
  },
};

