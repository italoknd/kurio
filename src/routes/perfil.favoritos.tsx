import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/feedback/page-placeholder'

export const Route = createFileRoute('/perfil/favoritos')({
  component: () => <PagePlaceholder title="Lista de interesse" frame="desktop-08-perfil.png" />,
})
