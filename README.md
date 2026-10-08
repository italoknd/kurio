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

## Cenários dos mocks

Com os mocks ativos, o botão **Cenários** (canto inferior esquerdo) abre o painel de
simulação. As escolhas persistem após refresh.

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

**Tempo real:** o painel permite derrubar e restabelecer a conexão Socket.IO simulada.

Os testes controlam os mesmos cenários por `window.__kurioMocks`
(`setConfig`, `failNext`, `reset`, `socket.emit`, `socket.setAvailable`).

_Credenciais fictícias, cupons e cenários de negócio serão documentados conforme os fluxos
forem implementados._
