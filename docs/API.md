# Contratos da API

Contratos REST e de eventos Socket.IO usados pela aplicação e implementados pela API
simulada (MSW). Os tipos TypeScript em `src/types/` são a fonte da verdade; este documento
os resume. Clientes Axios em `src/api/`, handlers em `src/mocks/handlers/`.

## Convenções

- Base: `VITE_API_URL` (padrão `/api`). JSON em requisições e respostas.
- **Autenticação:** `Authorization: Bearer <token>` (token retornado por login/cadastro).
- **Carrinho do visitante:** header `X-Cart-Id` com o id do carrinho anônimo.
- **Valores em ETH:** strings decimais (`"26.846"`), calculados com BigInt em wei
  (`src/lib/eth.ts`). Quantidades são inteiros.
- **Datas:** ISO 8601 (UTC).
- **Idempotência:** `POST /orders` exige `Idempotency-Key`.

### Erros

Corpo padrão de toda resposta de erro:

```json
{ "code": "CONFLICT", "message": "…", "fields": { "campo": "…" }, "reason": "QUOTE_OUTDATED", "details": {} }
```

| Status | `code` | Quando |
| --- | --- | --- |
| 401 | `UNAUTHENTICATED` | Sessão ausente, inválida ou expirada; credenciais incorretas |
| 403 | `FORBIDDEN` | Sem permissão para o recurso |
| 404 | `NOT_FOUND` | Recurso inexistente (inclusive pedido de outro usuário) |
| 409 | `CONFLICT` | Conflito; ver `reason` |
| 422 | `VALIDATION_ERROR` | Campos inválidos; ver `fields` |
| 500 | `INTERNAL_ERROR` | Erro inesperado (transitório) |
| 503 | `UNAVAILABLE` | Indisponibilidade temporária (transitório) |

`reason` em 409: `EMAIL_TAKEN`, `USERNAME_TAKEN`, `INSUFFICIENT_AVAILABILITY`,
`EDITION_SOLD_OUT`, `QUOTE_OUTDATED`, `IDEMPOTENCY_KEY_REUSED`, `WALLET_REJECTED`,
`WALLET_ROLE_TAKEN`.

No cliente, todo erro vira `HttpError` (`src/lib/http.ts`) com `kind` (o `code` acima ou
`NETWORK_ERROR` / `TIMEOUT` / `CANCELED`), `fields`, `reason`, `details`, `isTransient` e
`isSessionExpired`.

## Sessão e conta

| Método | Rota | Corpo | Resposta |
| --- | --- | --- | --- |
| POST | `/auth/register` | `{ username, email, password }` | 201 `Session` · 422 · 409 `EMAIL_TAKEN`/`USERNAME_TAKEN` |
| POST | `/auth/login` | `{ email, password }` | 200 `Session` · 422 · 401 |
| GET | `/auth/session` | — | 200 `Session` · 401 (expirada) |
| POST | `/auth/logout` | — | 204 |

`Session = { token, expiresAt, user: User }`. Senhas: mínimo 8 caracteres, com letras e
números. O mock guarda apenas `SHA-256(salt:senha)`.

## NFTs

| Método | Rota | Resposta |
| --- | --- | --- |
| GET | `/nfts` | 200 `NftListResponse` |
| GET | `/nfts/destaques` | 200 `{ hero: NftSummary[], spotlight: NftSummary }` |
| GET | `/nfts/:nftId` | 200 `NftDetail` · 404 |

Parâmetros de `GET /nfts` (todos opcionais e combináveis):

| Parâmetro | Exemplo | Descrição |
| --- | --- | --- |
| `q` | `golden` | Busca em nome, coleção, token e criador |
| `category` | `musica&category=jogos` | Repetível |
| `network` | `ethereum` | Repetível (`ethereum`, `polygon`, `solana`) |
| `minPrice` / `maxPrice` | `0.5` | Faixa do preço listado |
| `collection` | `Kurio Apes` | Coleção exata |
| `tab` | `todos` · `novos` · `em-alta` | Abas do catálogo |
| `sort` | `recentes` · `preco-asc` · `preco-desc` · `nome` | Ordenação |
| `page` / `pageSize` | `2` / `9` | Paginação (máx. 48 por página) |

`NftListResponse` = página (`items`, `page`, `pageSize`, `total`, `totalPages`) + `facets`
(contagem por categoria e rede considerando busca/aba, e faixa de preço do catálogo).

`NftDetail` traz galeria, descrição, atributos, avaliação e `editions[]` — cada edição
(`1-1`, `1-10`, `1-50`, `aberta`) tem `price`, `previousPrice`, `supply`, `available` e
`maxPerOrder`. `version` incrementa a cada alteração de preço/disponibilidade.

## Favoritos (autenticado)

| Método | Rota | Resposta |
| --- | --- | --- |
| GET | `/favorites` | 200 `{ nftIds }` |
| PUT | `/favorites/:nftId` | 200 `{ nftIds }` · 404 |
| DELETE | `/favorites/:nftId` | 200 `{ nftIds }` |

## Carrinho e cotação (usuário ou visitante)

