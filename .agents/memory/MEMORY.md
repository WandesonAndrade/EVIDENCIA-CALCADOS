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

4. **Hero Banners & Campanhas Sazonais (Outubro Rosa):**
   - Componentizados dinamicamente via `HeroSlide[]` e `HeroSlideCTA[]`.
   - Focados em vendas e moda (Campanha Rosa, Coleção Feminina, Ofertas).
   - **Tema Outubro Rosa Radiante e Luminoso (Sem Tons Vinho/Vermelho Escuro):**
     1. `Hero.tsx`: Fundo e painel curvo em rosa profundo radiante (`#540832`, `#4A062B` a `#780B44`), linha guia com brilho neon rosa claro (`#F472B6`), badge e textos bicolores com rosa vibrante (`#F472B6`, `#EC4899`), botão CTA em gradiente rosa iluminado (`#DB2777` a `#F472B6`) e indicadores em `#F472B6`.
     2. `SaldaoBanner.tsx`: Fundo em gradiente rosa radiante (`#5B0836` via `#7D0D47` para `#9D174D`), pódio e sacola 3D em tons rosa/magenta luminosos (`#9D174D`, `#EC4899`, `#F472B6`), destaque `-XX% OFF` em `#F472B6`, ícones e texto do botão em rosa `#9D174D`.
     3. `AudienceMegaMenu.tsx`: Banner superior de subcategorias com gradiente rosa luminoso (`#5B0836` a `#9D174D`), linha neon rosa `#F472B6`, badge de coleção e botão com texto `#9D174D`.

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
34. **Barra de Benefícios no Topo & Priorização Estrita de Calçados em Novidades (Implementado):**
    - **Barra de Vantagens e Confiança no Topo da Vitrine**: Reposicionada do final da página para logo abaixo do Hero Banner no `ProductList.tsx`, garantindo que o visitante veja imediatamente os 4 pilares de confiança da loja (*Entrega Rápida, Parcelamento em até 10x, Troca Simplificada em 7 dias e Atendimento Humano via WhatsApp*) antes de navegar pelos produtos.
    - **Priorização Estrita de Calçados em "Novidades da Estação"**: Utiliza a função utilitária `isFootwearProduct` para impedir que perfumes, cosméticos e confecções ocupem os slots de destaque da vitrine de novidades da Evidência Calçados, garantindo que os lançamentos de calçados (sandálias, tênis, saltos e rasteiras) tenham precedência máxima nos 5 cards da vitrine principal.
35. **Mega-Menu de Subcategorias Orgânico Pastel com Fotos Reais e Showcase Hero (`AudienceMegaMenu.tsx`) (Implementado):**
    - **Design de Alta Fidelidade**: Transformado o painel dropdown do Mega-Menu (`Header.tsx`) para refletir a nova referência visual premium de e-commerce.
    - **Banner Hero com Showcase & Pódio 3D**: Gradiente azul real profundo (`#002554` a `#0052A3`) com anéis orbitais concêntricos em SVG, badge de coleção com símbolo de gênero (`♀`, `♂`, `★`), título moderno com realce em cyan (`#00D0FF`), montagem de 3 produtos dinâmicos sobrepostos em pódio elíptico e botão pill branco com chevron (`Explorar Tudo Feminino →`).
    - **Cards de Subcategorias Orgânicos Pastel**:
      - Badges de ícones temáticos pastel na esquerda com cantos arredondados suaves (`ShoppingBag`, `Footprints`, `Watch`, `Luggage`, `Gift`, `Wallet`, `Droplets`, etc.).
      - Tipografia clara com título em destaque e contagem dinâmica de produtos ativos.
      - Botão circular de chevron com transição suave no hover.
      - Fundo com blob orgânico em tom aquarela/pastel correspondente.
      - Miniatura com foto real de capa do produto em estoque daquela subcategoria, com escala animada e fallback gracioso.
    - **Arquitetura Modular**: Componentizado em `AudienceMegaMenu.tsx` e integrado no `Header.tsx`, suportando coleções Feminina, Masculina e Infantil com modo escuro e responsividade completa.

36. **Redesign do Banner do Saldão de Calçados 100% em Código (`SaldaoBanner.tsx`) (Implementado):**
    - **Design Fiel à Referência**: Implementado em `src/components/SaldaoBanner.tsx` e integrado em `src/components/ProductList.tsx`, inspirado na referência gráfica visual do Saldão de Calçados sem usar imagens achatadas estáticas pré-renderizadas.
    - **Iluminação e Fundo Dinâmico**: Fundo azul marinho profundo em gradiente radial e linear (`#011438` a `#052b6e`) com halo solar âmbar/laranja brilhante de alta intensidade na direita, grid sutil de micropartículas e traços dinâmicos de energia/sparks em laranja.
    - **Tipografia e Chamadas de Alto Impacto**: Pílula com gradiente de fogo `ÚLTIMAS UNIDADES EM ESTOQUE` e ícone `<Flame />` pulsante, título bicolor de destaque `🔥 Saldão de Calçados -% OFF` em branco e laranja elétrico, e subtítulo com ícone `<Tag />`.
    - **Palco e Calçados Vetoriais em SVG 3D**: Renderização 100% vetorial de pódio cilíndrico tridimensional, sacolas de presentes em azul real (com traço do carrinho de compras) e laranja, e par de tênis esportivo moderno com camadas detalhadas de sola, entressola e cabedal.
    - **Barra de Confiança e CTA**: 4 pilares de confiança (Entrega Rápida, Compra Segura, Parcele em até 10x, Troca e Devolução) no rodapé do banner e botão pill branco com microinteração de seta `Ver todos os calçados em saldão →`.

37. **Crediário Próprio Exclusivo para Consulta e Pagamento de Carnês & Boletos ERP (Implementado):**
    - Removidas as antigas opções 1 (*Solicitar Avaliação de Crédito*) e 2 (*Comprar com Crediário / Importar Carrinho*) do módulo `/meu-crediario` (`MeuCrediario.tsx`).
    - Mantida exclusivamente a **Opção 3 (Carnês & Boletos MobLink ERP)**, transformando o Crediário Próprio em um portal direto de autoatendimento para consulta de faturas, parcelas em aberto, histórico de compras faturadas e pagamento instantâneo via PIX com baixa automática e auditoria no Firestore.
    - Carregamento automático transparente ao acessar a tela caso o cliente autenticado já possua CPF válido cadastrado no perfil.
    - Textos informativos de banners em `CheckoutPage.tsx`, `ProductDetail.tsx` e CMS do `AdminPanel.tsx` alinhados para consulta e quitação de carnês.

