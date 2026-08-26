---
type: tech
created: 2026-08-26
updated: 2026-08-26
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

## 3. Validação do Código
- Execução de `npm run lint` (`tsc --noEmit`) e `npm run build` após alterações de estrutura/tipagem para garantir 0 erros de build em produção.
