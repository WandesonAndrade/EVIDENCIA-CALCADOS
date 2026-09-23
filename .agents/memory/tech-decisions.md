---
type: tech
created: 2026-08-26
updated: 2026-09-18
---

# Decisões Tecnológicas & Arquitetura

## 1. Mapeamento e Classificação de Público Alvo (`Header.tsx`)
- **Extração Dinâmica de Subcategorias (`dynamicMegaMenuSubcategories`):**
  - O Mega-Menu varre em tempo real os produtos carregados no `AppContext`.
  - Classifica produtos para *Feminino*, *Masculino* e *Infantil* utilizando o código de classificação do MobLink ERP (`001.001`, `001.002`, `001.003`), sinais explícitos nos nomes/grupos e inferência contextual por marcas/estilos de produtos.
  - Extrai e normaliza nomes de subcategorias reais (`nome_subgrupo` / `subcategory`), atribuindo nomes com fallback baseado no tipo de produto quando o campo no ERP vem genérico.

## 2. Garantia de Qualidade Visual dos Produtos
- Centralizada a validação de fotos reais em `moblinkProductsService.ts` (`hasProductValidPhoto`).
- Qualquer componente que exiba listagens na storefront deve obrigatoriamente aplicar o filtro `hasProductValidPhoto(item)` para evitar a exibição de quadros vazios ou com imagens quebradas/placeholders.

## 3. Sincronização Individual por ID (`MoblinkProductsManager.tsx` / `moblinkProductsService.ts`)
- **Sincronização de Produto Único (`getSingleProdutoMoblink`):**
  - O administrador pode informar o ID numérico do produto (ex: `1250` ou `MOB-000`).
  - A API consulta os endpoints do MobLink ERP por ID sem a necessidade de varrer todos os 1.800+ produtos da loja.
  - Atualiza saldo de estoque, preços e disponibilidade no Firestore instantaneamente.

## 4. Cache do Catálogo via IndexedDB & Anti-QuotaExceededError (`catalogCacheService.ts`)
- **Arquitetura de Cache do Catálogo em Clientes:**
  - Utiliza **IndexedDB (`EvidenciaCatalogDB`)** como armazenamento primário assíncrono para o catálogo do cliente. O IndexedDB aceita dezenas a centenas de Megabytes sem a restrição de 5MB por domínio do `localStorage`.
  - Implementada a função `safeSetLocalStorage` com expurgo automático de chaves legadas/redundantes (`evidencia_firestore_products_backup`, `evidencia_local_products`, `moblink_products_cache`) e captura silenciosa de estouros de cota (`QuotaExceededError`).
  - Cópia secundária comprimida enviada ao `localStorage` contendo apenas os atributos visuais essenciais para visualizações instantâneas a 0ms.

## 5. Gestão de Pedidos, Resiliência Offline & Autoridade do Firestore (`orderService.ts` / `AppContext.tsx`)
- **Firestore como Autoridade Primária:** Quando o listener do Firestore emite uma lista atualizada de pedidos, ela substitui e sanitiza o cache local (`localStorage`). Pedidos excluídos do banco de dados são purgados definitivamente, evitando que mesclagens locais "ressuscitem" pedidos deletados.
- **Modo Offline de Contingência:** O `localStorage` é utilizado como fallback apenas se ocorrer falha real de rede ou conexão com o Firestore.
- **Sincronização de Pagamento e Etapa:** Ao avançar o pedido para `Pagamento OK` ou etapas posteriores no painel admin, o status financeiro do pedido é automaticamente marcado como `Confirmado`.
- **Exclusão Segura:** Implementada a função `deleteOrder(orderId)` com confirmação prévia no AdminPanel, removendo o documento do Firestore via `deleteDoc` e atualizando o estado local instantaneamente.

## 6. Validação do Código
- Execução de `npm run lint` (`tsc --noEmit`) e `npm run build` após alterações de estrutura/tipagem para garantir 0 erros de build em produção.

## 7. Rastreamento e Consulta na API do Melhor Envio (`melhorEnvioAdapter.ts` / `shippingTracker.ts`)
- **Busca Indexada Direcionada:** A consulta a remessas utiliza prioritariamente `GET /api/v2/me/orders?q=<código>&per_page=10` e suporte nativo ao status `204 No Content`, permitindo localização imediata sem esbarrar no limite fixo de paginação (`per_page=50`).
- **Eliminação de Falsos Positivos e Mocks Silenciosos:** Em caso de código inexistente ou falha de rede/autenticação, a consulta retorna `null` para alertar o lojista no Toast em vez de salvar dados fictícios no Firestore.
- **Mapeamento Estrito e Hierarquia Anti-Regressão:** 
  - `delivered` avança para 'Entregue' (Etapa 5).
  - `posted` e `in_transit` avançam para 'Em Trânsito' / 'postado' / 'em_transito' (Etapa 4).
  - `released` e `generated` representam etiquetas liberadas/prontas e mantêm a régua em 'Em Preparação' (Etapa 3).
  - Pedidos em trânsito ou entregues **nunca regridem** para preparação.
