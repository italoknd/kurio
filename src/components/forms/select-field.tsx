import { useId } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface SelectFieldProps<T extends string> {
  label: string
  value: T | undefined
  onChange: (value: T) => void
  options: Record<T, string>
  placeholder: string
  required?: boolean
  disabled?: boolean
  error?: string
  className?: string
}

/** Select (shadcn/Radix) com rótulo e erro associados, no padrão do `TextField`. */
export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
  disabled,
  error,
  className,
}: SelectFieldProps<T>) {
  const id = useId()
  const errorId = `${id}-erro`

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={id} className="text-sm">
        {label}
        {required && (
          <span className="ml-0.5 text-required" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <Select value={value ?? ''} onValueChange={(next) => onChange(next as T)} disabled={disabled}>
        <SelectTrigger
          id={id}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="w-full"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {(Object.entries(options) as [T, string][]).map(([option, text]) => (
            <SelectItem key={option} value={option}>
              {text}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
