import { http, IDEMPOTENCY_HEADER } from '@/lib/http'
import type { CreateOrderRequest, Order, OrderStatus } from '@/types/order'

export const ordersApi = {
  /**
   * Cria o pedido. A mesma `idempotencyKey` deve ser reutilizada em toda nova
   * tentativa da mesma compra (cliques repetidos, timeout, reconexão).
   */
  create: (body: CreateOrderRequest, idempotencyKey: string) =>
    http.post<Order>('/orders', body, { headers: { [IDEMPOTENCY_HEADER]: idempotencyKey } }).then((r) => r.data),
  get: (orderId: string, signal?: AbortSignal) =>
    http.get<Order>(`/orders/${encodeURIComponent(orderId)}`, { signal }).then((r) => r.data),
  list: (status?: OrderStatus, signal?: AbortSignal) =>
    http.get<Order[]>('/orders', { params: { status }, signal }).then((r) => r.data),
}
