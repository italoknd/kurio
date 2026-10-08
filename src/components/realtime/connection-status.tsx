import { WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { socket } from '@/lib/socket'

type Status = 'idle' | 'connected' | 'reconnecting'

/**
 * Aviso acessível de perda da conexão em tempo real. Só aparece depois que a
 * conexão já foi estabelecida uma vez (evita alarme durante o carregamento).
 */
export function ConnectionStatus() {
  const [status, setStatus] = useState<Status>(socket.connected ? 'connected' : 'idle')

  useEffect(() => {
    const onConnect = () => setStatus('connected')
    const onDisconnect = () => setStatus((current) => (current === 'idle' ? 'idle' : 'reconnecting'))
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
    }
  }, [])

  return (
    <div role="status" aria-live="polite" className="contents">
      {status === 'reconnecting' && (
        <p className="fixed inset-x-4 bottom-20 z-50 mx-auto flex max-w-md items-center gap-2 rounded-md border border-primary bg-card px-4 py-3 text-sm shadow-lg md:bottom-6">
          <WifiOff className="size-4 shrink-0 text-primary" aria-hidden="true" />
          Conexão em tempo real perdida. Reconectando…
        </p>
      )}
    </div>
  )
}
