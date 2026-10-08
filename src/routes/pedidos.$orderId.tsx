import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/feedback/page-placeholder'

export const Route = createFileRoute('/pedidos/$orderId')({
  component: () => <PagePlaceholder title="Confirmação do pedido" frame="desktop-05-confirmacao-pedido.png" />,
})
