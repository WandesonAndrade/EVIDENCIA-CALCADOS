# System Memory & Project Conventions - Evidência Calçados

Este arquivo é a memória persistente do projeto (AG Kit), consolidando decisões de arquitetura, preferências do usuário e histórico de implementação.

---

## Informações Gerais
- **Projeto:** Evidência Calçados (E-commerce)
- **Localização:** Caxias - MA
- **Branch Principal de Trabalho:** `dev`
- **Stack:** React 19 + TypeScript + Vite + Tailwind CSS + Firebase (Firestore/Auth) + Node.js (Proxy `server.ts`)
- **ERP:** MobLink

---

## Decisões Críticas e Convenções do Usuário

1. **Crediário Próprio Desacoplado da Vitrine:**
   - O Crediário Próprio possui fluxo dedicado em `/meu-crediario` (avaliação de crédito, consulta ERP de carnês e compra por importação de carrinho).
   - Não fica exposto no checkout convencional (que aceita estritamente Cartão e Pix).
   - **Vitrine e Home Limpas:** Foi expressamente solicitado e validado pelo usuário que **não devem existir menções ou seções invasivas de crediário na vitrine** (a seção antiga "Crediário & Facilidades" foi removida da home, e os Hero Banners foram limpos de botões/textos de crediário, assim como a barra superior de avisos).

2. **Categorias e Subcategorias Principais (Feminino, Masculino, Infantil):**
   - Qualificação estrita por público-alvo baseada na taxonomia MobLink ERP (`001.001`, `001.002`, `001.003`...).
   - Apenas subcategorias com produtos ativos, estoque > 0 e fotos válidas são listadas.
   - **Navegação Centralizada no Menu:** Para evitar duplicidade com a home, o ponto único de navegação por público e subcategorias é o **Mega-menu do topo** (`Header.tsx`) e a página de listagem (`CategoryPage.tsx`).

3. **Busca Inteligente da Vitrine:**
   - Sincronizada com o padrão de busca do MobLink ERP (`matchProductSearch`).
   - Busca por nome, referência interna, código de barras, marca, categoria e público.
   - Placeholders dinâmicos rotativos no campo de busca da vitrine.

4. **Hero Banners:**
   - Componentizados dinamicamente via `HeroSlide[]` e `HeroSlideCTA[]`.
   - Focados em vendas e moda (Campanha de Ofertas até 50% OFF, Coleção Feminina, Coleção Masculina).
   - Fundo gradiente azul da marca (`#003B73` / `#006EDB`).

5. **Logística e Frete:**
   - Melhor Envio via adapter desacoplado com fallback regional por CEP.
   - Retirada na Loja Física (Rua Afonso Pena, 295 - Centro, Caxias - MA) com frete grátis.

6. **Protocolo de Validação:**
   - Antes de cada commit: `npx tsc --noEmit` (0 erros), testes automatizados (`tests/test-category-navigation.ts`, `tests/test-smart-search.ts`), e `npm run build`.

7. **Gestão de Fotos e Grades no Cadastro de Produtos:**
   - Produtos com desmembramento de grade e variações de cores ativas no ERP permitem vincular fotos a cada cor da grade.
   - Produtos de estoque global/único sem desmembramento de grade no ERP (ex: cosméticos, produtos sem variações) não exibem a caixa de seleção `-- Cor da foto --` debaixo das miniaturas na galeria, mantendo o layout limpo e focado na foto e nas ações de capa e exclusão.

8. **Painel Gestor (CMS & Menu Sanduíche):**
   - Menu sanduíche responsivo (`Menu` / `X`) presente no mobile (drawer deslizante com overlay backdrop e fechamento automático ao selecionar tab) e colapsável no desktop para ganho de espaço útil em tabelas.
   - Itens reorganizados por prioridade operacional:
     1. *Dashboard & Vendas*: Métricas -> Pedidos -> Financeiro -> Crediário -> CRM -> Vendedores.
     2. *Catálogo & Estoque*: Integrador MobLink ERP -> Estoque -> Categorias -> Frete.
     3. *CMS & Vitrine*: Banners -> Promoções -> Saldão -> Sobre Nós -> Suporte.
     4. *Sistema*: Equipe -> Configurações.

