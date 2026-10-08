import { HttpResponse } from 'msw'
import { getMockConfig } from '@/mocks/config'
import { commit, db, newId } from '@/mocks/db/store'
import type { WalletRecord } from '@/mocks/db/types'
import {
  ADDRESS_PATTERN,
  conflict,
  EMAIL_PATTERN,
  ENS_PATTERN,
  notFound,
  readJson,
  requireAuth,
  route,
  text,
  validationError,
} from '@/mocks/handlers/utils'
import { toWallet } from '@/mocks/serializers'
import { NFT_NETWORKS, type NftNetwork } from '@/types/nft'
import { WALLET_TYPES, type WalletConnection, type WalletInput, type WalletType } from '@/types/wallet'

/** Valida e normaliza os dados da carteira; retorna os erros por campo. */
function parseWallet(body: Partial<WalletInput>): { input?: WalletInput; fields: Record<string, string> } {
  const fields: Record<string, string> = {}
  const input = {
    role: body.role,
    displayName: text(body.displayName),
    nickname: text(body.nickname),
    profileName: text(body.profileName),
    network: body.network,
    address: text(body.address),
    secondaryAddress: text(body.secondaryAddress) || null,
    type: body.type,
    referralCode: text(body.referralCode),
    email: text(body.email).toLowerCase(),
    ensName: text(body.ensName).toLowerCase().replace(/\.eth$/, ''),
  }

  if (input.role !== 'primary' && input.role !== 'secondary') fields.role = 'Tipo de carteira inválido.'
  if (!input.displayName) fields.displayName = 'Informe o nome de exibição.'
  if (!input.nickname) fields.nickname = 'Informe o apelido da carteira.'
  if (!input.profileName) fields.profileName = 'Informe o nome do perfil.'
  if (!input.network || !(input.network in NFT_NETWORKS)) fields.network = 'Selecione uma rede.'
  if (!ADDRESS_PATTERN.test(input.address)) fields.address = 'Informe um endereço 0x com 40 caracteres hexadecimais.'
  if (!input.type || !(input.type in WALLET_TYPES)) fields.type = 'Selecione o tipo de carteira.'
  if (!input.referralCode) fields.referralCode = 'Informe o código de indicação.'
  if (!EMAIL_PATTERN.test(input.email)) fields.email = 'Informe um e-mail válido.'
  if (!ENS_PATTERN.test(input.ensName)) fields.ensName = 'Informe um nome ENS válido.'

  if (Object.keys(fields).length > 0) return { fields }
  return {
    fields,
    input: { ...input, network: input.network as NftNetwork, type: input.type as WalletType, role: input.role! },
  }
}

export const walletHandlers = [
  route('get', '/wallets', ({ request }) => {
    const auth = requireAuth(request)
    if ('response' in auth) return auth.response
    return HttpResponse.json(db.state.wallets.filter((w) => w.userId === auth.user.id).map(toWallet))
  }),

  route('post', '/wallets', async ({ request }) => {
    const auth = requireAuth(request)
    if ('response' in auth) return auth.response
    const { input, fields } = parseWallet(await readJson<WalletInput>(request))
    if (!input) return validationError(fields)
    if (db.state.wallets.some((w) => w.userId === auth.user.id && w.role === input.role)) {
      const label = input.role === 'primary' ? 'principal' : 'secundária'
      return conflict('WALLET_ROLE_TAKEN', `Você já tem uma carteira ${label}. Edite a existente.`)
    }
    const wallet: WalletRecord = { ...input, id: newId('wal'), userId: auth.user.id }
    db.state.wallets.push(wallet)
    commit()
    return HttpResponse.json(toWallet(wallet), { status: 201 })
  }),

  route<{ walletId: string }>('put', '/wallets/:walletId', async ({ request, params }) => {
    const auth = requireAuth(request)
    if ('response' in auth) return auth.response
    const wallet = db.state.wallets.find((w) => w.id === params.walletId)
    if (!wallet || wallet.userId !== auth.user.id) return notFound('Carteira não encontrada.')
    const { input, fields } = parseWallet(await readJson<WalletInput>(request))
    if (!input) return validationError(fields)
    if (input.role !== wallet.role) return validationError({ role: 'O tipo da carteira não pode ser alterado.' })
    Object.assign(wallet, input)
    commit()
    return HttpResponse.json(toWallet(wallet))
  }),

  /** Simula o pedido de conexão à extensão da carteira (aceite ou recusa pelo cenário). */
  route<{ walletId: string }>('post', '/wallets/:walletId/connect', async ({ request, params }) => {
    const auth = requireAuth(request)
    if ('response' in auth) return auth.response
    const wallet = db.state.wallets.find((w) => w.id === params.walletId && w.userId === auth.user.id)
    if (!wallet) return notFound('Carteira não encontrada.')
    const body = await readJson<{ network: NftNetwork }>(request)
    const network = body.network && body.network in NFT_NETWORKS ? body.network : wallet.network
    if (getMockConfig().walletConnection === 'recusar') {
      return conflict('WALLET_REJECTED', 'A conexão foi recusada na carteira.')
    }
    return HttpResponse.json<WalletConnection>({ walletId: wallet.id, network, status: 'connected' })
  }),
]
