import { HttpResponse } from 'msw'
import { commit, db } from '@/mocks/db/store'
import { findNft } from '@/mocks/domain/catalog'
import { notFound, requireAuth, route } from '@/mocks/handlers/utils'

function favoritesOf(userId: string) {
  db.state.favorites[userId] ??= []
  return db.state.favorites[userId]
}

export const favoriteHandlers = [
  route('get', '/favorites', ({ request }) => {
    const auth = requireAuth(request)
    if ('response' in auth) return auth.response
    return HttpResponse.json({ nftIds: favoritesOf(auth.user.id) })
  }),

  route<{ nftId: string }>('put', '/favorites/:nftId', ({ request, params }) => {
    const auth = requireAuth(request)
    if ('response' in auth) return auth.response
    if (!findNft(params.nftId)) return notFound('NFT não encontrado.')
    const list = favoritesOf(auth.user.id)
    if (!list.includes(params.nftId)) {
      list.push(params.nftId)
      commit()
    }
    return HttpResponse.json({ nftIds: list })
  }),

  route<{ nftId: string }>('delete', '/favorites/:nftId', ({ request, params }) => {
    const auth = requireAuth(request)
    if ('response' in auth) return auth.response
    db.state.favorites[auth.user.id] = favoritesOf(auth.user.id).filter((id) => id !== params.nftId)
    commit()
    return HttpResponse.json({ nftIds: db.state.favorites[auth.user.id] })
  }),
]
