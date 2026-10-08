/**
 * Credenciais persistidas no navegador: token da sessão e id do carrinho do
 * visitante. Ficam em localStorage para a sessão e o carrinho sobreviverem a
 * refresh. Nenhuma senha é armazenada.
 */

const TOKEN_KEY = 'kurio:session-token'
const GUEST_CART_KEY = 'kurio:guest-cart-id'

function read(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // armazenamento indisponível: segue só em memória nesta aba
  }
}

export const credentials = {
  getToken: () => read(TOKEN_KEY),
  setToken: (token: string | null) => write(TOKEN_KEY, token),
  getGuestCartId: () => read(GUEST_CART_KEY),
  setGuestCartId: (id: string | null) => write(GUEST_CART_KEY, id),
}
