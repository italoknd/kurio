const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, body: unknown) {
    super(`Erro na requisição (${status})`)
    this.status = status
    this.body = body
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  params?: Record<string, string | number | boolean | undefined>
}

async function request<T>(path: string, { body, params, headers, ...init }: RequestOptions = {}): Promise<T> {
  const url = new URL(path, BASE_URL || window.location.origin)
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value))
  }

  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const data = response.status === 204 ? undefined : await response.json().catch(() => undefined)
  if (!response.ok) throw new ApiError(response.status, data)
  return data as T
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'DELETE' }),
}
