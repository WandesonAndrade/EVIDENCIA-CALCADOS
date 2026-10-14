# Plano de Implementação: Remoção de Fundo de Fotos

## Objetivo
Implementar a funcionalidade de remoção automática de fundo para fotos de produtos, tanto no momento do upload de novas imagens (arrastar e soltar ou por URL) quanto para fotos já salvas na página de edição do produto.

## Tarefas
- [ ] **Escolha do motor de remoção** – Avaliar remoção via WebAssembly no navegador (ex: `@imgly/background-removal`, 100% gratuito e sem custos de API) versus API externa (remove.bg, Clipdrop, Photoroom). Documentar prós, contras, custos, latência e requisitos.
- [ ] **Adicionar toggle/opção na interface (UI)** – No card de upload à esquerda em `ProductEditPage.tsx` e no modal `ProductWebImageSearchModal`, adicionar uma opção/switch "Remover fundo automaticamente" vinculada ao estado `removeBackgroundEnabled`.
- [ ] **Criar função utilitária de remoção** – Desenvolver o helper `removeBackground(fileOrUrl): Promise<File|Blob|string>` que executa o processamento do motor escolhido e retorna a imagem tratada.
- [ ] **Integrar ao fluxo de upload** – Ajustar `handleFileUpload` e `handleAddImageUrl`:
  1. Capturar o arquivo selecionado ou URL.
  2. Se a opção "Remover fundo" estiver ativada, processar a imagem com `removeBackground` antes (ou após) o envio.
  3. Enviar a imagem sem fundo ao Supabase Storage e atualizar o array `images` do produto.
- [ ] **Ação para fotos já salvas** – Na galeria "Fotos Ativas", incluir um botão de ação rápida (ex: ícone de varinha mágica / tesoura) sobre cada foto existente para disparar a remoção de fundo sob demanda, substituindo ou gerando uma nova versão da foto.
- [ ] **Gerenciamento de estado e feedback visual** – Adicionar estados de carregamento (`isProcessingBackground`), desabilitar ações durante o processamento e exibir spinners/indicadores claros de progresso.
- [ ] **Tratamento de erros e experiência do usuário (UX)** – Caso o processamento falhe, manter a foto original intacta e exibir notificação de aviso (via Sonner toast) com opção de tentar novamente.
- [ ] **Validação e testes** –
  - Testar o upload com remoção ativada e desativada.
  - Testar a remoção sob demanda em fotos já existentes.
  - Validar compatibilidade em navegadores desktop e mobile.
- [ ] **Performance e limites** – Aplicar compressão/redimensionamento prévio se a foto for muito pesada para não travar a interface nem exceder cotas.

## Critérios de Conclusão (Done When)
- [ ] Opção de remoção de fundo disponível e funcionando no upload de novos arquivos.
- [ ] Opção disponível e funcionando ao buscar/adicionar foto por URL.
- [ ] Botão de remoção de fundo acessível e funcional nas fotos já salvas na galeria.
- [ ] Imagens tratadas salvas com sucesso no Supabase Storage.
- [ ] Build e testes passando sem erros de TypeScript ou regressões na interface.

## Observações
- A solução no cliente (WebAssembly no navegador) tem custo zero de API, ideal para a maioria dos casos.
- Manter uma cópia ou referência da imagem original pode ser útil caso o usuário queira desfazer a remoção.
