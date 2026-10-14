/**
 * Utilitários para detecção, normalização e resolução do Público / Gênero de Produtos:
 * - Feminino
 * - Masculino
 * - Infantil Feminino
 * - Infantil Masculino
 * - Infantil (ou Infantil Unissex)
 * - Unissex
 */

export type ProductGender = 
  | 'Feminino'
  | 'Masculino'
  | 'Infantil Feminino'
  | 'Infantil Masculino'
  | 'Infantil'
  | 'Unissex';

export const GENDER_OPTIONS: ProductGender[] = [
  'Feminino',
  'Masculino',
  'Infantil Feminino',
  'Infantil Masculino',
  'Infantil',
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
  if (clean === 'INFANTIL' || clean === 'KIDS' || clean === 'BEBE' || clean === 'BEBÊ' || clean === 'BABY') {
    return 'Infantil';
  }
  if (clean === 'FEMININO' || clean === 'FEM' || clean === 'MULHER' || clean === 'ADULTO FEMININO') {
    return 'Feminino';
  }
  if (clean === 'MASCULINO' || clean === 'MASC' || clean === 'HOMEM' || clean === 'ADULTO MASCULINO') {
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

  // 1. Campo explícito já salvo
  const explicit = normalizeProductGender(product.gender || product.genero);
  if (explicit) return explicit;

  // 2. Classificação Oficial ERP MobLink
  const rawClass = String(
    product.classificacao || 
    product.cod_classificacao || 
    (product.id_grupo ? `${product.id_grupo}.${product.id_subgrupo || ''}` : '')
  ).trim();

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
  if (rawClass.startsWith('010.003')) return 'Infantil';

  // 3. Subgrupo ou Grupo do ERP
  const subgrupo = String(product.nome_subgrupo || product.subcategoria || product.subcategory || '').toUpperCase();
  if (subgrupo.includes('INFANTIL FEMININO') || subgrupo.includes('MENINA')) return 'Infantil Feminino';
  if (subgrupo.includes('INFANTIL MASCULINO') || subgrupo.includes('MENINO')) return 'Infantil Masculino';
  if (subgrupo.includes('FEMININO')) return 'Feminino';
  if (subgrupo.includes('MASCULINO')) return 'Masculino';
  if (subgrupo.includes('INFANTIL') || subgrupo.includes('KIDS')) return 'Infantil';

  // 4. Palavras-chave no nome do produto
  const name = String(product.name || product.nome || product.descricao || '').toUpperCase();

  const isInfantilKeyword = 
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
    if (name.includes('FEMININ') || name.includes('MENINA') || name.includes('BARBIE') || name.includes('PRINCESA') || name.includes('FROZEN') || name.includes('ROSA')) {
      return 'Infantil Feminino';
    }
    if (name.includes('MASCULIN') || name.includes('MENINO') || name.includes('MARVEL') || name.includes('HOMEM ARANHA') || name.includes('BATMAN') || name.includes('HEROIS') || name.includes('HERÓIS')) {
      return 'Infantil Masculino';
    }
    return 'Infantil';
  }

  // Adulto
  if (name.includes('FEMININ') || name.includes('FEM') || name.includes('MULHER') || name.includes('MOLECA') || name.includes('VIZZANO') || name.includes('DAKOTA') || name.includes('BEIRA RIO') || name.includes('SCARPIN') || name.includes('RASTEIR')) {
    return 'Feminino';
  }

  if (name.includes('MASCULIN') || name.includes('MASC') || name.includes('HOMEM') || name.includes('PEGADA') || name.includes('DEMOCRATA') || name.includes('FERRACINI') || name.includes('MOCASSIM')) {
    return 'Masculino';
  }

  return 'Feminino';
}