| Método | Rota | Corpo | Resposta |
| --- | --- | --- | --- |
| GET | `/cart` | — | 200 `Cart` (cria se não existir) |
| POST | `/cart/items` | `{ nftId, editionId, quantity }` | 201 `Cart` · 422 · 404 · 409 `INSUFFICIENT_AVAILABILITY`/`EDITION_SOLD_OUT` |
| PATCH | `/cart/items/:itemId` | `{ quantity }` | 200 `Cart` · 409 |
| DELETE | `/cart/items/:itemId` | — | 200 `Cart` · 404 |
| PUT | `/cart/coupon` | `{ code }` | 200 `Cart` · 422 (inválido ou expirado em `fields.code`) |
| DELETE | `/cart/coupon` | — | 200 `Cart` |
| POST | `/cart/merge` | `{ guestCartId }` | 200 `Cart` (autenticado) |
| GET | `/cart/quote?network=` | — | 200 `Quote` |

Adicionar um item já existente soma as quantidades. O limite de cada item é o menor entre
`available` e `maxPerOrder` da edição. No merge, as quantidades somadas respeitam esse limite.

`Quote = { id, network, items, subtotal, discount, coupon, networkFee, total, issues }`.
`total = subtotal − discount + networkFee`. O `id` é derivado do conteúdo: qualquer mudança
de preço, disponibilidade, quantidade, cupom ou rede gera uma cotação nova. `issues` lista
itens esgotados (`unavailable`) ou acima do disponível (`insufficient`).

Taxas de rede: Ethereum `0.016`, Polygon `0.002`, Solana `0.001` ETH.

## Pedidos (autenticado)

| Método | Rota | Resposta |
| --- | --- | --- |
| POST | `/orders` + `Idempotency-Key` | 201 `Order` (novo) · 200 `Order` (mesma chave e conteúdo) · 409 · 422 |
| GET | `/orders?status=pending` | 200 `Order[]` |
| GET | `/orders/:orderId` | 200 `Order` · 404 (inexistente ou de outro usuário) |

Corpo: `{ quoteId, network, walletId, collector: { displayName, username, profileName, email, ensName, referralCode, note } }`.

Antes de criar, a API recalcula a cotação:
- itens esgotados ou acima do disponível → 409 `INSUFFICIENT_AVAILABILITY` (`details.quote`);
- `quoteId` diferente da cotação atual → 409 `QUOTE_OUTDATED` (`details.quote` com os novos valores);
- mesma chave com outro conteúdo → 409 `IDEMPOTENCY_KEY_REUSED`.

O pedido nasce `pending` e guarda um **snapshot** dos itens e valores, que não muda depois.
Após `orderDelayMs`, a simulação o leva a `confirmed` (baixa o estoque, remove do carrinho
só as quantidades compradas, gera `transaction` com hash e link do explorador) ou
`rejected` (`rejectionReason`; o carrinho é preservado). Estados terminais não mudam mais.

## Perfil (autenticado)

| Método | Rota | Corpo | Resposta |
| --- | --- | --- | --- |
| GET | `/profile` | — | 200 `User` |
| PATCH | `/profile` | `{ displayName, username, email, ensName, walletNickname }` | 200 `User` · 422 · 409 |
| PUT | `/profile/avatar` | `{ dataUrl }` (PNG/JPEG/WebP, até 1 MB) | 200 `User` · 422 |
| DELETE | `/profile/avatar` | — | 200 `User` |
| POST | `/profile/password` | `{ currentPassword, newPassword }` | 204 · 422 |

## Carteiras (autenticado)

| Método | Rota | Corpo | Resposta |
| --- | --- | --- | --- |
| GET | `/wallets` | — | 200 `Wallet[]` |
| POST | `/wallets` | `WalletInput` | 201 `Wallet` · 422 · 409 `WALLET_ROLE_TAKEN` |
| PUT | `/wallets/:walletId` | `WalletInput` | 200 `Wallet` · 422 · 404 |
| POST | `/wallets/:walletId/connect` | `{ network }` | 200 `{ walletId, network, status: 'connected' }` · 409 `WALLET_REJECTED` |

`WalletInput`: `role` (`primary`/`secondary`, uma de cada por usuário), `displayName`,
`nickname`, `profileName`, `network`, `address` (0x + 40 hex), `secondaryAddress`
(opcional), `type` (`metamask`/`walletconnect`/`coinbase`), `referralCode`, `email`, `ensName`.

## Eventos Socket.IO

Conexão: `socket.io-client`, transporte WebSocket, `auth: { token }` no handshake.

Envelope de todo evento:

```ts
{ id: 'evt_000123', type, resource: { type, id }, version, occurredAt, data }
```

- `id` é estável: uma duplicata chega com o mesmo `id`.
- `version` é a versão do recurso após a alteração; o cliente ignora eventos com versão
  menor ou igual à que já conhece (eventos antigos e duplicados).

| Evento | Destinatário | `data` |
| --- | --- | --- |
| `nft.updated` | Todas as conexões | `{ nftId, price, previousPrice, available, editions: [{ id, price, previousPrice, available }] }` |
| `order.updated` | Só as conexões do dono do pedido (token válido) | `Order` completo |

Toda alteração no banco simulado que muda preço/disponibilidade (cenários ou pedidos
confirmados) publica `nft.updated`; toda mudança de estado de pedido publica `order.updated`.
