import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { accountApi } from '@/api/account'
import { ordersApi } from '@/api/orders'
import { queryKeys } from '@/api/query-keys'
import { useSession } from '@/features/auth/session'
import type { CreateTicketRequest, SupportTicket } from '@/types/account'
import type { OrderStatus } from '@/types/order'

/** Usuário autenticado (as rotas da área do colecionador são privadas). */
function useUserId() {
  const { user } = useSession()
  return user?.id ?? null
}

/** Pedidos do usuário (atividade), opcionalmente filtrados por status. */
export function useOrders(status?: OrderStatus) {
  const userId = useUserId()
  return useQuery({
    queryKey: queryKeys.user.orders(userId ?? 'anonimo', status),
    queryFn: ({ signal }) => ordersApi.list(status, signal),
    enabled: userId !== null,
  })
}

export function useOffers() {
  const userId = useUserId()
  return useQuery({
    queryKey: queryKeys.user.offers(userId ?? 'anonimo'),
    queryFn: ({ signal }) => accountApi.offers(signal),
    enabled: userId !== null,
  })
}

export function useDownloads() {
  const userId = useUserId()
  return useQuery({
    queryKey: queryKeys.user.downloads(userId ?? 'anonimo'),
    queryFn: ({ signal }) => accountApi.downloads(signal),
    enabled: userId !== null,
  })
}

export function useTickets() {
  const userId = useUserId()
  return useQuery({
    queryKey: queryKeys.user.tickets(userId ?? 'anonimo'),
    queryFn: ({ signal }) => accountApi.tickets(signal),
    enabled: userId !== null,
  })
}

export function useCreateTicket() {
  const queryClient = useQueryClient()
  const userId = useUserId()
  return useMutation({
    mutationFn: (body: CreateTicketRequest) => accountApi.createTicket(body),
    onSuccess: (ticket) => {
      queryClient.setQueryData<SupportTicket[]>(queryKeys.user.tickets(userId ?? 'anonimo'), (list = []) => [ticket, ...list])
    },
  })
}
