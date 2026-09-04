# 📦 Contexto Técnico - Integração Melhor Envio (Evidência Calçados)

Documento de referência rápida e aprofundada sobre toda a integração com a API do **Melhor Envio** no projeto **Evidência Calçados**.

---

## 1. Visão Geral da Arquitetura

A integração é desacoplada da aplicação através de um padrão de **Provider/Adapter (Factory)**:

```
[ Frontend (ShippingInfoCard / OrderHistory) ]
                      │
                      ▼ HTTP Fetch
[ Backend Proxy (server.ts) ]
  • POST /api/shipping/calculate
  • POST /api/shipping/labels/generate
  • POST /api/shipping/labels/cancel
  • POST /api/shipping/track
  • POST /api/webhooks/shipping
                      │
                      ▼ Provider Factory (ShippingService)
[ MelhorEnvioAdapter (src/services/shipping/providers/melhorEnvio/) ]
                      │
                      ▼ HTTPS c/ Bearer Token
[ API Oficial Melhor Envio (Sandbox ou Produção) ]
```

### Arquivos Chave da Integração
- `src/services/shipping/providers/melhorEnvio/melhorEnvioAdapter.ts`: Adapter com todas as chamadas à API v2 do Melhor Envio.
- `src/services/shipping/providers/melhorEnvio/melhorEnvioConfig.ts`: Leitura segura de variáveis de ambiente no Node.js e Vite.
- `src/services/shipping/shippingService.ts`: Factory de provedores (`IShippingProvider`).
- `src/services/shipping/shippingTracker.ts`: Orquestrador de sincronização de status, eventos e gravação no Firestore/estado global.
- `server.ts`: Rotas proxy seguras para ocultar o token do cliente.
- `tests/test-melhor-envio-cli.ts`: Ferramenta CLI de diagnóstico direto no terminal.

---

## 2. Configurações e Variáveis de Ambiente (`.env`)

| Variável | Descrição | Exemplo |
| :--- | :--- | :--- |
| `MELHOR_ENVIO_ENV` | Ambiente de execução (`sandbox` ou `production`) | `sandbox` |
| `MELHOR_ENVIO_TOKEN` | Token JWT pessoal emitido no painel do Melhor Envio | `eyJ0eXAi...` |
| `MELHOR_ENVIO_USER_AGENT` | Cabeçalho obrigatório exigido pela API do Melhor Envio | `EvidenciaCalcados (contato@evidenciacalcados.com.br)` |
| `DEFAULT_ORIGIN_CEP` | CEP de Origem da Loja Física (Caxias - MA) | `65600060` |

### URLs Base:
- **Sandbox:** `https://sandbox.melhorenvio.com.br`
- **Produção:** `https://melhorenvio.com.br`

---

## 3. Fluxo de Vida do Frete & Etiquetas

### 3.1 Cotação (`POST /api/v2/me/shipment/calculate`)
- **Origem Fixa:** Loja física em Caxias - MA (`65600-060`).
- **Dimensões Padrão:** Caixa de calçado (`12 x 20 x 30 cm`, peso `0.8 kg`).
- **Transportadoras Habilitadas:** Correios (PAC / SEDEX), Jadlog (.Package / .Com), Azul Cargo, etc.
- **Selo Inteligente:** O adapter atribui automaticamente os selos `isCheapest` (Mais Econômico) e `isFastest` (Mais Rápido).

### 3.2 Geração e Compra de Etiqueta
Ocorre em etapas atômicas dentro do adapter:
1. `POST /api/v2/me/cart`: Adiciona o envio ao carrinho.
2. `POST /api/v2/me/shipment/checkout`: Paga a etiqueta usando saldo da conta Melhor Envio.
3. `POST /api/v2/me/shipment/generate`: Solicita a geração do arquivo da etiqueta.
4. `POST /api/v2/me/shipment/print`: Obtém a URL do PDF oficial para impressão.
5. Captura o código de rastreamento oficial da transportadora (se já liberado) ou armazena o `melhorEnvioId` para consulta posterior.

### 3.3 Tratamento Especial: Código Oficial vs. Self-Tracking
- **Evitar Mock/Prefixos ME:** Códigos iniciados com `ME...BR` são apenas identificadores internos (`self_tracking`) do Melhor Envio e **não são rastreáveis** nos Correios.
- O adapter sempre prioriza:
  `matchedOrder.tracking` (Código Oficial, ex: `QG93591769BR`) > `matchedOrder.self_tracking` > `melhorEnvioId`.

---

## 4. Régua de Etapas & Mapeamento de Status

O projeto adota uma régua de 5 etapas Apple HIG para os pedidos:

