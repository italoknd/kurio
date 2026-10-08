import { env } from '@/lib/env'
import './index.css'

/**
 * A aplicação só é importada depois que os mocks iniciam: o engine.io-client
 * captura `globalThis.WebSocket` ao carregar o módulo, então o MSW precisa
 * interceptar o WebSocket antes de o socket.io-client ser avaliado.
 */
async function bootstrap() {
  if (env.enableMocks) {
    const { startMocks } = await import('@/mocks/browser')
    await startMocks()
  }

  const { renderApp } = await import('@/app')
  renderApp(document.getElementById('root')!)
}

void bootstrap()
