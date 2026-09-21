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

---

## 13. Pipeline de Otimização de Fotos, Conversão WebP e Preservação (`imageOptimizationService.ts` & `supabaseStorageService.ts`)

- **Formato Mandatório WebP:** Todas as imagens enviadas para o catálogo de produtos são convertidas para o formato de alta performance **WebP** com qualidade 80% e geração automática de miniaturas (*thumbnails*) quadradas de **150x150 px**.
- **Limite de 8 MB com Compressão Adaptativa:**
  - Suporte nativo a fotos de celulares modernos em alta resolução de até **8 MB**.
  - Algoritmo de compressão adaptativa em duas fases: fotos que excedam 500KB na primeira passagem sofrem compressão secundária automática garantindo arquivos finais extremamente leves (**entre 150KB e 300KB**, redução de até 98% do tamanho original).
  - Redimensionamento proporcional limitando a largura/altura máxima a **1600px**, preservando nitidez de tecidos e texturas.
  - Processamento no navegador 100% compatível com Canvas 2D (zero dependências C++ nativas no cliente), mantendo o build do Vite leve e seguro.
- **Preservação Absoluta de Fotos Existentes e Links Externos (`preserveExistingImages`):**
  - Fotos já cadastradas no Firestore e URLs de fornecedores/CDNs externas **nunca são apagadas ou sobrescritas acidentalmente** durante novos uploads ou edições.
- **Exclusão Limpa em Cascata (`deleteImageFromSupabase`):**
  - Ao excluir uma foto do Supabase Storage, a miniatura correspondente (`_thumb.webp` ou subpasta `thumbnails/`) é detectada e excluída em lote no bucket.
  - Links externos que não pertencem ao Supabase são desvinculados com segurança sem disparar requisições ao bucket.
  - Desvinculação automática de variações de cor (`colorImages`, `colorImageMap`) e redefinição da imagem de capa (`imageUrl` e `foto_uri`).
  - Prevenção do bug de ressurreição de fotos deletadas ao salvar o formulário (`handleSaveProductEnrichment`).
- **Tratamento de Produtos sem Desmembramento de Grade:**
  - Para produtos de estoque único global ou que não possuem variações de grade cadastradas no ERP (ex: cosméticos, cremes, carteiras, itens tamanho único), a seleção suspensa `-- Cor da foto --` debaixo das miniaturas é **completamente ocultada**, mantendo a galeria limpa e focada na foto e nos botões de capa e lixeira.

---

## 14. Menu Lateral & Painel Gestor Reorganizado com Menu Sanduíche (`AdminPanel.tsx`)

- **Remoção de Itens Obsoletos:**
  - *Adicionar Produto*: Removido do menu lateral, uma vez que todo o catálogo é importado e sincronizado de forma centralizada pelo **Integrador MobLink ERP**.
  - *Ordem das Seções*: Removido do menu lateral, pois a arquitetura e a sequência de seções da Home vitrine são limpas e fixadas no código.
- **Menu Sanduíche Responsivo (Mobile & Desktop):**
  - **No Mobile (`md:hidden`):** Barra de topo fixa elegante com botão sanduíche (☰ / ✕), logo do Evidência CMS e atalho direto para visualizar a loja virtual (👁️). Ao tocar no botão, abre-se uma gaveta lateral (*drawer*) suave com *backdrop blur* escurecido. Ao selecionar qualquer aba, o menu se fecha automaticamente.
  - **No Desktop:** Botão sanduíche integrado na barra lateral permitindo **recolher o menu lateral** para liberar 100% do espaço de tela (*Full View*), ideal para tabelas com muitos dados (Estoque, Vendas e Financeiro).
  - **Barra Superior Integrada (Sem Sobreposição):** Quando o menu está recolhido no desktop, uma barra de navegação no fluxo normal do documento exibe o botão `[ ☰ Abrir Menu ]` acompanhado do logo e do botão de "Ver Loja", garantindo que títulos, métricas e cards de dados nunca fiquem cobertos.
- **Reorganização dos Grupos de Navegação por Prioridade Operacional:**
  1. **📊 DASHBOARD & VENDAS:** Visão Geral & Métricas -> Vendas & Pedidos -> Dashboard Financeiro -> Crediário Próprio -> Base de Clientes & CRM -> Vendedores (Cadastros).
  2. **📦 CATÁLOGO & ESTOQUE:** Integrador MobLink ERP (destaque no topo do grupo) -> Gestão de Estoque -> Categorias da Loja -> Caixas & Frete (Melhor Envio).
  3. **✨ CMS & VITRINE:** Banners Principais (Hero) -> Ofertas & Promoções -> Saldão de Calçados -> Editor "Sobre Nós" -> Suporte & Contatos.
  4. **⚙️ SISTEMA:** Gestão de Equipe & Colaboradores -> Configurações Gerais.

