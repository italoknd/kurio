import { useQueries } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { NftCard, NftCardSkeleton } from '@/features/catalog/nft-card'
import { nftDetailQuery } from '@/features/catalog/queries'
import { useFavorites } from '@/features/favorites/use-favorites'
import { usePageTitle } from '@/lib/use-page-title'

export const Route = createFileRoute('/perfil/favoritos')({
  component: FavoritesPage,
})

/** Lista de interesse: NFTs favoritados pelo usuário (persistidos na API). */
function FavoritesPage() {
  usePageTitle('Lista de interesse')
  const { ids, isPending } = useFavorites()
  const details = useQueries({ queries: [...ids].map((id) => nftDetailQuery(id)) })

  return (
    <section aria-labelledby="favoritos-titulo">
      <h1 id="favoritos-titulo" className="text-lg font-bold">
        Lista de interesse
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">NFTs que você marcou como favoritos.</p>

      {isPending ? (
        <div className="mt-6 grid grid-cols-2 gap-6 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <NftCardSkeleton key={i} />
          ))}
        </div>
      ) : ids.size === 0 ? (
        <div className="mt-6 flex flex-col items-start gap-3 bg-card p-6">
          <p className="font-bold">Você ainda não tem favoritos.</p>
          <Link to="/" hash="catalogo" className="text-sm font-bold text-primary hover:underline">
            Explorar o catálogo
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-6 lg:grid-cols-3">
          {details.map((detail, index) =>
            detail.data ? <NftCard key={detail.data.id} nft={detail.data} /> : <NftCardSkeleton key={index} />,
          )}
        </div>
      )}
    </section>
  )
}
