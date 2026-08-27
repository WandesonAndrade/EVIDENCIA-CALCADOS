# Memory Index

## Project
- [project] Regra de Foto Obrigatória: apenas produtos com foto real e válida (`hasProductValidPhoto`) e estoque > 0 aparecem na vitrine e menus → project-conventions.md
- [project] Categorias e Subcategorias no MobLink ERP: resolução por código de classificação (`resolveClassificacao`) e nome normalizado → project-conventions.md
- [project] Top Navbar Header & Mega-Menu: apenas 'Ofertas & Saldão', 'Feminino', 'Masculino', 'Infantil'. Subcategorias dinâmicas sem divisões engessadas → tech-decisions.md
- [project] Filtro de Escopo de Categoria: seleção de subcategoria mantém filtro restrito à categoria pai → project-conventions.md
- [project] Sincronização Individual por ID: administrador pode sincronizar um único produto específico pelo ID do MobLink ERP → tech-decisions.md

## User
- [user] Idioma principal: Português (Brasil) → user-preferences.md
- [user] Workflow Git: sempre fazer commits das alterações finalizadas na branch `dev` → user-preferences.md
- [user] Preferência de Exibição: subcategorias reais cadastradas sem seções rígidas artificiais → user-preferences.md

## Tech
- [tech] Resolução de Fotos: verificar `images`, `imageUrl`, `foto_uri`, `colorImages`, `colorImageMap` ignorando placeholders → tech-decisions.md
- [tech] Classificação de Público: identificação por código ERP (001.001 Fem, 001.002 Masc, 001.003 Inf) e inferência contextual → tech-decisions.md
- [tech] Endpoint de Produto Único: `getSingleProdutoMoblink(id)` consulta endpoints diretos por ID e busca com fallback no catálogo ERP → tech-decisions.md
