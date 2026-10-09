import { useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CircleX, ExternalLink, Loader2, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { queryKeys } from '@/api/query-keys'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/features/auth/session'
import { useOrder } from '@/features/checkout/use-checkout'
import { compareEth, formatEth } from '@/lib/eth'
import { errorMessage } from '@/lib/forms'
import { HttpError } from '@/lib/http'
import { usePageTitle } from '@/lib/use-page-title'
import { cn } from '@/lib/utils'
import { NFT_NETWORKS, type NftNetwork } from '@/types/nft'
import type { Order, OrderStatus } from '@/types/order'

const EXPLORER_NAMES: Record<NftNetwork, string> = {
  ethereum: 'Etherscan',
  polygon: 'Polygonscan',
  solana: 'Solscan',
}

const TITLES: Record<OrderStatus, string> = {
  pending: 'Pedido em processamento',
  confirmed: 'Pedido confirmado',
  rejected: 'Pagamento recusado',
}

/**
 * Acompanhamento do pedido: pendente (atualizado por `order.updated` e, como reserva,
 * por consulta periódica), recusado ou confirmado com o recibo (frame desktop-05).
 * O recibo reproduz o snapshot do pedido, nunca o catálogo atual.
 */
export function OrderPage({ orderId }: { orderId: string }) {
  const query = useOrder(orderId)
  const order = query.data
  usePageTitle(order ? TITLES[order.status] : query.isError ? 'Pedido não encontrado' : 'Pedido')
  useStatusChange(order)

  if (query.isError && !order) {
    const notFound = query.error instanceof HttpError && query.error.kind === 'NOT_FOUND'
    return (
      <section role="alert" className="container-site flex flex-col items-center gap-4 py-20 text-center">
        <h1 className="text-xl font-bold">{notFound ? 'Pedido não encontrado' : 'Não foi possível carregar o pedido'}</h1>
        <p className="text-muted-foreground">{notFound ? 'Este pedido não existe ou pertence a outra conta.' : errorMessage(query.error)}</p>
        {notFound ? (
          <Link to="/" className="inline-flex h-10 items-center rounded-md bg-primary px-4 font-bold text-primary-foreground hover:bg-primary-hover">
            Voltar ao início
          </Link>
        ) : (
          <Button onClick={() => void query.refetch()} disabled={query.isFetching}>Tentar novamente</Button>
        )}
      </section>
    )
  }

  if (!order) return <OrderSkeleton />
  if (order.status === 'confirmed') return <Receipt order={order} />
  return <OrderStatusView order={order} />
}

/** Na transição para confirmado/recusado: avisa, atualiza o carrinho e move o foco ao título. */
function useStatusChange(order: Order | undefined) {
  const queryClient = useQueryClient()
  const { user } = useSession()
  const userId = user?.id ?? null
  const previous = useRef<OrderStatus | null>(null)

  useEffect(() => {
    if (!order) return
    const before = previous.current
    previous.current = order.status
    if (before !== 'pending' || order.status === 'pending') return

    if (order.status === 'confirmed') {
      toast.success('Pagamento confirmado! Seus NFTs estão na sua carteira.')
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart(userId) })
      if (userId) void queryClient.invalidateQueries({ queryKey: queryKeys.user.downloads(userId) })
    } else {
      toast.error('O pagamento foi recusado. Seus itens continuam no carrinho.')
    }
    document.getElementById('pedido-titulo')?.focus()
  }, [order, queryClient, userId])
}

function OrderStatusView({ order }: { order: Order }) {
  const pending = order.status === 'pending'
  return (
    <section aria-labelledby="pedido-titulo" className="container-site flex flex-col items-center gap-5 py-16 text-center md:py-24">
      {pending ? (
        <Loader2 className="size-12 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
      ) : (
        <CircleX className="size-12 text-destructive" aria-hidden="true" />
      )}
      <h1 id="pedido-titulo" tabIndex={-1} className="text-xl font-bold outline-none md:text-2xl">
        {TITLES[order.status]}
      </h1>
      <p role="status" className="max-w-lg text-muted-foreground">
        {pending
          ? `Aguardando a confirmação da rede ${NFT_NETWORKS[order.network]}. Você pode sair desta página: o pedido continua sendo processado.`
          : `${order.rejectionReason ?? 'O pagamento não foi concluído.'} Nenhum valor foi cobrado e seus itens continuam no carrinho.`}
      </p>
      <p className="text-sm">
        Total: <span className="font-bold text-primary">{formatEth(order.total)}</span> · Pedido {order.id}
      </p>
      {!pending && (
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/carrinho" className="inline-flex h-10 items-center rounded-md bg-primary px-4 font-bold text-primary-foreground hover:bg-primary-hover">
            Voltar ao carrinho
          </Link>
          <Link to="/pagamento" className="inline-flex h-10 items-center rounded-md border border-primary px-4 font-bold text-primary hover:bg-primary/10">
            Tentar novamente
          </Link>
        </div>
      )}
    </section>
  )
}

