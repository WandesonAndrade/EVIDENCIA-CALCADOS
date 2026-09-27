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
    - **Visibilidade Oculta Obrigatória**: Todo produto com "Sem Classificação Definida" é forçado estritamente como **Oculto** (`visible = false`) no painel, nas rotinas de sincronização (`moblinkProductsService.ts`) e no filtro da vitrine (`productFilterUtils.ts`). O lojista é alertado se tentar publicá-lo antes de corrigir a classificação no ERP.

17. **Indicador Visual de Visibilidade e Controle Rápido na Tabela (`Status no Site`) (Implementado):**
    - Adicionada a coluna **`Status no Site`** na tabela do `MoblinkProductsManager.tsx` (`AdminProductsTable.tsx` e `AdminProductRow.tsx`).
    - Exibe badges em tempo real: 🟢 **`Visível no Site`** (produtos ativos na vitrine) vs 🔴 **`Oculto (Motivo)`** (ex: *Sem classificação definida*, *Desativado no cadastro*, *Sem estoque* ou *Sem foto*).
    - Botão de alternância rápida (ícone de olho) para publicar ou ocultar o produto com 1 clique direto da listagem sem precisar abrir o modal de edição.

18. **Geração de Relatórios em Excel Baseados nos Filtros Ativos (Implementado):**
    - Criado o serviço utilitário `excelReportService.ts` com a função `generateProductsExcelReport`.
    - Dispara o download de planilha `.csv` codificada em **UTF-8 com BOM (`\uFEFF`)** e delimitador `;` (padrão brasileiro do Excel), contendo exatamente os produtos resultantes dos filtros ativos em tempo real (busca, categoria, subcategoria, classificação ERP, status no site, mídias e estoque).
    - Inclui botões no cabeçalho e na barra de filtro do `MoblinkProductsManager.tsx` com contador dinâmico de itens a exportar.

19. **Filtro Seletivo de Status no Site (Visibilidade) no Gerenciador (Implementado):**
    - Adicionado o dropdown de filtro **`STATUS:`** na barra de ferramentas do `MoblinkProductsManager.tsx`, estilizado exatamente no mesmo padrão visual e funcional do filtro de `GRADE:`.
    - Opções disponíveis: **`Todos (Visíveis & Ocultos)`**, 🟢 **`Apenas Visíveis no Site`** e 🔴 **`Apenas Ocultos no Site`**.
    - Integrado à exportação de relatórios em Excel, contadores dinâmicos, busca cruzada e botão "Limpar Filtros".

20. **Exclusão de Produtos em Lote no Gerenciador (Implementado):**
    - Adicionada a função `handleBatchDeleteProducts` no `MoblinkProductsManager.tsx`.
    - Integrado o botão vermelho **`🗑️ Excluir Selecionados (N)`** com ícone de lixeira no menu flutuante (dock bar) exibido quando 1 ou mais produtos são selecionados via checkbox.
    - Exclui os produtos selecionados do Firestore e do estado da aplicação em lote com confirmação prévia e feedback de sucesso.

21. **Blindagem de Mídias Quebradas e Ocultação de Produtos Sem Classificação (Implementado):**
    - Tratamento com fallback automático `onError` nos componentes de detalhes de produto (`ProductDetail.tsx`) e vitrine, substituindo links de imagem quebrados pelo SVG padrão de sem foto (`NO_PHOTO_SVG`).
    - Exclusão estrita de produtos sem classificação definida (`isUnclassified`) da navegação de categorias, menus sanduíche e listagens da frente de loja.

22. **Sincronização de Estado de Visibilidade Entre Tabela e Modal de Edição (Implementado):**
    - Sincronização em tempo real do atributo `visible` entre a coluna `Status no Site` (badge/toggle rápido) da tabela e o modal de edição de produto.

23. **Modal de Edição Isolado, Suporte a HTML nas Descrições & Sincronização ERP por Produto Único (Implementado):**
    - Modal de edição de produto refatorado e isolado em `src/components/products/admin/ProductEditModal.tsx`.
    - Descrições ricas com HTML interpretadas nativamente no `ProductDetail.tsx` com estilos CSS para listas/títulos e aba de "Prévia" no modal de edição.
    - Sincronização em lote com ERP removida; mantida exclusivamente a sincronização manual por ID individual (`🎯 Sincronizar 1 Produto (por ID)`).

