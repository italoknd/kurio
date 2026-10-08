import { useQuery } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import { ChevronLeft, Mail, Star } from 'lucide-react'
import { useState } from 'react'
import { LinkedinIcon, TwitterIcon } from '@/components/icons/brand-icons'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { NftCard, NftCardSkeleton } from '@/features/catalog/nft-card'
import { nftDetailQuery, nftListQuery } from '@/features/catalog/queries'
import { FavoriteButton } from '@/features/favorites/favorite-button'
import { NftGallery } from '@/features/nft/nft-gallery'
import { EditionPicker, MobilePurchaseBar, PurchaseActions } from '@/features/nft/purchase-panel'
import { usePurchaseState } from '@/features/nft/purchase-state'
import { RatingStars } from '@/features/nft/rating'
import { formatEth } from '@/lib/eth'
import { errorMessage } from '@/lib/forms'
import { HttpError } from '@/lib/http'
import { usePageTitle } from '@/lib/use-page-title'
import { cn } from '@/lib/utils'
import { NFT_NETWORKS, type NftDetail } from '@/types/nft'

/** Página de detalhe (frames desktop-02 e mobile-02), com acesso direto por URL. */
export function NftDetailPage({ nftId }: { nftId: string }) {
  const query = useQuery(nftDetailQuery(nftId))
  usePageTitle(query.data?.name ?? (query.isError ? 'NFT não encontrado' : undefined))

  if (query.isError) {
    if (query.error instanceof HttpError && query.error.kind === 'NOT_FOUND') return <NftNotFound />
    return (
      <section role="alert" className="container-site flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Não foi possível carregar este NFT</h1>
        <p className="text-muted-foreground">{errorMessage(query.error)}</p>
        <Button onClick={() => void query.refetch()} disabled={query.isFetching}>
          {query.isFetching ? 'Tentando…' : 'Tentar novamente'}
        </Button>
      </section>
    )
  }

  if (!query.data) return <NftDetailSkeleton />
  // `key` reinicia edição/quantidade ao navegar para outro NFT.
  return <NftDetailContent key={query.data.id} nft={query.data} />
}

function NftDetailContent({ nft }: { nft: NftDetail }) {
  const state = usePurchaseState(nft)
  const router = useRouter()
  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''

  return (
    <div className="pb-48 md:pb-0">
      {/* Barra superior do mobile: voltar e favoritar */}
      <div className="container-site flex items-center justify-between pt-4 md:hidden">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? router.history.back() : router.navigate({ to: '/' }))}
          aria-label="Voltar"
          className="flex size-9 items-center justify-center rounded-full bg-card text-primary"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <FavoriteButton nftId={nft.id} name={nft.name} className="bg-card" />
      </div>

      <nav aria-label="Trilha de navegação" className="container-site hidden pt-8 text-sm font-bold md:block">
        <ol className="flex gap-2">
          <li>
            <Link to="/" className="hover:text-primary">Início</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link to="/" hash="catalogo" className="hover:text-primary">Mercado</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-muted-foreground">{nft.name}</li>
        </ol>
      </nav>

      <div className="container-site mt-4 grid gap-6 md:mt-3 md:grid-cols-2 md:gap-8 lg:grid-cols-[572px_1fr] lg:gap-8">
        <NftGallery nft={nft} />

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex items-start justify-between gap-4 md:block">
            <h1 className="text-lg font-bold md:text-[28px] md:leading-10">{nft.name}</h1>
            <span className="flex shrink-0 items-center gap-1 rounded-full border border-primary px-2 py-0.5 text-xs md:hidden">
              <Star className="size-3 fill-primary text-primary" aria-hidden="true" />
              {nft.rating.average.toFixed(1)}({nft.rating.count})
              <span className="sr-only"> avaliações</span>
            </span>
          </div>

          <div className="hidden flex-wrap items-center justify-between gap-2 border-b border-border pb-3 md:flex">
            <p className="text-2xl font-bold text-primary">
              <span className="sr-only">Preço da edição {state.edition.label}: </span>
              {formatEth(state.edition.price)}
              {state.edition.previousPrice && (
                <span className="ml-3 text-base font-normal text-muted-foreground line-through">
                  <span className="sr-only">Preço anterior: </span>
                  {formatEth(state.edition.previousPrice)}
                </span>
              )}
            </p>
            <p className="flex items-center gap-2 text-sm">
              <RatingStars average={nft.rating.average} />
              {nft.rating.count} avaliações de colecionadores
            </p>
          </div>

          <section aria-labelledby="sobre-titulo">
            <h2 id="sobre-titulo" className="mb-2 hidden text-sm font-bold md:block md:text-base">
              Sobre este NFT:
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">{nft.description}</p>
          </section>

          <EditionPicker nft={nft} state={state} />

          <div className="hidden md:block">
            <PurchaseActions nft={nft} state={state} />
          </div>

          <dl className="flex flex-col gap-3 text-sm text-muted-foreground md:text-base">
            <div className="flex gap-2">
              <dt>ID do token:</dt>
              <dd>{nft.tokenId}</dd>
            </div>
            <div className="flex gap-2">
              <dt>Coleção:</dt>
              <dd>{nft.collection}</dd>
            </div>
            <div className="flex gap-2">
              <dt>Atributos:</dt>
              <dd>{nft.attributes.join(', ')}</dd>
            </div>
          </dl>

          <div className="hidden items-center gap-3 text-sm font-bold md:flex md:text-base">
            Compartilhar este NFT:
            <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" aria-label="Compartilhar no LinkedIn (abre em nova aba)" className="hover:text-primary">
              <LinkedinIcon className="size-4" />
            </a>
            <a href={`mailto:?subject=${encodeURIComponent(nft.name)}&body=${encodeURIComponent(shareUrl)}`} aria-label="Compartilhar por e-mail" className="hover:text-primary">
              <Mail className="size-4" aria-hidden="true" />
            </a>
            <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(nft.name)}&url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" aria-label="Compartilhar no Twitter (abre em nova aba)" className="hover:text-primary">
              <TwitterIcon className="size-4" />
            </a>
          </div>
        </div>
      </div>

      <DetailTabs nft={nft} />
      <RelatedNfts nft={nft} />
      <MobilePurchaseBar nft={nft} state={state} />
    </div>
  )
}