function shortHash(hash: string) {
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`
}

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

/** Recibo do pedido confirmado (frame desktop-05). */
function Receipt({ order }: { order: Order }) {
  const transaction = order.transaction!
  const explorer = EXPLORER_NAMES[order.network]

  return (
    <div className="container-site flex justify-center py-10 md:py-16">
      <article aria-labelledby="pedido-titulo" className="relative w-full max-w-[578px] border-b-10 border-primary bg-card">
        <Link
          to="/"
          aria-label="Fechar recibo e voltar ao início"
          className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-sm text-primary hover:bg-primary/10"
        >
          <X className="size-4" aria-hidden="true" />
        </Link>

        <header className="flex flex-col items-center gap-4 px-6 pt-6 pb-5 text-center">
          <ThankYouIcon />
          <h1 id="pedido-titulo" tabIndex={-1} className="text-base font-bold text-muted-foreground outline-none">
            Seus NFTs agora estão na sua carteira
          </h1>
        </header>

        <dl className="grid grid-cols-2 gap-y-3 border-y border-primary px-6 py-3 text-sm sm:grid-cols-4 sm:divide-x sm:divide-primary">
          <Fact label="ID da transação" value={shortHash(transaction.hash)} title={transaction.hash} strong />
          <Fact label="Data" value={dateFormat.format(new Date(transaction.confirmedAt))} />
          <Fact label="Total" value={formatEth(order.total)} />
          <Fact label="Carteira" value={order.wallet.label} strong />
        </dl>

        <section aria-labelledby="detalhes-transacao" className="px-6 pt-6 pb-10 sm:px-11">
          <h2 id="detalhes-transacao" className="text-sm font-bold">Detalhes da transação</h2>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th scope="col" className="pb-2 font-bold">NFTs</th>
                <th scope="col" className="pb-2 text-center font-bold">Edições</th>
                <th scope="col" className="pb-2 text-right font-bold">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={`${item.nftId}-${item.editionId}`}>
                  <td className="py-2">
                    <div className="flex items-center gap-3">
                      <img src={item.image} alt={item.imageAlt} width={56} height={56} loading="lazy" className="size-14 shrink-0 rounded-sm object-cover" />
                      <div className="min-w-0">
                        <p className="font-bold">{item.name}</p>
                        <p className="text-xs text-muted-foreground">ID do token: {item.tokenId} · {item.editionLabel}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 text-center text-xs text-muted-foreground">(x {item.quantity})</td>
                  <td className="py-2 text-right font-bold whitespace-nowrap text-primary">{formatEth(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="mt-3 flex flex-col gap-2 border-b border-border pb-3 text-sm sm:ml-auto sm:w-3/5">
            {compareEth(order.discount, '0') !== 0 && (
              <div className="flex justify-between">
                <dt>Desconto{order.coupon ? ` (${order.coupon.code})` : ''}</dt>
                <dd className="tabular-nums">(-) {formatEth(order.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt>Taxa de rede</dt>
              <dd className="tabular-nums">{formatEth(order.networkFee)}</dd>
            </div>
            <div className="flex justify-between font-bold">
              <dt>Total</dt>
              <dd className="text-base text-primary tabular-nums">{formatEth(order.total)}</dd>
            </div>
          </dl>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Transação confirmada na {NFT_NETWORKS[order.network]}. A propriedade foi transferida para sua carteira conectada e
            registrada na rede.
          </p>
          <div className="mt-6 flex flex-col items-center gap-2">
            <a
              href={transaction.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center gap-2 rounded-md bg-primary px-4 font-bold text-primary-foreground hover:bg-primary-hover"
            >
              Ver no {explorer}
              <ExternalLink className="size-4" aria-hidden="true" />
              <span className="sr-only">(abre em nova aba; transação simulada)</span>
            </a>
            <p className="text-xs text-muted-foreground">Transação simulada: o link não corresponde a uma transação real.</p>
          </div>
        </section>
      </article>
    </div>
  )
}

function Fact({ label, value, title, strong }: { label: string; value: string; title?: string; strong?: boolean }) {
  return (
    <div className="flex flex-col px-2 first:pl-0 sm:px-3">
      <dt className={cn(strong && 'font-bold')}>{label}</dt>
      <dd title={title} className="text-muted-foreground">{value}</dd>
    </div>
  )
}

/** Ilustração "Thank you" do frame 05 (traço em `primary`). */
function ThankYouIcon() {
  return (
    <svg width="68" height="82" viewBox="0 0 68 82" fill="none" aria-hidden="true" className="text-primary">
      <path d="M8 34 34 54 60 34" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M3 32v46h62V32L34 8 3 32Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M3 78 26 58M65 78 42 58" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="11" y="4" width="46" height="36" rx="3" fill="var(--card)" stroke="currentColor" strokeWidth="2.5" />
      <text x="34" y="20" textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor">THANK</text>
      <text x="34" y="33" textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor">YOU</text>
    </svg>
  )
}

function OrderSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando pedido" className="container-site flex justify-center py-16">
      <div className="flex w-full max-w-[578px] flex-col gap-4">
        <Skeleton className="mx-auto size-16" />
        <Skeleton className="h-6 w-2/3 self-center" />
        <Skeleton className="h-14 w-full" />
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    </div>
  )
}
