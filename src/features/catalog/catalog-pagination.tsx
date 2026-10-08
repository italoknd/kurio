import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CatalogPaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

/** Páginas visíveis: primeira, última e vizinhas da atual, com reticências. */
function visiblePages(page: number, totalPages: number): (number | 'gap')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const pages = new Set([1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages))
  const sorted = [...pages].sort((a, b) => a - b)
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? ['gap' as const, p] : [p]))
}

const itemClass =
  'flex size-[34px] items-center justify-center rounded-sm border border-border text-base transition-colors hover:border-primary disabled:pointer-events-none disabled:opacity-40'

export function CatalogPagination({ page, totalPages, onChange }: CatalogPaginationProps) {
  if (totalPages <= 1) return null

  return (
    <nav aria-label="Paginação do catálogo" className="flex justify-end">
      <ul className="flex items-center gap-2">
        <li>
          <button type="button" className={itemClass} onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Página anterior">
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
        </li>
        {visiblePages(page, totalPages).map((item, index) =>
          item === 'gap' ? (
            <li key={`gap-${index}`} aria-hidden="true" className="px-1 text-muted-foreground">
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                onClick={() => onChange(item)}
                aria-label={`Página ${item}`}
                aria-current={item === page ? 'page' : undefined}
                className={cn(itemClass, item === page && 'border-primary bg-primary font-bold text-primary-foreground')}
              >
                {item}
              </button>
            </li>
          ),
        )}
        <li>
          <button type="button" className={itemClass} onClick={() => onChange(page + 1)} disabled={page >= totalPages} aria-label="Próxima página">
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </nav>
  )
}