---

## 15. Dashboard Financeiro — Clientes em Atraso & Auditoria Pix (`FinancialDashboard.tsx`)

### A. Objetivo e Funcionamento
O Dashboard Financeiro (`FinancialDashboard.tsx`) no `AdminPanel.tsx` (aba `financeiro` no grupo *📊 DASHBOARD & VENDAS*) é dividido em duas seções operacionais sincronizadas:
1. **Seção 1: Pagamentos Pix Recebidos:** Exibe as transações Pix geradas e aprovadas pelo Mercado Pago no site com auditoria de conferência e persistência local e no Firestore (`pix_transacoes`).
2. **Seção 2: Clientes com Mensalidades em Atraso (Cobrança Ativa):** Consulta clientes em tempo real direto da API do MobLink ERP, verifica faturas vencidas e possibilita a cobrança instantânea via WhatsApp.

### B. Integração Dinâmica com MobLink ERP & Firestore Pix
- **Busca em Tempo Real de Inadimplentes:** Conecta-se à API MobLink (`moblinkClientesService.fetchMoblinkClientesDirect()`), filtrando clientes com `valor_vencido > 0`.
- **Detalhamento das Contas a Receber:** Para cada inadimplente, consulta suas parcelas no ERP via `moblinkClientesService.fetchClienteContasReceber(moblinkId)`.
- **Cruzamento Anti-Cobrança Indevida:** Valida cada parcela com a coleção `pix_transacoes` do Firestore (`pixFirestoreService.checkIfParcelIsPaidInFirestore`). Se o cliente já pagou no site, a parcela é excluída da cobrança.
- **Cálculo Preciso de Dias em Atraso:** Calcula `daysOverdue = Math.floor((today - dueDate) / 86400000)` dinamicamente com base na data atual e preserva os encargos e juros do ERP (`getInstallmentAmount`).
- **Cobrança Personalizada via WhatsApp:** Geração automática de links `wa.me` com mensagens personalizadas contendo o nome do cliente, descrição da parcela, data de vencimento original, dias em atraso e valor atualizado com opção de cobrança individual ou de todas as parcelas agrupadas.
- **Sincronização Ativa:** Botão "Sincronizar Dados" recarrega clientes e faturas em tempo real com spinner e feedback visual animado.

---

## 16. Autenticação Unificada por CPF e Proteção Google Sign-In (`AuthScreen.tsx` & `firebaseAuthService.ts`)

### A. Fim da Dúvida no Login/Cadastro (Experiência Fluida e Direta)
- A tela de autenticação do cliente (`AuthScreen.tsx`) foi totalmente simplificada para apresentar apenas os campos de **CPF** e **Senha**.
- O cliente não precisa escolher ou alternar entre abas de *"Entrar"* e *"Criar Conta"*.
- **Fluxo Inteligente Automático:**
  1. O cliente preenche o CPF e a senha e clica em **"Acessar ou Criar Conta"**.
  2. O sistema tenta autenticar diretamente com as credenciais fornecidas.
  3. Se a conta existir: o login é efetuado instantaneamente.
  4. Se o usuário não existir no Firebase Auth:
     - O sistema consulta o CPF no MobLink ERP (`firstAccessAuthService.checkMoblinkCpfStatus`).
     - Se for cliente da loja física: abre o modal de **Primeiro Acesso** (`FirstAccessModal`) com o CPF já preenchido para validar a data de nascimento e ativar a senha de acesso.
     - Se for um novo cliente no site: solicita apenas o **Nome Completo** na mesma tela e cria a conta de forma imediata com a senha informada.

### B. Bloqueio de Criação Direta via Google Sign-In
- A conta Google não pode ser utilizada para provisionar clientes anônimos do zero no sistema.
- Se o usuário tentar logar pelo Google e o seu e-mail não estiver previamente associado a um CPF no Firestore ou configurado como colaborador/administrador, o sistema bloqueia a criação e orienta a fazer o primeiro acesso via CPF e Senha.
- Dentro do perfil do cliente (`MeusDados.tsx` / `CompleteProfileModal.tsx`), o usuário pode adicionar ou alterar seu e-mail de contato (`emailReal`) para habilitar o acesso rápido (inclusive via Google ou Magic Link) em sessões futuras.
- **Exclusão Imediata de Usuários Órfãos:** Se um usuário tentar logar com Google e for rejeitado por não estar vinculado, o sistema executa `deleteUser(userCredential.user)` no Firebase Auth antes de deslogar, impedindo a criação de registros órfãos no Authentication.

---

## 17. Blindagem Anti-Sobrescrita de Fotos e Links do Catálogo MobLink ERP

