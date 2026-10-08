import { addEth, mulEth, percentOfEth, subEth } from '@/lib/eth'
import { NETWORK_FEES } from '@/mocks/db/fixtures'
import { commit, db, newId, nowIso, stableHash } from '@/mocks/db/store'
import type { CartItemRecord, CartRecord } from '@/mocks/db/types'
import { findNft } from '@/mocks/domain/catalog'
import type { Cart, CartItem, Quote, QuoteIssue } from '@/types/cart'
import type { NftNetwork } from '@/types/nft'

/** Dono do carrinho: usuário autenticado ou visitante (id do carrinho anônimo). */
export type CartOwner = { userId: string } | { guestCartId: string | null }

export function findCart(owner: CartOwner): CartRecord | undefined {
  if ('userId' in owner) return db.state.carts.find((cart) => cart.userId === owner.userId)
  return owner.guestCartId ? db.state.carts.find((cart) => cart.id === owner.guestCartId && cart.userId === null) : undefined
}

export function getOrCreateCart(owner: CartOwner): CartRecord {
  const existing = findCart(owner)
  if (existing) return existing
  const cart: CartRecord = {
    id: newId('cart'),
    userId: 'userId' in owner ? owner.userId : null,
    items: [],
    couponCode: null,
    version: 1,
    updatedAt: nowIso(),
  }
  db.state.carts.push(cart)
  commit()
  return cart
}

export function touch(cart: CartRecord) {
  cart.version += 1
  cart.updatedAt = nowIso()
  commit()
}

/** Edição atual do item; `undefined` se o NFT ou a edição não existirem mais. */
export function editionOf(item: Pick<CartItemRecord, 'nftId' | 'editionId'>) {
  const nft = findNft(item.nftId)
  const edition = nft?.editions.find((e) => e.id === item.editionId)
  return nft && edition ? { nft, edition } : undefined
}

export function toCartItem(item: CartItemRecord): CartItem | undefined {
  const found = editionOf(item)
  if (!found) return undefined
  const { nft, edition } = found
  return {
    id: item.id,
    nftId: item.nftId,
    editionId: item.editionId,
    quantity: item.quantity,
    nft: { name: nft.name, tokenId: nft.tokenId, image: nft.image, imageAlt: nft.imageAlt, network: nft.network },
    editionLabel: edition.label,
    unitPrice: edition.price,
    lineTotal: mulEth(edition.price, item.quantity),
    available: edition.available,
    maxQuantity: Math.min(edition.available, edition.maxPerOrder),
  }
}

export function toCart(cart: CartRecord): Cart {
  const items = cart.items.map(toCartItem).filter((item): item is CartItem => item !== undefined)
  return {
    id: cart.id,
    items,
    couponCode: cart.couponCode,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    version: cart.version,
    updatedAt: cart.updatedAt,
  }
}

/** Resultado da validação de um cupom. */
export type CouponCheck =
  | { ok: true; code: string; description: string; percent: number }
  | { ok: false; field: string }

export function checkCoupon(rawCode: string): CouponCheck {
  const code = rawCode.trim().toUpperCase()
  const coupon = db.state.coupons.find((c) => c.code === code)
  if (!coupon) return { ok: false, field: 'Cupom inválido. Confira o código e tente novamente.' }
  if (new Date(coupon.expiresAt).getTime() <= Date.now()) return { ok: false, field: 'Este cupom expirou.' }
  return { ok: true, code: coupon.code, description: coupon.description, percent: coupon.percent }
}

/**
 * Cotação do carrinho: subtotal, desconto do cupom, taxa da rede e total, com os
 * problemas de disponibilidade. O id é derivado do conteúdo, então qualquer mudança
 * de preço, disponibilidade, quantidade, cupom ou rede gera uma cotação nova.
 */
export function computeQuote(cart: CartRecord, network: NftNetwork): Quote {
  const items = cart.items.map(toCartItem).filter((item): item is CartItem => item !== undefined)
  const issues = items.flatMap((item): QuoteIssue[] => {
    if (item.available === 0) return [{ itemId: item.id, type: 'unavailable', available: 0 }]
    if (item.quantity > item.available) return [{ itemId: item.id, type: 'insufficient', available: item.available }]
    return []
  })

  const subtotal = addEth('0', ...items.map((item) => item.lineTotal))
  const coupon = cart.couponCode ? checkCoupon(cart.couponCode) : undefined
  const discount = coupon?.ok ? percentOfEth(subtotal, coupon.percent) : '0.00'
  const networkFee = items.length > 0 ? NETWORK_FEES[network] : '0.00'
  const total = addEth(subEth(subtotal, discount), networkFee)

  const content = {
    network,
    items: items.map((item) => [item.id, item.editionId, item.quantity, item.unitPrice, item.available]),
    coupon: coupon?.ok ? coupon.code : null,
    discount,
    networkFee,
    total,
  }

  return {
    id: `qt_${stableHash(content)}`,
    network,
    items: items.map((item) => ({
      itemId: item.id,
      nftId: item.nftId,
      editionId: item.editionId,
      name: item.nft.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
    subtotal,
    discount,
    coupon: coupon?.ok ? { code: coupon.code, description: coupon.description } : null,
    networkFee,
    total,
    issues,
    createdAt: nowIso(),
  }
}

/** Junta o carrinho do visitante ao do usuário, respeitando os limites de cada edição. */
export function mergeGuestCart(userId: string, guestCartId: string) {
  const userCart = getOrCreateCart({ userId })
  const guestCart = findCart({ guestCartId })
  if (!guestCart) return userCart

  for (const guestItem of guestCart.items) {
    const found = editionOf(guestItem)
    if (!found) continue
    const limit = Math.min(found.edition.available, found.edition.maxPerOrder)
    const existing = userCart.items.find((i) => i.nftId === guestItem.nftId && i.editionId === guestItem.editionId)
    if (existing) existing.quantity = Math.max(existing.quantity, Math.min(existing.quantity + guestItem.quantity, limit))
    else if (limit > 0) userCart.items.push({ ...guestItem, id: newId('item'), quantity: Math.min(guestItem.quantity, limit) })
  }
  if (!userCart.couponCode && guestCart.couponCode) userCart.couponCode = guestCart.couponCode

  db.state.carts = db.state.carts.filter((cart) => cart.id !== guestCart.id)
  touch(userCart)
  return userCart
}

/** Remove do carrinho apenas as quantidades compradas (após pedido confirmado). */
export function removePurchased(userId: string, purchased: { nftId: string; editionId: string; quantity: number }[]) {
  const cart = findCart({ userId })
  if (!cart) return
  for (const bought of purchased) {
    const item = cart.items.find((i) => i.nftId === bought.nftId && i.editionId === bought.editionId)
    if (item) item.quantity -= bought.quantity
  }
  cart.items = cart.items.filter((item) => item.quantity > 0)
  cart.couponCode = null
  touch(cart)
}
