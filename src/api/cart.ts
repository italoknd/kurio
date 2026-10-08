import { http } from '@/lib/http'
import type { AddCartItemRequest, Cart, Quote, UpdateCartItemRequest } from '@/types/cart'
import type { NftNetwork } from '@/types/nft'

export const cartApi = {
  get: (signal?: AbortSignal) => http.get<Cart>('/cart', { signal }).then((r) => r.data),
  addItem: (body: AddCartItemRequest) => http.post<Cart>('/cart/items', body).then((r) => r.data),
  updateItem: (itemId: string, body: UpdateCartItemRequest) =>
    http.patch<Cart>(`/cart/items/${encodeURIComponent(itemId)}`, body).then((r) => r.data),
  removeItem: (itemId: string) => http.delete<Cart>(`/cart/items/${encodeURIComponent(itemId)}`).then((r) => r.data),
  applyCoupon: (code: string) => http.put<Cart>('/cart/coupon', { code }).then((r) => r.data),
  removeCoupon: () => http.delete<Cart>('/cart/coupon').then((r) => r.data),
  /** Junta o carrinho do visitante ao do usuário recém-autenticado. */
  merge: (guestCartId: string) => http.post<Cart>('/cart/merge', { guestCartId }).then((r) => r.data),
  quote: (network: NftNetwork, signal?: AbortSignal) =>
    http.get<Quote>('/cart/quote', { params: { network }, signal }).then((r) => r.data),
}
