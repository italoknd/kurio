# Kurio — Marketplace de NFTs

**Demonstração:** [kurio-ochre.vercel.app](https://kurio-ochre.vercel.app) (mocks e tempo real ativos; contas em [Credenciais fictícias](#credenciais-fictícias)).

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
| `npm run test:deploy` | Verificação do deploy público (use com `BASE_URL=<url>`) |
| `npm run test:visual` | Regressão visual (início, detalhe, carrinho e pagamento; desktop e mobile) |
| `npm run test:visual:update` | Regenera as baselines da regressão visual (`e2e/__screenshots__`) |
| `npm run serve` | Serve o build com o servidor estático das auditorias (sem o `vite preview`) |
| `npm run audit:lighthouse` | Build + Lighthouse em início e detalhe (mobile e desktop, 3 medições, mediana) |
| `npm run audit:lighthouse:assert` | Igual ao anterior, mas falha se alguma mediana ficar abaixo da meta |

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

**Fluxos de falha do checkout (passo a passo):**

1. **Pagamento recusado:** painel → pagamento "recusar"; finalize uma compra; a tela do pedido
   mostra o motivo e os itens continuam no carrinho.
2. **Carteira recusa a conexão:** painel → conexão "recusar"; "Confirmar compra" mostra o erro
   junto da carteira; volte para "aceitar" e use "Conectar agora".
3. **Timeout após criar o pedido:** no console, `__kurioMocks.orders.timeoutNextCreate()`;
   confirme a compra; após 10 s aparece "Verificar pedido", que recupera o mesmo pedido.
4. **Preço muda durante a revisão:** com a revisão aberta, rode
   `__kurioMocks.nfts.update('emerald-ape-042', { editionId: '1-50', price: '1.29' })`; o
   diálogo pede para revisar os novos valores.
5. **Cotação desatualizada sem tempo real:** derrube o tempo real no painel, altere o preço
   como acima e confirme; a API responde 409 e o diálogo pede nova confirmação.
6. **Pedido pendente após refresh:** confirme a compra e recarregue a página do pedido; ele
   continua pendente e é confirmado em seguida.
7. **Sessão expirada no checkout:** preencha o formulário, painel → expirar sessões, confirme;
   após o login o formulário volta preenchido.

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

## Qualidade

**Testes E2E** (`npm run test:e2e`): 126 cenários em Chromium (desktop 1440 px e mobile
390 px), cobrindo os itens 1 a 12 do §9 do enunciado. Relatório HTML em `playwright-report/`
e traces das falhas em `test-results/`. Cada teste parte de um contexto novo do navegador
(dados simulados restaurados); eventos, latência e pagamentos são disparados pelos controles
`window.__kurioMocks`.

**Regressão visual** (`npm run test:visual`): início, detalhe, carrinho e pagamento, desktop
e mobile, com baselines em `e2e/__screenshots__/` (geradas no Windows; em outro sistema,
regenere com `npm run test:visual:update`).

**Lighthouse** (`npm run audit:lighthouse`): início e detalhe, mobile e desktop, 3 medições
por combinação, mediana. Configuração em `scripts/lighthouse.config.mjs`; relatórios HTML/JSON
de cada medição em `reports/lighthouse/`. Para medir um deploy:
`node scripts/lighthouse.mjs --url <url>`.

Resultado no deploy público ([reports/lighthouse/summary-deploy.md](reports/lighthouse/summary-deploy.md)):

| Página | Formato | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Início | mobile | 90 | 100 | 100 | 100 | 2.94 s | 0.036 | 184 ms |
| Início | desktop | 100 | 100 | 100 | 100 | 0.67 s | 0.005 | 0 ms |
| Detalhe | mobile | 92 | 100 | 100 | 100 | 2.90 s | 0.039 | 106 ms |
| Detalhe | desktop | 99 | 100 | 100 | 100 | 0.71 s | 0.042 | 16 ms |

Todas as medianas atingem as metas (Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95,
SEO ≥ 90). Medido localmente (`npm run audit:lighthouse`, sem HTTP/2, brotli nem CDN), o
desktop fica em 98–99 e o mobile em 68–88, variando com a carga da máquina — detalhes em
[ARCHITECTURE.md](ARCHITECTURE.md#performance-e-carregamento) e no resumo local
[reports/lighthouse/summary.md](reports/lighthouse/summary.md).

> Rode as auditorias com `npm run audit:lighthouse` (ou sirva o build com `npm run serve`), e
> não com o `vite preview`: extensões do editor podem injetar scripts no HTML servido pelo Vite.

## Deploy

Publicado na Vercel em [kurio-ochre.vercel.app](https://kurio-ochre.vercel.app). O `vercel.json` configura o
build (`npm run build`, saída `dist/`), o fallback de SPA (acesso direto e refresh em qualquer
rota) e o cache dos assets. Os mocks (REST e Socket.IO) rodam no navegador, então o deploy
estático funciona sem backend.

Verificação do deploy (rotas internas, 404, tempo real e compra completa até o recibo):

```bash
BASE_URL=https://kurio-ochre.vercel.app npm run test:deploy
```
