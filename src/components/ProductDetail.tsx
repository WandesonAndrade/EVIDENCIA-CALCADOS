import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ShoppingCart, ShoppingBag, MapPin, Star, ChevronRight, ArrowLeft, Shield, Sparkles, Heart, Share2, Check, CreditCard, CheckCircle2, AlertCircle, ArrowRight, Truck, RefreshCw } from 'lucide-react';
import { getGradeProdutoById, getProdutoGradesFromApi } from '../services/moblinkGradesService';
import { getSingleProdutoMoblinkFromApi, sanitizeProductForFirestore, mergeErpSyncWithExistingDbProduct } from '../services/moblinkProductsService';
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
  const allProductImages = React.useMemo(() => {
    return (p?.images && p.images.length > 0)
      ? p.images 
      : [p?.foto_uri || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=600&auto=format&fit=crop'];
  }, [p]);

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

    // Atualização silenciosa e automática diretamente da API do ERP (preservando fotos, nome comercial e descrição rica)
    getSingleProdutoMoblinkFromApi(String(p.id))
      .then(updated => {
        if (isMounted && updated) {
          const merged = mergeErpSyncWithExistingDbProduct(p, updated) as Product;
          const sanitized = sanitizeProductForFirestore(merged) as Product;
          setDoc(doc(db, 'products', String(sanitized.id)), sanitized, { merge: true }).catch(() => {});
          setSelectedProduct(merged);
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

  // 3. Auto-seleção inicial de Tamanho Único e Cor da Foto Capa
  useEffect(() => {
    // 3.1. Auto-seleção de Tamanho quando há apenas 1 tamanho disponível
    if (linhaOptions.length === 1 && !selectedLinhaOption) {
      setSelectedLinhaOption(String(linhaOptions[0]));
    }

    // 3.2. Auto-seleção de Cor inicial da foto capa quando nenhuma cor foi selecionada ainda
    if (colunaOptions.length > 0 && !selectedColunaOption) {
      const coverPhoto = allProductImages[0];
      let initialColor: string | null = null;

      // Procura qual cor tem a foto capa no colorImages
      if (p?.colorImages) {
        const found = Object.keys(p.colorImages).find(cKey => 
          Array.isArray(p.colorImages?.[cKey]) && p.colorImages[cKey].includes(coverPhoto)
        );
        if (found) {
          const matchInOptions = colunaOptions.find(opt => opt.trim().toLowerCase() === found.trim().toLowerCase());
          if (matchInOptions) initialColor = matchInOptions;
        }
      }

      // Procura no colorImageMap se não achou no colorImages
      if (!initialColor && p?.colorImageMap) {
        const found = Object.keys(p.colorImageMap).find(cKey => p.colorImageMap?.[cKey] === coverPhoto);
        if (found) {
          const matchInOptions = colunaOptions.find(opt => opt.trim().toLowerCase() === found.trim().toLowerCase());
          if (matchInOptions) initialColor = matchInOptions;
        }
      }

      // Se ainda não achou, pega a 1ª opção de cor disponível
      if (!initialColor && colunaOptions.length > 0) {
        initialColor = colunaOptions[0];
      }

      if (initialColor) {
        setSelectedColunaOption(initialColor);
      }
    }
  }, [linhaOptions, colunaOptions, selectedLinhaOption, selectedColunaOption, allProductImages, p]);

  // Filtra as fotos da galeria estritamente para a cor selecionada
  const productImages = React.useMemo(() => {
    if (!selectedColunaOption) return allProductImages;

    const cleanColor = selectedColunaOption.trim().toLowerCase();

    // 1. Mapeamento de Múltiplas Fotos Por Cor (colorImages)
    if (p?.colorImages) {
      const matchedKey = Object.keys(p.colorImages).find(k => k.trim().toLowerCase() === cleanColor);
      if (matchedKey && Array.isArray(p.colorImages[matchedKey]) && p.colorImages[matchedKey].length > 0) {
        const colorSpecificPhotos = p.colorImages[matchedKey].filter(u => u && allProductImages.includes(u));
        if (colorSpecificPhotos.length > 0) return colorSpecificPhotos;
      }
    }

    // 2. Mapeamento de Foto Capa Por Cor (colorImageMap)
    if (p?.colorImageMap) {
      const matchedKey = Object.keys(p.colorImageMap).find(k => k.trim().toLowerCase() === cleanColor);
      if (matchedKey && p.colorImageMap[matchedKey]) {
        const coverUrl = p.colorImageMap[matchedKey];
        if (allProductImages.includes(coverUrl)) return [coverUrl];
      }
    }

    // 3. Variações de foto do ERP MobLink
    if (validVariacoes && validVariacoes.length > 0) {
      const matchingVar = validVariacoes.find(v => v.cor && v.cor.trim().toLowerCase() === cleanColor && ((v as any).foto_uri || (v as any).foto_url));
      if (matchingVar) {
        const varUri = (matchingVar as any).foto_uri || (matchingVar as any).foto_url;
        if (varUri && allProductImages.includes(varUri)) return [varUri];
      }
    }

    return allProductImages;
  }, [selectedColunaOption, p, allProductImages, validVariacoes]);

  // Reseta a visualização da foto para a 1ª foto ao trocar de cor
  useEffect(() => {
    setActiveImageIndex(0);
  }, [selectedColunaOption]);

  const handleSelectColorOption = (colorOpt: string) => {
    setSelectedColunaOption(colorOpt);
    setActiveImageIndex(0);
  };

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
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-5 space-y-4"
    >
      {/* Botão de Retorno e Navegação Clean */}
      <div className="flex items-center justify-between text-xs py-1">
        <motion.button
          whileHover={{ x: -3 }}
          onClick={() => setCurrentView('home')}
          className={`inline-flex items-center space-x-1.5 font-semibold cursor-pointer transition-colors ${
            isDark ? 'text-[#86868b] hover:text-white' : 'text-[#515154] hover:text-black'
          }`}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Voltar para a Vitrine</span>
        </motion.button>

        <div className={`hidden sm:block text-xs font-normal ${isDark ? 'text-[#86868b]' : 'text-[#86868b]'}`}>
          Calçados &gt; <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{p.category}</span> &gt; <span className={`font-semibold ${isDark ? 'text-white' : 'text-[#1d1d1f]'}`}>{p.name}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        
        {/* ESQUERDA: CARD PRINCIPAL DO PRODUTO (COMPACTO COM ALTURA LIMITADA) */}
        <div className={`lg:col-span-7 p-4 sm:p-5 rounded-2xl border space-y-4 shadow-xs ${
          isDark ? 'bg-[#161617] border-white/10' : 'bg-white border-black/5'
        }`}>
          {/* Cabeçalho do Produto: Categoria + Avaliação + Título */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border ${
                isDark ? 'bg-white/10 text-white border-white/20' : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                {p.category}
              </span>

              {/* Avaliação Estilo Magalu (⭐ 5.0 (novo)) */}
              <div className="flex items-center space-x-1 text-xs font-medium text-amber-500">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="font-bold text-slate-800 dark:text-slate-200">5.0</span>
                <span className="text-[#86868b] text-[11px]">(novo)</span>
              </div>
            </div>

            <h1 className={`text-lg sm:text-xl lg:text-2xl font-extrabold tracking-tight leading-snug ${
              isDark ? 'text-white' : 'text-[#1d1d1f]'
            }`}>
              {p.name}
            </h1>

            {/* Código de Referência e Vendedor */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#86868b]">
              {(p.referencia || p.referenceCode) && (
                <span>Ref: <strong className="font-mono text-slate-700 dark:text-slate-300">{p.referencia || p.referenceCode}</strong></span>
              )}
              <span>•</span>
              <span>Vendido por <strong className="text-[#0071e3]">Evidência Calçados</strong></span>
            </div>
          </div>

          {/* GALERIA DE FOTOS COM ALTURA FIXA E PROPORCIONAL (ENCAIXA NA TELA SEM SCROLL) */}
          <div className="relative space-y-2">
            <div className={`relative h-[260px] sm:h-[320px] lg:h-[340px] rounded-xl overflow-hidden border p-4 flex items-center justify-center transition-all ${
              isDark ? 'bg-[#1d1d1f] border-white/10' : 'bg-[#f8f8fa] border-black/5'
            }`}>
              <motion.img
                key={activeImageIndex}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                src={productImages[activeImageIndex]}
                alt={p.name}
                className="max-h-full max-w-full object-contain"
              />

              {/* Desconto Badge */}
              {discountPercent > 0 && (
                <span className="absolute top-2.5 left-2.5 bg-rose-600 text-white font-extrabold text-[11px] px-2.5 py-0.5 rounded-full shadow-xs">
                  -{discountPercent}% OFF
                </span>
              )}

              {/* Botão Flutuante FAVORITO Topo-Direito */}
              <button
                onClick={() => toggleFavorite(p.id)}
                className={`absolute top-2.5 right-2.5 p-2.5 rounded-full backdrop-blur-md transition-all cursor-pointer shadow-xs ${
                  isFavorite
                    ? 'bg-rose-500 text-white scale-105'
                    : isDark ? 'bg-black/50 text-white/80 hover:text-rose-400' : 'bg-white/90 text-sky-600 hover:bg-white shadow-sm'
                }`}
                title={isFavorite ? 'Remover dos Favoritos' : 'Salvar nos Favoritos'}
              >
                <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
              </button>

              {/* Botão Flutuante COMPARTILHAR Canto-Inferior-Direito */}
              <button
                onClick={handleShareProduct}
                className={`absolute bottom-2.5 right-2.5 p-2.5 rounded-full backdrop-blur-md transition-all cursor-pointer shadow-xs ${
                  isDark ? 'bg-black/50 text-white/80 hover:text-white' : 'bg-white/90 text-sky-600 hover:bg-white shadow-sm'
                }`}
                title="Compartilhar"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4" />}
              </button>

              {/* Paginação em Pontos (Dots) */}
              {productImages.length > 1 && (
                <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center space-x-1 bg-black/20 dark:bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full">
                  {productImages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        activeImageIndex === idx ? 'w-4 bg-[#0071e3]' : 'w-1.5 bg-white/60 hover:bg-white'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Carrossel de Miniaturas de Fotos (Compacto) */}
            {productImages.length > 1 && (
              <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                {productImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shrink-0 p-0.5 bg-white dark:bg-[#1d1d1f] ${
                      activeImageIndex === idx
                        ? 'border-[#0071e3] scale-105 shadow-xs'
                        : isDark ? 'border-white/10 opacity-60 hover:opacity-100' : 'border-slate-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={imgUrl} alt={`${p.name} thumb ${idx}`} className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* SELETOR DE CORES COM MOSTRUÁRIO DE FOTOS (SWATCHES COMPACTOS) */}
          {colunaOptions.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/10">
              <div className="flex items-center justify-between text-xs">
                <span className={`font-bold ${isDark ? 'text-white' : 'text-[#1d1d1f]'}`}>
                  Cor: <span className="font-semibold text-[#0071e3]">{selectedColunaOption || 'Selecione a cor'}</span>
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {colunaOptions.map((colorOpt) => {
                  const isSelected = selectedColunaOption === colorOpt;
                  const colorPhotosList = p?.colorImages?.[colorOpt] || p?.colorImages?.[colorOpt.toUpperCase()] || [];
                  const colorPhoto = colorPhotosList.length > 0 
                    ? colorPhotosList[0] 
                    : (p?.colorImageMap?.[colorOpt] || p?.colorImageMap?.[colorOpt.toUpperCase()]);
                  const photoCount = colorPhotosList.length;

                  return (
                    <motion.button
                      key={colorOpt}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => handleSelectColorOption(colorOpt)}
                      className={`relative group rounded-lg border-2 p-0.5 transition-all cursor-pointer flex flex-col items-center justify-center bg-white dark:bg-[#1d1d1f] ${
                        isSelected
                          ? 'border-[#0071e3] ring-2 ring-[#0071e3]/20 shadow-xs'
                          : isDark ? 'border-white/10 hover:border-white/30' : 'border-slate-200 hover:border-slate-400'
                      }`}
                      title={`Selecionar cor ${colorOpt}`}
                    >
                      {photoCount > 1 && (
                        <span className="absolute -top-1 -right-1 bg-[#0071e3] text-white text-[8px] font-black px-1 py-0.2 rounded-full shadow-xs z-10">
                          {photoCount}
                        </span>
                      )}
                      <div className="w-10 h-12 sm:w-12 sm:h-14 rounded-md overflow-hidden flex items-center justify-center bg-slate-50 dark:bg-slate-800">
                        {colorPhoto ? (
                          <img src={colorPhoto} alt={colorOpt} className="w-full h-full object-contain" />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full bg-[#0071e3]" />
                        )}
                      </div>
                      <span className={`text-[9px] font-bold mt-0.5 px-0.5 truncate max-w-[54px] ${
                        isSelected ? 'text-[#0071e3]' : isDark ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        {colorOpt}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Descrição Detalhada & Especificações */}
          <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-white/10">
            <h4 className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Detalhes & Especificações
            </h4>
            <div className={`text-xs leading-relaxed whitespace-pre-line ${isDark ? 'text-slate-300' : 'text-[#515154]'}`}>
              {p.description || p.descricao || p.descricao_completa}
            </div>
          </div>
        </div>

        {/* DIREITA: PAINEL FIXO COMPACTO DE PREÇO, REGIONALIZAÇÃO E COMPRA (VISIBLE ABOVE THE FOLD) */}
        <div className="lg:col-span-5 space-y-3.5 lg:sticky lg:top-20">

          {/* CARD UNIFICADO DE COMPRA & PREÇO (ENCAIXA PERFEITAMENTE NA TELA) */}
          <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 shadow-xs ${
            isDark ? 'bg-[#161617] border-white/10' : 'bg-white border-black/5'
          }`}>
            {/* PAINEL DE PREÇO */}
            <div className="space-y-1.5">
              <div className="flex items-baseline space-x-2 flex-wrap">
                <span className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                  R$ {precoVistaCalculado.toFixed(2).replace('.', ',')}
                </span>
                <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md">
                  no Pix (10% OFF)
                </span>
              </div>

              {p.originalPrice && p.originalPrice > p.price && (
                <div className="text-xs line-through text-[#86868b]">
                  De: R$ {p.originalPrice.toFixed(2).replace('.', ',')}
                </div>
              )}

              <p className="text-xs text-[#86868b]">
                ou <strong className="text-slate-800 dark:text-slate-200">R$ {precoCartaoCalculado.toFixed(2).replace('.', ',')}</strong> em <strong>6x de R$ {(precoCartaoCalculado / 6).toFixed(2).replace('.', ',')}</strong> sem juros
              </p>
            </div>

            {/* CAIXA DE REGIONALIZAÇÃO E ENTREGA EM CAXIAS/MA */}
            <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
              isDark ? 'bg-[#1d1d1f] border-white/10' : 'bg-slate-50 border-slate-200/80'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 font-bold text-slate-800 dark:text-slate-200">
                  <MapPin className="h-3.5 w-3.5 text-[#0071e3]" />
                  <span>Região de <strong>Caxias / MA</strong></span>
                </div>
                <button 
                  type="button"
                  onClick={() => setMessage('Entrega garantida para Caxias-MA e região!')}
                  className="text-[11px] font-bold text-[#0071e3] hover:underline cursor-pointer"
                >
                  Alterar
                </button>
              </div>

              <div className="flex items-center space-x-2 text-[11px] text-slate-700 dark:text-slate-300 font-medium pt-0.5">
                <Truck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Receba em Caxias/MA • <strong className="text-emerald-600 dark:text-emerald-400">Retirada Grátis na Loja</strong></span>
              </div>
            </div>

            {/* SELETOR DE TAMANHOS */}
            <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-white/10">
              <div className="flex justify-between items-center text-xs">
                <label className={`font-bold ${isDark ? 'text-white' : 'text-[#1d1d1f]'}`}>
                  Selecione o Tamanho:
                </label>
                {selectedLinhaOption && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Tamanho {selectedLinhaOption}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                {linhaOptions.map((sizeOpt) => {
                  const isSelected = selectedLinhaOption === sizeOpt;

                  return (
                    <motion.button
                      key={String(sizeOpt)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedLinhaOption(sizeOpt)}
                      className={`h-9 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                        isSelected
                          ? 'bg-[#0071e3] border-[#0071e3] text-white shadow-xs'
                          : isDark
                          ? 'border-white/10 text-slate-300 bg-[#1d1d1f] hover:border-white/20'
                          : 'border-slate-200 text-[#1d1d1f] bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <span>{sizeOpt}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* MENSAGENS DE ALERTA */}
            <AnimatePresence>
              {message && (
                <motion.div 
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`p-2.5 rounded-xl text-xs font-bold text-center ${
                    message.includes('sucesso') || message.includes('adicionado')
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {message}
                </motion.div>
              )}
            </AnimatePresence>

            {/* BOTÕES DE AÇÃO DESTACADOS E COMPACTOS (VISÍVEIS NA PRIMEIRA TELA DENTRO DO FOLD) */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleAddToCart}
                className="w-full flex items-center justify-center space-x-2 py-3.5 px-5 bg-[#00a650] hover:bg-[#009146] active:scale-98 text-white font-extrabold text-sm rounded-xl shadow-sm transition-all cursor-pointer"
              >
                <ShoppingBag className="h-4 w-4 stroke-[2.5]" />
                <span>Adicionar à sacola</span>
              </button>

              <button
                onClick={handleWhatsAppInstantBuy}
                className={`w-full flex items-center justify-center space-x-2 py-2.5 px-5 rounded-xl border-2 font-bold text-xs transition-all cursor-pointer ${
                  isDark 
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20' 
                    : 'border-[#00a650] text-[#00a650] bg-emerald-50 hover:bg-emerald-100'
                }`}
              >
                <span>Comprar agora</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>

              {p.crediarioProprio && (
                <button
                  onClick={() => setCurrentView('meu-crediario')}
                  className={`w-full py-1.5 px-3 text-center text-[11px] font-bold transition-colors cursor-pointer ${
                    isDark ? 'text-amber-400 hover:underline' : 'text-amber-700 hover:underline'
                  }`}
                >
                  Simular aprovação de Crediário Próprio (Carnê) →
                </button>
              )}
            </div>
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
