import { z } from 'zod'
import { NFT_NETWORKS, type NftNetwork } from '@/types/nft'

/** Regras espelhadas da API (mocks/handlers/orders.ts), para feedback imediato. */

const required = (message: string) => z.string().trim().min(1, message)

export const checkoutSchema = z.object({
  walletId: z.string().min(1, 'Selecione uma carteira.'),
  network: z.enum(Object.keys(NFT_NETWORKS) as [NftNetwork, ...NftNetwork[]], { message: 'Selecione uma rede.' }),
  collector: z.object({
    displayName: required('Informe o nome de exibição.'),
    username: required('Informe o nome de usuário.'),
    profileName: required('Informe o nome do perfil.'),
    email: required('Informe o e-mail.').email('Informe um e-mail válido.'),
    ensName: required('Informe o nome ENS.').regex(/^[a-z0-9-]+(\.[a-z0-9-]+)*$/i, 'Use letras, números, hífen e ponto.'),
    referralCode: required('Informe o código de indicação.'),
    note: z.string().trim().max(500, 'Use no máximo 500 caracteres.'),
  }),
})

export type CheckoutValues = z.infer<typeof checkoutSchema>

/** Campos que podem receber erros da API (`fields`). */
export const CHECKOUT_FIELDS = [
  'walletId',
  'network',
  'collector.displayName',
  'collector.username',
  'collector.profileName',
  'collector.email',
  'collector.ensName',
  'collector.referralCode',
  'collector.note',
] as const
