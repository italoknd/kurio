import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { categoriesOf, joinList, networksOf, type CatalogSearch } from '@/features/catalog/search-params'
import { fromCents, toCents, type EthAmount } from '@/lib/eth'
import { cn } from '@/lib/utils'
import type { NftListResponse } from '@/types/nft'

type Facets = NftListResponse['facets']

interface CatalogFiltersProps {
  search: CatalogSearch
  facets: Facets | undefined
  onChange: (patch: Partial<CatalogSearch>) => void
}

/** "0.02" → "0,02", como no Figma. */
function displayAmount(amount: EthAmount) {
  return amount.replace('.', ',')
}

/** Coleções, faixa de preço e rede (sidebar do frame desktop-01; drawer no mobile). */
export function CatalogFilters({ search, facets, onChange }: CatalogFiltersProps) {
  const categories = categoriesOf(search)
  const networks = networksOf(search)

  function toggle(list: string[], id: string) {
    return list.includes(id) ? list.filter((item) => item !== id) : [...list, id]
  }

  return (
    <div className="flex flex-col gap-8">
      <FilterGroup title="Coleções">
        {facets
          ? facets.categories.map((facet) => (
              <FacetOption
                key={facet.id}
                label={facet.label}
                count={facet.count}
                selected={categories.includes(facet.id)}
                onToggle={() => onChange({ categoria: joinList(toggle(categories, facet.id)) })}
              />
            ))
          : <FacetSkeleton rows={9} />}
      </FilterGroup>

      <FilterGroup title="Faixa de preço">
        {facets ? (
          <PriceRange
            key={`${search.precoMin}-${search.precoMax}-${facets.priceRange.min}-${facets.priceRange.max}`}
            range={facets.priceRange}
            value={{ min: search.precoMin, max: search.precoMax }}
            onApply={(min, max) => onChange({ precoMin: min, precoMax: max })}
          />
        ) : (
          <Skeleton className="h-24 w-full" />
        )}
      </FilterGroup>

      <FilterGroup title="Rede">
        {facets
          ? facets.networks.map((facet) => (
              <FacetOption
                key={facet.id}
                label={facet.label}
                count={facet.count}
                selected={networks.includes(facet.id)}
                onToggle={() => onChange({ rede: joinList(toggle(networks, facet.id)) })}
              />
            ))
          : <FacetSkeleton rows={3} />}
      </FilterGroup>
    </div>
  )
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-3 text-lg font-bold">{title}</legend>
      <div className="flex flex-col gap-1">{children}</div>
    </fieldset>
  )
}

function FacetOption({
  label,
  count,
  selected,
  onToggle,
}: {
  label: string
  count: number
  selected: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onToggle}
      className={cn(
        'flex h-10 items-center justify-between rounded-sm px-3 text-left text-sm transition-colors hover:bg-surface-strong',
        selected ? 'font-bold text-primary' : 'text-foreground',
      )}
    >
      <span className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={cn('size-2 rounded-full border border-primary', selected ? 'bg-primary' : 'bg-transparent')}
        />
        {label}
      </span>
      <span className={cn('tabular-nums', selected ? 'text-primary' : 'text-muted-foreground')}>
        ({count})
        <span className="sr-only"> NFTs</span>
      </span>
    </button>
  )
}

function FacetSkeleton({ rows }: { rows: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </>
  )
}

function PriceRange({
  range,
  value,
  onApply,
}: {
  range: { min: EthAmount; max: EthAmount }
  value: { min?: EthAmount; max?: EthAmount }
  onApply: (min: EthAmount | undefined, max: EthAmount | undefined) => void
}) {
  const limits = [toCents(range.min), toCents(range.max)]
  const [cents, setCents] = useState<number[]>([
    value.min ? Math.max(limits[0], toCents(value.min)) : limits[0],
    value.max ? Math.min(limits[1], toCents(value.max)) : limits[1],
  ])
  const [min, max] = cents.map(fromCents)

  function apply() {
    // Faixa completa = sem filtro de preço na URL.
    onApply(cents[0] > limits[0] ? min : undefined, cents[1] < limits[1] ? max : undefined)
  }

  return (
    <div className="flex flex-col gap-4 px-3">
      <Slider
        min={limits[0]}
        max={limits[1]}
        step={1}
        minStepsBetweenThumbs={1}
        value={cents}
        onValueChange={setCents}
        thumbLabels={['Preço mínimo', 'Preço máximo']}
        getValueText={(centValue) => `${displayAmount(fromCents(centValue))} ETH`}
      />
      <p className="text-sm" aria-live="polite">
        Preço: {displayAmount(min)} - {displayAmount(max)} ETH
      </p>
      <Button size="sm" className="self-start px-3" onClick={apply}>
        Aplicar
      </Button>
    </div>
  )
}
