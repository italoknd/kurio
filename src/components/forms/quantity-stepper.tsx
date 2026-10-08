import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuantityStepperProps {
  value: number
  min?: number
  max: number
  onChange: (value: number) => void
  /** Nome do item, para rótulos acessíveis ("Diminuir quantidade de Emerald Ape #042"). */
  itemName: string
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
}

/** Seletor de quantidade inteira com limites (detalhe do NFT e carrinho). */
export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  itemName,
  disabled = false,
  size = 'md',
  className,
}: QuantityStepperProps) {
  const button = cn(
    'flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40',
    size === 'md' ? 'size-8' : 'size-6',
  )

  return (
    <div role="group" aria-label={`Quantidade de ${itemName}`} className={cn('flex items-center gap-3', className)}>
      <button
        type="button"
        className={button}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        aria-label={`Diminuir quantidade de ${itemName}`}
      >
        <Minus className={size === 'md' ? 'size-5' : 'size-4'} aria-hidden="true" />
      </button>
      <output aria-live="polite" aria-label={`Quantidade: ${value}`} className="min-w-6 text-center text-lg tabular-nums">
        {value}
      </output>
      <button
        type="button"
        className={button}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        aria-label={`Aumentar quantidade de ${itemName}`}
      >
        <Plus className={size === 'md' ? 'size-5' : 'size-4'} aria-hidden="true" />
      </button>
    </div>
  )
}
