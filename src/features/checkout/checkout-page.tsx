import { Link, useNavigate } from '@tanstack/react-router'
import { AlertTriangle, Clock, Wallet as WalletIcon } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { Controller, useForm, useWatch, type UseFormReturn } from 'react-hook-form'
import { EnsField } from '@/components/forms/ens-field'
import { SelectField } from '@/components/forms/select-field'
import { TextField } from '@/components/forms/text-field'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useSession } from '@/features/auth/session'
import { useCart, useCartQuote, useIsCartChanging } from '@/features/cart/use-cart'
import { checkoutStorage, type CheckoutAttempt } from '@/features/checkout/checkout-storage'
import { ReviewDialog } from '@/features/checkout/review-dialog'
import { CHECKOUT_FIELDS, checkoutSchema, type CheckoutValues } from '@/features/checkout/schemas'
import {
  buildAttempt,
  isUnresolved,
  useCreateOrder,
  usePendingOrders,
  useWalletConnection,
  useWallets,
} from '@/features/checkout/use-checkout'
import { formatEth } from '@/lib/eth'
import { applyServerErrors, errorMessage, zodResolver } from '@/lib/forms'
import { HttpError } from '@/lib/http'
import { usePageTitle } from '@/lib/use-page-title'
import { cn } from '@/lib/utils'
import type { User } from '@/types/auth'
import type { Cart, Quote } from '@/types/cart'
import { NFT_NETWORKS, type NftNetwork } from '@/types/nft'
import type { Order } from '@/types/order'
import { WALLET_TYPES, type Wallet } from '@/types/wallet'

const FORM_ID = 'checkout-form'
const CONNECTION_STATUS_ID = 'conexao-carteira'

/** Pagamento (frames desktop-04 e mobile-04). Rota privada. */
export function CheckoutPage() {
  usePageTitle('Pagamento')
  const { user } = useSession()
  const cart = useCart()
  const wallets = useWallets()
  const pending = usePendingOrders()

  const failed = [cart, wallets].find((query) => query.isError && !query.data)
  if (failed) {
    return (
      <section role="alert" className="container-site flex flex-col items-center gap-4 py-20 text-center">
        <h1 className="text-xl font-bold">Não foi possível carregar o pagamento</h1>
        <p className="text-muted-foreground">{errorMessage(failed.error)}</p>
        <Button onClick={() => void failed.refetch()} disabled={failed.isFetching}>
          {failed.isFetching ? 'Tentando…' : 'Tentar novamente'}
        </Button>
      </section>
    )
  }

  if (!user || !cart.data || !wallets.data) return <CheckoutSkeleton />

  return (
    <CheckoutContent
      key={user.id}
      user={user}
      cart={cart.data}
      wallets={wallets.data}
      pendingOrders={pending.data ?? []}
    />
  )
}

function defaultValues(user: User, wallets: Wallet[]): CheckoutValues {
  const wallet = wallets.find((w) => w.role === 'primary') ?? wallets[0]
  const draft = checkoutStorage.getDraft(user.id)
  if (draft && wallets.some((w) => w.id === draft.walletId)) return draft
  return {
    walletId: wallet?.id ?? '',
    network: wallet?.network ?? 'ethereum',
    collector: {
      displayName: wallet?.displayName ?? user.displayName,
      username: user.username,
      profileName: wallet?.profileName ?? '',
      email: wallet?.email ?? user.email,
      ensName: wallet?.ensName ?? user.ensName ?? '',
      referralCode: wallet?.referralCode ?? '',
      note: '',
    },
  }
}

interface ContentProps {
  user: User
  cart: Cart
  wallets: Wallet[]
  pendingOrders: Order[]
}

