# Contexto e Regras de Negócio - Evidência Calçados

Este documento centraliza todas as regras de negócio, decisões de arquitetura, integrações e convenções de interface do projeto E-commerce Evidência Calçados, facilitando o desenvolvimento contínuo em diferentes máquinas ou por novos desenvolvedores.

---

## 1. Arquitetura e Stack Tecnológico
- **Frontend:** React 19 + TypeScript + Vite.
- **Estilização:** Tailwind CSS (Estética Premium "Apple-like", limpa, com muito respiro, cantos arredondados padrão Apple `rounded-2xl` e `rounded-3xl`, sombras ultra-leves e grid de 8pt).
- **Cores da Marca e Destaque:** 
  - Azul Institucional Evidência (`#003B73` / `#006EDB` / `#008CFF`) para âncoras visuais, cabeçalhos, banners de alto impacto e estados primários.
  - Azul Apple (`#0071E3` / `#0A84FF`) para status ativos, foco e CTAs de pedidos.
  - Verde Esmeralda (`emerald-600`) para badges de confirmação, frete grátis e ações de sucesso.
  - Âmbar / Dourado (`amber-400` / `#FFC928`) para badges de campanhas de ofertas, saldão e destaques promocionais.
  - Roxo Suave (`purple-600` / `purple-400`) para a modalidade exclusiva de "Retirada na Loja".
- **Backend / BaaS:** Firebase (Authentication e Cloud Firestore para banco de dados em tempo real, produtos, carrinho, pedidos e crediário).
- **Backend Proxy (Node.js/Express):** Arquivo `server.ts` configurado para lidar com integrações externas e segurança (ex: proxy `/mp-api/payments` para evitar CORS no Mercado Pago, cotação de frete e webhooks).

---

## 2. Integração com ERP (MobLink)
- O catálogo de produtos é originado no ERP **MobLink**.
- O sistema possui rotinas de sincronização automática e manual para baixar dados do MobLink e persistir no Firestore.
- **Regras Críticas do Catálogo:**
  - **Filtro de Foto Obrigatória:** Apenas produtos com foto real e válida (`hasProductValidPhoto`) e estoque positivo (`stock > 0`) aparecem na vitrine e nos menus de categoria. Imagens placeholders genéricas são descartadas.
  - **Categorias e Subcategorias Dinâmicas:** A taxonomia é resolvida via código de classificação ERP (`resolveClassificacao`) e nome normalizado, sem engessamento rígido de layout.
  - **Consulta em Tempo Real:** Ao abrir a página do produto, o estoque e a disponibilidade são consultados diretamente para prevenir vendas de produtos esgotados.
  - **Sincronização Individual por ID:** O painel administrativo permite sincronizar um produto avulso digitando seu ID do MobLink (`getSingleProdutoMoblink(id)`), acelerando a atualização sem exigir sincronização em massa.

---

## 3. Regras de Carrinho, Preços e Checkout
- **Moeda Exclusiva:** Real Brasileiro (BRL / R$).
- **Variação Dinâmica de Preços por Pagamento:**
  - O MobLink fornece preços diferenciados conforme o meio de pagamento (`precoVista` para Pix, `precoCartao` para Cartão de Crédito).
  - O carrinho e o checkout recalculam o valor total ativamente conforme a seleção entre Pix ou Cartão.
- **Modalidades de Entrega:**
  1. **Entrega no Endereço (Cálculo Automático por CEP):** Cotação em tempo real via provedor ativo (Melhor Envio / Correios / Jadlog / Motoboy Local para Caxias-MA). O frete da opção escolhida é somado diretamente ao valor final da compra.
  2. **Retirada na Loja Física:** Frete GRÁTIS (R$ 0,00). O cliente retira diretamente no balcão da loja física no Centro de Caxias - MA.
