import type { EthAmount } from '@/lib/eth'
import type { EditionId, NftNetwork } from '@/types/nft'
import type { WalletType } from '@/types/wallet'

/** `confirmed` e `rejected` são terminais. */
export type OrderStatus = 'pending' | 'confirmed' | 'rejected'

export interface CollectorInfo {
  displayName: string
  username: string
  profileName: string
  email: string
  ensName: string
  referralCode: string
  note: string
}

/**
 * POST /orders — exige o header `Idempotency-Key`. A mesma chave com o mesmo
 * conteúdo recupera o pedido existente; com conteúdo diferente gera 409.
 */
export interface CreateOrderRequest {
  /** Cotação revisada pelo usuário; se estiver desatualizada a API responde 409 QUOTE_OUTDATED. */
  quoteId: string
  network: NftNetwork
  walletId: string
  collector: CollectorInfo
}

/** Snapshot imutável do item no momento da compra. */
export interface OrderItem {
  nftId: string
  editionId: EditionId
  name: string
  tokenId: string
  image: string
  imageAlt: string
  editionLabel: string
  quantity: number
  unitPrice: EthAmount
  lineTotal: EthAmount
}

export interface Order {
  id: string
  status: OrderStatus
  createdAt: string
  updatedAt: string
  network: NftNetwork
  wallet: { id: string; label: string; address: string; type: WalletType }
  items: OrderItem[]
  subtotal: EthAmount
  discount: EthAmount
  coupon: { code: string; description: string } | null
  networkFee: EthAmount
  total: EthAmount
  /** Transação simulada, presente quando confirmado. */
  transaction: { hash: string; explorerUrl: string; confirmedAt: string } | null
  rejectionReason: string | null
  version: number
}
