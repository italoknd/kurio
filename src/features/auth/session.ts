import { queryOptions, useQuery, type QueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { queryKeys } from '@/api/query-keys'
import { credentials } from '@/lib/credentials'
import { HttpError } from '@/lib/http'
import type { Session } from '@/types/auth'

/**
 * Sessão atual. Sem token salvo, não há chamada à API. Com token, valida na API;
 * 401 significa sessão expirada/inválida: o token é descartado e a sessão vira `null`.
 */
export const sessionQueryOptions = queryOptions({
  queryKey: queryKeys.session,
  queryFn: async ({ signal }): Promise<Session | null> => {
    if (!credentials.getToken()) return null
    try {
      return await authApi.session(signal)
    } catch (error) {
      if (error instanceof HttpError && error.kind === 'UNAUTHENTICATED') {
        credentials.setToken(null)
        return null
      }
      throw error
    }
  },
  staleTime: 5 * 60_000,
})

export function useSession() {
  const query = useQuery(sessionQueryOptions)
  const session = query.data ?? null
  return {
    session,
    user: session?.user ?? null,
    isAuthenticated: session !== null,
    isPending: query.isPending,
  }
}

/** Remove do cache tudo que é privado (dados do usuário e carrinhos). */
export function clearPrivateData(queryClient: QueryClient) {
  queryClient.removeQueries({ queryKey: ['user'] })
  queryClient.removeQueries({ queryKey: ['cart'] })
}

/** Inicia a sessão no cliente após login ou cadastro. */
export function startSession(queryClient: QueryClient, session: Session) {
  // Troca de usuário: nada da sessão anterior pode permanecer em cache.
  clearPrivateData(queryClient)
  credentials.setToken(session.token)
  queryClient.setQueryData(queryKeys.session, session)
}

/** Encerra a sessão no cliente (logout ou expiração). */
export function endSession(queryClient: QueryClient) {
  credentials.setToken(null)
  clearPrivateData(queryClient)
  queryClient.setQueryData(queryKeys.session, null)
}
