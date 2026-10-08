import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { favoritesApi, type FavoritesResponse } from '@/api/favorites'
import { queryKeys } from '@/api/query-keys'
import { useSession } from '@/features/auth/session'
import { errorMessage } from '@/lib/forms'

function applyFavorite(current: FavoritesResponse | undefined, nftId: string, favorite: boolean): FavoritesResponse {
  const ids = new Set(current?.nftIds ?? [])
  if (favorite) ids.add(nftId)
  else ids.delete(nftId)
  return { nftIds: [...ids] }
}

/** IDs favoritados pelo usuário autenticado (vazio para visitantes). */
export function useFavorites() {
  const { user } = useSession()
  const query = useQuery({
    queryKey: queryKeys.user.favorites(user?.id ?? 'anonimo'),
    queryFn: ({ signal }) => favoritesApi.list(signal),
    enabled: user !== null,
  })
  return { ids: new Set(query.data?.nftIds ?? []), isPending: user !== null && query.isPending }
}

/**
 * Alterna o favorito com atualização otimista: o coração muda na hora e, se a API
 * falhar, o estado anterior é restaurado e o usuário é avisado. Visitantes são
 * levados ao login (modal) sem sair da página.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { user } = useSession()

  const mutation = useMutation({
    mutationFn: ({ nftId, favorite }: { nftId: string; favorite: boolean; name: string }) =>
      favorite ? favoritesApi.add(nftId) : favoritesApi.remove(nftId),
    onMutate: async ({ nftId, favorite }) => {
      const key = queryKeys.user.favorites(user!.id)
      await queryClient.cancelQueries({ queryKey: key })
      queryClient.setQueryData<FavoritesResponse>(key, (current) => applyFavorite(current, nftId, favorite))
      return { key }
    },
    onError: (error, { nftId, favorite, name }, context) => {
      // Reverte só esta operação. Restaurar um "snapshot" falharia se a lista ainda
      // estivesse carregando no clique (snapshot vazio; setQueryData(undefined) é ignorado).
      if (context) queryClient.setQueryData<FavoritesResponse>(context.key, (current) => applyFavorite(current, nftId, !favorite))
      toast.error(`Não foi possível atualizar "${name}" nos favoritos. ${errorMessage(error)}`)
    },
    onSuccess: (data, { favorite, name }, context) => {
      queryClient.setQueryData(context.key, data)
      toast.success(favorite ? `${name} adicionado aos favoritos.` : `${name} removido dos favoritos.`)
    },
    // Ressincroniza com a API em qualquer desfecho (inclui a consulta cancelada no onMutate).
    onSettled: (_data, _error, _vars, context) => {
      if (context) void queryClient.invalidateQueries({ queryKey: context.key })
    },
  })

  return {
    isPending: mutation.isPending,
    toggle(nftId: string, name: string, currentlyFavorite: boolean) {
      if (!user) {
        toast.info('Entre na sua conta para salvar favoritos.')
        void navigate({ to: '.', search: (prev) => ({ ...prev, auth: 'entrar' as const }), resetScroll: false })
        return
      }
      mutation.mutate({ nftId, favorite: !currentlyFavorite, name })
    },
  }
}
