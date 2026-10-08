import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { authApi } from '@/api/auth'
import { cartApi } from '@/api/cart'
import { queryKeys } from '@/api/query-keys'
import { endSession, startSession } from '@/features/auth/session'
import { credentials } from '@/lib/credentials'
import type { LoginRequest, RegisterRequest, Session } from '@/types/auth'

/**
 * Leva o carrinho do visitante para a conta recém-autenticada. Falhas não
 * bloqueiam o login: o id do carrinho anônimo é mantido para nova tentativa.
 */
async function mergeGuestCart(session: Session, queryClient: ReturnType<typeof useQueryClient>) {
  const guestCartId = credentials.getGuestCartId()
  if (!guestCartId) return
  try {
    const cart = await cartApi.merge(guestCartId)
    credentials.setGuestCartId(null)
    queryClient.setQueryData(queryKeys.cart(session.user.id), cart)
  } catch {
    // mantém o carrinho do visitante; a próxima autenticação tenta de novo
  }
}

function useStartSession() {
  const queryClient = useQueryClient()
  return async (session: Session) => {
    startSession(queryClient, session)
    // Aqui (callback do hook) e não no mutate(): a página de login desmonta ao detectar a
    // sessão, e callbacks do mutate() não rodam após desmontar.
    toast.success(`Olá, ${session.user.displayName}!`)
    await mergeGuestCart(session, queryClient)
  }
}

export function useLogin() {
  const start = useStartSession()
  return useMutation({
    mutationFn: (body: LoginRequest) => authApi.login(body),
    onSuccess: start,
  })
}

export function useRegister() {
  const start = useStartSession()
  return useMutation({
    mutationFn: (body: RegisterRequest) => authApi.register(body),
    onSuccess: start,
  })
}

/** Logout: encerra no servidor (melhor esforço) e sempre limpa o cliente. */
export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => authApi.logout().catch(() => undefined),
    onSettled: () => endSession(queryClient),
  })
}

/** Ação "Sair" da interface: volta para o início e encerra a sessão. */
export function useSignOut() {
  const navigate = useNavigate()
  const logout = useLogout()
  return {
    isPending: logout.isPending,
    run: async () => {
      await navigate({ to: '/' })
      // mutateAsync: o callback do mutate() não roda se o componente desmontar na navegação.
      await logout.mutateAsync()
      toast.success('Você saiu da sua conta.')
    },
  }
}
