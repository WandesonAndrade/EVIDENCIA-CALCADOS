import React from 'react';
import { Phone, MapPin, Mail, MessageSquare } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Footer: React.FC = () => {
  const { setCurrentView } = useApp();

  const savedPhone = localStorage.getItem('evidencia_settings_whatsapp') || '5599984684867';
  const cleanPhone = savedPhone.replace(/\D/g, '');

  const handleWhatsAppGeneralClick = () => {
    const text = encodeURIComponent("Olá! Estou navegando no catálogo da Evidência Calçados e gostaria de tirar algumas dúvidas.");
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  // Format phone to display nicely as (XX) XXXXX-XXXX or similar
  const formatPhone = (phoneStr: string) => {
    const clean = phoneStr.replace(/\D/g, '');
    if (clean.length === 13) {
      // With country code 55 (e.g. 5599984684867)
      return `(${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
    } else if (clean.length === 11) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    }
    return phoneStr;
  };

  return (
    <footer id="store-footer" className="bg-primary text-white mt-12 border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Column 1: Institutional info */}
          <div className="space-y-4">
            <span className="text-lg font-bold tracking-tight">
              Evidência <span className="text-accent-blue font-light">Calçados</span>
            </span>
            <p className="text-xs text-slate-300 font-light leading-relaxed">
              Qualidade e estilo para os seus pés. Visite-nos e conheça nossas condições exclusivas de crediário próprio.
            </p>
          </div>

          {/* Column 2: Institutional */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold tracking-wider text-accent-blue">INSTITUCIONAL</h4>
            <ul className="space-y-2 text-xs text-slate-300 font-light">
              <li>
                <button 
                  onClick={() => setCurrentView('about')} 
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Sobre nós
                </button>
              </li>
              <li><a href="#" className="hover:text-white transition-colors">Trabalhe Conosco</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacidade</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Termos de Uso</a></li>
            </ul>
          </div>

          {/* Column 3: Support */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold tracking-wider text-accent-blue">SUPORTE</h4>
            <ul className="space-y-2 text-xs text-slate-300 font-light">
              <li>
                <button 
                  onClick={() => setCurrentView('support')} 
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Central de Suporte
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setCurrentView('support')} 
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Trocas e Devoluções
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setCurrentView('support')} 
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Crediário Próprio
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold tracking-wider text-accent-blue">CONTATO</h4>
            <ul className="space-y-2 text-xs text-slate-300 font-light">
              <li className="flex items-center space-x-2">
                <Phone className="h-3.5 w-3.5 text-accent-blue" />
                <span>{formatPhone(savedPhone)}</span>
              </li>
              <li className="flex items-start space-x-2">
                <MapPin className="h-3.5 w-3.5 text-accent-blue mt-0.5" />
                <span>Rua Afonso Pena, 295 - Centro, Caxias - MA</span>
              </li>
              <li className="flex items-center space-x-2">
                <Mail className="h-3.5 w-3.5 text-accent-blue" />
                <span>contato@evidencia.com.br</span>
              </li>
            </ul>
          </div>

        </div>

        <div className="mt-8 pt-8 border-t border-white/10 text-center text-xs text-slate-400 font-light">
          © 2026 Evidência Calçados. Todos os direitos reservados.
        </div>
      </div>

      {/* Floating WhatsApp Contact Button */}
      <button
        id="whatsapp-fab"
        onClick={handleWhatsAppGeneralClick}
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#20ba5a] text-white p-4 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 group"
        title="Fale no WhatsApp"
      >
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-out text-xs font-bold whitespace-nowrap mr-0 group-hover:mr-2">
          Atendimento WhatsApp
        </span>
        <MessageSquare className="h-6 w-6" />
        <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-30 animate-ping -z-10"></span>
      </button>
    </footer>
  );
};
