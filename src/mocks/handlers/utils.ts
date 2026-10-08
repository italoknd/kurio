import { http, type DefaultBodyType, type HttpResponseResolver, type PathParams } from 'msw'
import { db } from '@/mocks/db/store'
import type { UserRecord } from '@/mocks/db/types'
import { apiUrl, errorResponse, simulateNetwork } from '@/mocks/network'
import type { ConflictReason } from '@/types/api'

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'

/**
 * Registra uma rota REST aplicando as condições de rede do cenário antes do handler.
 * Toda rota da API simulada deve ser criada por aqui.
 */
export function route<Params extends PathParams = PathParams>(
  method: Method,
  path: string,
  resolver: HttpResponseResolver<Params, DefaultBodyType>,
) {
  return http[method]<Params>(apiUrl(path), async (info) => {
    const failure = await simulateNetwork(info.request)
    if (failure) return failure
    return resolver(info)
  })
}

export async function readJson<T>(request: Request): Promise<Partial<T>> {
  try {
    const body = (await request.json()) as unknown
    return body && typeof body === 'object' ? (body as Partial<T>) : {}
  } catch {
    return {}
  }
}

export function bearerToken(request: Request) {
  const header = request.headers.get('Authorization') ?? ''
  return header.startsWith('Bearer ') ? header.slice(7) : null
}

export type AuthResult = { user: UserRecord; token: string } | { response: Response }

/**
 * Exige sessão válida. Sessão ausente, desconhecida ou expirada → 401.
 */
export function requireAuth(request: Request): AuthResult {
  const token = bearerToken(request)
  if (!token) return { response: errorResponse(401, 'UNAUTHENTICATED', 'Faça login para continuar.') }
  const session = db.state.sessions.find((s) => s.token === token)
  if (!session) return { response: errorResponse(401, 'UNAUTHENTICATED', 'Sessão inválida. Faça login novamente.') }
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    return { response: errorResponse(401, 'UNAUTHENTICATED', 'Sua sessão expirou. Faça login novamente.') }
  }
  const user = db.state.users.find((u) => u.id === session.userId)
  if (!user) return { response: errorResponse(401, 'UNAUTHENTICATED', 'Sessão inválida. Faça login novamente.') }
  return { user, token }
}

/** Usuário da sessão, se houver uma válida (rotas que aceitam visitantes). */
export function optionalUser(request: Request): UserRecord | null {
  if (!bearerToken(request)) return null
  const result = requireAuth(request)
  return 'user' in result ? result.user : null
}

export function validationError(fields: Record<string, string>) {
  return errorResponse(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', fields)
}

export function conflict(reason: ConflictReason, message: string, extra?: { fields?: Record<string, string>; details?: unknown }) {
  return errorResponse(409, 'CONFLICT', message, extra?.fields, reason, extra?.details)
}

export function notFound(message: string) {
  return errorResponse(404, 'NOT_FOUND', message)
}

/* Validações reutilizadas por cadastro, perfil e carteiras */

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const USERNAME_PATTERN = /^[a-z0-9._]{3,20}$/
export const ENS_PATTERN = /^[a-z0-9-]+(\.[a-z0-9-]+)*$/
export const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/

export function passwordProblem(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < 8) return 'A senha deve ter pelo menos 8 caracteres.'
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return 'A senha deve conter letras e números.'
  return null
}

export function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}
