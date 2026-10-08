import { createSeedState, FIXTURES_VERSION } from '@/mocks/db/fixtures'
import type { DbState } from '@/mocks/db/types'

/**
 * Banco simulado único, compartilhado por todos os handlers REST e pelo servidor
 * Socket.IO simulado. Persistido em localStorage para sobreviver a refresh;
 * `resetDb()` restaura integralmente o cenário conhecido das fixtures.
 */

const STORAGE_KEY = 'kurio:mocks:db'

function load(): DbState {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as DbState | null
    if (stored?.schemaVersion === FIXTURES_VERSION) return stored
  } catch {
    // estado corrompido ou armazenamento indisponível: volta para as fixtures
  }
  return createSeedState()
}

export const db: { state: DbState } = { state: load() }

/** Persiste o estado atual. Chamar após toda mutação. */
export function commit() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db.state))
  } catch {
    // armazenamento cheio ou indisponível: mantém em memória
  }
}

export function resetDb() {
  db.state = createSeedState()
  commit()
}

export function nowIso() {
  return new Date().toISOString()
}

/** Identificador aleatório com prefixo (ex.: "ord_3f9a..."). */
export function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
}

/** Hash não criptográfico e estável (FNV-1a 32 bits) para ids derivados de conteúdo. */
export function stableHash(value: unknown): string {
  const text = JSON.stringify(value)
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export async function sha256Hex(text: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