- **Validação Estrita de URLs Web (`isValidWebPhotoUrl` em `placeholder.ts`):**
  - O sistema valida rigorosamente se uma string de foto é uma URL web acessível (`http://`, `https://`, `data:image/`, `blob:`).
  - Caminhos de disco locais de servidores Windows (ex: `C:\...`, compartilhamentos de rede `\\...` ou nomes brutos de arquivos) retornados pela API do MobLink ERP são **automaticamente descartados**, impedindo que substituam URLs web válidas.
- **Proteção no Merge ERP vs Firestore (`mergeErpSyncWithExistingDbProduct` em `moblinkProductsService.ts`):**
  - As fotos, capas e galerias cadastradas pelo lojista no banco de dados possuem **prioridade máxima absoluta**.
  - O merge destrutura e isola os dados do ERP, garantindo que `images`, `imageUrl`, `foto_uri`, `colorImages`, `colorImageMap` e `managedPhotos` não sejam sobrescritos por valores vazios do ERP.
- **Proteção Anti-Exclusão no Firestore (`sanitizeProductForFirestore` em `moblinkProductsService.ts`):**
  - Em rotinas automáticas de sincronização em segundo plano (como ao abrir a página do produto em `ProductDetail.tsx` ou delta sync de preços/estoque em `AppContext.tsx`), se o payload não contiver novas fotos, os campos de mídia **NÃO são enviados** para o Firestore.
  - O `setDoc(..., { merge: true })` do Firebase atualiza estritamente preço, estoque e metadados, mantendo 100% dos links de fotos existentes intactos.
  - A exclusão de fotos só ocorre quando o lojista intencionalmente limpa a galeria no painel e salva o formulário (`options?.allowEmptyPhotos === true`).

---

## 18. Sistema de Backup Redundante e Restauração de Fotos no Supabase

- **Camada Dupla de Backup na Nuvem (`supabaseStorageService.ts`):**
  - **Arquivo JSON Consolidado no Storage Bucket:** Salva um snapshot completo de todos os produtos que possuem fotos e galerias em `backups/photos_backup_latest.json` (e cópias com carimbo de data/hora para histórico de versões).
  - **Tabela Relacional no Supabase DB (`products_media`):** Persiste em lote registros com `id`, `name`, `images`, `imageUrl`, `foto_uri`, `colorImages`, `colorImageMap` e `updated_at`.
  - **Contingência no Navegador:** Salva cópia local em `localStorage` sob a chave `evidencia_supabase_photos_backup`.
- **Varredura e Mapeamento Unificado (`fetchSupabaseStoragePhotosMap`):**
  - Cruza arquivos de fotos físicas do Storage (`produto_{id}_...`), backups JSON e registros da tabela do banco de dados, mapeando por `id`, `MOB-{id}`, `sku` e `referencia`.
- **Botões de Ação Rápida no Painel Gestor (`MoblinkProductsManager.tsx`):**
  - **🛡️ Fazer Backup Fotos (Supabase):** Dispara a varredura e cria um snapshot atualizado de todas as fotos e links no Supabase.
  - **📥 Restaurar Fotos (Supabase):** Restaura e revincula todas as fotos salvas aos produtos correspondentes no Firestore e no catálogo local em 1 clique.

---

## 19. Acesso Rápido por Link Mágico (E-mail Sem Senha) & Regras de Vínculo de Contas

- **Identificador Único Primário: CPF:**
  - Todas as contas de clientes são baseadas no CPF (`gerarEmailDoCpf(cpf)` gera `cpf@evidencia.com`).
  - O acesso por e-mail real ou Google Sign-In funciona como um atalho rápido de conveniência e **nunca substitui o CPF**.
- **Vínculo Seguro de E-mail Real (`emailLinkAuthService.ts` & `MeusDados.tsx`):**
  - O cliente pode vincular seu e-mail real na área logada ("Meus Dados" / Perfil).
  - O e-mail é validado e registrado no Firestore (`/users/{uid}`) no campo `emailReal`.
  - Na tela de login, o "Acesso Rápido por E-mail" busca previamente no Firestore se o e-mail informado já está vinculado. Se não estiver, o envio do link é bloqueado com mensagem amigável, prevenindo criação acidental de contas órfãs.

---

## 20. Busca de Fotos na Web e Geração de Descrições Ricas com IA & Web Intelligence

### A. Busca e Otimização de Fotos na Web (`ProductWebImageSearchModal.tsx` & `server.ts`)
- **Busca Desacoplada e Segura:** Ao editar qualquer produto no painel gestor (`MoblinkProductsManager.tsx`), o lojista pode pesquisar imagens de alta resolução na web através do endpoint de proxy `/assistant-api/search-product-images`.
- **Inspeção Visual:** O modal apresenta grade responsiva com título da fonte, dimensões e preview ampliado com zoom.
- **Pipeline de Otimização no Backend (`/assistant-api/upload-photo-from-url`):**
  - Faz download da imagem remota no Node.js sem bloqueio de CORS.
  - Converte e comprime para **WebP 80%** com dimensões balanceadas (`sharp`).
  - Gera automaticamente miniatura (thumbnail) de **150px** para carregamento instantâneo em tabelas e listagens.
  - Envia os arquivos ao **Supabase Storage** sob caminhos organizados (`produtos/{id}/web_foto_*.webp`) e salva a nova URL diretamente no documento do produto no Firestore.

