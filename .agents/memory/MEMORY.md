# Memory Index

## Project
- [project] Regra de Foto Obrigatória: apenas produtos com foto real e válida (`hasProductValidPhoto`) e estoque > 0 aparecem na vitrine e menus → project-conventions.md
- [project] Categorias e Subcategorias no MobLink ERP: resolução por código de classificação (`resolveClassificacao`) e nome normalizado → project-conventions.md
- [project] Top Navbar Header & Mega-Menu: apenas 'Ofertas & Saldão', 'Feminino', 'Masculino', 'Infantil'. Subcategorias dinâmicas sem divisões engessadas → tech-decisions.md
- [project] Filtro de Escopo de Categoria: seleção de subcategoria mantém filtro restrito à categoria pai → project-conventions.md
- [project] Sincronização Individual por ID: administrador pode sincronizar um único produto específico pelo ID do MobLink ERP → tech-decisions.md
- [project] Ciclo de Vida dos Pedidos (5 Etapas Sincronizadas): 'Pedido Recebido' → 'Pagamento Aprovado' → 'Em Preparação' (etiqueta gerada/postada) → 'Em Trânsito' (estrito à transportadora) → 'Entregue / Retirado' → project-conventions.md
- [project] Modalidade Retirada na Loja: loja física do Centro, frete grátis, banner e etapa 'Pronto p/ Retirada' → project-conventions.md
- [project] Vínculo ERP Local (`localSaleId`): integração do ID de venda física PDV ao pedido online com busca rápida → project-conventions.md
- [project] Integridade de Frete e Endereços: detecção de UF por CEP (`getUfFromCep`), exclusão de endereços extras e bloqueio de falsos positivos na emissão de etiquetas → project-conventions.md

## User
- [user] Idioma principal: Português (Brasil) → user-preferences.md
- [user] Workflow Git: sempre fazer commits das alterações finalizadas na branch `api` ou `dev` → user-preferences.md
- [user] Preferência de Exibição: subcategorias reais cadastradas sem seções rígidas artificiais → user-preferences.md
- [user] Visibilidade de Pedidos: itens comprados sempre abertos/visíveis por padrão sem necessidade de clicar em detalhes → user-preferences.md
- [user] Rastreio e Etiquetas: 'Em Trânsito' apenas sob status real do transportador; etiquetas próprias locais apenas para entregas da própria loja → user-preferences.md

## Tech
- [tech] Resolução de Fotos: verificar `images`, `imageUrl`, `foto_uri`, `colorImages`, `colorImageMap` ignorando placeholders → tech-decisions.md
- [tech] Classificação de Público: identificação por código ERP (001.001 Fem, 001.002 Masc, 001.003 Inf) e inferência contextual → tech-decisions.md
- [tech] Endpoint de Produto Único: `getSingleProdutoMoblink(id)` consulta endpoints diretos por ID e busca com fallback no catálogo ERP → tech-decisions.md
- [tech] Gestão de Cache de Pedidos & SWR: Firestore como autoridade máxima. Pedidos deletados do banco não são ressuscitados pelo cache local → tech-decisions.md
- [tech] Sanitização Recursiva Firestore: `cleanUndefinedProperties` para prevenção de erros de campos indefinidos e auto-cura → tech-decisions.md
- [tech] Rastreamento Melhor Envio: busca indexada com `q`, sem mocks silenciosos em erros e sincronização em lote com throttle → tech-decisions.md
- [tech] Logística Melhor Envio: hierarquia anti-regressão de status, dead code elimination completa e rastreamento oficial prioritário → tech-decisions.md