- **Formas de Pagamento no Checkout:**
  - O checkout online aceita **estritamente apenas Cartão de Crédito e PIX**.
  - **Pix:** QR Code dinâmico e Pix Copia e Cola gerados via Mercado Pago, com verificação e conciliação em tempo real.
  - **Cartão de Crédito:** Processamento seguro tokenizado via Mercado Pago SDK v2 com suporte a parcelamento em até 10x sem juros.
  - **Desacoplamento do Crediário:** O Crediário Próprio não é mais uma opção tradicional de pagamento no checkout. Possui módulo dedicado para avaliação de limite e solicitação de compra via carrinho (`/meu-crediario`).
  - **Rastreabilidade Bancária:** O ID da transação (`paymentId`) é gravado no pedido para consulta e conciliação bancária.

---

## 4. Sistema Integrado de Frete e Logística (Melhor Envio)

### A. Arquitetura Desacoplada de Provedores (`src/services/shipping/`)
- **Interface Base (`IShippingProvider`):** Define o contrato de frete (cotação, autenticação, etiquetas e rastreamento), permitindo alternar de provedor via variável de ambiente (`ACTIVE_SHIPPING_PROVIDER`) sem alterar telas.
- **Factory Pattern (`ShippingService`):** Retorna o provedor ativo (padrão: `MelhorEnvioAdapter`).
- **Adapter do Melhor Envio (`MelhorEnvioAdapter`):**
  - Integração com API REST v2 do Melhor Envio (`POST /api/v2/me/shipment/calculate`).
  - **Fallback Regional Dinâmico Inteligente:** Caso a API esteja em modo sandbox sem conexão externa ou com credenciais indisponíveis, calcula preços e prazos dinâmicos por faixas de CEP com base na distância de Caxias-MA:
    - *Caxias-MA (6560)*: Opção Motoboy Local R$ 10,00 (1 dia), Jadlog R$ 16,90, PAC R$ 18,50, SEDEX R$ 26,00.
    - *Maranhão (65)*: Jadlog R$ 20,50, PAC R$ 22,00, SEDEX R$ 32,00 (2 a 4 dias).
    - *Piauí (64)*: Jadlog R$ 19,50, PAC R$ 21,00, SEDEX R$ 30,00.
    - *Nordeste (40-63)*: Jadlog R$ 26,00, PAC R$ 28,50, SEDEX R$ 42,00.
    - *Sudeste (01-39)*: Jadlog R$ 31,50, PAC R$ 34,90, SEDEX R$ 58,00.
    - *Centro-Oeste (70-79)*: Jadlog R$ 33,00, PAC R$ 36,00, SEDEX R$ 62,00.
    - *Sul (80-99)*: Jadlog R$ 39,00, PAC R$ 42,00, SEDEX R$ 74,00.
    - *Norte (66-69)*: Jadlog R$ 36,00, PAC R$ 39,00, SEDEX R$ 68,00.
  - **Selo Inteligente:** `enrichOptionsWithBadges` destaca automaticamente a opção "Mais Barato" (Sparkles) e "Mais Rápido" (⚡).

### B. Gestão de Caixas e Cubagem (`src/services/boxService.ts` e `AdminBoxManager.tsx`)
- **Coleção `boxes` no Firestore:** Cadastro e personalização de caixas de envio pelo lojista (Dimensões em cm: Altura, Largura, Comprimento, Peso em kg e capacidade máxima de pares de calçado).
- **Caixa Padrão Automática:** Caixa de calçados convencional (12 x 20 x 30 cm, 0.8 kg) para cálculo inicial.
- **Painel Administrativo:** Aba "Caixas de Envio" integrada no `AdminPanel.tsx` para gerenciar embalagens ativas.

### C. Experiência de Checkout (`CheckoutPage.tsx` e `ShippingCalculator.tsx`)
- **Sem Redundâncias de Formulário:** Os botões do topo guiam entre 🚚 **Entregar no meu Endereço** e 🏬 **Retirar na Loja Física (Grátis)**.
- **Preferência pelo Endereço Cadastrado:** Se o cliente já possui endereço salvo, ele é selecionado e seu CEP dispara automaticamente a cotação de frete limpa (com `hideInput={true}`).
- **Soma Real:** O frete selecionado é somado diretamente ao subtotal dos produtos no total da compra.
- **Segurança de Variáveis:** O token da API reside estritamente no backend Node.js (`server.ts`), impedindo vazamento de tokens para o bundle do navegador.
- **Validação e Detecção de UF por CEP:** O checkout e a criação de pedidos utilizam `getUfFromCep(cep)` para deduzir a UF de destino oficial pelas faixas nacionais de CEP, corrigindo eventuais cadastros manuais com UF incorreta.
- **Gerenciamento de Endereços Extras:** O cliente pode cadastrar novos endereços e remover endereços adicionais livremente com o botão de lixeira, preservando seu endereço padrão.

