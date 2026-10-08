import { HttpResponse } from 'msw'
import { commit, db, newId, sha256Hex } from '@/mocks/db/store'
import {
  conflict,
  EMAIL_PATTERN,
  ENS_PATTERN,
  passwordProblem,
  readJson,
  requireAuth,
  route,
  text,
  USERNAME_PATTERN,
  validationError,
} from '@/mocks/handlers/utils'
import { toUser } from '@/mocks/serializers'
import type { ChangePasswordRequest, UpdateAvatarRequest, UpdateProfileRequest } from '@/types/profile'

const AVATAR_PATTERN = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/
const AVATAR_MAX_BYTES = 1_000_000

export const profileHandlers = [
  route('get', '/profile', ({ request }) => {
    const auth = requireAuth(request)
    if ('response' in auth) return auth.response
    return HttpResponse.json(toUser(auth.user))
  }),

  route('patch', '/profile', async ({ request }) => {
    const auth = requireAuth(request)
    if ('response' in auth) return auth.response
    const body = await readJson<UpdateProfileRequest>(request)

    const displayName = text(body.displayName)
    const username = text(body.username).toLowerCase()
    const email = text(body.email).toLowerCase()
    const ensName = text(body.ensName).toLowerCase().replace(/\.eth$/, '')
    const walletNickname = text(body.walletNickname)
    const fields: Record<string, string> = {}

    if (displayName.length < 2) fields.displayName = 'Informe um nome de exibição com pelo menos 2 caracteres.'
    if (!USERNAME_PATTERN.test(username)) {
      fields.username = 'Use de 3 a 20 caracteres: letras minúsculas, números, ponto ou sublinhado.'
    }
    if (!EMAIL_PATTERN.test(email)) fields.email = 'Informe um e-mail válido.'
    if (ensName && !ENS_PATTERN.test(ensName)) fields.ensName = 'Use apenas letras minúsculas, números e hífen.'
    if (!walletNickname) fields.walletNickname = 'Informe o apelido da carteira.'
    if (Object.keys(fields).length > 0) return validationError(fields)

    const others = db.state.users.filter((u) => u.id !== auth.user.id)
    if (others.some((u) => u.email === email)) {
      return conflict('EMAIL_TAKEN', 'Este e-mail já está em uso.', { fields: { email: 'Este e-mail já está em uso por outra conta.' } })
    }
    if (others.some((u) => u.username === username)) {
      return conflict('USERNAME_TAKEN', 'Este nome de usuário já está em uso.', {
        fields: { username: 'Este nome de usuário já está em uso.' },
      })
    }

    Object.assign(auth.user, { displayName, username, email, ensName: ensName || null, walletNickname })
    commit()
    return HttpResponse.json(toUser(auth.user))
  }),

  route('put', '/profile/avatar', async ({ request }) => {
    const auth = requireAuth(request)
    if ('response' in auth) return auth.response
    const body = await readJson<UpdateAvatarRequest>(request)
    const dataUrl = text(body.dataUrl)
    if (!AVATAR_PATTERN.test(dataUrl)) return validationError({ avatar: 'Envie uma imagem PNG, JPEG ou WebP.' })
    const bytes = Math.floor((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75)
    if (bytes > AVATAR_MAX_BYTES) return validationError({ avatar: 'A imagem deve ter no máximo 1 MB.' })
    auth.user.avatarUrl = dataUrl
    commit()
    return HttpResponse.json(toUser(auth.user))
  }),

  route('delete', '/profile/avatar', ({ request }) => {
    const auth = requireAuth(request)
    if ('response' in auth) return auth.response
    auth.user.avatarUrl = null
    commit()
    return HttpResponse.json(toUser(auth.user))
  }),

  route('post', '/profile/password', async ({ request }) => {
    const auth = requireAuth(request)
    if ('response' in auth) return auth.response
    const body = await readJson<ChangePasswordRequest>(request)
    const fields: Record<string, string> = {}

    if (typeof body.currentPassword !== 'string' || !body.currentPassword) {
      fields.currentPassword = 'Informe a senha atual.'
    } else if ((await sha256Hex(`${auth.user.passwordSalt}:${body.currentPassword}`)) !== auth.user.passwordHash) {
      fields.currentPassword = 'Senha atual incorreta.'
    }
    const problem = passwordProblem(body.newPassword)
    if (problem) fields.newPassword = problem
    else if (body.newPassword === body.currentPassword) fields.newPassword = 'A nova senha deve ser diferente da atual.'
    if (Object.keys(fields).length > 0) return validationError(fields)

    const salt = newId('salt')
    auth.user.passwordSalt = salt
    auth.user.passwordHash = await sha256Hex(`${salt}:${body.newPassword}`)
    commit()
    return new HttpResponse(null, { status: 204 })
  }),
]
