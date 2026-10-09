import { Link } from '@tanstack/react-router'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useDownloads } from '@/features/account/queries'
import { errorMessage } from '@/lib/forms'
import { usePageTitle } from '@/lib/use-page-title'
import type { DownloadItem } from '@/types/account'

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

/** Arquivos baixados: arte desbloqueável dos NFTs comprados em pedidos confirmados. */
export function DownloadsPage() {
  usePageTitle('Arquivos baixados')
  const downloads = useDownloads()

  return (
    <section aria-labelledby="arquivos-titulo">
      <h1 id="arquivos-titulo" className="text-lg font-bold">Arquivos baixados</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        A arte desbloqueável de cada NFT comprado, disponível para download após a confirmação do pedido.
      </p>

      <div className="mt-6">
        {downloads.isError && !downloads.data ? (
          <div role="alert" className="flex flex-col items-start gap-3">
            <p className="text-muted-foreground">{errorMessage(downloads.error)}</p>
            <Button onClick={() => void downloads.refetch()} disabled={downloads.isFetching}>Tentar novamente</Button>
          </div>
        ) : !downloads.data ? (
          <div aria-busy="true" aria-label="Carregando arquivos" className="grid gap-3 md:grid-cols-2">
            {[0, 1].map((i) => <Skeleton key={i} className="h-[112px] w-full" />)}
          </div>
        ) : downloads.data.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-md border border-border p-6">
            <p className="font-bold">Nenhum arquivo disponível ainda.</p>
            <p className="text-sm text-muted-foreground">Os arquivos aparecem aqui quando um pedido é confirmado.</p>
            <Link to="/" hash="catalogo" className="text-sm text-primary underline-offset-4 hover:underline">Explorar o catálogo</Link>
          </div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {downloads.data.map((item) => <DownloadRow key={item.id} item={item} />)}
          </ul>
        )}
      </div>
    </section>
  )
}

/**
 * Baixa o arquivo com o nome sugerido. Hospedagens como a Vercel enviam
 * `Content-Disposition: inline; filename=...`, que prevalece sobre o atributo `download`;
 * gerar o arquivo localmente (blob) garante o nome em qualquer ambiente.
 */
async function saveFile(url: string, fileName: string) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const objectUrl = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}

function DownloadRow({ item }: { item: DownloadItem }) {
  function download(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    saveFile(item.image, item.fileName).catch(() => toast.error('Não foi possível baixar o arquivo. Tente novamente.'))
  }

  return (
    <li className="flex gap-3 bg-card p-3">
      <img src={item.image} alt={item.imageAlt} width={88} height={88} loading="lazy" className="size-[88px] shrink-0 rounded-sm object-cover" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-sm font-bold">{item.name}</p>
        <p className="text-xs text-muted-foreground">
          Edição {item.editionLabel} · ID do token: {item.tokenId}
        </p>
        <p className="text-xs text-muted-foreground">
          Comprado em {dateFormat.format(new Date(item.purchasedAt))} ·{' '}
          <Link to="/pedidos/$orderId" params={{ orderId: item.orderId }} className="text-primary underline-offset-4 hover:underline">
            ver recibo
          </Link>
        </p>
        <a
          href={item.image}
          download={item.fileName}
          onClick={download}
          aria-label={`Baixar arte (${item.format}): ${item.name}, edição ${item.editionLabel}`}
          className="mt-auto inline-flex h-8 w-fit items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-bold text-primary-foreground hover:bg-primary-hover"
        >
          <Download className="size-3.5" aria-hidden="true" />
          Baixar arte ({item.format})
        </a>
      </div>
    </li>
  )
}
