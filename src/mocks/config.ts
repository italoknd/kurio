/**
 * Configuração dos cenários de rede dos mocks. Persistida em localStorage para
 * sobreviver a refresh; pode ser definida pela URL (?mockNetwork=lento&mockSeed=7),
 * pelo painel de mocks ou pelos testes via `window.__kurioMocks`.
 */

export const NETWORK_PROFILES = {
  normal: { label: 'Normal', description: 'Latência fixa de 150 ms' },
  lento: { label: 'Lento', description: 'Latência fixa de 2,5 s' },
  variavel: { label: 'Latência variável', description: '50 ms a 3 s (determinística pela seed), gera respostas fora de ordem' },
  instavel: { label: 'Instável', description: '30% das requisições falham com 503 (determinístico pela seed)' },
  offline: { label: 'Sem conexão', description: 'Toda requisição falha como erro de rede' },
  timeout: { label: 'Timeout', description: 'Nenhuma resposta antes do timeout do cliente' },
} as const

export type NetworkProfile = keyof typeof NETWORK_PROFILES

export interface MockConfig {
  network: NetworkProfile
  /** Seed do gerador pseudoaleatório (latência variável e falhas intermitentes). */
  seed: number
  /** Resultado da simulação de pagamento dos próximos pedidos. */
  payment: 'aprovar' | 'recusar'
  /** Resposta da carteira ao pedido de conexão. */
  walletConnection: 'aceitar' | 'recusar'
  /** Resposta do provedor no login social simulado (Google/Facebook). */
  socialLogin: 'aceitar' | 'recusar'
  /** Tempo entre a criação do pedido e a confirmação/recusa. */
  orderDelayMs: number
  /** Duração das novas sessões. */
  sessionTtlMinutes: number
}

const STORAGE_KEY = 'kurio:mocks:config'
const DEFAULT_CONFIG: MockConfig = {
  network: 'normal',
  seed: 1,
  payment: 'aprovar',
  walletConnection: 'aceitar',
  socialLogin: 'aceitar',
  orderDelayMs: 4000,
  sessionTtlMinutes: 60,
}

function isProfile(value: unknown): value is NetworkProfile {
  return typeof value === 'string' && value in NETWORK_PROFILES
}

function isPositiveInt(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0
}

function load(): MockConfig {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<MockConfig> | null
    return {
      network: isProfile(stored?.network) ? stored.network : DEFAULT_CONFIG.network,
      seed: Number.isInteger(stored?.seed) ? stored!.seed! : DEFAULT_CONFIG.seed,
      payment: stored?.payment === 'recusar' ? 'recusar' : 'aprovar',
      walletConnection: stored?.walletConnection === 'recusar' ? 'recusar' : 'aceitar',
      socialLogin: stored?.socialLogin === 'recusar' ? 'recusar' : 'aceitar',
      orderDelayMs: isPositiveInt(stored?.orderDelayMs) ? stored.orderDelayMs : DEFAULT_CONFIG.orderDelayMs,
      sessionTtlMinutes: isPositiveInt(stored?.sessionTtlMinutes)
        ? stored.sessionTtlMinutes
        : DEFAULT_CONFIG.sessionTtlMinutes,
    }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

let config = load()
const listeners = new Set<() => void>()

export function getMockConfig(): MockConfig {
  return config
}

export function setMockConfig(patch: Partial<MockConfig>) {
  config = { ...config, ...patch }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    // armazenamento indisponível: mantém só em memória
  }
  resetRandom()
  listeners.forEach((listener) => listener())
}

export function resetMockConfig() {
  setMockConfig(DEFAULT_CONFIG)
}

export function subscribeMockConfig(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Aplica parâmetros de URL (?mockNetwork=...&mockSeed=...) e os remove da barra de endereço. */
export function applyConfigFromUrl() {
  const url = new URL(window.location.href)
  const network = url.searchParams.get('mockNetwork')
  const seed = url.searchParams.get('mockSeed')
  const patch: Partial<MockConfig> = {}
  if (isProfile(network)) patch.network = network
  if (seed !== null && Number.isInteger(Number(seed))) patch.seed = Number(seed)
  if (Object.keys(patch).length === 0) return
  setMockConfig(patch)
  url.searchParams.delete('mockNetwork')
  url.searchParams.delete('mockSeed')
  window.history.replaceState(window.history.state, '', url)
}

/* Gerador pseudoaleatório determinístico (mulberry32) */
let randomState = config.seed

function resetRandom() {
  randomState = config.seed
}

export function nextRandom() {
  randomState = (randomState + 0x6d2b79f5) | 0
  let t = randomState
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
