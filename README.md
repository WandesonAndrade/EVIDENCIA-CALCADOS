# 👠 Evidência Calçados — E-Commerce & ERP Integrado

Sistema Full-Stack completo para a **Evidência Calçados**, combinando uma experiência de compras online fluida, painel administrativo CMS estilo SaaS e sincronização bidirecional em tempo real com o ERP **MobLink**.

---

## 🌟 Principais Recursos

### 🛍️ E-Commerce & Experiência do Cliente
- **Catálogo Inteligente:** Carregamento ultra-rápido (0ms via cache local) com revalidação e atualização de estoque em tempo real.
- **Grades e Tamanhos:** Visualização dinâmica de estoque por numeração de calçado e variações de cores.
- **Primeiro Acesso para Clientes da Loja Física:** Wizard de ativação em 3 etapas para clientes com cadastro prévio no ERP MobLink, validando CPF e Data de Nascimento (com proteção anti-força bruta e conformidade LGPD).
- **Múltiplas Formas de Pagamento:** Suporte a **PIX dinâmico** com confirmação e **Crediário Próprio da Loja** (consulta de limite aprovado e contas a receber).
- **Recursos Interativos:** Carrinho persistente, busca com preenchimento automático de endereço via ViaCEP, lista de favoritos e suporte a modo escuro/claro.

### ⚙️ Painel Administrativo, CMS & Assistentes com IA
- **Assistente de Fotos na Web:** Pesquisa fotos em alta resolução de calçados diretamente na web, com download no backend, conversão automática para WebP 80%, miniaturas de 150px e salvamento no Supabase Storage e Firestore.
- **Assistente de Copywriting com IA & Web Intelligence:** Gera descrições persuasivas com ficha técnica limpa e sem especulação de marca, consultando sites de fabricantes e e-commerces em tempo real (altura do salto, palmilhas anatômicas, solado antiderrapante e ocasiões de uso).
- **Componentização Modular (`src/components/products/admin/ai`):** Componentes atômicos e hooks reutilizáveis para acionar busca de fotos e descrições em qualquer tabela ou modal com 1 linha de código.
- **Menu Sanduíche Responsivo:** Navegação moderna com menu hambúrguer para mobile (drawer deslizante com backdrop) e modo colapsável no desktop para ganho de espaço útil de tela.
- **Estrutura Operacional em 4 Grupos:** Dashboard & Vendas, Catálogo & Estoque, CMS & Vitrine e Sistema.
- **Pipeline WebP & Fotos até 8 MB:** Upload com compressão adaptativa no navegador, conversão automática para WebP, geração de miniaturas (150x150) e exclusão limpa em cascata no Supabase Storage.
- **Gestão Inteligente de Grades:** Vinculação de fotos por cor exclusiva para calçados com desmembramento de grade no MobLink ERP; interface simplificada para itens sem variações.
- **Gestão de Banners (Hero):** Upload, edição e ordenação de banners da página inicial focados em conversão e moda.
- **Gestão Comercial:** Controle de campanhas promocionais, módulo de Saldão/Outlet, gestão de vendedores e registro de auditoria de sincronização.

### 🔒 Segurança & Backend Proxy
- **Servidor Proxy Node.js (`server.ts`):** Centraliza a autenticação com o ERP MobLink, mantendo o token JWT seguro na memória RAM do servidor backend sem expor credenciais no navegador.
- **Regras no Firestore:** Políticas de segurança granular para dados de layout, pedidos e autenticação.

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 19** + **TypeScript**
- **Vite 6** (Build tool e servidor de desenvolvimento rápido)
- **Tailwind CSS v4** (Estilização utilitária moderna)
- **Motion / Framer Motion** (Animações e transições)
- **Lucide React** (Ícones vetoriais)

### Backend & Proxy
- **Node.js** + **Express**
- **TSX** (Execução TypeScript nativa em desenvolvimento)
- **ESBuild** (Empacotamento do servidor backend para produção)

### Banco de Dados, Autenticação & Storage
- **Firebase Firestore:** Banco NoSQL em tempo real para configurações de layout, pedidos, favoritos e dados complementares.
- **Firebase Auth:** Autenticação por CPF + Senha e Google Sign-In.
- **Supabase Storage:** Armazenamento escalável de fotos de produtos e galeria de imagens.

---

## 📁 Estrutura do Projeto

