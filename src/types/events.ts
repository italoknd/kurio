import type { EthAmount } from '@/lib/eth'
import type { EditionId } from '@/types/nft'
import type { Order } from '@/types/order'

/**
 * Envelope de todos os eventos Socket.IO. `id` é estável (duplicatas têm o mesmo id)
 * e `version` é a versão do recurso após a alteração: o cliente descarta eventos com
 * versão menor ou igual à que já conhece.
 */
export interface RealtimeEvent<TType extends string, TResource extends string, TData> {
  id: string
  type: TType
  resource: { type: TResource; id: string }
  version: number
  occurredAt: string
  data: TData
}

export interface NftUpdatedData {
  nftId: string
  price: EthAmount
  available: boolean
  editions: { id: EditionId; price: EthAmount; previousPrice: EthAmount | null; available: number }[]
}

export type NftUpdatedEvent = RealtimeEvent<'nft.updated', 'nft', NftUpdatedData>

/** Enviado apenas para as conexões do dono do pedido. */
export type OrderUpdatedEvent = RealtimeEvent<'order.updated', 'order', Order>

export interface ServerToClientEvents {
  'nft.updated': (event: NftUpdatedEvent) => void
  'order.updated': (event: OrderUpdatedEvent) => void
}

/** Dados enviados no handshake da conexão. */
export interface SocketAuth {
  token: string | null
}
