import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { AlertTriangle, ChevronLeft, ShoppingCart, Trash2 } from 'lucide-react'
import { useRef, type RefObject } from 'react'
import { toast } from 'sonner'
import { QuantityStepper } from '@/components/forms/quantity-stepper'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CouponForm } from '@/features/cart/coupon-form'
import {
  useAddToCart,
  useCart,
  useCartQuote,
  useIsCartChanging,
  useRemoveCartItem,
  useUpdateCartItem,
} from '@/features/cart/use-cart'
import { NftCard, NftCardSkeleton } from '@/features/catalog/nft-card'
import { nftListQuery } from '@/features/catalog/queries'
import { formatEth } from '@/lib/eth'
import { errorMessage } from '@/lib/forms'
import { usePageTitle } from '@/lib/use-page-title'
import { cn } from '@/lib/utils'
import type { Cart, CartItem, Quote, QuoteIssue } from '@/types/cart'
import { NFT_NETWORKS } from '@/types/nft'

/** Colunas da lista no desktop: NFT, preço, quantidade, total e remover. */
const ROW_GRID = 'md:grid md:grid-cols-[minmax(0,1fr)_96px_120px_112px_40px] md:items-center md:gap-4'

/** Carrinho de NFTs (frames desktop-03 e mobile-03). */
export function CartPage() {
  usePageTitle('Carrinho')
  const cart = useCart()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const hasItems = (cart.data?.items.length ?? 0) > 0

  return (
    <div>
      <CartHeader headingRef={headingRef} />

      {cart.isError && !cart.data ? (
        <section role="alert" className="container-site flex flex-col items-center gap-4 py-20 text-center">
          <h2 className="text-xl font-bold">Não foi possível carregar o carrinho</h2>
          <p className="text-muted-foreground">{errorMessage(cart.error)}</p>
          <Button onClick={() => void cart.refetch()} disabled={cart.isFetching}>
            {cart.isFetching ? 'Tentando…' : 'Tentar novamente'}
          </Button>
        </section>
      ) : !cart.data ? (
        <CartSkeleton />
      ) : hasItems ? (
        <CartContent cart={cart.data} headingRef={headingRef} />
      ) : (
        <CartEmpty />
      )}

      <Recommendations />
    </div>
  )
}

function CartHeader({ headingRef }: { headingRef: RefObject<HTMLHeadingElement | null> }) {
  const router = useRouter()
  return (
    <>
      <nav aria-label="Trilha de navegação" className="container-site hidden pt-8 text-sm font-bold md:block">
        <ol className="flex gap-2">
          <li>
            <Link to="/" className="hover:text-primary">Início</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link to="/" hash="catalogo" className="hover:text-primary">Mercado</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">Carrinho</li>
        </ol>
      </nav>

      {/* No mobile o título fica visível com o botão de voltar; no desktop, só para leitores de tela. */}
      <div className="container-site relative flex items-center justify-center pt-4 md:pt-0">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? router.history.back() : router.navigate({ to: '/' }))}
          aria-label="Voltar"
          className="absolute left-4 flex size-9 items-center justify-center rounded-full bg-card text-primary md:hidden"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <h1 ref={headingRef} tabIndex={-1} className="text-lg font-bold outline-none md:sr-only">
          Carrinho de NFTs
        </h1>
      </div>
    </>
  )
}

