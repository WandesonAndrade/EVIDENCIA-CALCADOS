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
   * Consulta um CEP na API pública ViaCEP e retorna os dados de endereço formatados.
   */
  async fetchAddressByCep(cepInput: string): Promise<ViaCepResult | null> {
    const cleanCep = cepInput.replace(/\D/g, '');
    if (cleanCep.length !== 8) return null;

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      if (!res.ok) return null;
      const data: ViaCepResult = await res.json();
      if (data.erro) return null;
      return data;
    } catch (err) {
      console.warn("📌 Erro ao consultar ViaCEP:", err);
      return null;
    }
  }
};
