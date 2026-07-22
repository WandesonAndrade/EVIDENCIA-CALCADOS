import React from 'react';
import { Phone, MapPin, Mail, MessageSquare } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BrandLogo } from './BrandLogo';

export const Footer: React.FC = () => {
  const { setCurrentView } = useApp();

  const savedPhone = localStorage.getItem('evidencia_settings_whatsapp') || '5599984684867';

  const handleWhatsAppGeneralClick = () => {
    const text = encodeURIComponent("Olá! Estou navegando no catálogo da Evidência Calçados e gostaria de tirar algumas dúvidas.");
    window.open(`https://wa.me/${savedPhone.replace(/\D/g, '')}?text=${text}`, '_blank');
  };

  const formatPhone = (phoneStr: string) => {
    const clean = phoneStr.replace(/\D/g, '');
    if (clean.length === 13) {
      return `(${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
    } else if (clean.length === 11) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    }
    return phoneStr;
  };

  return (
    <footer id="store-footer" className="bg-slate-950 text-white mt-16 border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 sm:gap-10">
          
          {/* Column 1: Institutional info & Vector Brand Logo */}
          <div className="space-y-4">
            <BrandLogo size="md" />

            <p className="text-xs text-slate-400 font-normal leading-relaxed">
              Qualidade, estilo e sofisticação para os seus pés. Conheça nossas coleções exclusivas e aproveite o parcelamento facilidades no Crediário Próprio Evidência.
            </p>
          </div>

          {/* Column 2: Institutional */}
          <div className="space-y-3">
            <h4 className="text-xs font-black tracking-widest text-amber-400 uppercase">INSTITUCIONAL</h4>
            <ul className="space-y-2.5 text-xs text-slate-300 font-medium">
              <li>
                <button 
                  onClick={() => setCurrentView('about')} 
                  className="hover:text-amber-400 transition-colors cursor-pointer text-left"
                >
                  Sobre nós
                </button>
              </li>
              <li><a href="#" className="hover:text-amber-400 transition-colors">Trabalhe Conosco</a></li>
              <li><a href="#" className="hover:text-amber-400 transition-colors">Privacidade</a></li>
              <li><a href="#" className="hover:text-amber-400 transition-colors">Termos de Uso</a></li>
            </ul>
          </div>

          {/* Column 3: Support */}
          <div className="space-y-3">
            <h4 className="text-xs font-black tracking-widest text-amber-400 uppercase">SUPORTE</h4>
            <ul className="space-y-2.5 text-xs text-slate-300 font-medium">
              <li>
                <button 
                  onClick={() => setCurrentView('support')} 
                  className="hover:text-amber-400 transition-colors cursor-pointer text-left"
                >
                  Central de Suporte
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setCurrentView('support')} 
                  className="hover:text-amber-400 transition-colors cursor-pointer text-left"
                >
                  Trocas e Devoluções
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setCurrentView('support')} 
                  className="hover:text-amber-400 transition-colors cursor-pointer text-left"
                >
                  Crediário Próprio
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact */}
          <div className="space-y-3">
            <h4 className="text-xs font-black tracking-widest text-amber-400 uppercase">CONTATO</h4>
            <ul className="space-y-2.5 text-xs text-slate-300 font-medium">
              <li className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-amber-400" />
                <span>{formatPhone(savedPhone)}</span>
              </li>
              <li className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <span>Rua Afonso Pena, 295 - Centro, Caxias - MA</span>
              </li>
              <li className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-amber-400" />
                <span>contato@evidencia.com.br</span>
              </li>
            </ul>
          </div>

        </div>

        <div className="mt-12 pt-8 border-t border-slate-900 text-center text-xs text-slate-500 font-medium">
          © 2026 Evidência Calçados. Todos os direitos reservados.
        </div>
      </div>

      {/* Floating WhatsApp Contact Button */}
      <button
        id="whatsapp-fab"
        onClick={handleWhatsAppGeneralClick}
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#20ba5a] text-white p-4 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 group cursor-pointer"
        title="Fale no WhatsApp"
      >
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-out text-xs font-bold whitespace-nowrap mr-0 group-hover:mr-2">
          Atendimento WhatsApp
        </span>
        <MessageSquare className="h-6 w-6" />
        <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-30 animate-ping -z-10" />
      </button>
    </footer>
  );
};
