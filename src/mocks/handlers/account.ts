import { HttpResponse } from 'msw'
import { commit, db, newId, nowIso } from '@/mocks/db/store'
import type { TicketRecord } from '@/mocks/db/types'
import { notFound, readJson, requireAuth, route, text, validationError } from '@/mocks/handlers/utils'
import { toNftSummary } from '@/mocks/serializers'
import { TICKET_CATEGORIES, type CreateTicketRequest, type DownloadItem, type OffersResponse, type SupportTicket } from '@/types/account'
import { compareEth } from '@/lib/eth'

/**
 * Áreas extras do colecionador (além do escopo do enunciado): ofertas, arquivos
 * baixados e suporte. Todas derivam do mesmo banco simulado dos demais handlers.
 */

function toTicket(record: TicketRecord): SupportTicket {
  const { userId: _userId, ...ticket } = record
  return { ...ticket }
}

/** Protocolo legível e único por dia: KUR-AAAAMMDD-NNNN. */
function nextProtocol() {
  const day = nowIso().slice(0, 10).replace(/-/g, '')
  const sameDay = db.state.tickets.filter((t) => t.protocol.startsWith(`KUR-${day}`)).length
  return `KUR-${day}-${String(sameDay + 1).padStart(4, '0')}`
}

export const accountHandlers = [
  route('get', '/offers', ({ request }) => {
    const auth = requireAuth(request)
    if ('response' in auth) return auth.response
    const now = Date.now()
    const coupons = db.state.coupons
      .map((coupon) => ({ ...coupon, active: new Date(coupon.expiresAt).getTime() > now }))
      .sort((a, b) => Number(b.active) - Number(a.active) || b.percent - a.percent)
    const priceDrops = db.state.nfts
      .filter((nft) => nft.available && nft.previousPrice && compareEth(nft.price, nft.previousPrice) < 0)
      .map(toNftSummary)
    return HttpResponse.json<OffersResponse>({ coupons, priceDrops })
  }),

  /** Arte desbloqueável: um arquivo por NFT/edição comprado em pedidos confirmados. */
  route('get', '/downloads', ({ request }) => {
    const auth = requireAuth(request)
    if ('response' in auth) return auth.response
    const items: DownloadItem[] = db.state.orders
      .filter((order) => order.userId === auth.user.id && order.status === 'confirmed')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .flatMap((order) =>
        order.items.map((item) => ({
          id: `${order.id}:${item.nftId}:${item.editionId}`,
          orderId: order.id,
          nftId: item.nftId,
          editionId: item.editionId,
          editionLabel: item.editionLabel,
          name: item.name,
          tokenId: item.tokenId,
          image: item.image,
          imageAlt: item.imageAlt,
          fileName: `${item.nftId}-${item.editionId}.webp`,
          format: 'WebP' as const,
          purchasedAt: order.transaction?.confirmedAt ?? order.updatedAt,
        })),
      )
    return HttpResponse.json(items)
  }),

  route('get', '/support/tickets', ({ request }) => {
    const auth = requireAuth(request)
    if ('response' in auth) return auth.response
    const tickets = db.state.tickets
      .filter((ticket) => ticket.userId === auth.user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toTicket)
    return HttpResponse.json(tickets)
  }),

  route('post', '/support/tickets', async ({ request }) => {
    const auth = requireAuth(request)
    if ('response' in auth) return auth.response
    const body = await readJson<CreateTicketRequest>(request)
    const subject = text(body.subject)
    const message = text(body.message)
    const orderId = text(body.orderId) || null
    const fields: Record<string, string> = {}
    if (!body.category || !(body.category in TICKET_CATEGORIES)) fields.category = 'Selecione o assunto do chamado.'
    if (subject.length < 5) fields.subject = 'Descreva o assunto com pelo menos 5 caracteres.'
    else if (subject.length > 80) fields.subject = 'Use no máximo 80 caracteres no assunto.'
    if (message.length < 20) fields.message = 'Conte o que aconteceu com pelo menos 20 caracteres.'
    else if (message.length > 2000) fields.message = 'Use no máximo 2000 caracteres.'
    if (Object.keys(fields).length > 0) return validationError(fields)
    // Pedido relacionado precisa ser do próprio usuário (sem revelar pedidos de outros).
    if (orderId && !db.state.orders.some((order) => order.id === orderId && order.userId === auth.user.id)) {
      return notFound('Pedido não encontrado.')
    }

    const ticket: TicketRecord = {
      id: newId('tkt'),
      userId: auth.user.id,
      protocol: nextProtocol(),
      category: body.category!,
      subject,
      message,
      orderId,
      status: 'aberto',
      createdAt: nowIso(),
      reply: null,
      repliedAt: null,
    }
    db.state.tickets.push(ticket)
    commit()
    return HttpResponse.json(toTicket(ticket), { status: 201 })
  }),
]
