# Kurio — Marketplace de NFTs

Solução do [Desafio Frontend da Jungle Gaming](docs/DESAFIO.md): marketplace de NFTs com
descoberta, compra e conta do colecionador, rodando inteiramente sobre uma API simulada
(MSW) com eventos em tempo real (Socket.IO).

> Em desenvolvimento. Decisões técnicas em [ARCHITECTURE.md](ARCHITECTURE.md);
> referência visual em [docs/DESIGN.md](docs/DESIGN.md).

## Stack

React 19 · TypeScript · Vite · TanStack Router · TanStack Query · Axios · Socket.IO ·
Tailwind CSS v4 · shadcn/ui · MSW · Playwright · Lighthouse

## Requisitos

- Node.js 20.19+ (ou 22.12+)
- npm 10+

## Setup

```bash
npm install
npx playwright install chromium   # apenas para os testes E2E
cp .env.example .env               # opcional: os valores padrão já funcionam
npm run dev
```

A aplicação abre em `http://localhost:5173` com os mocks ativos.

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Desenvolvimento com mocks (MSW + Socket.IO simulado) |
| `npm run build` | Build de produção (mocks incluídos) + verificação de tipos |
| `npm run preview` | Serve o build de produção |
| `npm run typecheck` | Verificação de tipos (app, config e testes) |
| `npm run lint` | Lint com oxlint |
| `npm run test:e2e` | Testes Playwright (desktop e mobile) contra o build de produção |
| `npm run test:e2e:ui` | Testes Playwright em modo interativo |
| `npm run test:e2e:report` | Abre o último relatório HTML dos testes |

## Variáveis de ambiente

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `VITE_API_URL` | `/api` | Base das rotas REST |
| `VITE_SOCKET_URL` | origem da aplicação | Origem do servidor Socket.IO |
| `VITE_ENABLE_MOCKS` | `true` | Ativa os mocks MSW (REST + Socket.IO) |
| `VITE_HTTP_TIMEOUT` | `10000` | Timeout das requisições REST (ms) |

## Credenciais fictícias

| E-mail | Senha | Perfil |
| --- | --- | --- |
| `ana@kurio.dev` | `Colecione#1` | Carteiras principal e secundária, 2 favoritos e 3 itens no carrinho (valores do Figma) |
| `bruno@kurio.dev` | `Colecione#2` | Conta sem carteiras, favoritos ou carrinho |

## Dados simulados

- **Catálogo:** 36 NFTs (9 do Figma + 27 gerados), 9 categorias, 3 redes, preços de 0.02 a
  12.30 ETH, 4 edições por NFT (`1/1`, `1/10`, `1/50`, aberta) com estoque e limite por pedido.
- **Casos especiais:** `Golden Frequency #071` esgotado em todas as edições; edição `1/1` do
  `Emerald Ape #042` esgotada; edição `1/10` do `Neon Vessel #552` com apenas 2 unidades.
- **Cupons:** `KURIO10` (10%), `LANCAMENTO` (5%), `EXPIRADO` (expirado); qualquer outro é inválido.
- **Taxa de rede:** Ethereum 0.016, Polygon 0.002, Solana 0.001 ETH.

Contratos REST e eventos: [docs/API.md](docs/API.md).

## Cenários dos mocks

Com os mocks ativos, o botão **Cenários** (canto inferior esquerdo) abre o painel de
simulação. As escolhas persistem após refresh. Os dados simulados também persistem
(localStorage) e **Restaurar cenário padrão** volta tudo às fixtures.

**Condições de rede (REST):**

| Perfil | Comportamento |
| --- | --- |
| `normal` | Latência fixa de 150 ms |
| `lento` | Latência fixa de 2,5 s (exibe os skeletons) |
| `variavel` | 50 ms a 3 s, determinística pela seed (respostas fora de ordem) |
| `instavel` | 30% das requisições falham com 503, determinístico pela seed |
| `offline` | Toda requisição falha como erro de rede |
| `timeout` | Nenhuma resposta antes do timeout do cliente |

Também é possível definir pela URL e restaurar o cenário padrão:

```
http://localhost:5173/?mockNetwork=variavel&mockSeed=7
http://localhost:5173/?mockReset
```

**Cenários de negócio (painel):** pagamento confirmado ou recusado, conexão da carteira
aceita ou recusada, expirar as sessões ativas, derrubar e restabelecer o tempo real.

**Controles para testes e reprodução manual** (`window.__kurioMocks`, no console do navegador):

| Controle | Efeito |
| --- | --- |
| `reset()` | Restaura dados, configuração, falhas forçadas e tempo real |
| `setConfig({ network, seed, payment, walletConnection, orderDelayMs, sessionTtlMinutes })` | Ajusta o cenário |
| `failNext('GET', '/api/nfts', 503, 1)` | Força as próximas N respostas de uma rota a falhar |
| `nfts.update('emerald-ape-042', { editionId: '1-50', price: '1.25', available: 3 })` | Muda preço/estoque e publica `nft.updated` |
| `session.expireAll()` | Expira as sessões; a próxima chamada autenticada recebe 401 |
| `orders.timeoutNextCreate()` | O próximo pedido é criado, mas a resposta chega após o timeout |
| `orders.process(orderId)` | Conclui na hora a simulação de um pedido pendente |
| `socket.setAvailable(false)` | Derruba o Socket.IO e recusa reconexões |
| `socket.recentEvents()` / `socket.replay(eventId)` | Lista e reenvia eventos (duplicatas) |

Pedidos pendentes continuam sendo processados após um refresh da página.
