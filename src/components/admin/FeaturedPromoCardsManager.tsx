import React, { useState, useEffect } from 'react';
import { useApp, DEFAULT_FEATURED_PROMO_CARDS } from '../../context/AppContext';
import { FeaturedPromoCard } from '../../types';
import { uploadImageToSupabase } from '../../services/supabaseStorageService';
import {
  LayoutGrid,
  Sparkles,
  Save,
  RotateCcw,
  Upload,
  Eye,
  EyeOff,
  Footprints,
  CreditCard,
  ShoppingCart,
  QrCode,
  ShieldCheck,
  ArrowRight,
  Info,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sliders,
  Image as ImageIcon
} from 'lucide-react';

interface FeaturedPromoCardsManagerProps {
  isDark?: boolean;
  onToast?: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
}

export const FeaturedPromoCardsManager: React.FC<FeaturedPromoCardsManagerProps> = ({
  isDark: propIsDark,
  onToast
}) => {
  const {
    featuredPromoCards,
    updateFeaturedPromoCards,
    categories = [],
    promotions = [],
    storeTheme = 'default',
    theme
  } = useApp();

  const isDark = propIsDark !== undefined ? propIsDark : theme === 'dark';
  const isOutubroRosa = storeTheme === 'outubro-rosa';

  // Estado local dos 3 cards para edição fluida antes de salvar
  const [cards, setCards] = useState<FeaturedPromoCard[]>(() => {
    if (featuredPromoCards && featuredPromoCards.length === 3) {
      return JSON.parse(JSON.stringify(featuredPromoCards));
    }
    return JSON.parse(JSON.stringify(DEFAULT_FEATURED_PROMO_CARDS));
  });

  // Atualiza estado local quando o Firestore mudar externamente
  useEffect(() => {
    if (featuredPromoCards && featuredPromoCards.length === 3) {
      setCards(JSON.parse(JSON.stringify(featuredPromoCards)));
    }
  }, [featuredPromoCards]);

  // Tab do card em edição ativa: 'card-1' | 'card-2' | 'card-3'
  const [selectedCardId, setSelectedCardId] = useState<string>('card-1');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingCardId, setUploadingCardId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const activeIndex = cards.findIndex(c => c.id === selectedCardId);
  const activeCard = activeIndex !== -1 ? cards[activeIndex] : cards[0];

  const handleUpdateCardField = (cardId: string, field: keyof FeaturedPromoCard, value: any) => {
    setCards(prev => prev.map(c => {
      if (c.id === cardId) {
        return { ...c, [field]: value };
      }
      return c;
    }));
  };

  const notify = (title: string, message: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (onToast) {
      onToast(title, message, type);
    }
    setFeedback({ type: type === 'error' ? 'error' : 'success', message: `${title}: ${message}` });
    setTimeout(() => {
      setFeedback(null);
    }, 4500);
  };

  // Salvar no Firebase Firestore (documento storeConfig/layout)
  const handleSaveAll = async () => {
    setIsSaving(true);
    setFeedback(null);

    try {
      await updateFeaturedPromoCards(cards);
      notify('Vitrine Atualizada!', 'As alterações nos 3 cards promocionais foram salvas com sucesso no Firestore.', 'success');
    } catch (err: any) {
      console.error('Erro ao salvar cards promocionais:', err);
      notify('Erro ao Salvar', err.message || 'Falha na conexão com o Firestore.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Restaurar padrões de fábrica
  const handleRestoreDefaults = () => {
    if (window.confirm('Deseja restaurar os 3 cards promocionais para a configuração padrão de fábrica?')) {
      const cloned = JSON.parse(JSON.stringify(DEFAULT_FEATURED_PROMO_CARDS));
      setCards(cloned);
      notify('Configuração Restaurada', 'Os valores padrão foram restaurados. Clique em "Salvar Alterações" para confirmar na vitrine.', 'info');
    }
  };

  // Upload de Imagem para Supabase Storage
  const handleImageFileChange = async (cardId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      notify('Formato Inválido', 'Por favor selecione uma imagem PNG, JPG, JPEG ou WEBP.', 'error');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      notify('Arquivo Muito Grande', 'O tamanho máximo da imagem é de 8MB.', 'error');
      return;
    }

    setUploadingCardId(cardId);
    try {
      const publicUrl = await uploadImageToSupabase(file, { folder: 'banners' });
      handleUpdateCardField(cardId, 'image', publicUrl);
      notify('Upload Concluído!', 'Imagem armazenada no Supabase e vinculada ao card com sucesso.', 'success');
    } catch (err: any) {
      console.error('Erro no upload da imagem:', err);
      notify('Erro no Upload', err.message || 'Falha ao enviar imagem para o Supabase Storage.', 'error');
    } finally {
      setUploadingCardId(null);
    }
  };

  // Presets rápidos de imagem
  const presets: { [key: string]: { label: string; url: string }[] } = {
    'card-1': [
      { label: 'Tênis Padrão Unsplash', url: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=900&auto=format&fit=crop' },
      { label: 'Sapatos Elegantes', url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=900&auto=format&fit=crop' }
    ],
    'card-2': [
      { label: 'Oficial Meu Crediário (Mockup + Caixa)', url: '/meu-crediario-banner.jpg' },
      { label: 'Pagamento Digital & Cartão', url: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?q=80&w=900&auto=format&fit=crop' }
    ],
    'card-3': [
      { label: 'Bolsa de Couro Unsplash', url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=800&auto=format&fit=crop' },
      { label: 'Acessórios & Carteira', url: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?q=80&w=800&auto=format&fit=crop' }
    ]
  };

  return (
    <div className="space-y-8 max-w-6xl pb-10">
      
      {/* 1. CABEÇALHO DO GERENCIADOR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <div className="p-2.5 rounded-2xl bg-amber-400/10 text-amber-500 border border-amber-400/20">
              <LayoutGrid className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight flex items-center space-x-2">
                <span>Cards Promocionais da Vitrine (3 Banners)</span>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-400 border border-amber-400/30">
                  CMS Vitrine
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Personalize os 3 banners horizontais de alta conversão exibidos na vitrine logo após a seção de novidades.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          <button
            type="button"
            onClick={handleRestoreDefaults}
            className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              isDark 
                ? 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700' 
                : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            title="Restaurar textos e imagens originais de fábrica"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Restaurar Padrão</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Gravando no Firestore...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK INLINE DE SUCESSO / ERRO */}
      {feedback && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all animate-fade-in ${
          feedback.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          <div className="flex items-center space-x-2">
            {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* 2. CARD DE ORIENTAÇÕES DE MEDIDAS E FOTOS */}
      <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
        isDark ? 'bg-blue-950/20 border-blue-900/40 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-900'
      }`}>
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 shrink-0 mt-0.5">
            <Info className="h-5 w-5" />
          </div>
          <div className="space-y-1 text-xs">
            <h4 className="font-black text-sm">📐 Dimensões Oficiais Recomendadas para a Foto do Banner</h4>
            <p className="opacity-90 leading-relaxed">
              <strong>Tamanho ideal:</strong> <span className="font-mono font-bold">1024 x 756 px</span> ou <span className="font-mono font-bold">1200 x 800 px</span> (proporção ~4:3 ou ~3:2).
            </p>
            <p className="opacity-80 text-[11px] leading-tight">
              Recomendamos imagens com <strong>fundo recortado/transparente (PNG)</strong> ou <strong>fundo escuro/neutro</strong> para se fundir perfeitamente com o degradê do card.
            </p>
          </div>
        </div>

        <div className="shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-blue-500/15 border border-blue-400/30">
          Proporção: <strong>~4:3</strong>
        </div>
      </div>

      {/* 3. PRÉVIA EM TEMPO REAL NA VITRINE (INTERATIVA) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Eye className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-300">
              Prévia Visual da Vitrine (Clique em um card para editar)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Tema ativo: <strong className="text-amber-400">{storeTheme === 'outubro-rosa' ? 'Outubro Rosa' : 'Padrão'}</strong>
          </span>
        </div>

        <div className={`p-4 sm:p-5 rounded-3xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-100 border-slate-300'}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 lg:gap-4 w-full">
            
            {/* PRÉVIA CARD 1 */}
            {(() => {
              const c = cards[0];
              const isSelected = selectedCardId === c.id;
              return (
                <div
                  onClick={() => setSelectedCardId(c.id)}
                  className={`group relative rounded-2xl overflow-hidden flex flex-row items-stretch min-h-[170px] border cursor-pointer select-none transition-all duration-200 ${
                    isSelected ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 scale-[1.01]' : 'hover:opacity-95'
                  } ${!c.active ? 'opacity-40 grayscale' : ''} ${
                    isDark
                      ? isOutubroRosa ? 'border-pink-500/30 shadow-lg' : 'border-white/10 shadow-lg'
                      : isOutubroRosa ? 'border-pink-300/40 shadow-md' : 'border-slate-200/60 shadow-md'
                  }`}
                >
                  <div className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-black/60 text-white backdrop-blur-xs">
                    Card 1 (Esquerda) {isSelected && '• Editando'}
                  </div>

                  {/* Lado Esquerdo */}
                  <div className={`w-[58%] p-3 flex flex-col justify-between relative z-10 shrink-0 ${
                    isOutubroRosa
                      ? 'bg-gradient-to-r from-[#BE185D] via-[#DB2777] to-[#BE185D]'
                      : 'bg-gradient-to-r from-[#E50914] via-[#DC2626] to-[#B91C1C]'
                  }`}>
                    <div className="space-y-0.5 pt-4">
                      <span className="text-[9px] font-black uppercase tracking-wider text-white/95 block leading-tight">
                        {c.badge || 'COLEÇÃO'}
                      </span>
                      <h3 className="text-xl font-black text-white uppercase tracking-tight leading-tight">
                        {c.title || 'CALÇADOS'}
                      </h3>
                      {(c.discountHighlight || c.highlightCondition) && (
                        <div className="pt-0.5">
                          {c.highlightCondition && (
                            <span className="text-[7.5px] font-extrabold text-white uppercase tracking-wide block leading-none">
                              {c.highlightCondition}
                            </span>
                          )}
                          {c.discountHighlight && (
                            <span className="text-xl font-black text-[#FFE600] tracking-tight leading-none block">
                              {c.discountHighlight}
                            </span>
                          )}
                        </div>
                      )}
                      {c.subtitle && (
                        <p className="text-[7.5px] font-medium text-slate-200 leading-tight pt-0.5 line-clamp-2">
                          {c.subtitle}
                        </p>
                      )}
                    </div>

                    <div className="pt-2">
                      <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-white font-black text-[9px] uppercase tracking-wider shadow-sm ${
                        isOutubroRosa ? 'text-[#BE185D]' : 'text-[#DC2626]'
                      }`}>
                        <span>{c.buttonText || 'VER OFERTAS'}</span>
                        <ShoppingCart className="w-3 h-3 stroke-[2.5]" />
                      </span>
                      {c.footnote && (
                        <p className="text-[6.5px] font-semibold text-white/70 uppercase tracking-tighter mt-1 leading-none">
                          {c.footnote}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Lado Direito: Imagem */}
                  <div className="w-[42%] relative overflow-hidden bg-slate-900">
                    <img src={c.image} alt={c.title} className="w-full h-full object-cover" />
                  </div>
                </div>
              );
            })()}

            {/* PRÉVIA CARD 2 (CREDIÁRIO) */}
            {(() => {
              const c = cards[1];
              const isSelected = selectedCardId === c.id;
              return (
                <div
                  onClick={() => setSelectedCardId(c.id)}
                  className={`group relative rounded-2xl overflow-hidden flex flex-row items-stretch min-h-[170px] border cursor-pointer select-none transition-all duration-200 ${
                    isSelected ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 scale-[1.01]' : 'hover:opacity-95'
                  } ${!c.active ? 'opacity-40 grayscale' : ''} ${
                    isDark ? 'border-pink-500/30 shadow-lg' : 'border-pink-900/15 shadow-md'
                  }`}
                >
                  <div className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-black/60 text-white backdrop-blur-xs">
                    Card 2 (Central) {isSelected && '• Editando'}
                  </div>

                  {/* Selo Circular Flutuante Superior */}
                  <div className="absolute top-2 right-2 z-20 flex flex-col items-center justify-center w-10 h-10 rounded-full border border-white/90 bg-[#4A0429]/95 text-white shadow-xl pointer-events-none">
                    <Footprints className="w-2.5 h-2.5 text-pink-300" />
                    <span className="text-[9px] font-black leading-none tracking-tight">100%</span>
                    <span className="text-[5px] font-black uppercase tracking-tighter leading-none text-pink-200">
                      {c.badgeTopRight || 'ONLINE'}
                    </span>
                  </div>

                  {/* Lado Esquerdo */}
                  <div className="w-[60%] p-3 flex flex-col justify-between relative z-10 shrink-0 bg-gradient-to-br from-[#450529] via-[#5C0837] to-[#3D0324]">
                    <div className="space-y-0.5 pt-4">
                      <div className="flex items-center space-x-1">
                        <span className="text-[8px] font-black uppercase tracking-wider text-pink-200/90 leading-none">
                          {c.badge || 'CREDIÁRIO PRÓPRIO'}
                        </span>
                        <span className="w-4 h-[1px] bg-pink-400/50 inline-block rounded-full" />
                      </div>

                      <div className="flex items-center space-x-1">
                        <span className="text-lg font-black text-white leading-none tracking-tight">
                          MEU
                        </span>
                        <div className="p-0.5 rounded bg-pink-500/25 border border-pink-400/40 text-pink-300">
                          <CreditCard className="w-3 h-3 stroke-[2.5]" />
                        </div>
                      </div>
                      <h3 className="text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#FF6EA7] via-[#F472B6] to-[#FDA4AF] uppercase leading-none">
                        {c.title.replace(/^MEU\s*/i, '') || 'CREDIÁRIO'}
                      </h3>

                      <p className="text-[7.5px] font-medium text-slate-200 leading-tight pt-0.5 line-clamp-2">
                        {c.subtitle || 'Consulte seus calçados e faturas.'}
                      </p>

                      <div className="grid grid-cols-3 gap-0.5 py-1 border-y border-pink-500/20 my-1 text-center bg-black/10 rounded px-0.5">
                        <div className="space-y-0.5">
                          <p className="text-[6.5px] font-bold text-white">Calçados</p>
                          <p className="text-[5px] text-pink-200/70">Fácil</p>
                        </div>
                        <div className="space-y-0.5 border-x border-pink-500/20">
                          <p className="text-[6.5px] font-bold text-white">Via Pix</p>
                          <p className="text-[5px] text-pink-200/70">Na hora</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[6.5px] font-bold text-white">Seguro</p>
                          <p className="text-[5px] text-pink-200/70">Online</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-1">
                      <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-white text-[#4A0429] font-black text-[9px] uppercase tracking-wider shadow-sm">
                        <span>{c.buttonText || 'ACESSAR CREDIÁRIO'}</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>

                  {/* Lado Direito: Foto */}
                  <div className="w-[40%] relative overflow-hidden bg-slate-900">
                    <img src={c.image} alt={c.title} className="w-full h-full object-cover object-right" />
                  </div>
                </div>
              );
            })()}

            {/* PRÉVIA CARD 3 */}
            {(() => {
              const c = cards[2];
              const isSelected = selectedCardId === c.id;
              return (
                <div
                  onClick={() => setSelectedCardId(c.id)}
                  className={`group relative rounded-2xl overflow-hidden flex flex-row items-stretch min-h-[170px] border cursor-pointer select-none transition-all duration-200 ${
                    isSelected ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 scale-[1.01]' : 'hover:opacity-95'
                  } ${!c.active ? 'opacity-40 grayscale' : ''} ${
                    isDark
                      ? isOutubroRosa ? 'border-pink-500/30 shadow-lg' : 'border-white/10 shadow-lg'
                      : isOutubroRosa ? 'border-pink-300/40 shadow-md' : 'border-slate-200/60 shadow-md'
                  }`}
                >
                  <div className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-black/60 text-white backdrop-blur-xs">
                    Card 3 (Direita) {isSelected && '• Editando'}
                  </div>

                  {/* Lado Esquerdo */}
                  <div className={`w-[58%] p-3 flex flex-col justify-between relative z-10 shrink-0 ${
                    isOutubroRosa
                      ? 'bg-gradient-to-r from-[#BE185D] via-[#DB2777] to-[#BE185D]'
                      : 'bg-gradient-to-r from-[#E50914] via-[#DC2626] to-[#B91C1C]'
                  }`}>
                    <div className="space-y-0.5 pt-4">
                      <span className="text-[9px] font-black uppercase tracking-wider text-white/95 block leading-tight">
                        {c.badge || 'TUDO PARA VOCÊ'}
                      </span>
                      <h3 className="text-lg font-black text-white uppercase tracking-tight leading-tight">
                        {c.title || 'BOLSAS & ACESSÓRIOS'}
                      </h3>
                      {(c.discountHighlight || c.highlightCondition) && (
                        <div className="pt-0.5">
                          {c.highlightCondition && (
                            <span className="text-[7.5px] font-extrabold text-white uppercase tracking-wide block leading-none">
                              {c.highlightCondition}
                            </span>
                          )}
                          {c.discountHighlight && (
                            <span className="text-xl font-black text-[#FFE600] tracking-tight leading-none block">
                              {c.discountHighlight}
                            </span>
                          )}
                        </div>
                      )}
                      {c.subtitle && (
                        <p className="text-[7.5px] font-medium text-slate-200 leading-tight pt-0.5 line-clamp-2">
                          {c.subtitle}
                        </p>
                      )}
                    </div>

                    <div className="pt-2">
                      <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-white font-black text-[9px] uppercase tracking-wider shadow-sm ${
                        isOutubroRosa ? 'text-[#BE185D]' : 'text-[#DC2626]'
                      }`}>
                        <span>{c.buttonText || 'VER OFERTAS'}</span>
                        <ShoppingCart className="w-3 h-3 stroke-[2.5]" />
                      </span>
                      {c.footnote && (
                        <p className="text-[6.5px] font-semibold text-white/70 uppercase tracking-tighter mt-1 leading-none">
                          {c.footnote}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Lado Direito: Imagem */}
                  <div className="w-[42%] relative overflow-hidden bg-slate-900">
                    <img src={c.image} alt={c.title} className="w-full h-full object-cover" />
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      </div>

      {/* 4. SELETOR DE CARD ATIVO (TABS) */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {cards.map((c, idx) => {
            const isSelected = c.id === selectedCardId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCardId(c.id)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'border-amber-400 bg-amber-400/10 shadow-md text-amber-300'
                    : isDark
                      ? 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="space-y-1 truncate pr-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-400/20 text-amber-400 font-black text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-black uppercase tracking-wider truncate">
                      {idx === 0 ? 'Card 1 (Esquerda)' : idx === 1 ? 'Card 2 (Central)' : 'Card 3 (Direita)'}
                    </span>
                  </div>
                  <p className="text-sm font-black truncate text-white">
                    {c.title || `Card ${idx + 1}`}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {c.badge || 'Etiqueta'}
                  </p>
                </div>

                <div className="shrink-0 flex flex-col items-end space-y-1">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                    c.active
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}>
                    {c.active ? 'Ativo' : 'Oculto'}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">
                    {c.cardType === 'crediario' ? '💳 Crediário' : '🏷️ Retail'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* 5. FORMULÁRIO DE EDIÇÃO DO CARD SELECIONADO */}
        {activeCard && (
          <div className={`p-6 sm:p-8 rounded-3xl border backdrop-blur-xl space-y-6 ${
            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            
            {/* Cabeçalho do Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/40 gap-3">
              <div>
                <h3 className="text-lg font-black text-amber-400 flex items-center space-x-2">
                  <Sliders className="h-5 w-5" />
                  <span>
                    Editando: {activeCard.id === 'card-1' ? 'Card 1 (Esquerda - Novidades)' : activeCard.id === 'card-2' ? 'Card 2 (Central - Meu Crediário)' : 'Card 3 (Direita - Bolsas & Acessórios)'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Preencha os campos abaixo para atualizar o conteúdo em tempo real na vitrine.
                </p>
              </div>

              {/* Toggle de Ativo / Oculto */}
              <div className="flex items-center space-x-3">
                <span className="text-xs font-bold text-slate-300">
                  Exibição na Loja:
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeCard.active}
                    onChange={(e) => handleUpdateCardField(activeCard.id, 'active', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  <span className="ml-2.5 text-xs font-black text-slate-300">
                    {activeCard.active ? 'Card Ativo' : 'Card Oculto'}
                  </span>
                </label>
              </div>
            </div>

            {/* Grid de Campos do Formulário */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              
              {/* Tipo de Card */}
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-300">
                  Tipo / Layout do Card
                </label>
                <select
                  value={activeCard.cardType || 'standard'}
                  onChange={(e) => handleUpdateCardField(activeCard.id, 'cardType', e.target.value)}
                  className={`w-full p-3 rounded-xl text-xs border font-bold focus:outline-none focus:border-amber-400 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                  }`}
                >
                  <option value="standard">🏷️ Padrão Retail (Desconto & Cupons)</option>
                  <option value="crediario">💳 Meu Crediário (Benefícios Financeiros & Selo 100% Online)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  O modo Crediário inclui a linha de benefícios (Pix, Calçados, Seguro) e selo flutuante.
                </p>
              </div>

              {/* Eyebrow / Tag Badge */}
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-300">
                  Etiqueta / Eyebrow (Badge Superior) *
                </label>
                <input
                  type="text"
                  value={activeCard.badge}
                  onChange={(e) => handleUpdateCardField(activeCard.id, 'badge', e.target.value)}
                  placeholder="Ex: COLEÇÃO 2026, CREDIÁRIO PRÓPRIO"
                  required
                  className={`w-full p-3 rounded-xl text-xs border focus:outline-none focus:border-amber-400 font-bold ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                  }`}
                />
              </div>

              {/* Título Principal */}
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-300">
                  Título Principal *
                </label>
                <input
                  type="text"
                  value={activeCard.title}
                  onChange={(e) => handleUpdateCardField(activeCard.id, 'title', e.target.value)}
                  placeholder="Ex: CALÇADOS, MEU CREDIÁRIO, BOLSAS"
                  required
                  className={`w-full p-3 rounded-xl text-xs border focus:outline-none focus:border-amber-400 font-black ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                  }`}
                />
              </div>

              {/* Condição do Desconto */}
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-300">
                  Condição do Destaque (Texto Menor)
                </label>
                <input
                  type="text"
                  value={activeCard.highlightCondition || ''}
                  onChange={(e) => handleUpdateCardField(activeCard.id, 'highlightCondition', e.target.value)}
                  placeholder="Ex: COM CUPONS DE ATÉ, COM ATÉ"
                  className={`w-full p-3 rounded-xl text-xs border focus:outline-none focus:border-amber-400 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                  }`}
                />
              </div>

              {/* Destaque em Amarelo/Neon */}
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-300">
                  Destaque em Amarelo/Neon (Grande)
                </label>
                <input
                  type="text"
                  value={activeCard.discountHighlight || ''}
                  onChange={(e) => handleUpdateCardField(activeCard.id, 'discountHighlight', e.target.value)}
                  placeholder="Ex: 40% OFF, 50% OFF, 6x SEM JUROS"
                  className={`w-full p-3 rounded-xl text-xs border focus:outline-none focus:border-amber-400 font-black text-amber-400 ${
                    isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'
                  }`}
                />
              </div>

              {/* Selo Flutuante do Topo Direito (Para Crediário) */}
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-300">
                  Selo Flutuante (Canto Superior Direito)
                </label>
                <input
                  type="text"
                  value={activeCard.badgeTopRight || ''}
                  onChange={(e) => handleUpdateCardField(activeCard.id, 'badgeTopRight', e.target.value)}
                  placeholder="Ex: 100% ONLINE, NOVO, EXCLUSIVO"
                  className={`w-full p-3 rounded-xl text-xs border focus:outline-none focus:border-amber-400 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                  }`}
                />
              </div>

              {/* Subtítulo / Descrição Curta */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-bold mb-1.5 text-slate-300">
                  Subtítulo / Descrição Explicativa
                </label>
                <textarea
                  value={activeCard.subtitle || ''}
                  onChange={(e) => handleUpdateCardField(activeCard.id, 'subtitle', e.target.value)}
                  placeholder="Ex: Consulte seus calçados, faturas e pague parcelas no Pix com baixa instantânea."
                  rows={2}
                  className={`w-full p-3 rounded-xl text-xs border focus:outline-none focus:border-amber-400 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                  }`}
                />
              </div>

              {/* Texto do Botão (CTA) */}
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-300">
                  Texto do Botão (CTA) *
                </label>
                <input
                  type="text"
                  value={activeCard.buttonText}
                  onChange={(e) => handleUpdateCardField(activeCard.id, 'buttonText', e.target.value)}
                  placeholder="Ex: VER OFERTAS, ACESSAR CREDIÁRIO"
                  required
                  className={`w-full p-3 rounded-xl text-xs border focus:outline-none focus:border-amber-400 font-bold ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                  }`}
                />
              </div>

              {/* Link / Destino do Clique */}
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-300">
                  Destino do Clique (Rota ou Link) *
                </label>
                <select
                  value={activeCard.buttonLink}
                  onChange={(e) => handleUpdateCardField(activeCard.id, 'buttonLink', e.target.value)}
                  className={`w-full p-3 rounded-xl text-xs border font-medium focus:outline-none focus:border-amber-400 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                  }`}
                >
                  <optgroup label="💳 Páginas & Recursos Principais">
                    <option value="meu-crediario">💳 Meu Crediário (/meu-crediario)</option>
                    <option value="categoria:NOVIDADES">⭐ Novidades & Lançamentos</option>
                    <option value="categoria:ACESSÓRIOS">👜 Bolsas & Acessórios</option>
                    <option value="ofertas">🔥 Todas as Ofertas & Saldão</option>
                    <option value="todos">🌟 Catálogo Completo</option>
                  </optgroup>

                  {promotions && promotions.length > 0 && (
                    <optgroup label="🏷️ Ofertas Promocionais Cadastradas">
                      {promotions.map(promo => (
                        <option key={promo.id} value={`promo:${promo.id}`}>
                          🏷️ Oferta: {promo.title} {promo.active ? '(Ativa)' : '(Pausada)'}
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {categories && categories.length > 0 && (
                    <optgroup label="📁 Categorias da Loja">
                      {categories.map(cat => (
                        <option key={cat.id} value={`categoria:${cat.name}`}>
                          📁 {cat.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>

                <div className="mt-1.5">
                  <input
                    type="text"
                    value={activeCard.buttonLink}
                    onChange={(e) => handleUpdateCardField(activeCard.id, 'buttonLink', e.target.value)}
                    placeholder="Ou digite rota customizada..."
                    className={`w-full p-2 rounded-lg text-[11px] font-mono border focus:outline-none ${
                      isDark ? 'bg-slate-950/80 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
              </div>

              {/* Rodapé / Footnote */}
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-300">
                  Nota de Rodapé (Texto Pequeno)
                </label>
                <input
                  type="text"
                  value={activeCard.footnote || ''}
                  onChange={(e) => handleUpdateCardField(activeCard.id, 'footnote', e.target.value)}
                  placeholder="Ex: *IMAGEM MERAMENTE ILUSTRATIVA, *CONSULTA POR CPF"
                  className={`w-full p-3 rounded-xl text-xs border focus:outline-none focus:border-amber-400 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                  }`}
                />
              </div>

              {/* Foto do Card & Upload */}
              <div className="sm:col-span-2 lg:col-span-3 space-y-3 pt-2 border-t border-slate-800/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="block text-xs font-bold text-slate-300">
                    Foto do Banner (Lado Direito do Card) *
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Dimensão recomendada: 1024 x 756 px (~4:3)
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <input
                    type="text"
                    value={activeCard.image}
                    onChange={(e) => handleUpdateCardField(activeCard.id, 'image', e.target.value)}
                    placeholder="https://... ou /meu-crediario-banner.jpg"
                    required
                    className={`flex-1 p-3 rounded-xl text-xs border focus:outline-none focus:border-amber-400 font-mono ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                    }`}
                  />

                  {/* Botão de Upload para Supabase */}
                  <label className={`px-5 py-3 rounded-xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center space-x-2 shrink-0 ${
                    uploadingCardId === activeCard.id
                      ? 'bg-amber-400/20 text-amber-400 border-amber-400/40 animate-pulse'
                      : isDark
                        ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
                        : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
                  }`}>
                    <Upload className="h-4 w-4" />
                    <span>{uploadingCardId === activeCard.id ? 'Enviando...' : 'Fazer Upload'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageFileChange(activeCard.id, e)}
                      disabled={uploadingCardId === activeCard.id}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Presets Rápidos */}
                {presets[activeCard.id] && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Atalhos rápidos:</span>
                    {presets[activeCard.id].map(p => (
                      <button
                        key={p.url}
                        type="button"
                        onClick={() => handleUpdateCardField(activeCard.id, 'image', p.url)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                          activeCard.image === p.url
                            ? 'bg-amber-400/20 border-amber-400/50 text-amber-300'
                            : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Miniatura da Foto com Informações */}
                {activeCard.image && (
                  <div className="flex items-center space-x-4 p-3 rounded-2xl bg-slate-950/60 border border-slate-800 max-w-md mt-2">
                    <div className="w-20 h-16 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 shrink-0">
                      <img src={activeCard.image} alt={activeCard.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="text-xs space-y-0.5 min-w-0">
                      <p className="font-bold text-white truncate">Miniatura Carregada</p>
                      <p className="text-[10px] text-slate-400 truncate font-mono">{activeCard.image}</p>
                      <a
                        href={activeCard.image}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-amber-400 hover:underline flex items-center space-x-1"
                      >
                        <span>Abrir imagem original</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Botão de Salvar no Rodapé do Formulário */}
            <div className="flex justify-end pt-4 border-t border-slate-800/40">
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={isSaving}
                className="px-7 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? 'Salvando no Firestore...' : 'Salvar Alterações na Vitrine'}</span>
              </button>
            </div>

          </div>
        )}

      </div>

    </div>
  );
};
