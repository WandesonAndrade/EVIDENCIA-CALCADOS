import { ShippingService } from "./shipping/shippingService.js";

export interface ViaCepResult {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export const cepService = {
  /**
   * Consulta um CEP com resiliência:
   * 1ª Tentativa: API do Melhor Envio (via rota de backend /api/shipping/cep ou diretamente via ShippingService)
   * 2ª Tentativa (Fallback): ViaCEP API pública
   */
  async fetchAddressByCep(cepInput: string): Promise<ViaCepResult | null> {
    const cleanCep = cepInput.replace(/\D/g, "");
    if (cleanCep.length !== 8) return null;

    // 1. Tenta buscar via backend proxy /api/shipping/cep se disponível no browser
    if (typeof window !== "undefined") {
      try {
        const res = await fetch(`/api/shipping/cep/${cleanCep}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.location) {
            const loc = json.location;
            if (loc.street || loc.city || loc.neighborhood) {
              console.info("📌 Endereço obtido via Melhor Envio API");
              return {
                cep: loc.postalCode || cleanCep,
                logradouro: loc.street || "",
                complemento: loc.complement || "",
                bairro: loc.neighborhood || loc.district || "",
                localidade: loc.city || "",
                uf: loc.state || "",
              };
            }
          }
        }
      } catch (err) {
        console.warn("📌 Falha ao consultar CEP via /api/shipping/cep, tentando fallback...", err);
      }
    }

    // 1b. Tenta buscar via ShippingService direto no Node.js/Server
    try {
      const provider = ShippingService.getProvider();
      const loc = await provider.fetchAddressByCep(cleanCep);
      if (loc && (loc.street || loc.city || loc.neighborhood)) {
        console.info(`📌 Endereço obtido via ${provider.providerName} (Servidor)`);
        return {
          cep: loc.postalCode || cleanCep,
          logradouro: loc.street || "",
          complemento: loc.complement || "",
          bairro: loc.neighborhood || loc.district || "",
          localidade: loc.city || "",
          uf: loc.state || "",
        };
      }
    } catch {
      // Avança para o fallback do ViaCEP
    }

    // 2. Fallback Transparente para a API pública do ViaCEP
    try {
      console.info("📌 Utilizando fallback para ViaCEP...");
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      if (!res.ok) return null;
      const data: ViaCepResult = await res.json();
      if (data.erro) return null;
      return data;
    } catch (err) {
      console.warn("📌 Erro no fallback do ViaCEP:", err);
      return null;
    }
  }
};
