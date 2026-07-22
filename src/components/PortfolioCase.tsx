import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Sparkles, Palette, Smartphone, Laptop, Check, Copy, Wifi, 
  Database, Share2, Layers, ShieldCheck, ShoppingCart, UserCheck, 
  Play, ArrowRight, RotateCcw, Activity, HelpCircle, FileText, ChevronRight, Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const PortfolioCase: React.FC = () => {
  const { products, orders, currentUser, setCurrentView } = useApp();
  const [activeSection, setActiveSection] = useState<'tokens' | 'simulator' | 'checkout' | 'tech'>('tokens');

  // Interactive Typography playground state
  const [typedText, setTypedText] = useState('Evidência Calçados');
  const [fontSize, setFontSize] = useState<number>(32);
  const [fontWeight, setFontWeight] = useState<'font-light' | 'font-normal' | 'font-medium' | 'font-semibold' | 'font-bold'>('font-bold');
  const [letterSpacing, setLetterSpacing] = useState<string>('tracking-tight');
  const [selectedFont, setSelectedFont] = useState<'sans' | 'mono'>('sans');

  // Copy status
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Role Simulator state
  const [simulatedRole, setSimulatedRole] = useState<'customer' | 'seller' | 'admin'>('customer');
  const [orderToClaim, setOrderToClaim] = useState<string>('EVC-4829');
  const [orderStatus, setOrderStatus] = useState<'Pendente' | 'Confirmado' | 'Entregue'>('Pendente');
  const [isClaimed, setIsClaimed] = useState<boolean>(false);

  // Checkout Simulator state
  const [selectedSize, setSelectedSize] = useState<number>(40);
  const [simulatedStock, setSimulatedStock] = useState<number>(12);
  const [checkoutQuantity, setCheckoutQuantity] = useState<number>(1);
  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'stock_check' | 'local_save' | 'firestore_sync' | 'whatsapp_ready'>('idle');
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);

  // Simulation logger
  const addLog = (msg: string) => {
    setConsoleLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    setConsoleLogs([
      `[${new Date().toLocaleTimeString()}] Simulador de Checkout Inicializado.`,
      `[${new Date().toLocaleTimeString()}] Aguardando ação do usuário...`
    ]);
  }, []);

  const triggerCheckoutSimulation = () => {
    if (checkoutQuantity > simulatedStock) {
      addLog("❌ ERRO: Quantidade selecionada excede o estoque disponível!");
      return;
    }

    setCheckoutStatus('stock_check');
    setConsoleLogs([]);
    addLog("⚡ Iniciando simulação de checkout seguro (UI UX Pro Max conversion pattern)");
    
    setTimeout(() => {
      addLog("🔍 Passo 1/4: Validando estoque localmente...");
      addLog(`✔️ Estoque verificado com sucesso (${simulatedStock} unidades disponíveis, ${checkoutQuantity} solicitadas)`);
      setCheckoutStatus('local_save');

      setTimeout(() => {
        addLog("💾 Passo 2/4: Gravando transação no LocalStorage (Garantia offline)...");
        addLog(`✔️ Registro offline criado: EVC-${Math.floor(1000 + Math.random() * 9000)} salvo com status "Pendente"`);
        setCheckoutStatus('firestore_sync');

        setTimeout(() => {
          addLog("🌐 Passo 3/4: Tentando sincronizar com o banco Firestore...");
          addLog("⚠️ Rede instável detectada! Ativando persistência paralela silenciosa.");
          addLog("✔️ Transação agendada em fila de sincronização em segundo plano");
          setCheckoutStatus('whatsapp_ready');

          setTimeout(() => {
            addLog("💬 Passo 4/4: Gerando link dinâmico de conversão do WhatsApp...");
            const message = `*Novo Pedido - Evidência*\nSapato Social Nobre x${checkoutQuantity}\nTotal: R$ ${(checkoutQuantity * 289.90).toFixed(2)}`;
            addLog(`✔️ Deep link estruturado: https://wa.me/5511999999999?text=${encodeURIComponent(message).substring(0, 30)}...`);
            addLog("🎉 Simulação finalizada com sucesso! Alta taxa de conversão garantida.");
          }, 600);
        }, 1000);
      }, 900);
    }, 700);
  };

  const handleCopyToken = (token: string, hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Dynamic Header Case Study Hero */}
      <div className="relative mb-14 bg-linear-to-r from-slate-900 to-indigo-950 rounded-3xl p-8 md:p-12 shadow-xl overflow-hidden border border-slate-800">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-semibold tracking-wider uppercase mb-4 border border-indigo-500/30">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span>UI/UX PRO MAX CASE STUDY</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
              A Engenharia de Experiência do <span className="text-indigo-400">Evidência Calçados</span>
            </h1>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              Explore o ecossistema interativo projetado para eliminar atritos de compra, fornecer resiliência offline absoluta com Firestore, e empoderar lojistas e vendedores através de uma interface de alta fidelidade visual.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setCurrentView('home')}
              className="px-5 py-3 text-xs bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-100 transition-all flex items-center space-x-2 shadow-lg"
            >
              <span>Ir para a Loja</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setCurrentView('admin')}
              className="px-5 py-3 text-xs bg-slate-800 text-slate-200 border border-slate-700 font-bold rounded-xl hover:bg-slate-700 transition-all"
            >
              Painel Admin
            </button>
          </div>
        </div>
      </div>

      {/* Case Navigation Tabs */}
      <div className="flex overflow-x-auto space-x-2 pb-4 mb-10 scrollbar-none border-b border-slate-200">
        <button
          onClick={() => setActiveSection('tokens')}
          className={`flex items-center space-x-2 px-5 py-3 rounded-xl text-xs font-bold tracking-wider transition-all uppercase whitespace-nowrap ${
            activeSection === 'tokens'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Palette className="h-4 w-4" />
          <span>Design Tokens & Sistema Visual</span>
        </button>

        <button
          onClick={() => setActiveSection('simulator')}
          className={`flex items-center space-x-2 px-5 py-3 rounded-xl text-xs font-bold tracking-wider transition-all uppercase whitespace-nowrap ${
            activeSection === 'simulator'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Smartphone className="h-4 w-4" />
          <span>Simulador de Perfis (Lógica Multinível)</span>
        </button>

        <button
          onClick={() => setActiveSection('checkout')}
          className={`flex items-center space-x-2 px-5 py-3 rounded-xl text-xs font-bold tracking-wider transition-all uppercase whitespace-nowrap ${
            activeSection === 'checkout'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <ShoppingCart className="h-4 w-4" />
          <span>Conversão de Checkout & Estoque</span>
        </button>

        <button
          onClick={() => setActiveSection('tech')}
          className={`flex items-center space-x-2 px-5 py-3 rounded-xl text-xs font-bold tracking-wider transition-all uppercase whitespace-nowrap ${
            activeSection === 'tech'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Database className="h-4 w-4" />
          <span>Arquitetura Offline & Decisões UX</span>
        </button>
      </div>

      {/* Grid Content Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main interactive area (Spans 2 cols) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* SECTION 1: DESIGN TOKENS */}
          {activeSection === 'tokens' && (
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xs border border-slate-100 space-y-10 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Design Tokens & Consistência</h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  A fundação estética do Evidência Calçados. Uma paleta sóbria, elegante e focada em calçados masculinos e femininos de luxo, apoiada em uma hierarquia de espaçamento modular.
                </p>
              </div>

              {/* Color Tokens Palette */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">A paleta cromática de alta fidelidade</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { name: 'Primary (Luxury Dark)', class: 'bg-[#1e1e24]', hex: '#1e1e24', text: 'text-white' },
                    { name: 'Secondary (Soft Nude)', class: 'bg-[#d8b48f]', hex: '#d8b48f', text: 'text-slate-900' },
                    { name: 'Accent Blue (Trust)', class: 'bg-[#0f4c81]', hex: '#0f4c81', text: 'text-white' },
                    { name: 'High-Contrast Red', class: 'bg-[#9a031e]', hex: '#9a031e', text: 'text-white' },
                    { name: 'Background Gray', class: 'bg-[#f9f9f9]', hex: '#f9f9f9', text: 'text-slate-900' },
                    { name: 'Slate Neutrals', class: 'bg-[#64748b]', hex: '#64748b', text: 'text-white' },
                    { name: 'Warm Off-White', class: 'bg-[#fcf8f2]', hex: '#fcf8f2', text: 'text-slate-900' },
                    { name: 'Success Accent', class: 'bg-[#2ec4b6]', hex: '#2ec4b6', text: 'text-white' }
                  ].map((color) => (
                    <div 
                      key={color.name}
                      onClick={() => handleCopyToken(color.name, color.hex)}
                      className="group cursor-pointer bg-slate-50 border border-slate-100 rounded-2xl p-3 transition-all hover:shadow-md hover:scale-[1.02] flex flex-col justify-between"
                    >
                      <div className={`h-16 w-full ${color.class} rounded-xl mb-3 flex items-center justify-center`}>
                        {copiedToken === color.name ? (
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-black/40 rounded-full text-white backdrop-blur-xs flex items-center gap-1`}>
                            <Check className="h-3 w-3" /> Copiado!
                          </span>
                        ) : (
                          <span className="opacity-0 group-hover:opacity-100 text-[10px] text-white font-mono bg-black/20 px-2 py-1 rounded-sm transition-all">
                            Copiar HEX
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-800">{color.name}</p>
                        <p className="text-[9px] font-mono text-slate-400 uppercase mt-0.5">{color.hex}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Typography Spec & Living Playground */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Par de Fontes do Sistema</h3>
                    <p className="text-[11px] text-slate-500 mt-1">Inter (Interface) + Space Grotesk/Mono (Acentos e Números)</p>
                  </div>
                  
                  {/* Controls */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedFont(selectedFont === 'sans' ? 'mono' : 'sans')}
                      className="px-3 py-1.5 text-[10px] bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-all uppercase"
                    >
                      Fonte: {selectedFont === 'sans' ? 'Sans-Serif' : 'Monospace'}
                    </button>
                    <button
                      onClick={() => {
                        setFontWeight(prev => {
                          if (prev === 'font-light') return 'font-normal';
                          if (prev === 'font-normal') return 'font-medium';
                          if (prev === 'font-medium') return 'font-semibold';
                          if (prev === 'font-semibold') return 'font-bold';
                          return 'font-light';
                        });
                      }}
                      className="px-3 py-1.5 text-[10px] bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-all uppercase"
                    >
                      Peso: {fontWeight.replace('font-', '')}
                    </button>
                    <button
                      onClick={() => setFontSize(prev => prev === 48 ? 20 : prev + 4)}
                      className="px-3 py-1.5 text-[10px] bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-all uppercase"
                    >
                      Tamanho: {fontSize}px
                    </button>
                  </div>
                </div>

                {/* Input Text Box */}
                <input
                  type="text"
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  placeholder="Digite para testar a tipografia..."
                  className="w-full px-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all"
                />

                {/* Typography Render Stage */}
                <div className="relative bg-slate-50 border border-slate-100 rounded-2xl p-8 min-h-[140px] flex items-center justify-center overflow-hidden">
                  <span className="absolute top-3 left-3 text-[9px] font-mono text-slate-400 uppercase tracking-widest">Área de Visualização Tipográfica</span>
                  <p 
                    style={{ fontSize: `${fontSize}px` }} 
                    className={`transition-all duration-200 leading-tight ${fontWeight} ${letterSpacing} ${
                      selectedFont === 'mono' ? 'font-mono text-slate-800' : 'font-sans text-primary'
                    }`}
                  >
                    {typedText || 'Evidência Calçados'}
                  </p>
                </div>
              </div>

              {/* Grid / Responsive Breakpoints visualizer */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Ajuste de Densidade (Responsividade do Grid)</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl text-center space-y-1">
                    <span className="text-xs font-bold text-slate-800">Mobile (≤ 640px)</span>
                    <p className="text-[10px] text-slate-500">1 coluna fluida. Navegação compactada por gaveta, focada em checkout imediato.</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl text-center space-y-1">
                    <span className="text-xs font-bold text-slate-800">Tablet (641px - 1024px)</span>
                    <p className="text-[10px] text-slate-500">2 a 3 colunas de produtos. Menus de filtro rápidos deslizantes laterais.</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl text-center space-y-1">
                    <span className="text-xs font-bold text-slate-800">Desktop (≥ 1025px)</span>
                    <p className="text-[10px] text-slate-500">4 colunas em grid fluido. Painéis administrativos expandidos sem sobreposição.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: ROLES & PANELS SIMULATOR */}
          {activeSection === 'simulator' && (
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xs border border-slate-100 space-y-8 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Painel Multinível (Simulador de Lógica de Negócios)</h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  O sistema ajusta inteligentemente o que é exibido baseado no privilégio do usuário logado. Alterne abaixo para simular as interfaces e ações exclusivas de cada papel.
                </p>
              </div>

              {/* Role Switches */}
              <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-50 rounded-2xl border border-slate-200/50">
                {[
                  { role: 'customer', label: 'Cliente', desc: 'Compra, WhatsApp e Histórico' },
                  { role: 'seller', label: 'Vendedor', desc: 'Atribui e Monitora Pedidos' },
                  { role: 'admin', label: 'Administrador', desc: 'Acesso Total e Catálogo' }
                ].map(r => (
                  <button
                    key={r.role}
                    onClick={() => {
                      setSimulatedRole(r.role as any);
                      setIsClaimed(false);
                      setOrderStatus('Pendente');
                    }}
                    className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl text-center transition-all ${
                      simulatedRole === r.role 
                        ? 'bg-white text-slate-900 shadow-md border border-slate-200' 
                        : 'text-slate-500 hover:bg-slate-100/60'
                    }`}
                  >
                    <span className="text-xs font-bold">{r.label}</span>
                    <span className="text-[9px] opacity-75 mt-0.5 hidden md:block">{r.desc}</span>
                  </button>
                ))}
              </div>

              {/* Simulation Box */}
              <div className="border border-slate-200 rounded-3xl p-6 bg-[#fcf8f2]/40 relative overflow-hidden">
                <div className="absolute top-4 right-4 flex items-center space-x-1.5 px-2 py-1 bg-white/80 backdrop-blur-xs rounded-full border border-slate-100 text-[10px] text-slate-500">
                  <div className={`h-1.5 w-1.5 rounded-full ${
                    simulatedRole === 'admin' ? 'bg-red-500' : simulatedRole === 'seller' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  <span className="font-mono uppercase tracking-wider">{simulatedRole} VIEW</span>
                </div>

                <div className="space-y-6">
                  {simulatedRole === 'customer' && (
                    <div className="space-y-4">
                      <div className="border-b border-slate-200/60 pb-3">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Interface do Consumidor</h4>
                        <p className="text-[10px] text-slate-500">Livre de distrações, catálogo limpo e carrinho persistente localmente.</p>
                      </div>
                      
                      {/* Sim Order card */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-mono text-slate-400">PEDIDO: EVC-4829</span>
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full font-semibold">Pendente</span>
                        </div>
                        <p className="text-xs font-bold text-slate-800">1x Mocassim de Couro Premium - Tam 41</p>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-50 text-[11px]">
                          <span className="text-slate-500">Total: <strong className="text-slate-800 font-bold">R$ 319,90</strong></span>
                          <span className="text-[10px] text-indigo-600 font-medium">Link do WhatsApp gerado automaticamente</span>
                        </div>
                      </div>

                      <div className="bg-white/60 p-3 rounded-xl border border-dashed border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
                        <UserCheck className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                        <span><strong>UX Advantage:</strong> Clientes têm checkout de 1-Clique. O pedido já formata a mensagem WhatsApp exata para o número da loja diminuindo o funil de drop-off.</span>
                      </div>
                    </div>
                  )}

                  {simulatedRole === 'seller' && (
                    <div className="space-y-4">
                      <div className="border-b border-slate-200/60 pb-3">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Painel do Vendedor Conectado</h4>
                        <p className="text-[10px] text-slate-500">Permite monitorar pedidos sem privilégios administrativos para alterar preços ou apagar registros.</p>
                      </div>

                      {/* Interactive simulation controls */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-mono font-bold text-slate-700">PEDIDO: {orderToClaim}</span>
                          <span className={`px-2 py-0.5 rounded-full font-bold ${
                            orderStatus === 'Pendente' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                          }`}>{orderStatus}</span>
                        </div>

                        <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono">
                          <p>Responsável: {isClaimed ? 'Vendedor Evidência (Você)' : 'Nenhum'}</p>
                          <p>Itens: Mocassim de Couro Premium (1x)</p>
                        </div>

                        <div className="flex gap-2">
                          {!isClaimed ? (
                            <button
                              onClick={() => {
                                setIsClaimed(true);
                                addLog(`👨‍💼 Vendedor reivindicou o pedido ${orderToClaim}`);
                              }}
                              className="w-full py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-bold hover:bg-indigo-700 transition-colors"
                            >
                              Reivindicar Atendimento do Pedido
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setOrderStatus('Confirmado');
                                  addLog(`✔️ Vendedor atualizou o pedido ${orderToClaim} para "Confirmado"`);
                                }}
                                className="w-1/2 py-2 bg-green-600 text-white rounded-lg text-[10px] font-bold hover:bg-green-700 transition-colors"
                              >
                                Marcar Confirmado
                              </button>
                              <button
                                onClick={() => {
                                  setIsClaimed(false);
                                  setOrderStatus('Pendente');
                                  addLog(`🔄 Vendedor liberou o pedido ${orderToClaim} de volta para fila`);
                                }}
                                className="w-1/2 py-2 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-200 transition-colors"
                              >
                                Liberar Fila
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="bg-white/60 p-3 rounded-xl border border-dashed border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
                        <ShieldCheck className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <span><strong>Segurança:</strong> Vendedores não podem editar produtos ou excluir catálogos. Isso reduz drasticamente erros acidentais e sabotagem de inventário.</span>
                      </div>
                    </div>
                  )}

                  {simulatedRole === 'admin' && (
                    <div className="space-y-4">
                      <div className="border-b border-slate-200/60 pb-3">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Visão Plena de Administrador</h4>
                        <p className="text-[10px] text-slate-500">Configuração global, métricas financeiras, e CRUD de estoque ativo.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Vendas Totais</p>
                          <p className="text-base font-extrabold text-slate-800">R$ 14.892,40</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Conversão de Leads</p>
                          <p className="text-base font-extrabold text-slate-800">78.4% via WA</p>
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs space-y-2 text-[11px]">
                        <p className="font-bold text-slate-700">Ações Administrativas Disponíveis:</p>
                        <ul className="list-disc list-inside space-y-1 text-slate-500">
                          <li>Cadastrar, editar e remover sapatos do catálogo de vendas</li>
                          <li>Controlar níveis e limites rígidos de estoque físico</li>
                          <li>Acompanhar desempenho e claims dos vendedores</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: STOCK & CONVERSION SANDBOX */}
          {activeSection === 'checkout' && (
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xs border border-slate-100 space-y-8 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Checkout Simulator & Conversão do WhatsApp</h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Teste o fluxo de ponta a ponta que reduz a fricção e garante que cada venda seja informada diretamente aos canais do WhatsApp com controle integrado de inventário físico.
                </p>
              </div>

              {/* Live interactive sandbox component */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">SandBox do Produto</h4>
                  
                  <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] text-slate-400 font-mono">CÓD: SAP-SOCIAL</span>
                        <h5 className="text-xs font-bold text-slate-800">Sapato Oxford Social Preto</h5>
                      </div>
                      <span className="text-xs font-bold text-[#9a031e]">R$ 289,90</span>
                    </div>

                    {/* Size selector simulation */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-slate-400">Tamanhos Disponíveis:</p>
                      <div className="flex gap-2">
                        {[38, 39, 40, 41, 42].map(size => (
                          <button
                            key={size}
                            onClick={() => setSelectedSize(size)}
                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                              selectedSize === size
                                ? 'bg-[#1e1e24] text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Stock indicator */}
                    <div className="flex justify-between items-center text-[10px] pt-1">
                      <span className="text-slate-500">Quantidade no Estoque:</span>
                      <div className="flex items-center space-x-1">
                        <span className="font-bold text-slate-800">{simulatedStock} pares</span>
                        <button 
                          onClick={() => setSimulatedStock(prev => Math.min(50, prev + 5))}
                          className="p-1 bg-slate-100 rounded-sm hover:bg-slate-200 text-slate-600"
                          title="Recarregar estoque do mockup"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* Purchase controls */}
                    <div className="flex items-center justify-between border-t border-slate-50 pt-2">
                      <span className="text-[10px] text-slate-500">Comprar:</span>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => setCheckoutQuantity(prev => Math.max(1, prev - 1))}
                          className="w-6 h-6 bg-slate-100 rounded-md hover:bg-slate-200 flex items-center justify-center font-bold"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold w-4 text-center">{checkoutQuantity}</span>
                        <button 
                          onClick={() => setCheckoutQuantity(prev => Math.min(simulatedStock, prev + 1))}
                          className="w-6 h-6 bg-slate-100 rounded-md hover:bg-slate-200 flex items-center justify-center font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={triggerCheckoutSimulation}
                    className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-2 shadow-xs"
                  >
                    <Play className="h-4 w-4" />
                    <span>Executar Simulação de Compra</span>
                  </button>
                </div>

                {/* Simulated Terminal and flow diagram */}
                <div className="bg-slate-900 rounded-2xl p-4 text-slate-300 font-mono text-[10px] flex flex-col justify-between h-full min-h-[250px] border border-slate-800 shadow-lg">
                  <div className="space-y-2 overflow-y-auto max-h-[190px] pr-1">
                    <p className="text-slate-400 border-b border-slate-800 pb-1.5 flex items-center justify-between font-bold">
                      <span>CONSOLE DE DIAGNÓSTICO</span>
                      <span className="text-green-400 flex items-center gap-1">
                        <Activity className="h-3 w-3 animate-pulse" /> SIMULADOR ACTIVE
                      </span>
                    </p>
                    {consoleLogs.map((log, index) => (
                      <p key={index} className="leading-relaxed whitespace-pre-wrap">{log}</p>
                    ))}
                  </div>

                  {/* Dynamic Progress indicator */}
                  <div className="border-t border-slate-800 pt-3 flex justify-between items-center text-[9px] text-slate-500 mt-2">
                    <span className="font-sans font-bold">ESTADO ATUAL:</span>
                    <div className="flex gap-1.5 font-sans">
                      {['stock_check', 'local_save', 'firestore_sync', 'whatsapp_ready'].map((step, i) => (
                        <span 
                          key={step} 
                          className={`px-1.5 py-0.5 rounded-sm font-semibold tracking-wider text-[8px] uppercase ${
                            checkoutStatus === step 
                              ? 'bg-indigo-500 text-white animate-pulse'
                              : consoleLogs.some(l => l.includes(`Passo ${i+1}`))
                              ? 'bg-green-900/40 text-green-300'
                              : 'bg-slate-800 text-slate-600'
                          }`}
                        >
                          S{i+1}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: ARCHITECTURE & UX DECISIONS */}
          {activeSection === 'tech' && (
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xs border border-slate-100 space-y-8 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-2 font-sans tracking-tight">Decisões Arquiteturais e de Design System</h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Comprometimento absoluto com performance, zero quebras no fluxo de usuário e tolerância a falhas em conexões 4G instáveis.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                  <div className="h-8 w-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center mb-1">
                    <Wifi className="h-4 w-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">Tolerância a Falhas Offline</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Se o backend do Firestore falhar (offline do usuário ou problemas de autenticação), o app intercepta e grava o estado localmente no LocalStorage, mantendo o funil de checkout do WhatsApp intacto sem apresentar mensagens de erro ou travar a finalização.
                  </p>
                </div>

                <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                  <div className="h-8 w-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center mb-1">
                    <Share2 className="h-4 w-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">Conversão de Atendimento</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Substituímos gateways de pagamento complexos por uma integração robusta de WhatsApp. Isso gerou mais conversões locais, permitindo negociação direta de crediário próprio (crediário) e detalhes de entrega.
                  </p>
                </div>

                <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                  <div className="h-8 w-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mb-1">
                    <Layers className="h-4 w-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">Camadas Organizacionais de Estado</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Separação estrita de tipos em types.ts e gerenciamento centralizado de mutações de catálogo em AppContext.tsx, prevenindo re-renderizações desnecessárias e preservando o cache nas mudanças de tela.
                  </p>
                </div>

                <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                  <div className="h-8 w-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center mb-1">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">Proteção de Rotas Baseada em Regras</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Interfaces administrativas isoladas dinamicamente via JSX baseado em papéis rígidos (admin / seller / customer), eliminando riscos de vazamento de ferramentas de estoque para visitantes casuais.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right side: Case Metrics, Quick Facts & Interactive Mini-Simulator (1 col) */}
        <div className="space-y-8">
          
          {/* Quick Metrics Badge */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md border border-slate-800 space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400">KPIs do Design System</h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Tempo de Carregamento</span>
                  <span className="text-green-400 font-bold">~0.6s (Excelente)</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full w-[94%] bg-green-500 rounded-full"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Fricção no Checkout</span>
                  <span className="text-indigo-400 font-bold">Mínima (1-Clique WA)</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full w-[98%] bg-indigo-500 rounded-full"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Retenção de Layout</span>
                  <span className="text-indigo-400 font-bold">Consistente</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full w-[90%] bg-indigo-500 rounded-full"></div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 space-y-3">
              <div className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-400 shrink-0" />
                <span>Fontes otimizadas de alta legibilidade (Inter/JetBrains)</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-400 shrink-0" />
                <span>Ausência de imagens quebras ou vazamento de margem</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-400 shrink-0" />
                <span>Navegação sem flickering e com animações leves</span>
              </div>
            </div>
          </div>

          {/* Interactive Quick Size Selector Microinteraction test */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Playground de Micro-interação</h3>
            <p className="text-[10px] text-slate-500">
              O botão de tamanho possui micro-animações magnéticas e efeito "Ripple" sutil para confirmar visualmente a escolha do tamanho do calçado. Clique abaixo para ver o retorno de feedback.
            </p>
            
            <div className="flex flex-wrap gap-2.5 pt-2">
              {[34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44].map((size) => {
                const isSelected = selectedSize === size;
                return (
                  <button
                    key={size}
                    onClick={() => {
                      setSelectedSize(size);
                      // Custom web audio API speech synth for premium accessible experience (haptic feedback emulator)
                      if ('speechSynthesis' in window) {
                        try {
                          const speech = new SpeechSynthesisUtterance(size.toString());
                          speech.volume = 0.05;
                          speech.rate = 1.6;
                          window.speechSynthesis.speak(speech);
                        } catch(e){}
                      }
                    }}
                    className={`relative overflow-hidden w-11 h-11 rounded-xl font-mono text-xs font-bold transition-all duration-200 cursor-pointer ${
                      isSelected 
                        ? 'bg-[#1e1e24] text-white scale-110 shadow-md ring-2 ring-indigo-400/50' 
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 hover:scale-[1.03]'
                    }`}
                  >
                    <span>{size}</span>
                    {isSelected && (
                      <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="pt-2 flex justify-between items-center text-[9px] text-slate-400">
              <span>Tamanho selecionado: <strong className="text-slate-700">{selectedSize}</strong></span>
              <span>Haptic feedback: Falado via TTS</span>
            </div>
          </div>

          {/* Core UX principles checklist */}
          <div className="bg-[#fcf8f2] border border-[#ebd0be]/50 rounded-3xl p-6 space-y-4">
            <h4 className="text-xs font-bold text-[#5c3e21] uppercase tracking-wider">Pilares de Engajamento</h4>
            <ul className="space-y-3 text-[11px] text-slate-700">
              <li className="flex gap-2.5">
                <span className="text-indigo-600 font-bold">1.</span>
                <span><strong>Simplicidade Absoluta:</strong> Foco em imagens grandes do calçado. O usuário decide em menos de 3 segundos.</span>
              </li>
              <li className="flex gap-2.5">
                <span className="text-indigo-600 font-bold">2.</span>
                <span><strong>Navegação sem Atrito:</strong> Sem telas de carregamento desnecessárias ou loadings infinitos.</span>
              </li>
              <li className="flex gap-2.5">
                <span className="text-indigo-600 font-bold">3.</span>
                <span><strong>Fidelidade e Confiança:</strong> Cores fiéis e indicação expressa se possui Crediário Próprio Facilitado.</span>
              </li>
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
};
