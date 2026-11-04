import { getUfFromCep } from "../utils/orderUtils";

export interface ViaCepResult {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
  suggestedCep?: string;
  suggestedAddress?: string;
}

// Cache em memória para resposta instantânea (0ms) em consultas repetidas
const cepCache = new Map<string, ViaCepResult>();

/**
 * Consulta ViaCEP oficial com timeout
 */
async function fetchFromViaCep(
  cleanCep: string,
  signal?: AbortSignal,
): Promise<ViaCepResult | null> {
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, {
      signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.erro || (!data.localidade && !data.uf)) return null;

    return {
      cep: data.cep || cleanCep,
      logradouro: (data.logradouro || "").trim(),
      complemento: (data.complemento || "").trim(),
      bairro: (data.bairro || "").trim(),
      localidade: (data.localidade || "").trim(),
      uf: (data.uf || "").trim().toUpperCase(),
    };
  } catch {
    return null;
  }
}

/**
 * Consulta BrasilAPI (redundância rápida com base Correios + Widenet)
 */
async function fetchFromBrasilApi(
  cleanCep: string,
  signal?: AbortSignal,
): Promise<ViaCepResult | null> {
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCep}`, {
      signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.city || !data.state) return null;

    return {
      cep: data.cep || cleanCep,
      logradouro: (data.street || "").trim(),
      complemento: "",
      bairro: (data.neighborhood || "").trim(),
      localidade: (data.city || "").trim(),
      uf: (data.state || "").trim().toUpperCase(),
    };
  } catch {
    return null;
  }
}

/**
 * Consulta AwesomeAPI (CDN de alta disponibilidade)
 */
async function fetchFromAwesomeApi(
  cleanCep: string,
  signal?: AbortSignal,
): Promise<ViaCepResult | null> {
  try {
    const res = await fetch(`https://cep.awesomeapi.com.br/json/${cleanCep}`, {
      signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.city || !data.state) return null;

    return {
      cep: data.cep || cleanCep,
      logradouro: (data.address || data.address_name || "").trim(),
      complemento: "",
      bairro: (data.district || "").trim(),
      localidade: (data.city || "").trim(),
      uf: (data.state || "").trim().toUpperCase(),
    };
  } catch {
    return null;
  }
}

/**
 * Consulta OpenCEP
 */
async function fetchFromOpenCep(
  cleanCep: string,
  signal?: AbortSignal,
): Promise<ViaCepResult | null> {
  try {
    const res = await fetch(`https://opencep.com/v1/${cleanCep}`, { signal });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error || (!data.localidade && !data.uf)) return null;

    return {
      cep: data.cep || cleanCep,
      logradouro: (data.logradouro || "").trim(),
      complemento: (data.complemento || "").trim(),
      bairro: (data.bairro || "").trim(),
      localidade: (data.localidade || "").trim(),
      uf: (data.uf || "").trim().toUpperCase(),
    };
  } catch {
    return null;
  }
}

/**
 * Se um CEP de Caxias - MA não for encontrado diretamente (ex: 65606-441 com dígito trocado),
 * faz uma varredura inteligente por proximidade nas faixas de residenciais e bairros da cidade.
 * Ex: 65606-441 -> localiza 65606-841 (Rua 07 de Março, Res. Vila Paraíso, Caxias/MA)
 */
