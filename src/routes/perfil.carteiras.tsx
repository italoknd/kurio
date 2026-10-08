import { createFileRoute } from '@tanstack/react-router'
import { WalletsPage } from '@/features/profile/wallets-page'

export const Route = createFileRoute('/perfil/carteiras')({
  component: WalletsPage,
})
