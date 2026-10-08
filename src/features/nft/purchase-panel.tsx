import { useNavigate } from '@tanstack/react-router'
import { ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import { QuantityStepper } from '@/components/forms/quantity-stepper'
import { Button } from '@/components/ui/button'
import { useAddToCart } from '@/features/cart/use-cart'
import { FavoriteButton } from '@/features/favorites/favorite-button'
import { formatEth, mulEth } from '@/lib/eth'
import { errorMessage } from '@/lib/forms'
import { HttpError } from '@/lib/http'
import { cn } from '@/lib/utils'
import { limitOf, type PurchaseState } from '@/features/nft/purchase-state'
import type { NftDetail, NftEdition } from '@/types/nft'

function availabilityHint(edition: NftEdition) {
  if (edition.available === 0) return 'Edição esgotada.'
  if (edition.available <= 5) return `Restam ${edition.available} ${edition.available === 1 ? 'unidade' : 'unidades'}.`
  return `Máximo de ${edition.maxPerOrder} por pedido.`
}

export function EditionPicker({ nft, state }: { nft: NftDetail; state: PurchaseState }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-bold md:text-base">Edição:</legend>
      <div role="radiogroup" aria-label="Edição" className="flex flex-wrap gap-2">
        {nft.editions.map((edition) => {
          const selected = edition.id === state.edition.id
          const soldOut = edition.available === 0
          return (
            <button
              key={edition.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`Edição ${edition.label}, ${formatEth(edition.price)}${soldOut ? ', esgotada' : ''}`}
              onClick={() => state.setEdition(edition.id)}
              className={cn(
                'h-7 rounded-full border px-2.5 text-sm transition-colors',
                selected ? 'border-primary font-bold text-primary' : 'border-border hover:border-primary',
                soldOut && 'text-muted-foreground line-through decoration-1',
              )}
            >
              {edition.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

/** Quantidade, compra e favoritos (desktop). No mobile, ver `MobilePurchaseBar`. */
export function PurchaseActions({ nft, state }: { nft: NftDetail; state: PurchaseState }) {
  const buy = useBuy(nft, state)
  const limit = limitOf(state.edition)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <QuantityStepper
          value={state.quantity}
          max={Math.max(1, limit)}
          onChange={state.setQuantity}
          itemName={nft.name}
          disabled={limit === 0}
        />
        <div className="flex gap-3">
          <Button onClick={buy.run} disabled={limit === 0 || buy.isPending} className="w-40 uppercase">
            {limit === 0 ? 'Esgotado' : buy.isPending ? 'Adicionando…' : 'Comprar'}
          </Button>
          <FavoriteButton nftId={nft.id} name={nft.name} variant="full" className="w-32" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {availabilityHint(state.edition)}
      </p>
    </div>
  )
}

/** Barra fixa inferior do mobile (frame mobile-02): quantidade, total e compra. */
export function MobilePurchaseBar({ nft, state }: { nft: NftDetail; state: PurchaseState }) {
  const buy = useBuy(nft, state)
  const navigate = useNavigate()
  const limit = limitOf(state.edition)

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 rounded-t-3xl bg-card px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span aria-hidden="true">Qtd.</span>
          <QuantityStepper value={state.quantity} max={Math.max(1, limit)} onChange={state.setQuantity} itemName={nft.name} disabled={limit === 0} size="sm" />
        </div>
        <p className="text-lg font-bold text-primary">
          <span className="sr-only">Total: </span>
          {formatEth(mulEth(state.edition.price, state.quantity))}
        </p>
      </div>
      <div className="mt-3 flex gap-3">
        <Button onClick={buy.run} disabled={limit === 0 || buy.isPending} size="lg" className="flex-1 rounded-full">
          {limit === 0 ? 'Esgotado' : buy.isPending ? 'Adicionando…' : 'Comprar NFT'}
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-12 rounded-full border-border"
          aria-label="Ir para o carrinho"
          onClick={() => void navigate({ to: '/carrinho' })}
        >
          <ShoppingCart className="size-5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}

/** Adiciona ao carrinho e segue para ele; conflitos de estoque mostram o motivo. */
function useBuy(nft: NftDetail, state: PurchaseState) {
  const addToCart = useAddToCart()
  const navigate = useNavigate()
  return {
    isPending: addToCart.isPending,
    run() {
      addToCart.mutate(
        { nftId: nft.id, editionId: state.edition.id, quantity: state.quantity },
        {
          onSuccess: () => {
            toast.success(`${nft.name} (${state.edition.label}) adicionado ao carrinho.`)
            void navigate({ to: '/carrinho' })
          },
          onError: (error) => {
            const conflict = error instanceof HttpError && error.kind === 'CONFLICT'
            toast.error(conflict ? `${errorMessage(error)} Itens já no carrinho contam para o limite.` : errorMessage(error))
          },
        },
      )
    },
  }
}