### D. Emissão de Etiquetas, Rastreamento em Tempo Real e Eliminação de Código Morto
- **Etiqueta Local (Romaneio Próprio):** Permitida exclusivamente para entregas municipais da própria loja (Caxias urbana).
- **Melhor Envio:** Quando a integração externa com Melhor Envio falhar, o sistema **nunca emite etiqueta local como fallback disfarçado**. O erro real é exibido na tela para garantir que nenhuma encomenda seja despachada sem registro oficial.
- **Sincronização em Tempo Real (`ShippingTrackerService`):** Ao clicar em "Atualizar Status" ou entrar no painel, o sistema consulta a API do Melhor Envio via proxy (`/api/shipping/track`), sincroniza o Firestore com `setDoc(..., { merge: true })`, atualiza o estado React instantaneamente e projeta o histórico de eventos de movimentação no `ShippingInfoCard` e no `OrderHistory`.
- **Hierarquia Anti-Regressão e Código Oficial:** Rastreamentos nunca regridem um pedido `Em Trânsito` ou `Entregue` para `Em Preparação`, e priorizam o código oficial da transportadora (`tracking` > `self_tracking` > `melhorEnvioId`).
- **Detecção de Divergência Métrica:** Diferenças de peso/cubagem cobradas pela transportadora na postagem são registradas dinamicamente em `order.metricDivergence` com alerta visual no painel do administrador.
- **Dead Code Elimination Concluída:** Removidos todos os métodos mortos de teste offline (`getSandboxMockTracking`, `getSandboxMockLabel`) e condicionais hardcoded de prints de teste.

---

## 5. Gestão de Pedidos (Vendas & Pedidos / Meus Pedidos)

### A. Ciclo de Vida e Etapas de Rastreio (5 Etapas Sincronizadas)
O ciclo do pedido segue uma régua sincronizada entre a visão do Cliente (`OrderTimeline.tsx`) e do Administrador (`AdminStageStepper.tsx`):
1. **Etapa 1:** `Pedido Recebido` (Status: `Pendente`) — Pedido criado no banco aguardando liquidação.
2. **Etapa 2:** `Pagamento Aprovado` (Status: `Confirmado`) — Pagamento verificado e conciliado.
3. **Etapa 3:**
   - Para envio convencional: `Em Preparação` (Status: `Em Preparação`, ícone `Package`). Acionado quando a etiqueta é gerada ou liberada no Melhor Envio.
   - Para Retirada na Loja: `Pronto p/ Retirada` (Status: `Em Preparação`, ícone `Store`).
4. **Etapa 4:**
   - Para envio convencional: `Em Trânsito` (Status: `Em Trânsito`, ícone `Truck`). Acionado quando o produto é postado na agência da transportadora (`posted`) ou registra deslocamento em rota (`in_transit`).
5. **Etapa 5:**
   - Para envio convencional: `Entregue` (Status: `Entregue`, ícone `PackageCheck`).
   - Para Retirada na Loja: `Retirado na Loja` (Status: `Entregue`, ícone `ShoppingBag`).

### B. Modalidade Exclusiva "Retirada na Loja"
- **Local:** Loja Física Evidência Calçados — Rua Afonso Pena, 295 - Centro, Caxias - MA.
- **Horários:** Segunda a Sexta: 08h às 18h | Sábados: 08h às 13h.
- **Frete:** Sempre isento (R$ 0,00).
- **Feedback Visual Dedicado:**
  - Banner dinâmico e intuitivo na tela do cliente quando o pedido atinge a Etapa 3 ("Pronto p/ Retirada no Balcão").
  - Identificadores roxos suaves nos cards de envio e nos detalhes do pedido.

