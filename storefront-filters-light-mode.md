# Plano de Implementação: Refinamento dos Filtros da Vitrine & Remoção do Tema Dark

## 1. Overview (Visão Geral)
Este plano estrutura a correção integral das inconsistências identificadas na auditoria dos filtros da frente de loja (vitrine) da **Evidência Calçados** e a **remoção definitiva do Tema Escuro (Dark Mode)** em toda a aplicação, fixando a experiência visual no **Modo Claro (Light Mode)** com suporte total ao tema padrão (**Azul Evidência**) e às campanhas sazonais (**Outubro Rosa**).

## 2. Project Type
- **Tipo:** `WEB` (React 19 + TypeScript + Vite + Tailwind CSS)
- **Agente Primário:** `frontend-specialist`
- **Skills Associadas:** `clean-code`, `frontend-architecture`, `plan-writing`, `lint-and-validate`

## 3. Success Criteria (Critérios de Sucesso)
- [x] **Tema Dark 100% desativado:** Estado `theme` sempre fixo em `'light'`, classe `.dark` removida do `document.documentElement`, `colorScheme = 'light'`, e botões de alternância Sol/Lua (`toggleTheme`) removidos do `Header.tsx` e do `AdminPanel.tsx`.
- [x] **Qualificação de Público Precisa (`Feminino`, `Masculino`, `Infantil`):** Produtos `Unissex` ou de grupos neutros (`011 Viagens`, `012 Escolar`, `013 Acessórios`, `014 Esportivo`) não caem indevidamente em Feminino; `isProductInAudience` integrado com `resolveProductGender`.
- [x] **Sincronização Atômica de Navegação (`selectedCategory` + `selectedMenuTab`):** Clicar em *"Ver todas as novidades →"*, banners do Hero ou nos 3 Cards Promocionais (`promo:ID`, `categoria:X`, `subcategoria:Y`) atualiza simultaneamente `selectedCategory` e `selectedMenuTab`.
- [x] **Unificação de Grade/Tamanhos e Marcas na `CategoryPage`:** Filtro lateral de tamanhos utilizando `extractAvailableSizes` (validando saldo $> 0$ por tamanho) e filtro de marcas utilizando `resolveProductBrand` (`brandUtils.ts` com todas as 56+ marcas oficiais).
- [x] **Fidelidade de Preço e Promoções nos Filtros Laterais:** Filtro de faixa de preço e checkbox *"Apenas em Promoção"* baseados no preço efetivo (`calculateProductPriceDetails`, contemplando **Saldão** e **Campanhas Promocionais Ativas**), além de seletor de ordenação (*Mais Relevantes, Menor Preço, Maior Preço, Lançamentos*) e reset automático de filtros laterais ao trocar de categoria principal.
- [x] **Blindagem de Busca e Menu Sanduíche:** `HeaderLiveSearch.tsx`, `ProductList.tsx` e `CategorySandwichMenu.tsx` filtrando estritamente produtos visíveis, com estoque $> 0$, foto válida, sem `001.001` (`isIgnoredClassification`) e sem `"Sem Classificação Definida"`.
- [x] **Zero Erros de Compilação e Testes:** `npx tsc --noEmit` (0 erros), testes de navegação e busca passando 100% e `npm run build` concluído com sucesso.

## 4. Tech Stack
- **Frontend:** React 19, TypeScript, Tailwind CSS
- **Estado & Persistência:** Context API (`AppContext.tsx`), LocalStorage / SessionStorage, Firebase Firestore