### B. Inteligência Web e Ficha Técnica Automática de Calçados (`/assistant-api/search-product-web-intel`)
- Realiza buscas em tempo real em sites de fabricantes oficiais (Dakota, Moleca, Grendene, Beira Rio, Vizzano) e grandes e-commerces.
- Extrai automaticamente atributos técnicos de calçados:
  - 👠 **Altura e Tipo de Salto** (ex: *Salto bloco de 1,5 cm*, *Salto fino*, *Anabela*);
  - ☁️ **Palmilha Anatômica / Confort** (ex: *Espuma macia revestida em PU*);
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

---

## 13. Pipeline de Otimização de Fotos, Conversão WebP e Preservação (`imageOptimizationService.ts` & `supabaseStorageService.ts`)

- **Formato Mandatório WebP:** Todas as imagens enviadas para o catálogo de produtos são convertidas para o formato de alta performance **WebP** com qualidade 80% e geração automática de miniaturas (*thumbnails*) quadradas de **150x150 px**.
- **Limite de 8 MB com Compressão Adaptativa:**
  - Suporte nativo a fotos de celulares modernos em alta resolução de até **8 MB**.
  - Algoritmo de compressão adaptativa em duas fases: fotos que excedam 500KB na primeira passagem sofrem compressão secundária automática garantindo arquivos finais extremamente leves (**entre 150KB e 300KB**, redução de até 98% do tamanho original).
  - Redimensionamento proporcional limitando a largura/altura máxima a **1600px**, preservando nitidez de tecidos e texturas.
  - Processamento no navegador 100% compatível com Canvas 2D (zero dependências C++ nativas no cliente), mantendo o build do Vite leve e seguro.
- **Preservação Absoluta de Fotos Existentes e Links Externos (`preserveExistingImages`):**
  - Fotos já cadastradas no Firestore e URLs de fornecedores/CDNs externas **nunca são apagadas ou sobrescritas acidentalmente** durante novos uploads ou edições.
- **Exclusão Limpa em Cascata (`deleteImageFromSupabase`):**
  - Ao excluir uma foto do Supabase Storage, a miniatura correspondente (`_thumb.webp` ou subpasta `thumbnails/`) é detectada e excluída em lote no bucket.
  - Links externos que não pertencem ao Supabase são desvinculados com segurança sem disparar requisições ao bucket.
  - Desvinculação automática de variações de cor (`colorImages`, `colorImageMap`) e redefinição da imagem de capa (`imageUrl` e `foto_uri`).
  - Prevenção do bug de ressurreição de fotos deletadas ao salvar o formulário (`handleSaveProductEnrichment`).
- **Tratamento de Produtos sem Desmembramento de Grade:**
  - Para produtos de estoque único global ou que não possuem variações de grade cadastradas no ERP (ex: cosméticos, cremes, carteiras, itens tamanho único), a seleção suspensa `-- Cor da foto --` debaixo das miniaturas é **completamente ocultada**, mantendo a galeria limpa e focada na foto e nos botões de capa e lixeira.

---

## 14. Menu Lateral & Painel Gestor Reorganizado com Menu Sanduíche (`AdminPanel.tsx`)

- **Remoção de Itens Obsoletos:**
  - *Adicionar Produto*: Removido do menu lateral, uma vez que todo o catálogo é importado e sincronizado de forma centralizada pelo **Integrador MobLink ERP**.
  - *Ordem das Seções*: Removido do menu lateral, pois a arquitetura e a sequência de seções da Home vitrine são limpas e fixadas no código.
- **Menu Sanduíche Responsivo (Mobile & Desktop):**
  - **No Mobile (`md:hidden`):** Barra de topo fixa elegante com botão sanduíche (☰ / ✕), logo do Evidência CMS e atalho direto para visualizar a loja virtual (👁️). Ao tocar no botão, abre-se uma gaveta lateral (*drawer*) suave com *backdrop blur* escurecido. Ao selecionar qualquer aba, o menu se fecha automaticamente.
  - **No Desktop:** Botão sanduíche integrado na barra lateral permitindo **recolher o menu lateral** para liberar 100% do espaço de tela (*Full View*), ideal para tabelas com muitos dados (Estoque, Vendas e Financeiro).
  - **Barra Superior Integrada (Sem Sobreposição):** Quando o menu está recolhido no desktop, uma barra de navegação no fluxo normal do documento exibe o botão `[ ☰ Abrir Menu ]` acompanhado do logo e do botão de "Ver Loja", garantindo que títulos, métricas e cards de dados nunca fiquem cobertos.
