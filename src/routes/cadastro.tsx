import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/feedback/page-placeholder'

export const Route = createFileRoute('/cadastro')({
  component: () => <PagePlaceholder title="Criar conta" frame="desktop-07-cadastro.png" />,
})
