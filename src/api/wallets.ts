import { http } from '@/lib/http'
import type { NftNetwork } from '@/types/nft'
import type { Wallet, WalletConnection, WalletInput } from '@/types/wallet'

export const walletsApi = {
  list: (signal?: AbortSignal) => http.get<Wallet[]>('/wallets', { signal }).then((r) => r.data),
  create: (body: WalletInput) => http.post<Wallet>('/wallets', body).then((r) => r.data),
  update: (walletId: string, body: WalletInput) =>
    http.put<Wallet>(`/wallets/${encodeURIComponent(walletId)}`, body).then((r) => r.data),
  /** Simula a conexão com a extensão da carteira (pode ser recusada pelo cenário). */
  connect: (walletId: string, network: NftNetwork) =>
    http.post<WalletConnection>(`/wallets/${encodeURIComponent(walletId)}/connect`, { network }).then((r) => r.data),
}