9. **Dashboard Financeiro — Clientes em Atraso & Auditoria Pix (Implementado):**
   - Integrado na aba `financeiro` do `AdminPanel.tsx` no componente `FinancialDashboard.tsx`.
   - Consulta em tempo real clientes inadimplentes no MobLink ERP (`valor_vencido > 0`) e suas faturas (`fetchClienteContasReceber`).
   - Cruzamento inteligente anti-cobrança com transações Pix aprovadas no Firestore (`pix_transacoes`).
   - Cálculo dinâmico dos dias em atraso e juros/saldo devedor oficial do ERP.
   - Cobrança ativa via WhatsApp com links personalizados individuais e em lote.
   - Documentado na seção 15 do `PROJECT_CONTEXT.md`.

10. **Autenticação Unificada por CPF e Proteção Google (Implementado):**
    - **Fim da Dúvida no Formulário**: O cliente informa apenas CPF e Senha na tela de login (`AuthScreen.tsx`), sem alternar abas de "Criar Conta" ou "Entrar".
    - **Detecção Inteligente**:
      - Se o cliente já possui conta: entra diretamente.
      - Se não possui conta no Firebase mas possui cadastro na loja física (MobLink ERP): aciona o fluxo nativo de Primeiro Acesso (`FirstAccessModal`) com CPF já preenchido.
      - Se for novo cliente no site: solicita o Nome Completo e cria a conta com a senha informada.
    - **Proteção do Google Sign-In & Magic Link**: O login pelo Google ou link de e-mail não cria contas anônimas do zero; exige cadastro prévio associado ao CPF ou e-mail vinculado no perfil (`MeusDados.tsx`).
    - **Limpeza de Órfãos**: Usuários rejeitados pelo login Google são excluídos via `deleteUser()`.

11. **Blindagem de Fotos e Proteção Anti-Sobrescrita ERP (Implementado):**
    - `isValidWebPhotoUrl` descarta caminhos locais de servidores Windows do ERP (`C:\...`).
    - `mergeErpSyncWithExistingDbProduct` preserva com prioridade máxima as fotos e galerias salvas pelo lojista.
    - `sanitizeProductForFirestore` omite campos de foto vazios em sincronizações automáticas de preço/estoque, impedindo que `setDoc({ merge: true })` esvazie o array `images: []` no Firestore.

12. **Sistema de Backup e Restauração de Fotos no Supabase (Implementado):**
    - Dupla contingência na nuvem: JSON consolidado no bucket (`backups/photos_backup_latest.json`) + tabela `products_media` no Supabase DB + `localStorage`.
    - Botões no painel (`MoblinkProductsManager.tsx`): "🛡️ Fazer Backup Fotos (Supabase)" e "📥 Restaurar Fotos (Supabase)".

