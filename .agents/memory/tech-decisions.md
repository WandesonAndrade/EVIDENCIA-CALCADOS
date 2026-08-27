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

## 5. Validação do Código
- Execução de `npm run lint` (`tsc --noEmit`) e `npm run build` após alterações de estrutura/tipagem para garantir 0 erros de build em produção.
