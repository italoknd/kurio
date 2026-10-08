import type { EthAmount } from '@/lib/eth'
import type { EditionId, NftNetwork } from '@/types/nft'

export interface CartItem {
  id: string
  nftId: string
  editionId: EditionId
  quantity: number
  nft: { name: string; tokenId: string; image: string; imageAlt: string; network: NftNetwork }
  editionLabel: string
  /** Preço unitário atual da edição. */
  unitPrice: EthAmount
  lineTotal: EthAmount
  /** Unidades disponíveis agora (pode ser menor que `quantity` após um evento). */
  available: number
  /** Máximo que pode ser escolhido: menor entre disponibilidade e limite por pedido. */
  maxQuantity: number
}

export interface Cart {
  id: string
  items: CartItem[]
  couponCode: string | null
  itemCount: number
  version: number
  updatedAt: string
}

export interface AddCartItemRequest {
  nftId: string
  editionId: EditionId
  quantity: number
}

export interface UpdateCartItemRequest {
  quantity: number
}

export interface ApplyCouponRequest {
  code: string
}

export interface MergeCartRequest {
  guestCartId: string
}

export type QuoteIssueType = 'unavailable' | 'insufficient'

export interface QuoteIssue {
  itemId: string
  type: QuoteIssueType
  available: number
}

export interface QuoteItem {
  itemId: string
  nftId: string
  editionId: EditionId
  name: string
  quantity: number
  unitPrice: EthAmount
  lineTotal: EthAmount
}

/**
 * GET /cart/quote — cotação calculada pela API. É a referência para finalizar o
 * pedido: o `id` muda sempre que preço, disponibilidade, cupom ou taxa mudam.
 */
export interface Quote {
  id: string
  network: NftNetwork
  items: QuoteItem[]
  subtotal: EthAmount
  discount: EthAmount
  coupon: { code: string; description: string } | null
  networkFee: EthAmount
  total: EthAmount
  /** Itens que impedem a compra (esgotados ou com quantidade acima do disponível). */
  issues: QuoteIssue[]
  createdAt: string
}
