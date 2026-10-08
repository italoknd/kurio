import { Heart } from 'lucide-react'
import { useFavorites, useToggleFavorite } from '@/features/favorites/use-favorites'
import { cn } from '@/lib/utils'

interface FavoriteButtonProps {
  nftId: string
  name: string
  /** `icon`: botão redondo sobre o card; `full`: botão com texto (detalhe). */
  variant?: 'icon' | 'full'
  className?: string
}

export function FavoriteButton({ nftId, name, variant = 'icon', className }: FavoriteButtonProps) {
  const { ids } = useFavorites()
  const { toggle } = useToggleFavorite()
  const active = ids.has(nftId)
  const label = active ? `Remover ${name} dos favoritos` : `Favoritar ${name}`

  if (variant === 'full') {
    return (
      <button
        type="button"
        onClick={() => toggle(nftId, name, active)}
        aria-pressed={active}
        // O nome acessível contém o texto visível (WCAG 2.5.3) e identifica o NFT.
        aria-label={active ? `Favoritado: remover ${name} dos favoritos` : `Favoritar ${name}`}
        className={cn(
          'inline-flex h-10 items-center justify-center gap-2 rounded-md border border-primary px-4 text-sm font-bold text-primary transition-colors hover:bg-primary/10',
          className,
        )}
      >
        <Heart className={cn('size-5', active && 'fill-primary')} aria-hidden="true" />
        {active ? 'Favoritado' : 'Favoritar'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        // O botão fica sobre o link do card: não navega ao favoritar.
        event.preventDefault()
        event.stopPropagation()
        toggle(nftId, name, active)
      }}
      aria-pressed={active}
      aria-label={label}
      className={cn(
        'flex size-9 items-center justify-center rounded-full bg-background/80 text-primary transition-colors hover:bg-background',
        className,
      )}
    >
      <Heart className={cn('size-5', active && 'fill-primary')} aria-hidden="true" />
    </button>
  )
}
