import { Search, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

const DEBOUNCE_MS = 400

interface CatalogSearchInputProps {
  value: string | undefined
  onSearch: (q: string | undefined) => void
  placeholder?: string
  className?: string
}

/**
 * Busca do catálogo. Digitação com debounce (uma entrada no histórico por busca,
 * não por tecla) e sincronizada com a URL: voltar no histórico restaura o texto.
 */
export function CatalogSearchInput({ value, onSearch, placeholder = 'Buscar por nome, coleção ou criador', className }: CatalogSearchInputProps) {
  const id = useId()
  const [text, setText] = useState(value ?? '')
  const lastSubmitted = useRef(value ?? '')

  // Mudança vinda da URL (histórico, limpar filtros): atualiza o campo.
  useEffect(() => {
    if ((value ?? '') !== lastSubmitted.current) {
      lastSubmitted.current = value ?? ''
      setText(value ?? '')
    }
  }, [value])

  useEffect(() => {
    const trimmed = text.trim()
    if (trimmed === lastSubmitted.current) return
    const timer = window.setTimeout(() => {
      lastSubmitted.current = trimmed
      onSearch(trimmed || undefined)
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [text, onSearch])

  return (
    <div role="search" className={cn('relative', className)}>
      <label htmlFor={id} className="sr-only">
        Buscar NFTs
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <input
        id={id}
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            const trimmed = text.trim()
            lastSubmitted.current = trimmed
            onSearch(trimmed || undefined)
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        className="h-10 w-full rounded-md border border-input bg-card pr-10 pl-9 text-sm placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
      />
      {text && (
        <button
          type="button"
          onClick={() => setText('')}
          aria-label="Limpar busca"
          className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
