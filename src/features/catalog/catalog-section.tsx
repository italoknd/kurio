import { useQuery } from '@tanstack/react-query'
import { RotateCw } from 'lucide-react'
import { useId, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CatalogFilters } from '@/features/catalog/catalog-filters'
import { CatalogPagination } from '@/features/catalog/catalog-pagination'
import { CatalogSearchBar } from '@/features/catalog/catalog-search-bar'
import { NftCard, NftCardSkeleton } from '@/features/catalog/nft-card'
import { nftListQuery } from '@/features/catalog/queries'
import {
  hasActiveFilters,
  PAGE_SIZE,
  SORTS,
  TABS,
  toListParams,
  type CatalogSearch,
} from '@/features/catalog/search-params'
import { SpotlightCard } from '@/features/catalog/spotlight-card'
import { errorMessage } from '@/lib/forms'
import { cn } from '@/lib/utils'
import type { NftSort } from '@/types/nft'

interface CatalogSectionProps {
  search: CatalogSearch
  onChange: (patch: Partial<CatalogSearch>, options?: { keepPage?: boolean }) => void
}

/** Catálogo da página inicial: busca, filtros combináveis, abas, ordenação e paginação. */
export function CatalogSection({ search, onChange }: CatalogSectionProps) {
  const resultsRef = useRef<HTMLHeadingElement>(null)
  const params = toListParams(search)
  const query = useQuery(nftListQuery(params))
  const data = query.data
  const activeTab = search.aba ?? 'todos'

  function changePage(page: number) {
    onChange({ pagina: page > 1 ? page : undefined }, { keepPage: true })
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    resultsRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    resultsRef.current?.focus({ preventScroll: true })
  }

  const filters = <CatalogFilters search={search} facets={data?.facets} onChange={(patch) => onChange(patch)} />

  return (
    <section id="catalogo" aria-labelledby="catalogo-titulo" className="container-site scroll-mt-4 pt-12 md:pt-24">
      <div className="grid gap-8 md:grid-cols-[240px_1fr] md:gap-10 lg:grid-cols-[310px_1fr] lg:gap-12">
        <aside aria-label="Filtros do catálogo" className="hidden flex-col gap-6 md:flex">
          <div className="bg-card px-5 py-6">{filters}</div>
          <SpotlightCard />
        </aside>

        <div className="min-w-0">
          <h2 id="catalogo-titulo" ref={resultsRef} tabIndex={-1} className="sr-only scroll-mt-4">
            Catálogo de NFTs
          </h2>

          <CatalogSearchBar search={search} onChange={(patch) => onChange(patch)} className="mb-6 hidden md:flex" />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div role="tablist" aria-label="Seções do catálogo" className="flex gap-4 overflow-x-auto text-sm md:gap-5 md:text-base">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls="catalogo-resultados"
                  onClick={() => onChange({ aba: tab.id === 'todos' ? undefined : tab.id })}
                  className={cn(
                    'shrink-0 border-b-2 pb-1 font-medium whitespace-nowrap transition-colors',
                    activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent hover:text-primary',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <SortSelect value={search.ordem ?? 'recentes'} onChange={(ordem) => onChange({ ordem: ordem === 'recentes' ? undefined : ordem })} />
          </div>

          <p className="sr-only" role="status" aria-live="polite">
            {query.isFetching ? 'Carregando resultados…' : data ? `${data.total} NFTs encontrados. Página ${data.page} de ${data.totalPages}.` : ''}
          </p>

          <div id="catalogo-resultados" role="tabpanel" className="mt-8">
            {query.isError ? (
              <CatalogError message={errorMessage(query.error)} onRetry={() => void query.refetch()} retrying={query.isFetching} />
            ) : !data ? (
              <CatalogGrid>
                {Array.from({ length: PAGE_SIZE }, (_, i) => (
                  <NftCardSkeleton key={i} />
                ))}
              </CatalogGrid>
            ) : data.items.length === 0 ? (
              <CatalogEmpty filtered={hasActiveFilters(search) || activeTab !== 'todos'} onClear={() => onChange({ q: undefined, categoria: undefined, rede: undefined, precoMin: undefined, precoMax: undefined, aba: undefined })} />
            ) : (
              <>
                {query.isPlaceholderData && (
                  <p className="mb-4 flex items-center gap-2 text-sm text-muted-foreground" aria-hidden="true">
                    <RotateCw className="size-4 animate-spin motion-reduce:animate-none" />
                    Atualizando resultados…
                  </p>
                )}
                <CatalogGrid busy={query.isPlaceholderData}>
                  {data.items.map((nft, index) => (
                    <NftCard key={nft.id} nft={nft} priority={index < 3 && params.page === 1} />
                  ))}
                </CatalogGrid>
                <div className="mt-12">
                  <CatalogPagination page={data.page} totalPages={data.totalPages} onChange={changePage} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function CatalogGrid({ children, busy = false }: { children: React.ReactNode; busy?: boolean }) {
  return (
    <div
      aria-busy={busy || undefined}
      className={cn(
        'grid grid-cols-2 gap-x-4 gap-y-8 transition-opacity lg:grid-cols-3 lg:gap-x-[34px] lg:gap-y-16',
        busy && 'opacity-60',
      )}
    >
      {children}
    </div>
  )
}

function SortSelect({ value, onChange }: { value: NftSort; onChange: (value: NftSort) => void }) {
  const id = useId()
  return (
    <div className="flex items-center gap-2 text-sm md:text-base">
      <label htmlFor={id} className="shrink-0">
        Ordenar por:
      </label>
      <Select value={value} onValueChange={(next) => onChange(next as NftSort)}>
        <SelectTrigger id={id} className="h-9 w-auto min-w-48 border-none bg-transparent px-1 text-sm md:text-base">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {SORTS.map((sort) => (
            <SelectItem key={sort.id} value={sort.id}>
              {sort.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function CatalogEmpty({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 bg-card px-6 py-16 text-center">
      <p className="text-lg font-bold">Nenhum NFT encontrado</p>
      <p className="max-w-md text-sm text-muted-foreground">
        {filtered ? 'Nenhum item corresponde à busca e aos filtros escolhidos.' : 'O catálogo está vazio no momento.'}
      </p>
      {filtered && <Button onClick={onClear}>Limpar busca e filtros</Button>}
    </div>
  )
}

function CatalogError({ message, onRetry, retrying }: { message: string; onRetry: () => void; retrying: boolean }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-4 border border-destructive/50 bg-card px-6 py-16 text-center">
      <p className="text-lg font-bold">Não foi possível carregar o catálogo</p>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      <Button onClick={onRetry} disabled={retrying}>
        {retrying ? 'Tentando…' : 'Tentar novamente'}
      </Button>
    </div>
  )
}
