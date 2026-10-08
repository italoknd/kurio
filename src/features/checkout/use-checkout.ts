import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ordersApi } from '@/api/orders'
import { queryKeys } from '@/api/query-keys'
import { walletsApi } from '@/api/wallets'
import { useSession } from '@/features/auth/session'
import { attemptFor, checkoutStorage, type CheckoutAttempt } from '@/features/checkout/checkout-storage'
import { HttpError } from '@/lib/http'
import type { Quote } from '@/types/cart'
import type { NftNetwork } from '@/types/nft'
import type { CreateOrderRequest, Order } from '@/types/order'

/** Usuário autenticado (as rotas do checkout são privadas). */
function useUserId() {
  const { user } = useSession()
  return user?.id ?? null
}

export function useWallets() {
  const userId = useUserId()
  return useQuery({
    queryKey: queryKeys.user.wallets(userId ?? 'anonimo'),
    queryFn: ({ signal }) => walletsApi.list(signal),
    enabled: userId !== null,
  })
}

export function usePendingOrders() {
  const userId = useUserId()
  return useQuery({
    queryKey: queryKeys.user.orders(userId ?? 'anonimo', 'pending'),
    queryFn: ({ signal }) => ordersApi.list('pending', signal),
    enabled: userId !== null,
  })
}

export interface WalletConnectionState {
  walletId: string
  network: NftNetwork
}

/**
 * Conexão simulada com a extensão da carteira. Vale para a combinação carteira +
 * rede: trocar qualquer uma das duas exige conectar de novo.
 */
export function useWalletConnection() {
  const [connection, setConnection] = useState<WalletConnectionState | null>(null)
  const mutation = useMutation({
    mutationFn: ({ walletId, network }: WalletConnectionState) => walletsApi.connect(walletId, network),
    onSuccess: (result) => setConnection({ walletId: result.walletId, network: result.network }),
  })
  return {
    connection,
    isConnected: (walletId: string, network: NftNetwork) =>
      connection?.walletId === walletId && connection.network === network,
    connect: mutation.mutateAsync,
    isConnecting: mutation.isPending,
    error: mutation.error,
    disconnect: () => {
      setConnection(null)
      mutation.reset()
    },
  }
}

/** A tentativa pode ter criado o pedido sem que a resposta chegasse: não pode ser descartada. */
export function isUnresolved(error: unknown) {
  return error instanceof HttpError && error.isTransient
}

/** Cotação atualizada devolvida pela API em um 409 (preço, disponibilidade, cupom ou taxa mudaram). */
export function quoteFromConflict(error: unknown): Quote | null {
  if (!(error instanceof HttpError) || error.kind !== 'CONFLICT') return null
  const details = error.details as { quote?: Quote } | undefined
  return details?.quote ?? null
}

/**
 * Cria o pedido com chave de idempotência por tentativa. A tentativa é gravada antes
 * do envio; se a resposta não chegar (timeout, queda), ela continua guardada e só
 * pode ser reenviada como está — a API devolve o mesmo pedido em vez de criar outro.
 */
export function useCreateOrder() {
  const queryClient = useQueryClient()
  const userId = useUserId()

  return useMutation({
    mutationKey: ['orders', 'create'],
    // Envios em série: um segundo clique só sai depois da resposta do primeiro.
    scope: { id: 'create-order' },
    mutationFn: (attempt: CheckoutAttempt) => ordersApi.create(attempt.body, attempt.key),
    onSuccess: (order) => {
      checkoutStorage.setAttempt(userId!, null)
      checkoutStorage.setDraft(userId!, null)
      queryClient.setQueryData<Order>(queryKeys.user.order(userId!, order.id), order)
      void queryClient.invalidateQueries({ queryKey: ['user', userId!, 'orders'] })
    },
    onError: (error) => {
      // A API respondeu sem criar o pedido (validação, conflito): a tentativa está resolvida.
      if (!isUnresolved(error)) checkoutStorage.setAttempt(userId!, null)
      const quote = quoteFromConflict(error)
      if (quote) queryClient.setQueryData(queryKeys.quote(userId, quote.network), quote)
      if (error instanceof HttpError && error.reason === 'INSUFFICIENT_AVAILABILITY') {
        void queryClient.invalidateQueries({ queryKey: queryKeys.cart(userId) })
      }
    },
  })
}

/**
 * Monta a tentativa para o corpo atual (mesma chave se nada mudou) e a grava antes
 * do envio, de forma síncrona: cliques seguidos no mesmo instante reutilizam a chave.
 */
export function buildAttempt(userId: string, body: CreateOrderRequest) {
  const attempt = attemptFor(userId, body)
  checkoutStorage.setAttempt(userId, attempt)
  return attempt
}

export function useOrder(orderId: string) {
  const userId = useUserId()
  return useQuery({
    queryKey: queryKeys.user.order(userId ?? 'anonimo', orderId),
    queryFn: ({ signal }) => ordersApi.get(orderId, signal),
    enabled: userId !== null,
    // Reserva para quando o tempo real estiver fora: pedidos pendentes são consultados periodicamente.
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 5_000 : false),
  })
}
