import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/feedback/page-placeholder'

export const Route = createFileRoute('/nft/$nftId')({
  component: () => <PagePlaceholder title="Detalhe do NFT" frame="desktop-02-detalhe-nft.png" />,
})