function CheckoutContent({ user, cart, wallets, pendingOrders }: ContentProps) {
  const navigate = useNavigate()
  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: defaultValues(user, wallets),
  })
  const [walletId, network] = useWatch({ control: form.control, name: ['walletId', 'network'] })
  const wallet = wallets.find((w) => w.id === walletId)

  const quote = useCartQuote(cart.items.length > 0, network)
  const changing = useIsCartChanging()
  const connection = useWalletConnection()
  const createOrder = useCreateOrder()
  const [unresolved, setUnresolved] = useState<CheckoutAttempt | null>(() => checkoutStorage.getAttempt(user.id))
  const [review, setReview] = useState<{ quote: Quote; values: CheckoutValues } | null>(null)

  // Rascunho do formulário: sobrevive a refresh e à expiração da sessão no checkout.
  useEffect(() => {
    return form.subscribe({
      formState: { values: true },
      callback: ({ values }) => checkoutStorage.setDraft(user.id, values),
    })
  }, [form, user.id])

  const quoteData = quote.data?.network === network ? quote.data : undefined
  const hasIssues = (quoteData?.issues.length ?? 0) > 0
  const blockedReason = unresolved
    ? 'Verifique a última tentativa antes de comprar de novo.'
    : wallets.length === 0
      ? 'Cadastre uma carteira para finalizar.'
      : quote.isError
        ? 'Não foi possível calcular os valores.'
        : hasIssues
          ? 'Há itens indisponíveis. Revise o carrinho.'
          : !quoteData || quote.isFetching || changing
            ? 'Atualizando os valores do pedido…'
            : connection.isConnecting
              ? 'Conectando à carteira…'
              : null

  function goToOrder(order: Order) {
    void navigate({ to: '/pedidos/$orderId', params: { orderId: order.id }, replace: true })
  }

  function handleOrderError(error: unknown) {
    if (isUnresolved(error)) {
      setUnresolved(checkoutStorage.getAttempt(user.id))
      return
    }
    setUnresolved(null)
    // Erros de campo (422) voltam ao formulário.
    if (error instanceof HttpError && error.kind === 'VALIDATION_ERROR' && applyServerErrors(error, form.setError, CHECKOUT_FIELDS)) {
      setReview(null)
    }
  }

  function send(attempt: CheckoutAttempt) {
    createOrder.mutate(attempt, { onSuccess: goToOrder, onError: handleOrderError })
  }

  const submit = form.handleSubmit(async (values) => {
    if (!quoteData || blockedReason) return
    if (!connection.isConnected(values.walletId, values.network)) {
      try {
        await connection.connect({ walletId: values.walletId, network: values.network })
      } catch {
        document.getElementById(CONNECTION_STATUS_ID)?.focus()
        return
      }
    }
    createOrder.reset()
    setReview({ quote: quoteData, values })
  })

  function confirm(reviewedQuote: Quote, values: CheckoutValues) {
    send(buildAttempt(user.id, { quoteId: reviewedQuote.id, network: values.network, walletId: values.walletId, collector: values.collector }))
  }

  return (
    <div className="pb-8">
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
          <li aria-current="page">Pagamento</li>
        </ol>
      </nav>
      <h1 className="container-site pt-6 text-center text-lg font-bold md:sr-only">Pagamento com carteira</h1>

      <div className="container-site mt-4 flex flex-col gap-3 md:mt-6">
        {pendingOrders.map((order) => (
          <p key={order.id} className="flex flex-wrap items-center gap-2 rounded-md border border-primary bg-card px-4 py-3 text-sm">
            <Clock className="size-4 text-primary" aria-hidden="true" />
            Você tem um pedido de {formatEth(order.total)} aguardando confirmação.
            <Link to="/pedidos/$orderId" params={{ orderId: order.id }} className="font-bold text-primary underline-offset-4 hover:underline">
              Acompanhar pedido
            </Link>
          </p>
        ))}
        {unresolved && !review && (
          <RecoveryNotice pending={createOrder.isPending} error={createOrder.error} onRetry={() => send(unresolved)} />
        )}
      </div>

      {cart.items.length === 0 ? (
        <section className="container-site flex flex-col items-center gap-4 py-16 text-center">
          <h2 className="text-xl font-bold">Seu carrinho está vazio</h2>
          <p className="text-muted-foreground">Adicione NFTs ao carrinho para finalizar uma compra.</p>
          <Link to="/" hash="catalogo" className="inline-flex h-10 items-center rounded-md bg-primary px-4 font-bold text-primary-foreground hover:bg-primary-hover">
            Explorar o catálogo
          </Link>
        </section>
      ) : (
        <div className="container-site mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_405px] lg:gap-8">
          <CollectorForm form={form} onSubmit={submit} wallets={wallets} />

          <div className="flex min-w-0 flex-col gap-6">
            <OrderItems cart={cart} />
            <QuoteSummary quote={quoteData} failed={quote.isError} onRetry={() => void quote.refetch()} updating={quote.isFetching || changing} />
            <WalletPicker
              form={form}
              wallets={wallets}
              wallet={wallet}
              network={network}
              connection={connection}
            />
            <SubmitArea reason={blockedReason} total={quoteData?.total} disabled={blockedReason !== null} className="hidden md:flex" />
          </div>

          {/* Mobile: total e botão acompanham a rolagem, acima da navegação inferior (frame mobile-04). */}
          <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 -mx-4 -mt-8 bg-background/95 px-4 pt-3 pb-4 md:hidden">
            <SubmitArea reason={blockedReason} total={quoteData?.total} disabled={blockedReason !== null} />
          </div>
        </div>
      )}

      {review && wallet && (
        <ReviewDialog
          reviewed={review.quote}
          live={quoteData}
          values={review.values}
          wallet={wallet}
          cart={cart}
          sending={createOrder.isPending}
          error={createOrder.error}
          unresolved={unresolved}
          onAcceptNewValues={(next) => {
            createOrder.reset()
            setReview({ ...review, quote: next })
          }}
          onConfirm={() => confirm(review.quote, review.values)}
          onRetry={() => unresolved && send(unresolved)}
          onClose={() => setReview(null)}
        />
      )}
    </div>
  )
}

