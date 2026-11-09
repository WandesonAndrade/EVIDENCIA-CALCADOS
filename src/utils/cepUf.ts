// Funcao pura (sem dependencias de UI) para uso seguro no servidor/Cloud Functions
// Mapeamento preciso de UF por faixa oficial de CEP no Brasil (todos os 26 estados + DF)
export const getUfFromCep = (cep: string | undefined | null, fallback = 'MA'): string => {
  const clean = (cep || '').replace(/\D/g, '');
  if (!clean || clean.length < 2) return fallback;

  const padded = clean.padEnd(8, '0');
  const prefix5 = parseInt(padded.substring(0, 5), 10);
  const prefix2 = parseInt(padded.substring(0, 2), 10);

  // Casos específicos de subdivisão pelo prefixo de 5 dígitos
  if (prefix5 >= 68900 && prefix5 <= 68999) return 'AP'; // Amapá
  if (prefix5 >= 69300 && prefix5 <= 69399) return 'RR'; // Roraima
  if (prefix5 >= 69900 && prefix5 <= 69999) return 'AC'; // Acre
  if (prefix5 >= 76800 && prefix5 <= 76999) return 'RO'; // Rondônia
  if (prefix5 >= 72800 && prefix5 <= 72999) return 'GO'; // Goiás (Entorno do DF)
  if (prefix5 >= 73700 && prefix5 <= 76799) return 'GO'; // Goiás
  if (
    prefix2 === 70 || 
    prefix2 === 71 || 
    (prefix5 >= 72000 && prefix5 <= 72799) || 
    (prefix5 >= 73000 && prefix5 <= 73699)
  ) return 'DF'; // Distrito Federal

  // Mapeamentos gerais por faixa de 2 dígitos
  if (prefix2 >= 1 && prefix2 <= 19) return 'SP';
  if (prefix2 >= 20 && prefix2 <= 28) return 'RJ';
  if (prefix2 === 29) return 'ES';
  if (prefix2 >= 30 && prefix2 <= 39) return 'MG';
  if (prefix2 >= 40 && prefix2 <= 48) return 'BA';
  if (prefix2 === 49) return 'SE';
  if (prefix2 >= 50 && prefix2 <= 56) return 'PE';
  if (prefix2 === 57) return 'AL';
  if (prefix2 === 58) return 'PB';
  if (prefix2 === 59) return 'RN';
  if (prefix2 >= 60 && prefix2 <= 63) return 'CE';
  if (prefix2 === 64) return 'PI'; // Piauí
  if (prefix2 === 65) return 'MA'; // Maranhão
  if (prefix2 >= 66 && prefix2 <= 68) return 'PA'; // Pará
  if (prefix2 === 69) return 'AM'; // Amazonas
  if (prefix2 >= 73 && prefix2 <= 76) return 'GO';
  if (prefix2 === 77) return 'TO'; // Tocantins
  if (prefix2 === 78) return 'MT'; // Mato Grosso
  if (prefix2 === 79) return 'MS'; // Mato Grosso do Sul
  if (prefix2 >= 80 && prefix2 <= 87) return 'PR';
  if (prefix2 >= 88 && prefix2 <= 89) return 'SC';
  if (prefix2 >= 90 && prefix2 <= 99) return 'RS';

  return fallback;
};
