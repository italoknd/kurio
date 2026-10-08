import type { CheckoutValues } from '@/features/checkout/schemas'
import type { CreateOrderRequest } from '@/types/order'

/**
 * Estado do checkout guardado na aba (sessionStorage), por usuário:
 * - rascunho do formulário, para retomar após expiração da sessão ou refresh;
 * - tentativa de envio sem resposta (timeout/queda), com a chave de idempotência e o
 *   corpo exatos, para reenviar a mesma tentativa sem duplicar o pedido.
 */

export interface CheckoutAttempt {
  key: string
  body: CreateOrderRequest
}

const draftKey = (userId: string) => `kurio:checkout-draft:${userId}`
const attemptKey = (userId: string) => `kurio:checkout-attempt:${userId}`

function read<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) sessionStorage.removeItem(key)
    else sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // armazenamento indisponível: o checkout segue sem retomada
  }
}

export const checkoutStorage = {
  getDraft: (userId: string) => read<CheckoutValues>(draftKey(userId)),
  setDraft: (userId: string, values: CheckoutValues | null) => write(draftKey(userId), values),
  getAttempt: (userId: string) => read<CheckoutAttempt>(attemptKey(userId)),
  setAttempt: (userId: string, attempt: CheckoutAttempt | null) => write(attemptKey(userId), attempt),
}

/**
 * Chave de idempotência da tentativa: reaproveitada enquanto o corpo for o mesmo
 * (cliques repetidos, reenvio), nova quando o conteúdo do pedido muda.
 */
export function attemptFor(userId: string, body: CreateOrderRequest): CheckoutAttempt {
  const current = checkoutStorage.getAttempt(userId)
  if (current && JSON.stringify(current.body) === JSON.stringify(body)) return current
  return { key: crypto.randomUUID(), body }
}
