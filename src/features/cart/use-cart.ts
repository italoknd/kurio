import { keepPreviousData, useIsMutating, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { cartApi } from '@/api/cart'
import { queryKeys } from '@/api/query-keys'
import { useSession } from '@/features/auth/session'
import { credentials } from '@/lib/credentials'
import { mulEth } from '@/lib/eth'
import type { AddCartItemRequest, Cart } from '@/types/cart'
import type { NftNetwork } from '@/types/nft'

/**
 * Rede usada na cotação do carrinho. A escolha definitiva acontece no pagamento;
 * até lá o resumo mostra a taxa da Ethereum, como no Figma.
 */
export const CART_QUOTE_NETWORK: NftNetwork = 'ethereum'

/**
 * Guarda o id do carrinho do visitante, devolvido pela API na primeira chamada,
 * para que o carrinho sobreviva a refresh e seja juntado à conta no login.
 */
function rememberGuestCart(cart: Cart, isAuthenticated: boolean) {
  if (!isAuthenticated && credentials.getGuestCartId() !== cart.id) credentials.setGuestCartId(cart.id)
}

function useCartOwner() {
  const { user } = useSession()
  return user?.id ?? null
}

/** Grava o carrinho devolvido pela API e descarta cotações calculadas antes da mudança. */
function storeCart(queryClient: QueryClient, userId: string | null, cart: Cart) {
  rememberGuestCart(cart, userId !== null)
  queryClient.setQueryData(queryKeys.cart(userId), cart)
  void queryClient.invalidateQueries({ queryKey: [...queryKeys.cart(userId), 'quote'] })
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

/**
 * Cotação da API (subtotal, desconto, taxa, total e problemas de disponibilidade).
 * Ao ser invalidada, a cotação anterior continua visível enquanto a nova carrega.
 */
export function useCartQuote(enabled: boolean, network: NftNetwork = CART_QUOTE_NETWORK) {
  const { isPending } = useSession()
  const userId = useCartOwner()
  return useQuery({
    queryKey: queryKeys.quote(userId, network),
    queryFn: ({ signal }) => cartApi.quote(network, signal),
    enabled: enabled && !isPending,
    placeholderData: keepPreviousData,
  })
}

export function useAddToCart() {
  const queryClient = useQueryClient()
  const userId = useCartOwner()
  return useMutation({
    mutationKey: ['cart', 'add'],
    mutationFn: (body: AddCartItemRequest) => cartApi.addItem(body),
    onSuccess: (cart) => storeCart(queryClient, userId, cart),
  })
}

/** Há alteração do carrinho em andamento: o resumo exibido ainda não é o definitivo. */
export function useIsCartChanging() {
  return useIsMutating({ mutationKey: ['cart'] }) > 0
}

const itemMutationKey = (itemId: string) => ['cart', 'item', itemId] as const

/**
 * Altera a quantidade de um item. A mudança aparece na hora (otimista) e as
 * requisições do mesmo item rodam em série (`scope`), então cliques rápidos
 * chegam à API na ordem em que foram feitos. Só a última resposta é gravada no
 * cache, para que respostas intermediárias não façam o número "voltar".
 */
export function useUpdateCartItem(itemId: string) {
  const queryClient = useQueryClient()
  const userId = useCartOwner()
  const key = queryKeys.cart(userId)

  return useMutation({
    mutationKey: itemMutationKey(itemId),
    scope: { id: `cart-item-${itemId}` },
    mutationFn: (quantity: number) => cartApi.updateItem(itemId, { quantity }),
    onMutate: async (quantity) => {
      await queryClient.cancelQueries({ queryKey: key, exact: true })
      queryClient.setQueryData<Cart>(key, (cart) =>
        cart && {
          ...cart,
          items: cart.items.map((item) =>
            item.id === itemId ? { ...item, quantity, lineTotal: mulEth(item.unitPrice, quantity) } : item,
          ),
          itemCount: cart.items.reduce((sum, item) => sum + (item.id === itemId ? quantity : item.quantity), 0),
        },
      )
    },
    onSuccess: (cart) => {
      if (queryClient.isMutating({ mutationKey: itemMutationKey(itemId) }) <= 1) storeCart(queryClient, userId, cart)
    },
    // Falha (ex.: 409 de disponibilidade): volta ao estado real do servidor.
    onError: () => void queryClient.invalidateQueries({ queryKey: key }),
  })
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient()
  const userId = useCartOwner()
  return useMutation({
    mutationKey: ['cart', 'remove'],
    mutationFn: (itemId: string) => cartApi.removeItem(itemId),
    onSuccess: (cart) => storeCart(queryClient, userId, cart),
  })
}

export function useApplyCoupon() {
  const queryClient = useQueryClient()
  const userId = useCartOwner()
  return useMutation({
    mutationKey: ['cart', 'coupon'],
    mutationFn: (code: string) => cartApi.applyCoupon(code),
    onSuccess: (cart) => storeCart(queryClient, userId, cart),
  })
}

export function useRemoveCoupon() {
  const queryClient = useQueryClient()
  const userId = useCartOwner()
  return useMutation({
    mutationKey: ['cart', 'coupon'],
    mutationFn: () => cartApi.removeCoupon(),
    onSuccess: (cart) => storeCart(queryClient, userId, cart),
  })
}
