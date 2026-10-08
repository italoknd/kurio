import { useQuery } from '@tanstack/react-query'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { CatalogFilters } from '@/features/catalog/catalog-filters'
import { CatalogSearchInput } from '@/features/catalog/catalog-search-input'
import { nftListQuery } from '@/features/catalog/queries'
import { categoriesOf, networksOf, toListParams, type CatalogSearch } from '@/features/catalog/search-params'
import { cn } from '@/lib/utils'

interface CatalogSearchBarProps {
  search: CatalogSearch
  onChange: (patch: Partial<CatalogSearch>) => void
  /** Mostra o botão de filtros (drawer). No desktop os filtros ficam na sidebar. */
  withFilters?: boolean
  placeholder?: string
  className?: string
}

/** Busca + botão de filtros (topo do frame mobile-01; acima do grid no desktop). */
export function CatalogSearchBar({ search, onChange, withFilters = false, placeholder, className }: CatalogSearchBarProps) {
  // Mesma chave da lista do catálogo: reaproveita o cache para as contagens dos filtros.
  const { data } = useQuery(nftListQuery(toListParams(search)))
  const filterCount = categoriesOf(search).length + networksOf(search).length + (search.precoMin || search.precoMax ? 1 : 0)

  return (
    <div className={cn('flex gap-3', className)}>
      <CatalogSearchInput value={search.q} onSearch={(q) => onChange({ q })} placeholder={placeholder} className="flex-1" />
      {withFilters && (
        <Sheet>
          <SheetTrigger asChild>
            <Button size="icon" className="relative" aria-label={filterCount > 0 ? `Filtros (${filterCount} ativos)` : 'Filtros'}>
              <SlidersHorizontal aria-hidden="true" />
              {filterCount > 0 && (
                <span aria-hidden="true" className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-xs text-background">
                  {filterCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="overflow-y-auto bg-card">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
              <SheetDescription>Os resultados são atualizados a cada alteração.</SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-8">
              <CatalogFilters search={search} facets={data?.facets} onChange={onChange} />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
