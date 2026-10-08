import type { NftRecord, OrderRecord, UserRecord, WalletRecord } from '@/mocks/db/types'
import type { User } from '@/types/auth'
import type { NftUpdatedData } from '@/types/events'
import type { NftDetail, NftSummary } from '@/types/nft'
import type { Order } from '@/types/order'
import type { Wallet } from '@/types/wallet'

/** Converte registros internos nos contratos públicos (sem campos internos). */

export function toUser(record: UserRecord): User {
  return {
    id: record.id,
    username: record.username,
    displayName: record.displayName,
    email: record.email,
    ensName: record.ensName,
    walletNickname: record.walletNickname,
    avatarUrl: record.avatarUrl,
  }
}

/** Recalcula os campos derivados das edições (preço padrão e disponibilidade). */
export function refreshDerived(nft: NftRecord) {
  const edition = nft.editions.find((e) => e.id === nft.defaultEditionId) ?? nft.editions[0]
  nft.price = edition.price
  nft.previousPrice = edition.previousPrice
  nft.available = nft.editions.some((e) => e.available > 0)
}

export function toNftSummary(nft: NftRecord): NftSummary {
  return {
    id: nft.id,
    name: nft.name,
    tokenId: nft.tokenId,
    image: nft.image,
    imageAlt: nft.imageAlt,
    collection: nft.collection,
    category: nft.category,
    network: nft.network,
    price: nft.price,
    previousPrice: nft.previousPrice,
    rare: nft.rare,
    available: nft.available,
    version: nft.version,
  }
}

export function toNftDetail(nft: NftRecord): NftDetail {
  const { listedAt: _listedAt, trending: _trending, ...detail } = nft
  return structuredClone(detail)
}

export function toNftUpdatedData(nft: NftRecord): NftUpdatedData {
  return {
    nftId: nft.id,
    price: nft.price,
    available: nft.available,
    editions: nft.editions.map((e) => ({
      id: e.id,
      price: e.price,
      previousPrice: e.previousPrice,
      available: e.available,
    })),
  }
}

export function toOrder(record: OrderRecord): Order {
  const { userId: _userId, processAt: _processAt, outcome: _outcome, request: _request, ...order } = record
  return structuredClone(order)
}

export function toWallet(record: WalletRecord): Wallet {
  const { userId: _userId, ...wallet } = record
  return { ...wallet }
}
