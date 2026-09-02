# Contexto e Regras de Negócio - Evidência Calçados

Este documento centraliza todas as regras de negócio, decisões de arquitetura, integrações e convenções de interface do projeto E-commerce Evidência Calçados, facilitando o desenvolvimento contínuo em diferentes máquinas ou por novos desenvolvedores.

---

## 1. Arquitetura e Stack Tecnológico
- **Frontend:** React 19 + TypeScript + Vite.
- **Estilização:** Tailwind CSS (Estética Premium "Apple-like", limpa, com muito respiro, cantos arredondados padrão Apple `rounded-2xl` e `rounded-3xl`, sombras ultra-leves e grid de 8pt).
- **Cores da Marca e Destaque:** 
  - Azul Apple (`#0071E3` / `#0A84FF`) para elementos de status ativo, foco, CTAs de pedidos e rastreamento.
  - Verde Esmeralda (`emerald-600`) para badges de confirmação, frete grátis e ações de sucesso.
  - Roxo Suave (`purple-600` / `purple-400`) para a modalidade exclusiva de "Retirada na Loja".
- **Backend / BaaS:** Firebase (Authentication e Cloud Firestore para banco de dados em tempo real, produtos, carrinho, pedidos e crediário).
- **Backend Proxy (Node.js/Express):** Arquivo `server.ts` configurado para lidar com integrações externas e segurança (ex: proxy `/mp-api/payments` para evitar CORS no Mercado Pago, auditoria e webhooks).

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
  - O MobLink fornece preços diferenciados conforme o meio de pagamento (`precoVista`, `precoCartao`, ou o preço base `price` para Crediário).
  - O carrinho e o checkout recalculam o valor total ativamente sempre que o cliente alterna entre Pix, Cartão ou Crediário.
- **Modalidades de Entrega:**
  1. **Entrega no Endereço (Cálculo Automático por CEP):** Cotação em tempo real via provedor ativo (Melhor Envio / Correios / Jadlog / Motoboy Local para Caxias-MA). O frete da opção escolhida é somado diretamente ao valor final da compra.
  2. **Retirada na Loja Física:** Frete GRÁTIS (R$ 0,00). O cliente retira diretamente no balcão da loja física no Centro de Caxias - MA.
- **Formas de Pagamento e Gateway:**
  - **Pix:** QR Code dinâmico e Pix Copia e Cola gerados via Mercado Pago, com verificação e conciliação em tempo real.
  - **Cartão de Crédito:** Processamento seguro tokenizado via Mercado Pago SDK v2 com suporte a parcelamento sem juros.
  - **Crediário da Loja:** Disponível exclusivamente para clientes com cadastro analisado e aprovado (`isCrediarioApproved`).
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

### D. Emissão de Etiquetas e Prevenção de Falsos Positivos
- **Etiqueta Local (Romaneio Próprio):** Permitida exclusivamente para entregas municipais da própria loja (Caxias urbana).
- **Melhor Envio:** Quando a integração externa com Melhor Envio falhar (saldo insuficiente, erro de API ou CEP não atendido), o sistema **nunca emite etiqueta local como fallback disfarçado**. O erro real é exibido na tela para garantir que nenhuma encomenda seja despachada sem registro oficial.

---

## 5. Gestão de Pedidos (Vendas & Pedidos / Meus Pedidos)

### A. Ciclo de Vida e Etapas de Rastreio (5 Etapas Sincronizadas)
O ciclo do pedido segue uma régua sincronizada entre a visão do Cliente (`OrderTimeline.tsx`) e do Administrador (`AdminStageStepper.tsx`):
1. **Etapa 1:** `Pedido Recebido` (Status: `Pendente`) — Pedido criado no banco aguardando liquidação.
2. **Etapa 2:** `Pagamento Aprovado` (Status: `Confirmado`) — Pagamento verificado e conciliado.
3. **Etapa 3:**
   - Para envio convencional: `Em Preparação` (Status: `Em Preparação`, ícone `Truck` / `Package`). Acionado quando a etiqueta é gerada, liberada no Melhor Envio ou postada na agência parceira.
   - Para Retirada na Loja: `Pronto p/ Retirada` (Status: `Em Preparação`, ícone `Store`).
4. **Etapa 4:**
   - Para envio convencional: `Em Trânsito` (Status: `Em Trânsito`, ícone `Truck`). Acionado **estritamente** quando a transportadora parceira registrar movimentação real em trânsito ou saída para entrega.
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

## 8. Workflow de Desenvolvimento & Git
- **Branch de Desenvolvimento:** Todo o código implementado deve ser testado e commitado na branch `api` (ou `dev`).
- **Verificação Contínua:**
  - Tipagem rigorosa: `npm run lint` (`tsc --noEmit`) deve passar com 0 erros.
  - Compilação de produção: `npm run build` deve compilar todos os chunks e o proxy `server.ts` sem falhas.
- **Idioma das Comunicações:** Todas as interfaces, feedbacks e respostas de usuário devem ser estritamente em **Português do Brasil (pt-BR)**.
