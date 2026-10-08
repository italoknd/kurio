import { HttpResponse } from 'msw'
import { newId } from '@/mocks/db/store'
import {
  checkCoupon,
  computeQuote,
  editionOf,
  getOrCreateCart,
  mergeGuestCart,
  toCart,
  touch,
  type CartOwner,
} from '@/mocks/domain/cart'
import { findNft } from '@/mocks/domain/catalog'
import {
  conflict,
  notFound,
  optionalUser,
  readJson,
  requireAuth,
  route,
  text,
  validationError,
} from '@/mocks/handlers/utils'
import type { AddCartItemRequest, ApplyCouponRequest, MergeCartRequest, UpdateCartItemRequest } from '@/types/cart'
import { NFT_NETWORKS, type NftNetwork } from '@/types/nft'

/** Header que identifica o carrinho do visitante. */
export const CART_ID_HEADER = 'X-Cart-Id'

/** Carrinho do usuário autenticado ou do visitante (pelo header X-Cart-Id). */
function ownerOf(request: Request): CartOwner {
  const user = optionalUser(request)
  return user ? { userId: user.id } : { guestCartId: request.headers.get(CART_ID_HEADER) }
}

function isQuantity(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1
}

function availabilityConflict(available: number, maxPerOrder: number) {
  if (available === 0) {
    return conflict('EDITION_SOLD_OUT', 'Esta edição está esgotada.', { details: { available: 0 } })
  }
  const limit = Math.min(available, maxPerOrder)
  return conflict('INSUFFICIENT_AVAILABILITY', `Quantidade máxima para esta edição: ${limit}.`, {
    fields: { quantity: `Escolha até ${limit} ${limit === 1 ? 'unidade' : 'unidades'}.` },
    details: { available, maxQuantity: limit },
  })
}

export const cartHandlers = [
  route('get', '/cart', ({ request }) => HttpResponse.json(toCart(getOrCreateCart(ownerOf(request))))),

  route('post', '/cart/items', async ({ request }) => {
    const body = await readJson<AddCartItemRequest>(request)
    if (!isQuantity(body.quantity)) return validationError({ quantity: 'A quantidade deve ser um número inteiro maior que zero.' })
    if (!body.nftId || !findNft(body.nftId)) return notFound('NFT não encontrado.')
    const found = editionOf({ nftId: body.nftId, editionId: body.editionId! })
    if (!found) return validationError({ editionId: 'Edição indisponível para este NFT.' })

    const cart = getOrCreateCart(ownerOf(request))
    const existing = cart.items.find((i) => i.nftId === body.nftId && i.editionId === body.editionId)
    const nextQuantity = (existing?.quantity ?? 0) + body.quantity
    const { available, maxPerOrder } = found.edition
    if (nextQuantity > Math.min(available, maxPerOrder)) return availabilityConflict(available, maxPerOrder)

    if (existing) existing.quantity = nextQuantity
    else cart.items.push({ id: newId('item'), nftId: body.nftId, editionId: found.edition.id, quantity: body.quantity })
    touch(cart)
    return HttpResponse.json(toCart(cart), { status: 201 })
  }),

  route<{ itemId: string }>('patch', '/cart/items/:itemId', async ({ request, params }) => {
    const body = await readJson<UpdateCartItemRequest>(request)
    if (!isQuantity(body.quantity)) return validationError({ quantity: 'A quantidade deve ser um número inteiro maior que zero.' })
    const cart = getOrCreateCart(ownerOf(request))
    const item = cart.items.find((i) => i.id === params.itemId)
    if (!item) return notFound('Item não encontrado no carrinho.')
    const found = editionOf(item)
    if (!found) return notFound('Edição não encontrada.')
    const { available, maxPerOrder } = found.edition
    if (body.quantity > Math.min(available, maxPerOrder)) return availabilityConflict(available, maxPerOrder)

    item.quantity = body.quantity
    touch(cart)
    return HttpResponse.json(toCart(cart))
  }),

  route<{ itemId: string }>('delete', '/cart/items/:itemId', ({ request, params }) => {
    const cart = getOrCreateCart(ownerOf(request))
    if (!cart.items.some((i) => i.id === params.itemId)) return notFound('Item não encontrado no carrinho.')
    cart.items = cart.items.filter((i) => i.id !== params.itemId)
    touch(cart)
    return HttpResponse.json(toCart(cart))
  }),

  route('put', '/cart/coupon', async ({ request }) => {
    const body = await readJson<ApplyCouponRequest>(request)
    const code = text(body.code)
    if (!code) return validationError({ code: 'Informe o código do cupom.' })
    const check = checkCoupon(code)
    if (!check.ok) return validationError({ code: check.field })
    const cart = getOrCreateCart(ownerOf(request))
    cart.couponCode = check.code
    touch(cart)
    return HttpResponse.json(toCart(cart))
  }),

  route('delete', '/cart/coupon', ({ request }) => {
    const cart = getOrCreateCart(ownerOf(request))
    cart.couponCode = null
    touch(cart)
    return HttpResponse.json(toCart(cart))
  }),

  route('post', '/cart/merge', async ({ request }) => {
    const auth = requireAuth(request)
    if ('response' in auth) return auth.response
    const body = await readJson<MergeCartRequest>(request)
    const guestCartId = text(body.guestCartId)
    if (!guestCartId) return validationError({ guestCartId: 'Informe o carrinho do visitante.' })
    return HttpResponse.json(toCart(mergeGuestCart(auth.user.id, guestCartId)))
  }),

  route('get', '/cart/quote', ({ request }) => {
    const network = new URL(request.url).searchParams.get('network') ?? 'ethereum'
    if (!(network in NFT_NETWORKS)) return validationError({ network: 'Rede inválida.' })
    const cart = getOrCreateCart(ownerOf(request))
    // Um cupom que expirou depois de aplicado é removido da cotação.
    if (cart.couponCode && !checkCoupon(cart.couponCode).ok) {
      cart.couponCode = null
      touch(cart)
    }
    return HttpResponse.json(computeQuote(cart, network as NftNetwork))
  }),
]
