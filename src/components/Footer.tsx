import React, { useState } from 'react';
import { Send, Instagram, Facebook, Youtube } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BrandLogo } from './BrandLogo';

export const Footer: React.FC = () => {
  const { setCurrentView } = useApp();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      setNewsletterSubscribed(true);
      setNewsletterEmail('');
      setTimeout(() => setNewsletterSubscribed(false), 4000);
    }
  };

  return (
    <footer id="store-footer" className="bg-[#fbf9f9] dark:bg-slate-950 text-neutral-800 dark:text-slate-200 border-t border-neutral-200 dark:border-slate-800 mt-20 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        
        {/* Grid Principal de 5 Colunas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-6 pb-12 border-b border-neutral-200 dark:border-slate-800">
          
          {/* Coluna 1: Logo Oficial + App Store Badges + Redes Sociais */}
          <div className="space-y-4 lg:col-span-1">
            <BrandLogo size="md" />

            {/* Badges de App Store / Google Play */}
            <div className="flex items-center space-x-2 pt-1">
              <div className="bg-black text-white text-[9px] font-bold px-2.5 py-1.5 rounded-md flex items-center space-x-1 cursor-pointer">
                <span>Google Play</span>
              </div>
              <div className="bg-black text-white text-[9px] font-bold px-2.5 py-1.5 rounded-md flex items-center space-x-1 cursor-pointer">
                <span>App Store</span>
              </div>
            </div>

            {/* Ícones de Redes Sociais */}
            <div className="flex items-center space-x-3 pt-2 text-neutral-600 dark:text-slate-400">
              <Instagram className="h-4 w-4 hover:text-black dark:hover:text-white transition-colors cursor-pointer" />
              <Facebook className="h-4 w-4 hover:text-black dark:hover:text-white transition-colors cursor-pointer" />
              <Youtube className="h-4 w-4 hover:text-black dark:hover:text-white transition-colors cursor-pointer" />
            </div>
          </div>

          {/* Coluna 2: Institucional */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-neutral-900 dark:text-white tracking-tight text-xs uppercase">Institucional</h4>
            <ul className="space-y-2 font-medium text-neutral-600 dark:text-slate-400">
              <li>
                <button onClick={() => setCurrentView('about')} className="hover:text-black dark:hover:text-white transition-colors cursor-pointer text-left">
                  Sobre nós
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('about')} className="hover:text-black dark:hover:text-white transition-colors cursor-pointer text-left">
                  Nossas lojas
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('support')} className="hover:text-black dark:hover:text-white transition-colors cursor-pointer text-left">
                  Trabalhe conosco
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('support')} className="hover:text-black dark:hover:text-white transition-colors cursor-pointer text-left">
                  Política de privacidade
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('support')} className="hover:text-black dark:hover:text-white transition-colors cursor-pointer text-left">
                  Trocas e devoluções
                </button>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Ajuda */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-neutral-900 dark:text-white tracking-tight text-xs uppercase">Ajuda</h4>
            <ul className="space-y-2 font-medium text-neutral-600 dark:text-slate-400">
              <li>
                <button onClick={() => setCurrentView('support')} className="hover:text-black dark:hover:text-white transition-colors cursor-pointer text-left">
                  Central de atendimento
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('support')} className="hover:text-black dark:hover:text-white transition-colors cursor-pointer text-left">
                  Como comprar
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('support')} className="hover:text-black dark:hover:text-white transition-colors cursor-pointer text-left">
                  Formas de pagamento
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('support')} className="hover:text-black dark:hover:text-white transition-colors cursor-pointer text-left">
                  Entrega e prazos
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('support')} className="hover:text-black dark:hover:text-white transition-colors cursor-pointer text-left">
                  Perguntas frequentes
                </button>
              </li>
            </ul>
          </div>

          {/* Coluna 4: Minha conta */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-neutral-900 dark:text-white tracking-tight text-xs uppercase">Minha conta</h4>
            <ul className="space-y-2 font-medium text-neutral-600 dark:text-slate-400">
              <li>
                <button onClick={() => setCurrentView('orders')} className="hover:text-black dark:hover:text-white transition-colors cursor-pointer text-left">
                  Meus pedidos
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('orders')} className="hover:text-black dark:hover:text-white transition-colors cursor-pointer text-left">
                  Meus dados
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('favorites')} className="hover:text-black dark:hover:text-white transition-colors cursor-pointer text-left">
                  Lista de desejos
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('meu-crediario')} className="hover:text-black dark:hover:text-white transition-colors cursor-pointer text-left">
                  Vale-presente / Crediário
                </button>
              </li>
            </ul>
          </div>

          {/* Coluna 5: Newsletter */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-neutral-900 dark:text-white tracking-tight text-xs uppercase">Newsletter</h4>
            <p className="text-neutral-600 dark:text-slate-400 font-medium leading-relaxed">
              Receba novidades e ofertas exclusivas em seu e-mail.
            </p>
            
            <form onSubmit={handleNewsletterSubmit} className="relative pt-1">
              <input
                type="email"
                required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Seu melhor e-mail"
                className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-white dark:bg-slate-900 border border-neutral-300 dark:border-slate-800 rounded-md focus:outline-none focus:border-black dark:focus:border-white transition-colors"
              />
              <button
                type="submit"
                className="absolute right-2 top-3 text-neutral-500 hover:text-black dark:hover:text-white cursor-pointer"
                title="Inscrever-se"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>

            {newsletterSubscribed && (
              <span className="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 pt-1">
                ✓ Inscrição realizada com sucesso!
              </span>
            )}
          </div>

        </div>

        {/* Linha Inferior de Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-neutral-500 dark:text-slate-400 font-medium text-[11px] gap-4">
          <p>© 2025 Evidência Calçados. Todos os direitos reservados.</p>
          
          <div className="flex items-center space-x-4">
            <button onClick={() => setCurrentView('support')} className="hover:underline cursor-pointer">
              Termos de uso
            </button>
            <span>|</span>
            <button onClick={() => setCurrentView('support')} className="hover:underline cursor-pointer">
              Política de privacidade
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};
