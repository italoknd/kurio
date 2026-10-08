import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cartApi } from '@/api/cart'
import { queryKeys } from '@/api/query-keys'
import { useSession } from '@/features/auth/session'
import { credentials } from '@/lib/credentials'
import type { AddCartItemRequest, Cart } from '@/types/cart'

/**
 * Guarda o id do carrinho do visitante, devolvido pela API na primeira chamada,
 * para que o carrinho sobreviva a refresh e seja juntado à conta no login.
 */
function rememberGuestCart(cart: Cart, isAuthenticated: boolean) {
  if (!isAuthenticated && credentials.getGuestCartId() !== cart.id) credentials.setGuestCartId(cart.id)
}

/** Carrinho atual (do usuário ou do visitante). */
export function useCart() {
  const { user, isPending } = useSession()
  const userId = user?.id ?? null
  return useQuery({
    queryKey: queryKeys.cart(userId),
    queryFn: async ({ signal }) => {
      const cart = await cartApi.get(signal)
      rememberGuestCart(cart, userId !== null)
      return cart
    },
    enabled: !isPending,
  })
}

export function useAddToCart() {
  const queryClient = useQueryClient()
  const { user } = useSession()
  const userId = user?.id ?? null

  return useMutation({
    mutationFn: (body: AddCartItemRequest) => cartApi.addItem(body),
    onSuccess: (cart) => {
      rememberGuestCart(cart, userId !== null)
      queryClient.setQueryData(queryKeys.cart(userId), cart)
      // Cotações calculadas antes da inclusão deixam de valer.
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.cart(userId), 'quote'] })
    },
  })
}
