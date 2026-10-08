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
  lib/
    env.ts              configuração (VITE_*)
    http.ts             instância Axios + normalização de erros (HttpError)
    query-client.ts     política de cache e retries
    socket.ts           cliente socket.io-client único
  mocks/                camada MSW (REST + Socket.IO), cenários e painel de demonstração
  types/                contratos de transporte compartilhados
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

## Mocks (MSW)

- Ativados por `VITE_ENABLE_MOCKS` (padrão `true`), inclusive no build de produção usado na
  demonstração e nos testes.
- Condições de rede configuráveis (`mocks/config.ts`), persistidas em localStorage e
  determinísticas por seed (PRNG mulberry32).
- `simulateNetwork()` deve ser chamado no início de todo handler REST.
- `failNext(method, path, status, times)` força falhas pontuais nos testes.
- Componentes, hooks e cliente Axios não contêm dados fictícios.

## Tempo real (Socket.IO)

- Cliente único (`lib/socket.ts`) só com transporte WebSocket.
- Servidor simulado em `mocks/socket.ts` com `@mswjs/socket.io-binding` sobre `ws.link`.

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
