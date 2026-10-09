import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { queryKeys } from '@/api/query-keys'
import { cartNotices } from '@/features/cart/cart-notices'
import { createEventTracker } from '@/features/realtime/event-tracker'
import { compareEth, formatEth } from '@/lib/eth'
import type { Cart, CartItem } from '@/types/cart'
import type { Socket } from 'socket.io-client'
import type { NftUpdatedData, NftUpdatedEvent, OrderUpdatedEvent } from '@/types/events'
import type { FeaturedNfts, NftDetail, NftListResponse, NftSummary } from '@/types/nft'
import type { Order } from '@/types/order'

/** Aplica o evento a um card do catálogo, só se ele for mais novo que o dado em cache. */
function patchSummary<T extends NftSummary>(nft: T, event: NftUpdatedEvent): T {
  if (nft.id !== event.data.nftId || nft.version >= event.version) return nft
  const { price, previousPrice, available } = event.data
  return { ...nft, price, previousPrice, available, version: event.version }
}

function patchDetail(nft: NftDetail, event: NftUpdatedEvent): NftDetail {
  if (nft.version >= event.version) return nft
  const editions = nft.editions.map((edition) => {
    const update = event.data.editions.find((item) => item.id === edition.id)
    return update ? { ...edition, ...update } : edition
  })
  return { ...patchSummary(nft, event), editions }
}

/** Atualiza preço e disponibilidade em todas as consultas do catálogo e no detalhe. */
function applyToCatalog(queryClient: QueryClient, event: NftUpdatedEvent) {
  queryClient.setQueriesData<NftListResponse>({ queryKey: ['nfts', 'list'] }, (list) =>
    list && { ...list, items: list.items.map((nft) => patchSummary(nft, event)) },
  )
  queryClient.setQueryData<FeaturedNfts>(queryKeys.nfts.featured, (featured) =>
    featured && {
      hero: featured.hero.map((nft) => patchSummary(nft, event)),
      spotlight: patchSummary(featured.spotlight, event),
    },
  )
  queryClient.setQueryData<NftDetail>(queryKeys.nfts.detail(event.data.nftId), (nft) => nft && patchDetail(nft, event))
}

/** Descreve a mudança de um item do carrinho; `null` se nada relevante mudou. */
function describeCartChange(item: CartItem, data: NftUpdatedData): string | null {
  const edition = data.editions.find((e) => e.id === item.editionId)
  if (!edition) return null
  const name = `${item.nft.name} (${item.editionLabel})`
  const parts: string[] = []
  if (compareEth(edition.price, item.unitPrice) !== 0) {
    parts.push(`O preço de ${name} mudou de ${formatEth(item.unitPrice)} para ${formatEth(edition.price)}.`)
  }
  if (edition.available !== item.available) {
    if (edition.available === 0) parts.push(`${name} esgotou.`)
    else if (edition.available < item.quantity) {
      parts.push(`${name} agora tem só ${edition.available} ${edition.available === 1 ? 'unidade disponível' : 'unidades disponíveis'}.`)
    }
  }
  return parts.length > 0 ? parts.join(' ') : null
}

/**
 * Avisa sobre itens do carrinho afetados e recarrega carrinho e cotação da API
 * (a cotação é sempre recalculada pelo servidor, nunca ajustada no cliente).
 */
function applyToCart(queryClient: QueryClient, userId: string | null, event: NftUpdatedEvent) {
  const cart = queryClient.getQueryData<Cart>(queryKeys.cart(userId))
  const items = cart?.items.filter((item) => item.nftId === event.data.nftId) ?? []
  if (items.length === 0) return false

  for (const item of items) {
    const message = describeCartChange(item, event.data)
    if (!message) continue
    cartNotices.push({ id: item.id, message })
    toast.warning(message, { id: `carrinho-${item.id}` })
  }
  void queryClient.invalidateQueries({ queryKey: queryKeys.cart(userId) })
  return true
}

/** Avisa quem está vendo o detalhe do NFT alterado (preço da edição padrão ou esgotamento). */
function announceOnDetail(previous: NftDetail | undefined, event: NftUpdatedEvent, pathname: string) {
  if (!previous || pathname !== `/nft/${event.data.nftId}` || previous.version >= event.version) return
  if (compareEth(previous.price, event.data.price) !== 0) {
    toast.info(`O preço de ${previous.name} mudou de ${formatEth(previous.price)} para ${formatEth(event.data.price)}.`)
  } else if (previous.available && !event.data.available) {
    toast.info(`${previous.name} esgotou.`)
  }
}

function applyOrder(queryClient: QueryClient, userId: string, event: OrderUpdatedEvent) {
  queryClient.setQueryData<Order>(queryKeys.user.order(userId, event.resource.id), (order) =>
    order && order.version >= event.version ? order : event.data,
  )
  void queryClient.invalidateQueries({ queryKey: ['user', userId, 'orders'] })
  // Confirmado: a API removeu do carrinho só os itens e quantidades comprados.
  if (event.data.status === 'confirmed') void queryClient.invalidateQueries({ queryKey: queryKeys.cart(userId) })
}

/**
 * Liga os eventos Socket.IO ao cache do TanStack Query:
 * - `nft.updated` atualiza catálogo, detalhe e carrinho (com aviso acessível);
 * - `order.updated` atualiza o pedido do usuário atual;
 * - após uma reconexão, as consultas ativas são revalidadas na API REST, pois
 *   eventos enviados durante a queda foram perdidos.
 * Duplicatas e eventos antigos são descartados pelo `EventTracker`.
 */
export function useRealtimeSync(socket: Socket | null, userId: string | null) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const trackerRef = useRef(createEventTracker())

  useEffect(() => {
    if (!socket) return
    const tracker = trackerRef.current

    const onNftUpdated = (event: NftUpdatedEvent) => {
      if (!tracker.accept(event)) return
      const previousDetail = queryClient.getQueryData<NftDetail>(queryKeys.nfts.detail(event.data.nftId))
      applyToCatalog(queryClient, event)
      const inCart = applyToCart(queryClient, userId, event)
      if (!inCart) announceOnDetail(previousDetail, event, router.state.location.pathname)
    }

    const onOrderUpdated = (event: OrderUpdatedEvent) => {
      // Sem sessão não há pedido a atualizar (evento atrasado de uma sessão encerrada).
      if (!userId || !tracker.accept(event)) return
      applyOrder(queryClient, userId, event)
    }

    const onReconnect = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.nfts.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart(userId) })
      if (userId) void queryClient.invalidateQueries({ queryKey: queryKeys.user.all(userId) })
    }

    socket.on('nft.updated', onNftUpdated)
    socket.on('order.updated', onOrderUpdated)
    socket.io.on('reconnect', onReconnect)
    return () => {
      socket.off('nft.updated', onNftUpdated)
      socket.off('order.updated', onOrderUpdated)
      socket.io.off('reconnect', onReconnect)
      // Troca de usuário: pedidos e avisos da sessão anterior não valem para a próxima.
      tracker.forget('order')
      cartNotices.clear()
    }
  }, [socket, queryClient, router, userId])
}
