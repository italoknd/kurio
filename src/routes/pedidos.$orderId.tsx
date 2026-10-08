import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/feedback/page-placeholder'
import { requireAuth } from '@/features/auth/guards'

export const Route = createFileRoute('/pedidos/$orderId')({
  staticData: { requiresAuth: true },
  beforeLoad: requireAuth,
  component: () => <PagePlaceholder title="Confirmação do pedido" frame="desktop-05-confirmacao-pedido.png" />,
})
