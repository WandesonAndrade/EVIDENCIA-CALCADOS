import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ShoppingCart, ArrowLeft, Shield, Sparkles, Heart, Share2, Check, CreditCard, CheckCircle2, AlertCircle, ArrowRight, Truck, RefreshCw } from 'lucide-react';
import { getGradeProdutoById, getProdutoGradesFromApi } from '../services/moblinkGradesService';
import { getSingleProdutoMoblinkFromApi, sanitizeProductForFirestore } from '../services/moblinkProductsService';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { GradeProduto, Product, ProdutoGradesResult } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { CompleteProfileModal } from './CompleteProfileModal';
import { CheckoutConfirmationModal } from './CheckoutConfirmationModal';
import { ProductCard } from './ProductList';
import { isProfileIncomplete } from '../App';

export const ProductDetail: React.FC = () => {
  const { 
    products = [],
    selectedProduct, 
    setSelectedProduct,
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
  const [productGradeData, setProductGradeData] = useState<ProdutoGradesResult | null>(null);
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
            isDark ? 'bg-[#161617] border-white/10 text-slate-300' : 'bg-[#f5f5f7] border-black/5 text-[#1d1d1f]'
          }`}
        >
          <AlertCircle className="h-12 w-12 mx-auto text-[#0071e3]" />
          <p className="text-sm font-medium">Nenhum produto selecionado.</p>
          <button 
            onClick={() => setCurrentView('home')} 
            className="px-6 py-2.5 rounded-full text-xs font-semibold bg-[#0071e3] text-white hover:bg-[#0077ed] transition-all cursor-pointer shadow-xs"
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

  // 1. Auto-scroll ao topo no carregamento do produto
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [p.id]);

  // 2. Sincronização AUTOMÁTICA do produto e grades do ERP MobLink no momento do acesso
  useEffect(() => {
    let isMounted = true;
    setSelectedLinhaOption(null);
    setSelectedColunaOption(null);
    setMessage('');
    setLoadingGrade(true);

    // Atualização silenciosa e automática diretamente da API do ERP
    getSingleProdutoMoblinkFromApi(String(p.id))
      .then(updated => {
        if (isMounted && updated) {
          const sanitized = sanitizeProductForFirestore(updated as any) as Product;
          setDoc(doc(db, 'products', String(sanitized.id)), sanitized, { merge: true }).catch(() => {});
          setSelectedProduct(sanitized);
        }
      })
      .catch(err => console.warn('Sincronização automática do ERP:', err));

    // Carrega grades e opções de tamanho em segundo plano
    getProdutoGradesFromApi(p.id)
      .then(gradeResult => {
        if (isMounted) {
          setProductGradeData(gradeResult);
          setLoadingGrade(false);
        }
      })
      .catch(err => {
        console.warn('Erro ao carregar grades:', err);
        if (isMounted) setLoadingGrade(false);
      });

    if (hasGrade && idGrade) {
      getGradeProdutoById(idGrade)
        .then(grade => {
          if (isMounted) setFetchedGrade(grade);
        })
        .catch(() => {});
    }

    return () => { isMounted = false; };
  }, [p.id, idGrade, hasGrade]);

  const validVariacoes = productGradeData?.variacoes || [];

  const linhaOptions = (productGradeData?.tamanhos && productGradeData.tamanhos.length > 0)
    ? productGradeData.tamanhos
    : (p.sizes && p.sizes.length > 0)
    ? p.sizes.map(String)
    : [];

  const availableCoresForSelectedSize = selectedLinhaOption && validVariacoes.length > 0
    ? Array.from(new Set(validVariacoes.filter(v => v.tamanho === String(selectedLinhaOption)).map(v => v.cor)))
    : (productGradeData?.cores && productGradeData.cores.length > 0)
    ? productGradeData.cores
    : [p.color, p.material].filter((val, index, self): val is string => Boolean(val && self.indexOf(val) === index));

  const colunaOptions = availableCoresForSelectedSize;

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
      setMessage('Produto adicionado ao carrinho!');
    }

    setTimeout(() => {
      setMessage('');
      setCurrentView('cart');
    }, 1200);
  };

  const handleWhatsAppInstantBuy = () => {
    if (hasGrade) {
      const descrLinha = fetchedGrade?.descr_linha || 'Tamanho';
      const descrColuna = fetchedGrade?.descr_coluna || 'Cor';

      if (!selectedLinhaOption) {
        setMessage(`⚠️ Selecione o ${descrLinha} do calçado antes de prosseguir.`);
        return;
      }

      if (!selectedColunaOption) {
        setMessage(`⚠️ Selecione a ${descrColuna} antes de prosseguir.`);
        return;
      }
    } else if (p.sizes && p.sizes.length > 0 && !selectedLinhaOption) {
      setMessage(`⚠️ Selecione o Tamanho do calçado antes de prosseguir.`);
      return;
    }

    if (!currentUser) {
      setMessage('Por favor, faça login para realizar sua compra.');
      setTimeout(() => {
        setCurrentView('login');
      }, 1200);
      return;
    }

    if (isProfileIncomplete(currentUser)) {
      setIsProfileModalOpen(true);
      return;
    }

    setIsConfirmationModalOpen(true);
  };

  const handleConfirmOrder = async (
    paymentMethod: 'Pix' | 'Cartão de Crédito' | 'Crediário da Loja', 
    deliveryType: 'Entrega em Caxias-MA' | 'Entrega para Outras Cidades' | 'Retirada na Loja',
    installments?: number,
    sellerName?: string
  ) => {
    if (!currentUser) return;

    const descrLinha = fetchedGrade?.descr_linha || 'Tamanho';
    const descrColuna = fetchedGrade?.descr_coluna || 'Cor';
    const variationText = hasGrade 
      ? `${descrLinha}: ${selectedLinhaOption} | ${descrColuna}: ${selectedColunaOption}` 
      : (selectedLinhaOption ? `Tamanho: ${selectedLinhaOption}` : 'Único');

    const directItem = {
      product: p,
      selectedSize: variationText,
      quantity: 1
    };

    try {
      setIsProcessing(true);
      const order = await createOrder(currentUser.name, currentUser.email, {
        paymentMethod,
        deliveryType,
        installments,
        sellerName,
        customerPhone: currentUser.telefone || '',
        deliveryAddress: deliveryType === 'Retirada na Loja' 
          ? 'Retirada na Loja: Rua Afonso Pena, 295 - Centro, Caxias - MA'
          : `${currentUser.endereco || ''}, Nº ${currentUser.numero || ''} - ${currentUser.bairro || ''}`,
        overrideItems: [directItem]
      });

      setIsConfirmationModalOpen(false);
      window.open(order.whatsappUrl, '_blank');
    } catch (error) {
      console.error("Erro ao criar pedido:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShareProduct = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?product=${p.id}`;
    
    if (navigator.share) {
      navigator.share({
        title: `Evidência Calçados - ${p.name}`,
        text: `Confira esse lindo calçado: ${p.name}!`,
        url: shareUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const isFavorite = favorites.includes(p.id);
  const discountPercent = p.originalPrice && p.originalPrice > p.price
    ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
    : 0;

  const precoVistaCalculado = p.precoVista || p.preco_vista || Math.round(p.price * 0.9 * 100) / 100;
  const precoCartaoCalculado = p.precoCartao || p.preco_cartao || p.price;

  const relatedProducts = React.useMemo(() => {
    if (!products || products.length === 0 || !p) return [];
    const sameCategory = products.filter(prod => 
      String(prod.id) !== String(p.id) &&
      (prod.visible !== false) &&
      (prod.category === p.category || prod.nome_grupo === p.nome_grupo || prod.productType === p.productType)
    );

    if (sameCategory.length >= 4) {
      return sameCategory.slice(0, 4);
    }

    const others = products.filter(prod => String(prod.id) !== String(p.id) && prod.visible !== false);
    return others.slice(0, 4);
  }, [products, p]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      id="product-detail-page" 
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10"
    >
      {/* Botão de Retorno Estilo Apple */}
      <div className="flex items-center justify-between">
        <motion.button
          whileHover={{ x: -4 }}
          onClick={() => setCurrentView('home')}
          className={`inline-flex items-center space-x-2 text-xs font-semibold cursor-pointer transition-colors ${
            isDark ? 'text-[#86868b] hover:text-white' : 'text-[#515154] hover:text-black'
          }`}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar para a Vitrine</span>
        </motion.button>

        <div className={`text-xs font-normal ${isDark ? 'text-[#86868b]' : 'text-[#86868b]'}`}>
          Calçados &gt; <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{p.category}</span> &gt; <span className={`font-semibold ${isDark ? 'text-white' : 'text-[#1d1d1f]'}`}>{p.name}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
        
        {/* GALERIA STUDIO APPLE */}
        <div className="lg:col-span-7 space-y-4">
          <div className={`relative aspect-square rounded-3xl overflow-hidden border p-8 flex items-center justify-center transition-all ${
            isDark ? 'bg-[#161617] border-white/10' : 'bg-[#f5f5f7] border-black/5'
          }`}>
            <motion.img
              key={activeImageIndex}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              src={productImages[activeImageIndex]}
              alt={p.name}
              className="w-full h-full object-contain"
            />

            {discountPercent > 0 && (
              <span className="absolute top-4 left-4 bg-rose-600 text-white font-semibold text-xs px-3.5 py-1 rounded-full shadow-xs">
                -{discountPercent}% OFF
              </span>
            )}

            <button
              onClick={() => toggleFavorite(p.id)}
              className={`absolute top-4 right-4 p-3 rounded-full backdrop-blur-md transition-all cursor-pointer shadow-xs ${
                isFavorite
                  ? 'bg-rose-500 text-white scale-105'
                  : isDark ? 'bg-black/40 text-white/70 hover:text-rose-400' : 'bg-black/5 text-[#515154] hover:text-rose-600'
              }`}
              title={isFavorite ? 'Remover dos Favoritos' : 'Salvar nos Favoritos'}
            >
              <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Carrossel de Miniaturas Studio */}
          {productImages.length > 1 && (
            <div className="flex items-center space-x-3 overflow-x-auto pb-2">
              {productImages.map((imgUrl, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-20 h-20 rounded-2xl overflow-hidden border transition-all cursor-pointer shrink-0 p-2 ${
                    activeImageIndex === idx
                      ? 'border-[#0071e3] scale-105 shadow-xs bg-white dark:bg-[#1d1d1f]'
                      : isDark ? 'border-white/10 bg-[#161617] opacity-60 hover:opacity-100' : 'border-black/5 bg-[#f5f5f7] opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={imgUrl} alt={`${p.name} thumb ${idx}`} className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* INFORMAÇÕES RELEVANTES & OPÇÕES DE COMPRA */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className={`px-3.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase border ${
                isDark ? 'bg-white/10 text-white border-white/20' : 'bg-black/5 text-neutral-800 border-black/10'
              }`}>
                {p.category}
              </span>

              <button
                onClick={handleShareProduct}
                className={`p-2 rounded-full border transition-all cursor-pointer text-xs font-medium flex items-center space-x-1.5 ${
                  isDark ? 'border-white/10 bg-white/10 text-slate-300 hover:text-white' : 'border-black/10 bg-black/5 text-slate-700 hover:text-black'
                }`}
                title="Compartilhar"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
                <span>{copied ? 'Copiado' : 'Compartilhar'}</span>
              </button>
            </div>

            {/* Título Principal Estilo Apple */}
            <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-tight ${
              isDark ? 'text-white' : 'text-[#1d1d1f]'
            }`}>
              {p.name}
            </h1>

            {/* PAINEL DE PREÇOS LIMPO E RELEVANTE */}
            <div className={`p-6 rounded-3xl border space-y-4 transition-all ${
              isDark ? 'bg-[#161617] border-white/10' : 'bg-[#f5f5f7] border-black/5'
            }`}>
              {/* Preço À Vista no PIX (Com Desconto) */}
              <div>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 block pb-0.5">
                  À Vista no PIX (10% OFF)
                </span>
                <div className="flex items-baseline space-x-3">
                  <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                    R$ {precoVistaCalculado.toFixed(2).replace('.', ',')}
                  </p>
                  {p.originalPrice && p.originalPrice > p.price && (
                    <span className="text-sm line-through text-[#86868b]">
                      R$ {p.originalPrice.toFixed(2).replace('.', ',')}
                    </span>
                  )}
                </div>
              </div>

              {/* Cartão de Crédito e Parparcelamento */}
              <div className={`pt-3 border-t flex flex-col space-y-1 text-xs ${
                isDark ? 'border-white/10 text-slate-300' : 'border-black/10 text-[#515154]'
              }`}>
                <div className="flex items-center justify-between font-semibold">
                  <span className="flex items-center space-x-1.5">
                    <CreditCard className="h-4 w-4 text-[#0071e3]" />
                    <span>Cartão de Crédito:</span>
                  </span>
                  <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-[#1d1d1f]'}`}>
                    R$ {precoCartaoCalculado.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <p className="text-[11px] text-[#86868b] pl-5">
                  ou em até 6x de R$ {(precoCartaoCalculado / 6).toFixed(2).replace('.', ',')} sem juros
                </p>
              </div>

              {/* Crediário Próprio da Loja */}
              {p.crediarioProprio && (
                <div className={`pt-3 border-t flex flex-col space-y-1 text-xs ${
                  isDark ? 'border-white/10 text-slate-300' : 'border-black/10 text-[#515154]'
                }`}>
                  <div className="flex items-center justify-between font-semibold">
                    <span className="flex items-center space-x-1.5 text-amber-500">
                      <Sparkles className="h-4 w-4" />
                      <span>Crediário Próprio (Carnê):</span>
                    </span>
                    <span className="text-sm font-bold text-amber-500">
                      até 10x de R$ {(p.price / 10).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#86868b] pl-5">
                    Compre no carnê sem comprovação de renda!
                  </p>
                </div>
              )}
            </div>

            {/* Código de Referência */}
            {(p.referencia || p.referenceCode) && (
              <div className="text-xs text-[#86868b] font-normal pt-1">
                Ref: <span className="font-mono font-medium text-[#1d1d1f] dark:text-slate-200">{p.referencia || p.referenceCode}</span>
              </div>
            )}
          </div>

          {/* SELETOR DE TAMANHO & COR ESTILO APPLE */}
          <div className={`p-6 rounded-3xl border space-y-5 ${
            isDark ? 'bg-[#161617] border-white/10' : 'bg-[#f5f5f7] border-black/5'
          }`}>
            {/* Numeração / Tamanho */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <label className={`font-semibold text-xs tracking-tight ${
                  isDark ? 'text-white' : 'text-[#1d1d1f]'
                }`}>
                  Selecione o Tamanho:
                </label>
                {selectedLinhaOption && (
                  <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Tamanho {selectedLinhaOption}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {linhaOptions.map((sizeOpt) => {
                  const isSelected = selectedLinhaOption === sizeOpt;

                  return (
                    <motion.button
                      key={String(sizeOpt)}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setSelectedLinhaOption(sizeOpt)}
                      className={`h-11 rounded-2xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-center ${
                        isSelected
                          ? 'bg-[#0071e3] border-[#0071e3] text-white font-bold shadow-xs'
                          : isDark
                          ? 'border-white/10 text-slate-300 bg-[#1d1d1f] hover:border-white/20 hover:text-white'
                          : 'border-black/10 text-[#1d1d1f] bg-white hover:border-black/20'
                      }`}
                    >
                      <span>{sizeOpt}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Cor / Acabamento */}
            {colunaOptions.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center text-xs">
                  <label className={`font-semibold text-xs tracking-tight ${
                    isDark ? 'text-white' : 'text-[#1d1d1f]'
                  }`}>
                    Opção de Cor:
                  </label>
                  {selectedColunaOption && (
                    <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
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
                        className={`px-4 py-2 rounded-full border text-xs font-medium transition-all cursor-pointer flex items-center space-x-2 ${
                          isSelected
                            ? 'bg-[#0071e3] border-[#0071e3] text-white font-semibold'
                            : isDark
                            ? 'border-white/10 text-slate-300 bg-[#1d1d1f] hover:border-white/20'
                            : 'border-black/10 text-[#1d1d1f] bg-white hover:border-black/20'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-[#0071e3]'}`} />
                        <span>{colorOpt}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Descrição do Produto */}
          <div className="space-y-2">
            <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#86868b]' : 'text-[#86868b]'}`}>
              Detalhes & Especificações
            </h4>
            <div className={`text-xs sm:text-sm leading-relaxed whitespace-pre-line ${isDark ? 'text-slate-300' : 'text-[#515154]'}`}>
              {p.description || p.descricao || p.descricao_completa}
            </div>
          </div>

          {/* Mensagem de Alerta */}
          <AnimatePresence>
            {message && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`p-3.5 rounded-2xl text-xs font-semibold text-center ${
                  message.includes('sucesso') || message.includes('adicionado')
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                }`}
              >
                {message}
              </motion.div>
            )}
          </AnimatePresence>

          {/* BOTÕES DE AÇÃO APPLE (PÍLULA AZUL E BORDA CLEAN) */}
          <div className="space-y-3 pt-2">
            <button
              onClick={handleWhatsAppInstantBuy}
              className="w-full flex items-center justify-center space-x-2 py-3.5 px-6 bg-[#0071e3] hover:bg-[#0077ed] active:scale-98 text-white font-semibold text-sm rounded-full shadow-xs transition-all cursor-pointer"
            >
              <span>Comprar Agora</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>

            <button
              onClick={handleAddToCart}
              className={`w-full flex items-center justify-center space-x-2 py-3.5 px-6 rounded-full border font-semibold text-sm transition-all cursor-pointer ${
                isDark 
                  ? 'border-white/20 text-white bg-white/5 hover:bg-white/10' 
                  : 'border-black/15 text-[#1d1d1f] bg-black/5 hover:bg-black/10'
              }`}
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Adicionar ao Carrinho</span>
            </button>

            {p.crediarioProprio && (
              <button
                onClick={() => setCurrentView('meu-crediario')}
                className={`w-full py-2.5 px-4 text-center text-xs font-semibold transition-colors cursor-pointer ${
                  isDark ? 'text-amber-400 hover:underline' : 'text-amber-700 hover:underline'
                }`}
              >
                Simular aprovação de Crediário Próprio →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PAINEL DE BENEFÍCIOS DO PRODUTO ESTILO APPLE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
        <div className={`p-6 rounded-3xl border text-center flex flex-col items-center space-y-2.5 ${
          isDark ? 'bg-[#161617] border-white/10' : 'bg-[#f5f5f7] border-black/5'
        }`}>
          <div className="p-3 rounded-full bg-[#0071e3]/10 text-[#0071e3]">
            <Shield className="h-6 w-6" />
          </div>
          <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-[#1d1d1f]'}`}>Garantia de Qualidade</h4>
          <p className="text-xs text-[#86868b]">Materiais selecionados e acabamento com rigor de fábrica.</p>
        </div>

        <div className={`p-6 rounded-3xl border text-center flex flex-col items-center space-y-2.5 ${
          isDark ? 'bg-[#161617] border-white/10' : 'bg-[#f5f5f7] border-black/5'
        }`}>
          <div className="p-3 rounded-full bg-[#0071e3]/10 text-[#0071e3]">
            <Truck className="h-6 w-6" />
          </div>
          <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-[#1d1d1f]'}`}>Entrega Rápida e Segura</h4>
          <p className="text-xs text-[#86868b]">Opção de entrega direta ou retirada rápida na loja física.</p>
        </div>

        <div className={`p-6 rounded-3xl border text-center flex flex-col items-center space-y-2.5 ${
          isDark ? 'bg-[#161617] border-white/10' : 'bg-[#f5f5f7] border-black/5'
        }`}>
          <div className="p-3 rounded-full bg-[#0071e3]/10 text-[#0071e3]">
            <RefreshCw className="h-6 w-6" />
          </div>
          <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-[#1d1d1f]'}`}>Troca Simplificada em 30 Dias</h4>
          <p className="text-xs text-[#86868b]">Garantia de satisfação com processo de troca sem complicações.</p>
        </div>
      </div>

      {/* SEÇÃO DE PRODUTOS RELACIONADOS (APPLE STUDIO GRID) */}
      {relatedProducts.length > 0 && (
        <div className="pt-14 space-y-6 border-t border-black/5 dark:border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <h3 className={`text-xl sm:text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-[#1d1d1f]'}`}>
                Produtos que combinam com seu estilo
              </h3>
              <p className="text-xs text-[#86868b] pt-1">
                Explore outros modelos recomendados da coleção Evidência
              </p>
            </div>

            <button
              onClick={() => setCurrentView('home')}
              className="text-xs font-semibold text-[#0071e3] hover:underline cursor-pointer text-left sm:text-right"
            >
              Ver catálogo completo →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((relProduct) => (
              <ProductCard
                key={String(relProduct.id)}
                product={relProduct}
                theme={theme}
                isFavorite={favorites.includes(relProduct.id)}
                onToggleFavorite={toggleFavorite}
                onViewDetails={(prod) => {
                  setSelectedProduct(prod);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modal Etapa 1: Dados do Cliente */}
      <CompleteProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Modal Etapa 2: Confirmação de Pedido e Entrega */}
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
