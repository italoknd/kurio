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

## Sessão

| Aspecto | Comportamento |
| --- | --- |
| Persistência | Token em localStorage (`kurio:session-token`); a sessão é revalidada em `GET /auth/session` ao carregar a aplicação |
| Rotas privadas | `staticData.requiresAuth` + `beforeLoad: requireAuth` (perfil, carteiras, favoritos, pagamento, pedidos) |
| Revalidação | Toda navegação para rota privada consulta `/auth/session` com uma requisição própria |
| Expiração | Detectada por 401 em qualquer chamada autenticada, pela guarda de rota ou pelo `expiresAt` no cliente |
| Ao expirar | Remove token e cache privado, avisa (toast) e leva a `/entrar?redirect=<destino>&motivo=expirada` |
| Retorno ao fluxo | Após login/cadastro, volta para `redirect` (apenas caminhos internos, nunca /entrar ou /cadastro) |
| Logout | `POST /auth/logout` (melhor esforço) + limpeza do cliente, sempre |
| Troca de usuário | `startSession` remove todo o cache privado antes de gravar a nova sessão |
| Tempo real | O socket reconecta com o novo token a cada mudança de sessão; eventos privados da sessão anterior param |
| Carrinho do visitante | Ao autenticar, `POST /cart/merge` junta os itens à conta; falha não bloqueia o login |

**Login em modal × página.** No desktop, "Entrar" abre um modal sobre a página atual
(parâmetro `?auth=entrar|cadastro`, então "voltar" fecha o modal e o usuário continua onde
estava). No mobile, e em redirecionamentos de rotas privadas, `/entrar` e `/cadastro` são
páginas cheias, como nos frames mobile.

**Detalhes que evitaram bugs:**
- A guarda não usa `fetchQuery`: uma consulta de sessão em andamento, iniciada antes da
  expiração, seria reaproveitada e deixaria a navegação passar.
- No *preload* (hover no link) a guarda só recusa; o aviso e o destino salvo vêm da
  navegação real, para que o destino seja o link clicado.
- O redirecionamento reativo (logout/expiração em rota privada) só olha o estado resolvido
  do router; durante uma transição os matches ainda são da rota anterior, o que gerava
  redirecionamentos em cadeia.
- `mutateAsync` no "Sair": callbacks de `mutate()` não rodam se o componente desmonta.

## Catálogo

- **Estado na URL** (`features/catalog/search-params.ts`): `q`, `categoria`, `rede` (listas
  separadas por vírgula), `precoMin`, `precoMax`, `aba`, `ordem`, `pagina`. Valores padrão
  ficam fora da URL. Toda mudança gera entrada no histórico; mudar busca/filtro/ordem/aba
  reinicia a paginação. A busca tem debounce de 400 ms (uma entrada por busca, não por tecla).
- **Respostas fora de ordem:** cada combinação de parâmetros tem sua chave no TanStack Query;
  a interface só lê a chave atual e o `signal` aborta a requisição obsoleta.
- **Atualização em segundo plano:** `keepPreviousData` mantém a página anterior visível
  (esmaecida, com "Atualizando resultados…") enquanto a nova carrega.
- **Estados:** skeleton com shimmer nas mesmas dimensões do card; vazio com "limpar filtros";
  erro com "Tentar novamente" (após os 2 retries automáticos de falha transitória).
- **Faixa de preço:** o slider trabalha em centésimos inteiros de ETH (`toCents`/`fromCents`),
  sem ponto flutuante; filtra pelo preço listado do card.
- Loaders das rotas só disparam o prefetch (`void prefetchQuery`) e não bloqueiam a navegação,
  para que os skeletons apareçam em redes lentas.

## Favoritos (atualização otimista)

`useToggleFavorite` marca/desmarca na hora (`onMutate`), reverte em caso de falha e avisa,
e ressincroniza com a API ao final (`onSettled`). A reversão desfaz **a operação** (adiciona
ou remove o id), e não restaura um snapshot: se o clique acontece enquanto a lista ainda
carrega, o snapshot seria vazio e `setQueryData(undefined)` é ignorado pelo TanStack Query v5
— bug real encontrado pelo teste de falha. Visitantes são levados ao modal de login.

## Carrinho e cotação