function RecoveryNotice({ pending, error, onRetry }: { pending: boolean; error: Error | null; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-md border border-destructive bg-card px-4 py-3 text-sm sm:flex-row sm:items-center">
      <AlertTriangle className="size-4 shrink-0 text-destructive" aria-hidden="true" />
      <p className="flex-1">
        Sua última tentativa de compra não teve resposta do servidor. Verifique o pedido antes de comprar de novo: a
        verificação reenvia a mesma tentativa e nunca cria um pedido duplicado.
        {error && isUnresolved(error) && <span className="block text-destructive">{errorMessage(error)}</span>}
      </p>
      <Button onClick={onRetry} disabled={pending} variant="outline">
        {pending ? 'Verificando…' : 'Verificar pedido'}
      </Button>
    </div>
  )
}

function CollectorForm({
  form,
  onSubmit,
  wallets,
}: {
  form: UseFormReturn<CheckoutValues>
  onSubmit: () => void
  wallets: Wallet[]
}) {
  const { errors } = form.formState
  const c = errors.collector
  const noteId = useId()

  return (
    <form id={FORM_ID} onSubmit={onSubmit} noValidate aria-labelledby="perfil-colecionador" className="min-w-0">
      <h2 id="perfil-colecionador" className="text-lg font-bold">Perfil do colecionador</h2>
      <div className="mt-4 grid gap-x-6 gap-y-4 md:grid-cols-2">
        <TextField label="Nome de exibição" required autoComplete="name" error={c?.displayName?.message} {...form.register('collector.displayName')} />
        <TextField label="Nome de usuário" required autoComplete="username" error={c?.username?.message} {...form.register('collector.username')} />

        <Controller
          control={form.control}
          name="network"
          render={({ field }) => (
            <SelectField
              label="Rede"
              required
              value={field.value}
              onChange={field.onChange}
              options={NFT_NETWORKS}
              placeholder="Selecione uma rede"
              disabled={wallets.length === 0}
              error={errors.network?.message}
            />
          )}
        />
        <TextField label="Nome do perfil" required error={c?.profileName?.message} {...form.register('collector.profileName')} />

        <TextField label="Código de indicação" required error={c?.referralCode?.message} {...form.register('collector.referralCode')} />
        <TextField label="E-mail" required type="email" autoComplete="email" error={c?.email?.message} {...form.register('collector.email')} />

        <EnsField label="Nome ENS" required error={c?.ensName?.message} {...form.register('collector.ensName')} />

        <div className="flex flex-col gap-2 md:col-span-2">
          <label htmlFor={noteId} className="text-sm">Observação do colecionador (opcional)</label>
          <Textarea
            id={noteId}
            rows={5}
            aria-invalid={c?.note ? true : undefined}
            aria-describedby={c?.note ? `${noteId}-erro` : undefined}
            className="md:max-w-[350px]"
            {...form.register('collector.note')}
          />
          {c?.note && <p id={`${noteId}-erro`} className="text-xs text-destructive">{c.note.message}</p>}
        </div>
      </div>
    </form>
  )
}

