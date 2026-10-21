/**
 * Utilitários para detecção, normalização e resolução do Público / Gênero de Produtos:
 * - Feminino
 * - Masculino
 * - Infantil Feminino
 * - Infantil Masculino
 * - Unissex
 */

export type ProductGender = 
  | 'Feminino'
  | 'Masculino'
  | 'Infantil Feminino'
  | 'Infantil Masculino'
  | 'Unissex';

export const GENDER_OPTIONS: ProductGender[] = [
  'Feminino',
  'Masculino',
  'Infantil Feminino',
  'Infantil Masculino',
  'Unissex',
];

/**
 * Normaliza qualquer texto livre de gênero vindo de formulário ou ERP
 */
export function normalizeProductGender(raw: string | undefined | null): ProductGender | '' {
  if (!raw) return '';
  const clean = raw.trim().toUpperCase();

  if (clean === 'INFANTIL FEMININO' || clean === 'INFANTIL FEM' || clean === 'MENINA' || clean === 'MENINAS') {
    return 'Infantil Feminino';
  }
  if (clean === 'INFANTIL MASCULINO' || clean === 'INFANTIL MASC' || clean === 'MENINO' || clean === 'MENINOS') {
    return 'Infantil Masculino';
  }
  if (clean === 'FEMININO' || clean === 'FEMALE' || clean === 'FEM' || clean === 'MULHER' || clean === 'ADULTO FEMININO') {
    return 'Feminino';
  }
  if (clean === 'MASCULINO' || clean === 'MALE' || clean === 'MASC' || clean === 'HOMEM' || clean === 'ADULTO MASCULINO') {
    return 'Masculino';
  }
  if (clean === 'UNISSEX' || clean === 'UNISEX') {
    return 'Unissex';
  }

  return '';
}

/**
 * Resolve o gênero/público do produto combinando:
 * 1. Campo explícito já cadastrado no banco (`gender`, `genero`)
 * 2. Classificação oficial do ERP MobLink (ex: 002.001 -> Masculino, 002.002 -> Feminino, 002.003 -> Infantil Masculino, 002.004 -> Infantil Feminino)
 * 3. Análise semântica por palavras-chave do nome, grupo e subgrupo
 */
