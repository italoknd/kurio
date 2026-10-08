import { useId, type ComponentProps } from 'react'
import { cn } from '@/lib/utils'

interface EnsFieldProps extends ComponentProps<'input'> {
  label: string
  required?: boolean
  error?: string
}

/** Nome ENS sem o sufixo: o ".eth" é fixo ao lado do campo (frames 04, 08 e 09). */
export function EnsField({ label, required, error, className, id, ...props }: EnsFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const suffixId = `${inputId}-sufixo`
  const errorId = `${inputId}-erro`

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={inputId} className="text-sm">
        {label}
        {required && (
          <span className="ml-0.5 text-required" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <div className="flex items-center">
        <input
          id={inputId}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${errorId} ${suffixId}` : suffixId}
          autoComplete="off"
          spellCheck={false}
          className="h-10 min-w-0 flex-1 rounded-l-md border border-r-0 border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
          {...props}
        />
        <span id={suffixId} className="flex h-10 items-center rounded-r-md border border-input px-3 text-sm text-muted-foreground">
          .eth
        </span>
      </div>
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