- **Reorganização dos Grupos de Navegação por Prioridade Operacional:**
  1. **📊 DASHBOARD & VENDAS:** Visão Geral & Métricas -> Vendas & Pedidos -> Dashboard Financeiro -> Crediário Próprio -> Base de Clientes & CRM -> Vendedores (Cadastros).
  2. **📦 CATÁLOGO & ESTOQUE:** Integrador MobLink ERP (destaque no topo do grupo) -> Gestão de Estoque -> Categorias da Loja -> Caixas & Frete (Melhor Envio).
  3. **✨ CMS & VITRINE:** Banners Principais (Hero) -> Ofertas & Promoções -> Saldão de Calçados -> Editor "Sobre Nós" -> Suporte & Contatos.
  4. **⚙️ SISTEMA:** Gestão de Equipe & Colaboradores -> Configurações Gerais.

---

## 15. Dashboard Financeiro — Clientes em Atraso & Auditoria Pix (`FinancialDashboard.tsx`)

### A. Objetivo e Funcionamento
O Dashboard Financeiro (`FinancialDashboard.tsx`) no `AdminPanel.tsx` (aba `financeiro` no grupo *📊 DASHBOARD & VENDAS*) é dividido em duas seções operacionais sincronizadas:
1. **Seção 1: Pagamentos Pix Recebidos:** Exibe as transações Pix geradas e aprovadas pelo Mercado Pago no site com auditoria de conferência e persistência local e no Firestore (`pix_transacoes`).
2. **Seção 2: Clientes com Mensalidades em Atraso (Cobrança Ativa):** Consulta clientes em tempo real direto da API do MobLink ERP, verifica faturas vencidas e possibilita a cobrança instantânea via WhatsApp.

### B. Integração Dinâmica com MobLink ERP & Firestore Pix
- **Busca em Tempo Real de Inadimplentes:** Conecta-se à API MobLink (`moblinkClientesService.fetchMoblinkClientesDirect()`), filtrando clientes com `valor_vencido > 0`.
- **Detalhamento das Contas a Receber:** Para cada inadimplente, consulta suas parcelas no ERP via `moblinkClientesService.fetchClienteContasReceber(moblinkId)`.
- **Cruzamento Anti-Cobrança Indevida:** Valida cada parcela com a coleção `pix_transacoes` do Firestore (`pixFirestoreService.checkIfParcelIsPaidInFirestore`). Se o cliente já pagou no site, a parcela é excluída da cobrança.
- **Cálculo Preciso de Dias em Atraso:** Calcula `daysOverdue = Math.floor((today - dueDate) / 86400000)` dinamicamente com base na data atual e preserva os encargos e juros do ERP (`getInstallmentAmount`).
- **Cobrança Personalizada via WhatsApp:** Geração automática de links `wa.me` com mensagens personalizadas contendo o nome do cliente, descrição da parcela, data de vencimento original, dias em atraso e valor atualizado com opção de cobrança individual ou de todas as parcelas agrupadas.
- **Sincronização Ativa:** Botão "Sincronizar Dados" recarrega clientes e faturas em tempo real com spinner e feedback visual animado.

---

## 16. Autenticação Unificada por CPF e Proteção Google Sign-In (`AuthScreen.tsx` & `firebaseAuthService.ts`)

### A. Fim da Dúvida no Login/Cadastro (Experiência Fluida e Direta)
- A tela de autenticação do cliente (`AuthScreen.tsx`) foi totalmente simplificada para apresentar apenas os campos de **CPF** e **Senha**.
- O cliente não precisa escolher ou alternar entre abas de *"Entrar"* e *"Criar Conta"*.
- **Fluxo Inteligente Automático:**
  1. O cliente preenche o CPF e a senha e clica em **"Acessar ou Criar Conta"**.
  2. O sistema tenta autenticar diretamente com as credenciais fornecidas.
  3. Se a conta existir: o login é efetuado instantaneamente.
  4. Se o usuário não existir no Firebase Auth:
     - O sistema consulta o CPF no MobLink ERP (`firstAccessAuthService.checkMoblinkCpfStatus`).
     - Se for cliente da loja física: abre o modal de **Primeiro Acesso** (`FirstAccessModal`) com o CPF já preenchido para validar a data de nascimento e ativar a senha de acesso.
     - Se for um novo cliente no site: solicita apenas o **Nome Completo** na mesma tela e cria a conta de forma imediata com a senha informada.

