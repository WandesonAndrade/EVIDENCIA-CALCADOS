import { sanitizeUrl } from '../../../lib/securityUtils';

export interface HeroSlideCTA {
  text: string;
  action: 'offers' | 'category' | 'catalog';
  targetParam?: string;
  variant?: 'primary' | 'outline';
}

export interface HeroSlide {
  id: string | number;
  collectionTag: string;
  title: string;
  description: string;
  image: string;
  ctas: HeroSlideCTA[];
  badgeVariant?: 'amber' | 'blue' | 'default';
}

export const DEFAULT_SLIDES: HeroSlide[] = [
  {
    id: 'banner-masculino',
    collectionTag: 'COLEÇÃO MASCULINA',
    title: 'Estilo moderno e robustez incomparável.',
    description: 'Sapatos sociais premium, botas confortáveis e tênis de alta performance para o homem contemporâneo que valoriza design e atitude.',
    image: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?q=80&w=1600&auto=format&fit=crop',
    badgeVariant: 'blue',
    ctas: [
      {
        text: 'Explorar Linha Masculina',
        action: 'category',
        targetParam: 'MASCULINO',
        variant: 'primary',
      },
      {
        text: 'Ver Catálogo Completo',
        action: 'catalog',
        variant: 'outline',
      }
    ]
  },
  {
    id: 'banner-feminino',
    collectionTag: 'COLEÇÃO FEMININA',
    title: 'Charme, sofisticação e conforto extremo.',
    description: 'Encontre sandálias, sapatilhas, saltos e acessórios refinados criados especialmente para destacar a sua personalidade única.',
    image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=1600&auto=format&fit=crop',
    badgeVariant: 'blue',
    ctas: [
      {
        text: 'Ver Moda Feminina',
        action: 'category',
        targetParam: 'FEMININO',
        variant: 'primary',
      },
      {
        text: 'Ver Catálogo Completo',
        action: 'catalog',
        variant: 'outline',
      }
    ]
  },
  {
    id: 'banner-ofertas',
    collectionTag: 'CAMPANHA DE OFERTAS',
    title: 'Super Descontos de até 50% OFF',
    description: 'Chegou o momento de adquirir aquele calçado desejado com preços incríveis e condições especiais. Aproveite as melhores promoções da loja!',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=1600&auto=format&fit=crop',
    badgeVariant: 'amber',
    ctas: [
      {
        text: 'Aproveitar Ofertas',
        action: 'offers',
        variant: 'primary',
      },
      {
        text: 'Ver Catálogo Completo',
        action: 'catalog',
        variant: 'outline',
      }
    ]
  }
];

export interface RawBannerInput {
  id: string | number;
  active?: boolean;
  tabKey?: string;
  badge?: string;
  title: string;
  description?: string;
  image?: string;
  buttonText?: string;
}

/**
 * Converte a lista bruta de banners do Firestore/CMS em slides prontos para a vitrine Hero.
 * Aplica filtro estrito de vitrine limpa (sem crediário).
 */
export function buildSlidesFromBanners(rawBanners?: RawBannerInput[] | null): HeroSlide[] {
  if (!rawBanners || rawBanners.length === 0) {
    return DEFAULT_SLIDES;
  }

  const activeBanners = rawBanners.filter((b) => {
    if (!b || b.active === false) return false;
    const tab = (b.tabKey || '').toLowerCase();
    const badge = (b.badge || '').toLowerCase();
    const title = (b.title || '').toLowerCase();
    // Vitrine limpa: banners com menção a crediário são tratados em seu módulo próprio
    return tab !== 'meu-crediario' && !title.includes('crediário') && !title.includes('crediario') && !badge.includes('crediário');
  });

  if (activeBanners.length === 0) {
    return DEFAULT_SLIDES;
  }

  return activeBanners.map((b) => {
    const tab = (b.tabKey || '').toLowerCase();
    const badgeText = b.badge?.trim() || 'Coleção Evidência';
    const isOffers = tab === 'ofertas' || tab.startsWith('promo:') || badgeText.toUpperCase().includes('OFERTA') || b.title.includes('50% OFF');

    const ctas: HeroSlideCTA[] = [];

    if (isOffers) {
      ctas.push({
        text: b.buttonText || 'Aproveitar Ofertas',
        action: 'offers',
        targetParam: b.tabKey,
        variant: 'primary',
      });
    } else if (tab === 'feminino' || badgeText.toUpperCase().includes('FEMININ')) {
      ctas.push({
        text: b.buttonText || 'Ver Moda Feminina',
        action: 'category',
        targetParam: 'FEMININO',
        variant: 'primary',
      });
    } else if (tab === 'masculino' || badgeText.toUpperCase().includes('MASCULIN')) {
      ctas.push({
        text: b.buttonText || 'Explorar Linha Masculina',
        action: 'category',
        targetParam: 'MASCULINO',
        variant: 'primary',
      });
    } else if (tab === 'infantil' || badgeText.toUpperCase().includes('INFANTIL')) {
      ctas.push({
        text: b.buttonText || 'Conferir Linha Infantil',
        action: 'category',
        targetParam: 'INFANTIL',
        variant: 'primary',
      });
    } else if (tab === 'lançamentos' || tab === 'lancamentos' || tab === 'novidades') {
      ctas.push({
        text: b.buttonText || 'Ver Lançamentos',
        action: 'category',
        targetParam: 'lançamentos',
        variant: 'primary',
      });
    } else if (b.tabKey && tab !== 'todos') {
      ctas.push({
        text: b.buttonText || 'Conferir Coleção',
        action: 'category',
        targetParam: b.tabKey,
        variant: 'primary',
      });
    } else {
      ctas.push({
        text: b.buttonText || 'Conferir Coleção',
        action: 'catalog',
        variant: 'primary',
      });
    }

    // Botão secundário padrão para o catálogo completo
    ctas.push({
      text: 'Ver Catálogo Completo',
      action: 'catalog',
      variant: 'outline',
    });

    return {
      id: b.id,
      collectionTag: badgeText,
      title: b.title,
      description: b.description?.trim() || 'Confira os modelos exclusivos e aproveite as melhores condições da Evidência Calçados.',
      image: sanitizeUrl(b.image) || 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?q=80&w=1600&auto=format&fit=crop',
      badgeVariant: isOffers ? 'amber' : 'blue',
      ctas
    };
  });
}

