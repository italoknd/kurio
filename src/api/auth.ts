import { http } from '@/lib/http'
import type { LoginRequest, RegisterRequest, Session } from '@/types/auth'

export const authApi = {
  register: (body: RegisterRequest) => http.post<Session>('/auth/register', body).then((r) => r.data),
  login: (body: LoginRequest) => http.post<Session>('/auth/login', body).then((r) => r.data),
  session: (signal?: AbortSignal) => http.get<Session>('/auth/session', { signal }).then((r) => r.data),
  logout: () => http.post<void>('/auth/logout').then(() => undefined),
}
