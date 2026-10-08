import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/feedback/page-placeholder'

export const Route = createFileRoute('/')({
  component: () => <PagePlaceholder title="Início" frame="desktop-01-inicio.png" />,
})