## 5. File Structure (Arquivos Afetados)
```text
src/
├── App.tsx                                               # Remoção de condicionais dark no layout raiz
├── index.css                                             # Fixação de color-scheme: light
├── context/
│   └── AppContext.tsx                                    # Fixação de theme = 'light', limpeza de localStorage('evidencia_theme')
├── utils/
│   ├── brandUtils.ts                                     # Fonte única de verdade para marcas no filtro lateral
│   └── genderUtils.ts                                    # Alinhamento com isProductInAudience
└── components/
    ├── Header.tsx                                        # Remoção do botão Sol/Lua (toggleTheme) e ajustes de navegação
    ├── AdminPanel.tsx                                    # Remoção do botão de alternância de tema dark no painel
    ├── ProductList.tsx                                   # Sincronização de selectedMenuTab em Novidades/Cards e blindagem de busca
    ├── CategoryPage.tsx                                  # Unificação de marcas, tamanhos, preço efetivo, ordenação, reset e tema rosa
    ├── CategorySandwichMenu.tsx                          # Filtro estrito de estoque/foto e subcategorias canônicas
    └── products/
        ├── storefront/
        │   ├── HeaderLiveSearch.tsx                      # Blindagem contra produtos sem classificação / 001.001
        │   └── StorefrontProductCard.tsx                 # Exportação/uso compartilhado de extractAvailableSizes com saldo > 0
        └── utils/
            ├── categoryNavigationUtils.ts                # Refinamento de isProductInAudience (sem falso-positivo em Feminino)
            └── productFilterUtils.ts                     # Consolidação das regras de filtragem da vitrine
```

## 6. Task Breakdown (Cronograma de Tarefas)

### Task 1: Remoção do Tema Dark no Core e Cabeçalhos
- **Agent:** `frontend-specialist` | **Skill:** `clean-code`
- **Priority:** P0 | **Dependencies:** Nenhuma
- **INPUT:** `src/context/AppContext.tsx`, `src/App.tsx`, `src/components/Header.tsx`, `src/components/AdminPanel.tsx`, `src/index.css`
- **OUTPUT:**
  1. Em `AppContext.tsx`: forçar `theme` sempre como `'light'`, remover a classe `'dark'` do `document.documentElement`, definir `document.documentElement.style.colorScheme = 'light'`, limpar `evidencia_theme` e transformar `toggleTheme` em no-op seguro.
  2. Em `Header.tsx` e `AdminPanel.tsx`: remover o botão de alternância Sol/Lua (`#theme-toggle-button`).
  3. Em `App.tsx`: remover classes condicionais de fundo escuro (`bg-[#050b18]`, `bg-[#0B0F19]`, `bg-[#0d0d0e]`).
- **VERIFY:** Inspecionar cabeçalho da loja e painel admin (sem botão de lua/sol) e confirmar `document.documentElement.classList.contains('dark') === false`.

### Task 2: Correção da Qualificação por Público (`isProductInAudience` & `genderUtils.ts`)
- **Agent:** `frontend-specialist` | **Skill:** `clean-code`
- **Priority:** P1 | **Dependencies:** Task 1
- **INPUT:** `src/components/products/utils/categoryNavigationUtils.ts`, `src/utils/genderUtils.ts`
- **OUTPUT:**
  1. Integrar `resolveProductGender` e regras estritas de grupo ERP em `isProductInAudience`.
  2. Garantir que produtos `013.008` (Cueca) sejam estritamente Masculinos.
  3. Garantir que produtos de grupos neutros (`011 Viagens`, `012 Escolar`, `013 Acessórios` como Relógio/Cinto/Boné/Carteira/Meia, `014 Esportivo`) sem indicação feminina não caiam por fallback cego na coleção Feminina (ou que itens explicitamente `Unissex` apareçam tanto em Feminino quanto em Masculino quando aplicável).
- **VERIFY:** Executar `npx tsx tests/test-category-navigation.ts` e validar que produtos masculinos/neutros não vazam para Feminino.

### Task 3: Sincronização de Estado de Navegação (`selectedMenuTab` + `selectedCategory`)
- **Agent:** `frontend-specialist` | **Skill:** `frontend-architecture`
- **Priority:** P1 | **Dependencies:** Task 1
- **INPUT:** `src/components/ProductList.tsx`, `src/components/CategoryPage.tsx`, `src/components/Hero.tsx`
- **OUTPUT:**
  1. Em `ProductList.tsx`: no botão *"Ver todas as novidades →"* (linha 633), definir `setSelectedMenuTab('novidades')` junto com `setSelectedCategory('NOVIDADES', 'TODAS')`.
  2. Em `ProductList.tsx`: em `handlePromoCardClick` (linha 246), quando o link for `promo:ID`, definir `setSelectedMenuTab(cleanLink)` e `setSelectedCategory('OFERTAS', 'TODAS')`.
  3. Em `CategoryPage.tsx`: resetar automaticamente os filtros laterais (`selectedBrands`, `selectedSizes`, `priceRange`, `onlySale`, `brandSearch`) sempre que `selectedMenuTab` ou `selectedCategory` mudar.