export function resolveProductGender(product: any): ProductGender {
  if (!product) return 'Feminino';

  const rawClass = String(
    product.classificacao || 
    product.cod_classificacao || 
    (product.id_grupo ? `${product.id_grupo}.${product.id_subgrupo || ''}` : '')
  ).trim();

  const subgrupo = String(product.nome_subgrupo || product.subcategoria || product.subcategory || '').toUpperCase();
  const name = String(product.name || product.nome || product.descricao || '').toUpperCase();

  // 1. Campo explícito já salvo no Painel Administrativo
  const explicit = normalizeProductGender(product.gender || product.genero);
  if (explicit) {
    // Proteção contra produtos femininos/infantis/masculinos que receberam 'Unissex' por fallback antigo sem serem unissex
    if (explicit === 'Unissex') {
      const hasExplicitUnissexText = subgrupo.includes('UNISSEX') || subgrupo.includes('UNISEX') || name.includes('UNISSEX') || name.includes('UNISEX');
      if (!hasExplicitUnissexText) {
        if (
          rawClass.startsWith('002.002') ||
          rawClass.startsWith('2.2') ||
          rawClass.startsWith('010.002') ||
          rawClass.startsWith('013.002') ||
          rawClass.startsWith('011.003') ||
          rawClass.startsWith('007.003') ||
          rawClass.startsWith('007.006') ||
          rawClass.startsWith('007.007') ||
          rawClass.startsWith('007.008') ||
          rawClass.startsWith('007.009') ||
          rawClass.startsWith('007.010') ||
          rawClass.startsWith('007.011') ||
          name.includes('FEMININ') ||
          name.includes('BOLSA') ||
          name.includes('NECESSAIRE') ||
          name.includes('NÉCESSAIRE') ||
          name.includes('RASTEIR') ||
          name.includes('SCARPIN') ||
          name.includes('SAPATILHA') ||
          name.includes('VIZZANO') ||
          name.includes('MOLECA') ||
          name.includes('BEIRA RIO') ||
          name.includes('DAKOTA') ||
          name.includes('MODARE') ||
          name.includes('CHENSON')
        ) {
          return 'Feminino';
        }
      }
    }
    return explicit;
  }

  // 2. Classificação Oficial ERP MobLink
  if (rawClass.startsWith('002.004') || rawClass.startsWith('2.4') || rawClass.startsWith('002.4')) {
    return 'Infantil Feminino';
  }
  if (rawClass.startsWith('002.003') || rawClass.startsWith('2.3') || rawClass.startsWith('002.3')) {
    return 'Infantil Masculino';
  }
  if (rawClass.startsWith('002.002') || rawClass.startsWith('2.2') || rawClass.startsWith('002.2')) {
    return 'Feminino';
  }
  if (rawClass.startsWith('002.001') || rawClass.startsWith('2.1') || rawClass.startsWith('002.1')) {
    return 'Masculino';
  }

  // Perfumaria Oficial ERP
  if (rawClass.startsWith('010.001')) return 'Masculino';
  if (rawClass.startsWith('010.002')) return 'Feminino';
  if (rawClass.startsWith('010.003')) {
    return (name.includes('MASC') || name.includes('MENINO') || name.includes('HOMEM ARANHA') || name.includes('BATMAN'))
      ? 'Infantil Masculino'
      : 'Infantil Feminino';
  }

  // Confecções / Acessórios e Escolar ERP
  if (rawClass.startsWith('013.008')) return 'Masculino'; // Cueca
  if (rawClass.startsWith('013.002')) return 'Feminino';  // Bolsa
  if (rawClass.startsWith('011.003')) return 'Feminino';  // Nécessaire
  if (rawClass.startsWith('012.')) {
    return (name.includes('MASC') || name.includes('MENINO') || name.includes('HOMEM ARANHA') || name.includes('BATMAN') || name.includes('CARROS') || name.includes('NARUTO') || name.includes('SONIC'))
      ? 'Infantil Masculino'
      : 'Infantil Feminino';
  }
  if (
    rawClass.startsWith('007.003') ||
    rawClass.startsWith('007.006') ||
    rawClass.startsWith('007.007') ||
    rawClass.startsWith('007.008') ||
    rawClass.startsWith('007.009') ||
    rawClass.startsWith('007.010') ||
    rawClass.startsWith('007.011')
  ) {
    return 'Feminino';
  }

  // 3. Subgrupo ou Grupo do ERP
  if (subgrupo.includes('INFANTIL FEMININO') || subgrupo.includes('MENINA')) return 'Infantil Feminino';
  if (subgrupo.includes('INFANTIL MASCULINO') || subgrupo.includes('MENINO')) return 'Infantil Masculino';
  if (subgrupo.includes('UNISSEX') || subgrupo.includes('UNISEX')) return 'Unissex';
  if (subgrupo.includes('FEMININO') || subgrupo.includes('BOLSA')) return 'Feminino';
  if (subgrupo.includes('MASCULINO')) return 'Masculino';

  // 4. Palavras-chave no nome do produto
  if (name.includes('UNISSEX') || name.includes('UNISEX')) {
    return 'Unissex';
  }

  const isInfantilKeyword = 
    subgrupo.includes('INFANTIL') ||
    subgrupo.includes('KIDS') ||
    name.includes('INFANTIL') || 
    name.includes('BABUCH') || 
    name.includes('BABUCHE') || 
    name.includes('KIDS') || 
    name.includes('BEBE') || 
    name.includes('BEBÊ') || 
    name.includes('BABY') || 
    name.includes('PAMPILI') || 
    name.includes('BIBI') || 
    name.includes('KLIN') || 
    name.includes('MARVEL') || 
    name.includes('DISNEY') || 
    name.includes('HOMEM ARANHA') || 
    name.includes('BARBIE') || 
    name.includes('PRINCESAS') || 
    name.includes('FROZEN') || 
    name.includes('BATMAN') || 
    name.includes('HOT WHEELS');

  if (isInfantilKeyword) {
    if (name.includes('MASCULIN') || name.includes('MASC') || name.includes('MENINO') || name.includes('MARVEL') || name.includes('HOMEM ARANHA') || name.includes('BATMAN') || name.includes('HEROIS') || name.includes('HERÓIS') || name.includes('HOT WHEELS') || name.includes('CARROS') || name.includes('NARUTO') || name.includes('SONIC')) {
      return 'Infantil Masculino';
    }
    return 'Infantil Feminino';
  }

  // Adulto Feminino
  if (
    name.includes('FEMININ') ||
    name.includes('FEM') ||
    name.includes('MULHER') ||
    name.includes('BOLSA') ||
    name.includes('NECESSAIRE') ||
    name.includes('NÉCESSAIRE') ||
    name.includes('MOLECA') ||
    name.includes('VIZZANO') ||
    name.includes('DAKOTA') ||
    name.includes('BEIRA RIO') ||
    name.includes('MODARE') ||
    name.includes('CHENSON') ||
    name.includes('PICCADILLY') ||
    name.includes('RAMARIM') ||
    name.includes('VIA MARTE') ||
    name.includes('MISSISSIPI') ||
    name.includes('PETITE JOLIE') ||
    name.includes('BOTTERO') ||
    name.includes('KOLOSH') ||
    name.includes('AZALEIA') ||
    name.includes('GRENDHA') ||
    name.includes('ZAXY') ||
    name.includes('USAFLEX') ||
    name.includes('SCARPIN') ||
    name.includes('RASTEIR') ||
    name.includes('SAPATILHA') ||
    name.includes('TAMANCO') ||
    name.includes('ANABELA')
  ) {
    return 'Feminino';
  }

  // Adulto Masculino
  if (name.includes('MASCULIN') || name.includes('MASC') || name.includes('HOMEM') || name.includes('CUECA') || name.includes('PEGADA') || name.includes('DEMOCRATA') || name.includes('FERRACINI') || name.includes('MOCASSIM') || name.includes('CARTAGO') || name.includes('RIDER')) {
    return 'Masculino';
  }

  return 'Feminino';
}
