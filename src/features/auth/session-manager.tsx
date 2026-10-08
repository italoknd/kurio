import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { endSession, useSession } from '@/features/auth/session'
import { onSessionExpired, notifySessionExpired } from '@/features/auth/session-expiry'

/**
 * Reage ao ciclo de vida da sessão:
 * - expiração (401 em qualquer chamada autenticada, guarda de rota ou `expiresAt`
 *   atingido): limpa dados privados e avisa;
 * - sem sessão em rota privada (expiração ou logout): leva ao login com o destino
 *   atual em `redirect`, para retomar o fluxo depois.
 */
export function SessionManager() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { session, isAuthenticated, isPending } = useSession()
  const expiredRef = useRef(false)

  // Só o estado já resolvido: durante uma transição os matches ainda são da rota anterior,
  // o que causaria redirecionamentos em cadeia.
  const resolvedHref = useRouterState({ select: (state) => state.resolvedLocation?.href })
  const requiresAuth = useRouterState({
    select: (state) => state.status === 'idle' && state.matches.some((match) => match.staticData?.requiresAuth),
  })

  useEffect(
    () =>
      onSessionExpired(() => {
        expiredRef.current = true
        endSession(queryClient)
        toast.error('Sua sessão expirou. Entre novamente para continuar.', { id: 'session-expired' })
      }),
    [queryClient],
  )

  // Expira no cliente quando `expiresAt` é atingido, sem esperar um 401.
  useEffect(() => {
    if (!session) return
    const remaining = new Date(session.expiresAt).getTime() - Date.now()
    // setTimeout aceita no máximo ~24,8 dias; sessões mais longas são revalidadas pela API.
    if (remaining > 2_147_000_000) return
    const timer = window.setTimeout(notifySessionExpired, Math.max(0, remaining))
    return () => window.clearTimeout(timer)
  }, [session])

  useEffect(() => {
    if (isPending || isAuthenticated || !requiresAuth || !resolvedHref) return
    const motivo = expiredRef.current ? ('expirada' as const) : undefined
    expiredRef.current = false
    void navigate({ to: '/entrar', search: { redirect: resolvedHref, motivo }, replace: true })
  }, [isPending, isAuthenticated, requiresAuth, resolvedHref, navigate])

  return null
}
