import { env } from '@/lib/env'
import { markNetworkReady } from '@/lib/network-ready'
import './index.css'

/** Resolve depois que o navegador pintar o shell estático do index.html. */
function afterFirstPaint() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)))
}

/**
 * Os chunks do app e dos mocks já estão sendo baixados (modulepreload no HTML), mas só
 * são avaliados depois da primeira pintura do shell. A interface renderiza sem esperar
 * os mocks: requisições REST e o Socket.IO aguardam `networkReady`, liberado quando o
 * MSW intercepta a rede, então nada escapa para a rede real.
 */
async function bootstrap() {
  await afterFirstPaint()
  const mocks = env.enableMocks ? import('@/mocks/browser') : null
  const { renderApp } = await import('@/app')
  renderApp(document.getElementById('root')!)

  if (mocks) await (await mocks).startMocks()
  markNetworkReady()
}

void bootstrap()
