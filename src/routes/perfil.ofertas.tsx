import { createFileRoute } from '@tanstack/react-router'
import { OffersPage } from '@/features/account/offers-page'

export const Route = createFileRoute('/perfil/ofertas')({
  component: OffersPage,
})
