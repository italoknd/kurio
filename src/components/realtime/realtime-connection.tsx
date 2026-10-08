import { useEffect } from 'react'
import { socket } from '@/lib/socket'

/**
 * Mantém a conexão Socket.IO aberta enquanto a aplicação estiver montada.
 * A autenticação da conexão e a troca de usuário entram na etapa de sessão.
 */
export function RealtimeConnection() {
  useEffect(() => {
    socket.connect()
    return () => {
      socket.disconnect()
    }
  }, [])

  return null
}
