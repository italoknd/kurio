import { Link } from '@tanstack/react-router'
import { Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useOrders } from '@/features/account/queries'
import { formatEth } from '@/lib/eth'
import { errorMessage } from '@/lib/forms'
import { usePageTitle } from '@/lib/use-page-title'
import { cn } from '@/lib/utils'
import { NFT_NETWORKS } from '@/types/nft'
import { ACTIVITY_FILTERS, FILTER_STATUS, type ActivityFilter } from '@/features/account/activity-filters'
import type { Order, OrderStatus } from '@/types/order'

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Em processamento',
  confirmed: 'Confirmado',
  rejected: 'Recusado',
}

const STATUS_CLASS: Record<OrderStatus, string> = {
  pending: 'border-primary text-primary',
  confirmed: 'border-emerald-400/60 text-emerald-300',
  rejected: 'border-destructive/70 text-destructive',
}

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/** Atividade: histórico de pedidos do colecionador, com filtro de status na URL. */
export function ActivityPage({ filter }: { filter: ActivityFilter }) {
  usePageTitle('Atividade')
  const orders = useOrders(FILTER_STATUS[filter])

  return (
    <section aria-labelledby="atividade-titulo">
      <h1 id="atividade-titulo" className="text-lg font-bold">Atividade</h1>
      <p className="mt-1 text-sm text-muted-foreground">Seus pedidos, do envio à confirmação na rede.</p>

      <nav aria-label="Filtrar pedidos por status" className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {(Object.keys(ACTIVITY_FILTERS) as ActivityFilter[]).map((id) => (
          <Link
            key={id}
            to="/perfil/atividade"
            search={id === 'todos' ? {} : { status: id }}
            aria-current={filter === id ? 'page' : undefined}
            className={cn(
              'h-8 shrink-0 rounded-full border px-3 text-sm leading-[30px] whitespace-nowrap transition-colors',
              filter === id ? 'border-primary font-bold text-primary' : 'border-border hover:border-primary',
            )}
          >
            {ACTIVITY_FILTERS[id]}
          </Link>
        ))}
      </nav>

      <div className="mt-6">
        {orders.isError && !orders.data ? (
          <div role="alert" className="flex flex-col items-start gap-3">
            <p className="text-muted-foreground">{errorMessage(orders.error)}</p>
            <Button onClick={() => void orders.refetch()} disabled={orders.isFetching}>Tentar novamente</Button>
          </div>
        ) : !orders.data ? (
          <div aria-busy="true" aria-label="Carregando pedidos" className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[104px] w-full" />)}
          </div>
        ) : orders.data.length === 0 ? (
          <EmptyActivity filtered={filter !== 'todos'} />
        ) : (
          <ul className={cn('flex flex-col gap-3 transition-opacity', orders.isFetching && 'opacity-70')} aria-busy={orders.isFetching}>
            {orders.data.map((order) => <OrderRow key={order.id} order={order} />)}
          </ul>
        )}
      </div>
    </section>
  )
}

function OrderRow({ order }: { order: Order }) {
  const units = order.items.reduce((sum, item) => sum + item.quantity, 0)
  const first = order.items[0]
  return (
    <li className="flex flex-col gap-3 bg-card p-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {first && <img src={first.image} alt="" width={64} height={64} loading="lazy" className="size-16 shrink-0 rounded-sm object-cover" />}
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">
            {first?.name}
            {order.items.length > 1 && <span className="font-normal text-muted-foreground"> e mais {order.items.length - 1}</span>}
          </p>
          <p className="text-xs text-muted-foreground">
            {dateFormat.format(new Date(order.createdAt))} · {units} {units === 1 ? 'unidade' : 'unidades'} · {NFT_NETWORKS[order.network]}
          </p>
          <p className="text-xs text-muted-foreground">Pedido {order.id}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-bold', STATUS_CLASS[order.status])}>
          {STATUS_LABEL[order.status]}
        </span>
        <span className="font-bold text-primary tabular-nums">{formatEth(order.total)}</span>
        <Link
          to="/pedidos/$orderId"
          params={{ orderId: order.id }}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-primary px-3 text-sm font-bold text-primary hover:bg-primary/10"
        >
          <Receipt className="size-4" aria-hidden="true" />
          {order.status === 'confirmed' ? 'Ver recibo' : 'Ver pedido'}
          <span className="sr-only"> {order.id}</span>
        </Link>
      </div>
    </li>
  )
}

function EmptyActivity({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-md border border-border p-6">
      <p className="font-bold">{filtered ? 'Nenhum pedido com este status.' : 'Você ainda não fez nenhum pedido.'}</p>
      {filtered ? (
        <Link to="/perfil/atividade" className="text-sm text-primary underline-offset-4 hover:underline">Ver todos os pedidos</Link>
      ) : (
        <Link to="/" hash="catalogo" className="text-sm text-primary underline-offset-4 hover:underline">Explorar o catálogo</Link>
      )}
    </div>
  )
}
