import { Product } from '../../../types';
import { normalizeSubcategoryName } from '../../../services/moblinkCategoriesService';
import { hasProductValidPhoto } from '../../../utils/photoUtils';

export type AudienceKey = 'feminino' | 'masculino' | 'infantil';

export interface AudienceSubcategoryItem {
  name: string;
  slug: string;
  count: number;
  category: string;
}

export interface AudienceMetadata {
  key: AudienceKey;
  label: string;
  title: string;
  collectionBadge: string;
  subtitle: string;
  ctaText: string;
  bannerGradient: string;
}

export const AUDIENCE_CONFIGS: Record<AudienceKey, AudienceMetadata> = {
  feminino: {
    key: 'feminino',
    label: 'Feminino',
    title: 'Subcategorias Femininas',
    collectionBadge: 'COLEÇÃO FEMININA',
    subtitle: 'Subcategorias cadastradas com produtos disponíveis e foto na loja',
    ctaText: 'Explorar Tudo FEMININO',
    bannerGradient: 'from-[#002850] to-[#003e92]',
  },
  masculino: {
    key: 'masculino',
    label: 'Masculino',
    title: 'Subcategorias Masculinas',
    collectionBadge: 'COLEÇÃO MASCULINA',
    subtitle: 'Subcategorias cadastradas com produtos disponíveis e foto na loja',
    ctaText: 'Explorar Tudo MASCULINO',
    bannerGradient: 'from-[#002244] to-[#003875]',
  },
  infantil: {
    key: 'infantil',
    label: 'Infantil & Bebê',
    title: 'Subcategorias Infantis',
    collectionBadge: 'COLEÇÃO INFANTIL & BEBÊ',
    subtitle: 'Subcategorias cadastradas com produtos disponíveis e foto na loja',
    ctaText: 'Explorar Tudo INFANTIL',
    bannerGradient: 'from-[#002d5a] to-[#004a80]',
  },
};

/**
 * Normaliza um texto para slug de URL seguro (sem acentos e em minúsculas)
 */
export function slugifyParam(text: string = ''): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}

/**
 * Verifica se um valor de subcategoria bate com o slug da URL
 */
export function matchSubcategorySlug(candidate: string = '', slug: string = ''): boolean {
  if (!candidate || !slug) return false;
  const cSlug = slugifyParam(candidate);
  const sSlug = slugifyParam(slug);
  return cSlug === sSlug || cSlug.includes(sSlug) || sSlug.includes(cSlug);
}

/**
 * Verifica se o produto pertence estritamente ao público-alvo (Feminino, Masculino, Infantil)
 * Utiliza códigos de classificação oficial ERP MobLink, metadados e taxonomia.
 */
