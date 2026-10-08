import { ArrowRight } from 'lucide-react'
import { notifyUnavailable } from '@/lib/unavailable'

/**
 * Seções editoriais da página inicial (frame desktop-01). O conteúdo é texto
 * institucional fixo, não dado de negócio; "Ler mais" leva a páginas editoriais,
 * que estão fora do escopo e apenas avisam indisponibilidade.
 */

interface HighlightsProps {
  onNewReleases: () => void
  onDigitalArt: () => void
}

export function Highlights({ onNewReleases, onDigitalArt }: HighlightsProps) {
  const cards = [
    {
      title: 'Lançamentos gênesis de edição limitada',
      text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
      image: '/nfts/emerald-ape.webp',
      action: onNewReleases,
      actionLabel: 'Explorar lançamentos gênesis',
    },
    {
      title: 'Arte digital selecionada e muito mais',
      text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a próxima era.',
      image: '/nfts/neon-vessel.webp',
      action: onDigitalArt,
      actionLabel: 'Explorar arte digital',
    },
  ]

  return (
    <section aria-label="Destaques editoriais" className="container-site mt-20 grid gap-6 md:mt-24 lg:grid-cols-2 lg:gap-7">
      {cards.map((card) => (
        <article key={card.title} className="grid grid-cols-[minmax(0,287fr)_minmax(0,299fr)] overflow-hidden rounded-2xl bg-card">
          <img src={card.image} alt="" width={287} height={250} loading="lazy" decoding="async" className="h-full min-h-48 w-full rounded-2xl object-cover" />
          <div className="flex flex-col items-end justify-center gap-3 p-4 text-right sm:p-6">
            <h2 className="text-sm font-bold sm:text-lg">{card.title}</h2>
            <p className="text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">{card.text}</p>
            <button
              type="button"
              onClick={card.action}
              aria-label={card.actionLabel}
              className="inline-flex h-10 items-center gap-1 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
            >
              Explorar <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </article>
      ))}
    </section>
  )
}

const POSTS = [
  {
    date: '12 de setembro',
    reading: 6,
    title: 'Como funciona a propriedade de NFTs',
    text: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
    image: '/nfts/neon-vessel.webp',
  },
  {
    date: '13 de setembro',
    reading: 2,
    title: '10 artistas digitais para acompanhar',
    text: 'Conheça criadores que moldam a cultura digital.',
    image: '/nfts/emerald-ape.webp',
  },
  {
    date: '15 de setembro',
    reading: 3,
    title: 'Raridade, atributos e procedência',
    text: 'Entenda raridade, procedência, direitos autorais e utilidade.',
    image: '/nfts/sage-nomad.webp',
  },
  {
    date: '15 de setembro',
    reading: 2,
    title: 'Como proteger sua carteira',
    text: 'Proteja sua carteira, seus ativos e sua identidade.',
    image: '/nfts/golden-beat.webp',
  },
]

export function MintingJournal() {
  return (
    <section aria-labelledby="diario-titulo" className="container-site mt-20 md:mt-28">
      <h2 id="diario-titulo" className="text-center text-2xl font-bold md:text-3xl">
        Diário da Cunhagem
      </h2>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
      </p>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {POSTS.map((post) => (
          <article key={post.title} className="flex flex-col overflow-hidden rounded-lg bg-card">
            <img src={post.image} alt="" width={268} height={164} loading="lazy" decoding="async" className="h-[164px] w-full object-cover object-top" />
            <div className="flex flex-1 flex-col gap-2 p-4">
              <p className="text-xs text-muted-foreground">
                {post.date} <span aria-hidden="true">|</span> <span className="sr-only">—</span> Leitura de {post.reading} min
              </p>
              <h3 className="font-bold">{post.title}</h3>
              <p className="text-xs leading-4 text-muted-foreground">{post.text}</p>
              <button
                type="button"
                onClick={() => notifyUnavailable('O Diário da Cunhagem')}
                className="mt-auto self-start pt-1 text-xs font-bold text-primary hover:underline"
                aria-label={`Ler mais: ${post.title}`}
              >
                Ler mais →
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
