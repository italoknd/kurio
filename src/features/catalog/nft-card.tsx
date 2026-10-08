import { Link } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { FavoriteButton } from '@/features/favorites/favorite-button'
import { formatEth } from '@/lib/eth'
import { cn } from '@/lib/utils'
import type { NftSummary } from '@/types/nft'

interface NftCardProps {
  nft: NftSummary
  /** Imagem acima da dobra: carrega com prioridade (melhora o LCP). */
  priority?: boolean
  className?: string
}

/** Card do catálogo (frames desktop-01 e mobile-01). */
export function NftCard({ nft, priority = false, className }: NftCardProps) {
  return (
    <article className={cn('group relative flex flex-col', className)}>
      <div className="relative flex aspect-[258/300] items-center justify-center bg-card p-1 sm:p-1.5">
        <img
          src={nft.image}
          alt={nft.imageAlt}
          width={250}
          height={250}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          className="aspect-square w-full rounded-2xl object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        {nft.rare && (
          <span className="absolute top-3 left-0 bg-primary px-2.5 py-0.5 text-sm font-bold text-primary-foreground">
            RARO
          </span>
        )}
        {!nft.available && (
          <span className="absolute right-3 bottom-3 rounded-sm bg-background/90 px-2 py-0.5 text-xs font-bold text-foreground">
            Esgotado
          </span>
        )}
        <FavoriteButton nftId={nft.id} name={nft.name} className="absolute top-3 right-3 z-10" />
      </div>

      <h3 className="mt-3 truncate text-sm sm:text-base">
        <Link
          to="/nft/$nftId"
          params={{ nftId: nft.id }}
          className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-ring"
        >
          {nft.name}
        </Link>
      </h3>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm sm:text-lg">
        <span className="font-bold text-primary">
          <span className="sr-only">Preço: </span>
          {formatEth(nft.price)}
        </span>
        {nft.previousPrice && (
          <span className="text-muted-foreground line-through">
            <span className="sr-only">Preço anterior: </span>
            {formatEth(nft.previousPrice)}
          </span>
        )}
      </p>
    </article>
  )
}

/** Placeholder com as mesmas dimensões do card (evita deslocamento de layout). */
export function NftCardSkeleton() {
  return (
    <div className="flex flex-col" aria-hidden="true">
      <Skeleton className="aspect-[258/300] w-full rounded-none" />
      <Skeleton className="mt-3 h-5 w-3/4" />
      <Skeleton className="mt-1.5 h-6 w-1/3" />
    </div>
  )
}