24. **Adição Manual Controlada & Sincronização Automática Estrita de Estoque/Preço (Implementado):**
    - **Fim da Adição Automática**: Produtos novos cadastrados no ERP MobLink da loja física NÃO entram automaticamente no e-commerce. A inclusão é 100% deliberada pelo administrador via botão `🎯 Sincronizar 1 Produto (por ID)`.
    - **Atualização Automática Contínua**: A sincronização automática em segundo plano (`filterProductsRequiringSync` e `mergeMoblinkWithLocalDb`) monitora e atualiza exclusivamente produtos que já existem na coleção do e-commerce, mantendo estoque e preços (à vista, cartão, parcelado e promoções) sincronizados em tempo real com o ERP.
    - **Preservação de Enriquecimento**: Nomes comerciais, descrições ricas, categorias manuais e fotos personalizadas pelo lojista permanecem intactos.
    - **Painel Gestor (Plano B)**: A listagem do `MoblinkProductsManager.tsx` reflete exclusivamente os produtos cadastrados e aprovados no e-commerce.

25. **Filtro de Classificação ERP Robusto & Resolução Reversa (Implementado):**
    - **Extração Unificada (`extractProductClassification`)**: Garante que o código de classificação seja detectado independentemente de onde estiver armazenado (`classificacao`, `id_grupo`/`id_subgrupo`, `cod_classificacao`, `classificacao_erp`).
    - **Resolução Reversa (`findClassificacaoByCategory`)**: Produtos legados ou cadastrados sem o código bruto têm sua classificação inferida automaticamente via taxonomia oficial (ex: *Calçados Feminino* -> `002.002`), eliminando o problema de lista vazia ao filtrar.
    - **Auto-split e Busca Flexível**: Digitar ou colar o código com ponto (ex: `002.001`) no primeiro campo divide automaticamente entre grupo e subgrupo, além de aceitar busca por correspondência numérica (com/sem zeros à esquerda) ou textual.

26. **Persistência Confiável e Restrição Estrita às Cores da Grade do ERP (Implementado):**
    - **Cores Estritas da Grade nas Fotos**: O dropdown de associação de fotos (`-- Cor da foto (Grade) --`) na Seção 2 é preenchido **exclusivamente com as cores vindas da grade do MobLink ERP** (`selectedProductGrade.cores` e `selectedProductGrade.variacoes`), sem permitir cores digitadas arbitrariamente nem opções de nova cor avulsa.
    - **Remoção de Campo Redundante**: O campo avulso "Cor do Produto" foi removido da Seção 1 (Apresentação & Vitrine), permitindo que o "Nome Comercial do Produto" ocupe a largura completa e mantendo a interface limpa, com todas as variações de cor atreladas diretamente às fotos da grade.
    - **Detecção de Mudança (`hasProductChanged`)**: Atualizado para detectar alterações na cor principal (`color` / `cor`), no mapa de fotos por cor (`colorImageMap`) e nas listas de fotos por cor (`colorImages`), garantindo que o Firestore sempre persista a gravação mesmo quando apenas a foto de uma cor é modificada.
    - **Sincronização de Capas por Cor**: Ao vincular fotos às cores da grade, a foto de capa de cada cor é mantida e gravada de forma consistente no Firestore (`colorImages` e `colorImageMap`).

27. **Exclusão em Lote de Alta Performance & Atômica no Firestore (Implementado):**
    - **Eliminação de Travamento / Freeze**: Substituído o loop síncrono de chamadas individuais de exclusão por `deleteProductsBatch(productIds)` centralizado no `AppContext`.
    - **Operação O(1) de I/O Local**: Atualiza o catálogo em memória (`products`), o cache e o `localStorage` uma única vez, eliminando centenas de `JSON.stringify` concorrentes que bloqueavam a thread principal do navegador.
    - **Lotes Atômicos com `writeBatch` (Chunks de 400)**: No Firestore, as exclusões são agrupadas em batches atômicos seguros (máximo 400 por commit), reduzindo centenas de conexões HTTP a 1 ou poucas requisições instantâneas.
    - **Resolução Unificada de IDs & Limpeza Supabase**: Mapeia tanto `id` quanto `moblinkId` (com ou sem prefixo `MOB-`), remove registros correspondentes da tabela `products_media` do Supabase e bloqueia cliques duplicados com estado de carregamento e spinner (`isDeletingBatch`).