### C. Vínculo com o Sistema Local (ERP/PDV) — Campo `localSaleId`
- O lojista pode vincular o número da venda emitida no seu sistema local/físico (PDV da loja física) ao pedido da loja online.
- Campo `localSaleId` persistido no pedido no Firestore.
- Exibição de badge elegante no cabeçalho do pedido (`🖥️ ERP: #10452`).
- Edição rápida e não intrusiva com suporte à tecla **Enter**.
- A barra de busca do painel administrativo (Spotlight search) permite localizar qualquer pedido digitando o ID da venda local.

### D. Integridade de Dados e Prevenção de Perda no Firestore
- **Sanitização Recursiva (`cleanUndefinedProperties`):** Remove propriedades `undefined` de objetos e arrays aninhados antes de qualquer envio ao Firestore, eliminando erros silenciosos.
- **Preservação de Dados em Atualizações Parciais:** Funções de atualização (`updateOrderStatus`, `updateOrderFreight`, etc.) realizam merge com o objeto completo em memória antes de enviar, evitando perda de dados do cliente ou itens do carrinho.
- **Auto-cura no Listener em Tempo Real:** Se o Firestore retornar um documento temporariamente inconsistente, o sistema mescla com o cache local antes de propagar o estado e re-sincroniza o banco.

---

## 6. UI / UX Design Guidelines (Padrão Apple HIG)
- **Design System Inspirado na Apple:**
  - Tipografia de alta legibilidade, números tabulares para moedas (`font-mono font-bold`).
  - Cantos arredondados generosos (`rounded-2xl`, `rounded-3xl`, `rounded-full`).
  - Contraste suave: Fundo geral neutro (`bg-[#f5f5f7]` ou `bg-slate-50`), cartões brancos com elevação e efeito vidro translúcido (`backdrop-blur-xl`).
- **Sistema de Espaçamento de 8 Pontos (8pt Grid System):**
  - Espaçamentos harmônicos e previsíveis: `8px (gap-2)`, `12px (gap-3)`, `16px (p-4)`, `20px (p-5)`, `24px (p-6)`.
  - Proibido o uso de `justify-between` com alturas esticadas artificiais em cards de formulário/resumo, prevenindo vácuos visuais indesejados.
- **Régua de Acompanhamento (Timeline):**
  - Nós de 36px (`w-9 h-9`) perfeitamente alinhados com a linha conectora a 18px do topo.
  - A etapa em andamento exibe seu ícone real com escala ampliada (`scale-105`), anel luminoso translúcido e badge de status ativo.

---

## 7. Estrutura Modular dos Componentes de Pedidos (`src/components/orders/`)
A arquitetura de pedidos foi completamente modularizada em componentes atômicos e reutilizáveis:
- `OrderStatusBadge.tsx`: Badge semântica de status do pedido com ícone e cores temáticas.
- `PaymentStatusBadge.tsx`: Badge de status de liquidação do pagamento.
- `OrderItemCard.tsx`: Card de produto do pedido (versões cliente e admin) com imagem, tamanho, quantidade e subtotal.
- `OrderItemsGrid.tsx`: Grade responsiva que agrupa e lista os itens comprados.
- `OrderTimeline.tsx`: Régua horizontal de 4 etapas para a visão do cliente.
- `AdminStageStepper.tsx`: Régua de progresso interativa da visão administrativa.
- `AdminStageSelector.tsx`: Dropdown popover estilo macOS para avanço e troca de etapas de pedidos.
- `CustomerInfoCard.tsx`: Card de dados do comprador, contato, CPF, RG e link direto para conversa no WhatsApp.
- `PaymentInfoCard.tsx`: Resumo financeiro, parcelamento, comprovante bancário, ID do ERP e selo de segurança.
- `ShippingInfoCard.tsx`: Modalidade de entrega, endereço formatado e regras de envio.
- `FreightStatusCard.tsx`: Gestão e precificação de frete para cidades externas.
- `AdminOrderCard.tsx`: Card mestre do pedido na visão do lojista.
- `AdminOrdersList.tsx`: Painel completo de listagem de vendas com filtros por etapa, pagamento e vendedor.

