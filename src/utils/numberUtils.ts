/**
 * Converte valores monetários ou numéricos vindos de APIs ou entradas do usuário
 * (inclusive no formato PT-BR contendo vírgula e/ou pontos de milhar, ex: "1.250,50") para número float JS.
 */
export const parseValor = (val: any): number => {
  if (typeof val === "number" && !isNaN(val) && val > 0) return val;
  if (typeof val === "string") {
    // Remove pontos de milhar e substitui a vírgula decimal por ponto
    const normalized = val.replace(/\./g, "").replace(",", ".");
    const num = Number(normalized);
    return !isNaN(num) && num > 0 ? num : 0;
  }
  return 0;
};
