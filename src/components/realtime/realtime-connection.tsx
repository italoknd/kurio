import { useEffect } from 'react'
import { useSession } from '@/features/auth/session'
import { useRealtimeSync } from '@/features/realtime/use-realtime-sync'
import { connectSocket, useSocket } from '@/lib/socket'

/**
 * Mantém a conexão Socket.IO aberta e autenticada com o token da sessão atual.
 * Ao trocar de sessão (login, logout, expiração, troca de usuário), a conexão é
 * refeita com o novo token, então eventos privados da sessão anterior param de chegar.
 * Os eventos recebidos são aplicados ao cache por `useRealtimeSync`.
 */
export function RealtimeConnection() {
  const { session, isPending } = useSession()
  const token = session?.token ?? null
  const socket = useSocket()
  useRealtimeSync(socket, session?.user.id ?? null)

  useEffect(() => {
    if (!socket || isPending) return
    connectSocket(socket, token)
    return () => {
      socket.disconnect()
    }
  }, [socket, token, isPending])

  return null
}