export function isProductInAudience(prod: Product | any, audience: AudienceKey): boolean {
  if (!prod) return false;

  const pClass = String(prod.classificacao || '').trim();
  const pCat = (prod.category || '').toUpperCase();
  const pGrupo = (prod.nome_grupo || '').toUpperCase();
  const pSub = (prod.nome_subgrupo || prod.subcategory || '').toUpperCase();
  const pName = (prod.name || '').toUpperCase();
  const pGender = String(prod.gender || prod.genero || '').toUpperCase();
  const normSubRaw = normalizeSubcategoryName(pSub).toUpperCase();

  if (audience === 'feminino') {
    // 1. Classificação oficial ERP MobLink
    if (
      pClass.startsWith('001.002') ||
      pClass.startsWith('002.002') ||
      pClass.startsWith('003.002') ||
      pClass.startsWith('1.2') ||
      pClass.startsWith('2.2') ||
      pClass.startsWith('3.2')
    ) {
      return true;
    }

    if (pGender === 'FEMALE' || pGender === 'FEMININO') {
      return true;
    }

    const isExplicitFem =
      pSub.includes('FEMININ') ||
      normSubRaw.includes('FEMININ') ||
      pCat.includes('FEMININ') ||
      pGrupo.includes('FEMININ') ||
      pName.includes('FEMININ') ||
      pName.includes('FEMINA') ||
      pName.includes('FEM ') ||
      pName.includes('SANDÁLIA') ||
      pName.includes('SANDALIA') ||
      pName.includes('RASTEIRA') ||
      pName.includes('SAPATILHA') ||
      pName.includes('SCARPIN') ||
      pName.includes('SALTO');

    if (isExplicitFem) {
      // Exclui apenas se tiver marcação explícita de infantil
      const isExplicitInf =
        pSub.includes('INFANTIL') ||
        normSubRaw.includes('INFANTIL') ||
        pName.includes('INFANTIL') ||
        pName.includes('KIDS') ||
        pName.includes('BEBÊ') ||
        pClass.startsWith('001.003') ||
        pClass.startsWith('001.004');
      return !isExplicitInf;
    }

    const isExplicitMasc =
      pSub.includes('MASCULIN') ||
      normSubRaw.includes('MASCULIN') ||
      pCat.includes('MASCULIN') ||
      pGrupo.includes('MASCULIN') ||
      pName.includes('MASCULIN') ||
      pName.includes('MASCULINO') ||
      pName.includes('SAPATÊNIS') ||
      pName.includes('SAPATENIS') ||
      pClass.startsWith('001.001') ||
      pClass.startsWith('002.001');

    const isExplicitInf =
      pSub.includes('INFANTIL') ||
      normSubRaw.includes('INFANTIL') ||
      pCat.includes('INFANTIL') ||
      pGrupo.includes('INFANTIL') ||
      pName.includes('INFANTIL') ||
      pSub.includes('BEBÊ') ||
      pName.includes('KIDS') ||
      pName.includes('BABY') ||
      pClass.startsWith('001.003') ||
      pClass.startsWith('001.004');

    if (isExplicitMasc || isExplicitInf) {
      return false;
    }

    // Itens padrão neutros de calçados femininos na loja
    return true;
  }

  if (audience === 'masculino') {
    if (
      pClass.startsWith('001.001') ||
      pClass.startsWith('002.001') ||
      pClass.startsWith('003.001') ||
      pClass.startsWith('1.1') ||
      pClass.startsWith('2.1') ||
      pClass.startsWith('3.1')
    ) {
      return true;
    }

    if (pGender === 'MALE' || pGender === 'MASCULINO') {
      return true;
    }

    const isExplicitMasc =
      pSub.includes('MASCULIN') ||
      normSubRaw.includes('MASCULIN') ||
      pCat.includes('MASCULIN') ||
      pGrupo.includes('MASCULIN') ||
      pName.includes('MASCULIN') ||
      pName.includes('MASCULINO') ||
      pName.includes('MASC ') ||
      pSub.includes('SAPATÊNIS') ||
      pSub.includes('SAPATENIS') ||
      pName.includes('SAPATÊNIS') ||
      pName.includes('SAPATENIS');

    if (isExplicitMasc) {
      // Exclui se for explícito feminino ou infantil
      const isFem = pSub.includes('FEMININ') || pCat.includes('FEMININ') || pClass.startsWith('001.002');
      const isInf = pSub.includes('INFANTIL') || pName.includes('KIDS') || pClass.startsWith('001.003');
      return !isFem && !isInf;
    }

    return false;
  }

  if (audience === 'infantil') {
    if (
      pClass.startsWith('001.003') ||
      pClass.startsWith('001.004') ||
      pClass.startsWith('002.003') ||
      pClass.startsWith('002.004') ||
      pClass.startsWith('003.003') ||
      pClass.startsWith('1.3') ||
      pClass.startsWith('2.3') ||
      pClass.startsWith('2.4')
    ) {
      return true;
    }

    if (pGender === 'KIDS' || pGender === 'INFANTIL') {
      return true;
    }

    return (
      pSub.includes('INFANTIL') ||
      normSubRaw.includes('INFANTIL') ||
      pCat.includes('INFANTIL') ||
      pGrupo.includes('INFANTIL') ||
      pName.includes('INFANTIL') ||
      pSub.includes('BEBÊ') ||
      pSub.includes('BEBE') ||
      pName.includes('KIDS') ||
      pName.includes('BABY')
    );
  }

  return false;
}

/**
 * Resolve o nome amigável e canônico de subcategoria para um produto
 */
