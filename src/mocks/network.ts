import { delay, HttpResponse } from 'msw'
import { env } from '@/lib/env'
import { getMockConfig, nextRandom } from '@/mocks/config'
import type { ApiErrorBody, ApiErrorCode } from '@/types/api'

/** Monta a URL absoluta de uma rota REST, respeitando VITE_API_URL. */
export function apiUrl(path: string) {
  return new URL(`${env.apiUrl}${path}`, window.location.origin).href
}

export function errorResponse(status: number, code: ApiErrorCode, message: string, fields?: Record<string, string>) {
  return HttpResponse.json<ApiErrorBody>({ code, message, ...(fields && { fields }) }, { status })
}

interface ForcedFailure {
  method: string
  path: RegExp
  status: number
  code: ApiErrorCode
  remaining: number
}

const forcedFailures: ForcedFailure[] = []

/** Força as próximas `times` requisições que casarem com método e caminho a falharem. */
export function failNext(method: string, path: string | RegExp, status = 500, times = 1) {
  const code: ApiErrorCode = status >= 500 ? (status === 503 ? 'UNAVAILABLE' : 'INTERNAL_ERROR') : status === 401 ? 'UNAUTHENTICATED' : status === 403 ? 'FORBIDDEN' : status === 404 ? 'NOT_FOUND' : status === 409 ? 'CONFLICT' : 'VALIDATION_ERROR'
  forcedFailures.push({ method: method.toUpperCase(), path: typeof path === 'string' ? new RegExp(`^${path}$`) : path, status, code, remaining: times })
}

export function clearForcedFailures() {
  forcedFailures.length = 0
}

/**
 * Aplica as condições de rede configuradas a uma requisição. Retorna uma
 * resposta de falha quando a requisição deve falhar, ou `undefined` para seguir
 * para o handler. Deve ser chamada no início de todo handler REST.
 */
export async function simulateNetwork(request: Request): Promise<Response | undefined> {
  const { network } = getMockConfig()

  const pathname = new URL(request.url).pathname
  const forced = forcedFailures.find((f) => f.method === request.method && f.path.test(pathname))
  if (forced) {
    forced.remaining -= 1
    if (forced.remaining <= 0) forcedFailures.splice(forcedFailures.indexOf(forced), 1)
    await delay(150)
    return errorResponse(forced.status, forced.code, 'Falha simulada pelo cenário de testes.')
  }

  switch (network) {
    case 'offline':
      return HttpResponse.error()
    case 'timeout':
      await delay(env.httpTimeout + 2000)
      return errorResponse(504, 'UNAVAILABLE', 'Tempo esgotado.')
    case 'lento':
      await delay(2500)
      return undefined
    case 'variavel':
      await delay(50 + Math.round(nextRandom() * 2950))
      return undefined
    case 'instavel':
      await delay(150)
      return nextRandom() < 0.3 ? errorResponse(503, 'UNAVAILABLE', 'Serviço temporariamente indisponível.') : undefined
    default:
      await delay(150)
      return undefined
  }
}