- **Throttling e Sincronização em Lote:** `syncPendingOrders` aplica limite de frequência de 2 minutos por pedido em aberto para poupar requisições e evitar rate limit da API.

## 8. Resolução de UF por Prefixo de CEP (`orderUtils.ts`)
- **Função `getUfFromCep(cep)`:** Mapeia a unidade federativa diretamente pelos dois primeiros dígitos do CEP brasileiro (ex: `64` = PI, `65` = MA, `01-19` = SP), garantindo consistência no formulário de endereço e no payload de compra de etiquetas do Melhor Envio.

## 9. Eliminação de Código Morto na Integração de Frete (Dead Code Elimination)
- **Stubs e Mocks Legados Removidos:** `getSandboxMockTracking` e `getSandboxMockLabel` eliminados de `melhorEnvioAdapter.ts`.
- **Fim de Dados Hardcoded:** Removidos dados de prints de tela antigos (`QH8799...`); a divergência métrica é extraída dinamicamente com fallback numérico seguro (`?? 0`).
- **Reutilização DRY:** `createAndBuyLabel` utiliza o método auxiliar `getOfficialTracking(shipmentId)` para capturar o código oficial da transportadora.

## 10. Módulo de Crediário Próprio & Desacoplamento do Checkout (`creditService.ts` / `CreditManagement.tsx` / `MeuCrediario.tsx`)
- **Desacoplamento do Checkout:** Checkout restrito a Cartão de Crédito e Pix.
- **Persistência Firestore em Coleções Dedicadas:** `creditEvaluations` (avaliações de limite/crédito) e `creditOrders` (solicitações de compra originadas do carrinho).
- **Ações Rápidas de WhatsApp:** Integração nativa com `wa.me` utilizando o telefone cadastrado do cliente (`WhatsAppButton.tsx`).
- **Padrão Estético Apple HIG:** Abas unificadas no painel administrativo e na visão do cliente, métricas em tempo real e parcelamento em até 6x sem juros no carnê.

## 11. Blindagem Anti-Sobrescrita de Fotos e Sanitização ERP (`placeholder.ts` / `moblinkProductsService.ts` / `AppContext.tsx`)
- **Validação Estrita de URLs de Imagens (`isValidWebPhotoUrl`):** Rejeita caminhos locais do Windows (`C:\...`), caminhos de rede UNC (`\\...`) e strings vazias ou nulas que vinham do ERP.
- **Preservação de Mídias Existentes no Merge (`mergeErpSyncWithExistingDbProduct`):** Ao sincronizar dados de estoque e preço do MobLink ERP, os campos de foto (`images`, `imageUrl`, `foto_uri`, `colorImages`, `colorImageMap`) são preservados caso o payload do ERP venha sem foto válida.
- **Proteção no `setDoc` com `merge: true` (`sanitizeProductForFirestore`):** Arrays de fotos vazios são omitidos da serialização Firestore (a menos que explicitamente solicitado via `options.allowEmptyPhotos = true`), impedindo que updates de preço/estoque apaguem acidentalmente fotos já salvas.

## 12. Sistema de Backup Redundante de Fotos no Supabase (`supabaseStorageService.ts` / `MoblinkProductsManager.tsx`)
- **Snapshot JSON no Bucket Supabase:** Salva o mapeamento completo de fotos e variantes em `backups/photos_backup_latest.json`.
- **Tabela Espelho `products_media`:** Mantém registros relacionais no banco relacional do Supabase com chave primária no ID do produto.
- **Restauração em 1 Clique:** Botões administrativos para disparar backup preventivo e restauração total no Firestore a partir do snapshot do Supabase.

## 13. Autenticação Híbrida e Acesso Rápido por E-mail (`authService.ts` / `AuthScreen.tsx` / `MeusDadosModal.tsx`)
- **CPF como Identificador Primário Inegociável:** Todas as contas, histórico de compras, pedidos e limites de crediário são vinculados unicamente ao CPF do cliente no Firestore (`users/{cpf}`).
- **Acesso por E-mail como Facilitador:** Login via Google Auth ou Link Mágico busca primeiro o perfil cujo campo `email` coincida com o e-mail autenticado. Se o e-mail não estiver vinculado a nenhum CPF, a interface solicita o CPF para completar a vinculação.
- **Vínculo Seguro em "Meus Dados":** Usuários logados por CPF podem associar ou alterar seu e-mail a qualquer momento na tela "Meus Dados", habilitando login futuro em um clique.

