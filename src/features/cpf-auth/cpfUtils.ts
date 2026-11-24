/**
 * Utilitários puros para validação e manipulação de CPF (Cadastro de Pessoa Física)
 */

/**
 * Remove qualquer caractere não numérico da string de CPF
 */
export function cleanCpf(cpf: string): string {
  if (!cpf) return '';
  return cpf.replace(/\D/g, '').slice(0, 11);
}

/**
 * Aplica máscara padrão de CPF: 000.000.000-00
 */
export function formatCpf(val: string): string {
  const digits = cleanCpf(val);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/**
 * Validação algorítmica completa de CPF incluindo os dois dígitos verificadores
 */
export function isValidCpf(val: string): boolean {
  const cpf = cleanCpf(val);

  if (cpf.length !== 11) {
    return false;
  }

  // Descarta sequências conhecidas de dígitos repetidos (ex: 00000000000, 11111111111)
  if (/^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  // 1º dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i), 10) * (10 - i);
  }
  let rest = 11 - (sum % 11);
  let digit1 = rest >= 10 ? 0 : rest;

  if (digit1 !== parseInt(cpf.charAt(9), 10)) {
    return false;
  }

  // 2º dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i), 10) * (11 - i);
  }
  rest = 11 - (sum % 11);
  let digit2 = rest >= 10 ? 0 : rest;

  return digit2 === parseInt(cpf.charAt(10), 10);
}
