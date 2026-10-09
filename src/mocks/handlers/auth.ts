import { HttpResponse } from 'msw'
import { getMockConfig } from '@/mocks/config'
import { commit, db, newId, sha256Hex } from '@/mocks/db/store'
import type { SessionRecord, UserRecord } from '@/mocks/db/types'
import { errorResponse } from '@/mocks/network'
import { toUser } from '@/mocks/serializers'
import {
  bearerToken,
  conflict,
  EMAIL_PATTERN,
  passwordProblem,
  readJson,
  requireAuth,
  route,
  text,
  USERNAME_PATTERN,
  validationError,
} from '@/mocks/handlers/utils'
import { SOCIAL_PROVIDERS, type LoginRequest, type RegisterRequest, type Session, type SocialLoginRequest } from '@/types/auth'

function createSession(user: UserRecord): Session {
  const ttl = getMockConfig().sessionTtlMinutes * 60_000
  const record: SessionRecord = {
    token: `tok_${crypto.randomUUID().replace(/-/g, '')}`,
    userId: user.id,
    expiresAt: new Date(Date.now() + ttl).toISOString(),
  }
  db.state.sessions.push(record)
  commit()
  return { token: record.token, expiresAt: record.expiresAt, user: toUser(user) }
}

/** Usuário único a partir do e-mail (ex.: "colecionador.google@exemplo.com" → "colecionador.google"). */
function usernameFromEmail(email: string) {
  const base = (email.split('@')[0] ?? '').toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 16).padEnd(3, '0')
  let candidate = base
  for (let n = 2; db.state.users.some((u) => u.username === candidate); n++) candidate = `${base}${n}`
  return candidate
}

export const authHandlers = [
  route('post', '/auth/register', async ({ request }) => {
    const body = await readJson<RegisterRequest>(request)
    const username = text(body.username).toLowerCase()
    const email = text(body.email).toLowerCase()
    const fields: Record<string, string> = {}

    if (!USERNAME_PATTERN.test(username)) {
      fields.username = 'Use de 3 a 20 caracteres: letras minúsculas, números, ponto ou sublinhado.'
    }
    if (!EMAIL_PATTERN.test(email)) fields.email = 'Informe um e-mail válido.'
    const passwordError = passwordProblem(body.password)
    if (passwordError) fields.password = passwordError
    if (Object.keys(fields).length > 0) return validationError(fields)

    if (db.state.users.some((u) => u.email === email)) {
      return conflict('EMAIL_TAKEN', 'Já existe uma conta com este e-mail.', {
        fields: { email: 'Este e-mail já está cadastrado. Faça login ou use outro e-mail.' },
      })
    }
    if (db.state.users.some((u) => u.username === username)) {
      return conflict('USERNAME_TAKEN', 'Este nome de usuário já está em uso.', {
        fields: { username: 'Este nome de usuário já está em uso.' },
      })
    }

    const salt = newId('salt')
    const user: UserRecord = {
      id: newId('usr'),
      username,
      displayName: username,
      email,
      ensName: null,
      walletNickname: null,
      avatarUrl: null,
      passwordSalt: salt,
      passwordHash: await sha256Hex(`${salt}:${body.password}`),
    }
    db.state.users.push(user)
    db.state.favorites[user.id] = []
    commit()
    return HttpResponse.json(createSession(user), { status: 201 })
  }),

  route('post', '/auth/login', async ({ request }) => {
    const body = await readJson<LoginRequest>(request)
    const email = text(body.email).toLowerCase()
    const fields: Record<string, string> = {}
    if (!EMAIL_PATTERN.test(email)) fields.email = 'Informe um e-mail válido.'
    if (typeof body.password !== 'string' || body.password.length === 0) fields.password = 'Informe a senha.'
    if (Object.keys(fields).length > 0) return validationError(fields)

    const user = db.state.users.find((u) => u.email === email)
    const hash = user ? await sha256Hex(`${user.passwordSalt}:${body.password}`) : null
    if (!user || hash !== user.passwordHash) {
      return errorResponse(401, 'UNAUTHENTICATED', 'E-mail ou senha incorretos.')
    }
    return HttpResponse.json(createSession(user))
  }),

  /**
   * Login social simulado: a interface faz o papel do provedor (Google/Facebook) e envia o
   * e-mail e o nome "autorizados". Conta existente com o e-mail: entra nela; senão, cria.
   * O cenário "recusar" simula o usuário negando o acesso no provedor.
   */
  route('post', '/auth/social', async ({ request }) => {
    const body = await readJson<SocialLoginRequest>(request)
    const email = text(body.email).toLowerCase()
    const displayName = text(body.displayName)
    const fields: Record<string, string> = {}
    if (!body.provider || !(body.provider in SOCIAL_PROVIDERS)) fields.provider = 'Provedor inválido.'
    if (!EMAIL_PATTERN.test(email)) fields.email = 'Informe um e-mail válido.'
    if (displayName.length < 2) fields.displayName = 'Informe um nome com pelo menos 2 caracteres.'
    if (Object.keys(fields).length > 0) return validationError(fields)

    if (getMockConfig().socialLogin === 'recusar') {
      return errorResponse(403, 'FORBIDDEN', `O acesso foi negado no ${SOCIAL_PROVIDERS[body.provider!]}.`)
    }

    const existing = db.state.users.find((u) => u.email === email)
    if (existing) return HttpResponse.json(createSession(existing))

    // Conta criada pelo provedor: sem senha utilizável (só entra pelo login social).
    const salt = newId('salt')
    const user: UserRecord = {
      id: newId('usr'),
      username: usernameFromEmail(email),
      displayName,
      email,
      ensName: null,
      walletNickname: null,
      avatarUrl: null,
      passwordSalt: salt,
      passwordHash: await sha256Hex(`${salt}:${crypto.randomUUID()}`),
    }
    db.state.users.push(user)
    db.state.favorites[user.id] = []
    commit()
    return HttpResponse.json(createSession(user), { status: 201 })
  }),

  route('get', '/auth/session', ({ request }) => {
    const auth = requireAuth(request)
    if ('response' in auth) return auth.response
    const session = db.state.sessions.find((s) => s.token === auth.token)!
    return HttpResponse.json<Session>({ token: session.token, expiresAt: session.expiresAt, user: toUser(auth.user) })
  }),

  route('post', '/auth/logout', ({ request }) => {
    const token = bearerToken(request)
    if (token) {
      db.state.sessions = db.state.sessions.filter((s) => s.token !== token)
      commit()
    }
    return new HttpResponse(null, { status: 204 })
  }),
]

/** Expira todas as sessões ativas (cenário de sessão expirada). */
export function expireAllSessions() {
  const past = new Date(Date.now() - 1000).toISOString()
  db.state.sessions.forEach((session) => {
    session.expiresAt = past
  })
  commit()
}
