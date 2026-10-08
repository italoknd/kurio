import { http, HttpResponse } from 'msw'
import { apiUrl, simulateNetwork } from '@/mocks/network'
import { socketHandler } from '@/mocks/socket'

export const handlers = [
  http.get(apiUrl('/health'), async ({ request }) => {
    const failure = await simulateNetwork(request)
    if (failure) return failure
    return HttpResponse.json({ status: 'ok' })
  }),
  socketHandler,
]