function OrderItems({ cart }: { cart: Cart }) {
  return (
    <section aria-labelledby="seus-nfts">
      <h2 id="seus-nfts" className="text-lg font-bold">Seus NFTs</h2>
      <ul className="mt-3 flex flex-col gap-3">
        {cart.items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 bg-card p-1 pr-3">
            <img src={item.nft.image} alt={item.nft.imageAlt} width={64} height={64} loading="lazy" className="size-16 shrink-0 rounded-sm object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{item.nft.name}</p>
              <p className="text-xs text-muted-foreground">
                ID do token: {item.nft.tokenId} · Edição {item.editionLabel}
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              <span className="sr-only">Quantidade: </span>(x {item.quantity})
            </span>
            <span className="text-sm font-bold text-primary tabular-nums">
              <span className="sr-only">Subtotal: </span>
              {formatEth(item.lineTotal)}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-center text-sm">
        Tem um código promocional?{' '}
        <Link to="/carrinho" className="text-primary underline-offset-4 hover:underline">Aplique no carrinho</Link>
      </p>
    </section>
  )
}

function QuoteSummary({ quote, failed, onRetry, updating }: { quote: Quote | undefined; failed: boolean; onRetry: () => void; updating: boolean }) {
  if (failed && !quote) {
    return (
      <div role="alert" className="flex flex-col items-start gap-2 text-sm">
        <p className="text-destructive">Não foi possível calcular os valores do pedido.</p>
        <Button variant="outline" size="sm" onClick={onRetry}>Recalcular valores</Button>
      </div>
    )
  }
  if (!quote) {
    return (
      <div aria-busy="true" aria-label="Calculando valores" className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-6 w-full" />)}
      </div>
    )
  }
  return (
    <dl aria-label="Resumo do pedido" aria-busy={updating} className={cn('flex flex-col gap-3 text-sm transition-opacity md:text-base', updating && 'opacity-60')}>
      <Row label="Subtotal" value={formatEth(quote.subtotal)} />
      <Row label={quote.coupon ? `Desconto (${quote.coupon.code})` : 'Desconto'} value={`(-) ${formatEth(quote.discount)}`} />
      <div className="flex flex-col items-end">
        <Row label={`Taxa de rede (${NFT_NETWORKS[quote.network]})`} value={formatEth(quote.networkFee)} />
        <p className="text-xs text-primary">Taxa estimada</p>
      </div>
      <Row label="Total" value={formatEth(quote.total)} className="border-t border-border pt-4 font-bold [&_dd]:text-lg [&_dd]:text-primary" />
    </dl>
  )
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn('flex w-full items-baseline justify-between gap-4', className)}>
      <dt>{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </div>
  )
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

function WalletPicker({
  form,
  wallets,
  wallet,
  network,
  connection,
}: {
  form: UseFormReturn<CheckoutValues>
  wallets: Wallet[]
  wallet: Wallet | undefined
  network: NftNetwork
  connection: ReturnType<typeof useWalletConnection>
}) {
  if (wallets.length === 0) {
    return (
      <section aria-labelledby="carteira-rede" className="flex flex-col gap-3 rounded-md border border-border p-4">
        <h2 id="carteira-rede" className="font-bold">Carteira e rede</h2>
        <p className="text-sm text-muted-foreground">Você ainda não tem carteira cadastrada. Cadastre uma para finalizar a compra.</p>
        <Link to="/perfil/carteiras" className="self-start font-bold text-primary underline-offset-4 hover:underline">
          Cadastrar carteira
        </Link>
      </section>
    )
  }

  const connected = wallet ? connection.isConnected(wallet.id, network) : false
  const rejected = connection.error instanceof HttpError && connection.error.reason === 'WALLET_REJECTED'

  return (
    <section aria-labelledby="carteira-rede" className="flex flex-col gap-3">
      <h2 id="carteira-rede" className="text-center text-lg font-bold">Carteira e rede</h2>
      <Controller
        control={form.control}
        name="walletId"
        render={({ field }) => (
          <RadioGroup
            aria-labelledby="carteira-rede"
            value={field.value}
            onValueChange={(id) => {
              field.onChange(id)
              const next = wallets.find((w) => w.id === id)
              if (next) form.setValue('network', next.network)
              connection.disconnect()
            }}
            className="gap-3"
          >
            {wallets.map((item) => (
              <label
                key={item.id}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 transition-colors',
                  field.value === item.id ? 'border-primary' : 'border-border hover:border-primary/60',
                )}
              >
                <RadioGroupItem value={item.id} aria-label={`${item.nickname}: ${WALLET_TYPES[item.type]}, ${shortAddress(item.address)}`} className="mt-1" />
                <span className="flex min-w-0 flex-col gap-0.5 text-sm">
                  <span className="font-bold">{item.nickname} · {WALLET_TYPES[item.type]}</span>
                  <span className="text-muted-foreground">{item.secondaryAddress ?? shortAddress(item.address)}</span>
                  <span className="text-muted-foreground">Rede {NFT_NETWORKS[item.network]}</span>
                </span>
              </label>
            ))}
          </RadioGroup>
        )}
      />

      <div id={CONNECTION_STATUS_ID} tabIndex={-1} aria-live="polite" className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-4 py-3 text-sm outline-none">
        {connected && wallet ? (
          <>
            <span className="flex items-center gap-2">
              <WalletIcon className="size-4 text-primary" aria-hidden="true" />
              {WALLET_TYPES[wallet.type]} conectada na rede {NFT_NETWORKS[network]}.
            </span>
            <Button variant="ghost" size="sm" className="text-primary" onClick={connection.disconnect}>
              Desconectar
            </Button>
          </>
        ) : (
          <>
            <span className={cn(rejected || connection.error ? 'text-destructive' : 'text-muted-foreground')} role={connection.error ? 'alert' : undefined}>
              {connection.isConnecting
                ? 'Aguardando a carteira…'
                : connection.error
                  ? `${errorMessage(connection.error)} Tente novamente.`
                  : 'A carteira será conectada ao confirmar a compra.'}
            </span>
            {wallet && (
              <Button
                variant="outline"
                size="sm"
                disabled={connection.isConnecting}
                onClick={() => void connection.connect({ walletId: wallet.id, network }).catch(() => undefined)}
              >
                Conectar agora
              </Button>
            )}
          </>
        )}
      </div>
    </section>
  )
}

function SubmitArea({ reason, total, disabled, className }: { reason: string | null; total: string | undefined; disabled: boolean; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {total && (
        <p className="flex items-baseline justify-end gap-4 font-bold md:hidden">
          Total: <span className="text-lg text-primary">{formatEth(total)}</span>
        </p>
      )}
      <Button type="submit" form={FORM_ID} size="lg" disabled={disabled} className="w-full rounded-full text-base md:h-11 md:rounded-md">
        Confirmar compra
      </Button>
      <p aria-live="polite" className={cn('text-center text-xs text-muted-foreground', !reason && 'sr-only')}>
        {reason ?? 'Pronto para confirmar.'}
      </p>
    </div>
  )
}

function CheckoutSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando pagamento" className="container-site mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_405px] lg:gap-8">
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[72px] w-full" />)}
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    </div>
  )
}
