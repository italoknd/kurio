import { ZoomIn } from 'lucide-react'
import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { NftDetail } from '@/types/nft'

/** Galeria do detalhe: miniaturas (desktop), imagem principal e zoom em modal. */
export function NftGallery({ nft }: { nft: NftDetail }) {
  const [index, setIndex] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const image = nft.images[index] ?? { src: nft.image, alt: nft.imageAlt }

  return (
    <div className="flex items-start gap-7">
      {nft.images.length > 1 && (
        <ul className="hidden flex-col gap-4 lg:flex" aria-label="Imagens do NFT">
          {nft.images.map((item, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Ver imagem ${i + 1} de ${nft.images.length}`}
                aria-pressed={i === index}
                className={cn(
                  'block size-[100px] overflow-hidden rounded-md border-2 transition-colors',
                  i === index ? 'border-primary' : 'border-transparent hover:border-border',
                )}
              >
                <img src={item.src} alt="" width={100} height={100} loading="lazy" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative flex-1 md:bg-card md:p-5">
        <img
          src={image.src}
          alt={image.alt}
          width={404}
          height={404}
          fetchPriority="high"
          className="aspect-square w-full rounded-2xl object-cover"
        />
        <button
          type="button"
          onClick={() => setZoomed(true)}
          aria-label="Ampliar imagem"
          className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full bg-background/80 text-foreground hover:bg-background md:top-7 md:right-7"
        >
          <ZoomIn className="size-5" aria-hidden="true" />
        </button>
      </div>

      <Dialog open={zoomed} onOpenChange={setZoomed}>
        <DialogContent className="max-w-[min(92vw,720px)] bg-card p-3 sm:max-w-[min(92vw,720px)]">
          <DialogTitle className="sr-only">{nft.name}</DialogTitle>
          <DialogDescription className="sr-only">Imagem ampliada</DialogDescription>
          <img src={image.src} alt={image.alt} className="aspect-square w-full rounded-xl object-cover" />
        </DialogContent>
      </Dialog>
    </div>
  )
}
