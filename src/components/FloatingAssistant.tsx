import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';

export const FloatingAssistant: React.FC = () => {
  const { theme } = useApp();
  const isDark = theme === 'dark';
  const [isHovered, setIsHovered] = useState(false);

  const handleOpenWhatsApp = () => {
    const phoneNumber = "5599981423405";
    const text = encodeURIComponent("Olá! Gostaria de tirar dúvidas e receber atendimento personalizado para compras na Evidência Calçados Caxias - MA.");
    window.open(`https://wa.me/${phoneNumber}?text=${text}`, '_blank');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-3 select-none">
      {/* Balão de Fala Moderno Interativo */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, x: 15, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 15, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className={`hidden sm:flex flex-col p-3 px-4 rounded-2xl border shadow-2xl backdrop-blur-xl max-w-xs ${
              isDark 
                ? 'bg-slate-900/95 border-amber-400/40 text-white shadow-black/70' 
                : 'bg-white/95 border-slate-300 text-slate-800 shadow-xl'
            }`}
          >
            <div className="flex items-center space-x-1.5 text-[10px] font-black text-amber-400 uppercase tracking-widest mb-0.5">
              <span>ATENDIMENTO EM CAXIAS</span>
            </div>
            <p className="text-xs font-bold leading-snug">
              Olá, como posso ajudar? 👋
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botão Flutuante Circular da Atendente Oficial */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={handleOpenWhatsApp}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative group cursor-pointer focus:outline-none"
        title="Atendimento WhatsApp Evidência Calçados"
      >
        {/* Anel de Iluminação Reluzente */}
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 via-amber-400 to-amber-500 rounded-full blur-md opacity-80 group-hover:opacity-100 transition-opacity animate-pulse" />

        {/* Recipiente Circular do Avatar */}
        <div className={`relative h-14 w-14 sm:h-16 sm:w-16 rounded-full overflow-hidden border-2 flex items-end justify-center shadow-2xl ${
          isDark ? 'bg-slate-900 border-amber-400' : 'bg-slate-100 border-slate-900'
        }`}>
          <img 
            src="/evidencia-character-cutout.png" 
            alt="Atendente Oficial Evidência EC" 
            className="h-full w-auto object-cover object-top filter drop-shadow-xs transition-transform duration-300 group-hover:scale-110"
          />

          {/* Selo do Ícone Oficial do WhatsApp no Canto Inferior Direito */}
          <div className="absolute -bottom-0.5 -right-0.5 bg-[#25D366] text-white p-1.5 rounded-full shadow-lg border-2 border-slate-950 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 fill-current text-white" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
          </div>
        </div>
      </motion.button>
    </div>
  );
};