async function findNearbyCaxiasCep(cleanCep: string): Promise<ViaCepResult | null> {
  if (!cleanCep.startsWith("6560")) return null;

  const prefix = cleanCep.slice(0, 5); // ex: 65606
  const sixthDigit = cleanCep.charAt(5); // ex: 4
  const suffix = cleanCep.slice(6); // ex: 41

  // Dígitos mais comuns de loteamentos/residenciais em Caxias (prioriza 8 para Residenciais como Vila Paraíso)
  const candidateDigits = ["8", "7", "0", "1", "2", "3", "4", "5", "6", "9"].filter(d => d !== sixthDigit);

  for (const d of candidateDigits) {
    const candidateCep = prefix + d + suffix;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${candidateCep}/json/`);
      if (res.ok) {
        const data = await res.json();
        if (!data.erro && data.logradouro) {
          return {
            cep: data.cep || candidateCep,
            logradouro: (data.logradouro || "").trim(),
            complemento: (data.complemento || "").trim(),
            bairro: (data.bairro || "").trim(),
            localidade: (data.localidade || "Caxias").trim(),
            uf: (data.uf || "MA").trim().toUpperCase(),
            suggestedCep: data.cep || candidateCep,
            suggestedAddress: `${data.logradouro}${data.bairro ? `, ${data.bairro}` : ""}`,
          };
        }
      }
    } catch {
      // Ignora erro e continua busca
    }
  }

  return null;
}

export const cepService = {
  /**
   * Consulta um CEP com resiliência máxima e autopreenchimento imediato.
   * Utiliza estratégia paralela multi-provedor (ViaCEP + BrasilAPI + AwesomeAPI + OpenCEP),
   * correção inteligente de dígitos por proximidade (Caxias/MA) e fallback regional.
   */
  async fetchAddressByCep(cepInput: string): Promise<ViaCepResult | null> {
    const cleanCep = (cepInput || "").replace(/\D/g, "");
    if (cleanCep.length !== 8) return null;

    // 1. Retorno instantâneo do cache em memória
    if (cepCache.has(cleanCep)) {
      return cepCache.get(cleanCep)!;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      // 2. Consulta paralela aos principais provedores públicos
      const fetchers = [
        fetchFromViaCep(cleanCep, controller.signal),
        fetchFromBrasilApi(cleanCep, controller.signal),
        fetchFromAwesomeApi(cleanCep, controller.signal),
        fetchFromOpenCep(cleanCep, controller.signal),
      ];

      const results = await Promise.allSettled(fetchers);
      clearTimeout(timeoutId);

      // 2.1 Provedor que retornou endereço completo (com rua/logradouro)
      for (const res of results) {
        if (res.status === "fulfilled" && res.value && res.value.logradouro) {
          cepCache.set(cleanCep, res.value);
          return res.value;
        }
      }

      // 2.2 Provedor que retornou apenas localidade/UF
      for (const res of results) {
        if (
          res.status === "fulfilled" &&
          res.value &&
          (res.value.localidade || res.value.uf)
        ) {
          // Se for de Caxias e não veio rua, tenta auto-correção por proximidade
          if (cleanCep.startsWith("6560")) {
            const nearby = await findNearbyCaxiasCep(cleanCep);
            if (nearby) {
              cepCache.set(cleanCep, nearby);
              return nearby;
            }
          }
          cepCache.set(cleanCep, res.value);
          return res.value;
        }
      }
    } catch (err) {
      console.warn("📌 Erro na consulta paralela de CEP:", err);
    } finally {
      clearTimeout(timeoutId);
    }

    // 3. Busca por Proximidade Regional (Caxias - MA) se nenhuma API encontrou o CEP digitado
    if (cleanCep.startsWith("6560")) {
      const nearby = await findNearbyCaxiasCep(cleanCep);
      if (nearby) {
        cepCache.set(cleanCep, nearby);
        return nearby;
      }
    }

    // 4. Fallback Inteligente por Faixa Regional de CEP
    const autoUf = getUfFromCep(cleanCep, "MA");
    const numCep = parseInt(cleanCep.substring(0, 5), 10);

    let inferredCity = "";
    if (numCep >= 65600 && numCep <= 65609) {
      inferredCity = "Caxias";
    } else if (numCep >= 64000 && numCep <= 64099) {
      inferredCity = "Teresina";
    } else if (numCep >= 65000 && numCep <= 65109) {
      inferredCity = "São Luís";
    }

    const fallbackResult: ViaCepResult = {
      cep: cleanCep,
      logradouro: "",
      complemento: "",
      bairro: "",
      localidade: inferredCity,
      uf: autoUf,
    };

    if (fallbackResult.localidade || fallbackResult.uf) {
      cepCache.set(cleanCep, fallbackResult);
      return fallbackResult;
    }

    return null;
  },

  /**
   * Limpa o cache de CEPs em memória
   */
  clearCache(): void {
    cepCache.clear();
  },
};
