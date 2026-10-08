import { commit, db, nowIso } from '@/mocks/db/store'
import type { NftRecord, OrderRecord } from '@/mocks/db/types'
import { toNftUpdatedData, toOrder } from '@/mocks/serializers'
import { emitToAll, emitToUser } from '@/mocks/socket'
import type { NftUpdatedEvent, OrderUpdatedEvent, RealtimeEvent } from '@/types/events'

type AnyEvent = NftUpdatedEvent | OrderUpdatedEvent

interface LoggedEvent {
  event: AnyEvent
  /** Destinatário: `null` = todos; caso contrário, o id do usuário. */
  userId: string | null
}

/** Últimos eventos emitidos, para os testes reenviarem duplicatas e eventos antigos. */
const log: LoggedEvent[] = []
const LOG_LIMIT = 50

function envelope<T extends AnyEvent>(
  type: T['type'],
  resource: T['resource'],
  version: number,
  data: T['data'],
): T {
  db.state.eventSeq += 1
  commit()
  return {
    id: `evt_${String(db.state.eventSeq).padStart(6, '0')}`,
    type,
    resource,
    version,
    occurredAt: nowIso(),
    data,
  } as T
}

function deliver(entry: LoggedEvent) {
  if (entry.userId) emitToUser(entry.userId, entry.event.type, entry.event)
  else emitToAll(entry.event.type, entry.event)
}

function send(entry: LoggedEvent) {
  log.push(entry)
  if (log.length > LOG_LIMIT) log.shift()
  deliver(entry)
}

/** Publica `nft.updated` para todos. Chamar depois de incrementar `nft.version`. */
export function publishNftUpdated(nft: NftRecord) {
  const event = envelope<NftUpdatedEvent>('nft.updated', { type: 'nft', id: nft.id }, nft.version, toNftUpdatedData(nft))
  send({ event, userId: null })
  return event
}

/** Publica `order.updated` apenas para o dono do pedido. */
export function publishOrderUpdated(order: OrderRecord) {
  const event = envelope<OrderUpdatedEvent>('order.updated', { type: 'order', id: order.id }, order.version, toOrder(order))
  send({ event, userId: order.userId })
  return event
}

export function recentEvents(): RealtimeEvent<string, string, unknown>[] {
  return log.map((entry) => entry.event)
}

/** Reenvia um evento já emitido, com o mesmo id e versão (duplicata). */
export function replayEvent(eventId: string) {
  const entry = log.find((item) => item.event.id === eventId)
  if (!entry) throw new Error(`Evento ${eventId} não encontrado no log`)
  deliver(entry)
}
