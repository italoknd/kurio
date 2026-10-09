import type { EditionId, NftSummary } from '@/types/nft'

/**
 * Contratos das áreas extras do colecionador (além do escopo do enunciado):
 * ofertas, arquivos baixados e suporte. A atividade usa `GET /orders`.
 */

/** Cupom divulgado em "Ofertas" (`active` = dentro da validade). */
export interface CouponOffer {
  code: string
  description: string
  percent: number
  expiresAt: string
  active: boolean
}

/** GET /offers — cupons e NFTs com preço reduzido (preço anterior maior que o atual). */
export interface OffersResponse {
  coupons: CouponOffer[]
  priceDrops: NftSummary[]
}

/** GET /downloads — arte desbloqueável dos NFTs comprados (pedidos confirmados). */
export interface DownloadItem {
  id: string
  orderId: string
  nftId: string
  editionId: EditionId
  editionLabel: string
  name: string
  tokenId: string
  image: string
  imageAlt: string
  /** Nome sugerido para o arquivo baixado. */
  fileName: string
  format: 'WebP'
  purchasedAt: string
}

export const TICKET_CATEGORIES = {
  pedido: 'Pedido ou pagamento',
  carteira: 'Carteira',
  conta: 'Conta e acesso',
  outro: 'Outro assunto',
} as const

export type TicketCategory = keyof typeof TICKET_CATEGORIES

export type TicketStatus = 'aberto' | 'respondido'

export interface SupportTicket {
  id: string
  /** Protocolo exibido ao colecionador (ex.: KUR-20261009-0002). */
  protocol: string
  category: TicketCategory
  subject: string
  message: string
  orderId: string | null
  status: TicketStatus
  createdAt: string
  reply: string | null
  repliedAt: string | null
}

/** POST /support/tickets */
export interface CreateTicketRequest {
  category: TicketCategory
  subject: string
  message: string
  orderId: string | null
}
