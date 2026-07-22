import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Trash2, MessageSquare, ArrowRight, ArrowLeft, ShoppingBag, CreditCard, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../types';

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

  const [isProcessing, setIsProcessing] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any | null>(null);

  const isDark = theme === 'dark';
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const handleFinalize = async () => {
    if (!currentUser) {
      setCurrentView('orders');
      return;
    }

    try {
      setIsProcessing(true);
      const order = await createOrder(currentUser.name, currentUser.email);
      setCreatedOrder(order);
      window.open(order.whatsappUrl, '_blank');
    } catch (error) {
      console.error("Failed to finalize order:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const recommendedProducts = products
    .filter((p) => p.visible && !cart.some((c) => c.product.id === p.id))
    .slice(0, 4);

  const handleRecommendClick = (p: Product) => {
    setSelectedProduct(p);
    setCurrentView('product-detail');
  };

  if (createdOrder) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-8 sm:p-10 rounded-3xl border backdrop-blur-xl text-center space-y-6 shadow-2xl ${
            isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white/80 border-slate-200/80'
          }`}
        >
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto shadow-md">
            <MessageSquare className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h2 className={`text-2xl font-black ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Pedido Enviado com Sucesso!
            </h2>
            <p className="text-xs font-mono text-emerald-500 font-bold">Código: {createdOrder.id}</p>
            <p className={`text-xs sm:text-sm font-medium max-w-sm mx-auto ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Seu pedido foi registrado em nosso catálogo. Uma janela do WhatsApp foi aberta para você finalizar o atendimento com nossos consultores.
            </p>
          </div>

          <div className={`p-4 rounded-2xl border max-w-sm mx-auto text-left space-y-2 text-xs font-medium ${
            isDark ? 'bg-slate-950/60 border-slate-800/80 text-slate-300' : 'bg-slate-50 border-slate-200/80 text-slate-700'
          }`}>
            <p className="font-bold border-b pb-1 text-slate-900 dark:text-slate-100">Resumo do Pedido:</p>
            <p>Cliente: <strong className="font-bold">{createdOrder.customerName}</strong></p>
            <p>Total: <strong className="font-bold text-amber-400">R$ {createdOrder.total.toFixed(2).replace('.', ',')}</strong></p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setCreatedOrder(null);
                setCurrentView('orders');
              }}
              className={`px-6 py-3 font-bold text-xs rounded-xl shadow-md cursor-pointer ${
                isDark ? 'bg-amber-400 text-slate-950 hover:bg-amber-300' : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              Ver Meus Pedidos
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setCreatedOrder(null);
                setCurrentView('home');
              }}
              className={`px-6 py-3 font-bold text-xs rounded-xl border backdrop-blur-md cursor-pointer ${
                isDark ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Continuar Comprando
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      id="cart-page" 
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8"
    >
      <div className="flex items-center space-x-3">
        <div className={`p-2.5 rounded-2xl border ${
          isDark ? 'bg-amber-400/10 border-amber-400/20 text-amber-400' : 'bg-slate-900 text-white'
        }`}>
          <ShoppingBag className="h-6 w-6" />
        </div>
        <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
          Seu Carrinho de Compras
        </h1>
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
                      src={item.product?.images?.[0] || item.product?.foto_uri || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=600&auto=format&fit=crop'} 
                      alt={item.product.name} 
                      className={`w-20 h-20 object-cover rounded-xl border shadow-sm ${
                        isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'
                      }`}
                    />

                    {/* Name & Selected Size/Variation */}
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

          {/* Order Summary Box */}
          <div className={`border rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl h-fit space-y-6 ${
            isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white/80 border-slate-200/80'
          }`}>
            <h3 className={`text-sm font-black uppercase tracking-wider border-b pb-4 ${
              isDark ? 'text-slate-100 border-slate-800' : 'text-slate-900 border-slate-200'
            }`}>
              Resumo da Compra
            </h3>
            
            <div className={`space-y-3 text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              <div className="flex justify-between">
                <span>Subtotal ({cart.length} itens)</span>
                <span className={isDark ? 'text-slate-200' : 'text-slate-900'}>
                  R$ {subtotal.toFixed(2).replace('.', ',')}
                </span>
              </div>

              <div className="flex justify-between items-center text-emerald-500">
                <span>Frete</span>
                <span className="font-extrabold text-[10px] uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  GRÁTIS
                </span>
              </div>

              <div className={`flex justify-between text-base font-black border-t pt-4 ${
                isDark ? 'text-amber-400 border-slate-800' : 'text-slate-900 border-slate-200'
              }`}>
                <span>Total</span>
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
                Parcele no carnê da loja ou cartão. Nossa equipe confirmará seus dados no WhatsApp!
              </p>
            </div>

            {/* Finalize Button */}
            <div className="space-y-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleFinalize}
                disabled={isProcessing}
                className="w-full flex items-center justify-center space-x-2 py-4 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                <MessageSquare className="h-5 w-5" />
                <span>
                  {currentUser ? 'FINALIZAR NO WHATSAPP' : 'ENTRAR PARA FINALIZAR'}
                </span>
              </motion.button>
              
              <p className={`text-[10px] text-center font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {currentUser 
                  ? 'Você será direcionado para o atendimento oficial no WhatsApp.'
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
                    src={p.images?.[0] || p.foto_uri || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=600&auto=format&fit=crop'} 
                    alt={p.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                  />
                </div>
                <div className="space-y-1">
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${isDark ? 'text-amber-400' : 'text-slate-500'}`}>{p.category}</span>
                  <h4 className={`text-xs font-bold line-clamp-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{p.name}</h4>
                  <p className={`text-sm font-black ${isDark ? 'text-amber-400' : 'text-slate-900'}`}>R$ {p.price.toFixed(2).replace('.', ',')}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};