function CartContent({ cart, headingRef }: { cart: Cart; headingRef: RefObject<HTMLHeadingElement | null> }) {
  const quote = useCartQuote(true)
  const changing = useIsCartChanging()
  const issues = new Map((quote.data?.issues ?? []).map((issue) => [issue.itemId, issue]))
  const checkout = checkoutState(quote.data, quote.isError, changing || quote.isFetching)

  return (
    <div className="container-site mt-4 grid gap-8 md:mt-2 lg:grid-cols-[minmax(0,1fr)_332px] lg:gap-[86px]">
      <section aria-labelledby="itens-titulo" className="min-w-0">
        <h2 id="itens-titulo" className="sr-only">
          Itens ({cart.itemCount} {cart.itemCount === 1 ? 'unidade' : 'unidades'})
        </h2>
        <div aria-hidden="true" className={cn('hidden border-b border-border pb-3 text-base font-bold', ROW_GRID)}>
          <span>NFTs</span>
          <span>Preço</span>
          <span>Quantidade</span>
          <span>Total</span>
          <span />
        </div>
        <ul className="flex flex-col gap-4 md:mt-3 md:gap-3">
          {cart.items.map((item) => (
            <CartItemRow key={item.id} item={item} issue={issues.get(item.id)} headingRef={headingRef} />
          ))}
        </ul>
      </section>

      <CartSummary
        cart={cart}
        quote={quote.data}
        quoteError={quote.isError ? quote.error : null}
        onRetry={() => void quote.refetch()}
        checkout={checkout}
      />

      {/* Mobile: o botão acompanha a rolagem do carrinho, acima da navegação inferior. */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 -mx-4 -mt-8 bg-card px-6 pt-2 pb-4 md:hidden">
        <CheckoutButton checkout={checkout} />
      </div>
    </div>
  )
}

interface CheckoutState {
  blocked: boolean
  /** Motivo exibido (e anunciado) enquanto não é possível finalizar. */
  reason: string | null
  hasIssues: boolean
  updating: boolean
}

/** Só permite finalizar com uma cotação atual, sem erro e sem problemas de disponibilidade. */
function checkoutState(quote: Quote | undefined, quoteFailed: boolean, updating: boolean): CheckoutState {
  const hasIssues = (quote?.issues.length ?? 0) > 0
  const reason = quoteFailed
    ? 'Não foi possível calcular os valores.'
    : hasIssues
      ? 'Resolva os itens destacados para continuar.'
      : !quote || updating
        ? 'Atualizando os valores do pedido…'
        : null
  return { blocked: reason !== null, reason, hasIssues, updating }
}

function CheckoutButton({ checkout }: { checkout: CheckoutState }) {
  const navigate = useNavigate()
  return (
    <Button
      size="lg"
      disabled={checkout.blocked}
      onClick={() => void navigate({ to: '/pagamento' })}
      className="w-full rounded-full text-base shadow-lg md:h-10 md:rounded-md md:shadow-none"
    >
      Conectar e finalizar
    </Button>
  )
}

function issueMessage(issue: QuoteIssue) {
  if (issue.type === 'unavailable') return 'Esta edição esgotou. Remova o item para continuar.'
  return `Restam só ${issue.available} ${issue.available === 1 ? 'unidade' : 'unidades'}. Ajuste a quantidade para continuar.`
}

function CartItemRow({
  item,
  issue,
  headingRef,
}: {
  item: CartItem
  issue: QuoteIssue | undefined
  headingRef: RefObject<HTMLHeadingElement | null>
}) {
  const update = useUpdateCartItem(item.id)
  const remove = useRemoveCartItem()
  const addToCart = useAddToCart()
  const issueId = `item-${item.id}-problema`

  function changeQuantity(quantity: number) {
    update.mutate(quantity, { onError: (error) => toast.error(`${item.nft.name}: ${errorMessage(error)}`) })
  }

  function removeItem() {
    remove.mutate(item.id, {
      onSuccess: () => {
        // O botão removido sai da tela: o foco volta para o título da página.
        headingRef.current?.focus()
        toast.success(`${item.nft.name} (${item.editionLabel}) removido do carrinho.`, {
          action: {
            label: 'Desfazer',
            onClick: () =>
              addToCart.mutate(
                { nftId: item.nftId, editionId: item.editionId, quantity: item.quantity },
                { onError: (error) => toast.error(`Não foi possível devolver ${item.nft.name}: ${errorMessage(error)}`) },
              ),
          },
        })
      },
      onError: (error) => toast.error(errorMessage(error)),
    })
  }

  return (
    <li
      aria-describedby={issue ? issueId : undefined}
      className={cn(
        'relative flex flex-wrap gap-x-3 overflow-hidden rounded-xl bg-card md:rounded-none md:p-0',
        ROW_GRID,
        issue && 'outline-1 outline-destructive',
      )}
    >
      <div className="flex shrink-0 items-center gap-4 md:min-w-0 md:pr-2">
        <img
          src={item.nft.image}
          alt={item.nft.imageAlt}
          width={100}
          height={120}
          loading="lazy"
          decoding="async"
          className="h-[120px] w-[92px] object-cover md:size-[70px]"
        />
        <div className="hidden min-w-0 md:block">
          <ItemName item={item} />
          <p className="text-sm text-muted-foreground">ID do token: {item.nft.tokenId}</p>
          <p className="text-sm text-muted-foreground">Edição: {item.editionLabel}</p>
        </div>
      </div>

      {/* Mobile: nome, edição e total ao lado da imagem (frame mobile-03). */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-2 pr-2 md:hidden">
        <ItemName item={item} />
        <p className="text-sm text-muted-foreground">Edição: {item.editionLabel}</p>
        <p className="text-lg font-bold text-primary">
          <span className="sr-only">Total do item: </span>
          {formatEth(item.lineTotal)}
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="sr-only">Preço unitário: </span>
          {formatEth(item.unitPrice)} cada
        </p>
      </div>

      <p className="hidden text-base text-muted-foreground md:block">
        <span className="sr-only">Preço unitário: </span>
        {formatEth(item.unitPrice)}
      </p>

      <div className="flex shrink-0 flex-col items-center justify-center gap-2 py-2 pr-2 md:flex-row md:justify-start md:p-0">
        <QuantityStepper
          value={item.quantity}
          max={item.maxQuantity}
          onChange={changeQuantity}
          itemName={item.nft.name}
          size="sm"
          className="gap-2"
        />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={removeItem}
          disabled={remove.isPending}
          aria-label={`Remover ${item.nft.name} (${item.editionLabel}) do carrinho`}
          className="text-primary md:hidden"
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>

      <p className="hidden text-base font-bold text-primary md:block">
        <span className="sr-only">Total do item: </span>
        {formatEth(item.lineTotal)}
      </p>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={removeItem}
        disabled={remove.isPending}
        aria-label={`Remover ${item.nft.name} (${item.editionLabel}) do carrinho`}
        className="hidden text-primary md:inline-flex"
      >
        <Trash2 aria-hidden="true" />
      </Button>

      {issue && (
        <p
          id={issueId}
          className="col-span-full flex basis-full items-center gap-2 p-3 text-sm text-destructive md:pt-0"
        >
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          {issueMessage(issue)}
        </p>
      )}
    </li>
  )
}

function ItemName({ item }: { item: CartItem }) {
  return (
    <h3 className="truncate text-sm font-bold md:text-base">
      <Link to="/nft/$nftId" params={{ nftId: item.nftId }} className="hover:text-primary">
        {item.nft.name}
      </Link>
    </h3>
  )
}

function CartSummary({
  cart,
  quote,
  quoteError,
  onRetry,
  checkout,
}: {
  cart: Cart
  quote: Quote | undefined
  quoteError: Error | null
  onRetry: () => void
  checkout: CheckoutState
}) {
  return (
    <section
      aria-labelledby="resumo-titulo"
      className="-mx-4 flex flex-col gap-4 rounded-t-3xl bg-card px-6 pt-6 pb-2 md:mx-0 md:pb-6 md:rounded-3xl lg:self-start lg:rounded-none lg:bg-transparent lg:p-0"
    >
      <h2 id="resumo-titulo" className="sr-only md:not-sr-only md:border-b md:border-border md:pb-3 md:text-lg md:font-bold">
        Resumo da carteira
      </h2>

      <CouponForm appliedCode={cart.couponCode} coupon={quote?.coupon ?? null} />

      {quoteError && !quote ? (
        <div role="alert" className="flex flex-col items-start gap-2 text-sm">
          <p className="text-destructive">{errorMessage(quoteError)}</p>
          <Button variant="outline" size="sm" onClick={onRetry}>Recalcular valores</Button>
        </div>
      ) : quote ? (
        <dl aria-busy={checkout.updating} className={cn('flex flex-col gap-3 text-sm transition-opacity md:text-base', checkout.updating && 'opacity-60')}>
          <SummaryRow label="Subtotal" value={formatEth(quote.subtotal)} />
          <SummaryRow
            label={quote.coupon ? `Desconto (${quote.coupon.code})` : 'Desconto'}
            value={`(-) ${formatEth(quote.discount)}`}
          />
          <div className="flex flex-col items-end">
            <SummaryRow label={`Taxa de rede (${NFT_NETWORKS[quote.network]})`} value={formatEth(quote.networkFee)} className="w-full" />
            <p className="text-xs text-primary">Taxa estimada</p>
          </div>
          <SummaryRow
            label="Total"
            value={formatEth(quote.total)}
            className="mt-2 border-t border-border pt-4 font-bold md:mt-4 [&_dd]:text-lg [&_dd]:text-primary"
          />
        </dl>
      ) : (
        <SummarySkeleton />
      )}

      <p
        aria-live="polite"
        className={cn(
          'text-sm',
          checkout.hasIssues || quoteError ? 'text-destructive' : 'text-muted-foreground',
          !checkout.reason && 'sr-only',
        )}
      >
        {checkout.reason ?? 'Valores atualizados.'}
      </p>

      <div className="hidden flex-col gap-3 md:flex">
        <CheckoutButton checkout={checkout} />
        <Link to="/" hash="catalogo" className="self-center text-base text-primary hover:underline">
          Continuar explorando
        </Link>
      </div>
    </section>
  )
}

function SummaryRow({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4', className)}>
      <dt>{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </div>
  )
}

function SummarySkeleton() {
  return (
    <div aria-busy="true" aria-label="Calculando valores" className="flex flex-col gap-3">
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="mt-4 h-7 w-full" />
    </div>
  )
}

/** Mesmo layout do conteúdo (lista + resumo), para não deslocar a página ao carregar. */
function CartSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando carrinho" className="container-site mt-4 grid gap-8 md:mt-2 lg:grid-cols-[minmax(0,1fr)_332px] lg:gap-[86px]">
      <div className="flex flex-col gap-4 md:gap-3">
        <Skeleton className="hidden h-7 w-full md:block" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[120px] w-full rounded-xl md:h-[70px] md:rounded-none" />
        ))}
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="hidden h-7 w-1/2 md:block" />
        <Skeleton className="h-10 w-full" />
        <SummarySkeleton />
        <Skeleton className="h-12 w-full rounded-full md:h-10 md:rounded-md" />
      </div>
    </div>
  )
}