- **Fonte da verdade é a API:** toda mutation do carrinho (`PATCH`/`DELETE` de itens, cupom,
  inclusão) devolve o carrinho completo, gravado direto no cache (`['cart', userId]`), e
  invalida as cotações (`['cart', userId, 'quote', rede]`). Subtotal, desconto, taxa e total
  vêm sempre de `GET /cart/quote`; o cliente só multiplica preço × quantidade para exibir o
  total da linha durante a atualização otimista (com `mulEth`, sem ponto flutuante).
- **Quantidade otimista e em série:** o stepper muda o número na hora; as requisições do mesmo
  item usam `scope` do TanStack Query (rodam na ordem dos cliques) e só a última resposta é
  gravada, para respostas intermediárias não fazerem o número "voltar". Em erro (ex.: 409 de
  disponibilidade) o carrinho é recarregado da API e o motivo aparece em um toast.
- **Cotação na tela:** usa a rede Ethereum até o pagamento (onde a rede é escolhida), como no
  Figma. Com `keepPreviousData`, a cotação anterior fica visível e esmaecida enquanto a nova
  carrega. "Conectar e finalizar" fica desabilitado sem cotação atual, durante alterações,
  em erro ou com `quote.issues`; o motivo é anunciado (`aria-live`).
- **Problemas de disponibilidade** (`quote.issues`) destacam a linha, associam a mensagem ao
  item (`aria-describedby`) e bloqueiam a finalização até o item ser ajustado ou removido.
- **Remoção com desfazer:** sem diálogo de confirmação; o toast oferece "Desfazer", que
  reinclui o item com a mesma edição e quantidade. O foco vai para o título da página, pois o
  botão removido sai do DOM.
- **Visitante:** o id do carrinho anônimo fica em localStorage (header `X-Cart-Id`) e é
  juntado ao carrinho da conta no login (`POST /cart/merge`). "Conectar e finalizar" leva a
  `/pagamento`; a rota privada manda o visitante ao login com retorno ao pagamento.

## Checkout e pedido

- **Revisão com cotação congelada:** ao abrir a revisão, a cotação exibida é guardada e é o
  `quoteId` enviado. Se a cotação ao vivo mudar (evento ou 409 `QUOTE_OUTDATED`, cuja cotação
  nova é gravada no cache), o envio fica bloqueado até o usuário aceitar os novos valores.
- **Idempotência por tentativa** (`features/checkout/checkout-storage.ts`): a chave é
  reaproveitada enquanto o corpo do pedido for o mesmo e trocada quando ele muda. A tentativa
  é gravada em sessionStorage antes do envio. Respostas da API (2xx, 4xx) resolvem a
  tentativa; falhas transitórias (timeout, rede, 5xx) a mantêm pendente e a interface só
  permite reenviá-la como está, então nunca há dois pedidos para a mesma intenção de compra.
- **Rascunho** do formulário em sessionStorage por usuário (`form.subscribe`), limpo após o
  pedido criado.
- **Pedido:** `useOrder` lê `['user', userId, 'order', id]`, atualizado por `order.updated`;
  enquanto pendente, uma consulta a cada 5 s cobre quedas do tempo real. Na confirmação, o
  carrinho é recarregado (a API remove só o que foi comprado).
- **Carteira:** a conexão simulada é estado local da página e vale para carteira + rede.

## Callbacks de mutation e desmontagem

Ações que levam a outra página (login na página cheia, "Sair", comprar) colocam efeitos
obrigatórios (toasts, atualização de cache) nos callbacks do `useMutation` ou após
`mutateAsync`, nunca só nos callbacks de `mutate()`: estes não rodam se o componente
desmontar antes da resposta.

## Formulários

react-hook-form + zod, com um adaptador próprio (`lib/forms.ts`) em vez de
`@hookform/resolvers` (conflito de peer dependency com o zod usado pelo TanStack). As regras
de validação espelham as da API para feedback imediato; erros por campo vindos da API
(`fields`) são aplicados ao formulário e focam o primeiro campo inválido. Campos usam
`TextField`, que associa rótulo, dica e erro via `aria-describedby` / `aria-invalid`.

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

### Sincronização com o cache (`features/realtime/use-realtime-sync.ts`)

- **`nft.updated`:** cards do catálogo, destaques e detalhe recebem preço/disponibilidade por
  `setQueryData`, só quando `event.version` é maior que a `version` do dado em cache (uma
  resposta REST mais nova nunca é sobrescrita por um evento atrasado). Carrinho e cotação não
  são ajustados no cliente: são invalidados e recarregados da API.