38. **Gerenciador de Temas & Campanhas no Painel Admin (`AdminPanel.tsx`) (Implementado):**
    - **Aba Dedicada "Temas & Campanhas"**: Localizada no menu lateral do painel em `CMS & Vitrine` com ícone `<Palette />`.
    - **Controle Centralizado e em Tempo Real**: O administrador pode alternar com 1 clique entre o **"Tema Padrão (Azul Evidência)"** e o **"Outubro Rosa"**, além de poder reverter a qualquer momento ao final da campanha.
    - **Sincronização em Nuvem (Firestore + LocalStorage)**: Gerenciado via `src/services/themeService.ts` com persistência na coleção `settings/theme` do Firestore e listener `onSnapshot` no `AppContext.tsx`, propagando a troca de tema instantaneamente para todas as sessões e abas abertas sem recarregar a página.
    - **Adaptação Dinâmica na Vitrine (Paleta Oficial Outubro Rosa Radiante)**: Aplica instantaneamente os tons da campanha rosa (`#5B0836`, `#EC4899`, `#F472B6`, `#DB2777`, `#BE185D`) nos componentes da loja:
      1. `Hero.tsx`: Curvas de fundo em gradiente rosa profundo radiante (`#540832`, `#4A062B` a `#780B44`), linhas neon e indicadores em `#F472B6`, badges de coleção e títulos bicolores em `#F472B6`, e botão CTA em gradiente rosa iluminado (`#DB2777` via `#EC4899` a `#F472B6`).
      2. `SaldaoBanner.tsx`: Gradiente de fundo rosa radiante (`#5B0836` a `#9D174D`), destaque `-XX% OFF` em `#F472B6`, sacola e pódio vetoriais 3D em tons magenta/rosa (`#9D174D`, `#EC4899`, `#F472B6`) e botões com realce `#9D174D`.
      3. `AudienceMegaMenu.tsx`: Banner hero superior em gradiente rosa (`#5B0836` a `#9D174D`), linha neon `#F472B6`, pódio 3D em `#50082E`, badges e destaques de coleção.
      4. `StorefrontProductCard.tsx` + `ProductPriceDisplay.tsx` + `ProductBadges.tsx`: Preço principal em rosa vibrante (`#BE185D`), tags/badges de saldão e ofertas em gradiente rosa temático (`#EC4899` a `#F472B6`), tags de parcelamento, selo flutuante e pílulas de tamanhos da grade com fundo/borda rosa pastel e hover em `#EC4899`, botão "Comprar" com gradiente rosa iluminado (`#DB2777` via `#EC4899` a `#F472B6`) e borda/hover do card harmonizados.
      5. `ProductList.tsx` (Bento Grid de Destaque): Os 3 cards promocionais da vitrine com gradiente suave (`#540832` via `#750C44` a `#400627`), badges temáticos com dot/ícone em `#EC4899`, botões de ação ("VER NOVIDADES", "VER CALÇADOS", "VER ACESSÓRIOS") em gradiente rosa temático (`#DB2777` via `#EC4899` a `#F472B6`) e glows ambientais em rosa.
      6. `ProductList.tsx` (Barra de Vantagens e Confiança do Topo): Os 4 blocos de benefícios (Entrega Rápida, Parcele em até 10x, Troca Simplificada, Atendimento Humano) recebem ícones com fundo rosa pastel suave (`#FFF0F5`), borda rosa (`border-pink-200/70`), ícone rosa vibrante (`#EC4899`), hover invertido com preenchimento em rosa `#EC4899` e títulos com realce rosa temático.
      7. `ProductDetail.tsx` (Tela de Detalhes do Produto): Adaptação completa ao tema Outubro Rosa — badge de categoria em rosa, seller text "Evidência Calçados" com realce `#EC4899`, galeria de fotos com fundo suave `#FFF5F8`, bullets ativos e miniatura selecionada com anel `#EC4899`, swatch de cores com anel/contador rosa `#EC4899`, banner superior de Saldão com gradiente rosa radiante (`#5B0836` via `#831843` a `#9D174D`) e ícone `#F472B6`, preço em destaque em rosa vibrante (`#BE185D` / `#FBCFE8`), abas de frete com aba ativa em `#EC4899`, seleção de numeração/grade com botões em `#BE185D`, botões de ação ("Adicionar à Sacola" em gradiente `#DB2777` a `#F472B6`, "Comprar Agora" em `#831843`) e os 3 cards inferiores de garantia/confiança com ícones em rosa vibrante `#EC4899`.
      8. `ShippingCalculator.tsx` (Calculadora de Frete Integrada): Ícone de caminhão em `#EC4899`, anel de foco do input de CEP em `#EC4899`, botão "Calcular" em gradiente rosa temático (`#DB2777` via `#EC4899` a `#F472B6`) e rádio/borda da opção de frete selecionada em `#EC4899`.
      9. **Links de Seção & Navegação da Vitrine ("Ver todos...")**:
         - `ProductList.tsx`: Botões de seção "Ver todas as novidades →", "Ver todos os calçados →", "Ver todas as confecções →" e "Ver todos os acessórios →" adaptados para `#BE185D` (hover `#9D174D` / modo escuro `text-pink-300`), divisórias de seção em `border-pink-900/15` e cabeçalho da busca com badge rosa e termo em destaque `#EC4899`.
         - `SubcategoryCarousel.tsx`: Divisória de cabeçalho em `border-pink-900/15`, botões de rolagem circular com realce rosa e hover do rótulo da subcategoria em `#EC4899`.
         - `StorefrontProductGrid.tsx`: Spinner em `#EC4899`, caixa de ícone de estado vazio em rosa suave e botão de reset de filtros em gradiente rosa (`#DB2777` via `#EC4899` a `#F472B6`).
         - `CategoryPage.tsx`: Botão "Ver todas as subcategorias" em fundo rosa pastel com texto `#BE185D`, pílulas ativas de subcategoria em gradiente rosa `#EC4899` a `#F472B6`, aba "Ver Todas" de ofertas em gradiente rosa e botões de grade/tamanho na barra lateral harmonizados.
         - `CategorySandwichMenu.tsx`: Ação rápida "Ver Todos em {categoria}" com badge e botão em gradiente rosa temático (`#DB2777` via `#EC4899` a `#F472B6`) e ícone `PackageCheck` em `#EC4899`.
         - `HeaderLiveSearch.tsx`: Botão de rodapé "Ver todos os produtos no catálogo" em gradiente rosa temático (`#DB2777` via `#EC4899` a `#F472B6`) e badge de sugestões em `#EC4899`.