---

## 8. Módulo de Crediário Próprio & Diretrizes de Exibição na Loja

### A. Desacoplamento da Vitrine e do Checkout
- **Sem Poluição Visual na Home:** As menções diretas de crediário foram completamente removidas da barra de avisos do topo (Header) e dos Hero Banners principais, priorizando as ofertas e a experiência de compra por cartão e Pix.
- **Seção da Vitrine Removida:** A seção antiga "Crediário & Facilidades" no corpo da home foi ocultada para manter a vitrine 100% focada na descoberta de produtos e coleções.
- **Barra Superior de Benefícios Atualizada:**
  - 💳 **Até 10x sem juros** no cartão de crédito.
  - 🚚 **Entrega Rápida** em Caxias - MA e Região.
  - 💬 **WhatsApp Oficial** (99) 98468-4867.
- **Checkout:** O checkout online não processa crediário diretamente; aceita estritamente **Cartão de Crédito** e **PIX**. Na etapa de pagamento há apenas uma indicação informativa sobre a modalidade de crédito.

### B. Módulo Especializado do Cliente (`MeuCrediario.tsx`)
Acessível exclusivamente via menu de navegação ou link direto (`/meu-crediario`), estruturado em 3 abas principais:
1. **Aba 1 (Solicitar Avaliação de Crédito):** Formulário onde o cliente informa renda mensal, profissão, telefone, referência pessoal e limite pretendido. Exibe o status da análise em tempo real (Aprovado, Em Análise ou Pendente).
2. **Aba 2 (Comprar com Crediário / Importar Carrinho):**
   - Importação em 1 clique dos itens atuais do carrinho.
   - Simulação de parcelamento em até 6x no carnê próprio sem juros.
   - Envio da **Solicitação de Compra via Crediário** para aprovação da equipe da loja física.
   - Histórico completo de pedidos de crediário anteriores.
3. **Aba 3 (Carnês & Boletos ERP):** Consulta das parcelas e carnês do MobLink ERP por CPF com quitação imediata via Pix e baixa automática.

### C. Painel Administrativo de Crediário (`CreditManagement.tsx`)
- Gerenciamento unificado no `AdminPanel.tsx`:
  - **Aba 1: Avaliações de Crédito (`CreditEvaluationsList.tsx`):** Aprovação/recusa de limites de crédito com envio direto de mensagem no WhatsApp do cliente via `wa.me`.
  - **Aba 2: Solicitações de Compra (`CreditOrdersList.tsx`):** Aprovação das compras solicitadas a partir do carrinho, verificação de itens, parcelas e endereço.

---

## 9. Navegação Dinâmica de Categorias & Subcategorias (`categoryNavigationUtils.ts`)

### A. Lógica Centralizada de Público-Alvo e Subcategorias
- Implementada em `src/components/products/utils/categoryNavigationUtils.ts`:
  - **`isProductInAudience(product, audience)`:** Qualificação estrita por público (**Feminino**, **Masculino**, **Infantil**) através dos códigos oficiais de classificação do MobLink ERP:
    - *Feminino*: códigos iniciados por `001.001`, `002.001`, ou termos normalizados na categoria/descrição.
    - *Masculino*: códigos iniciados por `001.002`, `002.002`, etc.
    - *Infantil*: códigos iniciados por `001.003`, `002.003`, "infantil", "kids", "bebê".
  - **`extractAudienceSubcategories(products, audience)`:** Varredura dinâmica que extrai apenas subcategorias cadastradas com produtos ativos (`visible !== false`), estoque disponível (`stock > 0`) e foto real cadastrada (`hasProductValidPhoto`). Ordena por contagem decrescente de itens.
  - **`buildCategoryUrl` & `matchSubcategorySlug`:** Geração e resolução de URLs canônicas (`?categoria=feminino&subcategoria=sandalias`).

