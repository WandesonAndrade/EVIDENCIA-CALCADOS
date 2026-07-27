import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ShoppingCart, MessageSquare, ArrowLeft, Shield, Sparkles, Heart, Share2, Check, User, Layers, CheckCircle2, AlertCircle, CreditCard, Zap } from 'lucide-react';
import { getGradeProdutoById } from '../services/moblinkGradesService';
import { GradeProduto, Product } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { CompleteProfileModal } from './CompleteProfileModal';
import { CheckoutConfirmationModal } from './CheckoutConfirmationModal';
import { isProfileIncomplete } from '../App';

export const ProductDetail: React.FC = () => {
  const { 
    selectedProduct, 
    setCurrentView, 
    addToCart, 
    currentUser, 
    createOrder,
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

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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
    } else if (p.sizes && p.sizes.length > 0 && !selectedLinhaOption) {
      setMessage(`Por favor, selecione o Tamanho do calçado.`);
      return;
    } else {
      const variationText = selectedLinhaOption ? `Tamanho: ${selectedLinhaOption}` : 'Único';
      addToCart(p, variationText);
      setMessage('Produto adicionado ao carrinho com sucesso!');
    }

    setTimeout(() => {
      setMessage('');
      setCurrentView('cart');
    }, 1200);
  };

  // Replicated Multi-Step Checkout Pipeline for "Comprar Agora"
  const handleWhatsAppInstantBuy = () => {
    // 1. Mandatory variation validation (Size & Color)
    if (hasGrade) {
      const descrLinha = fetchedGrade?.descr_linha || 'Tamanho';
      const descrColuna = fetchedGrade?.descr_coluna || 'Cor';

      if (!selectedLinhaOption) {
        setMessage(`⚠️ Por favor, selecione o ${descrLinha} do calçado antes de comprar.`);
        return;
      }

      if (!selectedColunaOption) {
        setMessage(`⚠️ Por favor, selecione a ${descrColuna} antes de comprar.`);
        return;
      }
    } else if (p.sizes && p.sizes.length > 0 && !selectedLinhaOption) {
      setMessage(`⚠️ Por favor, selecione o Tamanho do calçado antes de comprar.`);
      return;
    }

    const descrLinha = fetchedGrade?.descr_linha || 'Tamanho';
    const descrColuna = fetchedGrade?.descr_coluna || 'Cor';
    const variationText = hasGrade 
      ? `${descrLinha}: ${selectedLinhaOption} | ${descrColuna}: ${selectedColunaOption}` 
      : (selectedLinhaOption ? `Tamanho: ${selectedLinhaOption}` : 'Único');

    // Add item to cart to prepare order object
    addToCart(p, variationText);

    // 2. Auth Check
    if (!currentUser) {
      setMessage('Por favor, faça login para realizar sua compra.');
      setTimeout(() => {
        setCurrentView('login');
      }, 1200);
      return;
    }

    // 3. Profile Completeness Check
    if (isProfileIncomplete(currentUser)) {
      setIsProfileModalOpen(true);
      return;
    }

    // 4. Open Dedicated Confirmation Modal
    setIsConfirmationModalOpen(true);
  };

  const handleConfirmOrder = async (
    paymentMethod: 'Pix' | 'Cartão de Crédito' | 'Crediário da Loja', 
    deliveryType: 'Entrega em Caxias-MA' | 'Retirada na Loja',
    installments?: number
  ) => {
    if (!currentUser) return;
    try {
      setIsProcessing(true);
      const order = await createOrder(currentUser.name, currentUser.email, {
        paymentMethod,
        deliveryType,
        installments,
        customerPhone: currentUser.telefone || '',
        deliveryAddress: deliveryType === 'Retirada na Loja' 
          ? 'Retirada na Loja: Rua Afonso Pena, 295 - Centro, Caxias - MA'
          : `${currentUser.endereco || ''}, Nº ${currentUser.numero || ''} - ${currentUser.bairro || ''}`
      });
      setIsConfirmationModalOpen(false);
      window.open(order.whatsappUrl, '_blank');
      setCurrentView('cart');
    } catch (error) {
      console.error("Failed to finalize order from product detail:", error);
    } finally {
      setIsProcessing(false);
    }
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        
        {/* GALERIA DE IMAGENS */}
        <div className="lg:col-span-7 space-y-4">
          <div className={`relative aspect-square rounded-3xl overflow-hidden border backdrop-blur-xl shadow-xl ${
            isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <motion.img
              key={activeImageIndex}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              src={productImages[activeImageIndex]}
              alt={p.name}
              className="w-full h-full object-cover"
            />

            {discountPercent > 0 && (
              <span className="absolute top-4 left-4 bg-rose-600 text-white font-black text-xs px-3 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
                -{discountPercent}% OFF
              </span>
            )}

            <button
              onClick={() => toggleFavorite(p.id)}
              className={`absolute top-4 right-4 p-3 rounded-full backdrop-blur-md border transition-all cursor-pointer shadow-md ${
                isFavorite
                  ? 'bg-rose-500 text-white border-rose-400 scale-110'
                  : isDark ? 'bg-slate-900/60 border-slate-800 text-slate-300 hover:text-rose-400' : 'bg-white/80 border-slate-200 text-slate-700 hover:text-rose-600'
              }`}
              title={isFavorite ? 'Remover dos Favoritos' : 'Salvar nos Favoritos'}
            >
              <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          </div>

          {productImages.length > 1 && (
            <div className="flex items-center space-x-3 overflow-x-auto pb-2">
              {productImages.map((imgUrl, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                    activeImageIndex === idx
                      ? 'border-amber-400 scale-105 shadow-md'
                      : isDark ? 'border-slate-800 opacity-60 hover:opacity-100' : 'border-slate-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={imgUrl} alt={`${p.name} thumb ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* INFORMAÇÕES & OPÇÕES DE COMPRA */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                isDark ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' : 'bg-slate-900 text-white'
              }`}>
                {p.category}
              </span>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleShareProduct}
                  className={`p-2 rounded-xl border transition-all cursor-pointer text-xs font-bold flex items-center space-x-1 ${
                    isDark ? 'border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  title="Compartilhar Link"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
                  <span>{copied ? 'Copiado!' : 'Compartilhar'}</span>
                </button>
              </div>
            </div>

            <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              {p.name}
            </h1>

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
                Crediário Próprio em até <strong className="font-extrabold text-amber-400">6x de R$ {(p.price / 6).toFixed(2).replace('.', ',')} sem juros</strong> no carnê Evidência!
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
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* SELEÇÃO DE COR / ACABAMENTO */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <label className={`font-bold uppercase tracking-wider text-xs flex items-center gap-1.5 ${
                  isDark ? 'text-amber-400' : 'text-slate-900'
                }`}>
                  <span>2. Cor / Acabamento:</span>
                </label>
                {selectedColunaOption && (
                  <span className="text-xs text-emerald-500 font-bold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {selectedColunaOption}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
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

          {/* Action CTAs */}
          <div className={`space-y-3 pt-4 border-t ${isDark ? 'border-slate-800/80' : 'border-slate-200/80'}`}>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleWhatsAppInstantBuy}
              className="w-full flex items-center justify-center space-x-2 py-4 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer uppercase tracking-wider"
            >
              <MessageSquare className="h-5 w-5" />
              <span>COMPRAR AGORA PELO WHATSAPP</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleAddToCart}
              className={`w-full flex items-center justify-center space-x-2 py-3.5 px-4 rounded-2xl border font-bold text-xs transition-all cursor-pointer ${
                isDark 
                  ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 hover:border-slate-700' 
                  : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
              }`}
            >
              <ShoppingCart className="h-4 w-4" />
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

      {/* Step 1 Profile Completion Modal */}
      <CompleteProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Step 2 Dedicated Confirmation & Delivery Choice Modal */}
      <CheckoutConfirmationModal
        isOpen={isConfirmationModalOpen}
        onClose={() => setIsConfirmationModalOpen(false)}
        subtotal={p.price}
        cartItemsCount={1}
        onConfirmOrder={handleConfirmOrder}
        isProcessing={isProcessing}
      />
    </motion.div>
  );
};