39. **Migração para Credenciais de Produção do Mercado Pago & Blindagem do Fluxo Pix (Implementado):**
    - **Credenciais de Produção**:
      - `MERCADO_PAGO_ACCESS_TOKEN` / `VITE_MERCADO_PAGO_ACCESS_TOKEN` configurados com a chave de produção da conta `ELAINNE COMERCIO DE CALCADOS LTDA` (CNPJ `60.997.831/0001-01`).
      - `VITE_MERCADO_PAGO_PUBLIC_KEY` configurado com a chave pública de produção para tokenização segura de cartões de crédito.
      - Variáveis sincronizadas em `.env`, `functions/.env` (Cloud Functions) e documentadas em `.env.example`.
      - Exigência de chave Pix cadastrada na conta do Mercado Pago para evitar o erro `Collector user without key enabled for QR rendernull`.
    - **Blindagem do Proxy Backend (`server.ts`)**:
      - Rota `/mp-api` refatorada para dar precedência absoluta à credencial `process.env.MERCADO_PAGO_ACCESS_TOKEN` do servidor, descartando headers de autorização antigos ou defasados enviados pelo browser.
    - **Eliminação de Falso Pagamento ("Já Paguei")**:
      - Botão manual "Já Paguei - Concluir Pedido" removido de `PaymentForm.tsx` e `PixPaymentModal.tsx`.
      - Tela do Pix limpa com QR Code dinâmico, botão de copiar código e texto com polling de verificação oficial no Mercado Pago.
      - **Aprovação Automática**: Ao identificar `approved` na API do Mercado Pago via polling, o pedido é concluído automaticamente como **`Confirmado`**.
      - **Pagamento com Demora**: O `CheckoutPage.tsx` armazena o `pixPaymentId` gerado. Caso o cliente finalize o pedido ou saia antes da aprovação, o pedido é gravado como **`Pendente`** com o ID do Pix associado, ficando disponível para conferência na tela **Meus Pedidos**.

40. **Destinos Dinâmicos de Banners Hero para Categorias e Ofertas Cadastradas (Implementado):**
    - **Dropdown Agrupado (`AdminPanel.tsx`)**: Campo "Link / Aba de Destino" no modal de criação/edição de banners refatorado com `<optgroup>` semânticos:
      * *Vitrine & Páginas Principais*: Catálogo Completo, Lançamentos (2026), Meu Crediário (Carnês e Boletos ERP).
      * *Ofertas & Promoções Cadastradas*: Todas as Ofertas & Saldão Geral + cada campanha individual ativa/pausada cadastrada no Firestore (`promo:${promo.id}`).
      * *Coleções por Público*: Feminino, Masculino, Infantil & Bebê.
      * *Categorias Cadastradas*: Categorias dinâmicas normalizadas do ERP/MobLink (`categoria:${cat.name}`).
      * *Subcategorias de Calçados & Acessórios*: Sandálias, Tênis, Rasteiras, Botas, Scarpins, Chinelos, Mocassins, Sapatos, Bolsas, Carteiras.
    - **Rótulo Amigável no CMS (`getBannerDestinationLabel`)**: Na listagem de banners do admin, o destino é exibido de forma legível e profissional em vez de códigos de URL.
    - **Roteamento Inteligente no Hero (`Hero.tsx`)**: O clique do botão no Hero reconhece os prefixos e navega diretamente para a categoria ou campanha correspondente.
    - **Filtro Específico na Vitrine (`CategoryPage.tsx`)**: Suporte a campanhas específicas (`cleanTabKey.startsWith('promo:')`), categorias e subcategorias com cabeçalho personalizado e filtro exato de produtos participantes.

41. **Alinhamento e Responsividade Mobile Sem Overflow Horizontal (Implementado):**
    - **Contenção Estrita Global (`src/index.css`)**: Regras `html, body { width: 100%; max-width: 100vw; overflow-x: hidden; }` e `#root { width: 100%; max-width: 100%; overflow-x: hidden; }` para blindar o canvas contra expansão por filhos transbordantes.
    - **Layout Raiz (`src/App.tsx`)**: Container `w-full max-w-full overflow-x-hidden`, e iluminação ambiente restrita com `max-w-full pointer-events-none`.
    - **Header & Logo (`Header.tsx` & `BrandLogo.tsx`)**: Padding lateral adaptativo `px-3 sm:px-6`, espaçamento elástico `space-x-2 sm:space-x-5` e fonte fluida no logo (`text-xl sm:text-2xl md:text-3xl`).
    - **Hero & Saldão (`Hero.tsx` & `SaldaoBanner.tsx`)**: Ocultação de setas desktop no mobile (`hidden sm:flex`), remoção de `whitespace-nowrap` rígido do título do saldão e títulos responsivos com quebra fluida.
    - **Barra de Benefícios & Rodapé (`ProductList.tsx` & `Footer.tsx`)**: Containers com `w-full overflow-hidden`, padding responsivo e quebra de linhas (`flex-wrap`) nos links institucionais e copyright do rodapé.

42. **Otimização Ultracompacta para Telas com Largura < 385px (Implementado):**
    - **Header & Logo**: `BrandLogo` com título `text-[17px] min-[390px]:text-xl`, subtítulo `text-xs min-[390px]:text-sm` e tagline `text-[0.44rem]`. Espaçamento de ícones `space-x-1 min-[390px]:space-x-2`, ícones `h-5 w-5 sm:h-6 sm:w-6` e menu sanduíche com padding compacto.
    - **Hero Banner**: Margens `mx-2.5 min-[390px]:mx-3`, padding interno `p-4 min-[390px]:p-5`, título `text-2xl min-[390px]:text-3xl`, descrição com `line-clamp-3`, botões com padding e fonte proporcionais e rodapé com ícones `h-3.5 w-3.5` e tipografia `text-[9.5px]` / `text-[7.5px]`.
    - **Barra de Vantagens**: Padronização dos 4 cards com container `p-2.5 min-[390px]:p-3.5`, `gap-2 min-[390px]:gap-2.5`, ícones `h-4.5 w-4.5`, títulos `text-[11px]` e subtítulos `text-[9px]`.
    - **Bento Grid**: Card principal `p-5 min-[390px]:p-7`, título `text-xl min-[390px]:text-2xl` e cards menores `p-5 min-[390px]:p-7` com tipografia harmonizada.
    - **Cards de Produto (`StorefrontProductCard` & Atomics)**: Moldura de imagem `p-3.5 min-[390px]:p-5` para maior destaque ao calçado, badges no canto `top-2 left-2` com `text-[9px]`, área de info `p-3 min-[390px]:p-4`, título `text-xs min-[390px]:text-sm min-h-[32px]`, preço `text-xl min-[390px]:text-2xl` e botão "Comprar" `py-2 min-[390px]:py-2.5 text-[11px] min-[390px]:text-xs`.

