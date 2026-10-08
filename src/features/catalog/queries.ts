import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { nftsApi } from '@/api/nfts'
import { queryKeys } from '@/api/query-keys'
import type { NftListParams } from '@/types/nft'

/**
 * Consultas do catálogo. Cada combinação de parâmetros tem sua própria chave: uma
 * resposta atrasada de uma busca anterior nunca substitui a da busca atual, e a
 * requisição obsoleta é cancelada pelo `signal` (Axios aborta a chamada).
 */
export const nftListQuery = (params: NftListParams) =>
  queryOptions({
    queryKey: queryKeys.nfts.list(params),
    queryFn: ({ signal }) => nftsApi.list(params, signal),
    // Mantém a página anterior visível enquanto a nova carrega (atualização em segundo plano).
    placeholderData: keepPreviousData,
  })

export const featuredNftsQuery = queryOptions({
  queryKey: queryKeys.nfts.featured,
  queryFn: ({ signal }) => nftsApi.featured(signal),
  staleTime: 5 * 60_000,
})

export const nftDetailQuery = (nftId: string) =>
  queryOptions({
    queryKey: queryKeys.nfts.detail(nftId),
    queryFn: ({ signal }) => nftsApi.detail(nftId, signal),
  })
