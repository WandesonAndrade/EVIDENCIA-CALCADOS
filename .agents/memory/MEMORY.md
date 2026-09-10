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
