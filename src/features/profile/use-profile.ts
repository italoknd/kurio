import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { profileApi } from '@/api/profile'
import { queryKeys } from '@/api/query-keys'
import { walletsApi } from '@/api/wallets'
import { useSession } from '@/features/auth/session'
import type { Session, User } from '@/types/auth'
import type { ChangePasswordRequest, UpdateProfileRequest } from '@/types/profile'
import type { Wallet, WalletInput } from '@/types/wallet'

function useUserId() {
  const { user } = useSession()
  return user?.id ?? 'anonimo'
}

/** Perfil salvo: atualiza a consulta do perfil e o usuário da sessão (header, menu). */
function storeUser(queryClient: QueryClient, user: User) {
  queryClient.setQueryData(queryKeys.user.profile(user.id), user)
  queryClient.setQueryData<Session | null>(queryKeys.session, (session) => session && { ...session, user })
}

export function useProfile() {
  const userId = useUserId()
  return useQuery({
    queryKey: queryKeys.user.profile(userId),
    queryFn: ({ signal }) => profileApi.get(signal),
    enabled: userId !== 'anonimo',
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateProfileRequest) => profileApi.update(body),
    onSuccess: (user) => storeUser(queryClient, user),
  })
}

export function useUpdateAvatar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dataUrl: string) => profileApi.updateAvatar(dataUrl),
    onSuccess: (user) => storeUser(queryClient, user),
  })
}

export function useRemoveAvatar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => profileApi.removeAvatar(),
    onSuccess: (user) => storeUser(queryClient, user),
  })
}

export function useChangePassword() {
  return useMutation({ mutationFn: (body: ChangePasswordRequest) => profileApi.changePassword(body) })
}

/** Cadastro (sem `walletId`) ou edição de carteira; a lista em cache é atualizada com a resposta. */
export function useSaveWallet() {
  const queryClient = useQueryClient()
  const userId = useUserId()
  return useMutation({
    mutationFn: ({ walletId, body }: { walletId?: string; body: WalletInput }) =>
      walletId ? walletsApi.update(walletId, body) : walletsApi.create(body),
    onSuccess: (wallet) => {
      queryClient.setQueryData<Wallet[]>(queryKeys.user.wallets(userId), (list = []) =>
        list.some((item) => item.id === wallet.id) ? list.map((item) => (item.id === wallet.id ? wallet : item)) : [...list, wallet],
      )
    },
  })
}
