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
  1. **Caxias - MA:** Entrega expressa local (Frete Grátis acima de R$ 100 ou taxa fixa de R$ 10,00).
  2. **Outras Cidades:** Envio interestadual/regional. Valor de frete a combinar via WhatsApp com o lojista (`freightCost` configurável no painel administrativo).
  3. **Retirada na Loja:** Grátis. O cliente retira diretamente no balcão da loja física no Centro de Caxias - MA.
- **Formas de Pagamento e Gateway:**
  - **Pix:** QR Code dinâmico e Pix Copia e Cola gerados via Mercado Pago, com verificação e conciliação em tempo real.
  - **Cartão de Crédito:** Processamento seguro tokenizado via Mercado Pago SDK v2 com suporte a parcelamento sem juros.
  - **Crediário da Loja:** Disponível exclusivamente para clientes com cadastro analisado e aprovado (`isCrediarioApproved`).
  - **Rastreabilidade Bancária:** O ID da transação (`paymentId`) é gravado no pedido para consulta e conciliação bancária.

---

## 4. Gestão de Pedidos (Vendas & Pedidos / Meus Pedidos)

### A. Ciclo de Vida e Etapas de Rastreio (4 Etapas Sincronizadas)
O ciclo do pedido segue uma régua de 4 etapas perfeitamente alinhada entre a visão do Cliente (`OrderTimeline.tsx`) e do Administrador (`AdminStageStepper.tsx`):
1. **Etapa 1:** `Pedido Recebido` (Status: `Pendente`) — Pedido criado no banco aguardando liquidação.
2. **Etapa 2:** `Pagamento Aprovado` (Status: `Confirmado`) — Pagamento verificado e conciliado.
3. **Etapa 3:**
   - Para envio convencional: `Em Preparação` (Status: `Em Preparação`, ícone `Truck`).
   - Para Retirada na Loja: `Pronto p/ Retirada` (Status: `Em Preparação`, ícone `Store`).
4. **Etapa 4:**
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

## 5. UI / UX Design Guidelines (Padrão Apple HIG)
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

## 6. Estrutura Modular dos Componentes de Pedidos (`src/components/orders/`)
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

## 7. Workflow de Desenvolvimento & Git
- **Branch de Desenvolvimento:** Todo o código implementado deve ser testado e commitado na branch `dev`.
- **Verificação Contínua:**
  - Tipagem rigorosa: `npm run lint` (`tsc --noEmit`) deve passar com 0 erros.
  - Compilação de produção: `npm run build` deve compilar todos os chunks e o proxy `server.ts` sem falhas.
- **Idioma das Comunicações:** Todas as interfaces, feedbacks e respostas de usuário devem ser estritamente em **Português do Brasil (pt-BR)**.
