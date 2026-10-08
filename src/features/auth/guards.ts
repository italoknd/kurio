import { redirect, type ParsedLocation } from '@tanstack/react-router'
import { authApi } from '@/api/auth'
import { queryKeys } from '@/api/query-keys'
import { sessionQueryOptions } from '@/features/auth/session'
import { notifySessionExpired } from '@/features/auth/session-expiry'
import { credentials } from '@/lib/credentials'
import { HttpError } from '@/lib/http'
import type { RouterContext } from '@/routes/__root'

const AUTH_PAGES = /^\/(entrar|cadastro)(\/|\?|#|$)/

/**
 * Aceita apenas caminhos internos como destino de retorno (evita open redirect) e
 * nunca as próprias páginas de login/cadastro (evita redirecionamento em cadeia).
 */
export function safeRedirect(target: unknown, fallback = '/') {
  if (typeof target !== 'string' || !target.startsWith('/') || target.startsWith('//')) return fallback
  return AUTH_PAGES.test(target) ? fallback : target
}

export interface AuthSearch {
  redirect?: string
  motivo?: 'expirada'
}

/** Parâmetros de busca de /entrar e /cadastro. */
export function validateAuthSearch(search: Record<string, unknown>): AuthSearch {
  return {
    redirect: typeof search.redirect === 'string' ? safeRedirect(search.redirect) : undefined,
    motivo: search.motivo === 'expirada' ? 'expirada' : undefined,
  }
}

/** Parâmetro global `?auth=` que abre o modal de login/cadastro sobre qualquer página. */
export function validateRootSearch(search: Record<string, unknown>): { auth?: 'entrar' | 'cadastro' } {
  return { auth: search.auth === 'entrar' || search.auth === 'cadastro' ? search.auth : undefined }
}

/**
 * `beforeLoad` das rotas privadas. Revalida a sessão na API a cada navegação
 * protegida; sem sessão válida, redireciona ao login guardando o destino.
 *
 * A validação usa uma requisição própria (não `fetchQuery`): reaproveitar uma
 * consulta em andamento, iniciada antes da expiração, deixaria a navegação passar.
 */
export async function requireAuth({
  context,
  location,
  preload,
}: {
  context: RouterContext
  location: ParsedLocation
  preload: boolean
}) {
  const { queryClient } = context
  if (!credentials.getToken()) {
    throw redirect({ to: '/entrar', search: { redirect: location.href } })
  }

  try {
    const session = await authApi.session()
    queryClient.setQueryData(queryKeys.session, session)
    return { session }
  } catch (error) {
    if (error instanceof HttpError && error.kind === 'UNAUTHENTICATED') {
      // Tinha token e a API recusou: a sessão expirou durante a navegação. No preload
      // (hover/foco no link) só recusa; a navegação real avisa e guarda o destino clicado.
      if (!preload) notifySessionExpired()
      throw redirect({ to: '/entrar', search: { redirect: location.href, motivo: 'expirada' } })
    }
    // Falha transitória: segue com a sessão em cache, se houver; a próxima chamada revalida.
    const cached = queryClient.getQueryData(sessionQueryOptions.queryKey)
    if (cached) return { session: cached }
    throw error
  }
}