- **VERIFY:** Navegar de uma categoria filtrada (ex: Masculino com marca selecionada) para "Novidades" ou card promocional e verificar que a nova página abre limpa e na coleção certa.

### Task 4: Unificação de Marcas, Tamanhos com Estoque, Preço Efetivo e Ordenação na `CategoryPage`
- **Agent:** `frontend-specialist` | **Skill:** `clean-code`
- **Priority:** P1 | **Dependencies:** Task 3
- **INPUT:** `src/components/CategoryPage.tsx`, `src/components/products/storefront/StorefrontProductCard.tsx`, `src/utils/brandUtils.ts`
- **OUTPUT:**
  1. Substituir `KNOWN_FOOTWEAR_BRANDS` local da `CategoryPage.tsx` por `resolveProductBrand(prod)` de `src/utils/brandUtils.ts`.
  2. Substituir a extração manual de tamanhos na `CategoryPage.tsx` por `extractAvailableSizes(prod)` de `StorefrontProductCard.tsx`, garantindo que tamanhos com saldo explicitamente `0` em `stockBySize`/`sizeStockMap` sejam ignorados.
  3. Atualizar o filtro de **Faixa de Preço** e **Apenas em Promoção** (`onlySale`) na `CategoryPage.tsx` para usar `calculateProductPriceDetails(prod, saldaoConfig, promotions)` (considerando preço efetivo com Saldão e Campanhas Promocionais).
  4. Adicionar seletor de **Ordenação** (*Mais Relevantes, Menor Preço, Maior Preço, Lançamentos*) no cabeçalho da `CategoryPage.tsx` e harmonizar os estados ativos do filtro lateral com o tema **Outubro Rosa**.
  5. Sincronizar `availableSubcategories` com `searchQuery` ativa.
- **VERIFY:** Filtrar por marca, numeração, faixa de preço e promoção na `CategoryPage` e testar a ordenação por menor/maior preço.

### Task 5: Blindagem da Busca Instantânea (`HeaderLiveSearch`) e Menu Sanduíche (`CategorySandwichMenu`)
- **Agent:** `frontend-specialist` | **Skill:** `clean-code`
- **Priority:** P2 | **Dependencies:** Task 2
- **INPUT:** `src/components/products/storefront/HeaderLiveSearch.tsx`, `src/components/ProductList.tsx`, `src/components/CategorySandwichMenu.tsx`
- **OUTPUT:**
  1. Em `HeaderLiveSearch.tsx` e `ProductList.tsx` (`baseFilteredProducts`): adicionar validação `!isIgnoredClassification(prod)` e `!isUnclassified` (`extractClassificacaoCategoria`).
  2. Em `CategorySandwichMenu.tsx`: filtrar categorias e subcategorias considerando apenas produtos com `visible !== false`, estoque $> 0$, foto válida (`hasProductValidPhoto`) e classificação definida, utilizando `resolveProductSubcategoryName(p)` para evitar subcategorias genéricas ou vazias.
- **VERIFY:** Executar `npx tsx tests/test-smart-search.ts` e `npx tsx tests/test-unclassified-products.ts`.

## 7. Phase X: Final Verification Checklist
- [x] `npx tsc --noEmit` retorna `0` erros de TypeScript
- [x] `npx tsx tests/test-category-navigation.ts` passa 100%
- [x] `npx tsx tests/test-smart-search.ts` passa 100%
- [x] `npx tsx tests/test-unclassified-products.ts` passa 100%
- [x] `npm run build` compila o bundle de produção sem erros
- [x] Verificação de ausência do botão de tema dark e consistência visual no modo claro (Azul Evidência e Outubro Rosa)
