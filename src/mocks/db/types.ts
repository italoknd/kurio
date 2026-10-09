import type { EthAmount } from '@/lib/eth'
import type { SupportTicket } from '@/types/account'
import type { User } from '@/types/auth'
import type { EditionId, NftDetail } from '@/types/nft'
import type { CreateOrderRequest, Order } from '@/types/order'
import type { Wallet } from '@/types/wallet'

/** Registros internos do banco simulado (campos extras não saem nas respostas). */

export interface UserRecord extends User {
  passwordSalt: string
  /** SHA-256 de `${salt}:${senha}` — nunca a senha em claro. */
  passwordHash: string
}

export interface SessionRecord {
  token: string
  userId: string
  expiresAt: string
}

export interface NftRecord extends NftDetail {
  listedAt: string
  /** Pontuação usada na aba "Em alta". */
  trending: number
}

export interface CartItemRecord {
  id: string
  nftId: string
  editionId: EditionId
  quantity: number
}

export interface CartRecord {
  id: string
  /** `null` para carrinho de visitante (identificado pelo header X-Cart-Id). */
  userId: string | null
  items: CartItemRecord[]
  couponCode: string | null
  version: number
  updatedAt: string
}

export interface WalletRecord extends Wallet {
  userId: string
}

export interface CouponRecord {
  code: string
  description: string
  percent: number
  expiresAt: string
}

export interface OrderRecord extends Order {
  userId: string
  /** Momento em que a simulação de pagamento conclui o pedido. */
  processAt: string
  /** Resultado definido pelo cenário no momento da criação. */
  outcome: 'aprovar' | 'recusar'
  request: CreateOrderRequest
}

export interface IdempotencyRecord {
  key: string
  userId: string
  requestHash: string
  orderId: string
}

export interface TicketRecord extends SupportTicket {
  userId: string
}

export interface DbState {
  /** Versão das fixtures; estados salvos com outra versão são descartados. */
  schemaVersion: number
  users: UserRecord[]
  sessions: SessionRecord[]
  nfts: NftRecord[]
  /** IDs de NFT favoritados por usuário. */
  favorites: Record<string, string[]>
  carts: CartRecord[]
  wallets: WalletRecord[]
  coupons: CouponRecord[]
  orders: OrderRecord[]
  idempotency: IdempotencyRecord[]
  /** Chamados de suporte (área extra do colecionador). */
  tickets: TicketRecord[]
  /** Sequência dos eventos de tempo real (gera ids estáveis). */
  eventSeq: number
}

export type { EthAmount }