- **Avisos:** a mudança é descrita comparando o item do carrinho (ou o detalhe aberto) com o
  evento, e anunciada por toast (região viva do sonner) e por um aviso persistente no
  carrinho. Por ser derivado da diferença, reaplicar o mesmo estado não gera novo aviso.
- **`order.updated`:** grava o pedido em `['user', userId, 'order', id]` sem regredir versão e
  invalida as listas. Sem sessão, o evento é descartado.
- **Duplicatas e eventos antigos:** `EventTracker` guarda os últimos 500 ids e a última versão
  aplicada por recurso (`tipo:id`); na troca de usuário esquece os pedidos.
- **Reconexão:** o evento `reconnect` do Manager (só reconexões automáticas) invalida
  catálogo, carrinho e dados do usuário; as consultas ativas são refeitas na API, cobrindo os
  eventos perdidos durante a queda. Limitação: mudanças ocorridas durante a queda não geram o
  aviso "o preço mudou", apenas atualizam os valores.
- **Ciclo de vida:** os listeners são registrados por usuário e removidos no cleanup
  (`socket.off` / `socket.io.off`); a troca de sessão também refaz a conexão com o novo token.

### Limitações do transporte simulado

- **Somente WebSocket**: sem fallback para long-polling.
- **Namespace único (`/`)**, sem rooms nem broadcast nativos do binding; isolamento por
  usuário é feito no próprio mock.
- **Heartbeat manual**: o handshake do binding anuncia `pingInterval` de 25 s mas não envia
  pings; o mock envia o pacote de ping a cada 20 s para o cliente não encerrar a conexão.
- **URL do link**: o MSW remove o prefixo `/socket.io/` da URL do cliente antes de comparar,
  então o `ws.link` usa apenas a origem; `ws.link` também não aceita `RegExp` (MSW 2.15).
- Queda do servidor é simulada fechando as conexões e recusando novas até ser restabelecido.

## Performance e carregamento

Medido com `npm run audit:lighthouse` (resumo em `reports/lighthouse/summary.md`).

- **Primeira pintura sem JavaScript:** o `index.html` traz um shell estático (fundo e marca),
  a `meta description` e o preload da fonte. O `main.tsx` só avalia app e mocks depois da
  primeira pintura; os dois chunks já começam a baixar com o HTML (`modulepreload`
  injetado por um plugin no `vite.config.ts`).
- **Mocks fora do caminho da interface:** a interface renderiza (shell, skeletons) enquanto
  o MSW inicia. Toda requisição REST espera `networkReady` (interceptor do Axios) e o
  `socket.io-client` só é importado depois dele (`lib/socket.ts`), porque o engine.io captura
  `globalThis.WebSocket` ao ser avaliado. Assim nada escapa para a rede real.
- **Bundle inicial menor:** modal de login (e o zod) e menu da conta carregados sob demanda;
  painel de cenários montado só quando o navegador fica ocioso; `tough-cookie` (e o `tldts`,
  ~250 KB de lista de sufixos públicos) trocado por um stub, pois a API simulada não usa
  cookies — o chunk dos mocks caiu de 174 KB para 54 KB (gzip).
- **Renderização inicial em `startTransition`:** o React cede a thread principal entre
  partes da árvore (menos tempo de bloqueio).
- **CLS:** fonte Roboto Mono servida de `/fonts` com preload (a troca tardia da fonte
  deslocava o detalhe inteiro); `<main>` com altura mínima de uma tela, para o rodapé não
  aparecer durante o carregamento e "pular" quando o conteúdo chega; rodapé com
  `content-visibility: auto`.
- **Servidor das medições e dos testes:** `scripts/static-server.mjs` (gzip, cache imutável em
  `/assets`, fallback de SPA). Não usamos o `vite preview` nas medições porque extensões do
  editor (ex.: Console Ninja) injetam ~70 KB de script no HTML servido pelo Vite, o que
  derrubava Best Practices (charset fora dos primeiros 1024 bytes) e distorcia a performance.
- **Resultado:** no deploy (Vercel: HTTP/2, brotli e CDN) todas as metas são atingidas,
  inclusive performance mobile (90 no início e 92 no detalhe). Medido localmente, o mobile fica
  em 68–88: o LCP depende da cadeia "registro do service worker do MSW → resposta simulada da
  API (latência de 150 ms do perfil normal) → imagem", e o tempo de bloqueio simulado
  (CPU 4× mais lenta) varia com a carga da máquina.