### B. Bloqueio de Criação Direta via Google Sign-In
- A conta Google não pode ser utilizada para provisionar clientes anônimos do zero no sistema.
- Se o usuário tentar logar pelo Google e o seu e-mail não estiver previamente associado a um CPF no Firestore ou configurado como colaborador/administrador, o sistema bloqueia a criação e orienta a fazer o primeiro acesso via CPF e Senha.
- Dentro do perfil do cliente (`MeusDados.tsx` / `CompleteProfileModal.tsx`), o usuário pode adicionar ou alterar seu e-mail de contato (`emailReal`) para habilitar o acesso rápido (inclusive via Google ou Magic Link) em sessões futuras.
- **Exclusão Imediata de Usuários Órfãos:** Se um usuário tentar logar com Google e for rejeitado por não estar vinculado, o sistema executa `deleteUser(userCredential.user)` no Firebase Auth antes de deslogar, impedindo a criação de registros órfãos no Authentication.

---

## 17. Blindagem Anti-Sobrescrita de Fotos e Links do Catálogo MobLink ERP

- **Validação Estrita de URLs Web (`isValidWebPhotoUrl` em `placeholder.ts`):**
  - O sistema valida rigorosamente se uma string de foto é uma URL web acessível (`http://`, `https://`, `data:image/`, `blob:`).
  - Caminhos de disco locais de servidores Windows (ex: `C:\...`, compartilhamentos de rede `\\...` ou nomes brutos de arquivos) retornados pela API do MobLink ERP são **automaticamente descartados**, impedindo que substituam URLs web válidas.
- **Proteção no Merge ERP vs Firestore (`mergeErpSyncWithExistingDbProduct` em `moblinkProductsService.ts`):**
  - As fotos, capas e galerias cadastradas pelo lojista no banco de dados possuem **prioridade máxima absoluta**.
  - O merge destrutura e isola os dados do ERP, garantindo que `images`, `imageUrl`, `foto_uri`, `colorImages`, `colorImageMap` e `managedPhotos` não sejam sobrescritos por valores vazios do ERP.
- **Proteção Anti-Exclusão no Firestore (`sanitizeProductForFirestore` em `moblinkProductsService.ts`):**
  - Em rotinas automáticas de sincronização em segundo plano (como ao abrir a página do produto em `ProductDetail.tsx` ou delta sync de preços/estoque em `AppContext.tsx`), se o payload não contiver novas fotos, os campos de mídia **NÃO são enviados** para o Firestore.
  - O `setDoc(..., { merge: true })` do Firebase atualiza estritamente preço, estoque e metadados, mantendo 100% dos links de fotos existentes intactos.
  - A exclusão de fotos só ocorre quando o lojista intencionalmente limpa a galeria no painel e salva o formulário (`options?.allowEmptyPhotos === true`).

---

## 18. Sistema de Backup Redundante e Restauração de Fotos no Supabase

- **Camada Dupla de Backup na Nuvem (`supabaseStorageService.ts`):**
  - **Arquivo JSON Consolidado no Storage Bucket:** Salva um snapshot completo de todos os produtos que possuem fotos e galerias em `backups/photos_backup_latest.json` (e cópias com carimbo de data/hora para histórico de versões).
  - **Tabela Relacional no Supabase DB (`products_media`):** Persiste em lote registros com `id`, `name`, `images`, `imageUrl`, `foto_uri`, `colorImages`, `colorImageMap` e `updated_at`.
  - **Contingência no Navegador:** Salva cópia local em `localStorage` sob a chave `evidencia_supabase_photos_backup`.
- **Varredura e Mapeamento Unificado (`fetchSupabaseStoragePhotosMap`):**
  - Cruza arquivos de fotos físicas do Storage (`produto_{id}_...`), backups JSON e registros da tabela do banco de dados, mapeando por `id`, `MOB-{id}`, `sku` e `referencia`.
- **Botões de Ação Rápida no Painel Gestor (`MoblinkProductsManager.tsx`):**
  - **🛡️ Fazer Backup Fotos (Supabase):** Dispara a varredura e cria um snapshot atualizado de todas as fotos e links no Supabase.
  - **📥 Restaurar Fotos (Supabase):** Restaura e revincula todas as fotos salvas aos produtos correspondentes no Firestore e no catálogo local em 1 clique.

---

## 19. Acesso Rápido por Link Mágico (E-mail Sem Senha) & Regras de Vínculo de Contas

- **Identificador Único Primário: CPF:**
  - Todas as contas de clientes são baseadas no CPF (`gerarEmailDoCpf(cpf)` gera `cpf@evidencia.com`).
  - O acesso por e-mail real ou Google Sign-In funciona como um atalho rápido de conveniência e **nunca substitui o CPF**.
- **Vínculo Seguro de E-mail Real (`emailLinkAuthService.ts` & `MeusDados.tsx`):**
  - O cliente pode vincular seu e-mail real na área logada ("Meus Dados" / Perfil).
  - O e-mail é validado e registrado no Firestore (`/users/{uid}`) no campo `emailReal`.
  - Na tela de login, o "Acesso Rápido por E-mail" busca previamente no Firestore se o e-mail informado já está vinculado. Se não estiver, o envio do link é bloqueado com mensagem amigável, prevenindo criação acidental de contas órfãs.

