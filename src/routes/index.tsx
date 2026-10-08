import { createFileRoute } from '@tanstack/react-router'
import { useCallback } from 'react'
import { CatalogSearchBar } from '@/features/catalog/catalog-search-bar'
import { CatalogSection } from '@/features/catalog/catalog-section'
import { Highlights, MintingJournal } from '@/features/catalog/editorial-sections'
import { Hero } from '@/features/catalog/hero'
import { featuredNftsQuery, nftListQuery } from '@/features/catalog/queries'
import { toListParams, validateCatalogSearch, type CatalogSearch } from '@/features/catalog/search-params'

export const Route = createFileRoute('/')({
  validateSearch: validateCatalogSearch,
  loaderDeps: ({ search }) => toListParams(search),
  // Só dispara as buscas (sem bloquear a navegação): a página mostra skeletons enquanto isso.
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(featuredNftsQuery)
    void context.queryClient.prefetchQuery(nftListQuery(deps))
  },
  component: HomePage,
})

function scrollToCatalog() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.getElementById('catalogo')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' })
}

function HomePage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  /**
   * Toda mudança de busca/filtro/ordem/aba gera uma entrada no histórico (voltar
   * restaura o estado anterior) e reinicia a paginação, exceto a própria troca de página.
   */
  const updateSearch = useCallback(
    (patch: Partial<CatalogSearch>, options: { keepPage?: boolean } = {}) => {
      void navigate({
        search: (prev) => ({ ...prev, ...patch, ...(options.keepPage ? {} : { pagina: undefined }) }),
        resetScroll: false,
      })
    },
    [navigate],
  )

  function exploreWith(patch: Partial<CatalogSearch>) {
    updateSearch(patch)
    scrollToCatalog()
  }

  return (
    <>
      <CatalogSearchBar
        search={search}
        onChange={(patch) => {
          updateSearch(patch)
          scrollToCatalog()
        }}
        withFilters
        placeholder="Explorar coleções"
        className="container-site pt-4 md:hidden"
      />
      <Hero onExplore={scrollToCatalog} />
      <CatalogSection search={search} onChange={updateSearch} />
      <Highlights onNewReleases={() => exploreWith({ aba: 'novos' })} onDigitalArt={() => exploreWith({ categoria: 'arte-digital' })} />
      <MintingJournal />
    </>
  )
}
