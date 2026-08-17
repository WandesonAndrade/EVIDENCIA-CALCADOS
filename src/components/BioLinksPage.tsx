import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { motion } from 'motion/react';
import {
  ShoppingBag,
  CreditCard,
  MessageCircle,
  MapPin,
  Package,
  HelpCircle,
  Share2,
  Check,
  Instagram,
  ArrowRight,
  Sparkles,
  Phone,
  Store,
  ExternalLink
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';

export const OFFICIAL_WHATSAPP_NUMBER = "5599984684867";
export const MAPS_LOCATION_URL = "https://www.google.com/maps/search/?api=1&query=Evidencia+Calcados+Caxias+MA";

export const BioLinksPage: React.FC = () => {
  const { setCurrentView, theme } = useApp();
  const isDark = theme === 'dark';
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const fullUrl = window.location.origin + '?view=bio';
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const text = encodeURIComponent("Olá! Vim pelo Instagram da Evidência Calçados e gostaria de informações e atendimento.");
    window.open(`https://wa.me/${OFFICIAL_WHATSAPP_NUMBER}?text=${text}`, '_blank');
  };

  const linkItems = [
    {
      id: 'store',
      title: 'Acessar Loja Virtual (Vitrine)',
      subtitle: 'Compre online com entrega em Caxias - MA ou retirada grátis',
      icon: ShoppingBag,
      onClick: () => setCurrentView('home'),
      badge: 'Destaque',
      bgClass: 'bg-[#003B73] hover:bg-[#002b55] text-white border-[#00509E]',
      iconClass: 'bg-white/15 text-white',
      badgeClass: 'bg-[#FFC928] text-[#003B73] font-black',
    },
    {
      id: 'crediario',
      title: 'Meu Crediário Evidência',
      subtitle: 'Consulte carnês, parcelas em aberto e pague via PIX',
      icon: CreditCard,
      onClick: () => setCurrentView('meu-crediario'),
      badge: 'PIX Fácil',
      bgClass: isDark ? 'bg-slate-900 hover:bg-slate-800 text-white border-blue-900/40' : 'bg-white hover:bg-[#EEF8FF] text-[#003B73] border-blue-900/15 shadow-sm',
      iconClass: 'bg-[#EEF8FF] dark:bg-blue-950 text-[#006EDB]',
      badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp Oficial de Atendimento',
      subtitle: 'Fale direto com nossas consultoras: (99) 98468-4867',
      icon: MessageCircle,
      onClick: handleOpenWhatsApp,
      badge: 'Online',
      bgClass: 'bg-[#25D366] hover:bg-[#20bd5a] text-white border-emerald-600 shadow-md',
      iconClass: 'bg-white/20 text-white',
      badgeClass: 'bg-white text-emerald-900 font-bold',
      isExternal: true,
    },
    {
      id: 'location',
      title: 'Como Chegar na Loja Física',
      subtitle: 'Localização no Google Maps em Caxias - MA',
      icon: MapPin,
      onClick: () => window.open(MAPS_LOCATION_URL, '_blank'),
      badge: 'Nossa Loja',
      bgClass: isDark ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-800' : 'bg-white hover:bg-[#EEF8FF] text-[#003B73] border-blue-900/15 shadow-sm',
      iconClass: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
      badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
      isExternal: true,
    },
    {
      id: 'orders',
      title: 'Meus Pedidos & Rastreamento',
      subtitle: 'Acompanhe o status e histórico das suas compras',
      icon: Package,
      onClick: () => setCurrentView('orders'),
      bgClass: isDark ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-800' : 'bg-white hover:bg-[#EEF8FF] text-[#003B73] border-blue-900/15 shadow-sm',
      iconClass: 'bg-sky-50 dark:bg-sky-950 text-[#006EDB]',
    },
    {
      id: 'support',
      title: 'Central de Ajuda & Dúvidas',
      subtitle: 'Política de trocas, prazos e atendimento ao cliente',
      icon: HelpCircle,
      onClick: () => setCurrentView('support'),
      bgClass: isDark ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-800' : 'bg-white hover:bg-[#EEF8FF] text-[#003B73] border-blue-900/15 shadow-sm',
      iconClass: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
    },
  ];

  return (
    <div className={`min-h-screen py-10 px-4 sm:px-6 flex flex-col items-center justify-between ${
      isDark ? 'bg-[#0B0F19] text-white' : 'bg-[#EAF5FF] text-slate-900'
    }`}>
      {/* Container Principal */}
      <div className="w-full max-w-md mx-auto space-y-8 flex-1">
        
        {/* Profile Card Header */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center space-y-4"
        >
          {/* Avatar Oficial do Instagram em Destaque */}
          <div className="relative inline-block">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 bg-gradient-to-tr from-[#003B73] via-[#006EDB] to-[#FFC928] shadow-xl mx-auto flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-white dark:bg-slate-950 flex items-center justify-center p-0.5 overflow-hidden shadow-inner">
                <img
                  src="/instagram-profile-avatar.png"
                  alt="Evidência Calçados Perfil Oficial Instagram"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
            </div>
            <span className="absolute bottom-1 right-1 bg-emerald-500 text-white p-1.5 rounded-full ring-4 ring-[#EAF5FF] dark:ring-[#0B0F19]" title="Atendimento Online">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
          </div>

          {/* Nome & Tagline */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-center space-x-1.5">
              <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-[#003B73]'}`}>
                Evidência Calçados
              </h1>
              <span className="text-blue-500" title="Perfil Verificado">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </span>
            </div>

            <p className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-[#52708F]'}`}>
              @evidenciacalcados • Caxias - MA
            </p>

            <p className={`text-xs sm:text-sm font-medium px-4 max-w-sm mx-auto leading-snug ${
              isDark ? 'text-slate-300' : 'text-slate-700'
            }`}>
              Sua melhor escolha em calçados, bolsas e acessórios com o exclusivo Crediário Próprio! 👠👟
            </p>
          </div>

          {/* Badges Rápidas */}
          <div className="flex items-center justify-center gap-2 pt-1 flex-wrap text-[11px] font-extrabold">
            <span className="px-3 py-1 rounded-full bg-[#DDF1FF] text-[#003B73] border border-[#006EDB]/20 flex items-center space-x-1 shadow-2xs">
              <Store className="h-3 w-3" />
              <span>Loja Física & Online</span>
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300/40 flex items-center space-x-1 shadow-2xs">
              <CreditCard className="h-3 w-3" />
              <span>Crediário Próprio</span>
            </span>
          </div>
        </motion.div>

        {/* Lista de Links Interativos */}
        <div className="space-y-3.5">
          {linkItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.05 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={item.onClick}
                className={`w-full p-4 rounded-3xl border flex items-center justify-between transition-all cursor-pointer group ${item.bgClass}`}
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div className={`p-3 rounded-2xl shrink-0 transition-transform group-hover:scale-110 ${item.iconClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-left min-w-0 pr-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-black tracking-tight truncate block">
                        {item.title}
                      </span>
                      {item.badge && (
                        <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider shrink-0 ${item.badgeClass}`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-xs opacity-80 block truncate font-medium mt-0.5">
                      {item.subtitle}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                  {item.isExternal ? <ExternalLink className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Botão de Compartilhar / Copiar Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="pt-2 text-center"
        >
          <button
            onClick={handleCopyLink}
            className={`inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                : 'bg-white border-blue-900/15 text-[#003B73] hover:bg-[#EEF8FF] shadow-xs'
            }`}
          >
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4 text-[#006EDB]" />}
            <span>{copied ? 'Links Copiados!' : 'Copiar links'}</span>
          </button>
        </motion.div>
      </div>

      {/* Footer da Página */}
      <footer className="w-full max-w-md mx-auto pt-10 text-center space-y-1 shrink-0">
        <p className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-[#52708F]'}`}>
          Evidência Calçados • Links
        </p>
      </footer>
    </div>
  );
};
