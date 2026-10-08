import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'
import { env } from '@/lib/env'

/**
 * Servidor Socket.IO simulado. O MSW intercepta a conexão WebSocket do
 * `socket.io-client` e o binding traduz o protocolo do Socket.IO.
 *
 * Limitações do binding (documentadas em ARCHITECTURE.md):
 * - apenas transporte WebSocket (sem long-polling) e namespace "/";
 * - sem rooms/broadcast nativos: o isolamento por usuário é feito aqui;
 * - o handshake anuncia pingInterval de 25s, mas não envia pings — o heartbeat
 *   é emitido manualmente abaixo para o cliente não encerrar a conexão.
 */

const HEARTBEAT_MS = 20_000

type SocketIoConnection = ReturnType<typeof toSocketIo>

interface MockSocketClient {
  id: string
  io: SocketIoConnection
  close: () => void
}

const clients = new Map<string, MockSocketClient>()
let available = true

/**
 * Origem WebSocket do servidor Socket.IO. O MSW remove o prefixo "/socket.io/"
 * da URL do cliente antes de comparar, então o link é apenas a origem.
 */
function socketEndpoint() {
  const url = new URL(env.socketUrl)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.origin
}

export const socketHandler = ws.link(socketEndpoint()).addEventListener('connection', (connection) => {
  if (!available) {
    connection.client.close(1011, 'Servidor indisponível (simulado)')
    return
  }

  const io = toSocketIo(connection)
  const heartbeat = window.setInterval(() => connection.client.send('2'), HEARTBEAT_MS)
  const client: MockSocketClient = { id: connection.client.id, io, close: () => connection.client.close() }
  clients.set(client.id, client)

  connection.client.addEventListener('close', () => {
    window.clearInterval(heartbeat)
    clients.delete(client.id)
  })
})

/** Emite um evento para todos os clientes conectados. */
export function emitToAll(event: string, payload: unknown) {
  clients.forEach((client) => client.io.client.emit(event, payload))
}

/** Derruba as conexões atuais; com `available = false`, recusa reconexões. */
export function setSocketAvailable(value: boolean) {
  available = value
  if (!value) clients.forEach((client) => client.close())
}

export function isSocketAvailable() {
  return available
}

export function connectedSocketCount() {
  return clients.size
}
