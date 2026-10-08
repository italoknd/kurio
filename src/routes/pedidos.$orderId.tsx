import { createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '@/features/auth/guards'
import { OrderPage } from '@/features/orders/order-page'

export const Route = createFileRoute('/pedidos/$orderId')({
  staticData: { requiresAuth: true },
  beforeLoad: requireAuth,
  component: OrderRoute,
})

function OrderRoute() {
  const { orderId } = Route.useParams()
  // `key`: ao abrir outro pedido, o acompanhamento de status recomeça.
  return <OrderPage key={orderId} orderId={orderId} />
}
