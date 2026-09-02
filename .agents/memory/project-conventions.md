---
type: project
created: 2026-08-26
updated: 2026-08-27
---

# Convenções do Projeto — Evidência Calçados

## Regras de Negócio da Loja / Vitrine

### 1. Visibilidade de Produtos por Foto Real & Ativação Automática no Banco (`hasProductValidPhoto`)
- **Critério Obrigatório:** Todo produto com **foto real válida** e **estoque positivo** (`stock > 0`) deve possuir a visibilidade ativada (`visible: true`) no Firestore.
- **Automação de Salvamento:** Ao carregar a lista de produtos, o sistema executa automaticamente em segundo plano a função `handleAutoSetVisibleForProductsWithPhotos`, gravando `visible: true` no Firestore para todos os produtos que possuem foto sem exigir intervenção manual do administrador.
- **Botão de Acionamento Manual:** O console superior possui o botão **`⚡ Salvar Visível (Todos com Foto)`** para varrer e persistir a visibilidade de 100% do catálogo em 1 clique.
- **Verificação:** Função `hasProductValidPhoto(item)` em `src/services/moblinkProductsService.ts`. URLs com placeholders são invalidadas.

### 2. Estoque 100% em Tempo Real direto da API do MobLink ERP (Sem Chamadas Desnecessárias ao Firebase)
- **Consulta Direta ao Abrir Produto:** Quando o cliente acessa a página de detalhes (`ProductDetail.tsx`) ou quando o administrador abre o modal de edição no painel (`MoblinkProductsManager.tsx`), o sistema consulta a API do MobLink ERP em tempo real (`getSingleProdutoMoblinkFromApi` e `getProdutoGradesFromApi`).
- **Otimização de Custos e Leituras Firebase:** A interface atualiza o estado local com o estoque e preço real instantaneamente. O sistema **só grava no Firebase se houver alteração real detectada por `hasProductChanged(p, liveErp)`**, evitando chamadas/gravações redundantes e desnecessárias no Firestore.

### 3. Rotas e Normalização de Categorias/Subcategorias (MobLink ERP)
- **Rotas com Fallback:** `fetchMoblinkCategories()` tenta em sequência `/produtos/grupos`, `/produtos/categorias`, `/grupos` e `/categorias`.
- **Códigos de Classificação:** O sistema padroniza códigos zero-padded (ex: `001.001` = Calçados Femininos, `001.002` = Calçados Masculinos, `001.003` = Calçados Infantis, `002` = Confecções, `005` = Perfumaria).
- **Normalização de Perfumaria & Beleza:** Subcategorias de perfumaria mantêm o público e tipo (ex: *Perfumes Femininos*, *Colônias*, *Body Splash*, *Kits & Presentes*).

### 4. Escopo de Filtros na Vitrine (`CategoryPage.tsx` e `ProductList.tsx`)
- Ao navegar em uma categoria (ex: *Perfumes*) e selecionar uma subcategoria (ex: *Feminino*), o filtro aplica a subcategoria estritamente **dentro do escopo da categoria pai** (`isProductInCategory(prod, parentCategory)`), evitando o vazamento de produtos de outras categorias como calçados ou roupas.

### 5. Ciclo de Vida de Pedidos em 5 Etapas Visuais Sincronizadas
- **Fluxo do Pedido Envio:** `1. Pedido Recebido` (Pendente) → `2. Pagamento Confirmado` → `3. Em Preparação` (etiqueta gerada, liberada ou postada na agência) → `4. Em Trânsito` (APENAS quando a transportadora registrar trânsito real) → `5. Entregue` (e estado terminal `❌ Cancelado`).
- **Fluxo de Retirada na Loja:** `1. Pedido Recebido` → `2. Pagamento Confirmado` → `3. Pronto p/ Retirada` → `4. Retirado na Loja`.
- **Sincronização em Tempo Real:** A régua visual do cliente em `OrderHistory.tsx` deriva sua etapa via `getOrderProgressStep(order)`, combinando `order.status`, `order.paymentStatus`, `order.labelStatus` e existência de `order.melhorEnvioId`.
- **Rastreamento Transparente:** A régua visual exibe marcadores nítidos com indicação de progresso preenchido e pulse/ring na etapa corrente.
- **Informações Completas do Comprador:** Cada pedido armazena e exibe Nome, E-mail, Telefone (com link direto de WhatsApp `wa.me`), CPF, RG e Endereço detalhado para entrega ou retirada na loja.
- **Visualização de Itens Comprados:** Os produtos do pedido vêm abertos por padrão na visualização tanto do cliente quanto do administrador, exibindo miniatura, numeração/tamanho, quantidade, valor unitário e subtotal da linha.

### 6. Modalidade Exclusiva "Retirada na Loja"
- **Local:** Loja Física Evidência Calçados — Rua Afonso Pena, 295 - Centro, Caxias - MA.
- **Horários:** Segunda a Sexta: 08h às 18h | Sábados: 08h às 13h.
- **Frete:** Sempre isento (R$ 0,00).
- **Feedback Visual Dedicado:** Banner roxo e etiquetas específicas quando o pedido atinge a Etapa 3 ("Pronto p/ Retirada no Balcão").

### 7. Vínculo com o Sistema Local (ERP/PDV) — Campo `localSaleId`
- O lojista pode vincular o número da venda emitida no PDV físico ao pedido online.
- Campo `localSaleId` no pedido com pill no cabeçalho (`🖥️ ERP: #ID`) e pesquisa instantânea no Spotlight search.

### 8. Padrão Estético Apple Store (HIG) e Grid de 8 Pontos
- Nós de 36px com trilho centralizado a 18px do topo.
- Cards internos com fluxo vertical compacto natural (`space-y-3.5`) e `p-5` (20px), sem estiramentos artificiais que abrem vácuos visuais.

### 9. Regra Estrita de Emissão de Etiquetas: Proibição de Falsos Positivos
- **Etiqueta Local (Romaneio Próprio):** Permitida **exclusivamente** para entregas locais realizadas diretamente pela frota/motoboy da loja em Caxias urbana.
- **Melhor Envio (Transportadoras Externas):** Em caso de indisponibilidade de saldo, erro de validação ou recusa da API externa, o sistema **NUNCA deve gerar etiqueta local de contingência**. O erro real da API deve ser exibido com transparência ao lojista, evitando falsos positivos onde o pedido parece despachado mas não foi registrado na transportadora.

### 10. Gestão de Endereços de Entrega & Detecção de UF por CEP
- **Prevenção de Inconsistência de UF:** O sistema utiliza `getUfFromCep(cep)` para deduzir e validar a UF real correspondente à faixa de prefixo nacional do CEP, impedindo envio de UFs errôneas para a API de frete (ex: CEP 64xxx do Piauí com UF marcada como MA).
- **Exclusão de Endereços Extras:** O cliente pode cadastrar e excluir endereços adicionais de entrega livremente no checkout (ícone de lixeira com confirmação e persistência no Firestore), preservando intacto seu endereço principal.

