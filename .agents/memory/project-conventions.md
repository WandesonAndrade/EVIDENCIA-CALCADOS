---
type: project
created: 2026-08-26
updated: 2026-08-26
---

# Convenções do Projeto — Evidência Calçados

## Regras de Negócio da Loja / Vitrine

### 1. Visibilidade de Produtos por Foto Real (`hasProductValidPhoto`)
- **Critério Obrigatório:** Nenhum produto deve aparecer na frente de loja (vitrine, páginas de categoria, carrosséis ou mega-menus) a não ser que possua **foto real válida** e **estoque positivo** (`stock > 0` ou `saldo_loja > 0`).
- **Verificação:** Função `hasProductValidPhoto(item)` centralizada em `src/services/moblinkProductsService.ts`.
- **Campos verificados:** `images`, `imageUrl`, `foto_uri`, `colorImages`, `colorImageMap`. URLs com placeholders (ex: `via.placeholder.com`, `placeholder`) são invalidadas.

### 2. Rotas e Normalização de Categorias/Subcategorias (MobLink ERP)
- **Rotas com Fallback:** `fetchMoblinkCategories()` tenta em sequência `/produtos/grupos`, `/produtos/categorias`, `/grupos` e `/categorias`.
- **Códigos de Classificação:** O sistema padroniza códigos zero-padded (ex: `001.001` = Calçados Femininos, `001.002` = Calçados Masculinos, `001.003` = Calçados Infantis, `002` = Confecções, `005` = Perfumaria).
- **Normalização de Perfumaria & Beleza:** Subcategorias de perfumaria mantêm o público e tipo (ex: *Perfumes Femininos*, *Colônias*, *Body Splash*, *Kits & Presentes*).

### 3. Escopo de Filtros na Vitrine (`CategoryPage.tsx` e `ProductList.tsx`)
- Ao navegar em uma categoria (ex: *Perfumes*) e selecionar uma subcategoria (ex: *Feminino*), o filtro aplica a subcategoria estritamente **dentro do escopo da categoria pai** (`isProductInCategory(prod, parentCategory)`), evitando o vazamento de produtos de outras categorias como calçados ou roupas.
