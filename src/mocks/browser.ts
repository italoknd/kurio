import { setupWorker } from 'msw/browser'
import {
  applyConfigFromUrl,
  getMockConfig,
  resetMockConfig,
  setMockConfig,
  type MockConfig,
} from '@/mocks/config'
import { handlers } from '@/mocks/handlers'
import { clearForcedFailures, failNext } from '@/mocks/network'
import { connectedSocketCount, emitToAll, setSocketAvailable } from '@/mocks/socket'

/** API de controle dos mocks, exposta em `window.__kurioMocks` (painel e testes). */
export const mockControls = {
  getConfig: getMockConfig,
  setConfig: (patch: Partial<MockConfig>) => setMockConfig(patch),
  failNext,
  /** Restaura integralmente o cenário padrão. */
  reset() {
    clearForcedFailures()
    setSocketAvailable(true)
    resetMockConfig()
  },
  socket: {
    emit: emitToAll,
    setAvailable: setSocketAvailable,
    connectedCount: connectedSocketCount,
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
  window.__kurioMocks = mockControls
}
