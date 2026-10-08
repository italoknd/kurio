import { delay, HttpResponse } from 'msw'
import { env } from '@/lib/env'
import { db } from '@/mocks/db/store'
import { computeQuote, getOrCreateCart } from '@/mocks/domain/cart'
import { createOrder, findIdempotentOrder, requestHash } from '@/mocks/domain/orders'
import { conflict, EMAIL_PATTERN, notFound, readJson, requireAuth, route, text, validationError } from '@/mocks/handlers/utils'
import { toOrder } from '@/mocks/serializers'
import type { CollectorInfo, CreateOrderRequest } from '@/types/order'
import { NFT_NETWORKS, type NftNetwork } from '@/types/nft'

export const IDEMPOTENCY_HEADER = 'Idempotency-Key'

let timeoutNextCreate = false

/**
 * Cenário "timeout após criação": o próximo POST /orders cria o pedido, mas a
 * resposta só chega depois do timeout do cliente. Repetir com a mesma chave de
 * idempotência recupera o mesmo pedido.
 */
export function setTimeoutNextOrderCreate(value = true) {
  timeoutNextCreate = value
}

const REQUIRED_COLLECTOR_FIELDS: (keyof CollectorInfo)[] = [
  'displayName',
  'username',
  'profileName',
  'email',
  'ensName',
  'referralCode',
]

function validateOrder(body: Partial<CreateOrderRequest>) {
  const fields: Record<string, string> = {}
  if (!text(body.quoteId)) fields.quoteId = 'Cotação ausente. Revise o carrinho.'
  if (!body.network || !(body.network in NFT_NETWORKS)) fields.network = 'Selecione uma rede.'
  if (!text(body.walletId)) fields.walletId = 'Selecione uma carteira.'
  const collector = body.collector ?? ({} as Partial<CollectorInfo>)
  for (const field of REQUIRED_COLLECTOR_FIELDS) {
    if (!text(collector[field])) fields[`collector.${field}`] = 'Campo obrigatório.'
  }
  if (text(collector.email) && !EMAIL_PATTERN.test(text(collector.email))) fields['collector.email'] = 'Informe um e-mail válido.'
  return fields
}

export const orderHandlers = [
  route('post', '/orders', async ({ request }) => {
    const auth = requireAuth(request)
    if ('response' in auth) return auth.response

    const key = request.headers.get(IDEMPOTENCY_HEADER)?.trim()
    if (!key) return validationError({ idempotencyKey: `O header ${IDEMPOTENCY_HEADER} é obrigatório.` })

    const body = (await readJson<CreateOrderRequest>(request)) as CreateOrderRequest

    // Mesma chave: mesmo conteúdo recupera o pedido; conteúdo diferente é conflito.
    const previous = findIdempotentOrder(auth.user.id, key)
    if (previous) {
      if (previous.record.requestHash !== requestHash(body)) {
        return conflict('IDEMPOTENCY_KEY_REUSED', 'Esta tentativa de compra já foi usada com outros dados.')
      }
      return HttpResponse.json(toOrder(previous.order))
    }

    const fields = validateOrder(body)
    if (Object.keys(fields).length > 0) return validationError(fields)

    const wallet = db.state.wallets.find((w) => w.id === body.walletId && w.userId === auth.user.id)
    if (!wallet) return validationError({ walletId: 'Carteira não encontrada. Cadastre uma carteira no perfil.' })

    // Revalidação: preço, disponibilidade, cupom e taxa precisam bater com a cotação revisada.
    const quote = computeQuote(getOrCreateCart({ userId: auth.user.id }), body.network as NftNetwork)
    if (quote.items.length === 0) return validationError({ quoteId: 'Seu carrinho está vazio.' })
    if (quote.issues.length > 0) {
      return conflict('INSUFFICIENT_AVAILABILITY', 'Alguns itens não estão mais disponíveis na quantidade escolhida.', {
        details: { quote },
      })
    }
    if (quote.id !== body.quoteId) {
      return conflict('QUOTE_OUTDATED', 'Os valores do pedido mudaram. Revise e confirme novamente.', { details: { quote } })
    }

    const order = createOrder({ userId: auth.user.id, idempotencyKey: key, body, quote, wallet })

    if (timeoutNextCreate) {
      timeoutNextCreate = false
      await delay(env.httpTimeout + 2000)
    }
    return HttpResponse.json(toOrder(order), { status: 201 })
  }),

  route('get', '/orders', ({ request }) => {
    const auth = requireAuth(request)
    if ('response' in auth) return auth.response
    const status = new URL(request.url).searchParams.get('status')
    const orders = db.state.orders
      .filter((o) => o.userId === auth.user.id && (!status || o.status === status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toOrder)
    return HttpResponse.json(orders)
  }),

  route<{ orderId: string }>('get', '/orders/:orderId', ({ request, params }) => {
    const auth = requireAuth(request)
    if ('response' in auth) return auth.response
    const order = db.state.orders.find((o) => o.id === params.orderId)
    if (!order) return notFound('Pedido não encontrado.')
    // Pedido de outro usuário responde como inexistente, sem vazar sua existência.
    if (order.userId !== auth.user.id) return notFound('Pedido não encontrado.')
    return HttpResponse.json(toOrder(order))
  }),
]
