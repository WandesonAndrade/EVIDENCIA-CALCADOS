/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, Suspense, lazy } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ProductList } from './components/ProductList';
import { ProductDetail } from './components/ProductDetail';
import { Cart } from './components/Cart';
import { AuthScreen } from './components/AuthScreen';
import { Footer } from './components/Footer';
import { CategoryPage } from './components/CategoryPage';
import { CompleteProfileModal } from './components/CompleteProfileModal';
import { FavoritesList } from './components/FavoritesList';
import { FloatingAssistant } from './components/FloatingAssistant';
import { LoadingSpinner } from './components/common/LoadingSpinner';

// Dynamic imports (Code Splitting) para views pesadas / secundárias
const AdminPanel = lazy(() => import('./components/AdminPanel').then(m => ({ default: m.AdminPanel })));
const MeuCrediario = lazy(() => import('./components/MeuCrediario').then(m => ({ default: m.MeuCrediario })));
const PortfolioCase = lazy(() => import('./components/PortfolioCase').then(m => ({ default: m.PortfolioCase })));
const AboutUs = lazy(() => import('./components/AboutUs').then(m => ({ default: m.AboutUs })));
const SupportPage = lazy(() => import('./components/SupportPage').then(m => ({ default: m.SupportPage })));
const OrderHistory = lazy(() => import('./components/OrderHistory').then(m => ({ default: m.OrderHistory })));


export const checkIsProfileComplete = (user: any): boolean => {
  if (!user) return false;

  // 1. Flag de conclusão explícita gravada no documento do Firestore
  if (user.isProfileComplete === true) return true;

  // 2. Extração dos campos obrigatórios padrão (Nome Completo e CPF/Documento)
  const name = String(user.name || user.nome || user.email || '').trim();
  const cpf = String(user.cpf || user.documento || user.rg || '').trim();

  const hasBasicRequired = name.length > 0 && cpf.length > 0;
  if (!hasBasicRequired) return false;

  // 3. Se o cliente optou por solicitar Crediário da Loja, valida os dados adicionais de análise de crédito
  if (user.solicitarCrediario === true || user.crediarioStatus === 'EmAnalise' || user.crediarioStatus === 'Aprovado') {
    const birthDate = String(user.dataNascimento || user.birthDate || user.nascimento || '').trim();
    const rg = String(user.rg || '').trim();
    const address = String(user.endereco || user.address || (user.cidade && user.bairro) || '').trim();
    const phone = String(user.telefone || user.phone || user.whatsapp || user.celular || '').trim();
    const hasCrediarioFields = birthDate.length > 0 && rg.length > 0 && address.length > 0 && phone.length > 0;
    
    return hasCrediarioFields;
  }

  // Cadastro comum padrão
  return true;
};

export const isProfileIncomplete = (user: any): boolean => {
  if (!user) return false;
  if (user.role !== 'customer') return false; // Gestores e vendedores não necessitam de cadastro de crédito
  return !checkIsProfileComplete(user);
};



const AppContent: React.FC = () => {
  const { currentView, currentUser, currentAdminUser, theme, homeSections } = useApp();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const heroSection = homeSections?.find(s => s.id === 'hero');
  const activeAdminUser = currentAdminUser || currentUser;
  const hasAdminAccess = Boolean(activeAdminUser && activeAdminUser.role !== 'customer');


  React.useEffect(() => {
    const handleOpen = () => setIsProfileModalOpen(true);
    window.addEventListener('open-profile-modal', handleOpen);
    return () => window.removeEventListener('open-profile-modal', handleOpen);
  }, []);

  React.useEffect(() => {
    if (['product-detail', 'cart', 'orders', 'about', 'support', 'favorites', 'admin', 'meu-crediario'].includes(currentView)) {
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
        if (!currentUser) {
          return <AuthScreen mode="customer" />;
        }
        return <OrderHistory />;
      case 'portfolio-case':
        return <PortfolioCase />;
      case 'about':
        return <AboutUs />;
      case 'support':
        return <SupportPage />;
      case 'favorites':
        return <FavoritesList />;
      case 'meu-crediario':
        if (!currentUser) {
          return <AuthScreen mode="customer" />;
        }
        return <MeuCrediario />;
      case 'login':
        return <AuthScreen mode="customer" />;
      case 'admin-login':
        return <AuthScreen mode="admin" />;
      case 'admin':
        // Protect administrative route (allows admin & seller)
        if (!hasAdminAccess) {
          return <AuthScreen mode="admin" />;
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

  if (isAdminView && hasAdminAccess) {
    return (
      <div className={`min-h-screen transition-colors duration-300 font-sans ${
        theme === 'dark' 
          ? 'bg-[#0d0d0e] text-slate-100 dark' 
          : 'bg-slate-50 text-slate-800'
      }`}>
        <Suspense fallback={<LoadingSpinner fullScreen message="Carregando Painel Administrativo..." />}>
          <AdminPanel />
        </Suspense>
      </div>
    );
  }


  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans flex flex-col justify-between selection:bg-[#0071e3] selection:text-white relative ${
      theme === 'dark' 
        ? 'bg-[#000000] text-slate-100 dark' 
        : 'bg-[#f5f5f7] text-[#1d1d1f] antialiased'
    }`}>
      {/* Luz ambiente de estúdio sutil para o fundo da parte clara */}
      {theme !== 'dark' && !isAdminView && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-gradient-to-b from-[#0071e3]/[0.025] via-[#0071e3]/[0.008] to-transparent rounded-full blur-3xl" />
        </div>
      )}
      <div className="relative z-10">
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
          <Suspense fallback={<LoadingSpinner fullScreen />}>
            {renderActiveView()}
          </Suspense>
        </main>
      </div>

      <Footer />
      
      {/* Official Floating Assistant Widget */}
      <FloatingAssistant />

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
