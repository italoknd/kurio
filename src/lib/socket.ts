import { io, type Socket } from 'socket.io-client'
import { env } from '@/lib/env'

/**
 * Cliente Socket.IO único da aplicação. Usa apenas o transporte WebSocket
 * (sem long-polling), o que permite a interceptação pelo MSW nos mocks.
 */
export const socket: Socket = io(env.socketUrl, {
  path: '/socket.io',
  transports: ['websocket'],
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
})
