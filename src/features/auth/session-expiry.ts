import { HttpError } from '@/lib/http'

/**
 * Canal entre quem detecta a expiração da sessão (erros 401 no cache do TanStack
 * Query, guarda de rota, timer de `expiresAt`) e o componente que reage a ela
 * (limpa a sessão, avisa e leva ao login preservando o destino).
 */

type Handler = () => void

let handler: Handler | null = null

export function onSessionExpired(next: Handler) {
  handler = next
  return () => {
    if (handler === next) handler = null
  }
}

export function notifySessionExpired() {
  handler?.()
}

/** Chamado pelo QueryCache/MutationCache em todo erro de query/mutation. */
export function reportRequestError(error: unknown) {
  if (error instanceof HttpError && error.isSessionExpired) notifySessionExpired()
}