13. **Busca de Fotos na Web e Geração de Descrições Ricas com IA & Web Intelligence (Implementado):**
    - **Componentização Modular dos Assistentes (`src/components/products/admin/ai`)**: Criação de `useProductAiAssistant`, `ProductAiAssistantToolbar`, `ProductAiSearchPhotoButton`, `ProductAiDescriptionButton` e `ProductAiAssistantModals`, permitindo acionar a busca de fotos e a sugestão de descrição em qualquer listagem, tabela ou modal do painel com facilidade.
    - **Busca de Fotos na Web (`ProductWebImageSearchModal.tsx`)**: Permite pesquisar imagens em alta resolução em lojas e na web via rota backend `/api/search-product-images` (ou `/assistant-api/search-product-images`). Ao selecionar, a imagem é baixada via `/api/upload-photo-from-url` (sem bloqueio de CORS), otimizada para WebP 80% + Thumbnail 150px, enviada ao Supabase Storage e salva diretamente no documento do produto no Firebase Firestore.
    - **Web Intelligence & Ficha Técnica Automática de Calçados (`/assistant-api/search-product-web-intel`)**: Realiza buscas em tempo real em sites de fabricantes (Dakota, Moleca, Grendene, Beira Rio, Vizzano) e grandes e-commerces, extraindo atributos reais de calçados (altura/tipo de salto, tipo de bico, palmilha confort, solado antiderrapante em TR, fechamento e ocasiões de uso).
    - **Copywriting Limpo, Focado no Cliente e Zero Especulação (`ProductDescriptionAiModal.tsx`, `productAiAssistService.ts` & `server.ts`)**:
      - *Fidelidade Estrita de Marca*: Produtos sem marca definida no ERP/Web NUNCA são atribuídos à marca "Evidência Calçados" (a loja é apenas a vendedora/garantia). Quando a marca não existe, ela é estritamente omitida do storytelling e da Ficha Técnica. O mesmo critério aplica-se a atributos não confirmados (altura do salto, palmilhas, etc.), sem inventar dados.
      - *Sem Jargões de Retaguarda*: Prompts e motor de copywriting livres de ruídos internos (sem menções a nomes de ERP, códigos de lote, classificações fiscais ou unidades de depósito).
      - Gera descrições estruturadas com título atrativo, storytelling leve, destaques reais de calce/conforto, ficha técnica limpa e garantia Evidência Calçados (100% original com Troca Fácil em 7 dias). Suporta tons Comercial, Luxo e Técnico, além de integração com Google Gemini 2.5 Flash.
    - **Varredura de Segurança e `.env`**: Criação de `.env.example` completo com `GEMINI_API_KEY`, higienização de `src/lib/firebase.ts` sem chaves hardcoded e proteção via `.gitignore`.

14. **Arquitetura de Produção no Firebase Cloud Functions (Gen 2 / Cloud Run) (Implementado):**
    - O backend Node.js (`server.ts`) foi compilado e empacotado em `functions/server.cjs` e exposto via `functions/lib/index.js` sob a função `api` (região `us-central1`).
    - Configurado com `invoker: "public"` para acesso irrestrito (`allUsers`), eliminando erros 403 Forbidden no cálculo de frete e busca web.
    - Inicialização ultra-rápida (importação seletiva `{ onRequest }` e carregamento lazy do Express), contornando o timeout de 10s da Firebase CLI.
    - Regras de rewrite no `firebase.json` unificadas para `/api/**`, `/mp-api/**` e `/assistant-api/**`.

15. **Estratégia de Contingência Multi-Cloud com Supabase (Implementado):**
    - Proteção transparente contra estouro de cota diária do Firestore (`resource-exhausted` no banco AI Studio de 20k writes/dia).
    - `updateProduct` e `addProduct` no `AppContext.tsx` gravam cópia contínua no Supabase (`products_media` e Storage de imagens).
    - Em caso de falha de escrita no Firestore, o sistema captura a exceção e garante a integridade dos dados no Supabase.
    - Em falha de leitura do snapshot do Firestore, o catálogo ativa hidratação imediata via `fetchProductMediaFromSupabase()`, preservando capas, fotos e descrições dos produtos.

16. **Taxonomia Oficial MobLink ERP & Produtos Sem Classificação Definida (Implementado):**
    - Mapeamento estritamente alinhado com a API oficial do ERP MobLink (`/produtos/grupos`) com os 42 grupos e subgrupos oficiais (Calçados a partir do grupo `002`).
    - **Regra de Classificação Inexistente**: Qualquer produto que possua um código de classificação que não conste na tabela oficial de grupos/categorias (como os códigos legados `001.001`, `999.xxx` ou produtos sem código) é classificado como **"Sem Classificação Definida"**.
    - O código bruto do ERP é preservado para fins de auditoria no painel administrativo, permitindo ao lojista identificar e atualizar o cadastro diretamente no ERP para o código oficial (ex: `002.002` para Feminino).
    - Não são criadas categorias fantasmas ou forçados fallbacks arbitrários.



