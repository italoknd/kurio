import { createFileRoute } from '@tanstack/react-router'
import { nftDetailQuery } from '@/features/catalog/queries'
import { NftDetailPage } from '@/features/nft/nft-detail-page'

export const Route = createFileRoute('/nft/$nftId')({
  // Barra de compra fixa no mobile ocupa o lugar da navegação inferior (frame mobile-02).
  staticData: { minimalMobileChrome: true },
  // Só dispara a busca: a página mostra o skeleton e trata 404 e falhas.
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(nftDetailQuery(params.nftId))
  },
  component: NftRoute,
})

function NftRoute() {
  const { nftId } = Route.useParams()
  return <NftDetailPage nftId={nftId} />
}