function DetailTabs({ nft }: { nft: NftDetail }) {
  const [tab, setTab] = useState<'detalhes' | 'avaliacoes'>('detalhes')
  const tabs = [
    { id: 'detalhes' as const, label: 'Detalhes do NFT' },
    { id: 'avaliacoes' as const, label: `Avaliações de colecionadores (${nft.rating.count})` },
  ]

  return (
    <section className="container-site mt-12 md:mt-20" aria-label="Informações do NFT">
      <div role="tablist" aria-label="Informações do NFT" className="flex gap-8 overflow-x-auto border-b border-border">
        {tabs.map((item) => (
          <button
            key={item.id}
            id={`aba-${item.id}`}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            aria-controls={`painel-${item.id}`}
            onClick={() => setTab(item.id)}
            className={cn(
              '-mb-px shrink-0 border-b-2 pb-2 text-base whitespace-nowrap md:text-lg',
              tab === item.id ? 'border-primary font-bold text-primary' : 'border-transparent hover:text-primary',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'detalhes' ? (
        <div id="painel-detalhes" role="tabpanel" aria-labelledby="aba-detalhes" className="flex flex-col gap-4 pt-5 text-sm leading-6">
          {nft.details.map((paragraph) => (
            <p key={paragraph} className="text-muted-foreground">{paragraph}</p>
          ))}
          <dl className="flex flex-col gap-4">
            <div>
              <dt className="font-bold">Rede:</dt>
              <dd className="text-muted-foreground">Cunhado na {NFT_NETWORKS[nft.network]} com procedência imutável e metadados armazenados no IPFS.</dd>
            </div>
            <div>
              <dt className="font-bold">Contrato:</dt>
              <dd className="text-muted-foreground">Direitos autorais do criador: {nft.royaltyPercent}% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.</dd>
            </div>
            <div>
              <dt className="font-bold">Direitos autorais:</dt>
              <dd className="text-muted-foreground">{nft.contract.address.slice(0, 6)}...{nft.contract.address.slice(-4)} • Contrato inteligente {nft.contract.standard} verificado.</dd>
            </div>
          </dl>
        </div>
      ) : (
        <div id="painel-avaliacoes" role="tabpanel" aria-labelledby="aba-avaliacoes" className="flex flex-col gap-3 pt-5 text-sm">
          <p className="flex items-center gap-2">
            <RatingStars average={nft.rating.average} />
            Média {nft.rating.average.toFixed(1).replace('.', ',')} de 5, com {nft.rating.count} avaliações.
          </p>
          <p className="text-muted-foreground">Os comentários individuais dos colecionadores não estão disponíveis nesta demonstração.</p>
        </div>
      )}
    </section>
  )
}

function RelatedNfts({ nft }: { nft: NftDetail }) {
  const query = useQuery(nftListQuery({ collection: nft.collection, pageSize: 6, sort: 'recentes', tab: 'todos', page: 1 }))
  const items = (query.data?.items ?? []).filter((item) => item.id !== nft.id).slice(0, 5)

  if (query.isSuccess && items.length === 0) return null

  return (
    <section aria-labelledby="mais-colecao" className="container-site mt-16 md:mt-24">
      <h2 id="mais-colecao" className="border-b border-border pb-3 text-lg font-bold text-primary">
        Mais desta coleção
      </h2>
      <div className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible lg:grid-cols-5 lg:gap-[26px]">
        {query.data
          ? items.map((item) => <NftCard key={item.id} nft={item} className="w-40 shrink-0 snap-start md:w-auto" />)
          : Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="w-40 shrink-0 md:w-auto">
                <NftCardSkeleton />
              </div>
            ))}
      </div>
    </section>
  )
}

function NftNotFound() {
  return (
    <section className="container-site flex flex-col items-center gap-4 py-24 text-center">
      <p className="text-5xl font-bold text-primary">404</p>
      <h1 className="text-2xl font-bold">NFT não encontrado</h1>
      <p className="text-muted-foreground">Este NFT não existe ou foi removido do catálogo.</p>
      <Link to="/" hash="catalogo" className="mt-2 inline-flex h-10 items-center rounded-md bg-primary px-4 font-bold text-primary-foreground hover:bg-primary-hover">
        Explorar o catálogo
      </Link>
    </section>
  )
}

/** Mesmo layout do detalhe, para não deslocar o conteúdo ao carregar. */
function NftDetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando NFT" className="container-site mt-4 grid gap-6 md:mt-[60px] md:grid-cols-2 md:gap-8 lg:grid-cols-[572px_1fr]">
      <div className="flex gap-7">
        <div className="hidden flex-col gap-4 lg:flex">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="size-[100px]" />
          ))}
        </div>
        <Skeleton className="aspect-square flex-1 rounded-2xl" />
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-7 w-1/2" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-3/4" />
      </div>
    </div>
  )
}
