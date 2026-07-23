import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ShoppingCart, MessageSquare, ArrowLeft, Shield, Sparkles, Heart, Share2, Check, User, Layers, CheckCircle2, AlertCircle, CreditCard, Zap } from 'lucide-react';
import { getGradeProdutoById } from '../services/moblinkGradesService';
import { GradeProduto, Product } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export const ProductDetail: React.FC = () => {
  const { 
    selectedProduct, 
    setCurrentView, 
    addToCart, 
    currentUser, 
    favorites = [],
    toggleFavorite,
    theme
  } = useApp();

  const [selectedLinhaOption, setSelectedLinhaOption] = useState<string | number | null>(null);
  const [selectedColunaOption, setSelectedColunaOption] = useState<string | null>(null);
  const [fetchedGrade, setFetchedGrade] = useState<GradeProduto | null>(null);
  const [loadingGrade, setLoadingGrade] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const isDark = theme === 'dark';

  if (!selectedProduct) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-12 rounded-3xl border backdrop-blur-xl max-w-md mx-auto space-y-4 ${
            isDark ? 'bg-slate-900/50 border-slate-800 text-slate-300' : 'bg-white/80 border-slate-200 text-slate-600'
          }`}
        >
          <AlertCircle className="h-12 w-12 mx-auto text-amber-400" />
          <p className="text-sm font-medium">Nenhum produto selecionado.</p>
          <button 
            onClick={() => setCurrentView('home')} 
            className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all shadow-md cursor-pointer ${
              isDark ? 'bg-amber-400 text-slate-950 hover:bg-amber-300' : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            Voltar para a Vitrine
          </button>
        </motion.div>
      </div>
    );
  }

  const p: Product = selectedProduct;
  const productImages = (p?.images && p.images.length > 0)
    ? p.images 
    : [p?.foto_uri || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=600&auto=format&fit=crop'];

  const idGrade = p.id_grade ?? p.gradeId ?? null;
  const hasGrade = idGrade !== null && idGrade !== undefined && idGrade !== '' && idGrade !== 0 && idGrade !== '0';

  // Auto-scroll to absolute top when viewing product details
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [p.id]);

  useEffect(() => {
    let isMounted = true;
    setSelectedLinhaOption(null);
    setSelectedColunaOption(null);
    setMessage('');

    if (hasGrade && idGrade) {
      setLoadingGrade(true);
      getGradeProdutoById(idGrade).then(grade => {
        if (isMounted) {
          setFetchedGrade(grade);
          setLoadingGrade(false);
        }
      }).catch(err => {
        console.warn('Erro ao carregar grade por id:', err);
        if (isMounted) setLoadingGrade(false);
      });
    } else {
      setFetchedGrade(null);
    }

    return () => { isMounted = false; };
  }, [p.id, idGrade, hasGrade]);

  // Opções para Linha (Tamanho / Numeração)
  const linhaOptions = (p.sizes && p.sizes.length > 0)
    ? p.sizes
    : [37, 38, 39, 40, 41, 42, 43, 44];

  // Opções para Coluna (Cor / Acabamento)
  const colunaOptions = [
    p.color,
    p.material,
    'Preto Nobre',
    'Café Havana',
    'Whisky'
  ].filter((val, index, self): val is string => Boolean(val && self.indexOf(val) === index));

  const handleAddToCart = () => {
    if (hasGrade) {
      const descrLinha = fetchedGrade?.descr_linha || 'Tamanho';
      const descrColuna = fetchedGrade?.descr_coluna || 'Cor';

      if (!selectedLinhaOption) {
        setMessage(`Por favor, selecione o ${descrLinha}.`);
        return;
      }

      if (!selectedColunaOption) {
        setMessage(`Por favor, selecione a ${descrColuna}.`);
        return;
      }

      const variationText = `${descrLinha}: ${selectedLinhaOption} | ${descrColuna}: ${selectedColunaOption}`;
      addToCart(p, variationText);
      setMessage(`Produto adicionado ao carrinho! (${selectedLinhaOption} / ${selectedColunaOption})`);
    } else {
      addToCart(p, 'Único');
      setMessage('Produto adicionado ao carrinho com sucesso!');
    }

    setTimeout(() => {
      setMessage('');
      setCurrentView('cart');
    }, 1200);
  };

  const handleWhatsAppInstantBuy = () => {
    if (!currentUser) {
      setMessage('Por favor, faça login para realizar uma compra.');
      setTimeout(() => {
        setCurrentView('orders');
      }, 1500);
      return;
    }

    if (hasGrade) {
      const descrLinha = fetchedGrade?.descr_linha || 'Tamanho';
      const descrColuna = fetchedGrade?.descr_coluna || 'Cor';

      if (!selectedLinhaOption || !selectedColunaOption) {
        setMessage(`Por favor, escolha ${descrLinha} e ${descrColuna} antes de comprar pelo WhatsApp.`);
        return;
      }
    }

    const variationText = hasGrade 
      ? `\n- Variação: ${selectedLinhaOption} / ${selectedColunaOption}` 
      : '';

    const textMsg = `*Interesse em Produto - Evidência*\n\n` +
      `Olá! Tenho interesse em comprar o seguinte item:\n` +
      `- *${p.descricao || p.name}*${variationText}\n` +
      `- Preço: R$ ${(p.preco_venda || p.price).toFixed(2).replace('.', ',')}\n\n` +
      `Gostaria de confirmar a disponibilidade e finalizar a compra!`;

    const encodedMsg = encodeURIComponent(textMsg);
    window.open(`https://wa.me/5599984684867?text=${encodedMsg}`, '_blank');
  };

  const handleShareProduct = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?product=${p.id}`;
    
    if (navigator.share) {
      navigator.share({
        title: `Evidência Calçados - ${p.name}`,
        text: `Olha só esse lindo calçado: ${p.name}!`,
        url: shareUrl,
      }).catch((err) => {
        console.warn("Error sharing:", err);
      });
    } else {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleShareWhatsAppDirect = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?product=${p.id}`;
    const text = `Confira esse lindo calçado da Evidência Calçados: *${p.name}* \nPreço: R$ ${p.price.toFixed(2).replace('.', ',')}\nVisualizar no catálogo: ${shareUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const isFavorite = favorites.includes(p.id);
  const discountPercent = p.originalPrice && p.originalPrice > p.price
    ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
    : 0;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      id="product-detail-page" 
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6"
    >
      {/* Back button & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <motion.button
          whileHover={{ x: -4 }}
          onClick={() => setCurrentView('home')}
          className={`inline-flex items-center space-x-2 text-xs font-bold cursor-pointer transition-colors ${
            isDark ? 'text-slate-400 hover:text-amber-400' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar para a Vitrine</span>
        </motion.button>

        <div className={`text-xs font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          Calçados &gt; <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>{p.category}</span> &gt; <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{p.name}</span>
        </div>
      </div>

      {/* Main Glassmorphic Container */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-10 rounded-3xl p-6 sm:p-10 border backdrop-blur-xl shadow-2xl ${
        isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white/80 border-slate-200/80'
      }`}>
        
        {/* Left Column: Image Gallery & Badges */}
        <div className="space-y-4">
          <div className={`relative aspect-square rounded-2xl overflow-hidden border shadow-lg ${
            isDark ? 'bg-slate-950/80 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <AnimatePresence mode="wait">
              <motion.img 
                key={activeImageIndex}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                src={productImages[activeImageIndex] || productImages[0]} 
                alt={p.name} 
                className="w-full h-full object-cover"
              />
            </AnimatePresence>

            {/* Badges Flutuantes */}
            <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
              {p.onSale && discountPercent > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase text-white bg-gradient-to-r from-red-600 to-rose-500 shadow-lg shadow-red-500/30 backdrop-blur-md animate-pulse">
                  {discountPercent}% OFF
                </span>
              )}
              {p.newArrival && (
                <span className="px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase text-slate-950 bg-gradient-to-r from-amber-300 to-amber-400 shadow-md shadow-amber-400/20 backdrop-blur-md">
                  LANÇAMENTO
                </span>
              )}
            </div>
            
            {/* Heart Wishlist & Share Action Buttons */}
            <div className="absolute top-4 right-4 flex flex-col gap-2.5 z-20">
              <motion.button 
                whileTap={{ scale: 0.8 }}
                onClick={() => toggleFavorite(p.id)}
                className={`p-3 rounded-full backdrop-blur-md border shadow-md transition-all cursor-pointer ${
                  isFavorite
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                    : isDark
                    ? 'bg-slate-900/80 border-slate-700/60 text-slate-400 hover:text-rose-400 hover:bg-slate-800'
                    : 'bg-white/90 border-slate-200/80 text-slate-400 hover:text-rose-500 hover:bg-white'
                }`}
                title={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              >
                <Heart className={`h-4.5 w-4.5 transition-colors ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
              </motion.button>

              <motion.button 
                whileTap={{ scale: 0.8 }}
                onClick={handleShareProduct}
                className={`p-3 rounded-full backdrop-blur-md border shadow-md transition-all cursor-pointer ${
                  isDark
                    ? 'bg-slate-900/80 border-slate-700/60 text-slate-400 hover:text-amber-400 hover:bg-slate-800'
                    : 'bg-white/90 border-slate-200/80 text-slate-400 hover:text-slate-900 hover:bg-white'
                }`}
                title="Compartilhar produto"
              >
                {copied ? <Check className="h-4.5 w-4.5 text-emerald-500" /> : <Share2 className="h-4.5 w-4.5" />}
              </motion.button>
            </div>
          </div>

          {/* Thumbnails Gallery */}
          <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
            {productImages.concat(productImages[0]).slice(0, 4).map((img, idx) => {
              const isActive = activeImageIndex === idx % productImages.length;
              return (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveImageIndex(idx % productImages.length)}
                  className={`w-20 aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    isActive
                      ? isDark 
                        ? 'border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]' 
                        : 'border-slate-900 shadow-md'
                      : isDark ? 'border-slate-800 opacity-60 hover:opacity-100' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Title, Prices, Selection & CTAs */}
        <div className="flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            
            {/* Title & Badges */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                  isDark ? 'bg-amber-400 text-slate-950' : 'bg-slate-900 text-white'
                }`}>
                  {p.category}
                </span>

                {p.crediarioProprio && (
                  <span className={`inline-flex items-center space-x-1.5 text-[10px] font-bold px-3 py-1 rounded-full border ${
                    isDark 
                      ? 'bg-amber-400/10 text-amber-300 border-amber-400/30' 
                      : 'bg-amber-50 text-amber-900 border-amber-200'
                  }`}>
                    <CreditCard className="h-3 w-3 text-amber-500 shrink-0" />
                    <span>Crediário Próprio</span>
                  </span>
                )}

                <span className={`inline-flex items-center space-x-1.5 text-[10px] font-bold px-3 py-1 rounded-full border ${
                  isDark 
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                    : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                }`}>
                  <Zap className="h-3 w-3 text-emerald-500 shrink-0" />
                  <span>Pix</span>
                </span>

                <span className={`inline-flex items-center space-x-1.5 text-[10px] font-bold px-3 py-1 rounded-full border ${
                  isDark 
                    ? 'bg-sky-500/10 text-sky-300 border-sky-500/30' 
                    : 'bg-sky-50 text-sky-900 border-sky-200'
                }`}>
                  <CreditCard className="h-3 w-3 text-sky-500 shrink-0" />
                  <span>Cartão de Crédito</span>
                </span>
              </div>

              <h1 className={`text-2xl sm:text-3xl font-black tracking-tight leading-snug ${
                isDark ? 'text-slate-100' : 'text-slate-900'
              }`}>
                {p.name}
              </h1>
            </div>

            {/* Price Box with Glassmorphism Accent */}
            <div className={`p-5 rounded-2xl border backdrop-blur-md ${
              p.onSale 
                ? isDark ? 'bg-rose-500/10 border-rose-500/20' : 'bg-rose-50/80 border-rose-200/80'
                : isDark ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {p.onSale ? 'Preço Promocional' : 'Preço à Vista'}
                </span>
                {p.onSale && discountPercent > 0 && (
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full text-white bg-rose-600 uppercase tracking-wider animate-pulse">
                    Economize {discountPercent}%
                  </span>
                )}
              </div>

              <div className="flex items-baseline space-x-3 mt-1">
                {p.onSale && p.originalPrice && p.originalPrice > p.price && (
                  <span className={`text-base line-through font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    R$ {p.originalPrice.toFixed(2).replace('.', ',')}
                  </span>
                )}
                <p className={`text-3xl font-black ${
                  p.onSale 
                    ? isDark ? 'text-rose-400' : 'text-rose-600' 
                    : isDark ? 'text-amber-400' : 'text-slate-900'
                }`}>
                  R$ {p.price.toFixed(2).replace('.', ',')}
                </p>
              </div>

              {p.crediarioProprio && (
                <p className={`text-xs font-semibold mt-2 ${isDark ? 'text-amber-300/90' : 'text-amber-900'}`}>
                  Parcele em até 10x sem juros no carnê da loja Evidência!
                </p>
              )}
            </div>

            {/* SELETOR ULTRA-PREMIUM DE VARIAÇÕES (Tamanho & Cor) */}
            <div className={`p-5 rounded-2xl border space-y-5 ${
              isDark ? 'bg-slate-950/50 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
            }`}>
              {/* SELEÇÃO DE TAMANHO / NUMERAÇÃO */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <label className={`font-bold uppercase tracking-wider text-xs flex items-center gap-1.5 ${
                    isDark ? 'text-amber-400' : 'text-slate-900'
                  }`}>
                    <span>1. Escolha o Tamanho:</span>
                  </label>
                  {selectedLinhaOption ? (
                    <span className="text-xs text-emerald-500 font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {selectedLinhaOption}
                    </span>
                  ) : (
                    <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider animate-pulse">Obrigatório *</span>
                  )}
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                  {linhaOptions.map((sizeOpt) => {
                    const isSelected = selectedLinhaOption === sizeOpt;
                    // Simulação de estoque por tamanho se houver sizeStockMap
                    const isOutOfStock = p.sizeStockMap && p.sizeStockMap[String(sizeOpt)] === 0;

                    return (
                      <motion.button
                        key={String(sizeOpt)}
                        whileHover={!isOutOfStock ? { scale: 1.05 } : {}}
                        whileTap={!isOutOfStock ? { scale: 0.95 } : {}}
                        disabled={isOutOfStock}
                        onClick={() => setSelectedLinhaOption(sizeOpt)}
                        className={`relative h-12 rounded-xl border flex flex-col items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? isDark
                              ? 'bg-amber-400 border-amber-400 text-slate-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.35)] scale-105 z-10'
                              : 'bg-slate-900 border-slate-900 text-white font-black shadow-lg scale-105 z-10'
                            : isOutOfStock
                              ? 'border-slate-800 text-slate-600 bg-slate-900/30 opacity-40 line-through cursor-not-allowed'
                              : isDark
                                ? 'border-slate-800 text-slate-300 bg-slate-900/80 hover:border-slate-700 hover:bg-slate-800'
                                : 'border-slate-200 text-slate-700 bg-white hover:border-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        <span>{sizeOpt}</span>
                        {isSelected && (
                          <motion.span 
                            layoutId="activeSizeBadge"
                            className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-950" 
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* SELEÇÃO DE COR / ACABAMENTO */}
              <div className="space-y-3 pt-3 border-t border-slate-800/40 dark:border-slate-800/80">
                <div className="flex justify-between items-center text-xs">
                  <label className={`font-bold uppercase tracking-wider text-xs flex items-center gap-1.5 ${
                    isDark ? 'text-amber-400' : 'text-slate-900'
                  }`}>
                    <span>2. Escolha a Cor / Acabamento:</span>
                  </label>
                  {selectedColunaOption ? (
                    <span className="text-xs text-emerald-500 font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {selectedColunaOption}
                    </span>
                  ) : (
                    <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider animate-pulse">Obrigatório *</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {colunaOptions.map((colorOpt) => {
                    const isSelected = selectedColunaOption === colorOpt;

                    return (
                      <motion.button
                        key={colorOpt}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setSelectedColunaOption(colorOpt)}
                        className={`px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center space-x-2 ${
                          isSelected
                            ? isDark
                              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                              : 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-sm'
                            : isDark
                              ? 'border-slate-800 text-slate-400 bg-slate-900/80 hover:border-slate-700 hover:text-slate-200'
                              : 'border-slate-200 text-slate-600 bg-white hover:border-slate-300 hover:text-slate-900'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-emerald-500 shadow-sm' : 'bg-slate-400'}`} />
                        <span>{colorOpt}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Descrição & Especificações */}
            <div className="space-y-2">
              <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Descrição do Calçado
              </h4>
              <div className={`text-xs sm:text-sm leading-relaxed whitespace-pre-line ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {p.description || p.descricao || p.descricao_completa}
              </div>
            </div>

            {/* Feedback Message */}
            <AnimatePresence>
              {message && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`p-3.5 rounded-xl text-xs font-bold text-center ${
                    message.includes('sucesso') || message.includes('adicionado')
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {message}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action CTAs */}
          <div className={`space-y-3 pt-4 border-t ${isDark ? 'border-slate-800/80' : 'border-slate-200/80'}`}>
            {currentUser ? (
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleWhatsAppInstantBuy}
                className="w-full flex items-center justify-center space-x-2 py-4 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <MessageSquare className="h-5 w-5" />
                <span>COMPRAR AGORA PELO WHATSAPP</span>
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => {
                  setMessage('Por favor, faça login para comprar.');
                  setTimeout(() => setCurrentView('orders'), 1200);
                }}
                className="w-full flex items-center justify-center space-x-2 py-4 px-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-amber-400/20 transition-all cursor-pointer"
              >
                <User className="h-5 w-5" />
                <span>FAZER LOGIN PARA COMPRAR</span>
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleAddToCart}
              className={`w-full flex items-center justify-center space-x-2 py-3.5 px-4 font-bold text-xs sm:text-sm rounded-2xl border transition-all cursor-pointer ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-slate-200 hover:border-amber-400 hover:text-amber-400'
                  : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
              }`}
            >
              <ShoppingCart className="h-4.5 w-4.5" />
              <span>Adicionar ao Carrinho</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Footwear Features Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
        <div className={`p-6 rounded-2xl border backdrop-blur-xl text-center flex flex-col items-center space-y-2 ${
          isDark ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white/80 border-slate-200/80'
        }`}>
          <div className="p-3 rounded-full bg-amber-400/10 text-amber-500 mb-1">
            <Shield className="h-6 w-6" />
          </div>
          <h4 className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Couro Legítimo Garantido</h4>
          <p className="text-xs text-slate-400">Peles selecionadas para durabilidade e acabamento nobre.</p>
        </div>

        <div className={`p-6 rounded-2xl border backdrop-blur-xl text-center flex flex-col items-center space-y-2 ${
          isDark ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white/80 border-slate-200/80'
        }`}>
          <div className="p-3 rounded-full bg-amber-400/10 text-amber-500 mb-1">
            <Sparkles className="h-6 w-6" />
          </div>
          <h4 className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Palmilha Confort Anatomica</h4>
          <p className="text-xs text-slate-400">Tecnologia de amortecimento contínuo para o dia todo.</p>
        </div>

        <div className={`p-6 rounded-2xl border backdrop-blur-xl text-center flex flex-col items-center space-y-2 ${
          isDark ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white/80 border-slate-200/80'
        }`}>
          <div className="p-3 rounded-full bg-amber-400/10 text-amber-500 mb-1">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <h4 className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Entrega Expressa & Crediário</h4>
          <p className="text-xs text-slate-400">Compre no carnê ou cartão com entrega rápida garantida.</p>
        </div>
      </div>
    </motion.div>
  );
};
