/** Usuário autenticado (dados públicos do próprio perfil). */
export interface User {
  id: string
  username: string
  displayName: string
  email: string
  /** Nome ENS sem o sufixo, ex.: "nova" para "nova.eth". */
  ensName: string | null
  walletNickname: string | null
  /** Data URL ou URL da imagem do avatar. */
  avatarUrl: string | null
}

/** Sessão retornada por login, cadastro e consulta de sessão. */
export interface Session {
  token: string
  /** ISO 8601. Após essa data a API responde 401 UNAUTHENTICATED. */
  expiresAt: string
  user: User
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
}
