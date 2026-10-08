import { test as base, expect, type Page } from '@playwright/test'

/** Aguarda o MSW iniciar e expor os controles dos mocks. */
export async function waitForMocks(page: Page) {
  await page.waitForFunction(() => window.__kurioMocks !== undefined)
}

export interface ApiResult<T = unknown> {
  status: number
  body: T
}

/**
 * Chama a API REST simulada de dentro da página (passa pelo MSW, como o app).
 * `abortAfterMs` simula o cliente desistindo da requisição (timeout).
 */
export async function api<T = any>(
  page: Page,
  method: string,
  path: string,
  options: { body?: unknown; token?: string; headers?: Record<string, string>; abortAfterMs?: number } = {},
): Promise<ApiResult<T>> {
  return page.evaluate(
    async ({ method, path, options }) => {
      const headers: Record<string, string> = { Accept: 'application/json', ...options.headers }
      if (options.body !== undefined) headers['Content-Type'] = 'application/json'
      if (options.token) headers.Authorization = `Bearer ${options.token}`
      const response = await fetch(`/api${path}`, {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: options.abortAfterMs ? AbortSignal.timeout(options.abortAfterMs) : undefined,
      }).catch((error: Error) => ({ status: 0, text: async () => JSON.stringify({ error: error.name }) }))
      const text = await response.text()
      return { status: response.status, body: text ? JSON.parse(text) : null }
    },
    { method, path, options },
  )
}

export const USERS = {
  ana: { email: 'ana@kurio.dev', password: 'Colecione#1' },
  bruno: { email: 'bruno@kurio.dev', password: 'Colecione#2' },
}

export async function login(page: Page, user: keyof typeof USERS) {
  const result = await api<{ token: string }>(page, 'POST', '/auth/login', { body: USERS[user] })
  expect(result.status).toBe(200)
  return result.body.token
}

export const test = base.extend<{ app: Page }>({
  app: async ({ page }, use) => {
    await page.goto('/')
    await waitForMocks(page)
    await use(page)
  },
})

export { expect }
