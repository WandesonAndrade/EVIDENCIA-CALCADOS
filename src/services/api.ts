/**
 * @file src/services/api.ts
 * @description Módulo centralizador de configuração de API (Base URL & Endpoints).
 * Utiliza a variável de ambiente import.meta.env.VITE_API_URL como base oficial de concatenação.
 */

const getEnvApiUrl = (): string => {
  const envUrl =
    typeof import.meta !== "undefined" && import.meta.env
      ? import.meta.env.VITE_API_URL ||
        import.meta.env.VITE_MOBLINK_API_URL ||
        import.meta.env.VITE_MOBLINK_API_BASE_URL
      : typeof process !== "undefined"
        ? process.env.VITE_API_URL
        : undefined;

  if (envUrl && typeof envUrl === "string" && envUrl.trim().length > 0) {
    // Remove barras finais se houver
    return envUrl.trim().replace(/\/$/, "");
  }

  // Base URL padrão oficial do projeto Evidência Calçados
  return "https://api.evidenciacalcados.com.br";
};

/**
 * Base URL oficial da API centralizada.
 * Exemplo: "${import.meta.env.VITE_API_URL}" -> "https://api.evidenciacalcados.com.br/api/v1"
 */
export const API_BASE_URL: string = getEnvApiUrl();

/**
 * Helper utilitário para concatenar rotas e parâmetros à API_BASE_URL centralizada.
 * Exemplo: getApiEndpoint('/produtos?pdf=false') -> "${VITE_API_URL}/produtos?pdf=false"
 */
export function getApiEndpoint(path: string = ""): string {
  if (!path) return API_BASE_URL;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

/**
 * Dicionário centralizado de rotas e endpoints da API Evidência Calçados MobLink ERP
 */
export const API_ENDPOINTS = {
  /** Rota principal do catálogo de produtos em JSON: GET ${VITE_API_URL}/produtos?pdf=false */
  PRODUTOS: getApiEndpoint("/produtos?pdf=false"),

  /** Rota de consulta individual de produto: GET ${VITE_API_URL}/produtos/{id} */
  PRODUTO_SINGLE: (id: string | number) =>
    getApiEndpoint(`/produtos/${String(id).trim()}`),

  /** Rota de variações de grade de um produto: GET ${VITE_API_URL}/produtos/{id}/grades */
  PRODUTO_GRADES: (id: string | number) =>
    getApiEndpoint(`/produtos/${String(id).trim()}/grades`),

  /** Rota de grupos e subgrupos de categorias: GET ${VITE_API_URL}/produtos/grupos */
  PRODUTOS_GRUPOS: getApiEndpoint("/produtos/grupos"),

  /** Rota de matriz geral de grades: GET ${VITE_API_URL}/gradesprodutos */
  GRADES_PRODUTOS: getApiEndpoint("/gradesprodutos"),

  /** Rota de grade específica por ID: GET ${VITE_API_URL}/gradesprodutos/{id} */
  GRADE_SINGLE: (id: string | number) =>
    getApiEndpoint(`/gradesprodutos/${String(id).trim()}`),

  /** Rota de cadastro e consulta de clientes: GET/POST ${VITE_API_URL}/clientes */
  CLIENTES: getApiEndpoint("/clientes"),

  /** Rota de consulta de cliente por ID: GET ${VITE_API_URL}/clientes/{id} */
  CLIENTE_SINGLE: (id: string | number) =>
    getApiEndpoint(`/clientes/${String(id).trim()}`),

  /** Rota de consulta de faturas e carne de clientes: GET ${VITE_API_URL}/clientes/{id}/contas-receber?formatada=false&vencidas=false */
  CLIENTE_CONTAS_RECEBER: (id: string | number) =>
    getApiEndpoint(
      `/clientes/${String(id).trim()}/contas-receber?formatada=false&vencidas=false`,
    ),

  /** Rota de autenticação JWT: POST ${VITE_API_URL}/login */
  LOGIN: getApiEndpoint("/login"),
};