```text
EVIDENCIA-CALCADOS/
├── server.ts                 # Backend Express Proxy (Renovação de JWT e rotas de integração)
├── index.html                # Ponto de entrada HTML da aplicação SPA
├── package.json              # Dependências e scripts do projeto
├── vite.config.ts            # Configurações do Vite, React e Tailwind
├── firestore.rules           # Regras de segurança do Firebase Firestore
├── api/                      # Handlers leves de API
├── src/
│   ├── App.tsx               # Componente raiz com roteamento de visões
│   ├── main.tsx              # Inicialização do React DOM
│   ├── types.ts              # Interfaces e tipos TypeScript centrais
│   ├── components/           # Componentes visuais e telas
│   │   ├── AdminPanel.tsx              # Painel CMS e controle da loja
│   │   ├── MoblinkProductsManager.tsx  # Gestão de produtos e fotos do ERP
│   │   ├── MoblinkClientsManager.tsx   # Gestão de clientes e crediário
│   │   ├── FirstAccessModal.tsx        # Modal de Primeiro Acesso para clientes físicos
│   │   ├── ProductList.tsx             # Listagem e vitrine de produtos
│   │   ├── ProductDetail.tsx           # Tela detalhada de produto com grades e cores
│   │   ├── Cart.tsx                    # Carrinho de compras e cálculo de entrega
│   │   ├── MeuCrediario.tsx            # Consulta de limites e faturas do cliente
│   │   ├── PixPaymentModal.tsx         # Modal de pagamento via PIX
│   │   └── ...                         # Demais componentes auxiliares
│   ├── services/             # Regras de negócio e integração de APIs
│   │   ├── api.ts                      # Centralizador de endpoints e URLs base
│   │   ├── moblinkProductsService.ts   # Catálogo e sincronização com ERP MobLink
│   │   ├── moblinkClientesService.ts   # Consulta e cadastro de clientes no ERP
│   │   ├── firstAccessAuthService.ts   # Validação de Primeiro Acesso
│   │   ├── supabaseStorageService.ts   # Upload, exclusão e auditoria de fotos
│   │   ├── catalogCacheService.ts      # Cache local do catálogo para 0ms de carregamento
│   │   ├── firebaseAuthService.ts      # Serviços de autenticação Firebase
│   │   └── ...                         # Demais serviços (CEP, Vendedores, Saldão, etc.)
│   ├── context/              # Contextos globais do React (AppContext)
│   ├── lib/                  # Inicializadores (Firebase SDK, Auth helpers)
│   └── utils/                # Utilitários (Formatadores, detecção de placeholders, etc.)
└── tests/                    # Scripts de testes automatizados
```

---

## 🚀 Como Executar o Projeto

### 1. Pré-requisitos
- **Node.js:** Versão 18.x ou superior (Recomendado: v20.x ou v22.x LTS).
- **NPM** ou **Yarn / Bun / PNPM**.

### 2. Instalação das Dependências
Clone o repositório e execute a instalação na pasta raiz:

```bash
npm install
```

### 3. Configuração de Variáveis de Ambiente
Copie o modelo `.env.example` para `.env` na raiz do projeto e preencha suas chaves:

```bash
cp .env.example .env
```

Principais variáveis:
```env
# IA Generativa (Opcional - Google Gemini 2.5 Flash para copywriting)
GEMINI_API_KEY="sua_chave_gemini_aqui"

# URL da API do ERP MobLink
VITE_API_URL="https://api.evidenciacalcados.com.br/api/v1"

# Credenciais de autenticação da API MobLink (utilizadas no backend proxy)
EVIDENCIA_API_USER="seu_usuario"
EVIDENCIA_API_PASSWORD="sua_senha"
EVIDENCIA_API_LOJA="sua_loja"

# Configuração do Firebase (Auth & Firestore)
VITE_FIREBASE_PROJECT_ID="seu-projeto-firebase"
VITE_FIREBASE_APP_ID="seu-app-id"
VITE_FIREBASE_API_KEY="sua-api-key"
VITE_FIREBASE_AUTH_DOMAIN="seu-projeto.firebaseapp.com"
VITE_FIREBASE_STORAGE_BUCKET="seu-projeto.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="seu-sender-id"

# Configuração do Supabase Storage (Upload e fotos de produtos)
VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
VITE_SUPABASE_ANON_KEY="sua-anon-key"
VITE_SUPABASE_BUCKET="products"
```


### 4. Executando em Modo de Desenvolvimento
Inicia o backend proxy Express integrado ao Vite com Hot Module Replacement (HMR):

```bash
npm run dev
```

Acesse no navegador: **`http://localhost:3000`**

---

## 📦 Scripts Disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor Node.js (`server.ts`) com Vite em modo de desenvolvimento |
| `npm run build` | Compila o frontend React com Vite e gera o bundle de produção do `server.ts` via `esbuild` em `dist/server.cjs` |
| `npm run start` | Executa o servidor de produção compilado (`node dist/server.cjs`) |
| `npm run lint` | Executa a verificação estática de tipos TypeScript (`tsc --noEmit`) |
| `npm test` | Executa a suíte de testes de autenticação e integração |
| `npm run preview`| Inicia o preview local da build do Vite |

---

## 💡 Diretrizes de Desenvolvimento

1. **Proteção de Fotos Reais:** O pipeline de imagens foi projetado para nunca substituir fotos reais por placeholders genéricos. Utilize a função `isPlaceholderUrl` de `src/utils/placeholder.ts` para validações.
2. **Segurança de Credenciais:** Nunca exponha credenciais ou senhas da API MobLink no código do cliente React. Todas as chamadas diretas que exigem privilégios passam pelo `server.ts`.
3. **Cache com Revalidação:** O carregamento do catálogo segue a estratégia de entrega instantânea via cache local do navegador (`catalogCacheService.ts`), sincronizando atualizações de fotos e saldos de estoque em segundo plano.

---

## 📄 Licença

Este projeto é de uso proprietário da **Evidência Calçados**. Todos os direitos reservados.
