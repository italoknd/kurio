import { useState } from 'react'
import type { EditionId, NftDetail, NftEdition } from '@/types/nft'

/** Edição inicial: a padrão, ou a primeira com estoque se a padrão estiver esgotada. */
function initialEdition(nft: NftDetail): EditionId {
  const preferred = nft.editions.find((e) => e.id === nft.defaultEditionId)
  if (preferred && preferred.available > 0) return preferred.id
  return (nft.editions.find((e) => e.available > 0) ?? preferred ?? nft.editions[0]).id
}

export function limitOf(edition: NftEdition) {
  return Math.min(edition.available, edition.maxPerOrder)
}

export interface PurchaseState {
  edition: NftEdition
  quantity: number
  setEdition: (id: EditionId) => void
  setQuantity: (quantity: number) => void
}

/** Estado de edição e quantidade, sempre dentro dos limites da edição escolhida. */
export function usePurchaseState(nft: NftDetail): PurchaseState {
  const [editionId, setEditionId] = useState<EditionId>(() => initialEdition(nft))
  const [requested, setRequested] = useState(1)
  const edition = nft.editions.find((e) => e.id === editionId) ?? nft.editions[0]
  // Se a disponibilidade cair (ex.: evento em tempo real), a quantidade acompanha o novo limite.
  const quantity = Math.max(1, Math.min(requested, limitOf(edition) || 1))
  return { edition, quantity, setEdition: setEditionId, setQuantity: setRequested }
}
