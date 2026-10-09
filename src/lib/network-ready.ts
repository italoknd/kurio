/**
 * Sinal de que a camada de rede está pronta. Com os mocks ativos, só é liberado
 * depois que o MSW intercepta fetch/WebSocket; sem mocks, já nasce liberado.
 * A interface renderiza antes (shell e skeletons), e as requisições REST e o
 * Socket.IO esperam este sinal — assim mocks e aplicação carregam em paralelo.
 */
let release: () => void = () => {}

export const networkReady = new Promise<void>((resolve) => {
  release = resolve
})

export function markNetworkReady() {
  release()
}