## Regressão visual

`e2e/visual.spec.ts` captura início, detalhe, carrinho e pagamento (desktop e mobile) com os
dados fixos das fixtures. Antes da captura: rede ociosa, fontes prontas e todas as imagens
carregadas (inclusive as lazy). O botão do painel de cenários e os toasts ficam ocultos
(`e2e/visual.css`). Baselines em `e2e/__screenshots__/` sem sufixo de sistema operacional;
foram geradas no Windows — em outro SO, a renderização de fontes pode diferir e as baselines
devem ser regeneradas com `npm run test:visual:update`.

## Substituições de assets

- Ilustrações dos NFTs recortadas do export PNG do Figma (sem acesso ao arquivo fonte):
  resolução limitada a 434 px (Emerald Ape) e 238 px (demais).
- Ícones de redes sociais: traçados do lucide v0 (ISC), pois o lucide v1 removeu ícones de marca.
- Fonte Roboto Mono (variável, OFL) copiada de `@fontsource-variable/roboto-mono` para
  `public/fonts` (caminho estável para preload; licença em `public/fonts/LICENSE-roboto-mono.txt`).

## Desvios e adaptações em relação ao Figma

- **Busca no desktop:** o Figma só mostra a lupa no header; foi adicionado um campo de busca
  acima do grid (a lupa leva a ele). No mobile, a busca "Explorar coleções" fica no topo,
  como no frame, com o botão de filtros abrindo um drawer.
- **Carrossel do topo:** troca manual pelos pontos, sem rotação automática (movimento
  reduzido e controle do usuário).
- **"Mais desta coleção":** grade (desktop) e rolagem horizontal (mobile) em vez de carrossel
  com pontos.
- **Botão flutuante central da barra inferior mobile:** omitido (sem função definida no escopo).
- **Aba "Avaliações de colecionadores":** mostra a média e o total; comentários individuais
  não fazem parte dos contratos.
- **Preço anterior** aparece riscado e com rótulo para leitores de tela ("Preço anterior").
- **Carrinho (desktop):** a coluna "Edições" do Figma virou "Quantidade" e cada linha mostra
  também a edição, pois o mesmo NFT pode estar no carrinho em edições diferentes. O desconto
  aparece como "Desconto (CÓDIGO)" com a descrição do cupom, em vez do rótulo fixo
  "Desconto do lançamento". Cupom aplicado vira um selo com "Remover".
- **Carrinho (mobile):** o resumo fica no fluxo da página (cartão com cantos superiores
  arredondados) e só o botão "Conectar e finalizar" acompanha a rolagem, acima da barra
  inferior; a lixeira fica abaixo do stepper. "Colecionadores também viram" usa grade/rolagem
  horizontal em vez de carrossel com pontos.
- **Pagamento:** endereço e tipo da carteira vêm da carteira cadastrada escolhida (lista de
  carteiras no lugar dos campos de endereço/tipo e de "Usar outra carteira?"); o cupom é
  aplicado no carrinho. Revisão em diálogo antes de confirmar (não desenhada). No mobile, o
  mesmo formulário empilhado, com total e "Confirmar compra" fixos.
- **Confirmação:** o recibo do frame 05 é uma página (`/pedidos/$id`), não um modal, para
  funcionar em acesso direto e refresh; estados pendente e recusado seguem o mesmo padrão
  visual.
- **Perfil:** "Alterar senha" tem botão próprio (o Figma usa um único "Salvar"); o nome ENS
  do perfil é opcional, conforme a API; o seletor ".eth" do Figma virou sufixo fixo do campo.
- **Carteiras:** "Adicionar" abre o formulário da carteira ainda não cadastrada; "Igual à
  carteira principal" fica no formulário da secundária e copia os dados para ajuste.
- **Área do colecionador no mobile/tablet** (sem frame): menu lateral acima do conteúdo e
  formulários em uma coluna.
- **Estado autenticado do header** (sem frame): avatar com inicial e menu da conta.
- **Mobile do login/cadastro e do detalhe:** sem barra inferior (como nos frames); o detalhe
  usa a barra fixa de compra do frame mobile-02.

## Ações fora do escopo

Criadores, Aprenda, newsletter, central de ajuda, atividade, ofertas, downloads e suporte
exibem um aviso de indisponibilidade (`lib/unavailable.ts`) e nunca simulam sucesso.
