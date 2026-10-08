import { HttpResponse } from 'msw'
import { featuredNfts, findNft, listNfts, parseListParams } from '@/mocks/domain/catalog'
import { notFound, route } from '@/mocks/handlers/utils'
import { toNftDetail } from '@/mocks/serializers'

export const nftHandlers = [
  route('get', '/nfts', ({ request }) => HttpResponse.json(listNfts(parseListParams(new URL(request.url))))),

  route('get', '/nfts/destaques', () => HttpResponse.json(featuredNfts())),

  route<{ nftId: string }>('get', '/nfts/:nftId', ({ params }) => {
    const nft = findNft(params.nftId)
    if (!nft) return notFound('NFT não encontrado.')
    return HttpResponse.json(toNftDetail(nft))
  }),
]
