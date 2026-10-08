import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { featuredNftsQuery } from '@/features/catalog/queries'
import { cn } from '@/lib/utils'

/**
 * Destaque do topo (frames desktop-01 e mobile-01). Os pontos alternam o NFT em
 * destaque; não há rotação automática (respeita quem prefere menos movimento).
 */
export function Hero({ onExplore }: { onExplore: () => void }) {
  const { data } = useQuery(featuredNftsQuery)
  const [index, setIndex] = useState(0)
  const slides = data?.hero ?? []
  const current = slides[index]

  return (
    <section aria-labelledby="hero-titulo" className="container-site pt-4 md:pt-8">
      <div className="grid grid-cols-[1fr_42%] items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-surface-strong to-card p-4 md:grid-cols-[1fr_minmax(0,450px)] md:gap-10 md:rounded-none md:bg-none md:p-0 md:pl-10 lg:gap-16">
        <div className="flex min-w-0 flex-col items-start">
          <p className="text-[10px] md:text-sm">Bem-vindo à Kurio</p>
          <h1 id="hero-titulo" className="mt-2 text-sm leading-6 font-bold uppercase md:mt-4 md:text-[40px] md:leading-[70px] lg:text-5xl">
            Seja dono do futuro <br className="hidden md:block" />
            da arte digital
          </h1>
          <p className="mt-2 text-[9px] leading-[14px] text-muted-foreground md:mt-3 md:text-sm md:leading-6">
            Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e
            tenha uma parte da cultura da internet.
          </p>
          <button
            type="button"
            onClick={onExplore}
            className="mt-2 inline-flex items-center gap-2 text-[10px] font-bold text-primary md:mt-8 md:h-10 md:rounded-md md:bg-primary md:px-7 md:text-base md:font-medium md:text-primary-foreground md:hover:bg-primary-hover"
          >
            EXPLORAR
            <ArrowRight className="size-3 md:hidden" aria-hidden="true" />
          </button>

          {slides.length > 1 && (
            <div className="mt-4 flex gap-2 self-center md:mt-12 md:self-end" role="group" aria-label="Escolher destaque">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Destaque ${i + 1} de ${slides.length}: ${slide.name}`}
                  aria-current={i === index ? 'true' : undefined}
                  className="flex size-6 items-center justify-center"
                >
                  <span className={cn('size-2 rounded-full bg-primary transition-opacity', i === index ? 'opacity-100' : 'opacity-50')} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="aspect-square w-full">
          {current ? (
            <Link to="/nft/$nftId" params={{ nftId: current.id }} aria-label={`Ver ${current.name}`} className="block h-full">
              <img
                key={current.id}
                src={current.image}
                alt={current.imageAlt}
                width={450}
                height={450}
                fetchPriority="high"
                className="h-full w-full rounded-xl object-cover md:rounded-3xl"
              />
            </Link>
          ) : (
            <Skeleton className="h-full w-full rounded-xl md:aspect-square md:rounded-3xl" />
          )}
        </div>
      </div>
    </section>
  )
}