43. **Cards Promocionais de Alto Impacto na Vitrine (Estilo Retail Inspirado na Referência) (Implementado):**
    - **Redesign dos Cards de Destaque (`ProductList.tsx`)**: Substituído o layout assimétrico anterior por uma fileira de 3 cards horizontais promocionais de alto impacto (`grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 lg:gap-5`), inspirados na referência visual de grandes e-commerces (Magalu, Kabum, Shopee).
    - **Divisão Horizontal 50/50 & Destinos**:
      - *Card 1 (Novidades & Calçados)*: Vermelho retail, `COLEÇÃO 2026`, `CALÇADOS`, `COM CUPONS DE ATÉ 40% OFF`, botão `VER OFERTAS 🛒`, redirecionando para a categoria de Novidades.
      - *Card 2 (Meu Crediário Evidência Calçados - 100% Fiel à Nova Inspiração)*: Fundo em gradiente vinho profundo radiante (`#450529` a `#5C0837`), eyebrow `CREDIÁRIO PRÓPRIO ────`, título `MEU` com badge luminoso de cartão + `CREDIÁRIO` em degradê pink luminoso (`#FF6EA7`), cópia *"Consulte seus calçados, faturas e pague parcelas no Pix com baixa instantânea"*, grid de 3 benefícios (*Calçados / Rápido & fácil*, *Via Pix / Baixa na hora*, *Seguro / 100% online*), botão pill branco `ACESSAR CREDIÁRIO` com badge circular de seta em vinho, selo circular superior flutuante com ícone de tênis e `100% ONLINE`, e composição fotográfica oficial com a caixa oficial Evidência Calçados, tênis branco/rose gold, smartphone com app Meu Crediário e loja física ao fundo (`/meu-crediario-banner.jpg`), direcionando diretamente para `/meu-crediario`.
      - *Card 3 (Bolsas & Acessórios)*: Vermelho retail, `TUDO PARA VOCÊ`, `BOLSAS & ACESSÓRIOS`, `COM ATÉ 50% OFF`, botão `VER OFERTAS 🛒`, redirecionando para a categoria de Acessórios.
    - **Harmonização de Temas**: Suporte nativo ao modo Padrão (Vermelho Retail + Vinho Crediário) e ao modo Outubro Rosa (Magenta vibrante `#BE185D` e Vinho profundo `#540832`), além de responsividade mobile e dark mode.

44. **Gestão dos 3 Cards Promocionais no Painel Admin (CMS Vitrine) (Implementado):**
    - **Módulo Dedicado (`FeaturedPromoCardsManager.tsx`)**:
      - Integrado à aba `promo-cards` ("Cards da Vitrine (3 Banners)") no menu `CMS & VITRINE` do `AdminPanel.tsx`, com atalho direto dentro da aba de Banners Hero.
      - **Prévia Visual em Tempo Real**: Réplica exata dos 3 cards renderizados na vitrine, interativa e sincronizada instantaneamente conforme os campos são alterados. Clicar em qualquer card na prévia ativa sua edição imediata.
      - **Edição Completa dos 3 Cards**:
        * *Card 1 (Esquerda)*: Badge, Título, Condição, Destaque em %/OFF, Subtítulo, Botão CTA, Destino do Clique, Nota de rodapé, Foto e Toggle de Ativo/Oculto.
        * *Card 2 (Central - Crediário)*: Suporte a modo `crediario`, selo superior flutuante ("100% ONLINE"), título estilizado, benefícios e cópia de faturas/Pix.
        * *Card 3 (Direita)*: Textos promocionais, descontos, destinos dinâmicos e fotos.
      - **Seletor de Destino Inteligente**: Opções agrupadas para Meu Crediário (`meu-crediario`), Novidades, Acessórios, Saldão, Campanhas promocionais do Firestore (`promo:${id}`) e Categorias cadastradas do MobLink ERP (`categoria:${name}`).
      - **Upload e Presets de Fotos**:
        * Upload direto de imagens para o Supabase Storage (pasta `banners`) com conversão para WebP.
        * Presets rápidos com 1 clique (foto oficial Meu Crediário `/meu-crediario-banner.jpg`, calçados e bolsas).
        * Alerta visual com dimensões oficiais recomendadas (1024 x 756 px ou 1200 x 800 px, proporção ~4:3 ou ~3:2).
      - **Persistência no Firestore**: Dados salvos em `storeConfig/layout` (`featuredPromoCards: [...]`), com fallback resiliente para `DEFAULT_FEATURED_PROMO_CARDS` e botão para restaurar configurações originais de fábrica.


45. **Carrossel Deslizante dos Cards Promocionais em Dispositivos Móveis (`ProductList.tsx`) (Implementado):**
    - **Experiência Mobile com Carrossel Lateral**: Em telas menores (`< md`), os 3 cards promocionais de alto impacto (*Calçados*, *Meu Crediário* e *Bolsas & Acessórios*) deixaram de ficar empilhados verticalmente e agora são exibidos lado a lado em um carrossel deslizante horizontal suave (`flex overflow-x-auto snap-x snap-mandatory no-scrollbar`).
    - **Largura e Peek Affordance**: Cada card ocupa `w-[86vw] min-[390px]:w-[84vw] sm:w-[380px]` com `snap-center`, permitindo que o próximo card fique sutilmente visível na borda direita, convidando o usuário ao deslize horizontal natural.
    - **Indicador Interativo de Paginação**: Adicionada barra com 3 pílulas/pontos indicadores na base do carrossel (`md:hidden`) sincronizados com o scroll e clicáveis para transição direta entre os banners.
    - **Preservação Desktop**: Em telas médias e grandes (`md:`), a exibição mantém rigorosamente o grid de 3 colunas lado a lado (`md:grid md:grid-cols-3`).

46. **Varredura Híbrida de Armazenamento no Supabase (Fotos em Pastas & Arquivos Soltos) (Implementado):**
    - **Detecção de Subpastas (`fetchSupabaseStoragePhotosMap` & `auditSupabaseVsFirebasePhotos`)**: O Supabase Storage organiza muitas fotos dentro de pastas por ID de produto (ex: `produtos/1750/web_foto_1790181943003_duz3vw.webp`) enquanto outras ficam soltas na raiz de `produtos/` (ex: `produtos/produto_1998_...bmp`).
    - **Correção da Falha**: A listagem anterior tratava subpastas (`item.id === null`) como se fossem arquivos, gerando URLs inválidas como `.../produtos/1750` e ignorando os arquivos reais contidos nelas.
    - **Varredura Recursiva e Mapeamento Inteligente**: O scanner agora identifica pastas de produtos pelo ID, entra em cada subpasta (ignorando `thumbnails/`), extrai as fotos e as mapeia com precedência máxima (`unshift`/prepend) para o ID e `MOB-<id>`.
    - **Precedência de Mídia Atualizada**: Fotos reais ativas no bucket têm precedência sobre URLs antigas do backup (como arquivos `.bmp` que foram deletados ou corrompidos), garantindo que produtos como o 1750 peguem imediatamente o arquivo `.webp` funcional.

