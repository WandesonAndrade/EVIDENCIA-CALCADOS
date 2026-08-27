import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Trash2, MessageSquare, ArrowLeft, ShoppingBag, CreditCard, 
  Zap, ShieldCheck, MapPin, Truck, CheckCircle2, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../types';
import { CompleteProfileModal } from './CompleteProfileModal';
import { normalizeCategoryName } from '../services/moblinkCategoriesService';
import { hasProductValidPhoto } from '../services/moblinkProductsService';
import { isProfileIncomplete } from '../App';

export const Cart: React.FC = () => {
  const { 
    cart, 
    updateCartQuantity, 
    removeFromCart, 
    currentUser, 
    createOrder, 
    setCurrentView,
    products,
    setSelectedProduct,
    theme
  } = useApp();

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const isDark = theme === 'dark';
  
  // Freight calculation rules for Caxias - MA
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const isFreeFreight = subtotal > 100;
  const remainingForFreeFreight = Math.max(0, 100.01 - subtotal);

  const handleStartCheckout = () => {
    if (!currentUser) {
      setCurrentView('login');
      return;
    }

    if (isProfileIncomplete(currentUser)) {
      setIsProfileModalOpen(true);
      return;
    }

    setCurrentView('checkout');
  };

  const recommendedProducts = products
    .filter((p) => p.visible && (p.stock !== undefined ? p.stock > 0 : (p.saldo_loja ?? 0) > 0) && hasProductValidPhoto(p) && !cart.some((c) => c.product.id === p.id))
    .slice(0, 4);

  const handleRecommendClick = (p: Product) => {
    setSelectedProduct(p);
    setCurrentView('product-detail');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      id="cart-page" 
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8"
    >
      {/* Cabeçalho Padronizado do Carrinho */}
      <div className={`flex items-center space-x-3.5 border-b pb-6 ${
        isDark ? 'border-slate-800' : 'border-blue-900/15'
      }`}>
        <div className="w-12 h-12 rounded-2xl bg-[#003B73] text-white flex items-center justify-center shadow-md">
          <ShoppingBag className="h-6 w-6" />
        </div>
        <div>
          <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-[#003B73]'}`}>
            Seu Carrinho de Compras
          </h1>
          <p className={`text-xs flex items-center space-x-1.5 font-extrabold mt-0.5 ${isDark ? 'text-sky-400' : 'text-[#006EDB]'}`}>
            <MapPin className="h-3.5 w-3.5" />
            <span>Entrega em Caxias - MA ou Retirada na Loja Evidência</span>
          </p>
        </div>
      </div>

      {cart.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`text-center py-16 border rounded-3xl p-8 max-w-md mx-auto space-y-5 backdrop-blur-xl shadow-xl ${
            isDark ? 'bg-slate-900/50 border-slate-800/80 text-slate-300' : 'bg-white/80 border-slate-200/80 text-slate-700'
          }`}
        >
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto bg-slate-500/10 text-slate-400">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-bold">Seu carrinho está vazio</p>
            <p className="text-xs text-slate-400">Escolha calçados e acessórios incríveis na nossa vitrine para continuar.</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setCurrentView('home')}
            className={`inline-flex items-center space-x-2 px-6 py-3 text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer ${
              isDark ? 'bg-amber-400 text-slate-950 hover:bg-amber-300' : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Ir para a Loja</span>
          </motion.button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Cart Items List */}
          <div className="lg:col-span-2 space-y-4">
            {/* Free freight incentive banner */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold ${
              isFreeFreight
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : isDark ? 'bg-slate-900/80 border-slate-800 text-slate-300' : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <div className="flex items-center space-x-2.5">
                <Truck className={`h-5 w-5 ${isFreeFreight ? 'text-emerald-400' : 'text-amber-500'}`} />
                <div>
                  {isFreeFreight ? (
                    <span className="font-extrabold">Parabéns! Você tem direito a FRETE GRÁTIS para Caxias (MA)! 🎉</span>
                  ) : (
                    <span>
                      Faltam apenas <strong className="text-amber-400">R$ {remainingForFreeFreight.toFixed(2).replace('.', ',')}</strong> para garantir <strong>Frete Grátis</strong> na entrega!
                    </span>
                  )}
                </div>
              </div>
              {isFreeFreight && (
                <span className="bg-emerald-500 text-slate-950 font-black px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider">
                  Grátis
                </span>
              )}
            </div>

            <AnimatePresence>
              {cart.map((item) => (
                <motion.div 
                  key={`${item.product.id}-${item.selectedSize}`}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`flex items-center justify-between border p-5 rounded-2xl backdrop-blur-xl shadow-md transition-all ${
                    isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white/80 border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    {/* Image */}
                    <img 
                      src={item.product?.images?.[0] || item.product?.foto_uri || ''} 
                      alt={item.product.name} 
                      className={`w-20 h-20 object-cover rounded-xl border shadow-sm ${
                        isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'
                      }`}
                    />

                    {/* Name & Selected Size */}
                    <div className="space-y-1">
                      <h3 className={`text-xs sm:text-sm font-bold line-clamp-1 ${
                        isDark ? 'text-slate-100' : 'text-slate-900'
                      }`}>
                        {item.product.name}
                      </h3>
                      
                      <p className={`text-[11px] font-semibold uppercase tracking-wider ${
                        isDark ? 'text-amber-400/90' : 'text-slate-500'
                      }`}>
                        {item.selectedSize !== 0 && item.selectedSize !== '0' 
                          ? `Opção: ${item.selectedSize}` 
                          : 'Produto Único'}
                      </p>
                      
                      {/* Quantity Modifiers */}
                      <div className="flex items-center space-x-2 pt-1.5">
                        <button
                          onClick={() => updateCartQuantity(item.product.id, item.selectedSize, item.quantity - 1)}
                          className={`w-7 h-7 border rounded-lg flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                            isDark
                              ? 'border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          -
                        </button>
                        <span className={`text-xs font-black w-6 text-center ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQuantity(item.product.id, item.selectedSize, item.quantity + 1)}
                          className={`w-7 h-7 border rounded-lg flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                            isDark
                              ? 'border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Price & Delete Action */}
                  <div className="text-right space-y-3">
                    <p className={`text-base font-black ${isDark ? 'text-amber-400' : 'text-slate-900'}`}>
                      R$ {(item.product.price * item.quantity).toFixed(2).replace('.', ',')}
                    </p>
                    <motion.button
                      whileTap={{ scale: 0.8 }}
                      onClick={() => removeFromCart(item.product.id, item.selectedSize)}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        isDark
                          ? 'border-slate-800 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10'
                          : 'border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                      }`}
                      title="Remover item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <motion.button
              whileHover={{ x: -4 }}
              onClick={() => setCurrentView('home')}
              className={`inline-flex items-center space-x-2 text-xs font-bold transition-all cursor-pointer ${
                isDark ? 'text-amber-400 hover:text-amber-300' : 'text-slate-900 hover:text-slate-700'
              }`}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Continuar Comprando</span>
            </motion.button>
          </div>

          {/* Order Summary & Finalize Trigger Box */}
          <div className={`border rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl h-fit space-y-6 ${
            isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white/80 border-slate-200/80'
          }`}>
            <h3 className={`text-sm font-black uppercase tracking-wider border-b pb-4 ${
              isDark ? 'text-slate-100 border-slate-800' : 'text-slate-900 border-slate-200'
            }`}>
              Resumo do Pedido
            </h3>
            
            {/* Totals Breakdown */}
            <div className={`space-y-3 text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              <div className="flex justify-between">
                <span>Subtotal ({cart.length} itens)</span>
                <span className={isDark ? 'text-slate-200' : 'text-slate-900'}>
                  R$ {subtotal.toFixed(2).replace('.', ',')}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span>Estimativa de Frete</span>
                <span className="text-[11px] font-bold text-amber-400">
                  Calculado na confirmação
                </span>
              </div>

              <div className={`flex justify-between text-base font-black border-t pt-4 ${
                isDark ? 'text-amber-400 border-slate-800' : 'text-slate-900 border-slate-200'
              }`}>
                <span>Subtotal dos Produtos</span>
                <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            {/* Crediário Próprio Accent */}
            <div className={`p-4 rounded-2xl text-xs space-y-1.5 border backdrop-blur-md ${
              isDark
                ? 'bg-amber-400/10 border-amber-400/20 text-amber-300'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <p className="font-bold flex items-center space-x-2">
                <CreditCard className="h-4 w-4 text-amber-500" />
                <span>Crediário Próprio Evidência</span>
              </p>
              <p className="text-[11px] font-medium leading-relaxed opacity-90">
                Parcele em até 6x sem juros! Você escolherá a entrega e número de parcelas na próxima etapa.
              </p>
            </div>

            {/* Finalize Checkout Trigger Button */}
            <div className="space-y-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStartCheckout}
                disabled={false}
                className="w-full flex items-center justify-center space-x-2 py-4 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer uppercase tracking-wider"
              >
                <MessageSquare className="h-5 w-5" />
                <span>
                  {currentUser ? 'FINALIZAR PEDIDO' : 'ENTRAR PARA FINALIZAR'}
                </span>
              </motion.button>
              
              <p className={`text-[10px] text-center font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {currentUser 
                  ? 'Você confirmará os dados de entrega e pagamento na próxima tela.'
                  : '* É necessário estar conectado para registrar o pedido no catálogo.'}
              </p>
            </div>
          </div>

        </div>
      )}

      {/* Recommended Items Carousel */}
      {recommendedProducts.length > 0 && (
        <div className={`pt-10 border-t space-y-6 ${isDark ? 'border-slate-800/80' : 'border-slate-200/80'}`}>
          <div className="flex justify-between items-center">
            <h3 className={`text-lg font-black tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Você também pode gostar
            </h3>
            <button 
              onClick={() => setCurrentView('home')} 
              className={`text-xs font-bold cursor-pointer ${isDark ? 'text-amber-400 hover:text-amber-300' : 'text-slate-900 hover:underline'}`}
            >
              Ver todos
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {recommendedProducts.map((p) => (
              <motion.div 
                key={p.id}
                whileHover={{ y: -4 }}
                onClick={() => handleRecommendClick(p)}
                className={`group border rounded-2xl p-4 cursor-pointer backdrop-blur-xl transition-all flex flex-col justify-between ${
                  isDark
                    ? 'bg-slate-900/40 border-slate-800/80 hover:border-amber-400/30'
                    : 'bg-white/80 border-slate-200/80 hover:shadow-lg'
                }`}
              >
                <div className={`aspect-square rounded-xl overflow-hidden mb-3 border ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <img 
                    src={p.images?.[0] || p.foto_uri || ''} 
                    alt={p.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                  />
                </div>
                <div className="space-y-1">
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${isDark ? 'text-amber-400' : 'text-slate-500'}`}>{normalizeCategoryName(p.category)}</span>
                  <h4 className={`text-xs font-bold line-clamp-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{p.name}</h4>
                  <p className={`text-sm font-black ${isDark ? 'text-amber-400' : 'text-slate-900'}`}>R$ {p.price.toFixed(2).replace('.', ',')}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Step 1 Profile Completion Modal */}
      <CompleteProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </motion.div>
  );
};