| Etapa | Status Pedido | Status Melhor Envio (`item.status`) | Descrição |
| :---: | :--- | :--- | :--- |
| **1** | `Pendente` | - | Pedido criado, aguardando confirmação. |
| **2** | `Confirmado` | `paid` | Pagamento aprovado. |
| **3** | `Em Preparação` | `pending` / `released` / `generated` | Etiqueta gerada e pronta para embalagem/postagem. |
| **4** | `Em Trânsito` | `posted` / `in_transit` | Pacote postado na agência ou em trânsito. |
| **5** | `Entregue` | `delivered` | Pacote entregue ao cliente. |
| **X** | `Cancelado` | `canceled` | Etiqueta ou pedido cancelado. |

### 🛡️ Regra Anti-Regressão de Status
O `ShippingTrackerService` e o `MelhorEnvioAdapter` possuem proteção estrita de hierarquia:
- Um pedido que já está em `Em Trânsito` ou `Entregue` **nunca regride** para `Em Preparação` caso a API retorne temporariamente status de etiqueta `pending`/`released`.

---

## 5. Histórico e Trajetória de Movimentações

Os eventos são normalizados em `ITrackingEvent` e exibidos no painel do administrador e na tela do cliente:
```ts
interface ITrackingEvent {
  status: string;      // ex: "Etiqueta Gerada", "Postado", "Entregue"
  description: string; // Detalhe da ação
  location?: string;   // ex: "Caxias / MA", "Teresina / PI"
  createdAt: string;   // Timestamp ISO ou data formatada
}
```

Quando a transportadora ainda não enviou os eventos detalhados via webhook, o adapter constrói os checkpoints oficiais automaticamente a partir das propriedades:
- `created_at` -> **Etiqueta Gerada** (Caxias / MA)
- `posted_at` -> **Postado na Agência** (Caxias / MA)
- `delivered_at` -> **Entregue ao Destinatário** (Cidade de Destino)

---

## 6. Divergência Métrica (Aferição de Peso/Cubagem)

Se a transportadora cobrar valor adicional no momento da postagem por divergência de peso ou medidas na agência:
- A API do Melhor Envio envia a conciliação (`metric_divergence`).
- O sistema grava os dados em `order.metricDivergence` (`originalPrice`, `difference`, `finalPrice`, `measuredWeight`).
- O card exibe um alerta amarelo no painel admin com o valor extra cobrado para conferência contábil.

---

## 7. Comandos do Terminal (CLI de Testes)

Para testar ou diagnosticar qualquer problema na API do Melhor Envio sem precisar abrir o navegador:

```bash
# Diagnóstico completo (Auth + Cotação + Rastreio teste)
npm run test:shipping

# Listar as últimas 10 remessas/etiquetas emitidas na conta
npm run test:shipping -- --orders

# Rastrear código ou ID específico em tempo real
npm run test:shipping -- --track QG93591769BR

# Testar cotação de frete para um CEP de destino
npm run test:shipping -- --calculate 64016010
```

---

## 8. Sincronização e Atualização do Frontend

Ao acionar o botão **"Atualizar Status"** (`ShippingInfoCard.tsx`) ou carregar as telas de pedidos:
1. `ShippingTrackerService.syncOrderTracking(orderId, code, meId, currentStatus)` consulta o endpoint `/api/shipping/track`.
2. Se houver novidades, chama `updateOrderData(orderId, updates)` no `AppContext`.
3. O `AppContext` atualiza simultaneamente:
   - O estado em memória React (`orders`).
   - O armazenamento local (`localStorage`).
   - O documento no Firebase Firestore (`setDoc(..., { merge: true })`).
4. O componente pai (`AdminOrderCard`) e a régua de etapas (`AdminStageStepper`) avançam imediatamente para a nova etapa sem necessidade de reload de página.

---

## 9. Limpeza de Código e Eliminação de Dead Code (Produção)

A camada de frete passou por uma auditoria completa de eliminação de código morto (*Dead Code Elimination*):
- **Remoção de Stubs Offline:** Métodos legados `getSandboxMockTracking` e `getSandboxMockLabel` foram permanentemente removidos. Todas as consultas usam as APIs reais da conta configurada no `.env`.
- **Fim de Fallbacks Hardcoded:** Removidas condicionais que injetavam dados de prints de tela antigos (`QH8799...` e `ORD-202609295365`). Toda divergência de métrica e status é alimentada puramente pelas respostas HTTP da API.
- **Centralização do Código Oficial:** O método `getOfficialTracking(shipmentId)` unifica a busca do código de rastreamento definitivo da transportadora logo após o fluxo de checkout e geração de etiquetas.
- **Persistência Resiliente no Firestore:** `ShippingTrackerService` utiliza `setDoc(orderRef, updates, { merge: true })`, prevenindo falhas caso documentos de pedidos estejam em processo de sincronização inicial.
