import axios, { AxiosError } from 'axios'
import { env } from '@/lib/env'
import type { ApiErrorBody, ApiErrorCode } from '@/types/api'

/** Tipos de falha normalizados para a UI, inclusive os que não têm resposta HTTP. */
export type HttpErrorKind = ApiErrorCode | 'NETWORK_ERROR' | 'TIMEOUT' | 'CANCELED'

/** Erro normalizado de qualquer chamada REST. */
export class HttpError extends Error {
  readonly kind: HttpErrorKind
  readonly status: number | null
  readonly fields: Record<string, string>

  constructor(kind: HttpErrorKind, message: string, status: number | null, fields: Record<string, string> = {}) {
    super(message)
    this.name = 'HttpError'
    this.kind = kind
    this.status = status
    this.fields = fields
  }

  /** Falhas transitórias que podem ser repetidas com segurança. */
  get isTransient() {
    return this.kind === 'NETWORK_ERROR' || this.kind === 'TIMEOUT' || this.kind === 'UNAVAILABLE' || this.kind === 'INTERNAL_ERROR'
  }
}

export const http = axios.create({
  baseURL: env.apiUrl,
  timeout: env.httpTimeout,
  withCredentials: true,
  headers: { Accept: 'application/json' },
})

function toHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) return error
  if (axios.isCancel(error)) return new HttpError('CANCELED', 'Requisição cancelada.', null)

  if (error instanceof AxiosError) {
    if (error.code === AxiosError.ECONNABORTED || error.code === AxiosError.ETIMEDOUT) {
      return new HttpError('TIMEOUT', 'O servidor demorou para responder. Tente novamente.', null)
    }
    if (!error.response) {
      return new HttpError('NETWORK_ERROR', 'Sem conexão com o servidor. Verifique sua internet.', null)
    }
    const body = error.response.data as Partial<ApiErrorBody> | undefined
    const status = error.response.status
    const kind: ApiErrorCode = body?.code ?? (status >= 500 ? 'INTERNAL_ERROR' : 'VALIDATION_ERROR')
    return new HttpError(kind, body?.message ?? 'Não foi possível concluir a operação.', status, body?.fields)
  }

  return new HttpError('INTERNAL_ERROR', 'Erro inesperado.', null)
}

http.interceptors.response.use(undefined, (error: unknown) => Promise.reject(toHttpError(error)))