47. **Filtro e Auditoria de Fotos com Erro 404 / NoSuchKey (`brokenPhotoService.ts`) (Implementado):**
    - **Detecção Híbrida (Tempo Real & Em Lote)**:
      * `ProductImage.tsx` com `onError` intercepta falhas de carregamento no navegador, dispara fallback para `NO_PHOTO_SVG` e grava no mapa de erros `brokenPhotoService`.
      * `auditProductsPhotos`: Rotina de alta performance com concorrência paralela que testa URLs contra erros 404/NoSuchKey sem travar a interface.
    - **Filtro no Painel Admin (`MoblinkProductsManager.tsx`)**:
      * Nova opção no dropdown **`FOTOS:`**: `⚠️ Fotos com Erro / 404 (N)`.
      * Botão de ação rápida `🔍 Auditar Fotos 404` no cabeçalho e na barra de filtros para varrer e identificar instantaneamente todos os produtos com links quebrados no catálogo.
    - **Feedback Visual e Exportação**:
      * Badge de alerta vermelho `⚠️ Erro 404 (Quebrada)` na coluna de mídia e ícone pulsante no thumbnail das tabelas (individual e agrupada).
      * Desativação automática de visibilidade para produtos com fotos quebradas (`isVisibleOnSite = false`).
      * Relatórios Excel via `excelReportService.ts` integrados com o status `⚠️ Erro 404 (Foto Quebrada)`.

48. **Exibição e Edição da Marca do Produto no Detalhe e no Painel Admin (`brandUtils.ts`) (Implementado):**
    - **Resolução Inteligente de Marca (`resolveProductBrand`)**:
      * Módulo utilitário `src/utils/brandUtils.ts` com dicionário das principais marcas de calçados do mercado brasileiro (ex: *Marvel, Moleca, Dakota, Vizzano, Beira Rio, Modare, Havaianas, Pegada, Usaflex, Olympikus, Nike, Adidas*, etc.).
      * Prioriza campos explícitos de marca do banco/ERP (`brand`, `marca`, `fabricante`), descartando termos genéricos (*OUTRAS MARCAS*, *GERAL*, etc.). Se ausente, infere a marca automaticamente a partir do nome ou descrição do modelo (ex: `BABUCH MARVEL NEW STEP 23235` -> `Marvel`).
      * Respeita rigorosamente a Regra 13: nunca atribui artificialmente "Evidência Calçados" como marca quando o calçado não possui fabricante declarado.
    - **Página de Detalhes do Cliente (`ProductDetail.tsx`)**:
      * **Badge no Topo**: Exibido badge estilizado de marca ao lado do badge de categoria (`Marca: Marvel`).
      * **Linha de Referência**: Exibe `Marca: Marvel • Ref: 23235 • Vendido e entregue por Evidência Calçados`.
      * **Especificações Técnicas**: Bloco dedicado com ficha técnica básica exibindo a marca do calçado.
    - **Modal de Edição do Administrador (`ProductEditModal.tsx` & `MoblinkProductsManager.tsx`)**:
      * **Badge no Cabeçalho**: Badge roxo `Marca: Marvel` ao lado do `ID Ref` e `Ref ERP`.
      * **Painel de Métricas / KPI**: Coluna dedicada `Marca` no grid de resumo superior.
      * **Seção 1 (Apresentação & Vitrine)**: Campo editável `Marca do Produto`, permitindo ao lojista visualizar a marca inferida e alterá-la livremente, com persistência no Firestore (`brand` e `marca`).

50. **Redesign da Página de Edição de Produto no Padrão do Mockup (`ProductEditPage.tsx`) (Implementado):**
    - **Fidelidade Visual ao Mockup do Usuário**:
      * **Barra de Navegação**: Botões em formato pílula elegante: `← Voltar para Produtos` e `🔄 Atualizar dados do ERP`.
      * **Hero Card do Produto**:
        - Thumbnail do calçado/produto em card arredondado à esquerda.
        - Badges pill coloridos: `ID Ref: XXXX` (âmbar), `MARCA: XXXXX` (roxo suave) e `PÚBLICO: XXXXX` (verde esmeralda ou azul/âmbar conforme gênero).
        - Título principal em caixa alta e negrito (`uppercase font-black`).
        - Linha descritiva de categoria e código de classificação ERP: `📦 Perfumes / Classificação: 010.002`.
        - Box lateral direito de status com carimbo: `Última atualização: DD/MM/AAAA • HH:MM` e ícone de refresh.
      * **Fileira de KPIs em 5 Colunas com Ícones Circulares**:
        - `🏷️ PREÇO TABELA` (R$ XX,XX)
        - `💲 PREÇO PIX` (em verde esmeralda)
        - `💳 PREÇO CARTÃO` (R$ XX,XX)
        - `📦 ESTOQUE` (X un em verde esmeralda)
        - `📁 CATEGORIA` (nome da categoria + código de classificação ERP)
      * **Seção ❶: Apresentação & Visibilidade na Vitrine**:
        - Título com numeração circular azul `❶` e subtítulo à direita: *"Configure as informações principais do produto."*
        - Grid de 3 campos: *Nome Comercial do Produto*, *Marca do Produto* (com sugestões) e *Público / Gênero* (dropdown nativo).
        - Dois checkboxes estilizados: `Exibir produto visível nas vitrines da loja virtual` e `Destacar como Lançamento / Novidade`.
      * **Seção ❷: Galeria de Fotos em Alta Resolução**:
        - Numeração circular `❷` + link `ⓘ Dicas para boas fotos`.
        - Box pontilhado de Drag & Drop para arrastar imagens (PNG, JPG, WebP) com input de URL direta + botão `Adicionar`.
        - Card ao lado: `Buscar Foto na Web` com botão `Abrir busca na web`.
        - Grid de Fotos Ativas com badge `CAPA`, menu 3 pontinhos `⋮`, tamanho do arquivo em WebP, botão `Definir como capa` e lixeira.
        - Card pontilhado `+ Adicionar foto`.
      * **Seção ❸: Descrição Comercial & Ficha Técnica (HTML Rico)**:
        - Numeração circular `❸` + menu dropdown âmbar `Templates de Descrição ▾`.
        - 4 botões pill rápidos: `Descrição Padrão`, `Benefícios`, `Modo de Uso` e `Dicas de Conservação`.
        - Alternância de abas `Editar HTML` / `Prévia Visual`.
        - Barra de ferramentas WYSIWYG (`B`, `I`, `U`, `S`, listas, links, código) e contador de caracteres `XX / 2000`.
      * **Rodapé Fixo**:
        - Botão `← Cancelar e voltar` à esquerda e botão verde esmeralda `💾 Salvar alterações` à direita.

