import { HttpResponse } from 'msw'
import { authHandlers } from '@/mocks/handlers/auth'
import { cartHandlers } from '@/mocks/handlers/cart'
import { favoriteHandlers } from '@/mocks/handlers/favorites'
import { nftHandlers } from '@/mocks/handlers/nfts'
import { orderHandlers } from '@/mocks/handlers/orders'
import { profileHandlers } from '@/mocks/handlers/profile'
import { route } from '@/mocks/handlers/utils'
import { walletHandlers } from '@/mocks/handlers/wallets'
import { socketHandler } from '@/mocks/socket'

export const handlers = [
  route('get', '/health', () => HttpResponse.json({ status: 'ok' })),
  ...authHandlers,
  ...nftHandlers,
  ...favoriteHandlers,
  ...cartHandlers,
  ...orderHandlers,
  ...profileHandlers,
  ...walletHandlers,
  socketHandler,
]
