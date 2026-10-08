import { Link } from '@tanstack/react-router'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { CheckoutAttempt } from '@/features/checkout/checkout-storage'
import type { CheckoutValues } from '@/features/checkout/schemas'
import { isUnresolved } from '@/features/checkout/use-checkout'
import { formatEth } from '@/lib/eth'
import { errorMessage } from '@/lib/forms'
import { HttpError } from '@/lib/http'
import type { Cart, Quote } from '@/types/cart'
import { NFT_NETWORKS } from '@/types/nft'
import { WALLET_TYPES, type Wallet } from '@/types/wallet'

interface ReviewDialogProps {
  /** Cotação que o usuário está revisando (é a enviada ao confirmar). */
  reviewed: Quote
  /** Cotação atual: muda com eventos em tempo real ou com um 409 da API. */
  live: Quote | undefined
  values: CheckoutValues
  wallet: Wallet
  cart: Cart
  sending: boolean
  error: Error | null
  unresolved: CheckoutAttempt | null
  onAcceptNewValues: (quote: Quote) => void
  onConfirm: () => void
  onRetry: () => void
  onClose: () => void
}

/**
 * Revisão antes do envio. Se a cotação mudar enquanto o diálogo está aberto
 * (preço, disponibilidade, cupom ou taxa), o envio fica bloqueado até o usuário
 * revisar e aceitar os novos valores.
 */
export function ReviewDialog(props: ReviewDialogProps) {
  const { reviewed, live, values, wallet, cart, sending, error, unresolved } = props
  const changed = live !== undefined && live.id !== reviewed.id
  const liveIssues = (live?.issues.length ?? 0) > 0
  const timedOut = unresolved !== null && error !== null && isUnresolved(error)
  const conflict = error instanceof HttpError && error.kind === 'CONFLICT' ? error : null
  const itemImage = (itemId: string) => cart.items.find((item) => item.id === itemId)

  return (
    <Dialog open onOpenChange={(open) => !open && !sending && props.onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto rounded-none border-b-10 border-primary bg-card px-5 py-8 sm:max-w-xl sm:px-10">
        <div>
          <DialogTitle className="text-lg font-bold">Revise seu pedido</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">
            Confira os itens e os valores antes de confirmar o pagamento.
          </DialogDescription>
        </div>

        {(changed || liveIssues) && live && (
          <div role="alert" className="flex flex-col gap-3 rounded-md border border-destructive px-4 py-3 text-sm">
            <p className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
              {liveIssues
                ? 'Alguns itens não estão mais disponíveis na quantidade escolhida. Ajuste o carrinho para continuar.'
                : `Os valores mudaram desde a revisão: o total foi de ${formatEth(reviewed.total)} para ${formatEth(live.total)}. Revise e confirme novamente.`}
            </p>
            {liveIssues ? (
              <Link to="/carrinho" className="self-start font-bold text-primary underline-offset-4 hover:underline">Voltar ao carrinho</Link>
            ) : (
              <Button variant="outline" size="sm" className="self-start" onClick={() => props.onAcceptNewValues(live)}>
                Revisar novos valores
              </Button>
            )}
          </div>
        )}

        <ul aria-label="Itens do pedido" className="flex flex-col gap-3">
          {reviewed.items.map((item) => {
            const cartItem = itemImage(item.itemId)
            return (
              <li key={item.itemId} className="flex items-center gap-3">
                {cartItem && (
                  <img src={cartItem.nft.image} alt="" width={48} height={48} className="size-12 shrink-0 rounded-sm object-cover" />
                )}
                <div className="min-w-0 flex-1 text-sm">
                  <p className="truncate font-bold">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity} × {formatEth(item.unitPrice)}
                  </p>
                </div>
                <span className="text-sm font-bold text-primary tabular-nums">{formatEth(item.lineTotal)}</span>
              </li>
            )
          })}
        </ul>

        <dl className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
          <Line label="Carteira" value={`${wallet.nickname} · ${WALLET_TYPES[wallet.type]}`} />
          <Line label="Rede" value={NFT_NETWORKS[values.network]} />
          <Line label="Colecionador" value={`${values.collector.displayName} (${values.collector.ensName}.eth)`} />
          <Line label="Subtotal" value={formatEth(reviewed.subtotal)} />
          <Line label={reviewed.coupon ? `Desconto (${reviewed.coupon.code})` : 'Desconto'} value={`(-) ${formatEth(reviewed.discount)}`} />
          <Line label="Taxa de rede" value={formatEth(reviewed.networkFee)} />
          <Line label="Total" value={formatEth(reviewed.total)} strong />
        </dl>

        {timedOut ? (
          <div role="alert" className="flex flex-col gap-3 rounded-md border border-destructive px-4 py-3 text-sm">
            <p>
              {errorMessage(error)} Não sabemos se o pedido foi criado. Verifique antes de qualquer nova tentativa: a
              verificação reenvia a mesma tentativa e nunca duplica a compra.
            </p>
            <Button onClick={props.onRetry} disabled={sending} className="self-start">
              {sending ? 'Verificando…' : 'Verificar pedido'}
            </Button>
          </div>
        ) : (
          error && !(conflict?.reason === 'QUOTE_OUTDATED' && changed) && (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage(error)}
              {conflict?.reason === 'INSUFFICIENT_AVAILABILITY' && (
                <>
                  {' '}
                  <Link to="/carrinho" className="font-bold text-primary underline-offset-4 hover:underline">Voltar ao carrinho</Link>
                </>
              )}
            </p>
          )
        )}

        {!timedOut && (
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={props.onClose} disabled={sending}>
              Voltar e editar
            </Button>
            <Button onClick={props.onConfirm} disabled={sending || changed || liveIssues} aria-busy={sending}>
              {sending ? 'Enviando pedido…' : 'Confirmar e pagar'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? 'flex justify-between gap-4 border-t border-border pt-3 font-bold' : 'flex justify-between gap-4'}>
      <dt className={strong ? undefined : 'text-muted-foreground'}>{label}</dt>
      <dd className={strong ? 'text-lg text-primary tabular-nums' : 'text-right tabular-nums'}>{value}</dd>
    </div>
  )
}