51. **Redesign da Tela de Gestão de Produtos & Estoque no Padrão do Mockup (`MoblinkProductsManager.tsx`) (Implementado):**
    - **Header & Breadcrumb**:
      * Breadcrumb superior `< Produtos` com navegação contextual segura (`onBack` retornando à visão geral do painel ou `goBack()`).
      * Card limpo de cabeçalho com ícone 3D em container azul (`Boxes`), título `Gestão de Produtos & Estoque`, badge `APPLE STUDIO` e descrição.
      * Console lateral de status MobLink ERP com dot verde pulsante, status `Conectado & Ativo`, botão de refresh e carimbo dinâmico `Última sincronização` (`DD/MM/AAAA • HH:mm`).
    - **Seção "Ações de Sincronização" com Acordeão e Cards Coloridos**:
      * Cabeçalho com ícone de sincronização, título descritivo e botão pill `⚡ Ações rápidas ^` para alternar colapsar/expandir.
      * **Fileira 1 (4 Cards Principais com Gradiente/Cores Sólidas e Chevron `>`)**:
        - 🎯 *Sincronizar 1 Produto (por ID)* em azul `#0071E3`
        - 📸 *Sincronizar & Auditar Fotos (Supabase)* em roxo `#7C3AED`
        - 🛡️ *Fazer Backup Fotos (Supabase)* em azul royal `#0284C7`
        - 📥 *Restaurar Fotos (Supabase)* em esmeralda `#059669`
      * **Fileira 2 (3 Cards Secundários com Borda e Fundo Pastel)**:
        - ⚠️ *Fotos com Erro (N)* com badge e borda em tom rose
        - ⚡ *Salvar Visível (Todos com Foto)* com ícone de olho em tom âmbar
        - 📊 *Exportar Excel (N)* com planilha em tom esmeralda
    - **Fileira de KPIs em 4 Cards de Destaque**:
      * *Catálogo Integrado* (Total de SKUs cadastrados com ícone de caixa)
      * *Unidades em Estoque* (Total de pares em estoque com ícone de camadas)
      * *Modelos Agrupados* (Total de referências pai com ícone de grid/pastas)
      * *Status MobLink ERP* (Status `Conectado & Ativo` com sinal de rede/wifi em tempo real)
    - **Seção "Filtros e Pesquisa" Reorganizada**:
      * Alternador segmentado: `Modo Lista (N)` (azul sólido quando ativo) e `Agrupado por Classificação (N)`.
      * Campo de busca amplo com placeholder: `Buscar por Modelo (ex: Sound Kids), ID MobLink...` e botão de limpar `X`.
      * Botão de exportação em verde sólido `Exportar Excel (N)`.
      * Grid alinhado de filtros:
        - Linha 1: *Categoria*, *Subcategoria*, *Classificação* (caixas separadas `002 . 001`), *Ordenar por*.
        - Linha 2: *Fotos*, botão de atalho `⚠️ N com Erro`, *Grade*, *Status*.
        - Rodapé: Checkbox `Ocultar Estoque Zerado (N)` com contador real dinâmico e botão `Limpar Filtros`.
51. **Correção do Vencimento das Parcelas em Aberto no Crediário Próprio (`MeuCrediario.tsx`) (Implementado):**
    - **Identificação do Campo no MobLink ERP**: A API oficial do ERP retorna o vencimento no campo `data_vencimento` (ex: `2026-11-12`). O componente `MeuCrediario.tsx` lia apenas `inv.vencimento`, resultando em valor indefinido e exibição de `Vencimento: —`.
    - **Suporte Abrangente a Vencimentos**: Atualizada a extração para priorizar `inv.data_vencimento || inv.vencimento || inv.dt_vencimento`, cobrindo tanto carnês (`CN`) quanto duplicatas (`DP`) e lançamentos manuais.
    - **Eliminação de Bug de Timezone UTC no `formatDate`**: O `new Date("YYYY-MM-DD")` no fuso horário brasileiro (UTC-3) subtraía 3 horas e recuava o dia (ex: 12/11 virava 11/11). A formatação agora faz o parse sem fuso horário, preservando com precisão o dia, mês e ano exatos informados pelo ERP.
    - **Badge e Destaque Visual para Parcelas Vencidas**: Parcelas não pagas com data de vencimento anterior a hoje recebem badge visual `Vencida` em vermelho e texto destacado, auxiliando na clareza para o cliente.

52. **Grade de Numerações e Vinculação de Cores das Fotos no Redesign (`ProductEditPage.tsx`) (Implementado):**
    - **Painel de Grade & Variações do ERP MobLink**:
      * Inserido card dedicado com badge MobLink ERP entre os KPIs e a Seção 1.
      * Exibe chips de *Numerações Disponíveis* com saldo em estoque (`34`, `35`, `36`...), badges de *Cores Cadastradas na Grade* (com indicador de foto vinculada) e tabela detalhada de saldos por variação com código de barras/posição.
      * Suporte a produtos de *Estoque Global / Único* (cosméticos e sem grade) com aviso elegante.
    - **Vinculação de Fotos às Cores da Grade**:
      * Em cada card de foto da galeria, adicionado o seletor `Vincular à cor da grade:` com opções restritas às cores oficiais do ERP.
      * Foto vinculada recebe badge com nome da cor e estrela `★` quando for a capa daquela cor, integrando-se perfeitamente com a troca dinâmica de foto por cor na vitrine e no `ProductDetail.tsx`.

53. **Invalidação e Limpeza Automática do Filtro de Fotos com Erro 404 (`brokenPhotoService.ts` & `MoblinkProductsManager.tsx`) (Implementado):**
    - **Diagnóstico do Bug**: O `brokenPhotoService` persistia URLs com erro no `localStorage`. Ao corrigir a foto por upload ou busca web, o mapa local de erros não era limpo, e a filtragem checava cegamente se o ID existia no mapa sem comparar se a foto atual ainda era a URL que havia falhado.
    - **Correção da Invalidação (`clearBrokenPhoto`)**:
      * `clearBrokenPhoto(productId, newUrl)` agora apaga os registros do produto (`normId`, `cleanId`, `mobKey`), remove a URL quebrada anterior do cache de testes (`testedUrlCache`) e atualiza reativamente os listeners.
      * Acionado imediatamente em `syncImageUpdateToFirestore` (upload/web search) e em `handleSaveProductEnrichment`.
    - **Checagem Fiel de URL e Precedência do Banco (`existingDb`)**:
      * Na tabela e no filtro de fotos, as fotos enriquecidas do banco têm precedência absoluta sobre dados brutos do ERP.
      * A foto só é tratada como quebrada se a URL registrada com erro for exatamente idêntica à URL ativa do produto. Se a foto foi alterada, o produto sai imediatamente da lista de erros.
