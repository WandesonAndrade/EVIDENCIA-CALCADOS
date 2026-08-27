# Contexto e Regras de Negócio - Evidência Calçados

Este documento centraliza todas as regras de negócio, decisões de arquitetura e integrações do projeto E-commerce Evidência Calçados, facilitando o desenvolvimento contínuo em diferentes máquinas ou por novos desenvolvedores.

## 1. Arquitetura e Stack Tecnológico
- **Frontend:** React + TypeScript + Vite.
- **Estilização:** Tailwind CSS (Estética Premium "Apple-like", limpa, com muito respiro e uso de cantos arredondados, `rounded-2xl` e `rounded-[24px]`).
- **Cor da Marca Principal:** Verde Esmeralda (`emerald-600` no Tailwind).
- **Backend / BaaS:** Firebase (Firestore para banco de dados e gerenciamento de carrinho/pedidos).
- **Backend Proxy (Node.js):** Arquivo `server.ts` configurado para lidar com integrações externas que exigem rotas seguras (ex: evitar erro de CORS na API do Mercado Pago).

## 2. Integração com ERP (MobLink)
- O catálogo de produtos é originado no ERP **MobLink**.
- O sistema possui scripts/funções de sincronização para baixar dados do MobLink e persistir no Firebase.
- **Pendências de Sincronização / Regras Críticas:** 
  - Consultas de estoque em tempo real devem buscar os dados diretamente do MobLink (ignorando o Firebase) ao abrir a página do produto, para evitar vendas sem estoque.
  - Produtos precisam ter fotos cadastradas no sistema. Produtos com fotos devem ter a flag "Visível na Vitrine" (visibilidade) ativada automaticamente.
  - O sistema deve permitir sincronizar *apenas um produto* pelo ID, além da sincronização em massa.

## 3. Regras de Carrinho e Checkout (CheckoutPage)
- **Moeda Exclusiva:** Real Brasileiro (BRL / R$).
- **Opções de Entrega:**
  1. **Caxias-MA:** Entrega via motoboy local.
  2. **Outras Cidades:** Envio via transportadora/Correios.
  3. **Retirada na Loja:** Grátis. O cliente retira na loja física em Caxias - MA.
- **Opções de Pagamento:**
  - **Online:** Cartão de Crédito, Cartão de Débito e Pix.
  - **Crediário da Loja:** Disponível apenas para clientes com cadastro aprovado (regra de validação `isCrediarioApproved`).
- **Gateway de Pagamento:** Mercado Pago (As requisições de pagamento são roteadas pelo `/mp-api/payments` no `server.ts` local/produção).
- **Gerenciamento de Estado:** O carrinho e pedidos são coordenados através do `AppContext.tsx`, garantindo tipagem forte (`types.ts`). A função `createOrder` é a autoridade central que registra o pedido final.

## 4. UI / UX Design Guidelines
- **Anti-slop:** Evitar componentes genéricos. A UI deve passar uma sensação de produto premium.
- **Botões e CTAs:** Uso padrão de botões sólidos (`bg-emerald-600`) com formato arredondado (`rounded-2xl`).
- **Fundos e Contraste:** Uso do cinza claro da Apple (`#f5f5f7`) para o fundo geral do app e branco puro (`#ffffff`) para os cartões. Sem bordas grossas; a separação visual deve ser feita com contrastes de preenchimento (`bg-slate-50`) ou sombras ultra-suaves.
- **Formulários:** Inputs com estilo minimalista (fundo leve, borda aparecendo apenas no `focus` na cor Esmeralda).

## 5. Rodando o Projeto (Workflow)
- O frontend roda através de script Vite padrão (`npm run dev`).
- Em produção ou testes locais de pagamento, o proxy backend do Express (`server.ts`) precisa estar em execução para que o checkout do Mercado Pago funcione sem problemas de CORS.
- Todo o código deve passar pelo compilador estrito do TypeScript (`tsc --noEmit`). Nenhum `any` implícito ou erro de lint de tipagem é permitido.

---
*Mantenha este arquivo atualizado à medida que novas integrações e regras financeiras forem adicionadas ao e-commerce.*
