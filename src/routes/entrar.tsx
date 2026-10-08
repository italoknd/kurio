import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/feedback/page-placeholder'

export const Route = createFileRoute('/entrar')({
  component: () => <PagePlaceholder title="Entrar" frame="desktop-06-login.png" />,
})