### B. Navegação Centralizada no Menu Superior
- Para evitar duplicidade de componentes visuais na vitrine, toda a navegação por Feminino, Masculino e Infantil vive no **Header e Mega-menu** (`Header.tsx`) e na página especializada de listagem (`CategoryPage.tsx`).
- Suporte a sincronização bidirecional de parâmetros de URL e histórico de navegação (`popstate`).

---

## 10. Busca Inteligente da Vitrine & Filtros Unificados (`StorefrontSearchBar.tsx`)

- Implementada em `src/components/products/storefront/StorefrontSearchBar.tsx` com o utilitário centralizado `productFilterUtils.ts`:
  - **Algoritmo de Correspondência Inteligente (`matchProductSearch`):** Busca tolerante a acentos e caracteres especiais, cobrindo:
    - Nome do produto e descrição.
    - Código de referência interna e ID MobLink.
    - Código de barras (EAN/GTIN).
    - Marca / Fabricante.
    - Categoria e Subcategoria ERP.
    - Público-alvo (Feminino, Masculino, Infantil).
  - **Placeholders Dinâmicos Rotativos:** Textos contextuais que alternam suavemente convidando o cliente a buscar por marcas, tamanhos ou modelos.
  - **Histórico Recente & Termos Sugeridos:** Armazenamento local das últimas pesquisas e badges de termos rápidos para busca instantânea com 1 clique.

---

## 11. Arquitetura dos Hero Banners da Home (`src/components/Hero.tsx`)

- Componente de carrossel de alto impacto com design Apple-like, fundo azul gradiente padrão da marca (`bg-gradient-to-br from-[#003B73] via-[#006EDB] to-[#008CFF]` no tema claro) e tipografia de alto contraste:
  - **Orientado a Objetos e Totalmente Dinâmico:** Utiliza tipagem `HeroSlide[]` e botões customizáveis `HeroSlideCTA[]`.
  - **Banners Padrão Focados em Vendas & Moda:**
    - **Slide 1 (Campanha de Ofertas):** Badge *"CAMPANHA DE OFERTAS"*, título *"Super Descontos de até 50% OFF"*, CTAs *"Aproveitar Ofertas"* e *"Ver Catálogo Completo"*.
    - **Slide 2 (Coleção Feminina):** Badge *"COLEÇÃO FEMININA"*, título *"Charme, sofisticação e conforto extremo"*, CTAs *"Ver Moda Feminina"* e *"Ver Catálogo Completo"*.
    - **Slide 3 (Coleção Masculina):** Badge *"COLEÇÃO MASCULINA"*, título *"Estilo moderno e robustez incomparável"*, CTAs *"Explorar Linha Masculina"* e *"Ver Catálogo Completo"*.
  - **Sincronização com CMS / Firestore:** Compatível com os banners gerenciados no painel administrativo (`AdminPanel.tsx`) através de `AppContext.tsx` (`DEFAULT_HERO_BANNERS`).
  - **Autoplay Inteligente:** Pausa automaticamente ao passar o cursor (`onMouseEnter` / `onMouseLeave`) e botões discretos com glassmorphism.

---

## 12. Workflow de Desenvolvimento, Git & Testes Automatizados

- **Branch de Desenvolvimento:** Todo o código ativo é versionado e testado na branch **`dev`** (e sincronizado com `origin/dev`).
- **Suíte de Testes Automatizados (`tests/`):**
  - `tests/test-category-navigation.ts`: Testes unitários para qualificação de público-alvo, extração de subcategorias ativas e roteamento por slug.
  - `tests/test-smart-search.ts`: Testes automatizados cobrindo a lógica de busca inteligente e filtros do catálogo.
- **Portões de Qualidade Obrigatórios Antes de Qualquer Commit:**
  1. `npx tsc --noEmit` — 0 erros de tipagem TypeScript.
  2. `npx tsx tests/<test-file>.ts` — 100% dos testes passando.
  3. `npm run build` — compilação bem-sucedida do bundle Vite e do servidor proxy Node.js (`server.ts`).
- **Idioma Padrão:** Toda a interface, feedbacks visuais, mensagens de erro e respostas ao usuário devem ser exclusivamente em **Português do Brasil (pt-BR)**. Código-fonte, variáveis e comentários técnicos permanecem em inglês.
