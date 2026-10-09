import { useEffect, useState } from 'react'
import type { Socket } from 'socket.io-client'
import { env } from '@/lib/env'
import { networkReady } from '@/lib/network-ready'

/**
 * Cliente Socket.IO único da aplicação, carregado sob demanda. Usa apenas o
 * transporte WebSocket (sem long-polling), o que permite a interceptação pelo MSW.
 *
 * O `socket.io-client` (engine.io) captura `globalThis.WebSocket` quando o módulo é
 * avaliado; por isso ele só é importado depois de `networkReady` (mocks iniciados).
 */
let instance: Socket | null = null
let loading: Promise<Socket> | null = null

export function loadSocket(): Promise<Socket> {
  // Só depois dos mocks: o engine.io captura `globalThis.WebSocket` ao ser avaliado.
  loading ??= networkReady.then(() => import('socket.io-client')).then(({ io }) => {
    instance = io(env.socketUrl, {
      path: '/socket.io',
      transports: ['websocket'],
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })
    return instance
  })
  return loading
}

/** O socket, depois de carregado (`null` no primeiro render). */
export function useSocket(): Socket | null {
  const [socket, setSocket] = useState<Socket | null>(instance)
  useEffect(() => {
    if (socket) return
    let active = true
    void loadSocket().then((loaded) => active && setSocket(loaded))
    return () => {
      active = false
    }
  }, [socket])
  return socket
}

/** Abre a conexão autenticada com o token da sessão (ou anônima, sem token). */
export function connectSocket(socket: Socket, token: string | null) {
  socket.auth = { token }
  socket.connect()
}
