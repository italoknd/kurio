import { z } from 'zod'
import { NFT_NETWORKS, type NftNetwork } from '@/types/nft'
import { WALLET_TYPES, type WalletType } from '@/types/wallet'

/** Regras espelhadas da API (mocks/handlers/profile.ts e wallets.ts), para feedback imediato. */

const email = z.string().trim().min(1, 'Informe o e-mail.').email('Informe um e-mail válido.')
const ens = /^[a-z0-9-]+(\.[a-z0-9-]+)*$/i

const password = z
  .string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres.')
  .regex(/[a-zA-Z]/, 'A senha deve conter letras e números.')
  .regex(/\d/, 'A senha deve conter letras e números.')

export const profileSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe um nome de exibição com pelo menos 2 caracteres.'),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._]{3,20}$/, 'Use de 3 a 20 caracteres: letras minúsculas, números, ponto ou sublinhado.'),
  email,
  ensName: z.string().trim().refine((value) => value === '' || ens.test(value), 'Use apenas letras, números, hífen e ponto.'),
  walletNickname: z.string().trim().min(1, 'Informe o apelido da carteira.'),
})

export type ProfileValues = z.infer<typeof profileSchema>
export const PROFILE_FIELDS = ['displayName', 'username', 'email', 'ensName', 'walletNickname'] as const

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual.'),
    newPassword: password,
    confirmPassword: z.string().min(1, 'Confirme a nova senha.'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem.',
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ['newPassword'],
    message: 'A nova senha deve ser diferente da atual.',
  })

export type PasswordValues = z.infer<typeof passwordSchema>
export const PASSWORD_FIELDS = ['currentPassword', 'newPassword'] as const

const required = (message: string) => z.string().trim().min(1, message)

export const walletSchema = z.object({
  displayName: required('Informe o nome de exibição.'),
  nickname: required('Informe o apelido da carteira.'),
  // '' = ainda não escolhido (carteira nova).
  network: z
    .union([z.enum(Object.keys(NFT_NETWORKS) as [NftNetwork, ...NftNetwork[]]), z.literal('')])
    .refine((value) => value !== '', 'Selecione uma rede.'),
  profileName: required('Informe o nome do perfil.'),
  address: z.string().trim().regex(/^0x[a-fA-F0-9]{40}$/, 'Informe um endereço 0x com 40 caracteres hexadecimais.'),
  secondaryAddress: z.string().trim(),
  type: z
    .union([z.enum(Object.keys(WALLET_TYPES) as [WalletType, ...WalletType[]]), z.literal('')])
    .refine((value) => value !== '', 'Selecione o tipo de carteira.'),
  referralCode: required('Informe o código de indicação.'),
  email,
  ensName: z.string().trim().regex(ens, 'Informe um nome ENS válido.'),
})

/** Valores do formulário; `network` e `type` começam vazios em uma carteira nova. */
export type WalletValues = z.input<typeof walletSchema>
export type WalletOutput = z.output<typeof walletSchema>

export const WALLET_FIELDS = [
  'displayName',
  'nickname',
  'network',
  'profileName',
  'address',
  'secondaryAddress',
  'type',
  'referralCode',
  'email',
  'ensName',
] as const
