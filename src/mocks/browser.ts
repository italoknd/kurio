import { setupWorker } from 'msw/browser'
import {
  applyConfigFromUrl,
  getMockConfig,
  resetMockConfig,
  setMockConfig,
  type MockConfig,
} from '@/mocks/config'
import { db, resetDb } from '@/mocks/db/store'
import { updateNft, type NftEditionPatch } from '@/mocks/domain/catalog'
import { clearOrderTimers, processOrder, resumePendingOrders } from '@/mocks/domain/orders'
import { handlers } from '@/mocks/handlers'
import { expireAllSessions } from '@/mocks/handlers/auth'
import { setTimeoutNextOrderCreate } from '@/mocks/handlers/orders'
import { clearForcedFailures, failNext } from '@/mocks/network'
import { recentEvents, replayEvent } from '@/mocks/realtime'
import { connectedSocketCount, connectedSocketUsers, emitToAll, setSocketAvailable } from '@/mocks/socket'

/** API de controle dos mocks, exposta em `window.__kurioMocks` (painel e testes). */
export const mockControls = {
  getConfig: getMockConfig,
  setConfig: (patch: Partial<MockConfig>) => setMockConfig(patch),
  failNext,

  /** Restaura integralmente o cenário padrão: dados, configuração, falhas e tempo real. */
  reset() {
    clearOrderTimers()
    clearForcedFailures()
    setTimeoutNextOrderCreate(false)
    setSocketAvailable(true)
    resetMockConfig()
    resetDb()
  },

  nfts: {
    /** Altera preço/disponibilidade e publica `nft.updated` (mesmo caminho dos pedidos). */
    update: (nftId: string, patch: NftEditionPatch) => updateNft(nftId, patch),
    get: (nftId: string) => structuredClone(db.state.nfts.find((nft) => nft.id === nftId)),
  },

  session: {
    /** Expira todas as sessões ativas; a próxima chamada autenticada recebe 401. */
    expireAll: expireAllSessions,
  },

  orders: {
    /** O próximo POST /orders cria o pedido mas responde depois do timeout do cliente. */
    timeoutNextCreate: () => setTimeoutNextOrderCreate(true),
    /** Conclui imediatamente a simulação de um pedido pendente. */
    process: processOrder,
    list: () => structuredClone(db.state.orders),
  },

  socket: {
    emit: emitToAll,
    setAvailable: setSocketAvailable,
    connectedCount: connectedSocketCount,
    connectedUsers: connectedSocketUsers,
    /** Últimos eventos publicados (para reenviar duplicatas). */
    recentEvents,
    /** Reenvia um evento já publicado, com o mesmo id e versão. */
    replay: replayEvent,
  },
}

export type MockControls = typeof mockControls

declare global {
  interface Window {
    __kurioMocks?: MockControls
  }
}

export async function startMocks() {
  applyConfigFromUrl()
  if (new URLSearchParams(window.location.search).has('mockReset')) mockControls.reset()

  const worker = setupWorker(...handlers)
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: import.meta.env.PROD,
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  })
  // Pedidos pendentes continuam sendo processados após um refresh.
  resumePendingOrders()
  window.__kurioMocks = mockControls
}