---

## 20. Busca de Fotos na Web e Geração de Descrições Ricas com IA & Web Intelligence

### A. Busca e Otimização de Fotos na Web (`ProductWebImageSearchModal.tsx` & `server.ts`)
- **Busca Desacoplada e Segura:** Ao editar qualquer produto no painel gestor (`MoblinkProductsManager.tsx`), o lojista pode pesquisar imagens de alta resolução na web através do endpoint de proxy `/assistant-api/search-product-images`.
- **Inspeção Visual:** O modal apresenta grade responsiva com título da fonte, dimensões e preview ampliado com zoom.
- **Pipeline de Otimização no Backend (`/assistant-api/upload-photo-from-url`):**
  - Faz download da imagem remota no Node.js sem bloqueio de CORS.
  - Converte e comprime para **WebP 80%** com dimensões balanceadas (`sharp`).
  - Gera automaticamente miniatura (thumbnail) de **150px** para carregamento instantâneo em tabelas e listagens.
  - Envia os arquivos ao **Supabase Storage** sob caminhos organizados (`produtos/{id}/web_foto_*.webp`) e salva a nova URL diretamente no documento do produto no Firestore.

### B. Inteligência Web e Ficha Técnica Automática de Calçados (`/assistant-api/search-product-web-intel`)
- Realiza buscas em tempo real em sites de fabricantes oficiais (Dakota, Moleca, Grendene, Beira Rio, Vizzano) e grandes e-commerces.
- Extrai automaticamente atributos técnicos de calçados:
  - 👠 **Altura e Tipo de Salto** (ex: *Salto bloco de 1,5 cm*, *Salto fino*, *Anabela*);
  - ☁️ **Palmilha Anatômica / Confort** (ex: *Espuma macia revestida em PU*);
  - 🛡️ **Solado Antiderrapante** (ex: *Sintético flexível TR*);
  - 🔒 **Tipo de Fechamento** (ex: *Tiras elásticas*, *Fivela*, *Slip on / calce fácil*);
  - 🧵 **Material do Cabedal / Forro**;
  - 🎯 **Indicação e Ocasiões de Uso** (*Dia a dia, trabalho, passeios, eventos*).

#### C. Componentização Modular e Copywriting com Fidelidade Estrita (`src/components/products/admin/ai`)
- **Arquitetura Desacoplada e Reutilizável**:
  - `useProductAiAssistant.ts`: Hook centralizado gerenciando o estado de busca de imagens e redação.
  - `ProductAiAssistantToolbar.tsx`: Componentes individuais `ProductAiSearchPhotoButton`, `ProductAiDescriptionButton` e `ProductAiAssistantModals`.
  - Re-exportado através de `src/components/products/admin/ai/index.ts` e `src/components/products/index.ts`.
- **Fidelidade Estrita e Zero Especulação de Marca**:
  - Produtos sem marca definida no ERP/Web nunca são atribuídos à marca "Evidência Calçados" (a loja é apenas a vendedora/garantia).
  - Quando a marca não existe, ela é estritamente omitida do storytelling e da Ficha Técnica. O mesmo critério aplica-se a atributos não confirmados (altura do salto, palmilhas, etc.).
- **Redação Otimizada no Tom Comercial**:
  - Interface simplificada e focada 100% no tom comercial para alta conversão no e-commerce.
  - Painel unificado de metadados do ERP e inteligência web com busca expansível.
  - Modos **Visual (Preview)** e **Código HTML** para edição rápida antes de aplicar.
  - Opção de **Substituir** ou **Anexar** à descrição atual do produto.
  - Suporte híbrido a **Google Gemini 2.5 Flash** (via `@google/genai`) e **Motor Local Autônomo** de alta performance.
- **Segurança de Credenciais e Variáveis de Ambiente**:
  - Criação de `.env.example` consolidando chaves opcionais (`GEMINI_API_KEY`) e obrigatórias.
  - Higienização de `src/lib/firebase.ts` carregando via ambiente sem chaves hardcoded no repositório.

---

## 21. Arquitetura de Produção: Firebase Cloud Functions & Contingência Multi-Cloud Supabase

### A. Migração do Backend Node.js para Firebase Cloud Functions (Gen 2 / Cloud Run)
- **Estrutura Dedicada `functions/`:** 
  - Criação do pacote `functions/` isolado e compatível com **Node.js 20**.
  - O entrypoint `functions/lib/index.js` implementa inicialização ultra-rápida através da importação seletiva `{ onRequest }` de `firebase-functions/v2/https` e carregamento *lazy* sob demanda do servidor Express compilado (`functions/server.cjs`).
  - Prevenção do estouro de timeout de 10.000ms do analisador da Firebase CLI através da proteção de consultas de inicialização global no `src/lib/firebase.ts` (executadas exclusivamente no navegador via `typeof window !== 'undefined'`).
