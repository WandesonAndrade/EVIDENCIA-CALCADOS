import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ShoppingCart, ShoppingBag, MapPin, Star, ChevronRight, ArrowLeft, Shield, Sparkles, Heart, Share2, Check, CreditCard, CheckCircle2, AlertCircle, ArrowRight, Truck, RefreshCw, Package, MessageSquare, Search, Loader2, X, Tag } from 'lucide-react';
import { getGradeProdutoById, getProdutoGradesFromApi } from '../services/moblinkGradesService';
import { getSingleProdutoMoblinkFromApi, sanitizeProductForFirestore, mergeErpSyncWithExistingDbProduct, inferCategoryFromProductName } from '../services/moblinkProductsService';
import { normalizeCategoryName, normalizeSubcategoryName } from '../services/moblinkCategoriesService';
import { isSaldaoProduct, getSaldaoProductPrice } from '../services/saldaoService';
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
    theme,
    saldaoConfig
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

  // Estado da Modalidade de Entrega e Simulador de Frete / Cidade
  const [selectedDeliveryType, setSelectedDeliveryType] = useState<'Entrega em Caxias-MA' | 'Entrega para Outras Cidades' | 'Retirada na Loja'>('Entrega em Caxias-MA');
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [cityOrCepInput, setCityOrCepInput] = useState('');
  const [isCalculatingFreight, setIsCalculatingFreight] = useState(false);
  const [shippingInfo, setShippingInfo] = useState<{ city: string; uf?: string; barrio?: string; rua?: string; cep?: string; freightText?: string; option?: string } | null>(null);
  const [freightError, setFreightError] = useState('');

  const handleSetLocation = async (overrideValue?: string) => {
    const rawInput = (overrideValue !== undefined ? overrideValue : cityOrCepInput).trim();
    if (!rawInput) {
      setFreightError('Informe o nome da sua Cidade ou CEP.');
      return;
    }

    setFreightError('');
    const cleanCep = rawInput.replace(/\D/g, '');

    // Se o usuário digitou um CEP de 8 dígitos, faz a busca via API
    if (cleanCep.length === 8) {
      setIsCalculatingFreight(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();

        if (!data.erro) {
          const isCaxias = data.localidade?.toLowerCase().includes('caxias') && data.uf === 'MA';
          if (isCaxias) {
            setSelectedDeliveryType('Entrega em Caxias-MA');
            setShippingInfo({
              city: 'Caxias',
              uf: 'MA',
              barrio: data.bairro || 'Centro',
              rua: data.logradouro || '',
              cep: cleanCep,
              freightText: 'Frete GRÁTIS',
              option: 'Entrega em Caxias'
            });
          } else {
            setSelectedDeliveryType('Entrega para Outras Cidades');
            setShippingInfo({
              city: data.localidade || rawInput,
              uf: data.uf || '',
              barrio: data.bairro || '',
              rua: data.logradouro || '',
              cep: cleanCep,
              freightText: 'Frete a Combinar',
              option: 'Outras Cidades'
            });
          }
          setIsCalculatingFreight(false);
          return;
        }
      } catch {
        // Se falhar a busca por CEP, prossegue tratando como nome da cidade
      } finally {
        setIsCalculatingFreight(false);
      }
    }

    // Tratamento direto para Nome de Cidade digitado (ex: "São Luís", "Teresina", "Imperatriz")
    const isCaxiasName = rawInput.toLowerCase().includes('caxias');
    if (isCaxiasName) {
      setSelectedDeliveryType('Entrega em Caxias-MA');
      setShippingInfo({
        city: 'Caxias',
        uf: 'MA',
        freightText: 'Frete GRÁTIS',
        option: 'Entrega em Caxias'
      });
    } else {
      setSelectedDeliveryType('Entrega para Outras Cidades');
      setShippingInfo({
        city: rawInput,
        uf: '',
        freightText: 'Frete a Combinar',
        option: 'Outras Cidades'
      });
    }
  };

  const handleCityOrCepInputChange = (val: string) => {
    setCityOrCepInput(val);
    const clean = val.replace(/\D/g, '');
    if (clean.length === 8) {
      handleSetLocation(val);
    }
  };

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
      ? p.images.filter(Boolean) 
      : (p?.foto_uri ? [p.foto_uri] : []);
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

    // Atualização silenciosa e automática diretamente da API do ERP (Preço, Estoque, Grade e Visibilidade)
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
          if (gradeResult && gradeResult.tamanhos && gradeResult.tamanhos.length > 0) {
            const updatedWithGrades: any = {
              ...p,
              sizes: gradeResult.tamanhos,
              hasGrade: true,
            };
            const sanitized = sanitizeProductForFirestore(updatedWithGrades) as Product;
            setDoc(doc(db, 'products', String(sanitized.id)), sanitized, { merge: true }).catch(() => {});
            setSelectedProduct(updatedWithGrades as Product);
          }
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
    : ((p as any).tamanhos && Array.isArray((p as any).tamanhos) && (p as any).tamanhos.length > 0)
    ? (p as any).tamanhos.map(String)
    : ((p as any).variacoes && Array.isArray((p as any).variacoes) && (p as any).variacoes.length > 0)
    ? Array.from(new Set((p as any).variacoes.map((v: any) => String(v.tamanho || v.size || '').trim()).filter(Boolean)))
    : [];

  const colorMapKeys = [
    ...Object.keys(p?.colorImages || {}),
    ...Object.keys(p?.colorImageMap || {}),
  ].map(k => k.trim()).filter(Boolean);

  const fallbackCores = Array.from(new Set([
    ...colorMapKeys,
    p?.color,
    (p as any)?.cor,
    (p as any)?.cor_nome,
    p?.material,
  ])).filter((val): val is string => Boolean(val && typeof val === 'string' && val.trim() !== ''));

  const availableCoresForSelectedSize = (selectedLinhaOption && validVariacoes.length > 0)
    ? Array.from(new Set(validVariacoes.filter(v => v.tamanho === String(selectedLinhaOption)).map(v => v.cor).filter(Boolean)))
    : (productGradeData?.cores && productGradeData.cores.length > 0)
    ? productGradeData.cores
    : fallbackCores;

  const colunaOptions = availableCoresForSelectedSize.length > 0
    ? availableCoresForSelectedSize
    : fallbackCores;

  // 3. Auto-seleção inicial de Tamanho Único e Cor da Foto Capa
  useEffect(() => {
    // 3.1. Auto-seleção de Tamanho quando há apenas 1 tamanho disponível
    if (linhaOptions.length === 1 && !selectedLinhaOption) {
      setSelectedLinhaOption(String(linhaOptions[0]));
    }

    // 3.2. Auto-seleção de Cor inicial (priorizando a cor da foto capa ou a cor principal do produto)
    if (colunaOptions.length > 0) {
      if (!selectedColunaOption) {
        const coverPhoto = allProductImages[0];
        let initialColor: string | null = null;

        // Procura no colorImages qual cor contém a foto capa
        if (p?.colorImages && typeof p.colorImages === 'object') {
          const found = Object.keys(p.colorImages).find(cKey => {
            const imgs = p.colorImages?.[cKey];
            return Array.isArray(imgs) && imgs.some(img => img === coverPhoto || (typeof coverPhoto === 'string' && coverPhoto.includes(img)));
          });
          if (found) {
            const matchInOptions = colunaOptions.find(opt => opt.trim().toLowerCase() === found.trim().toLowerCase());
            if (matchInOptions) initialColor = matchInOptions;
          }
        }

        // Procura no colorImageMap se não achou no colorImages
        if (!initialColor && p?.colorImageMap && typeof p.colorImageMap === 'object') {
          const found = Object.keys(p.colorImageMap).find(cKey => {
            const img = p.colorImageMap?.[cKey];
            return img && (img === coverPhoto || (typeof coverPhoto === 'string' && coverPhoto.includes(img)));
          });
          if (found) {
            const matchInOptions = colunaOptions.find(opt => opt.trim().toLowerCase() === found.trim().toLowerCase());
            if (matchInOptions) initialColor = matchInOptions;
          }
        }

        // Procura pela cor definida no produto p.color / p.cor / p.cor_nome
        if (!initialColor) {
          const pColorName = String((p as any).cor || p.color || (p as any).cor_nome || '').trim();
          if (pColorName) {
            const matchInOptions = colunaOptions.find(opt => opt.trim().toLowerCase() === pColorName.toLowerCase());
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
      } else {
        // Se a cor selecionada atualmente não existir mais entre as opções válidas (ex: ao trocar de tamanho), reajusta para a 1ª válida
        const isCurrentStillValid = colunaOptions.some(opt => opt.trim().toLowerCase() === selectedColunaOption.trim().toLowerCase());
        if (!isCurrentStillValid) {
          setSelectedColunaOption(colunaOptions[0]);
        }
      }
    }
  }, [linhaOptions, colunaOptions, selectedLinhaOption, selectedColunaOption, allProductImages, p]);

  // Filtra as fotos da galeria estritamente para a cor selecionada
  const productImages = React.useMemo(() => {
    if (!selectedColunaOption) return allProductImages;

    const cleanColor = selectedColunaOption.trim().toLowerCase();

    // 1. Mapeamento de Múltiplas Fotos Por Cor (colorImages)
    if (p?.colorImages && typeof p.colorImages === 'object') {
      const matchedKey = Object.keys(p.colorImages).find(k => k.trim().toLowerCase() === cleanColor);
      if (matchedKey && Array.isArray(p.colorImages[matchedKey]) && p.colorImages[matchedKey].length > 0) {
        const colorSpecificPhotos = p.colorImages[matchedKey].filter(u => u && typeof u === 'string');
        if (colorSpecificPhotos.length > 0) return colorSpecificPhotos;
      }
    }

    // 2. Mapeamento de Foto Capa Por Cor (colorImageMap)
    if (p?.colorImageMap && typeof p.colorImageMap === 'object') {
      const matchedKey = Object.keys(p.colorImageMap).find(k => k.trim().toLowerCase() === cleanColor);
      if (matchedKey && p.colorImageMap[matchedKey]) {
        const coverUrl = p.colorImageMap[matchedKey];
        if (typeof coverUrl === 'string') return [coverUrl];
      }
    }

    // 3. Variações de foto do ERP MobLink (validVariacoes)
    if (validVariacoes && validVariacoes.length > 0) {
      const matchingVars = validVariacoes.filter(v => v.cor && v.cor.trim().toLowerCase() === cleanColor);
      const varPhotos = matchingVars
        .map(v => (v as any).foto_uri || (v as any).foto_url)
        .filter((u): u is string => Boolean(u && typeof u === 'string'));
      if (varPhotos.length > 0) {
        return Array.from(new Set(varPhotos));
      }
    }

    // 4. Filtragem inteligente por palavra-chave na URL/filename da imagem
    if (allProductImages.length > 1 && cleanColor) {
      const colorKeywordMatches = allProductImages.filter(imgUrl => {
        if (!imgUrl || typeof imgUrl !== 'string') return false;
        const lowerUrl = imgUrl.toLowerCase();
        return lowerUrl.includes(cleanColor) || 
               (cleanColor === 'preto' && (lowerUrl.includes('black') || lowerUrl.includes('pret'))) ||
               (cleanColor === 'rosa' && (lowerUrl.includes('pink') || lowerUrl.includes('ros')));
      });
      if (colorKeywordMatches.length > 0) {
        return colorKeywordMatches;
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
    sellerName?: string,
    customDeliveryAddress?: string
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
        deliveryAddress: customDeliveryAddress || (deliveryType === 'Retirada na Loja' 
          ? 'Retirada na Loja: Rua Afonso Pena, 295 - Centro, Caxias - MA'
          : `${currentUser.endereco || ''}, Nº ${currentUser.numero || ''} - ${currentUser.bairro || ''}`),
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

  // Integração com Saldão de Calçados
  const saldaoCalc = getSaldaoProductPrice(p, saldaoConfig);

  const discountPercent = saldaoCalc.isSaldao
    ? saldaoCalc.discountPercent
    : (p.originalPrice && p.originalPrice > p.price
      ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
      : 0);

  // Regras de Preços por Modalidade (Respeita o valor do Saldão se ativo):
  const precoCrediarioCalculado = saldaoCalc.isSaldao
    ? saldaoCalc.price
    : ((p as any).precoCrediario || (p as any).preco_crediario || p.price);

  const precoVistaVal = (p as any).precoVista ?? (p as any).preco_vista ?? (p as any).precoAvista ?? (p as any).priceCash ?? (p as any).pricePix;
  const precoVistaCalculado = saldaoCalc.isSaldao
    ? saldaoCalc.price
    : ((typeof precoVistaVal === 'number' && precoVistaVal > 0)
      ? precoVistaVal
      : (p.price > 0 ? Math.round(p.price * 0.9 * 100) / 100 : p.price));

  const precoCartaoVal = (p as any).precoCartao ?? (p as any).preco_cartao ?? (p as any).priceCard;
  const precoCartaoCalculado = saldaoCalc.isSaldao
    ? saldaoCalc.price
    : ((typeof precoCartaoVal === 'number' && precoCartaoVal > 0)
      ? precoCartaoVal
      : (p.price > 0 ? Math.round(p.price * 0.9 * 100) / 100 : p.price));

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

        {(() => {
          const rawCategory = p.category || (p as any).categoria || (p as any).nome_grupo;
          const breadcrumbCategory = rawCategory && String(rawCategory).toUpperCase() !== 'GERAL' 
            ? normalizeCategoryName(rawCategory) 
            : (inferCategoryFromProductName(p.name || '').category || 'Calçados');

          const rawSub = p.subcategory || (p as any).subcategoria || p.nome_subgrupo;
          const inferredSub = inferCategoryFromProductName(p.name || '').subcategory;
          
          let breadcrumbSubcategory = rawSub && rawSub.trim() !== '' && rawSub.toLowerCase() !== breadcrumbCategory.toLowerCase()
            ? normalizeSubcategoryName(rawSub)
            : (inferredSub && inferredSub.toLowerCase() !== breadcrumbCategory.toLowerCase() ? inferredSub : '');

          if (!breadcrumbSubcategory || breadcrumbSubcategory.toLowerCase() === breadcrumbCategory.toLowerCase()) {
            breadcrumbSubcategory = 'Feminino';
          }

          return (
            <div className={`hidden sm:block text-xs font-normal ${isDark ? 'text-[#86868b]' : 'text-[#86868b]'}`}>
              <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{breadcrumbCategory}</span> &gt; <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{breadcrumbSubcategory}</span> &gt; <span className={`font-semibold ${isDark ? 'text-white' : 'text-[#1d1d1f]'}`}>{p.name}</span>
            </div>
          );
        })()}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        
        {/* ESQUERDA: CARD PRINCIPAL DO PRODUTO (COMPACTO COM ALTURA LIMITADA) */}
        <div className={`lg:col-span-7 p-4 sm:p-6 rounded-3xl border space-y-4 shadow-md backdrop-blur-md ${
          isDark ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white border-blue-900/10 text-[#003B73]'
        }`}>
          {/* Cabeçalho do Produto: Categoria + Avaliação + Título */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase border ${
                isDark ? 'bg-blue-900/30 text-blue-200 border-blue-800' : 'bg-[#DDF1FF] text-[#003B73] border-[#006EDB]/20'
              }`}>
                {(p.category && p.category.toUpperCase() !== 'GERAL')
                  ? normalizeCategoryName(p.category)
                  : (inferCategoryFromProductName(p.name || '').category || 'Calçados')}
              </span>

              {/* Avaliação Estilo Magalu (⭐ 5.0 (novo)) */}
              <div className="flex items-center space-x-1 text-xs font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/30">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="font-extrabold text-slate-800 dark:text-slate-200">5.0</span>
                <span className="text-[#52708F] text-[11px]">(novo)</span>
              </div>
            </div>

            <h1 className={`text-xl sm:text-2xl lg:text-3xl font-black tracking-tight leading-snug ${
              isDark ? 'text-white' : 'text-[#003B73]'
            }`}>
              {p.name}
            </h1>

            {/* Código de Referência e Vendedor */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#52708F]">
              {(p.referencia || p.referenceCode) && (
                <span>Ref: <strong className="font-mono text-[#003B73] dark:text-slate-200 font-black">{p.referencia || p.referenceCode}</strong></span>
              )}
              <span>•</span>
              <span>Vendido e entregue por <strong className="text-[#006EDB] font-extrabold">Evidência Calçados</strong></span>
            </div>
          </div>

          {/* GALERIA DE FOTOS COM ALTURA FIXA E PROPORCIONAL (ENCAIXA NA TELA SEM SCROLL) */}
          <div className="relative space-y-2">
            <div className={`relative h-[260px] sm:h-[320px] lg:h-[340px] rounded-2xl overflow-hidden border p-4 flex items-center justify-center transition-all ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-[#EEF8FF] border-blue-900/10'
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
                <span className="absolute top-3 left-3 bg-rose-600 text-white font-extrabold text-[11px] px-3 py-1 rounded-full shadow-md">
                  -{discountPercent}% OFF
                </span>
              )}

              {/* Botão Flutuante FAVORITO Topo-Direito */}
              <button
                onClick={() => toggleFavorite(p.id)}
                className={`absolute top-3 right-3 p-2.5 rounded-full backdrop-blur-md transition-all cursor-pointer shadow-md ${
                  isFavorite
                    ? 'bg-rose-500 text-white scale-105'
                    : isDark ? 'bg-black/50 text-white/80 hover:text-rose-400' : 'bg-white text-[#003B73] hover:bg-[#DDF1FF]'
                }`}
                title={isFavorite ? 'Remover dos Favoritos' : 'Salvar nos Favoritos'}
              >
                <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
              </button>

              {/* Botão Flutuante COMPARTILHAR Canto-Inferior-Direito */}
              <button
                onClick={handleShareProduct}
                className={`absolute bottom-3 right-3 p-2.5 rounded-full backdrop-blur-md transition-all cursor-pointer shadow-md ${
                  isDark ? 'bg-black/50 text-white/80 hover:text-white' : 'bg-white text-[#003B73] hover:bg-[#DDF1FF]'
                }`}
                title="Compartilhar"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
              </button>

              {/* Paginação em Pontos (Dots) */}
              {productImages.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center space-x-1.5 bg-black/20 dark:bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full">
                  {productImages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        activeImageIndex === idx ? 'w-4 bg-[#006EDB]' : 'w-1.5 bg-white/60 hover:bg-white'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Carrossel de Miniaturas de Fotos (Compacto) */}
            {productImages.length > 1 && (
              <div className="flex items-center space-x-2.5 overflow-x-auto pb-1">
                {productImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 p-1 bg-white dark:bg-slate-900 ${
                      activeImageIndex === idx
                        ? 'border-[#006EDB] scale-105 shadow-md ring-2 ring-[#006EDB]/20'
                        : isDark ? 'border-slate-800 opacity-60 hover:opacity-100' : 'border-blue-900/10 opacity-70 hover:opacity-100'
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
            <div className="space-y-2 pt-3 border-t border-blue-900/10 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className={`font-extrabold ${isDark ? 'text-white' : 'text-[#003B73]'}`}>
                  Cor selecionada: <span className="font-black text-[#006EDB]">{selectedColunaOption || 'Selecione a cor'}</span>
                </span>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {colunaOptions.map((colorOpt) => {
                  const isSelected = selectedColunaOption === colorOpt;
                  const cleanOpt = colorOpt.trim().toLowerCase();

                  let colorPhotosList: string[] = [];
                  if (p?.colorImages && typeof p.colorImages === 'object') {
                    const matchedKey = Object.keys(p.colorImages).find(k => k.trim().toLowerCase() === cleanOpt);
                    if (matchedKey && Array.isArray(p.colorImages[matchedKey])) {
                      colorPhotosList = p.colorImages[matchedKey];
                    }
                  }

                  let colorPhoto = colorPhotosList.length > 0 ? colorPhotosList[0] : null;
                  if (!colorPhoto && p?.colorImageMap && typeof p.colorImageMap === 'object') {
                    const matchedKey = Object.keys(p.colorImageMap).find(k => k.trim().toLowerCase() === cleanOpt);
                    if (matchedKey && p.colorImageMap[matchedKey]) {
                      colorPhoto = p.colorImageMap[matchedKey];
                    }
                  }
                  if (!colorPhoto && validVariacoes.length > 0) {
                    const matchedVar = validVariacoes.find(v => v.cor && v.cor.trim().toLowerCase() === cleanOpt && ((v as any).foto_uri || (v as any).foto_url));
                    if (matchedVar) {
                      colorPhoto = (matchedVar as any).foto_uri || (matchedVar as any).foto_url;
                    }
                  }
                  if (!colorPhoto && allProductImages.length > 0) {
                    colorPhoto = allProductImages.find(u => u && typeof u === 'string' && u.toLowerCase().includes(cleanOpt)) || allProductImages[0];
                  }

                  const keywordMatchesCount = allProductImages.filter(imgUrl => {
                    if (!imgUrl || typeof imgUrl !== 'string') return false;
                    const lowerUrl = imgUrl.toLowerCase();
                    return lowerUrl.includes(cleanOpt) || 
                           (cleanOpt === 'preto' && (lowerUrl.includes('black') || lowerUrl.includes('pret'))) ||
                           (cleanOpt === 'rosa' && (lowerUrl.includes('pink') || lowerUrl.includes('ros')));
                  }).length;

                  const photoCount = colorPhotosList.length > 0
                    ? colorPhotosList.length
                    : (keywordMatchesCount > 0 ? keywordMatchesCount : (colorPhoto ? 1 : 0));

                  return (
                    <motion.button
                      key={colorOpt}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => handleSelectColorOption(colorOpt)}
                      className={`relative group rounded-xl border-2 p-1 transition-all cursor-pointer flex flex-col items-center justify-center bg-white dark:bg-slate-900 ${
                        isSelected
                          ? 'border-[#006EDB] ring-4 ring-[#DDF1FF] shadow-sm'
                          : isDark ? 'border-slate-800 hover:border-slate-700' : 'border-blue-900/10 hover:border-blue-900/30'
                      }`}
                      title={`Selecionar cor ${colorOpt}`}
                    >
                      {photoCount > 1 && (
                        <span className="absolute -top-1 -right-1 bg-[#006EDB] text-white text-[8px] font-black px-1.5 py-0.2 rounded-full shadow-xs z-10">
                          {photoCount}
                        </span>
                      )}
                      <div className="w-11 h-13 sm:w-13 sm:h-15 rounded-lg overflow-hidden flex items-center justify-center bg-[#EEF8FF] dark:bg-slate-800">
                        {colorPhoto ? (
                          <img src={colorPhoto} alt={colorOpt} className="w-full h-full object-contain p-0.5" />
                        ) : (
                          <span className="w-4 h-4 rounded-full bg-[#006EDB]" />
                        )}
                      </div>
                      <span className={`text-[10px] font-extrabold mt-1 px-0.5 truncate max-w-[58px] ${
                        isSelected ? 'text-[#006EDB]' : isDark ? 'text-slate-300' : 'text-[#003B73]'
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
          <div className="space-y-2 pt-3 border-t border-blue-900/10 dark:border-slate-800">
            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-[#006EDB]">
              Detalhes & Especificações do Modelo
            </h4>
            <div className={`text-xs leading-relaxed whitespace-pre-line font-medium ${isDark ? 'text-slate-300' : 'text-[#52708F]'}`}>
              {p.description || p.descricao || p.descricao_completa}
            </div>
          </div>
        </div>

        {/* DIREITA: PAINEL FIXO COMPACTO DE PREÇO, REGIONALIZAÇÃO E COMPRA (VISIBLE ABOVE THE FOLD) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">

          {/* CARD UNIFICADO DE COMPRA & PREÇO (ENCAIXA PERFEITAMENTE NA TELA) */}
          <div className={`p-5 sm:p-6 rounded-3xl border space-y-5 shadow-md backdrop-blur-md ${
            isDark ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white border-blue-900/10 text-[#003B73]'
          }`}>
            {/* Banner Destacado do Saldão de Calçados */}
            {saldaoCalc.isSaldao && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-500/15 via-amber-500/15 to-rose-500/15 border border-rose-500/30 text-rose-500 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Tag className="h-5 w-5 text-rose-500 shrink-0" />
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider text-rose-500">
                      🔥 SALDÃO DE CALÇADOS - {saldaoCalc.discountPercent}% OFF
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      Estoque baixo (últimas unidades). Aproveite!
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-rose-500 text-white font-black text-[10px] uppercase">
                  -{saldaoCalc.discountPercent}%
                </span>
              </div>
            )}

            {/* PAINEL DE PREÇO */}
            <div className="space-y-2.5">
              <div className="flex items-baseline space-x-2 flex-wrap">
                <span className="text-3xl sm:text-4xl lg:text-4xl font-black tracking-tight text-[#003B73] dark:text-white">
                  R$ {precoVistaCalculado.toFixed(2).replace('.', ',')}
                </span>
                {saldaoCalc.isSaldao ? (
                  <span className="text-[11px] font-extrabold text-white bg-rose-500 px-2.5 py-1 rounded-full shadow-xs">
                    Saldão ({saldaoCalc.discountPercent}% OFF)
                  </span>
                ) : precoVistaCalculado < p.price ? (
                  <span className="text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-200">
                    À Vista (Pix / 10% OFF)
                  </span>
                ) : (
                  <span className="text-[11px] font-extrabold text-[#003B73] dark:text-slate-300 bg-[#DDF1FF] dark:bg-slate-800 px-2.5 py-1 rounded-full border border-[#006EDB]/20">
                    Preço de Tabela
                  </span>
                )}
              </div>

              {(saldaoCalc.isSaldao || (p.originalPrice && p.originalPrice > p.price)) && (
                <div className="text-xs line-through text-[#52708F]">
                  De: R$ {saldaoCalc.originalPrice.toFixed(2).replace('.', ',')}
                </div>
              )}

              {/* Tabela Resumo de Pagamento */}
              <div className="text-xs space-y-1.5 text-[#52708F] dark:text-slate-400 border-t pt-2.5 border-blue-900/10 dark:border-slate-800">
                <div>
                  • <strong>Cartão de Crédito:</strong> <span className="font-bold text-[#003B73] dark:text-slate-200">R$ {precoCartaoCalculado.toFixed(2).replace('.', ',')}</span> (em até 10x sem juros)
                </div>
                <div>
                  • <strong>Crediário da Loja:</strong> <span className="font-bold text-[#003B73] dark:text-slate-200">R$ {precoCrediarioCalculado.toFixed(2).replace('.', ',')}</span> (em até 6x sem juros no Carnê)
                </div>
              </div>
            </div>

            {/* CAIXA DE REGIONALIZAÇÃO E ENTREGA COM DESIGN ELEGANTE & BADGE DESTACADO */}
            <div 
              onClick={() => setIsDeliveryModalOpen(true)}
              className={`p-4 rounded-2xl border text-xs space-y-2 transition-all cursor-pointer group shadow-2xs ${
                selectedDeliveryType === 'Entrega para Outras Cidades'
                  ? 'bg-emerald-50/70 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-500/30'
                  : selectedDeliveryType === 'Retirada na Loja'
                  ? 'bg-sky-50/70 border-sky-300 dark:bg-sky-950/20 dark:border-sky-500/30'
                  : 'bg-[#EEF8FF] border-blue-900/10 dark:bg-slate-950 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 font-extrabold text-[#003B73] dark:text-slate-100">
                  <MapPin className="h-4 w-4 shrink-0 text-[#006EDB]" />
                  <span className="text-xs">
                    {selectedDeliveryType === 'Retirada na Loja'
                      ? 'Retirada na Loja Física (Caxias - MA)'
                      : selectedDeliveryType === 'Entrega para Outras Cidades'
                      ? (shippingInfo?.city 
                          ? `Envio para ${shippingInfo.city}${shippingInfo.uf ? ` / ${shippingInfo.uf}` : ''}` 
                          : 'Outras Cidades (Envio Nacional)')
                      : 'Entrega na Zona Urbana de Caxias - MA'}
                  </span>
                </div>
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIsDeliveryModalOpen(true); }}
                  className="text-[11px] font-black text-[#006EDB] hover:underline cursor-pointer"
                >
                  Alterar
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] font-semibold pt-1 border-t border-blue-900/10 dark:border-slate-800">
                {selectedDeliveryType === 'Retirada na Loja' ? (
                  <>
                    <span className="text-[#52708F] dark:text-slate-300 flex items-center gap-1.5 truncate">
                      <MapPin className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                      Retire no Centro (Rua Afonso Pena, 295)
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full font-extrabold text-sky-800 bg-sky-100 dark:bg-sky-950 dark:text-sky-300 shrink-0 ml-2">
                      Frete GRÁTIS
                    </span>
                  </>
                ) : selectedDeliveryType === 'Entrega para Outras Cidades' ? (
                  <>
                    <span className="text-[#52708F] dark:text-slate-300 flex items-center gap-1.5 truncate">
                      <Package className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      {shippingInfo?.city ? `Envio para ${shippingInfo.city}` : 'Envio para todo o Brasil'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full font-extrabold text-emerald-800 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 shrink-0 ml-2">
                      Frete a Combinar
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[#52708F] dark:text-slate-300 flex items-center gap-1.5 truncate">
                      <Truck className="h-3.5 w-3.5 text-[#006EDB] shrink-0" />
                      Receba em Caxias/MA
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full font-extrabold text-emerald-800 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 shrink-0 ml-2">
                      Frete GRÁTIS
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* SELETOR DE TAMANHOS */}
            <div className="space-y-2.5 pt-1 border-t border-blue-900/10 dark:border-slate-800">
              <div className="flex justify-between items-center text-xs">
                <label className={`font-extrabold ${isDark ? 'text-white' : 'text-[#003B73]'}`}>
                  Selecione a Numeração / Tamanho:
                </label>
                {selectedLinhaOption && (
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 font-extrabold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Tamanho {selectedLinhaOption}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {linhaOptions.map((sizeOpt) => {
                  const isSelected = selectedLinhaOption === sizeOpt;

                  return (
                    <motion.button
                      key={String(sizeOpt)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedLinhaOption(sizeOpt)}
                      className={`h-10 rounded-xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
                        isSelected
                          ? 'bg-[#003B73] border-[#003B73] text-white shadow-md'
                          : isDark
                          ? 'border-slate-800 text-slate-300 bg-slate-950 hover:border-slate-700'
                          : 'border-blue-900/15 text-[#003B73] bg-white hover:bg-[#EEF8FF]'
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
                  className={`p-3 rounded-2xl text-xs font-extrabold text-center ${
                    message.includes('sucesso') || message.includes('adicionado')
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {message}
                </motion.div>
              )}
            </AnimatePresence>

            {/* BOTÕES DE AÇÃO DESTACADOS E COMPACTOS (ESTILO PÍLULA APPLE) */}
            <div className="space-y-2.5 pt-2">
              <button
                onClick={handleAddToCart}
                className="w-full flex items-center justify-center space-x-2 py-3.5 px-6 bg-[#006EDB] hover:bg-[#00509E] active:scale-98 text-white font-black text-xs uppercase tracking-wider rounded-full shadow-md transition-all cursor-pointer"
              >
                <ShoppingBag className="h-4 w-4 stroke-[2.5]" />
                <span>Adicionar à Sacola</span>
              </button>

              <button
                onClick={handleWhatsAppInstantBuy}
                className="w-full flex items-center justify-center space-x-2 py-3.5 px-6 bg-[#003B73] hover:bg-[#00509E] active:scale-98 text-white font-black text-xs uppercase tracking-wider rounded-full shadow-md transition-all cursor-pointer"
              >
                <span>Comprar Agora no WhatsApp</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>

              {p.crediarioProprio && (
                <button
                  onClick={() => setCurrentView('meu-crediario')}
                  className="w-full py-2 px-3 text-center text-[11px] font-extrabold text-[#006EDB] hover:underline cursor-pointer block"
                >
                  Simular Crediário Próprio em até 6x no Carnê →
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
          <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-[#1d1d1f]'}`}>Troca Simplificada em 15 Dias</h4>
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

      {/* MODAL DE SELEÇÃO DE MODALIDADE DE ENTREGA & CÁLCULO DE FRETE (Inspiração Foto 2) */}
      <AnimatePresence>
        {isDeliveryModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`max-w-lg w-full rounded-3xl border p-6 space-y-5 shadow-2xl relative ${
                isDark ? 'bg-[#161617] border-white/10 text-white' : 'bg-white border-black/10 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-white/10">
                <div className="flex items-center space-x-2 font-extrabold text-sm">
                  <Truck className="h-5 w-5 text-[#0071e3]" />
                  <span>1. ESCOLHA A MODALIDADE DE ENTREGA</span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDeliveryModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* GRID DE 3 OPÇÕES (IDÊNTICO À FOTO 2) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Opção 1: Entrega Caxias */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDeliveryType('Entrega em Caxias-MA');
                  }}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    selectedDeliveryType === 'Entrega em Caxias-MA'
                      ? 'border-2 border-amber-500 bg-amber-500/10 shadow-xs'
                      : isDark ? 'border-white/10 bg-[#1d1d1f] hover:border-white/20' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-extrabold text-xs flex items-center space-x-1.5">
                      <Truck className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>Entrega Caxias</span>
                    </span>
                    {selectedDeliveryType === 'Entrega em Caxias-MA' && (
                      <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug font-medium mt-1">
                    Endereço urbano em Caxias - MA.
                  </p>
                  <div className="mt-3 pt-2 border-t border-slate-200 dark:border-white/10 text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                    Frete GRÁTIS
                  </div>
                </button>

                {/* Opção 2: Outras Cidades */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDeliveryType('Entrega para Outras Cidades');
                  }}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    selectedDeliveryType === 'Entrega para Outras Cidades'
                      ? 'border-2 border-emerald-500 bg-emerald-500/10 shadow-xs'
                      : isDark ? 'border-white/10 bg-[#1d1d1f] hover:border-white/20' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-extrabold text-xs flex items-center space-x-1.5">
                      <MessageSquare className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>Outras Cidades</span>
                    </span>
                    {selectedDeliveryType === 'Entrega para Outras Cidades' && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug font-medium mt-1">
                    Envio para todo Brasil.
                  </p>
                  <div className="mt-3 pt-2 border-t border-slate-200 dark:border-white/10 text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                    Frete a Combinar
                  </div>
                </button>

                {/* Opção 3: Retirada Loja */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDeliveryType('Retirada na Loja');
                  }}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    selectedDeliveryType === 'Retirada na Loja'
                      ? 'border-2 border-sky-500 bg-sky-500/10 shadow-xs'
                      : isDark ? 'border-white/10 bg-[#1d1d1f] hover:border-white/20' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-extrabold text-xs flex items-center space-x-1.5">
                      <MapPin className="h-4 w-4 text-sky-500 shrink-0" />
                      <span>Retirada Loja</span>
                    </span>
                    {selectedDeliveryType === 'Retirada na Loja' && (
                      <CheckCircle2 className="h-4 w-4 text-sky-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug font-medium mt-1">
                    Retire no Centro.
                  </p>
                  <div className="mt-3 pt-2 border-t border-slate-200 dark:border-white/10 text-[11px] font-black text-sky-600 dark:text-sky-400">
                    Frete GRÁTIS
                  </div>
                </button>
              </div>

              {/* CAMPO DE CIDADE OU CEP PARA "OUTRAS CIDADES" */}
              {selectedDeliveryType === 'Entrega para Outras Cidades' && (
                <div className={`p-4 rounded-2xl border space-y-3 ${
                  isDark ? 'bg-slate-900/90 border-white/10' : 'bg-slate-50 border-slate-200'
                }`}>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    Informe sua Cidade ou CEP para entrega:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ex: São Luís - MA, Teresina, 65000-000..."
                      value={cityOrCepInput}
                      onChange={(e) => handleCityOrCepInputChange(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSetLocation(); }}
                      className={`flex-1 px-3.5 py-2.5 rounded-xl text-xs border font-medium focus:outline-none transition-all ${
                        isDark ? 'bg-[#161617] border-white/20 text-white focus:border-[#0071e3]' : 'bg-white border-slate-300 text-slate-900 focus:border-[#0071e3]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => handleSetLocation()}
                      disabled={isCalculatingFreight}
                      className="px-4 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 shrink-0 shadow-xs"
                    >
                      {isCalculatingFreight ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Search className="h-3.5 w-3.5" />
                          <span>Definir</span>
                        </>
                      )}
                    </button>
                  </div>

                  {freightError && (
                    <p className="text-[11px] font-bold text-rose-500">{freightError}</p>
                  )}

                  {/* RESULTADO CLARO E AMIGÁVEL DO FRETE A COMBINAR */}
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-2">
                    <div className="flex items-center justify-between font-black text-emerald-600 dark:text-emerald-400">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>Destino: {shippingInfo?.city ? `${shippingInfo.city}${shippingInfo.uf ? `/${shippingInfo.uf}` : ''}` : 'Outras Cidades (Nacional)'}</span>
                      </span>
                      <span className="text-[10px] font-black uppercase bg-emerald-600 text-white px-2 py-0.5 rounded-md">
                        Frete a Combinar
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px] text-slate-700 dark:text-slate-300 pt-1.5 border-t border-emerald-500/20 leading-relaxed font-medium">
                      <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-300 font-bold">
                        <MessageSquare className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span>Atendimento direto via WhatsApp</span>
                      </div>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400 pt-0.5">
                        O valor exato do frete e a melhor transportadora (Correios/PAC/SEDEX) serão definidos com nosso atendimento logo após a confirmação do seu pedido.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* BOTÃO DE CONFIRMAR MODALIDADE */}
              <button
                type="button"
                onClick={() => setIsDeliveryModalOpen(false)}
                className="w-full py-3.5 px-4 bg-[#00a650] hover:bg-[#009146] text-white font-extrabold text-xs rounded-2xl shadow-sm transition-all cursor-pointer text-center"
              >
                Confirmar Modalidade de Entrega
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
        precoVista={precoVistaCalculado}
        precoCartao={precoCartaoCalculado}
        precoCrediario={precoCrediarioCalculado}
        cartItemsCount={1}
        initialDeliveryType={selectedDeliveryType}
        initialCityName={shippingInfo?.city || cityOrCepInput.trim()}
        initialAddressData={shippingInfo ? {
          cep: shippingInfo.cep,
          rua: shippingInfo.rua,
          bairro: shippingInfo.barrio,
          cidade: shippingInfo.city,
          uf: shippingInfo.uf
        } : undefined}
        onConfirmOrder={handleConfirmOrder}
        isProcessing={isProcessing}
      />
    </motion.div>
  );
};
