import { useSyncExternalStore } from 'react'

export interface CartNotice {
  id: string
  message: string
}

/**
 * Avisos de alterações recebidas em tempo real para itens do carrinho (preço ou
 * disponibilidade). Ficam visíveis no carrinho até o usuário dispensá-los.
 */
let notices: CartNotice[] = []
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

export const cartNotices = {
  push(notice: CartNotice) {
    // Um aviso por item: o mais recente substitui o anterior.
    notices = [...notices.filter((item) => item.id !== notice.id), notice]
    emit()
  },
  dismiss(id: string) {
    notices = notices.filter((item) => item.id !== id)
    emit()
  },
  clear() {
    if (notices.length === 0) return
    notices = []
    emit()
  },
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useCartNotices() {
  return useSyncExternalStore(subscribe, () => notices)
}