- **Permissão Pública e Resolução do Erro 403 (Forbidden):**
  - Configurada a diretiva `invoker: "public"` na definição da Cloud Function `api`, instruindo o Google Cloud Run a conceder a política IAM `roles/run.invoker` para `allUsers`.
  - Elimina erros 403 no cálculo de frete (`/api/shipping/calculate`) e na busca de fotos web (`/api/search-product-images`).
- **Roteamento Transparente no `firebase.json`:**
  - Redirecionamentos de rota no Hosting:
    - `/api/**` ➔ Function `api`
    - `/mp-api/**` ➔ Function `api`
    - `/assistant-api/**` ➔ Function `api`
    - `/**` ➔ `/index.html` (SPA)
- **Desacoplamento de Dependências Locais:**
  - O código do backend de produção foi purgado de dependências exclusivas de desenvolvimento (remoção do `vite` e `createViteServer`), garantindo que o contêiner do Cloud Run inicialize sem erros de módulos ausentes.
  - Inclusão explícita de `firebase`, `@supabase/supabase-js`, `sharp`, `multer`, `mercadopago` e `os` no manifesto `functions/package.json`.

### B. Contingência Multi-Cloud & Fallback com Supabase para Proteção do Catálogo
- **Resiliência contra Estouro de Cota (`resource-exhausted`):**
  - O banco de dados do Firestore gerado pelo Google AI Studio (`ai-studio-09694ade-3353-47cf-8db0-531b70401d1b`) possui limite diário gratuito de 20.000 gravações (Free Tier Database).
  - Para blindar o lojista contra interrupções de trabalho, o `AppContext.tsx` (`updateProduct` e `addProduct`) implementa **gravação espelhada contínua no Supabase** (`syncProductMediaToSupabase` para a tabela `products_media` e bucket de storage).
  - Em caso de recusa ou erro de cota no Firestore, o sistema captura o erro silenciosamente e persiste com sucesso no Supabase, garantindo que nenhuma foto, edição ou descrição seja perdida.
- **Hidratação Ativa de Vitrine via Supabase:**
  - Quando o listener de catálogo em tempo real do Firestore (`onSnapshot`) falha ou retorna cota excedida, o sistema dispara a busca de contingência via `fetchProductMediaFromSupabase()`, hidratando imediatamente os produtos em memória com as fotos, capas e descrições do Supabase, mantendo a vitrine da loja rica e funcional para os clientes.

---

## 22. Taxonomia Oficial MobLink ERP & Resolução de Classificação

### A. Mapeamento Real Extraído da API do ERP
- A árvore de grupos e subgrupos foi alinhada diretamente com a API do MobLink ERP da Evidência Calçados (`GET /produtos/grupos`), contemplando 42 grupos e subgrupos oficiais:
  - **Grupo 002 (Calçados):** `002.001` Masculino, `002.002` Feminino, `002.003` Infantil Masculino, `002.004` Infantil Feminino, `002.005` Papete.
  - **Grupo 007 (Confecções):** Camiseta Gola O, Camisa Polo, Short Feminino, Calça Jeans, Bermuda, Blusa, Macaquinho, etc.
  - **Grupo 009 (Cosméticos):** Hidratante, Máscara, Shampoo, Capilar, Skincare.
  - **Grupo 010 (Perfumaria):** Colônia, Eau de Parfum, Perfume.
  - **Grupo 011 (Viagens):** Malas, Frasqueiras, Sacolas.
  - **Grupo 012 (Escolar):** Mochilas, Lancheiras, Estojos.
  - **Grupo 013 (Acessórios):** Relógios, Bolsas, Meias, Cintos, Bonés, Carteiras.
  - **Grupo 014 (Esportivo):** Acessórios Esportivos, Roupas de Treino, Garrafas.

### B. Tratamento de Classificações Inexistentes: 'Sem Classificação Definida'
- Códigos que não constam na tabela oficial de grupos e categorias do ERP da loja (como o legado `001.001` presente em alguns cadastros antigos, ou qualquer código inexistente/vazio) são classificados automaticamente como **"Sem Classificação Definida"**.
- Eliminação definitiva de categorias fantasmas e fallbacks forçados (remoção total de `001` da tabela de categorias).
- O código bruto vindo do ERP (ex: `001.001`) é preservado no produto e exibido no painel administrativo em um badge dedicado de auditoria, permitindo ao lojista identificar com facilidade quais produtos precisam ser reclassificados diretamente no ERP para `002.002` (Feminino), `002.001` (Masculino), etc.
- No catálogo e tabelas, produtos sem classificação definida recebem destaque visual próprio e não são atribuídos arbitrariamente a menus de público da vitrine.


