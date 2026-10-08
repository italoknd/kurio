import { getMockConfig } from '@/mocks/config'
import { commit, db, newId, nowIso, stableHash } from '@/mocks/db/store'
import type { OrderRecord, WalletRecord } from '@/mocks/db/types'
import { editionOf, removePurchased } from '@/mocks/domain/cart'
import { updateNft } from '@/mocks/domain/catalog'
import { publishOrderUpdated } from '@/mocks/realtime'
import { WALLET_TYPES } from '@/types/wallet'
import type { Quote } from '@/types/cart'
import type { CreateOrderRequest } from '@/types/order'
import type { NftNetwork } from '@/types/nft'

const EXPLORERS: Record<NftNetwork, string> = {
  ethereum: 'https://etherscan.io/tx/',
  polygon: 'https://polygonscan.com/tx/',
  solana: 'https://solscan.io/tx/',
}

const timers = new Map<string, number>()

/** Hash estável do corpo do pedido, usado para detectar reuso de chave com outro conteúdo. */
export function requestHash(body: CreateOrderRequest) {
  return stableHash(body)
}

export function findIdempotentOrder(userId: string, key: string) {
  const record = db.state.idempotency.find((r) => r.userId === userId && r.key === key)
  if (!record) return undefined
  return { record, order: db.state.orders.find((o) => o.id === record.orderId)! }
}

/** Cria o pedido pendente com o snapshot da cotação e agenda a simulação de pagamento. */
export function createOrder(params: {
  userId: string
  idempotencyKey: string
  body: CreateOrderRequest
  quote: Quote
  wallet: WalletRecord
}): OrderRecord {
  const { userId, idempotencyKey, body, quote, wallet } = params
  const config = getMockConfig()
  const createdAt = nowIso()

  const order: OrderRecord = {
    id: newId('ord'),
    status: 'pending',
    createdAt,
    updatedAt: createdAt,
    network: body.network,
    wallet: { id: wallet.id, label: WALLET_TYPES[wallet.type], address: wallet.address, type: wallet.type },
    items: quote.items.map((item) => {
      const { nft, edition } = editionOf(item)!
      return {
        nftId: item.nftId,
        editionId: item.editionId,
        name: item.name,
        tokenId: nft.tokenId,
        image: nft.image,
        imageAlt: nft.imageAlt,
        editionLabel: edition.label,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      }
    }),
    subtotal: quote.subtotal,
    discount: quote.discount,
    coupon: quote.coupon,
    networkFee: quote.networkFee,
    total: quote.total,
    transaction: null,
    rejectionReason: null,
    version: 1,
    userId,
    processAt: new Date(Date.now() + config.orderDelayMs).toISOString(),
    outcome: config.payment,
    request: body,
  }

  db.state.orders.push(order)
  db.state.idempotency.push({ key: idempotencyKey, userId, requestHash: requestHash(body), orderId: order.id })
  commit()
  schedule(order)
  return order
}

function schedule(order: OrderRecord) {
  if (order.status !== 'pending' || timers.has(order.id)) return
  const wait = Math.max(0, new Date(order.processAt).getTime() - Date.now())
  timers.set(order.id, window.setTimeout(() => processOrder(order.id), wait))
}

function finish(order: OrderRecord, status: 'confirmed' | 'rejected', rejectionReason: string | null) {
  const now = nowIso()
  order.status = status
  order.updatedAt = now
  order.rejectionReason = rejectionReason
  order.version += 1
  if (status === 'confirmed') {
    const hash = `0x${stableHash([order.id, 'a'])}${stableHash([order.id, 'b'])}${stableHash([order.id, 'c'])}${stableHash([order.id, 'd'])}`
    order.transaction = { hash, explorerUrl: `${EXPLORERS[order.network]}${hash}`, confirmedAt: now }
  }
  commit()
  publishOrderUpdated(order)
}

/** Conclui a simulação: recusa pelo cenário, recusa por falta de estoque ou confirma. */
export function processOrder(orderId: string) {
  timers.delete(orderId)
  const order = db.state.orders.find((o) => o.id === orderId)
  if (!order || order.status !== 'pending') return

  if (order.outcome === 'recusar') {
    finish(order, 'rejected', 'Pagamento recusado pela carteira.')
    return
  }

  const soldOut = order.items.find((item) => {
    const found = editionOf(item)
    return !found || found.edition.available < item.quantity
  })
  if (soldOut) {
    finish(order, 'rejected', `${soldOut.name} (${soldOut.editionLabel}) esgotou antes da confirmação.`)
    return
  }

  for (const item of order.items) {
    const { edition } = editionOf(item)!
    updateNft(item.nftId, { editionId: item.editionId, available: edition.available - item.quantity })
  }
  removePurchased(order.userId, order.items)
  finish(order, 'confirmed', null)
}

/** Retoma a simulação dos pedidos pendentes (ex.: após refresh da página). */
export function resumePendingOrders() {
  db.state.orders.filter((o) => o.status === 'pending').forEach(schedule)
}

export function clearOrderTimers() {
  timers.forEach((timer) => window.clearTimeout(timer))
  timers.clear()
}