function CartEmpty() {
  return (
    <section className="container-site flex flex-col items-center gap-4 py-16 text-center md:py-20">
      <ShoppingCart className="size-12 text-primary" aria-hidden="true" />
      <h2 className="text-xl font-bold">Seu carrinho está vazio</h2>
      <p className="max-w-md text-muted-foreground">Explore o mercado e adicione os NFTs que você quer colecionar.</p>
      <Link
        to="/"
        hash="catalogo"
        className="mt-2 inline-flex h-10 items-center rounded-md bg-primary px-4 font-bold text-primary-foreground hover:bg-primary-hover"
      >
        Explorar o catálogo
      </Link>
    </section>
  )
}

function Recommendations() {
  const query = useQuery(nftListQuery({ tab: 'em-alta', sort: 'recentes', page: 1, pageSize: 5 }))
  const items = query.data?.items ?? []

  if (query.isError || (query.isSuccess && items.length === 0)) return null

  return (
    <section aria-labelledby="tambem-viram" className="container-site mt-16 md:mt-24">
      <h2 id="tambem-viram" className="border-b border-border pb-3 text-lg font-bold text-primary">
        Colecionadores também viram
      </h2>
      <div className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible lg:grid-cols-5 lg:gap-[26px]">
        {query.data
          ? items.map((item) => <NftCard key={item.id} nft={item} className="w-40 shrink-0 snap-start md:w-auto" />)
          : Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="w-40 shrink-0 md:w-auto">
                <NftCardSkeleton />
              </div>
            ))}
      </div>
    </section>
  )
}
