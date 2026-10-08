import axios, { AxiosError } from 'axios'
import { credentials } from '@/lib/credentials'
import { env } from '@/lib/env'
import type { ApiErrorBody, ApiErrorCode, ConflictReason } from '@/types/api'

/** Tipos de falha normalizados para a UI, inclusive os que não têm resposta HTTP. */
export type HttpErrorKind = ApiErrorCode | 'NETWORK_ERROR' | 'TIMEOUT' | 'CANCELED'

/** Erro normalizado de qualquer chamada REST. */
export class HttpError extends Error {
  readonly kind: HttpErrorKind
  readonly status: number | null
  readonly fields: Record<string, string>
  readonly reason: ConflictReason | null
  readonly details: unknown
  /** A requisição foi feita com um token de sessão (401 indica sessão expirada/inválida). */
  readonly authenticated: boolean

  constructor(
    kind: HttpErrorKind,
    message: string,
    status: number | null,
    extra: { fields?: Record<string, string>; reason?: ConflictReason; details?: unknown; authenticated?: boolean } = {},
  ) {
    super(message)
    this.name = 'HttpError'
    this.kind = kind
    this.status = status
    this.fields = extra.fields ?? {}
    this.reason = extra.reason ?? null
    this.details = extra.details
    this.authenticated = extra.authenticated ?? false
  }

  /** Falhas transitórias que podem ser repetidas com segurança. */
  get isTransient() {
    return this.kind === 'NETWORK_ERROR' || this.kind === 'TIMEOUT' || this.kind === 'UNAVAILABLE' || this.kind === 'INTERNAL_ERROR'
  }

  /** Sessão expirada ou inválida em uma chamada autenticada. */
  get isSessionExpired() {
    return this.kind === 'UNAUTHENTICATED' && this.authenticated
  }
}

export const CART_ID_HEADER = 'X-Cart-Id'
export const IDEMPOTENCY_HEADER = 'Idempotency-Key'

export const http = axios.create({
  baseURL: env.apiUrl,
  timeout: env.httpTimeout,
  headers: { Accept: 'application/json' },
  // Arrays como parâmetros repetidos: ?category=a&category=b
  paramsSerializer: { indexes: null },
})

http.interceptors.request.use((config) => {
  const token = credentials.getToken()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  const guestCartId = credentials.getGuestCartId()
  if (guestCartId && !token) config.headers.set(CART_ID_HEADER, guestCartId)
  return config
})

function toHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) return error
  if (axios.isCancel(error)) return new HttpError('CANCELED', 'Requisição cancelada.', null)

  if (error instanceof AxiosError) {
    const authenticated = Boolean(error.config?.headers?.Authorization)
    if (error.code === AxiosError.ECONNABORTED || error.code === AxiosError.ETIMEDOUT) {
      return new HttpError('TIMEOUT', 'O servidor demorou para responder. Tente novamente.', null, { authenticated })
    }
    if (!error.response) {
      return new HttpError('NETWORK_ERROR', 'Sem conexão com o servidor. Verifique sua internet.', null, { authenticated })
    }
    const body = error.response.data as Partial<ApiErrorBody> | undefined
    const status = error.response.status
    const kind: ApiErrorCode = body?.code ?? (status >= 500 ? 'INTERNAL_ERROR' : 'VALIDATION_ERROR')
    return new HttpError(kind, body?.message ?? 'Não foi possível concluir a operação.', status, {
      fields: body?.fields,
      reason: body?.reason,
      details: body?.details,
      authenticated,
    })
  }

  return new HttpError('INTERNAL_ERROR', 'Erro inesperado.', null)
}

http.interceptors.response.use(undefined, (error: unknown) => Promise.reject(toHttpError(error)))
