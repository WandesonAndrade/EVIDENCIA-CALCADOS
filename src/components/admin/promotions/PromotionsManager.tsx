import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../../context/AppContext';
import { PromoCampaign, Product } from '../../../types';
import {
  getCampaignStatus,
  isCampaignActive,
  getProductTotalStock,
  parseLocalDate,
} from '../../../services/promotionsService';
import {
  isProductInCategory,
  normalizeCategoryName,
} from '../../../services/moblinkCategoriesService';
import {
  isSubcategoryMatch,
  resolveProductSubcategoryName,
} from '../../products/utils/categoryNavigationUtils';
import { NO_PHOTO_SVG } from '../../../utils/placeholder';
import {
  Gift,
  Plus,
  Megaphone,
  CheckCircle2,
  Clock,
  Tag,
  TrendingUp,
  Edit3,
  Trash2,
  Box,
  Calendar,
  ChevronRight,
  Search,
  Filter,
  X,
  Percent,
  ShoppingBag,
  Sparkles,
  Flame,
  Check,
  Package,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';

interface PromotionsManagerProps {
  isDark: boolean;
}

type TabFilter = 'all' | 'active' | 'scheduled' | 'finished';

// Presets de banners estilizados caso a campanha não tenha imagem personalizada
const BANNER_PRESETS = [
  {
    id: 'black-friday-red',
    label: 'Black Friday Vermelho / Fogo',
    gradient: 'from-[#2A0808] via-[#4A0A0A] to-[#120202]',
    accentColor: '#FF3B30',
    tagText: 'BLACK FRIDAY',
    subText: 'OFERTAS IMPERDÍVEIS',
    glowColor: 'rgba(255, 59, 48, 0.4)',
  },
  {
    id: 'black-friday-purple',
    label: 'Black Friday Roxo / Neon',
    gradient: 'from-[#1E0B36] via-[#35105E] to-[#0D0418]',
    accentColor: '#A855F7',
    tagText: 'BLACK FRIDAY',
    subText: 'DESCONTOS EXCLUSIVOS',
    glowColor: 'rgba(168, 85, 247, 0.4)',
  },
  {
    id: 'ofertas-blue',
    label: 'Ofertas Especiais Azul',
    gradient: 'from-[#071E3D] via-[#0F396D] to-[#040E1E]',
    accentColor: '#00D0FF',
    tagText: 'SUPER OFERTAS',
    subText: 'SELEÇÃO ESPECIAL',
    glowColor: 'rgba(0, 208, 255, 0.4)',
  },
  {
    id: 'saldao-orange',
    label: 'Saldão & Queima de Estoque',
    gradient: 'from-[#3A1404] via-[#632207] to-[#1F0801]',
    accentColor: '#FF7A00',
    tagText: 'QUEIMA DE ESTOQUE',
    subText: 'ÚLTIMAS UNIDADES',
    glowColor: 'rgba(255, 122, 0, 0.4)',
  },
];

export const PromotionsManager: React.FC<PromotionsManagerProps> = ({ isDark }) => {
  const {
    promotions = [],
    products = [],
    categories = [],
    savePromotion,
    deletePromotion,
    togglePromotionStatus,
  } = useApp();

  // Filtro de status da lista
  const [activeTabFilter, setActiveTabFilter] = useState<TabFilter>('all');

  // Estados do Modal de Criação / Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCampaign | null>(null);

  // Campos do formulário
  const [promoTitle, setPromoTitle] = useState('');
  const [promoHeaderLabel, setPromoHeaderLabel] = useState('');
  const [promoTagLabel, setPromoTagLabel] = useState('OFERTA');
  const [promoDescription, setPromoDescription] = useState('');
  const [promoBannerUrl, setPromoBannerUrl] = useState('');
  const [promoBannerPreset, setPromoBannerPreset] = useState('black-friday-red');
  const [promoStartDate, setPromoStartDate] = useState('');
  const [promoEndDate, setPromoEndDate] = useState('');
  const [promoDiscountType, setPromoDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [promoDiscountValueVista, setPromoDiscountValueVista] = useState<number>(15);
  const [promoDiscountValuePrazo, setPromoDiscountValuePrazo] = useState<number>(10);
  const [promoMaxStock, setPromoMaxStock] = useState<number | ''>('');
  const [promoOnlySaldoFilter, setPromoOnlySaldoFilter] = useState(false);
  const [promoProductIds, setPromoProductIds] = useState<string[]>([]);
  const [promoActive, setPromoActive] = useState(true);

  // Filtros internos de busca e seleção de produtos no modal
  const [promoProductSearch, setPromoProductSearch] = useState('');
  const [promoCategoryFilter, setPromoCategoryFilter] = useState('TODAS');
  const [promoSubcategoryFilter, setPromoSubcategoryFilter] = useState('TODAS');

  // Produtos visíveis (ativos no catálogo)
  const visibleProducts = useMemo(() => {
    return products.filter((p) => p.visible !== false);
  }, [products]);

  // Contagens para os 4 Cards de Estatísticas no topo
  const totalCampaigns = promotions.length;
  const activeCampaigns = useMemo(
    () => promotions.filter((p) => getCampaignStatus(p) === 'active').length,
    [promotions]
  );
  const scheduledCampaigns = useMemo(
    () => promotions.filter((p) => getCampaignStatus(p) === 'scheduled').length,
    [promotions]
  );
  const finishedCampaigns = useMemo(
    () =>
      promotions.filter(
        (p) => getCampaignStatus(p) === 'expired' || getCampaignStatus(p) === 'disabled'
      ).length,
    [promotions]
  );

  // Total de produtos ofertados nas campanhas ativas
  const totalOfferedProductsCount = useMemo(() => {
    const activePromos = promotions.filter((p) => getCampaignStatus(p) === 'active');
    const ids = new Set<string>();
    activePromos.forEach((promo) => {
      if (promo.productIds && promo.productIds.length > 0) {
        promo.productIds.forEach((id) => ids.add(String(id)));
      } else if (promo.maxStock && Number(promo.maxStock) > 0) {
        products.forEach((p) => {
          const stock = getProductTotalStock(p);
          if (stock > 0 && stock <= Number(promo.maxStock)) {
            ids.add(String(p.id));
          }
        });
      }
    });
    return ids.size;
  }, [promotions, products]);

  // Lista de promoções filtradas pela aba selecionada
  const filteredPromotions = useMemo(() => {
    return promotions.filter((promo) => {
      const status = getCampaignStatus(promo);
      if (activeTabFilter === 'active') return status === 'active';
      if (activeTabFilter === 'scheduled') return status === 'scheduled';
      if (activeTabFilter === 'finished') return status === 'expired' || status === 'disabled';
      return true;
    });
  }, [promotions, activeTabFilter]);

  // Manipulação de Abertura do Modal (Novo)
  const handleOpenNewPromo = () => {
    setEditingPromo(null);
    setPromoTitle('');
    setPromoHeaderLabel('');
    setPromoTagLabel('OFERTA');
    setPromoDescription('');
    setPromoBannerUrl('');
    setPromoBannerPreset('black-friday-red');
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setPromoStartDate(today);
    setPromoEndDate(nextWeek);
    setPromoDiscountType('percentage');
    setPromoDiscountValueVista(15);
    setPromoDiscountValuePrazo(10);
    setPromoMaxStock('');
    setPromoOnlySaldoFilter(false);
    setPromoProductIds([]);
    setPromoActive(true);
    setPromoProductSearch('');
    setPromoCategoryFilter('TODAS');
    setPromoSubcategoryFilter('TODAS');
    setIsModalOpen(true);
  };

  // Manipulação de Abertura do Modal (Edição)
  const handleOpenEditPromo = (campaign: PromoCampaign) => {
    if (!campaign) return;
    try {
      setEditingPromo(campaign);
      setPromoTitle(String(campaign.title || ''));
      setPromoHeaderLabel(String(campaign.headerLabel || campaign.title || ''));
      setPromoTagLabel(String(campaign.tagLabel || 'OFERTA'));
      setPromoDescription(String(campaign.description || ''));
      setPromoBannerUrl(String(campaign.bannerUrl || ''));
      setPromoBannerPreset(String(campaign.tagBgPreset || 'black-friday-red'));
      
      const startStr = campaign.startDate ? String(campaign.startDate).split('T')[0] : '';
      const endStr = campaign.endDate ? String(campaign.endDate).split('T')[0] : '';
      setPromoStartDate(startStr);
      setPromoEndDate(endStr);
      
      setPromoDiscountType(campaign.discountType === 'fixed' ? 'fixed' : 'percentage');
      setPromoDiscountValueVista(
        campaign.discountValueVista !== undefined
          ? Number(campaign.discountValueVista) || 0
          : Number(campaign.discountValue || 15) || 0
      );
      setPromoDiscountValuePrazo(
        campaign.discountValuePrazo !== undefined
          ? Number(campaign.discountValuePrazo) || 0
          : Number(campaign.discountValue || 10) || 0
      );
      setPromoMaxStock(
        campaign.maxStock !== undefined && campaign.maxStock !== null && Number(campaign.maxStock) > 0
          ? Number(campaign.maxStock)
          : ''
      );
      setPromoOnlySaldoFilter(false);
      
      let safeIds: string[] = [];
      if (Array.isArray(campaign.productIds)) {
        safeIds = campaign.productIds.map(String);
      } else if (campaign.productIds && typeof campaign.productIds === 'object') {
        safeIds = Object.values(campaign.productIds).map(String);
      }
      setPromoProductIds(safeIds);
      setPromoActive(campaign.active !== false);
      setPromoProductSearch('');
      setPromoCategoryFilter('TODAS');
      setPromoSubcategoryFilter('TODAS');
      setIsModalOpen(true);
    } catch (err) {
      console.error('Erro ao preparar edição da promoção:', err);
      setIsModalOpen(true);
    }
  };

  // Salvar Promoção
  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoTitle.trim()) {
      alert('Por favor, informe o título da promoção.');
      return;
    }
    if (!promoStartDate || !promoEndDate) {
      alert('Por favor, defina a data inicial e final da promoção.');
      return;
    }

    const campaignId = editingPromo ? editingPromo.id : `promo_${Date.now()}`;
    const newCampaign: PromoCampaign = {
      id: campaignId,
      title: promoTitle.trim(),
      headerLabel: promoHeaderLabel.trim() || promoTitle.trim(),
      tagLabel: promoTagLabel.trim() || 'OFERTA',
      description: promoDescription.trim(),
      bannerUrl: promoBannerUrl.trim(),
      startDate: promoStartDate,
      endDate: promoEndDate,
      discountType: promoDiscountType,
      discountValue: Number(promoDiscountValueVista) || 0,
      discountValueVista: Number(promoDiscountValueVista) || 0,
      discountValuePrazo: Number(promoDiscountValuePrazo) || 0,
      maxStock: promoMaxStock !== '' ? Number(promoMaxStock) : undefined,
      tagColor: '#FF4500',
      tagColorEnd: '#FFA000',
      tagTextColor: '#FFFFFF',
      tagBgPreset: promoBannerPreset,
      productIds: promoProductIds,
      active: promoActive,
      updatedAt: new Date().toISOString(),
    };

    try {
      await savePromotion(newCampaign);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Erro ao salvar promoção:', err);
      alert('Erro ao salvar no Firestore. Verifique sua conexão.');
    }
  };

  // Toggle produto na lista de selecionados do modal
  const handleToggleProductInPromo = (prodId: string) => {
    setPromoProductIds((prev) =>
      prev.includes(prodId) ? prev.filter((id) => id !== prodId) : [...prev, prodId]
    );
  };

  // Auxiliar para calcular dias de vigência ou restantes
  const getDaysCount = (campaign: PromoCampaign) => {
    if (!campaign.endDate) return 10;
    const end = parseLocalDate(campaign.endDate, true);
    const start = campaign.startDate ? parseLocalDate(campaign.startDate, false) : new Date();
    if (!end) return 10;
    const now = new Date();

    // Se estiver em andamento, calcula dias restantes até o fim
    if (now >= (start || now) && now <= end) {
      const diffMs = end.getTime() - now.getTime();
      const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      return diffDays;
    }

    // Se estiver agendada ou com datas definidas, calcula duração total
    if (start) {
      const diffMs = end.getTime() - start.getTime();
      const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      return diffDays;
    }

    return 10;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. TOPO: TÍTULO, SUBTÍTULO E BOTÃO NOVA OFERTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Ícone de Presente em Laranja Vibrante */}
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF7A00] to-[#FFA033] flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20 text-white">
            <Gift className="w-6 h-6 stroke-[2.3]" />
          </div>

          {/* Divisória Vertical */}
          <div className="h-10 w-[1.5px] bg-slate-300 dark:bg-slate-700 hidden sm:block" />

          {/* Textos de Cabeçalho */}
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#0B1528] dark:text-white leading-tight">
              Gerenciamento de Ofertas e Campanhas Promocionais
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 font-medium flex-wrap">
              <span className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-2.5 h-2.5" />
              </span>
              <span>
                Crie e gerencie campanhas de ofertas com período de vigência, porcentagem ou valor de desconto e selecione os produtos participantes.
              </span>
            </p>
          </div>
        </div>

        {/* Botão Nova Oferta Promocional (Pílula Laranja Fiel à Imagem) */}
        <button
          onClick={handleOpenNewPromo}
          type="button"
          className="px-6 py-3 rounded-full bg-gradient-to-r from-[#FF7A00] to-[#FF5500] hover:from-[#FF6A00] hover:to-[#E64A00] text-white font-bold text-xs sm:text-sm tracking-wide transition-all shadow-md shadow-orange-500/25 flex items-center justify-center space-x-2 cursor-pointer shrink-0 active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[2.8]" />
          <span>Nova Oferta Promocional</span>
        </button>
      </div>

      {/* 2. OS 4 CARDS DE MÉTRICAS E ESTATÍSTICAS (FIEL À IMAGEM) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total de Campanhas (Azul Pastel) */}
        <div className="p-5 rounded-[28px] border border-blue-100/90 dark:border-blue-900/40 bg-gradient-to-br from-[#EEF5FF] to-[#DCEBFF] dark:from-slate-900/90 dark:to-blue-950/30 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-[#0071E3] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Megaphone className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">
                Total de Campanhas
              </span>
              <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white leading-tight">
                {totalCampaigns}
              </div>
            </div>
          </div>
          <div className="mt-3.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#0071E3]" />
            <span>Ofertas cadastradas no sistema</span>
          </div>
        </div>

        {/* Card 2: Em Andamento (Verde / Mint Pastel) */}
        <div className="p-5 rounded-[28px] border border-emerald-100/90 dark:border-emerald-900/40 bg-gradient-to-br from-[#EAF9F1] to-[#D5F5E3] dark:from-slate-900/90 dark:to-emerald-950/30 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-[#00B050] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Check className="w-5 h-5 stroke-[3]" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">
                Em Andamento
              </span>
              <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white leading-tight">
                {activeCampaigns}
              </div>
            </div>
          </div>
          <div className="mt-3.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00B050] inline-block animate-pulse" />
            <span>Vigentes e ativas no site agora</span>
          </div>
        </div>

        {/* Card 3: Agendadas (Âmbar / Pêssego Pastel) */}
        <div className="p-5 rounded-[28px] border border-amber-100/90 dark:border-amber-900/40 bg-gradient-to-br from-[#FFF5EB] to-[#FFE8D1] dark:from-slate-900/90 dark:to-amber-950/30 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-[#E67E22] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Clock className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">
                Agendadas
              </span>
              <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white leading-tight">
                {scheduledCampaigns}
              </div>
            </div>
          </div>
          <div className="mt-3.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#E67E22]" />
            <span>Aguardando início do período</span>
          </div>
        </div>

        {/* Card 4: Produtos Ofertados (Violeta / Lilás Pastel) */}
        <div className="p-5 rounded-[28px] border border-purple-100/90 dark:border-purple-900/40 bg-gradient-to-br from-[#F5EEFB] to-[#E9DBF8] dark:from-slate-900/90 dark:to-purple-950/30 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-[#9333EA] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Tag className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">
                Produtos Ofertados
              </span>
              <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white leading-tight">
                {totalOfferedProductsCount}
              </div>
            </div>
          </div>
          <div className="mt-3.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#9333EA]" />
            <span>Itens em oferta no catálogo</span>
          </div>
        </div>
      </div>

      {/* 3. CARD CONTAINER PRINCIPAL BRANCO ("Campanhas Ativas") */}
      <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 sm:p-8 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-6">
        {/* Cabeçalho do Container + Pílulas de Filtro */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
              <Tag className="w-5 h-5 fill-orange-500 text-orange-500 rotate-90" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Campanhas Ativas
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Acompanhe e gerencie suas campanhas promocionais
              </p>
            </div>
          </div>

          {/* Abas Segmentadas em Pílula (Fiel à Imagem) */}
          <div className="flex items-center gap-1.5 flex-wrap bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-full border border-slate-100 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setActiveTabFilter('all')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeTabFilter === 'all'
                  ? 'bg-[#0B2545] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              Todas ({totalCampaigns})
            </button>

            <button
              type="button"
              onClick={() => setActiveTabFilter('active')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeTabFilter === 'active'
                  ? 'bg-[#0B2545] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              Em Andamento ({activeCampaigns})
            </button>

            <button
              type="button"
              onClick={() => setActiveTabFilter('scheduled')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeTabFilter === 'scheduled'
                  ? 'bg-[#0B2545] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              Agendadas ({scheduledCampaigns})
            </button>

            <button
              type="button"
              onClick={() => setActiveTabFilter('finished')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeTabFilter === 'finished'
                  ? 'bg-[#0B2545] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              Finalizadas ({finishedCampaigns})
            </button>
          </div>
        </div>

        {/* 4. LISTA DE CARDS DE CAMPANHAS (GRID 2 COLUNAS) */}
        {filteredPromotions.length === 0 ? (
          <div className="text-center py-14 space-y-3">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Gift className="w-8 h-8 opacity-60" />
            </div>
            <h4 className="text-base font-bold text-slate-800 dark:text-white">
              Nenhuma campanha encontrada neste filtro
            </h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Crie uma nova campanha promocional como "Black Friday", "Semana do Consumidor" ou "Queima de Estoque" para destacar produtos na vitrine.
            </p>
            <button
              onClick={handleOpenNewPromo}
              type="button"
              className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#FF7A00] to-[#FF5500] text-white font-bold text-xs shadow-md cursor-pointer hover:opacity-90 transition-all inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Primeira Oferta</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredPromotions.map((promo) => {
              const status = getCampaignStatus(promo);
              const days = getDaysCount(promo);

              // Produtos participantes correspondentes
              const matchingProducts = products.filter((p) => {
                const stock = getProductTotalStock(p);
                const stockOk =
                  promo.maxStock && Number(promo.maxStock) > 0
                    ? stock > 0 && stock <= Number(promo.maxStock)
                    : true;
                if (promo.productIds && promo.productIds.length > 0) {
                  const idMatch =
                    promo.productIds.includes(String(p.id)) ||
                    (p.moblinkId && promo.productIds.includes(String(p.moblinkId)));
                  return idMatch && stockOk;
                }
                return p.visible && promo.maxStock && Number(promo.maxStock) > 0 && stockOk;
              });

              // Borda de acento superior conforme o status
              const topAccentBorder =
                status === 'active'
                  ? 'border-t-4 border-t-emerald-500'
                  : status === 'scheduled'
                  ? 'border-t-4 border-t-amber-500'
                  : 'border-t-4 border-t-slate-400';

              // Desconto formatado com blindagem defensiva
              const valVista = Number(promo.discountValueVista ?? promo.discountValue ?? 0) || 0;
              const valPrazo = Number(promo.discountValuePrazo ?? promo.discountValue ?? 0) || 0;
              const discountText =
                promo.discountValueVista !== undefined &&
                promo.discountValuePrazo !== undefined &&
                promo.discountValueVista !== promo.discountValuePrazo
                  ? promo.discountType === 'percentage'
                    ? `-${valVista}% VISTA • -${valPrazo}% PRAZO`
                    : `-R$ ${valVista.toFixed(2).replace('.', ',')} VISTA • -R$ ${valPrazo.toFixed(2).replace('.', ',')} PRAZO`
                  : promo.discountType === 'percentage'
                  ? `-${valVista}% OFF`
                  : `-R$ ${valVista.toFixed(2).replace('.', ',')} OFF`;

              return (
                <div
                  key={promo.id}
                  className={`bg-white dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800 rounded-[26px] p-5 sm:p-6 space-y-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between ${topAccentBorder}`}
                >
                  <div className="space-y-4">
                    {/* Topo do Card: Badges de Status/Desconto + Botões de Ação */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Badge de Status */}
                        {status === 'active' && (
                          <span className="px-3 py-1 rounded-full text-[11px] font-black tracking-wide bg-[#EAF9F1] text-[#00B050] border border-emerald-200 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#00B050] inline-block animate-pulse" />
                            <span>EM ANDAMENTO</span>
                          </span>
                        )}
                        {status === 'scheduled' && (
                          <span className="px-3 py-1 rounded-full text-[11px] font-black tracking-wide bg-[#FFF5EB] text-[#E67E22] border border-amber-200 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#E67E22] inline-block" />
                            <span>AGENDADA</span>
                          </span>
                        )}
                        {status === 'expired' && (
                          <span className="px-3 py-1 rounded-full text-[11px] font-black tracking-wide bg-rose-50 text-rose-600 border border-rose-200 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                            <span>FINALIZADA</span>
                          </span>
                        )}
                        {status === 'disabled' && (
                          <span className="px-3 py-1 rounded-full text-[11px] font-black tracking-wide bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                            <span>PAUSADA</span>
                          </span>
                        )}

                        {/* Badge de Desconto */}
                        <span className="px-3 py-1 rounded-full text-[11px] font-black tracking-wide bg-[#FFF3E6] text-[#B85600] border border-[#FFD8B3] flex items-center gap-1.5">
                          <Tag className="w-3 h-3 fill-[#B85600]/20" />
                          <span>{discountText}</span>
                        </span>
                      </div>

                      {/* Botões de Ação (Editar e Excluir fiéis à imagem) */}
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditPromo(promo);
                          }}
                          className="w-8 h-8 rounded-xl bg-[#0B1528] hover:bg-slate-800 text-white flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                          title="Editar Campanha"
                        >
                          <Edit3 className="w-4 h-4 stroke-[2.2]" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Deseja realmente excluir a campanha "${promo.title}"?`)) {
                              deletePromotion(promo.id);
                            }
                          }}
                          className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center transition-colors cursor-pointer"
                          title="Excluir Campanha"
                        >
                          <Trash2 className="w-4 h-4 stroke-[2.2]" />
                        </button>
                      </div>
                    </div>

                    {/* Linha Central: Banner Visual Gráfico + Título da Campanha e Duração */}
                    <div className="flex items-center gap-4 py-1">
                      {/* Banner Gráfico da Campanha */}
                      <div className="w-44 h-24 rounded-2xl overflow-hidden shrink-0 shadow-sm border border-slate-100 dark:border-slate-800 relative bg-slate-900 flex items-center justify-center">
                        {promo.bannerUrl ? (
                          <img
                            src={promo.bannerUrl}
                            alt={promo.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          /* Renderização estilizada fiel à Black Friday da imagem de referência */
                          <div
                            className={`w-full h-full p-2.5 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br ${
                              promo.tagBgPreset === 'black-friday-purple'
                                ? 'from-[#1E0B36] via-[#35105E] to-[#0D0418]'
                                : promo.tagBgPreset === 'ofertas-blue'
                                ? 'from-[#071E3D] via-[#0F396D] to-[#040E1E]'
                                : promo.tagBgPreset === 'saldao-orange'
                                ? 'from-[#3A1404] via-[#632207] to-[#1F0801]'
                                : 'from-[#2A0808] via-[#4A0A0A] to-[#120202]'
                            }`}
                          >
                            {/* Reflexos e Luzes de Fundo */}
                            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-orange-500/20 blur-xl pointer-events-none" />
                            <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-purple-500/20 blur-xl pointer-events-none" />

                            <div className="relative z-10 flex items-center justify-between">
                              <span className="text-[9px] font-black tracking-widest text-white/70 uppercase">
                                {promo.tagLabel || 'PROMOÇÃO'}
                              </span>
                              <Tag className="w-3.5 h-3.5 text-amber-400 rotate-90" />
                            </div>

                            <div className="relative z-10">
                              <div className="text-base font-black text-white uppercase tracking-tight leading-none drop-shadow-md">
                                {promo.title.split(' ')[0]}
                              </div>
                              <div className="text-xs font-black text-amber-400 tracking-wider">
                                {promo.title.split(' ').slice(1).join(' ') || 'ESPECIAL'}
                              </div>
                            </div>

                            <div className="relative z-10 flex items-center justify-between">
                              <span className="text-[8px] font-bold text-white/60">
                                Evidência Calçados
                              </span>
                              <span className="text-[9px] font-black text-white bg-white/20 px-1.5 py-0.5 rounded">
                                %
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Título e Duração */}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-black text-[#0B1528] dark:text-white uppercase tracking-tight line-clamp-2">
                          {promo.title}
                        </h3>

                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl">
                            <Calendar className="w-3.5 h-3.5 text-[#0071E3]" />
                            <span>{days} {days === 1 ? 'dia' : 'dias'}</span>
                          </div>
                          {promo.description && (
                            <span className="text-[11px] text-slate-400 truncate max-w-[150px]">
                              {promo.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Faixa Escura de Metadados (Fiel ao Ribbon da Imagem de Referência) */}
                    <div className="bg-[#0B1528] text-white rounded-2xl px-4 py-3 text-xs shadow-inner flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      {/* Coluna 1: Vigência */}
                      <div className="space-y-0.5">
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>Período de Vigência:</span>
                        </div>
                        <div className="font-bold text-slate-100 text-xs">
                          {promo.startDate ? promo.startDate : 'Imediato'} até{' '}
                          {promo.endDate ? promo.endDate : 'Indefinido'}
                        </div>
                      </div>

                      {/* Coluna 2: Produtos Participantes */}
                      <div className="space-y-0.5">
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                          <Box className="w-3 h-3 text-slate-400" />
                          <span>Produtos Participantes:</span>
                        </div>
                        <div className="font-bold text-amber-300 text-xs">
                          {promo.productIds && promo.productIds.length > 0
                            ? `${promo.productIds.length} ${
                                promo.productIds.length === 1
                                  ? 'produto selecionado'
                                  : 'produtos selecionados'
                              }`
                            : `Automático (${matchingProducts.length} itens)`}
                        </div>
                      </div>

                      {/* Coluna 3: Limite de Saldo */}
                      <div className="space-y-0.5">
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                          <Tag className="w-3 h-3 text-slate-400" />
                          <span>Limite de Saldo (Estoque):</span>
                        </div>
                        <div className="font-bold text-rose-400 text-xs">
                          {promo.maxStock && Number(promo.maxStock) > 0
                            ? `≤ ${promo.maxStock} ${
                                Number(promo.maxStock) === 1 ? 'unidade' : 'unidades'
                              }`
                            : 'Sem limite'}
                        </div>
                      </div>
                    </div>

                    {/* Linha de Miniaturas dos Produtos Participantes */}
                    {matchingProducts.length > 0 && (
                      <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
                        {matchingProducts.slice(0, 5).map((p) => {
                          const photo = p.images?.[0] || p.imageUrl || p.foto_uri || NO_PHOTO_SVG;
                          return (
                            <div
                              key={p.id}
                              className="w-12 h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden"
                              title={p.name}
                            >
                              <img
                                src={photo}
                                alt={p.name}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          );
                        })}

                        {matchingProducts.length > 5 && (
                          <div className="h-12 px-3 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 font-extrabold text-[11px] flex items-center justify-center shrink-0">
                            +{matchingProducts.length - 5} outros
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Rodapé do Card: Status no E-commerce + Botão "Ver Detalhes >" */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
                    {/* Status no E-commerce */}
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Status no E-commerce:
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePromotionStatus(promo.id);
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          promo.active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                        }`}
                        title="Clique para alternar entre Ativa e Pausada"
                      >
                        {promo.active ? 'Ativa' : 'Pausada'}
                      </button>
                    </div>

                    {/* Botão Ver Detalhes (Pílula com borda azul e seta, fiel à imagem) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditPromo(promo);
                      }}
                      className="px-5 py-2 rounded-full border border-blue-400 dark:border-blue-500 text-[#0071E3] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <span>Ver Detalhes</span>
                      <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. MODAL DE CRIAÇÃO E EDIÇÃO DE OFERTAS & PRODUTOS (PORTAL GLOBAL NO BODY) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isModalOpen && (
              <div
                className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-y-auto"
                onClick={() => setIsModalOpen(false)}
              >
                <motion.div
                  onClick={(e) => e.stopPropagation()}
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  className={`w-full max-w-4xl p-6 sm:p-8 rounded-[32px] border shadow-2xl space-y-6 max-h-[92vh] flex flex-col relative z-10 ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                >
              {/* Topo do Modal */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                    <Gift className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black tracking-tight">
                      {editingPromo ? 'Editar Campanha Promocional' : 'Nova Campanha Promocional'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Configure vigência, percentual de desconto e selecione os produtos participantes.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Formulário com Scroll Suave */}
              <form onSubmit={handleSavePromo} className="space-y-6 overflow-y-auto pr-1 flex-1">
                {/* Linha 1: Título, Rótulo e Chamada */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Título da Promoção *
                    </label>
                    <input
                      type="text"
                      required
                      value={promoTitle}
                      onChange={(e) => setPromoTitle(e.target.value)}
                      placeholder="Ex: BLACK FRIDAY, SEMANA DO CONSUMIDOR"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs border font-bold focus:outline-none focus:border-blue-500 transition-all ${
                        isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Nome Exibido na Vitrine
                    </label>
                    <input
                      type="text"
                      value={promoHeaderLabel}
                      onChange={(e) => setPromoHeaderLabel(e.target.value)}
                      placeholder="Ex: Black Friday 2026"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs border font-medium focus:outline-none focus:border-blue-500 transition-all ${
                        isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Texto da Tag nos Cards
                    </label>
                    <input
                      type="text"
                      value={promoTagLabel}
                      onChange={(e) => setPromoTagLabel(e.target.value)}
                      placeholder="Ex: OFERTA, BLACK WEEK, SALDÃO"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs border font-black uppercase focus:outline-none focus:border-blue-500 transition-all ${
                        isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Subtítulo / Chamada da Promoção na Vitrine (Descrição) */}
                <div className="space-y-1.5 p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                      Subtítulo / Chamada da Promoção na Vitrine
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const vista = promoDiscountValueVista || 0;
                        const prazo = promoDiscountValuePrazo || 0;
                        const label = promoDiscountType === 'percentage'
                          ? `${vista}% À Vista • ${prazo}% A Prazo`
                          : `R$ ${vista} À Vista • R$ ${prazo} A Prazo`;
                        setPromoDescription(`Aproveite descontos especiais com ${label} aplicados diretamente no carrinho.`);
                      }}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      Preencher texto padrão sugerido
                    </button>
                  </div>
                  <input
                    type="text"
                    value={promoDescription}
                    onChange={(e) => setPromoDescription(e.target.value)}
                    placeholder="Ex: Aproveite descontos especiais com 40% À Vista • 10% A Prazo aplicados diretamente no carrinho."
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs border font-medium focus:outline-none focus:border-blue-500 transition-all ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
                    }`}
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Este texto aparece logo abaixo do título na vitrine da loja e na página de promoções. Se deixar em branco, o sistema gera o texto de descontos automaticamente.
                  </p>
                </div>

                {/* Linha 2: Datas de Vigência & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-500" />
                      <span>Data de Início *</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={promoStartDate}
                      onChange={(e) => setPromoStartDate(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs border font-bold focus:outline-none focus:border-blue-500 ${
                        isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-500" />
                      <span>Data de Término *</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={promoEndDate}
                      onChange={(e) => setPromoEndDate(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs border font-bold focus:outline-none focus:border-blue-500 ${
                        isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Status da Campanha
                    </label>
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setPromoActive(!promoActive)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          promoActive ? 'bg-emerald-500' : isDark ? 'bg-slate-700' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            promoActive ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <span className={`text-xs font-bold ${promoActive ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {promoActive ? 'Campanha Ativa' : 'Pausada'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Linha 3: Descontos Diferenciados (À Vista vs A Prazo) & Saldo de Estoque */}
                <div className="p-4 sm:p-5 rounded-2xl border bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/80 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-orange-500" />
                      <span>Condição de Desconto</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPromoDiscountType('percentage')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          promoDiscountType === 'percentage'
                            ? 'bg-[#0071E3] text-white shadow-xs'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        Porcentagem (%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPromoDiscountType('fixed')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          promoDiscountType === 'fixed'
                            ? 'bg-[#0071E3] text-white shadow-xs'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        Valor Fixo (R$)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Desconto À Vista */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        Desconto À Vista (Pix) *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={promoDiscountValueVista}
                          onChange={(e) => setPromoDiscountValueVista(Number(e.target.value) || 0)}
                          className={`w-full pl-3.5 pr-8 py-2 rounded-xl text-sm font-black border focus:outline-none ${
                            isDark ? 'bg-slate-800 border-slate-700 text-emerald-400' : 'bg-white border-slate-200 text-emerald-700'
                          }`}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                          {promoDiscountType === 'percentage' ? '%' : 'R$'}
                        </span>
                      </div>
                    </div>

                    {/* Desconto A Prazo */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-blue-600 dark:text-blue-400">
                        Desconto A Prazo (Cartão / 10x) *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={promoDiscountValuePrazo}
                          onChange={(e) => setPromoDiscountValuePrazo(Number(e.target.value) || 0)}
                          className={`w-full pl-3.5 pr-8 py-2 rounded-xl text-sm font-black border focus:outline-none ${
                            isDark ? 'bg-slate-800 border-slate-700 text-blue-400' : 'bg-white border-slate-200 text-blue-700'
                          }`}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                          {promoDiscountType === 'percentage' ? '%' : 'R$'}
                        </span>
                      </div>
                    </div>

                    {/* Saldo de Estoque Máximo */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-rose-600 dark:text-rose-400">
                        Limite de Saldo (Estoque ≤)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={promoMaxStock}
                          onChange={(e) =>
                            setPromoMaxStock(e.target.value === '' ? '' : Math.max(1, Number(e.target.value) || 1))
                          }
                          placeholder="Vazio = Sem limite"
                          className={`w-full pl-3.5 pr-8 py-2 rounded-xl text-sm font-black border focus:outline-none ${
                            isDark ? 'bg-slate-800 border-slate-700 text-rose-400' : 'bg-white border-slate-200 text-rose-700'
                          }`}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                          un
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Linha 4: Banner Visual da Campanha (Presets Estilizados) */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-purple-500" />
                      <span>Estilo Visual do Banner (Capa do Card)</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Selecione um tema gráfico para a capa
                    </span>
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {BANNER_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setPromoBannerPreset(preset.id);
                          setPromoBannerUrl('');
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          promoBannerPreset === preset.id
                            ? 'ring-2 ring-orange-500 border-transparent shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
                        }`}
                      >
                        <div
                          className={`w-full h-12 rounded-lg bg-gradient-to-r ${preset.gradient} p-1.5 flex flex-col justify-between mb-1.5`}
                        >
                          <span className="text-[8px] font-black text-amber-300">
                            {preset.tagText}
                          </span>
                          <span className="text-[7px] text-white/70">{preset.subText}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 line-clamp-1">
                          {preset.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Linha 5: Seleção de Produtos Participantes com Filtros em Tempo Real */}
                {(() => {
                  // Categorias reais
                  const catCountMap = new Map<string, number>();
                  visibleProducts.forEach((p) => {
                    const raw = p.category || p.nome_grupo || '';
                    const norm = normalizeCategoryName(raw);
                    if (norm && norm !== 'Geral' && !/^\d+(\.\d+)?$/.test(norm)) {
                      catCountMap.set(norm, (catCountMap.get(norm) || 0) + 1);
                    }
                  });
                  const realCategories = Array.from(catCountMap.entries()).map(([name, count]) => ({
                    name,
                    count,
                  }));

                  // Subcategorias disponíveis
                  let availableSubcategories: { name: string; count: number }[] = [];
                  if (promoCategoryFilter !== 'TODAS') {
                    const prodsInCat = visibleProducts.filter((p) =>
                      isProductInCategory(p, promoCategoryFilter)
                    );
                    const subCountMap = new Map<string, number>();
                    prodsInCat.forEach((p) => {
                      const subName = resolveProductSubcategoryName(p);
                      if (subName && subName !== 'Geral') {
                        subCountMap.set(subName, (subCountMap.get(subName) || 0) + 1);
                      }
                    });
                    availableSubcategories = Array.from(subCountMap.entries()).map(([name, count]) => ({
                      name,
                      count,
                    }));
                  }

                  const hasMaxStockFilter = promoMaxStock !== '' && Number(promoMaxStock) > 0;
                  const filteredProducts = visibleProducts.filter((prod) => {
                    if (promoCategoryFilter !== 'TODAS') {
                      if (!isProductInCategory(prod, promoCategoryFilter)) return false;
                    }
                    if (promoSubcategoryFilter !== 'TODAS') {
                      if (!isSubcategoryMatch(prod, promoSubcategoryFilter)) return false;
                    }
                    if (promoOnlySaldoFilter && hasMaxStockFilter) {
                      const stock = getProductTotalStock(prod);
                      if (stock <= 0 || stock > Number(promoMaxStock)) return false;
                    }
                    if (promoProductSearch) {
                      const q = promoProductSearch.toLowerCase().trim();
                      const matchName = (prod.name || '').toLowerCase().includes(q);
                      const matchCode =
                        String(prod.id).includes(q) || (prod.sku && prod.sku.toLowerCase().includes(q));
                      const matchBrand = (prod.brand || '').toLowerCase().includes(q);
                      if (!matchName && !matchCode && !matchBrand) return false;
                    }
                    return true;
                  });

                  const safePromoProductIds = Array.isArray(promoProductIds) ? promoProductIds : [];
                  const filteredIds = filteredProducts.map((p) => String(p.id));
                  const allFilteredSelected =
                    filteredIds.length > 0 && filteredIds.every((id) => safePromoProductIds.includes(id));

                  const filteredWithSaldo = hasMaxStockFilter
                    ? filteredProducts.filter((p) => {
                        const stock = getProductTotalStock(p);
                        return stock > 0 && stock <= Number(promoMaxStock);
                      })
                    : [];
                  const filteredSaldoIds = filteredWithSaldo.map((p) => String(p.id));
                  const allFilteredSaldoSelected =
                    filteredSaldoIds.length > 0 &&
                    filteredSaldoIds.every((id) => safePromoProductIds.includes(id));

                  return (
                    <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <label className="block text-xs font-black text-amber-500 uppercase tracking-wider">
                            Produtos Participantes ({promoProductIds.length} selecionados)
                          </label>
                          <p className="text-[11px] text-slate-400">
                            Exibindo {filteredProducts.length} de {visibleProducts.length} produtos disponíveis.
                          </p>
                        </div>

                        {/* Botões de Ação Rápida de Seleção */}
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1.5">
                          {hasMaxStockFilter && (
                            <button
                              type="button"
                              onClick={() => {
                                if (allFilteredSaldoSelected) {
                                  setPromoProductIds((prev) =>
                                    prev.filter((id) => !filteredSaldoIds.includes(id))
                                  );
                                } else {
                                  setPromoProductIds((prev) =>
                                    Array.from(new Set([...prev, ...filteredSaldoIds]))
                                  );
                                }
                              }}
                              className={`px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase border cursor-pointer transition-all ${
                                allFilteredSaldoSelected
                                  ? 'bg-rose-500/20 text-rose-500 border-rose-500/30'
                                  : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              }`}
                            >
                              {allFilteredSaldoSelected
                                ? `Desmarcar Saldo ≤ ${promoMaxStock}`
                                : `Selecionar Saldo ≤ ${promoMaxStock} (${filteredWithSaldo.length})`}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              if (allFilteredSelected) {
                                setPromoProductIds((prev) =>
                                  prev.filter((id) => !filteredIds.includes(id))
                                );
                              } else {
                                setPromoProductIds((prev) =>
                                  Array.from(new Set([...prev, ...filteredIds]))
                                );
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase border cursor-pointer transition-all ${
                              allFilteredSelected
                                ? 'bg-rose-500/20 text-rose-500 border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            }`}
                          >
                            {allFilteredSelected
                              ? 'Desmarcar Todos Filtrados'
                              : `Selecionar Todos Filtrados (${filteredProducts.length})`}
                          </button>
                        </div>
                      </div>

                      {/* Barra de Filtros de Produtos */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={promoProductSearch}
                            onChange={(e) => setPromoProductSearch(e.target.value)}
                            placeholder="Buscar por nome, marca ou ID..."
                            className={`w-full pl-8 pr-3 py-2 text-xs border rounded-xl focus:outline-none ${
                              isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>

                        {/* Filtro de Categoria */}
                        <select
                          value={promoCategoryFilter}
                          onChange={(e) => {
                            setPromoCategoryFilter(e.target.value);
                            setPromoSubcategoryFilter('TODAS');
                          }}
                          className={`w-full px-3 py-2 text-xs border rounded-xl focus:outline-none ${
                            isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                          }`}
                        >
                          <option value="TODAS">Todas as Categorias</option>
                          {realCategories.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.name} ({c.count})
                            </option>
                          ))}
                        </select>

                        {/* Filtro de Subcategoria */}
                        <select
                          disabled={promoCategoryFilter === 'TODAS' || availableSubcategories.length === 0}
                          value={promoSubcategoryFilter}
                          onChange={(e) => setPromoSubcategoryFilter(e.target.value)}
                          className={`w-full px-3 py-2 text-xs border rounded-xl focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                            isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                          }`}
                        >
                          <option value="TODAS">
                            {promoCategoryFilter === 'TODAS'
                              ? 'Selecione uma Categoria primeiro'
                              : 'Todas as Subcategorias'}
                          </option>
                          {availableSubcategories.map((sub) => (
                            <option key={sub.name} value={sub.name}>
                              {sub.name} ({sub.count})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Lista de Seleção de Produtos */}
                      <div className="max-h-60 overflow-y-auto space-y-1.5 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        {filteredProducts.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-400">
                            Nenhum produto encontrado com os filtros selecionados.
                          </div>
                        ) : (
                          filteredProducts.map((prod) => {
                            const isSelected =
                              safePromoProductIds.includes(String(prod.id)) ||
                              Boolean(prod.moblinkId && safePromoProductIds.includes(String(prod.moblinkId)));
                            const isPct = promoDiscountType === 'percentage';
                            const basePrice = Number(prod.price) || 0;
                            const calcVista = isPct
                              ? Math.round(
                                  basePrice * (1 - (Number(promoDiscountValueVista) || 0) / 100) * 100
                                ) / 100
                              : Math.max(0, basePrice - (Number(promoDiscountValueVista) || 0));
                            const calcPrazo = isPct
                              ? Math.round(
                                  basePrice * (1 - (Number(promoDiscountValuePrazo) || 0) / 100) * 100
                                ) / 100
                              : Math.max(0, basePrice - (Number(promoDiscountValuePrazo) || 0));

                            const prodStock = getProductTotalStock(prod);
                            const photo = prod.images?.[0] || prod.imageUrl || prod.foto_uri || NO_PHOTO_SVG;

                            return (
                              <div
                                key={prod.id}
                                onClick={() => handleToggleProductInPromo(String(prod.id))}
                                className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-amber-500/10 border-amber-500/40 text-slate-900 dark:text-white shadow-2xs'
                                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-center space-x-3 min-w-0 flex-1">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {}} // tratado no wrapper
                                    className="h-4 w-4 text-amber-500 rounded border-slate-400 cursor-pointer shrink-0"
                                  />
                                  <div className="w-10 h-10 rounded-lg bg-white p-0.5 border border-slate-200 dark:border-slate-700 shrink-0 overflow-hidden flex items-center justify-center">
                                    <img src={photo} alt={prod.name} className="w-full h-full object-contain" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-bold truncate">{prod.name}</div>
                                    <div className="text-[10px] text-slate-400 flex items-center gap-2">
                                      <span>ID: {prod.id}</span>
                                      <span>•</span>
                                      <span>Estoque: {prodStock} un</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right shrink-0 pl-2">
                                  <div className="text-[10px] text-slate-400 line-through">
                                    {basePrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </div>
                                  <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                                    {(Number(calcVista) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} à vista
                                  </div>
                                  <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                    {(Number(calcPrazo) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} a prazo
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Rodapé do Formulário: Botões de Ação */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#FF7A00] to-[#FF5500] hover:from-[#FF6A00] hover:to-[#E64A00] text-white font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95"
                  >
                    {editingPromo ? 'Salvar Alterações' : 'Criar Promoção'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
    )}
    </div>
  );
};
