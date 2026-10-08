import type { NftListParams, NftNetwork } from '@/types/nft'
import type { OrderStatus } from '@/types/order'

/**
 * Chaves do TanStack Query. Dados privados ficam sob `['user', userId, ...]` para
 * isolar o cache por usuário e permitir limpar tudo de uma vez no logout ou na
 * troca de usuário. Dados públicos (catálogo) ficam fora desse prefixo.
 */
export const queryKeys = {
  session: ['session'] as const,

  nfts: {
    all: ['nfts'] as const,
    list: (params: NftListParams) => ['nfts', 'list', params] as const,
    featured: ['nfts', 'featured'] as const,
    detail: (nftId: string) => ['nfts', 'detail', nftId] as const,
  },

  /** Carrinho: do usuário ou do visitante (`userId = null`). */
  cart: (userId: string | null) => ['cart', userId] as const,
  quote: (userId: string | null, network: NftNetwork) => ['cart', userId, 'quote', network] as const,

  user: {
    all: (userId: string) => ['user', userId] as const,
    favorites: (userId: string) => ['user', userId, 'favorites'] as const,
    profile: (userId: string) => ['user', userId, 'profile'] as const,
    wallets: (userId: string) => ['user', userId, 'wallets'] as const,
    orders: (userId: string, status?: OrderStatus) => ['user', userId, 'orders', status ?? 'all'] as const,
    order: (userId: string, orderId: string) => ['user', userId, 'order', orderId] as const,
  },
}
