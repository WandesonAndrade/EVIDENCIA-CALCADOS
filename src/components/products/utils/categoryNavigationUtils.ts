import { Product } from '../../../types';
import { normalizeSubcategoryName } from '../../../services/moblinkCategoriesService';
import { hasProductValidPhoto } from '../../../utils/photoUtils';
import { extractClassificacaoCategoria, isIgnoredClassification } from '../../../services/moblinkProductsService';

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

  // Regra do E-commerce: Produtos com classificação 001.001 NUNCA entram no e-commerce
  if (isIgnoredClassification(prod)) return false;

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
      pClass.startsWith('002.002') ||
      pClass.startsWith('007.003') ||
      pClass.startsWith('007.006') ||
      pClass.startsWith('007.007') ||
      pClass.startsWith('007.008') ||
      pClass.startsWith('007.009') ||
      pClass.startsWith('010.002') ||
      pClass.startsWith('2.2')
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
        pClass.startsWith('002.003') ||
        pClass.startsWith('002.004');
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
      pClass.startsWith('002.003') ||
      pClass.startsWith('002.004');

    if (isExplicitMasc || isExplicitInf) {
      return false;
    }

    // Produtos sem classificação definida não devem ser atribuídos compulsoriamente a feminino
    if (pCat.includes('SEM CLASSIFICA') || pGrupo.includes('SEM CLASSIFICA')) {
      return false;
    }

    // Itens padrão neutros de calçados femininos na loja
    return true;
  }

  if (audience === 'masculino') {
    if (
      pClass.startsWith('002.001') ||
      pClass.startsWith('010.001') ||
      pClass.startsWith('2.1') ||
      pClass.startsWith('10.1')
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
      const isFem = pSub.includes('FEMININ') || pCat.includes('FEMININ');
      const isInf = pSub.includes('INFANTIL') || pName.includes('KIDS') || pClass.startsWith('002.003') || pClass.startsWith('002.004');
      return !isFem && !isInf;
    }

    return false;
  }

  if (audience === 'infantil') {
    if (
      pClass.startsWith('002.003') ||
      pClass.startsWith('002.004') ||
      pClass.startsWith('010.003') ||
      pClass.startsWith('012.') ||
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
 * Resolve o nome amigável e canônico de subcategoria para um produto.
 * Se o produto contiver termos genéricos de gênero (ex: FEMININO, MASCULINO, INFANTIL)
 * ou ausência de subcategoria no ERP, infere com precisão a subcategoria real do item
 * (Sandálias, Tênis, Rasteiras & Papetes, Botas & Coturnos, Bolsas, etc.) através do nome/descrição.
 */
export function resolveProductSubcategoryName(prod: Product | any): string {
  if (!prod) return '';

  const rawSubName = (prod.nome_subgrupo || prod.subcategory || '').trim();
  let normName = '';

  if (rawSubName && rawSubName.toUpperCase() !== 'GERAL' && rawSubName.toUpperCase() !== 'TODAS') {
    normName = normalizeSubcategoryName(rawSubName);
  }

  const upperNorm = normName.toUpperCase();
  const isGenericOrGender = (
    !normName ||
    upperNorm === 'GERAL' ||
    upperNorm === 'TODAS' ||
    upperNorm === 'TODOS' ||
    upperNorm === 'FEMININO' ||
    upperNorm === 'MASCULINO' ||
    upperNorm === 'INFANTIL' ||
    upperNorm === 'BEBÊ' ||
    upperNorm === 'BEBE' ||
    upperNorm === 'UNISSEX' ||
    upperNorm === 'CALÇADOS' ||
    upperNorm === 'CALCADOS' ||
    upperNorm === 'CALÇADO' ||
    upperNorm === 'CALCADO' ||
    upperNorm.includes('CALÇADOS FEMININ') ||
    upperNorm.includes('CALCADOS FEMININ') ||
    upperNorm.includes('CALÇADOS MASCULIN') ||
    upperNorm.includes('CALCADOS MASCULIN') ||
    upperNorm.includes('CALÇADOS INFANT') ||
    upperNorm.includes('CALCADOS INFANT') ||
    upperNorm.includes('SEM CLASSIFICA') ||
    /^\d+(\.\d+)?$/.test(normName)
  );

  const pName = (prod.name || prod.descricao || '').toUpperCase();

  if (isGenericOrGender) {
    if (pName.includes('SANDÁLIA') || pName.includes('SANDALIA') || pName.includes('ANABELA') || pName.includes('BIRKEN')) {
      normName = 'Sandálias';
    } else if (pName.includes('RASTEIRA') || pName.includes('RASTEIRINHA') || pName.includes('PAPETE')) {
      normName = 'Rasteiras & Papetes';
    } else if (pName.includes('TÊNIS') || pName.includes('TENIS') || pName.includes('SNEAKER') || pName.includes('RUNNING') || pName.includes('JOGGING') || pName.includes('CHUTEIRA') || pName.includes('SOCIETY')) {
      normName = 'Tênis';
    } else if (pName.includes('SAPATILHA') || pName.includes('ALPARGATA')) {
      normName = 'Sapatilhas';
    } else if (pName.includes('SCARPIN') || pName.includes('SALTO') || pName.includes('PEEP TOE')) {
      normName = 'Scarpins & Saltos';
    } else if (pName.includes('BOTA') || pName.includes('COTURNO') || pName.includes('CANO CURTO') || pName.includes('CANO ALTO') || pName.includes('CANO LONGO') || pName.includes('CHELSEA') || pName.includes('OVER THE KNEE')) {
      normName = 'Botas & Coturnos';
    } else if (pName.includes('CHINELO') || pName.includes('SLIDE') || pName.includes('BABUCHE') || pName.includes('HAVAIANAS') || pName.includes('IPANEMA') || pName.includes('CARTAGO') || pName.includes('RIDER')) {
      normName = 'Chinelos & Slides';
    } else if (pName.includes('MOCASSIM') || pName.includes('MOCASSIN') || pName.includes('DRIVERS') || pName.includes('LOAFER') || pName.includes('MULE')) {
      normName = 'Mocassins';
    } else if (pName.includes('TAMANCO')) {
      normName = 'Tamancos';
    } else if (pName.includes('SAPATO') || pName.includes('SAPATÊNIS') || pName.includes('SAPATENIS') || pName.includes('SOCIAL') || pName.includes('OXFORD') || pName.includes('DERBY')) {
      normName = 'Sapatos';
    } else if (pName.includes('BOLSA')) {
      normName = 'Bolsas';
    } else if (pName.includes('CARTEIRA') || pName.includes('PORTA CARTAO') || pName.includes('PORTA CARTÃO')) {
      normName = 'Carteiras';
    } else if (pName.includes('CINTO')) {
      normName = 'Cintos';
    } else if (pName.includes('MOCHILA') || pName.includes('ESTOJO') || pName.includes('LANCHEIRA')) {
      normName = 'Mochilas';
    } else if (pName.includes('MALA') || pName.includes('VIAGEM') || pName.includes('FRASQUEIRA') || pName.includes('SACCO')) {
      normName = 'Malas & Viagem';
    } else if (pName.includes('RELÓGIO') || pName.includes('RELOGIO') || pName.includes('SMARTWATCH')) {
      normName = 'Relógios';
    } else if (pName.includes('PERFUME') || pName.includes('COLÔNIA') || pName.includes('COLONIA') || pName.includes('BODY SPLASH') || pName.includes('DESODORANTE') || pName.includes('EAU DE')) {
      normName = 'Perfumes';
    } else if (pName.includes('BLUSA') || pName.includes('CAMISA') || pName.includes('CAMISETA') || pName.includes('VESTIDO') || pName.includes('CALÇA') || pName.includes('JEANS') || pName.includes('SHORT') || pName.includes('BERMUDA') || pName.includes('JAQUETA') || pName.includes('CROPPED') || pName.includes('SAIA')) {
      normName = 'Confecções & Moda';
    } else if (pName.includes('KIT')) {
      normName = 'Kits & Presentes';
    } else if (pName.includes('MEIA')) {
      normName = 'Meias';
    } else if (pName.includes('BONÉ') || pName.includes('BONE') || pName.includes('CHAPÉU') || pName.includes('CHAPEU') || pName.includes('VISEIRA')) {
      normName = 'Bonés & Chapéus';
    } else if (pName.includes('ÓCULOS') || pName.includes('OCULOS')) {
      normName = 'Óculos';
    }
  }

  // Se mesmo após a inferência o resultado for uma classificação genérica de gênero ou código, descarta
  const finalUpper = normName.toUpperCase();
  if (
    !normName ||
    finalUpper === 'FEMININO' ||
    finalUpper === 'MASCULINO' ||
    finalUpper === 'INFANTIL' ||
    finalUpper === 'BEBÊ' ||
    finalUpper === 'BEBE' ||
    finalUpper === 'GERAL' ||
    finalUpper === 'TODAS' ||
    finalUpper === 'TODOS' ||
    finalUpper === 'UNISSEX' ||
    finalUpper.includes('SEM CLASSIFICA') ||
    /^\d+(\.\d+)?$/.test(normName)
  ) {
    return '';
  }

  return normName;
}

/**
 * Normaliza um texto para busca sem acentos e em minúsculas
 */
export function cleanStem(text: string = ''): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Remove terminações comuns de plural em português (ex: "sandalias" -> "sandalia", "relogios" -> "relogio", "chinelos" -> "chinelo", "bolsas" -> "bolsa")
 */
export function toSingularStem(text: string = ''): string {
  const clean = cleanStem(text);
  if (clean.endsWith('oes')) return clean.slice(0, -3) + 'ao';
  if (clean.endsWith('res') || clean.endsWith('zes') || clean.endsWith('nes')) return clean.slice(0, -2);
  if (clean.endsWith('is') && !clean.endsWith('ais') && !clean.endsWith('eis')) return clean.slice(0, -2) + 'l';
  if (clean.endsWith('s') && !clean.endsWith('ss') && clean.length > 3) return clean.slice(0, -1);
  return clean;
}

/**
 * Verifica com precisão se um produto pertence a uma determinada subcategoria.
 * Elimina falsos-positivos de strings vazias e trata plural/singular e acentuação.
 */
export function isSubcategoryMatch(prod: Product | any, targetSub: string): boolean {
  if (!prod || !targetSub) return false;
  const cleanTarget = targetSub.trim();
  if (!cleanTarget || cleanTarget.toUpperCase() === 'TODAS' || cleanTarget.toUpperCase() === 'TODOS') return true;

  const targetUpper = cleanTarget.toUpperCase();
  const targetStem = toSingularStem(cleanTarget);
  const targetSlug = slugifyParam(cleanTarget);

  // 1. Canônica resolvida
  const resolved = resolveProductSubcategoryName(prod);
  if (resolved) {
    const resolvedUpper = resolved.toUpperCase();
    const resolvedStem = toSingularStem(resolved);
    const resolvedSlug = slugifyParam(resolved);

    if (resolvedUpper === targetUpper) return true;
    if (resolvedStem === targetStem) return true;
    if (resolvedSlug === targetSlug) return true;
    if (matchSubcategorySlug(resolved, cleanTarget)) return true;
    if (targetStem.length >= 3 && (resolvedStem.includes(targetStem) || targetStem.includes(resolvedStem))) return true;
  }

  // 2. Subgrupo bruto do ERP (se não for genérico de gênero)
  const rawSub = String(prod.nome_subgrupo || prod.subcategory || '').trim();
  if (rawSub && !['FEMININO', 'MASCULINO', 'INFANTIL', 'BEBÊ', 'BEBE', 'GERAL', 'TODAS', 'TODOS'].includes(rawSub.toUpperCase())) {
    const rawStem = toSingularStem(rawSub);
    if (rawStem === targetStem || (targetStem.length >= 3 && rawStem.includes(targetStem))) {
      return true;
    }
  }

  // 3. Nome do produto (para palavras-chave significativas ex: 'bolsa', 'sandalia', 'tenis', 'mochila', 'mala', 'carteira', 'relogio')
  if (targetStem.length >= 3) {
    const pNameStem = cleanStem(prod.name || prod.descricao || '');
    const words = pNameStem.split(/[^a-z0-9]+/);
    if (words.some(w => toSingularStem(w) === targetStem || (targetStem.length >= 4 && w.startsWith(targetStem)))) {
      return true;
    }
  }

  return false;
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

    // 5. Blindagem: Produtos sem classificação não entram na navegação da loja
    const catInfo = extractClassificacaoCategoria(prod);
    if (catInfo.category === 'Sem Classificação Definida' || !catInfo.isDefined) return;

    // 6. Nome de subcategoria
    const normName = resolveProductSubcategoryName(prod);
    if (!normName || normName.toUpperCase().includes('SEM CLASSIFICA')) return;

    const key = normName.toUpperCase();
    if (key === 'FEMININO' || key === 'MASCULINO' || key === 'INFANTIL' || key === 'GERAL' || key.includes('SEM CLASSIFICA')) return;

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
