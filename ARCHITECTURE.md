# Arquitetura

Documento vivo: registra decisões, limitações e desvios do Figma à medida que as etapas
são implementadas.

## Estrutura

```
src/
  main.tsx              entrada: inicia os mocks (se ativos) e só então carrega a aplicação
  app.tsx               QueryClient, router e renderização
  routes/               rotas do TanStack Router (file-based; gera src/routeTree.gen.ts)
  components/
    ui/                 componentes shadcn/ui adaptados ao tema
    layout/             header, rodapé, navegação mobile
    feedback/           404, erro de rota, placeholders
    realtime/           conexão e status do Socket.IO
    icons/              ícones de marca (não existem no lucide v1)
  api/                  funções tipadas por recurso (Axios) e chaves do TanStack Query
  lib/
    env.ts              configuração (VITE_*)
    eth.ts              aritmética de ETH com BigInt (strings decimais, sem float)
    credentials.ts      token da sessão e id do carrinho do visitante (localStorage)
    http.ts             instância Axios + interceptors + normalização de erros (HttpError)
    query-client.ts     política de cache e retries
    socket.ts           cliente socket.io-client único
  mocks/                camada MSW (REST + Socket.IO), cenários e painel de demonstração
    db/                 fixtures determinísticas e banco simulado persistido
    domain/             regras de catálogo, carrinho/cotação e pedidos
    handlers/           rotas REST por recurso
    realtime.ts         envelope e publicação dos eventos
  types/                contratos compartilhados (transporte, estado e interface)
e2e/                    testes Playwright
docs/                   enunciado, guia de design e frames do Figma
```

## Ordem de inicialização

`main.tsx` importa a aplicação dinamicamente **depois** de `worker.start()`. Motivo: o
`engine.io-client` captura `globalThis.WebSocket` quando o módulo é avaliado; se o
socket.io-client carregasse antes do MSW aplicar o interceptor de WebSocket, a conexão
iria para a rede real.

## Integração REST

- Toda chamada passa pela instância Axios em `lib/http.ts`.
- Erros são normalizados em `HttpError` com `kind` (código de negócio da API ou
  `NETWORK_ERROR` / `TIMEOUT` / `CANCELED`), `status` e `fields` (erros por campo).
- Corpo de erro padrão da API: `{ code, message, fields? }` (`types/api.ts`).

## Política de cache e retries (TanStack Query)

| Configuração | Valor | Motivo |
| --- | --- | --- |
| `staleTime` | 30 s | Evita refetch em navegação rápida; tempo real cobre mudanças relevantes |
| `gcTime` | 5 min | Mantém dados ao voltar para telas recentes |
| `refetchOnWindowFocus` | ativo | Reconcilia dados após o usuário voltar à aba |
| Retry de consultas | até 2x, backoff exponencial (máx. 8 s) | Apenas falhas transitórias (rede, timeout, 5xx) |
| Retry de mutations | desativado | Evita operações duplicadas; pedidos usam idempotência |

O loader do router não mantém cache próprio (`defaultPreloadStaleTime: 0`): o cache é
responsabilidade exclusiva do TanStack Query.

## Contratos

Documentados em [docs/API.md](docs/API.md). Os tipos em `src/types/` são compartilhados pelo
cliente Axios, pelos hooks e pelos handlers MSW, então contrato e simulação não divergem.

## Valores em ETH

`src/lib/eth.ts` converte strings decimais para wei (BigInt, 18 casas) e de volta. Interface
e mocks usam as mesmas funções, então os totais exibidos são exatamente os calculados pela
API (ex.: 2×1.19 + 6×1.39 + 9×1.79 + 0.016 = `26.846`).

## Chaves de cache e isolamento por usuário

`src/api/query-keys.ts`: dados privados ficam sob `['user', userId, …]` e o carrinho sob
`['cart', userId | null]`. Logout e troca de usuário removem esses prefixos de uma vez; o
catálogo (`['nfts', …]`) é público e permanece.

## Mocks (MSW)

- Ativados por `VITE_ENABLE_MOCKS` (padrão `true`), inclusive no build de produção usado na
  demonstração e nos testes.
- Condições de rede configuráveis (`mocks/config.ts`), persistidas em localStorage e
  determinísticas por seed (PRNG mulberry32).
- `simulateNetwork()` deve ser chamado no início de todo handler REST.
- `failNext(method, path, status, times)` força falhas pontuais nos testes.
- Componentes, hooks e cliente Axios não contêm dados fictícios.
- **Banco simulado único** (`mocks/db/store.ts`) compartilhado por REST e Socket.IO: uma
  mudança de preço feita por um cenário aparece tanto em `GET /nfts` quanto no evento
  `nft.updated`. Persistido em localStorage; o reset restaura as fixtures.
- **Pedidos:** a simulação de pagamento roda com `setTimeout` dentro da página. Como o mock
  vive no navegador, os timers se perdem num refresh; por isso o pedido guarda `processAt` e
  os pendentes são reagendados quando os mocks iniciam.
- **Cotação com id derivado do conteúdo:** o checkout envia o `quoteId` revisado; se algo
  mudou, a API responde 409 `QUOTE_OUTDATED` com a cotação nova.

## Tempo real (Socket.IO)

- Cliente único (`lib/socket.ts`) só com transporte WebSocket.
- Servidor simulado em `mocks/socket.ts` com `@mswjs/socket.io-binding` sobre `ws.link`.
- O token vai no `auth` do handshake; o mock lê o pacote CONNECT (`40{...}`) e só entrega
  `order.updated` às conexões cujo token é uma sessão válida do dono do pedido.
- Eventos têm `id` estável e `version` do recurso; o mock mantém um log para reenviar
  duplicatas nos testes.

### Limitações do transporte simulado

- **Somente WebSocket**: sem fallback para long-polling.
- **Namespace único (`/`)**, sem rooms nem broadcast nativos do binding; isolamento por
  usuário é feito no próprio mock.
- **Heartbeat manual**: o handshake do binding anuncia `pingInterval` de 25 s mas não envia
  pings; o mock envia o pacote de ping a cada 20 s para o cliente não encerrar a conexão.
- **URL do link**: o MSW remove o prefixo `/socket.io/` da URL do cliente antes de comparar,
  então o `ws.link` usa apenas a origem; `ws.link` também não aceita `RegExp` (MSW 2.15).
- Queda do servidor é simulada fechando as conexões e recusando novas até ser restabelecido.

## Substituições de assets

- Ilustrações dos NFTs recortadas do export PNG do Figma (sem acesso ao arquivo fonte):
  resolução limitada a 434 px (Emerald Ape) e 238 px (demais).
- Ícones de redes sociais: traçados do lucide v0 (ISC), pois o lucide v1 removeu ícones de marca.
- Fonte Roboto Mono servida localmente via `@fontsource-variable/roboto-mono`.

## Ações fora do escopo

Criadores, Aprenda, newsletter, central de ajuda, atividade, ofertas, downloads e suporte
exibem um aviso de indisponibilidade (`lib/unavailable.ts`) e nunca simulam sucesso.
