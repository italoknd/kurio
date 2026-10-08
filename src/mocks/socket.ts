import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'
import { env } from '@/lib/env'
import { db } from '@/mocks/db/store'
import type { SocketAuth } from '@/types/events'

/**
 * Servidor Socket.IO simulado. O MSW intercepta a conexão WebSocket do
 * `socket.io-client` e o binding traduz o protocolo do Socket.IO.
 *
 * Limitações do binding (documentadas em ARCHITECTURE.md):
 * - apenas transporte WebSocket (sem long-polling) e namespace "/";
 * - sem rooms/broadcast nativos: o roteamento por usuário é feito aqui, a partir
 *   do token enviado no handshake (`auth`);
 * - o handshake anuncia pingInterval de 25s, mas não envia pings — o heartbeat
 *   é emitido manualmente abaixo para o cliente não encerrar a conexão.
 */

const HEARTBEAT_MS = 20_000

type SocketIoConnection = ReturnType<typeof toSocketIo>

interface MockSocketClient {
  id: string
  io: SocketIoConnection
  token: string | null
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

/** Lê o pacote CONNECT do Socket.IO ("40{...auth}") enviado pelo cliente. */
function readAuth(data: unknown): SocketAuth | undefined {
  if (typeof data !== 'string' || !data.startsWith('40')) return undefined
  try {
    const payload = JSON.parse(data.slice(2) || '{}') as Partial<SocketAuth>
    return { token: typeof payload.token === 'string' ? payload.token : null }
  } catch {
    return { token: null }
  }
}

export const socketHandler = ws.link(socketEndpoint()).addEventListener('connection', (connection) => {
  if (!available) {
    connection.client.close(1011, 'Servidor indisponível (simulado)')
    return
  }

  const io = toSocketIo(connection)
  const client: MockSocketClient = {
    id: connection.client.id,
    io,
    token: null,
    close: () => connection.client.close(),
  }
  clients.set(client.id, client)

  connection.client.addEventListener('message', (event) => {
    const auth = readAuth(event.data)
    if (auth) client.token = auth.token
  })

  const heartbeat = window.setInterval(() => connection.client.send('2'), HEARTBEAT_MS)
  connection.client.addEventListener('close', () => {
    window.clearInterval(heartbeat)
    clients.delete(client.id)
  })
})

/** Usuário dono da conexão, se o token do handshake ainda for uma sessão válida. */
function userIdOf(client: MockSocketClient): string | null {
  if (!client.token) return null
  const session = db.state.sessions.find((s) => s.token === client.token)
  if (!session || new Date(session.expiresAt).getTime() <= Date.now()) return null
  return session.userId
}

/** Emite para todas as conexões (eventos públicos, como `nft.updated`). */
export function emitToAll(event: string, payload: unknown) {
  clients.forEach((client) => client.io.client.emit(event, payload))
}

/** Emite apenas para as conexões autenticadas do usuário (eventos privados). */
export function emitToUser(userId: string, event: string, payload: unknown) {
  clients.forEach((client) => {
    if (userIdOf(client) === userId) client.io.client.emit(event, payload)
  })
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

/** Usuários das conexões atuais (`null` = anônima). Usado nos testes de isolamento. */
export function connectedSocketUsers() {
  return [...clients.values()].map(userIdOf)
}
