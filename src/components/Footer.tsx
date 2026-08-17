import React from "react";
import {
  Instagram,
  Facebook,
  Youtube,
  MapPin,
  Clock,
  ExternalLink,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { BrandLogo } from "./BrandLogo";

export const Footer: React.FC = () => {
  const { setCurrentView, theme } = useApp();
  const isDark = theme === "dark";

  return (
    <footer
      id="store-footer"
      className={`border-t mt-20 text-xs transition-colors duration-300 ${
        isDark
          ? "bg-[#050a14] text-slate-200 border-white/10"
          : "bg-[#003B73] text-white border-white/15"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Grid Principal do Rodapé com Espaçamento Apple */}
        <div
          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-14 border-b ${
            isDark ? "border-white/10" : "border-white/15"
          }`}
        >
          {/* Coluna 1: Logo Oficial Ampliada + Redes Sociais */}
          <div className="space-y-6 lg:col-span-2">
            <BrandLogo size="lg" variant="white" />

            <p
              className={`text-xs max-w-sm font-normal leading-relaxed ${
                isDark ? "text-slate-300" : "text-blue-100/90"
              }`}
            >
              Evidência Calçados — Tradição, qualidade e inovação para
              acompanhar você em todos os momentos do seu dia a dia.
            </p>

            {/* Redes Sociais em Estilo Pílula Apple */}
            <div className="flex items-center space-x-3">
              <a
                href="https://www.instagram.com/evidencia.calcados_"
                target="_blank"
                rel="noopener noreferrer"
                className={`p-2.5 rounded-full border hover:scale-110 transition-all cursor-pointer shadow-xs ${
                  isDark
                    ? "bg-white/10 border-white/10 text-white/80 hover:text-white"
                    : "bg-white/10 border-white/20 text-white hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400"
                }`}
                title="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61582310099583"
                target="_blank"
                rel="noopener noreferrer"
                className={`p-2.5 rounded-full border hover:scale-110 transition-all cursor-pointer shadow-xs ${
                  isDark
                    ? "bg-white/10 border-white/10 text-white/80 hover:text-white"
                    : "bg-white/10 border-white/20 text-white hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400"
                }`}
                title="Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Coluna 2: Institucional */}
          <div className="space-y-3.5">
            <h4 className="font-bold tracking-wider text-xs uppercase text-white">
              Institucional
            </h4>
            <ul className="space-y-2.5 font-normal text-blue-100/90">
              <li>
                <button
                  onClick={() => setCurrentView("about")}
                  className="hover:text-amber-300 transition-colors cursor-pointer text-left"
                >
                  Sobre nós
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentView("about")}
                  className="hover:text-amber-300 transition-colors cursor-pointer text-left"
                >
                  Nossa loja
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentView("support")}
                  className="hover:text-amber-300 transition-colors cursor-pointer text-left"
                >
                  Trabalhe conosco
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentView("support")}
                  className="hover:text-amber-300 transition-colors cursor-pointer text-left"
                >
                  Política de privacidade
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentView("support")}
                  className="hover:text-amber-300 transition-colors cursor-pointer text-left"
                >
                  Trocas e devoluções
                </button>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Localização no Google Maps & Loja Física */}
          <div className="space-y-3.5 lg:col-span-2">
            <h4 className="font-bold tracking-wider text-xs uppercase flex items-center space-x-1.5 text-white">
              <MapPin className="h-4 w-4 text-amber-400" />
              <span>Nossa Loja Física</span>
            </h4>

            <div className="space-y-1.5">
              <p className="font-bold text-xs text-white">
                Evidência Calçados — Centro
              </p>
              <p className="font-normal text-xs leading-relaxed text-blue-100/90">
                Rua Afonso Pena, 295 - Centro, Caxias - MA | CEP: 65606-010
              </p>
              <div className="flex items-center space-x-1.5 text-[11px] text-blue-200/90 pt-0.5">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                <span>Seg a Sex: 08:00 às 18:00 | Sáb: 08:00 às 13:00</span>
              </div>
            </div>

            {/* Mapa Interativo Google Maps */}
            <div
              className={`mt-3 rounded-2xl overflow-hidden border h-36 relative group transition-all shadow-md ${
                isDark
                  ? "border-white/10 bg-[#1d1d1f]"
                  : "border-white/20 bg-[#001a3d]"
              }`}
            >
              <iframe
                title="Mapa da Loja Evidência Calçados em Caxias - MA"
                src="https://maps.google.com/maps?q=Rua+Afonso+Pena+295+Centro+Caxias+MA&t=&z=16&ie=UTF8&iwloc=&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full opacity-90 group-hover:opacity-100 transition-all duration-300"
              />
              <a
                href="https://maps.google.com/?q=Rua+Afonso+Pena+295+Centro+Caxias+MA"
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-2.5 right-2.5 px-3 py-1.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-[10px] shadow-md flex items-center space-x-1 transition-all cursor-pointer z-10"
              >
                <span>Abrir no Google Maps</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Linha Inferior de Copyright e Links Úteis */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between font-normal text-[11px] gap-4 text-blue-200/80">
          <p>© 2025 Evidência Calçados. Todos os direitos reservados.</p>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setCurrentView("support")}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Termos de Uso
            </button>
            <span className="text-white/20">|</span>
            <button
              onClick={() => setCurrentView("support")}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Política de Privacidade
            </button>
            <span className="text-white/20">|</span>
            <button
              onClick={() => setCurrentView("meu-crediario")}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Crediário Próprio
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