## 14. Busca de Fotos na Web e Geração de Descrições Ricas com IA (`src/components/products/admin/ai/`, `ProductDescriptionAiModal.tsx`, `ProductWebImageSearchModal.tsx`, `productAiAssistService.ts`)
- **Componentização Modular dos Assistentes (`src/components/products/admin/ai/`):**
  - `useProductAiAssistant.ts`: Hook centralizado gerenciando o ciclo de vida, estados e disparos de pesquisa de fotos e geração de copywriting.
  - `ProductAiAssistantToolbar.tsx`: Componentes isolados `ProductAiSearchPhotoButton`, `ProductAiDescriptionButton` e `ProductAiAssistantModals`.
  - Re-exportação unificada via `src/components/products/admin/ai/index.ts` e `src/components/products/index.ts`.
- **Busca e Otimização WebP de Imagens:** Proxy `/assistant-api/search-product-images` e pipeline `/assistant-api/upload-photo-from-url` com download seguro no servidor, compressão WebP 80% e miniaturas 150px (`sharp`), salvando no Supabase Storage e Firestore.
- **Web Intelligence & Ficha Técnica Automática de Calçados:** Endpoint `/assistant-api/search-product-web-intel` extrai dados reais de fabricantes e lojas (altura/tipo de salto, tipo de bico, palmilha confort, solado antiderrapante, fechamento, material e ocasiões de uso).
- **Copywriting com Fidelidade Estrita e Zero Especulação:**
  - *Zero Especulação de Marca*: Produtos sem marca definida no ERP/Web nunca assumem o nome "Evidência Calçados" (a loja é apenas a vendedora/garantia). A menção de marca e a linha `<li><strong>Marca:</strong></li>` na Ficha Técnica são estritamente omitidas quando ausentes.
  - *Foco Exclusivo no Tom Comercial*: Interface simplificada com cabeçalho limpo, card integrado de inteligência ERP/Web e redação calibrada para alta conversão no e-commerce.
  - *Suporte Híbrido*: Integração com Google Gemini 2.5 Flash (`@google/genai`) com fallback autônomo para o Motor Local Especialista em Calçados.
- **Segurança e Variáveis de Ambiente:** Criação de `.env.example` consolidando chaves opcionais (`GEMINI_API_KEY`) e higienização de `src/lib/firebase.ts` sem credenciais hardcoded.

## 15. Arquitetura de Produção: Firebase Cloud Functions Gen 2 (`functions/`)
- **Backend Node.js Serverless no Google Cloud:**
  - Migração de `server.ts` para pacote `functions/` (Node.js 20).
  - Entrypoint `functions/lib/index.js` com inicialização ultra-rápida (importação seletiva `{ onRequest }` de `firebase-functions/v2/https` e lazy loading de `server.cjs`), prevenindo o timeout de 10s da Firebase CLI.
  - Eliminação de dependências exclusivas de dev do bundle (`vite`, `createViteServer`) e restauração do módulo nativo `os`.
  - Configuração de `invoker: "public"` para acesso irrestrito (`allUsers`) via IAM do Cloud Run, eliminando erros 403 Forbidden no frete (`/api/shipping/calculate`) e busca web (`/api/search-product-images`).
  - Rewrites no `firebase.json` direcionando `/api/**`, `/mp-api/**` e `/assistant-api/**` para a função `api`.

## 16. Contingência Multi-Cloud & Fallback com Supabase (`AppContext.tsx` / `supabaseStorageService.ts`)
- **Proteção contra Cota Diária do Firestore (`resource-exhausted`):**
  - O banco nomeado do Google AI Studio (`ai-studio-09694ade-3353-47cf-8db0-531b70401d1b`) possui limite rígido de 20.000 writes/dia no Free Tier Database.
  - O `AppContext.tsx` (`updateProduct` e `addProduct`) espelha e persiste todas as alterações de mídia e fotos ativamente na tabela `products_media` e no Storage do Supabase.
  - Se o Firestore falhar por estouro de cota ou instabilidade, a gravação no Supabase garante que o trabalho do lojista nunca seja perdido.
  - No carregamento inicial (`initCatalog`), caso o snapshot do Firestore falhe ou caia no tratador de erro por cota, o sistema hidrata os produtos em memória a partir de `fetchProductMediaFromSupabase()`, mantendo fotos e descrições na vitrine.

## 17. Exclusão em Lote e Filtros de Visibilidade / Proteção de Vitrine (`MoblinkProductsManager.tsx` / `ProductDetail.tsx`)
- **Exclusão de Produtos em Lote (`handleBatchDeleteProducts`):**
  - Integração no menu flutuante (dock bar) `selectedIdsList.length > 0`.
  - Percorre o array `selectedIdsList`, removendo do Firestore via `deleteProduct(mobId)` e filtrando `moblinkList` no estado local.
  - Limpa a seleção e exibe notificação de feedback temporária.
- **Filtro Seletivo por Visibilidade (`visibilityFilter`):**
  - Dropdown com estados `'todos' | 'visivel' | 'oculto'` integrado ao predicado de filtro `filteredMoblinkList`.
- **Proteção Anti-Erro de Imagem (`onError` Fallback):**
  - Inclusão do manipulador `onError` com `NO_PHOTO_SVG` em imagens e miniaturas no `ProductDetail.tsx`.


