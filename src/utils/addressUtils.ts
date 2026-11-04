/**
 * Utilitários para tratamento e higienização de endereços no e-commerce
 */

export interface FormatAddressOptions {
  street?: string;
  number?: string;
  district?: string;
  city?: string;
  state?: string;
  cep?: string;
  complement?: string;
  reference?: string;
}

/**
 * Limpa e extrai estritamente o nome do Logradouro / Rua,
 * eliminando concatenações indevidas de número, bairro, cidade, UF e CEP.
 * 
 * Exemplo de entrada corrompida:
 * "Rua 07 de Março,, Nº 07, vila paraiso, Caxias/MA - CEP: 65606-441 (Q D 19), Nº 07..."
 * Retorna: "Rua 07 de Março"
 */
export function extractStreetName(rawAddress?: string | null): string {
  if (!rawAddress) return '';
  let str = String(rawAddress).trim();

  // 1. Detecta prefixo de número separado por vírgula(s): ", Nº 07" ou ",, Nº 07" ou ", nº 123" ou ", 123"
  const matchNumero = str.match(/^(.*?)(?:,\s*)+(?:[nN][ºo°\.]?\s*)?\d+\b/i);
  if (matchNumero && matchNumero[1] && matchNumero[1].trim().length >= 2) {
    str = matchNumero[1].trim();
  }

  // 2. Se o número for sem número (S/N): ", S/N" ou ", Nº S/N"
  const matchSN = str.match(/^(.*?)(?:,\s*)+(?:[nN][ºo°\.]?\s*)?S\/N\b/i);
  if (matchSN && matchSN[1] && matchSN[1].trim().length >= 2) {
    str = matchSN[1].trim();
  }

  // 3. Se contiver marcador típico de CEP: "- CEP: 65606-441" ou ", CEP: ..."
  const matchCep = str.match(/^(.*?)(?:,\s*|\s+-\s+)(?:cep\s*:?\s*\d{5}-?\d{3})/i);
  if (matchCep && matchCep[1] && matchCep[1].trim().length >= 2) {
    str = matchCep[1].trim();
  }

  // 4. Se contiver padrão de Cidade/UF: ", Caxias/MA" ou ", Caxias - MA"
  const matchCityUf = str.match(/^(.*?)(?:,\s*)+[a-zA-Z\u00C0-\u00FF\s]+\s*[\/-]\s*[A-Z]{2}\b/i);
  if (matchCityUf && matchCityUf[1] && matchCityUf[1].trim().length >= 2) {
    str = matchCityUf[1].trim();
  }

  // Remove vírgulas, hífens ou pontuação residual no final
  str = str.replace(/[,;.\-\s]+$/, '').trim();

  return str;
}

/**
 * Monta o endereço completo formatado para entregas, etiquetas e romaneios.
 */
export function formatFullAddress(opts: FormatAddressOptions): string {
  const street = extractStreetName(opts.street);
  const num = (opts.number || '').trim();
  const district = (opts.district || '').trim();
  const city = (opts.city || '').trim();
  const state = (opts.state || '').trim().toUpperCase();
  const cep = (opts.cep || '').trim();
  const complement = (opts.complement || '').trim();
  const reference = (opts.reference || '').trim();

  if (!street) return '';

  const parts: string[] = [street];
  if (num) {
    parts.push(`Nº ${num}`);
  }
  if (district) {
    parts.push(district);
  }

  let base = parts.join(', ');

  if (city && state) {
    base += `, ${city}/${state}`;
  } else if (city) {
    base += `, ${city}`;
  } else if (state) {
    base += `/${state}`;
  }

  if (cep) {
    base += ` - CEP: ${cep}`;
  }
  if (complement) {
    base += ` (${complement})`;
  }
  if (reference) {
    base += ` [Ref: ${reference}]`;
  }

  return base;
}

