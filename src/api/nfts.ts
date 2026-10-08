import { http } from '@/lib/http'
import type { FeaturedNfts, NftDetail, NftListParams, NftListResponse } from '@/types/nft'

export const nftsApi = {
  /** GET /nfts — os parâmetros viram query string (arrays repetidos: category=a&category=b). */
  list: (params: NftListParams, signal?: AbortSignal) =>
    http
      .get<NftListResponse>('/nfts', {
        signal,
        params: {
          q: params.q,
          category: params.categories,
          network: params.networks,
          minPrice: params.minPrice,
          maxPrice: params.maxPrice,
          collection: params.collection,
          tab: params.tab,
          sort: params.sort,
          page: params.page,
          pageSize: params.pageSize,
        },
      })
      .then((r) => r.data),
  featured: (signal?: AbortSignal) => http.get<FeaturedNfts>('/nfts/destaques', { signal }).then((r) => r.data),
  detail: (nftId: string, signal?: AbortSignal) =>
    http.get<NftDetail>(`/nfts/${encodeURIComponent(nftId)}`, { signal }).then((r) => r.data),
}
