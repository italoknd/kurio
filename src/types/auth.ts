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

/** Provedores do login social simulado (sem integração real com Google/Facebook). */
export const SOCIAL_PROVIDERS = {
  google: 'Google',
  facebook: 'Facebook',
} as const

export type SocialProvider = keyof typeof SOCIAL_PROVIDERS

/**
 * POST /auth/social — conclusão simulada do login no provedor. Com uma conta Kurio
 * já cadastrada com o e-mail, entra nela; senão, cria a conta (201).
 */
export interface SocialLoginRequest {
  provider: SocialProvider
  email: string
  displayName: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
}
