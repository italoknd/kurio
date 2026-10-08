import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { featuredNftsQuery } from '@/features/catalog/queries'

/** Card "NFT em destaque / Oferta limitada" abaixo dos filtros (frame desktop-01). */
export function SpotlightCard() {
  const { data } = useQuery(featuredNftsQuery)

  if (!data) return <Skeleton className="aspect-[310/470] w-full" />

  const nft = data.spotlight
  return (
    <Link
      to="/nft/$nftId"
      params={{ nftId: nft.id }}
      className="group flex flex-col overflow-hidden rounded-b-2xl bg-gradient-to-b from-surface-strong to-card"
    >
      <span className="px-5 pt-6 text-2xl font-bold text-primary">NFT EM DESTAQUE</span>
      <span className="pb-4 text-center text-xl font-bold">OFERTA LIMITADA</span>
      <span className="sr-only">: {nft.name}</span>
      <img
        src={nft.image}
        alt={nft.imageAlt}
        width={310}
        height={366}
        loading="lazy"
        decoding="async"
        className="aspect-[310/366] w-full rounded-2xl object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none"
      />
    </Link>
  )
}