export function resolveProductSubcategoryName(prod: Product | any): string {
  const rawSubName = (prod.nome_subgrupo || prod.subcategory || '').trim();
  let normName = '';

  if (rawSubName && rawSubName.toUpperCase() !== 'GERAL' && rawSubName.toUpperCase() !== 'TODAS') {
    normName = normalizeSubcategoryName(rawSubName);
  }

  const pName = (prod.name || '').toUpperCase();

  if (
    !normName ||
    normName.toUpperCase() === 'GERAL' ||
    normName.toUpperCase() === 'FEMININO' ||
    normName.toUpperCase() === 'MASCULINO' ||
    normName.toUpperCase() === 'INFANTIL'
  ) {
    if (pName.includes('SANDÁLIA') || pName.includes('SANDALIA')) normName = 'Sandálias';
    else if (pName.includes('RASTEIRA') || pName.includes('PAPETE')) normName = 'Rasteiras & Papetes';
    else if (pName.includes('TÊNIS') || pName.includes('TENIS') || pName.includes('SNEAKER')) normName = 'Tênis';
    else if (pName.includes('SAPATILHA')) normName = 'Sapatilhas';
    else if (pName.includes('SCARPIN') || pName.includes('SALTO')) normName = 'Scarpins & Saltos';
    else if (pName.includes('BOTA') || pName.includes('COTURNO')) normName = 'Botas & Coturnos';
    else if (pName.includes('CHINELO') || pName.includes('SLIDE')) normName = 'Chinelos & Slides';
    else if (pName.includes('MOCASSIM') || pName.includes('DRIVERS')) normName = 'Mocassins';
    else if (pName.includes('SAPATO') || pName.includes('SAPATÊNIS') || pName.includes('SAPATENIS')) normName = 'Sapatos';
    else if (pName.includes('BOLSA')) normName = 'Bolsas';
    else if (pName.includes('CARTEIRA')) normName = 'Carteiras';
    else if (pName.includes('CINTO')) normName = 'Cintos';
    else if (pName.includes('MOCHILA')) normName = 'Mochilas';
    else if (pName.includes('MALA') || pName.includes('VIAGEM')) normName = 'Malas & Viagem';
    else if (pName.includes('RELÓGIO') || pName.includes('RELOGIO')) normName = 'Relógios';
    else if (pName.includes('PERFUME') || pName.includes('COLÔNIA') || pName.includes('COLONIA') || pName.includes('BODY SPLASH')) normName = 'Perfumes';
    else if (pName.includes('BLUSA') || pName.includes('CAMISA') || pName.includes('VESTIDO') || pName.includes('CALÇA') || pName.includes('JEANS')) normName = 'Confecções & Moda';
  }

  return normName;
}

/**
 * Extrai a lista dinâmica de subcategorias com suas respectivas contagens para um público-alvo
 */
export function extractAudienceSubcategories(
  products: Product[] = [],
  audience: AudienceKey
): AudienceSubcategoryItem[] {
  if (!products || products.length === 0) return [];

  const subMap = new Map<string, { name: string; count: number; category: string }>();

  products.forEach((prod) => {
    // 1. Visibilidade na loja
    if (prod.visible === false) return;

    // 2. Disponibilidade em estoque
    const hasStock = prod.stock !== undefined ? prod.stock > 0 : (prod.saldo_loja ?? 0) > 0;
    if (!hasStock) return;

    // 3. Foto real válida
    if (!hasProductValidPhoto(prod)) return;

    // 4. Pertencimento ao público-alvo
    if (!isProductInAudience(prod, audience)) return;

    // 5. Nome de subcategoria
    const normName = resolveProductSubcategoryName(prod);
    if (!normName) return;

    const key = normName.toUpperCase();
    if (key === 'FEMININO' || key === 'MASCULINO' || key === 'INFANTIL' || key === 'GERAL') return;

    const catName = prod.category || prod.nome_grupo || 'Calçados';
    const existing = subMap.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      subMap.set(key, { name: normName, count: 1, category: catName });
    }
  });

  // Ordena por maior quantidade de produtos em estoque (e em seguida por ordem alfabética)
  return Array.from(subMap.values())
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .map((item) => ({
      ...item,
      slug: slugifyParam(item.name),
    }));
}

/**
 * Constrói a URL com query params padronizados para navegação
 */
export function buildCategoryUrl(category: string, subcategory?: string): string {
  const catSlug = slugifyParam(category);
  const params = new URLSearchParams();
  params.set('categoria', catSlug);

  if (subcategory && subcategory.toUpperCase() !== 'TODAS' && subcategory.toUpperCase() !== 'TODOS') {
    params.set('subcategoria', slugifyParam(subcategory));
  }

  return `?${params.toString()}`;
}
