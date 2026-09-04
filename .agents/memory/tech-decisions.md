---
type: tech
created: 2026-08-26
updated: 2026-08-27
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

