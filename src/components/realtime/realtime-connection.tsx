import { useEffect } from 'react'
import { useSession } from '@/features/auth/session'
import { socket } from '@/lib/socket'

/**
 * Mantém a conexão Socket.IO aberta e autenticada com o token da sessão atual.
 * Ao trocar de sessão (login, logout, expiração, troca de usuário), a conexão é
 * refeita com o novo token, então eventos privados da sessão anterior param de chegar.
 */
export function RealtimeConnection() {
  const { session, isPending } = useSession()
  const token = session?.token ?? null

  useEffect(() => {
    if (isPending) return
    socket.auth = { token }
    socket.connect()
    return () => {
      socket.disconnect()
    }
  }, [token, isPending])

  return null
}
