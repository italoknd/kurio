/**
 * Substituto mínimo do `tough-cookie` para o MSW no navegador (alias no vite.config).
 * O MSW o usa só para o armazenamento de cookies dos handlers; a API simulada não usa
 * cookies (a sessão vai no header Authorization), e o pacote real arrasta o `tldts`
 * com a lista de sufixos públicos (~250 KB), que pesava no carregamento inicial.
 */

export class Cookie {
  static fromJSON(): Cookie | null {
    return null
  }
  toJSON() {
    return {}
  }
}

export class MemoryCookieStore {
  idx: Record<string, unknown> = {}
}

export class CookieJar {
  constructor(_store?: MemoryCookieStore) {}
  getCookiesSync(_url: string): Cookie[] {
    return []
  }
  async setCookie(_cookie: string, _url: string): Promise<void> {}
}
