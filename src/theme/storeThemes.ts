import { StoreThemeId } from '../types';

export interface StoreThemeTokens {
  id: StoreThemeId;
  name: string;
  isDefault: boolean;
  isOutubroRosa: boolean;
  isBlackFriday: boolean;
  badgeLabel: string;

  // Hero Banner
  hero: {
    containerBorder: string;
    containerBg: string;
    containerGradient: string;
    curveStops: [string, string, string];
    curveNeonStroke: string;
    titleAccent: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    ctaGradient: string;
    ctaText: string;
    ctaHover: string;
    ctaShadow: string;
    trustIconColor: string;
    trustTextColor: string;
    indicatorActive: string;
  };

  // Saldão Banner
  saldao: {
    cardBorder: string;
    cardBg: string;
    cardShadow: string;
    cardGradient: string;
    discountText: string;
    subtitleText: string;
    tagIconColor: string;
    podiumTopStops: [string, string, string];
    podiumBodyStops: [string, string];
    podiumRingStroke: string;
    themeBagStops: [string, string, string];
    themeBagHandle: string;
    themeBagStroke: string;
    btnText: string;
    btnHoverText: string;
    btnArrowColor: string;
    trustIconColor: string;
    trustSubtitleColor: string;
  };

  // Cards de Produto & Vitrine
  cards: {
    borderDark: string;
    borderLight: string;
    borderHoverDark: string;
    borderHoverLight: string;
    shadowHoverDark: string;
    shadowHoverLight: string;
    photoBgDark: string;
    photoBgLight: string;
    titleHoverDark: string;
    titleHoverLight: string;
    priceColorDark: string;
    priceColorLight: string;
    buyButtonGradient: string;
    buyButtonText: string;
    buyButtonShadow: string;
    buyButtonHover: string;
    sizePillActive: string;
    sizePillHover: string;
    sizePillBorder: string;
    sizePillText: string;
    mobileSizeBadge: string;
    cornerBadgeSaldao: string;
    cornerBadgePromo: string;
    cornerBadgeDiscount: string;
    cornerBadgeNew: string;
    cornerBadgeLabel: (isSaldao: boolean, discountPercent: number, promoLabel?: string) => string;
  };

  // Bento Grid de Destaques
  bento: {
    cardGradient: string;
    cardBorder: string;
    badgeDot: string;
    badgeText: string;
    buttonGradient: string;
    buttonText: string;
    ambientGlow: string;
  };

  // Barra de Benefícios & Confiança
  benefits: {
    iconBoxLight: string;
    iconBoxDark: string;
    iconBoxHoverLight: string;
    iconBoxHoverDark: string;
    titleHoverLight: string;
    titleHoverDark: string;
  };

  // Mega Menu de Subcategorias
  megaMenu: {
    heroGradient: string;
    neonStroke: string;
    podiumFill: string;
    textAccent: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    buttonText: string;
    buttonBg: string;
  };

  // Navegação, Abas e Listagem
  navigation: {
    sectionDivider: string;
    seeAllTextLight: string;
    seeAllTextDark: string;
    seeAllHover: string;
    activeCategoryPill: string;
    activeCategoryPillText: string;
    spinner: string;
  };

  // Detalhes do Produto
  productDetail: {
    categoryBadge: string;
    sellerAccent: string;
    priceColorLight: string;
    priceColorDark: string;
    ringSelected: string;
    addToCartGradient: string;
    addToCartText: string;
    buyNowBg: string;
    buyNowText: string;
    saldaoBannerGradient: string;
    saldaoBannerIcon: string;
    confidenceIcon: string;
    shippingTabActive: string;
  };

  // Calculadora de Frete
  shipping: {
    truckIcon: string;
    inputFocusRing: string;
    buttonGradient: string;
    buttonText: string;
    selectedOptionRing: string;
  };
}

