/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ProductList } from './components/ProductList';
import { ProductDetail } from './components/ProductDetail';
import { Cart } from './components/Cart';
import { OrderHistory } from './components/OrderHistory';
import { AdminPanel } from './components/AdminPanel';
import { AuthScreen } from './components/AuthScreen';
import { Footer } from './components/Footer';
import { PortfolioCase } from './components/PortfolioCase';
import { CategoryPage } from './components/CategoryPage';
import { CompleteProfileModal } from './components/CompleteProfileModal';
import { AboutUs } from './components/AboutUs';
import { SupportPage } from './components/SupportPage';
import { FavoritesList } from './components/FavoritesList';

const isProfileIncomplete = (user: any) => {
  if (!user) return false;
  if (user.role !== 'customer') return false; // Administrative users don't need personal credit info
  return (
    !user.rg || 
    !user.cpf || 
    !user.nomeMae || 
    !user.dataNascimento || 
    !user.naturalidade || 
    !user.telefone ||
    !user.cep ||
    !user.endereco ||
    !user.numero ||
    !user.bairro ||
    !user.cidade ||
    !user.uf
  );
};

const AppContent: React.FC = () => {
  const { currentView, currentUser, theme, homeSections } = useApp();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const heroSection = homeSections?.find(s => s.id === 'hero');

  React.useEffect(() => {
    const handleOpen = () => setIsProfileModalOpen(true);
    window.addEventListener('open-profile-modal', handleOpen);
    return () => window.removeEventListener('open-profile-modal', handleOpen);
  }, []);

  React.useEffect(() => {
    if (['product-detail', 'cart', 'orders', 'about', 'support', 'favorites', 'admin'].includes(currentView)) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [currentView]);

  const renderActiveView = () => {
    switch (currentView) {
      case 'cart':
        return <Cart />;
      case 'product-detail':
        return <ProductDetail />;
      case 'category-page':
        return <CategoryPage />;
      case 'orders':
        return <OrderHistory />;
      case 'portfolio-case':
        return <PortfolioCase />;
      case 'about':
        return <AboutUs />;
      case 'support':
        return <SupportPage />;
      case 'favorites':
        return <FavoritesList />;
      case 'admin':
        // Protect administrative route
        if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'seller')) {
          return <AuthScreen />;
        }
        return <AdminPanel />;
      default:
        return (
          <>
            {heroSection?.enabled !== false && <Hero />}
            <ProductList />
          </>
        );
    }
  };

  const showIncompleteWarning = isProfileIncomplete(currentUser);
  const isAdminView = currentView === 'admin';
  const hasAdminAccess = currentUser && (currentUser.role === 'admin' || currentUser.role === 'seller');

  if (isAdminView && hasAdminAccess) {
    return (
      <div className={`min-h-screen transition-colors duration-300 font-sans ${
        theme === 'dark' 
          ? 'bg-[#0B0F19] text-slate-100 dark' 
          : 'bg-slate-50 text-slate-800'
      }`}>
        <AdminPanel />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans flex flex-col justify-between selection:bg-primary selection:text-white ${
      theme === 'dark' 
        ? 'bg-[#0B0F19] text-slate-100 dark' 
        : 'bg-[#f9f9f9] text-slate-800'
    }`}>
      <div>
        <Header />
        
        {showIncompleteWarning && (
          <div className="bg-amber-500 text-white py-2 px-4 sm:px-6 lg:px-8 shadow-inner animate-pulse">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                  ⚠️ Cadastro Pendente!
                </span>
                <span className="text-[11px] text-amber-50 font-medium hidden md:inline">
                  Complete seus dados cadastrais (CPF, RG, Filiação, etc.) para habilitar compras via Crediário Próprio.
                </span>
              </div>
              <button 
                onClick={() => setIsProfileModalOpen(true)}
                className="bg-white text-amber-600 px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-bold hover:bg-amber-50 active:scale-95 transition-all shadow-sm cursor-pointer"
              >
                Completar Cadastro Agora
              </button>
            </div>
          </div>
        )}

        <main className="pb-12 animate-fade-in">
          {renderActiveView()}
        </main>
      </div>
      <Footer />
      
      {/* Complete Profile Modal */}
      <CompleteProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