28. **Exclusão Estrita de Produtos da Classificação 001.001 (Insumos da Loja Física) (Implementado):**
    - **Regra de Negócio Mandatória**: Produtos com código de classificação `001.001` (ou grupo `001` de insumos/uso interno) não vão para o e-commerce sob nenhuma hipótese.
    - **Purga Automática de Banco e Cache**: Ao iniciar o `AppContext`, qualquer produto legado com `001.001` é imediatamente filtrado do cache local e excluído do Firestore e da tabela do Supabase via `deleteProductsBatch`.
    - **Bloqueio em Todos os Níveis**: Função centralizada `isIgnoredClassification` bloqueia a entrada em rotinas de sincronização (`filterProductsRequiringSync`, `syncProductsFromMoblinkApi`), mutações manuais (`addProduct`), tabelas do painel (`MoblinkProductsManager`), filtros da vitrine (`filterStorefrontProducts`) e navegação por público (`categoryNavigationUtils`).

29. **Bento Grid Refatorado e Cards de Destaque da Vitrine (Implementado):**
    - Banners da vitrine atualizados para "COLEÇÃO 2026", substituindo placeholders por imagens de alta definição de calçados e bolsas com ambient radial glow e escala animada no hover.

30. **Carrossel Orgânico Pastel de Subcategorias e Inferência Canônica (Implementado):**
    - `SubcategoryCarousel.tsx` redesenhado com 8 tons pastéis em aquarela, cantos orgânicos e ícones semânticos de fallback.
    - `resolveProductSubcategoryName` mapeia palavras do nome e descrição do ERP para subcategorias reais de calçados (*Sandálias, Tênis, Rasteiras & Papetes, Botas, Scarpins, Chinelos, Mocassins, Sapatos, Bolsas, Mochilas, Carteiras, Cintos, Malas & Viagem, Perfumes, Kits & Presentes*), descartando compulsoriamente termos de gênero do ERP ("FEMININO", "MASCULINO", "INFANTIL", "GERAL").
    - Apenas itens com estoque ativo (`stock > 0` ou `saldo_loja > 0`) e foto real válida entram na listagem.

31. **Cards de Produto com Grade Disponível no Hover e Avatar da Loja (Implementado):**
    - `StorefrontProductCard.tsx`: Bandeja deslizante em glassmorphism no hover desktop exibindo as numerações reais disponíveis em estoque (chips de tamanho: `34`, `35`, `36`...), elevação dinâmica tridimensional e badge em mobile.
    - Imagens da embaixadora da marca atualizadas e enquadramento superior corrigido no `FloatingAssistant.tsx`.

32. **Histórico de Telas e Botão Voltar Contextual com Restauração de Scroll (Implementado):**
    - `AppContext.tsx`: `previousView`, `viewHistoryRef`, `scrollPositionsRef` e `goBack()` gravam a posição de rolagem e restauram a tela anterior exatamente onde o usuário parou.
    - `ProductDetail.tsx`: Botão contextual inteligente exibe rótulo da origem (ex: `← Voltar para Calçados`, `← Voltar para Favoritos`, `← Voltar para o Carrinho`).

33. **Filtragem Exata de Subcategorias sem Retorno de Catálogo Completo (Implementado):**
    - **Definição Atômica de Estado**: `setSelectedCategory(category, subcategoryToSet)` no `AppContext.tsx` grava simultaneamente categoria e subcategoria, eliminando o reset acidental para `'TODAS'`.
    - **Função Canônica `isSubcategoryMatch` (`categoryNavigationUtils.ts`)**: Lematização com `toSingularStem` para plural/singular (*"bolsa"* e *"bolsas"*, *"sandalia"* e *"sandalias"*), remoção de acentos e bloqueio estrito de strings vazias para evitar o bug de `string.includes("") === true`.
    - **Navegação em `CategoryPage.tsx`**: Pílulas de subcategoria continuam visíveis e navegáveis com a subcategoria ativa destacada com badge preenchido.