54. **Remoção de Tags Redundantes no Topo dos Detalhes do Produto (`ProductDetail.tsx`) (Implementado):**
    - Removidas as pílulas/badges superiores de *Categoria* (`ACESSÓRIOS`), *Marca* (`MARCA: ...`) e *Gênero/Público* (`FEMININO` / `MASCULINO` / `INFANTIL`) que ficavam sobre o título na tela de detalhes do produto.
    - Layout higienizado e mais moderno: o cabeçalho agora exibe diretamente a avaliação (`⭐ 5.0 (novo)`) e o título do produto em destaque.
    - As informações de Marca, Público, Código de Referência e Vendedor continuam organizadas de forma limpa na linha de metadados imediatamente abaixo do título e na Ficha Técnica.

55. **Desconto de Pontualidade nas Parcelas do Crediário Próprio & Aba Independente de Descontos (Implementado):**
    - **Aba Independente "Descontos & Benefícios" no Painel Admin (`DiscountsManager.tsx` & `AdminPanel.tsx`)**:
      * Localizada no menu lateral (grupo Financeiro) com ícone `<Percent />`.
      * Controle em tempo real do Desconto de Pontualidade no Crediário Próprio: toggle Ativar/Pausar, seletor de percentual (%) com presets rápidos (5%, 8%, 10%, 12%, 15%, 20%) e campo de corte de horário (padrão estrito às `22:00`).
      * Simulador ao vivo com visão do cliente, permitindo testar qualquer valor de parcela e ver a economia em reais e o botão de Pix simulado.
      * Estrutura modular preparada para receber futuras políticas comerciais (cupons, descontos no Pix à vista e cashback).
    - **Motor de Cálculo com Trava Temporal às 22:00 (`installmentDiscountService.ts` & `moblinkClientesService.ts`)**:
      * Função `getInstallmentAmount` atualizada para receber a configuração de desconto reativa.
      * O desconto é estritamente concedido se a transação for realizada até às 22:00:00 da data de vencimento da parcela.
      * Após às 22h do dia do vencimento ou para parcelas vencidas, o desconto expira compulsoriamente e o sistema cobra o saldo devedor/encargos originais do ERP.
    - **Apresentação Visual Motivadora para o Cliente (`MeuCrediario.tsx`)**:
      * Banner superior luminoso de Pontualidade Premiada comunicando o desconto de pontualidade.
      * Cards de parcelas elegíveis com badge verde `-% PONTUALIDADE`, alerta pulsante `VENCE HOJE ATÉ ÀS 22:00`, valor original riscado, valor líquido em destaque e tag com o valor exato economizado em reais.
      * Botão `Pagar Pix com Desconto` gera a cobrança via Mercado Pago diretamente pelo valor abatido, com auditoria no Firestore.

56. **Redirecionamento de Comprovantes do Crediário para o WhatsApp do Financeiro (Implementado):**
    - **Número Exclusivo do Financeiro (`5599984125572` - 99 98412-5572)**:
      * Diferenciação de canais: enquanto o Checkout do e-commerce direciona o pedido para o WhatsApp geral da loja (`5599984684867`), o pagamento de parcelas do Crediário Próprio (`/meu-crediario`) agora direciona o comprovante diretamente para o WhatsApp do Financeiro (`5599984125572`).
    - **Abertura do WhatsApp com Mensagem Formatada (`PixPaymentModal.tsx`)**:
      * Ao aprovar o Pix da parcela, o modal exibe o botão destacado *"Enviar Comprovante ao Financeiro"* com ícone do WhatsApp.
      * Monta mensagem automática com Nome do Cliente, CPF, Descrição da Parcela, Valor Pago e ID da Transação Pix do Mercado Pago.
      * Ao clicar, abre o WhatsApp do financeiro via `window.open` e dá baixa no modal e na tela.
      * Botão secundário *"Concluir sem enviar WhatsApp"* disponível para flexibilidade do cliente.
    - **Gestão no Painel Admin (`DiscountsManager.tsx`)**:
      * Adicionado campo configurável para o WhatsApp do Financeiro na aba "Descontos & Benefícios", permitindo alterar o telefone pelo painel sem alterar código.

57. **Otimização Visual da Gestão de Descontos & Benefícios (`DiscountsManager.tsx`) (Implementado):**
    - **Eliminação de Poluição Visual e Textos Redundantes**:
      * Removidos parágrafos óbvios de explicação repetitiva (cálculo de R$ 100 com o simulador ao lado, explicações de vencimento duplicadas).
      * Agrupados os controles essenciais em layout enxuto e balanceado: Percentual com presets rápidos, Horário Limite e WhatsApp do Financeiro em grade de 2 colunas.
      * Campos opcionais de personalização de texto do banner recolhidos em acordeão colapsável discreto (`Settings2`), mantendo o foco nos controles operacionais.
      * Painel lateral de simulação compacto e limpo, sem ruído de textos longos.
      * Rodapé enxugado: substituídos 3 cards gigantes de placeholder por uma barra horizontal elegante com badges minimalistas de status.

58. **Eliminação Definitiva do Reaparecimento de Fotos Deletadas (Ex: Produto 1858) (`supabaseStorageService.ts`, `AppContext.tsx`, `MoblinkProductsManager.tsx`, `firebaseAuthService.ts`) (Implementado):**
    - **Causas Raiz Identificadas**:
      * `backups/photos_backup_latest.json` no Supabase Storage mantinha URLs antigas de arquivos `.bmp` já deletados fisicamente do bucket, e `fetchSupabaseStoragePhotosMap()` lia o JSON de backup antes do bucket sem validar se os arquivos ainda existiam.
      * `syncProductsFromMoblinkApi()` no `AppContext.tsx` rodava em background lendo `products` de uma closure antiga e chamando `autoLinkSupabasePhotosToFirestore(..., { onlyMissingPhotos: false })`, sobrescrevendo no Firestore qualquer exclusão feita pelo administrador poucos segundos depois.
      * Sessões administrativas de fallback (`admin@evidencia.com` ou restauradas do `localStorage`) sem `auth.currentUser` ativo no Firebase Auth sofriam rollback de escrita no Firestore (`PERMISSION_DENIED` em `allow write: if isAuth()`) alguns segundos após a atualização otimista local.
    - **Solução Implementada**:
      * `fetchSupabaseStoragePhotosMap` agora escaneia primeiro os arquivos físicos reais no bucket do Supabase Storage e descarta do `photos_backup_latest.json` qualquer URL do bucket cujo arquivo físico não exista mais.
      * Criadas `markPhotoUrlAsDeleted`, `isPhotoUrlDeleted` e `removePhotoFromBackupStore` para registrar URLs excluídas e purgá-las imediatamente do `photos_backup_latest.json` no Supabase e dos caches locais (`localStorage`).
      * `AppContext.tsx` agora utiliza `productsRef.current` sempre atualizado nas sincronizações em background, respeita `managedPhotos: true` e passa `{ onlyMissingPhotos: true }` em `autoLinkSupabasePhotosToFirestore`.
      * `firebaseAuthService.ensureAdminFirebaseSession()` garante sessão autenticada no Firebase Auth para o painel admin, evitando rollbacks de permissão no Firestore.


