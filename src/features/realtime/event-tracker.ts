import type { RealtimeEvent } from '@/types/events'

const SEEN_LIMIT = 500

/**
 * Filtro de eventos em tempo real: descarta duplicatas (mesmo `id`) e eventos
 * antigos (versão menor ou igual à última aplicada para o mesmo recurso). Assim um
 * evento reenviado ou atrasado nunca regride o estado nem reaplica efeitos.
 */
export function createEventTracker() {
  const seen = new Set<string>()
  const versions = new Map<string, number>()

  return {
    accept(event: RealtimeEvent<string, string, unknown>) {
      if (seen.has(event.id)) return false
      seen.add(event.id)
      if (seen.size > SEEN_LIMIT) seen.delete(seen.values().next().value!)

      const key = `${event.resource.type}:${event.resource.id}`
      if (event.version <= (versions.get(key) ?? 0)) return false
      versions.set(key, event.version)
      return true
    },
    /** Esquece os recursos de um tipo (ex.: pedidos ao trocar de usuário). */
    forget(resourceType: string) {
      for (const key of versions.keys()) if (key.startsWith(`${resourceType}:`)) versions.delete(key)
    },
  }
}

export type EventTracker = ReturnType<typeof createEventTracker>
