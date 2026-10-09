import { useNavigate } from '@tanstack/react-router'
import { Copy, TicketPercent } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useOffers } from '@/features/account/queries'
import { useApplyCoupon } from '@/features/cart/use-cart'
import { NftCard, NftCardSkeleton } from '@/features/catalog/nft-card'
import { errorMessage } from '@/lib/forms'
import { usePageTitle } from '@/lib/use-page-title'
import { cn } from '@/lib/utils'
import type { CouponOffer } from '@/types/account'

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

/** Ofertas: cupons vigentes/expirados e NFTs com preço reduzido. */
export function OffersPage() {
  usePageTitle('Ofertas')
  const offers = useOffers()

  if (offers.isError && !offers.data) {
    return (
      <section role="alert" className="flex flex-col items-start gap-3">
        <h1 className="text-lg font-bold">Não foi possível carregar as ofertas</h1>
        <p className="text-muted-foreground">{errorMessage(offers.error)}</p>
        <Button onClick={() => void offers.refetch()} disabled={offers.isFetching}>Tentar novamente</Button>
      </section>
    )
  }

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="cupons-titulo">
        <h1 id="cupons-titulo" className="text-lg font-bold">Ofertas</h1>
        <p className="mt-1 text-sm text-muted-foreground">Cupons para usar no carrinho e NFTs com preço reduzido.</p>
        <h2 className="mt-6 text-base font-bold">Cupons</h2>
        <ul className="mt-3 grid gap-3 md:grid-cols-2">
          {offers.data
            ? offers.data.coupons.map((coupon) => <CouponCard key={coupon.code} coupon={coupon} />)
            : [0, 1].map((i) => <li key={i}><Skeleton className="h-[148px] w-full" /></li>)}
        </ul>
      </section>

      <section aria-labelledby="reducoes-titulo">
        <h2 id="reducoes-titulo" className="border-b border-border pb-3 text-base font-bold text-primary">Preço reduzido</h2>
        {offers.data && offers.data.priceDrops.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Nenhum NFT com preço reduzido no momento.</p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-6">
            {offers.data
              ? offers.data.priceDrops.map((nft) => <NftCard key={nft.id} nft={nft} />)
              : [0, 1, 2].map((i) => <NftCardSkeleton key={i} />)}
          </div>
        )}
      </section>
    </div>
  )
}

function CouponCard({ coupon }: { coupon: CouponOffer }) {
  const apply = useApplyCoupon()
  const navigate = useNavigate()

  async function copy() {
    try {
      await navigator.clipboard.writeText(coupon.code)
      toast.success(`Código ${coupon.code} copiado.`)
    } catch {
      toast.error('Não foi possível copiar. Selecione o código e copie manualmente.')
    }
  }

  function applyInCart() {
    apply.mutate(coupon.code, {
      onSuccess: () => {
        toast.success(`Cupom ${coupon.code} aplicado ao carrinho.`)
        void navigate({ to: '/carrinho' })
      },
      onError: (error) => toast.error(errorMessage(error)),
    })
  }

  return (
    <li className={cn('flex flex-col gap-3 rounded-md border p-4', coupon.active ? 'border-primary bg-card' : 'border-border opacity-70')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <TicketPercent className="size-6 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="font-bold tracking-wider select-all">{coupon.code}</p>
            <p className="text-sm text-muted-foreground">{coupon.description}</p>
          </div>
        </div>
        <span className="text-lg font-bold text-primary">{coupon.percent}%</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {coupon.active ? `Válido até ${dateFormat.format(new Date(coupon.expiresAt))}` : `Expirou em ${dateFormat.format(new Date(coupon.expiresAt))}`}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => void copy()} aria-label={`Copiar código ${coupon.code}`}>
          <Copy aria-hidden="true" />
          Copiar código
        </Button>
        <Button size="sm" onClick={applyInCart} disabled={!coupon.active || apply.isPending} aria-label={`Usar o cupom ${coupon.code} no carrinho`}>
          {coupon.active ? (apply.isPending ? 'Aplicando…' : 'Usar no carrinho') : 'Expirado'}
        </Button>
      </div>
    </li>
  )
}
