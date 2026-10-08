import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/feedback/page-placeholder'
import { requireAuth } from '@/features/auth/guards'

export const Route = createFileRoute('/pagamento')({
  staticData: { requiresAuth: true },
  beforeLoad: requireAuth,
  component: () => <PagePlaceholder title="Pagamento" frame="desktop-04-pagamento.png" />,
})