export const STORE_THEMES: Record<StoreThemeId, StoreThemeTokens> = {
  // 1. TEMA PADRÃO (AZUL EVIDÊNCIA)
  default: {
    id: 'default',
    name: 'Tema Padrão (Azul Evidência)',
    isDefault: true,
    isOutubroRosa: false,
    isBlackFriday: false,
    badgeLabel: 'NOVO',

    hero: {
      containerBorder: 'border-blue-900/20',
      containerBg: 'bg-[#001736]',
      containerGradient: 'linear-gradient(135deg, #001229 0%, #001838 50%, #002554 100%)',
      curveStops: ['#001838', '#00244F', '#00132B'],
      curveNeonStroke: '#0071E3',
      titleAccent: 'text-[#0084FF]',
      badgeBg: 'bg-[#002554]/90',
      badgeText: 'text-[#00D0FF]',
      badgeBorder: 'border-[#0071E3]/40',
      ctaGradient: 'bg-gradient-to-r from-[#006EDB] to-[#00509E]',
      ctaText: 'text-white',
      ctaHover: 'hover:from-[#005AB5] hover:to-[#003B73]',
      ctaShadow: 'shadow-blue-600/30 hover:shadow-blue-600/50',
      trustIconColor: 'text-[#0084FF]',
      trustTextColor: 'text-[#DDF1FF]/95',
      indicatorActive: 'w-8 bg-[#0084FF] shadow-sm shadow-blue-500/50',
    },

    saldao: {
      cardBorder: 'border-blue-600/30',
      cardBg: 'bg-[#021B4D]',
      cardShadow: 'shadow-2xl shadow-blue-950/60',
      cardGradient: 'linear-gradient(108deg, #011438 0%, #032158 35%, #052b6e 62%, #021a47 100%)',
      discountText: 'text-[#FF7A00]',
      subtitleText: 'text-sky-100/90',
      tagIconColor: 'text-[#38BDF8]',
      podiumTopStops: ['#143C8A', '#0B255E', '#051740'],
      podiumBodyStops: ['#0B2660', '#03102C'],
      podiumRingStroke: '#2962FF',
      themeBagStops: ['#124099', '#092766', '#051945'],
      themeBagHandle: '#448AFF',
      themeBagStroke: '#2979FF',
      btnText: 'text-[#002B70]',
      btnHoverText: 'hover:text-[#001E54]',
      btnArrowColor: 'text-[#002B70]',
      trustIconColor: 'text-[#38BDF8]',
      trustSubtitleColor: 'text-sky-200/70',
    },

    cards: {
      borderDark: 'border-white/10',
      borderLight: 'border-blue-900/10',
      borderHoverDark: 'hover:border-blue-400/50',
      borderHoverLight: 'hover:border-[#006EDB]/70',
      shadowHoverDark: 'hover:shadow-2xl hover:shadow-blue-950/80',
      shadowHoverLight: 'hover:shadow-2xl hover:shadow-blue-900/15',
      photoBgDark: 'bg-gradient-to-b from-[#162238] to-[#101828]',
      photoBgLight: 'bg-gradient-to-b from-[#F2F8FF] via-[#EBF4FC] to-[#E3EFFB]',
      titleHoverDark: 'group-hover:text-blue-400',
      titleHoverLight: 'group-hover:text-[#006EDB]',
      priceColorDark: 'text-blue-400',
      priceColorLight: 'text-[#003B73]',
      buyButtonGradient: 'bg-gradient-to-r from-[#006EDB] to-[#00509E]',
      buyButtonText: 'text-white',
      buyButtonShadow: 'shadow-blue-600/20 hover:shadow-blue-600/30',
      buyButtonHover: 'hover:from-[#005AB5] hover:to-[#003B73]',
      sizePillActive: 'bg-[#006EDB] text-white border-[#006EDB]',
      sizePillHover: 'hover:bg-[#006EDB] hover:text-white hover:border-[#006EDB]',
      sizePillBorder: 'border-blue-200/60 dark:border-slate-700',
      sizePillText: 'text-[#003B73] dark:text-blue-200',
      mobileSizeBadge: 'bg-blue-50 dark:bg-blue-950/60 text-[#006EDB] dark:text-blue-300 border-blue-200/50 dark:border-blue-800/40',
      cornerBadgeSaldao: 'bg-gradient-to-r from-[#FF4500] via-[#FF6000] to-[#FFA000] text-white shadow-orange-600/30',
      cornerBadgePromo: 'text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 shadow-amber-500/30',
      cornerBadgeDiscount: 'bg-[#e30000] text-white',
      cornerBadgeNew: 'bg-[#006EDB] text-white',
      cornerBadgeLabel: (isSaldao, discountPercent, promoLabel) => {
        if (isSaldao) return `SALDÃO -${discountPercent}%`;
        if (promoLabel) return promoLabel;
        if (discountPercent > 0) return `-${discountPercent}% OFF`;
        return 'Novo';
      },
    },

    bento: {
      cardGradient: 'linear-gradient(135deg, #011438 0%, #032158 50%, #00132B 100%)',
      cardBorder: 'border-blue-500/20',
      badgeDot: 'bg-[#0084FF]',
      badgeText: 'text-[#00D0FF]',
      buttonGradient: 'bg-gradient-to-r from-[#006EDB] to-[#00509E]',
      buttonText: 'text-white',
      ambientGlow: 'bg-blue-500/10',
    },

    benefits: {
      iconBoxLight: 'bg-[#EAF5FF] text-[#006EDB] border-blue-100',
      iconBoxDark: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
      iconBoxHoverLight: 'group-hover:bg-[#006EDB] group-hover:text-white',
      iconBoxHoverDark: 'group-hover:bg-[#006EDB] group-hover:text-white',
      titleHoverLight: 'group-hover:text-[#003B73]',
      titleHoverDark: 'group-hover:text-blue-300',
    },

    megaMenu: {
      heroGradient: 'linear-gradient(135deg, #002554 0%, #003B73 50%, #0052A3 100%)',
      neonStroke: '#00D0FF',
      podiumFill: '#001838',
      textAccent: 'text-[#00D0FF]',
      badgeBg: 'bg-blue-500/20',
      badgeText: 'text-sky-300',
      badgeBorder: 'border-blue-400/30',
      buttonText: 'text-[#002554]',
      buttonBg: 'bg-white hover:bg-sky-50',
    },

    navigation: {
      sectionDivider: 'border-blue-900/10 dark:border-white/10',
      seeAllTextLight: 'text-[#006EDB]',
      seeAllTextDark: 'dark:text-amber-300',
      seeAllHover: 'hover:text-[#00509E] dark:hover:text-white',
      activeCategoryPill: 'bg-gradient-to-r from-[#006EDB] to-[#00509E]',
      activeCategoryPillText: 'text-white',
      spinner: 'text-[#006EDB]',
    },

    productDetail: {
      categoryBadge: 'bg-blue-50 dark:bg-blue-950/60 text-[#006EDB] dark:text-blue-300 border-blue-200/50 dark:border-blue-800/40',
      sellerAccent: 'text-[#006EDB]',
      priceColorLight: 'text-[#003B73]',
      priceColorDark: 'text-blue-400',
      ringSelected: 'ring-[#006EDB] border-[#006EDB]',
      addToCartGradient: 'bg-gradient-to-r from-[#006EDB] to-[#00509E]',
      addToCartText: 'text-white',
      buyNowBg: 'bg-[#003B73] hover:bg-[#002952]',
      buyNowText: 'text-white',
      saldaoBannerGradient: 'linear-gradient(108deg, #011438 0%, #032158 50%, #052b6e 100%)',
      saldaoBannerIcon: 'text-[#38BDF8]',
      confidenceIcon: 'text-[#006EDB]',
      shippingTabActive: 'border-[#006EDB] text-[#006EDB]',
    },

    shipping: {
      truckIcon: 'text-[#006EDB]',
      inputFocusRing: 'focus:border-[#006EDB] focus:ring-[#006EDB]/20',
      buttonGradient: 'bg-gradient-to-r from-[#006EDB] to-[#00509E]',
      buttonText: 'text-white',
      selectedOptionRing: 'border-[#006EDB] bg-blue-50/50 dark:bg-blue-950/30',
    },
  },

  // 2. TEMA OUTUBRO ROSA
  'outubro-rosa': {
    id: 'outubro-rosa',
    name: 'Outubro Rosa',
    isDefault: false,
    isOutubroRosa: true,
    isBlackFriday: false,
    badgeLabel: 'OUTUBRO ROSA',

    hero: {
      containerBorder: 'border-pink-500/30',
      containerBg: 'bg-[#540832]',
      containerGradient: 'linear-gradient(135deg, #540832 0%, #4A062B 50%, #780B44 100%)',
      curveStops: ['#4A062B', '#780B44', '#3B0422'],
      curveNeonStroke: '#F472B6',
      titleAccent: 'text-[#F472B6]',
      badgeBg: 'bg-[#780B44]/90',
      badgeText: 'text-[#FBCFE8]',
      badgeBorder: 'border-[#F472B6]/40',
      ctaGradient: 'bg-gradient-to-r from-[#DB2777] via-[#EC4899] to-[#F472B6]',
      ctaText: 'text-white',
      ctaHover: 'hover:from-[#BE185D] hover:to-[#DB2777]',
      ctaShadow: 'shadow-pink-600/30 hover:shadow-pink-600/50',
      trustIconColor: 'text-[#F472B6]',
      trustTextColor: 'text-[#FFE4F0]/95',
      indicatorActive: 'w-8 bg-[#F472B6] shadow-sm shadow-pink-400/60',
    },

    saldao: {
      cardBorder: 'border-pink-400/40',
      cardBg: 'bg-[#540832]',
      cardShadow: 'shadow-2xl shadow-pink-950/40',
      cardGradient: 'linear-gradient(108deg, #5B0836 0%, #7D0D47 35%, #9D174D 62%, #680A3A 100%)',
      discountText: 'text-[#F472B6]',
      subtitleText: 'text-pink-100/90',
      tagIconColor: 'text-[#F472B6]',
      podiumTopStops: ['#9D174D', '#700B40', '#4A062B'],
      podiumBodyStops: ['#700B40', '#3B0422'],
      podiumRingStroke: '#EC4899',
      themeBagStops: ['#EC4899', '#BE185D', '#831843'],
      themeBagHandle: '#F472B6',
      themeBagStroke: '#EC4899',
      btnText: 'text-[#9D174D]',
      btnHoverText: 'hover:text-[#831843]',
      btnArrowColor: 'text-[#9D174D]',
      trustIconColor: 'text-[#F472B6]',
      trustSubtitleColor: 'text-pink-200/70',
    },

    cards: {
      borderDark: 'border-pink-500/15',
      borderLight: 'border-pink-900/10',
      borderHoverDark: 'hover:border-[#EC4899]/60',
      borderHoverLight: 'hover:border-[#EC4899]/70',
      shadowHoverDark: 'hover:shadow-2xl hover:shadow-pink-950/80',
      shadowHoverLight: 'hover:shadow-2xl hover:shadow-pink-900/15',
      photoBgDark: 'bg-gradient-to-b from-[#420626] to-[#101828]',
      photoBgLight: 'bg-gradient-to-b from-[#FFF5F8] via-[#FDF2F6] to-[#FAEDF3]',
      titleHoverDark: 'group-hover:text-pink-400',
      titleHoverLight: 'group-hover:text-[#EC4899]',
      priceColorDark: 'text-pink-400',
      priceColorLight: 'text-[#BE185D]',
      buyButtonGradient: 'bg-gradient-to-r from-[#DB2777] via-[#EC4899] to-[#F472B6]',
      buyButtonText: 'text-white',
      buyButtonShadow: 'shadow-pink-500/25 hover:shadow-pink-500/35',
      buyButtonHover: 'hover:from-[#BE185D] hover:to-[#DB2777]',
      sizePillActive: 'bg-[#EC4899] text-white border-[#EC4899]',
      sizePillHover: 'hover:bg-[#EC4899] hover:text-white hover:border-[#EC4899]',
      sizePillBorder: 'border-pink-200/70 dark:border-pink-800/60',
      sizePillText: 'text-[#9D174D] dark:text-pink-200',
      mobileSizeBadge: 'bg-pink-50 dark:bg-pink-950/60 text-[#BE185D] dark:text-pink-300 border-pink-200/60 dark:border-pink-800/40',
      cornerBadgeSaldao: 'bg-gradient-to-r from-[#EC4899] via-[#F472B6] to-[#DB2777] text-white shadow-pink-500/30',
      cornerBadgePromo: 'text-white bg-gradient-to-r from-[#EC4899] to-[#F472B6] shadow-pink-500/30',
      cornerBadgeDiscount: 'bg-[#EC4899] text-white',
      cornerBadgeNew: 'bg-[#EC4899] text-white',
      cornerBadgeLabel: (isSaldao, discountPercent, promoLabel) => {
        if (isSaldao) return `SALDÃO -${discountPercent}%`;
        if (promoLabel) return promoLabel;
        if (discountPercent > 0) return `-${discountPercent}% OFF`;
        return 'Novo';
      },
    },

    bento: {
      cardGradient: 'linear-gradient(135deg, #540832 0%, #750C44 50%, #400627 100%)',
      cardBorder: 'border-pink-500/30',
      badgeDot: 'bg-[#EC4899]',
      badgeText: 'text-[#FBCFE8]',
      buttonGradient: 'bg-gradient-to-r from-[#DB2777] via-[#EC4899] to-[#F472B6]',
      buttonText: 'text-white',
      ambientGlow: 'bg-pink-500/10',
    },

    benefits: {
      iconBoxLight: 'bg-[#FFF0F5] text-[#EC4899] border-pink-200/70',
      iconBoxDark: 'bg-pink-500/15 text-pink-300 border-pink-500/25',
      iconBoxHoverLight: 'group-hover:bg-[#EC4899] group-hover:text-white group-hover:border-[#EC4899]',
      iconBoxHoverDark: 'group-hover:bg-[#EC4899] group-hover:text-white group-hover:border-[#EC4899]',
      titleHoverLight: 'group-hover:text-[#BE185D]',
      titleHoverDark: 'group-hover:text-pink-300',
    },

    megaMenu: {
      heroGradient: 'linear-gradient(135deg, #5B0836 0%, #831843 50%, #9D174D 100%)',
      neonStroke: '#F472B6',
      podiumFill: '#50082E',
      textAccent: 'text-[#F472B6]',
      badgeBg: 'bg-pink-500/20',
      badgeText: 'text-pink-200',
      badgeBorder: 'border-pink-400/30',
      buttonText: 'text-[#9D174D]',
      buttonBg: 'bg-white hover:bg-pink-50',
    },

    navigation: {
      sectionDivider: 'border-pink-900/15 dark:border-pink-500/20',
      seeAllTextLight: 'text-[#BE185D]',
      seeAllTextDark: 'dark:text-pink-300',
      seeAllHover: 'hover:text-[#9D174D] dark:hover:text-white',
      activeCategoryPill: 'bg-gradient-to-r from-[#EC4899] to-[#F472B6]',
      activeCategoryPillText: 'text-white',
      spinner: 'text-[#EC4899]',
    },

    productDetail: {
      categoryBadge: 'bg-pink-50 dark:bg-pink-950/60 text-[#BE185D] dark:text-pink-300 border-pink-200/60 dark:border-pink-800/40',
      sellerAccent: 'text-[#EC4899]',
      priceColorLight: 'text-[#BE185D]',
      priceColorDark: 'text-pink-300',
      ringSelected: 'ring-[#EC4899] border-[#EC4899]',
      addToCartGradient: 'bg-gradient-to-r from-[#DB2777] via-[#EC4899] to-[#F472B6]',
      addToCartText: 'text-white',
      buyNowBg: 'bg-[#831843] hover:bg-[#700B40]',
      buyNowText: 'text-white',
      saldaoBannerGradient: 'linear-gradient(108deg, #5B0836 0%, #831843 50%, #9D174D 100%)',
      saldaoBannerIcon: 'text-[#F472B6]',
      confidenceIcon: 'text-[#EC4899]',
      shippingTabActive: 'border-[#EC4899] text-[#EC4899]',
    },

    shipping: {
      truckIcon: 'text-[#EC4899]',
      inputFocusRing: 'focus:border-[#EC4899] focus:ring-[#EC4899]/20',
      buttonGradient: 'bg-gradient-to-r from-[#DB2777] via-[#EC4899] to-[#F472B6]',
      buttonText: 'text-white',
      selectedOptionRing: 'border-[#EC4899] bg-pink-50/50 dark:bg-pink-950/30',
    },
  },

  // 3. TEMA BLACK FRIDAY (PRETO OBSIDIANA, DOURADO ÂMBAR & VERMELHO URGÊNCIA)
  'black-friday': {
    id: 'black-friday',
    name: 'Black Friday',
    isDefault: false,
    isOutubroRosa: false,
    isBlackFriday: true,
    badgeLabel: 'BLACK FRIDAY',

    hero: {
      containerBorder: 'border-amber-500/30',
      containerBg: 'bg-[#080808]',
      containerGradient: 'linear-gradient(135deg, #050505 0%, #121212 50%, #1A1408 100%)',
      curveStops: ['#141414', '#1F1708', '#0A0A0A'],
      curveNeonStroke: '#F59E0B',
      titleAccent: 'text-[#F59E0B]',
      badgeBg: 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500',
      badgeText: 'text-black',
      badgeBorder: 'border-amber-400/50',
      ctaGradient: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500',
      ctaText: 'text-black font-black',
      ctaHover: 'hover:from-amber-400 hover:to-yellow-300',
      ctaShadow: 'shadow-amber-500/30 hover:shadow-amber-500/50',
      trustIconColor: 'text-[#F59E0B]',
      trustTextColor: 'text-[#FFFBEB]/95',
      indicatorActive: 'w-8 bg-[#F59E0B] shadow-sm shadow-amber-400/60',
    },

    saldao: {
      cardBorder: 'border-amber-500/40',
      cardBg: 'bg-[#0A0A0A]',
      cardShadow: 'shadow-2xl shadow-black/80',
      cardGradient: 'linear-gradient(108deg, #050505 0%, #141414 35%, #241604 62%, #0D0D0D 100%)',
      discountText: 'text-[#F59E0B]',
      subtitleText: 'text-amber-100/90',
      tagIconColor: 'text-[#F59E0B]',
      podiumTopStops: ['#262626', '#171717', '#0A0A0A'],
      podiumBodyStops: ['#171717', '#050505'],
      podiumRingStroke: '#F59E0B',
      themeBagStops: ['#1C1917', '#292524', '#0C0A09'],
      themeBagHandle: '#F59E0B',
      themeBagStroke: '#D97706',
      btnText: 'text-black',
      btnHoverText: 'hover:text-black',
      btnArrowColor: 'text-black',
      trustIconColor: 'text-[#F59E0B]',
      trustSubtitleColor: 'text-amber-200/70',
    },

    cards: {
      borderDark: 'border-amber-500/20',
      borderLight: 'border-neutral-800/40',
      borderHoverDark: 'hover:border-[#F59E0B]/70',
      borderHoverLight: 'hover:border-[#F59E0B]/80',
      shadowHoverDark: 'hover:shadow-2xl hover:shadow-amber-950/60',
      shadowHoverLight: 'hover:shadow-2xl hover:shadow-black/25',
      photoBgDark: 'bg-gradient-to-b from-[#171717] to-[#0A0A0A]',
      photoBgLight: 'bg-gradient-to-b from-[#FAFAF9] via-[#F5F5F4] to-[#E7E5E4]',
      titleHoverDark: 'group-hover:text-amber-400',
      titleHoverLight: 'group-hover:text-[#D97706]',
      priceColorDark: 'text-amber-400',
      priceColorLight: 'text-[#DC2626]',
      buyButtonGradient: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500',
      buyButtonText: 'text-black font-black',
      buyButtonShadow: 'shadow-amber-500/25 hover:shadow-amber-500/40',
      buyButtonHover: 'hover:from-amber-400 hover:to-yellow-300',
      sizePillActive: 'bg-[#F59E0B] text-black border-[#F59E0B] font-black',
      sizePillHover: 'hover:bg-[#F59E0B] hover:text-black hover:border-[#F59E0B]',
      sizePillBorder: 'border-amber-300/40 dark:border-neutral-700',
      sizePillText: 'text-neutral-900 dark:text-amber-200',
      mobileSizeBadge: 'bg-neutral-900 text-amber-300 border-amber-500/30',
      cornerBadgeSaldao: 'bg-gradient-to-r from-[#DC2626] via-[#EA580C] to-[#F59E0B] text-white shadow-red-950/40',
      cornerBadgePromo: 'bg-black text-amber-300 border border-amber-400/40 shadow-md shadow-black/50',
      cornerBadgeDiscount: 'bg-black text-amber-400 border border-amber-500/40 shadow-xs font-black',
      cornerBadgeNew: 'bg-black text-amber-300 border border-amber-400/30 font-black',
      cornerBadgeLabel: (isSaldao, discountPercent, promoLabel) => {
        if (isSaldao) return `BLACK SALDÃO -${discountPercent}%`;
        if (promoLabel) return `BLACK ${promoLabel}`;
        if (discountPercent > 0) return `BLACK -${discountPercent}%`;
        return 'BLACK FRIDAY';
      },
    },

    bento: {
      cardGradient: 'linear-gradient(135deg, #121212 0%, #1F1708 50%, #0A0A0A 100%)',
      cardBorder: 'border-amber-500/30',
      badgeDot: 'bg-[#F59E0B]',
      badgeText: 'text-amber-300',
      buttonGradient: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500',
      buttonText: 'text-black font-black',
      ambientGlow: 'bg-amber-500/10',
    },

    benefits: {
      iconBoxLight: 'bg-amber-50 text-amber-700 border-amber-200/80',
      iconBoxDark: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      iconBoxHoverLight: 'group-hover:bg-[#F59E0B] group-hover:text-black group-hover:border-[#F59E0B]',
      iconBoxHoverDark: 'group-hover:bg-[#F59E0B] group-hover:text-black group-hover:border-[#F59E0B]',
      titleHoverLight: 'group-hover:text-amber-700',
      titleHoverDark: 'group-hover:text-amber-300',
    },

    megaMenu: {
      heroGradient: 'linear-gradient(135deg, #0A0A0A 0%, #1A1305 50%, #291C08 100%)',
      neonStroke: '#F59E0B',
      podiumFill: '#141414',
      textAccent: 'text-[#F59E0B]',
      badgeBg: 'bg-amber-500/20',
      badgeText: 'text-amber-300',
      badgeBorder: 'border-amber-400/30',
      buttonText: 'text-black font-black',
      buttonBg: 'bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300',
    },

    navigation: {
      sectionDivider: 'border-amber-500/20 dark:border-amber-500/25',
      seeAllTextLight: 'text-[#B45309]',
      seeAllTextDark: 'dark:text-amber-400',
      seeAllHover: 'hover:text-[#92400E] dark:hover:text-white',
      activeCategoryPill: 'bg-gradient-to-r from-amber-500 to-yellow-400',
      activeCategoryPillText: 'text-black font-black',
      spinner: 'text-[#F59E0B]',
    },

    productDetail: {
      categoryBadge: 'bg-neutral-900 text-amber-300 border border-amber-500/30',
      sellerAccent: 'text-[#F59E0B]',
      priceColorLight: 'text-[#DC2626]',
      priceColorDark: 'text-amber-400',
      ringSelected: 'ring-[#F59E0B] border-[#F59E0B]',
      addToCartGradient: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500',
      addToCartText: 'text-black font-black',
      buyNowBg: 'bg-[#DC2626] hover:bg-[#B91C1C]',
      buyNowText: 'text-white font-black',
      saldaoBannerGradient: 'linear-gradient(108deg, #0A0A0A 0%, #171105 50%, #241604 100%)',
      saldaoBannerIcon: 'text-[#F59E0B]',
      confidenceIcon: 'text-[#F59E0B]',
      shippingTabActive: 'border-[#F59E0B] text-[#F59E0B]',
    },

    shipping: {
      truckIcon: 'text-[#F59E0B]',
      inputFocusRing: 'focus:border-[#F59E0B] focus:ring-[#F59E0B]/20',
      buttonGradient: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500',
      buttonText: 'text-black font-black',
      selectedOptionRing: 'border-[#F59E0B] bg-amber-50/50 dark:bg-amber-950/20',
    },
  },
};

/**
 * Retorna os tokens correspondentes ao StoreThemeId atual com fallback seguro
 */
export function getStoreThemeTokens(themeId: StoreThemeId = 'default'): StoreThemeTokens {
  return STORE_THEMES[themeId] || STORE_THEMES.default;
}