59. **Refinamento dos Filtros da Vitrine & Remoção Definitiva do Tema Dark (`AppContext.tsx`, `Header.tsx`, `AdminPanel.tsx`, `CategoryPage.tsx`, `ProductList.tsx`, `categoryNavigationUtils.ts`, `genderUtils.ts`, `HeaderLiveSearch.tsx`, `CategorySandwichMenu.tsx`) (Implementado):**
    - **Remoção do Tema Dark (Modo Claro Exclusivo)**:
      * `theme` fixado permanentemente em `'light'` no `AppContext.tsx`, classe `'dark'` removida do `document.documentElement`, `colorScheme = 'light'` e botões Sol/Lua (`#theme-toggle-button`) removidos do `Header.tsx` e do `AdminPanel.tsx`.
      * Mantido suporte integral ao Tema Padrão (**Azul Evidência**) e às campanhas sazonais (**Outubro Rosa**).
    - **Qualificação Estrita de Público (`isProductInAudience` & `resolveProductGender`)**:
      * Código `013.008` (*Cueca*) classificado estritamente como Masculino.
      * Grupos neutros não-calçados (`011 Viagens`, `012 Escolar`, `013 Acessórios`, `014 Esportivo`, `007.001/002/004/005`) sem marcadores femininos explícitos não caem por fallback cego na coleção Feminina.
    - **Sincronização Atômica de Navegação & Reset de Filtros Laterais**:
      * `ProductList.tsx`: Botão *"Ver todas as novidades →"* e cliques em cards promocionais (`promo:ID`) sincronizam simultaneamente `selectedCategory` e `selectedMenuTab`.
      * `CategoryPage.tsx`: Reset automático dos filtros laterais (`selectedBrands`, `selectedSizes`, `priceRange`, `onlySale`, `brandSearch`) ao alternar de categoria/aba principal.
    - **Unificação de Marcas, Tamanhos com Estoque, Preço Efetivo e Ordenação na `CategoryPage.tsx`**:
      * Filtro lateral de marcas unificado com `resolveProductBrand` (`brandUtils.ts`).
      * Filtro lateral de numeração/grade unificado com `extractAvailableSizes` (`StorefrontProductCard.tsx`), ignorando tamanhos cujo saldo em `stockBySize`/`sizeStockMap`/`saldos_lojas_grade` seja `<= 0`.
      * Filtros de **Faixa de Preço** e **Apenas em Promoção** baseados no preço efetivo via `calculateProductPriceDetails` (contemplando **Saldão** e **Campanhas Promocionais Ativas**).
      * Seletor de **Ordenação** (*Mais Relevantes, Menor Preço, Maior Preço, Lançamentos*) adicionado no cabeçalho da `CategoryPage.tsx` e estados ativos da sidebar harmonizados com o tema **Outubro Rosa**.
    - **Blindagem na Busca Instantânea e Menu Sanduíche**:
      * `HeaderLiveSearch.tsx`, `ProductList.tsx` e `CategorySandwichMenu.tsx` filtram estritamente produtos visíveis, com estoque `> 0`, foto válida, sem `001.001` (`isIgnoredClassification`) e sem `"Sem Classificação Definida"`, utilizando `resolveProductSubcategoryName` no menu sanduíche.

60. **Desacoplamento Estrito de Categorias e Condicionamento da Navbar às 5 Opções de Público / Gênero (`genderUtils.ts`, `categoryNavigationUtils.ts`, `Header.tsx`, `AudienceMegaMenu.tsx`, `CategoryPage.tsx`, `CategorySubcategoryView.tsx`, `CategorySandwichMenu.tsx`, `moblinkProductsService.ts`) (Implementado):**
    - **Isolamento Estrito de "Todos os Calçados" (`matchesCategoryTab` e `CategoryPage.tsx`)**:
      * Ao selecionar **"Todos os Calçados"** (`selectedCategory = 'CALÇADOS'` e `selectedSubcategory = 'TODAS'`), o filtro exige pertencimento à categoria `Calçados` (`isProductInCategoryTab(p, 'Calçados')`), impedindo que subcategorias de outros grupos (como *Capilar* `009.005`, *Skincare* `009.004`, *Perfumes* ou *Confecções*) vazem para a listagem ou para as pílulas de subcategoria.
    - **Padronização das 5 Opções de Público / Gênero (Remoção do "Infantil" Genérico)**:
      * Tanto o Painel Administrativo (`GENDER_OPTIONS` em `genderUtils.ts` / `ProductEditModal.tsx`) quanto a Navbar da Frente de Loja (`Header.tsx`) utilizam exclusivamente as **5 opções**:
        1. `Feminino`
        2. `Masculino`
        3. `Infantil Feminino`
        4. `Infantil Masculino`
        5. `Unissex`
    - **Condicionamento Estrito ao Público / Gênero do Produto & Exibição Dinâmica**:
      * `isProductInAudience` (`categoryNavigationUtils.ts`) tem como fonte única de verdade o campo **Público / Gênero** (`gender` / `genero` / `resolveProductGender`).
      * Na barra de navegação (`Header.tsx`) e nos seletores de público (`CategorySubcategoryView.tsx`, `CategorySandwichMenu.tsx`), um item de menu **só é exibido na frente de loja quando possui pelo menos 1 produto ativo relacionado** (visível, estoque `> 0`, foto válida e classificação oficial).
    - **Eliminação de Produtos Femininos no Filtro `Unissex` (`genderUtils.ts`)**:
      * Removido o fallback antigo que classificava `013.` (Bolsas `013.002`), `011.` (Nécessaires `011.003`), `007.` (Confecções Femininas `007.003..011`) e `009` (Cosméticos) como `'Unissex'`.
      * Códigos ERP femininos (`002.002`, `010.002`, `013.002`, `011.003`, `007.003..011`) e palavras-chave femininas sem `'UNISSEX'` explícito no nome/subgrupo resolvem estritamente para `'Feminino'`.
    - **Persistência Completa de `gender` / `genero` e `brand` / `marca` no Firestore (`moblinkProductsService.ts` & `MoblinkProductsManager.tsx`)**:
      * `hasProductChanged`, `sanitizeProductForFirestore` e `mergeErpSyncWithExistingDbProduct` preservam e gravam alterações de público/gênero e marca sem sobrescrita pelo ERP.
