import type { NftNetwork } from '@/types/nft'

export const WALLET_TYPES = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
} as const

export type WalletType = keyof typeof WALLET_TYPES

export type WalletRole = 'primary' | 'secondary'

export interface Wallet {
  id: string
  role: WalletRole
  displayName: string
  nickname: string
  profileName: string
  network: NftNetwork
  /** Endereço 0x da carteira. */
  address: string
  /** ENS ou endereço de carteira secundária (opcional). */
  secondaryAddress: string | null
  type: WalletType
  referralCode: string
  email: string
  /** Nome ENS sem o sufixo ".eth". */
  ensName: string
}

export type WalletInput = Omit<Wallet, 'id'>

/** POST /wallets/:id/connect — simulação da conexão com a extensão da carteira. */
export interface WalletConnection {
  walletId: string
  network: NftNetwork
  status: 'connected'
}
