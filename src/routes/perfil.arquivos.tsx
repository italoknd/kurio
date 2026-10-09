import { createFileRoute } from '@tanstack/react-router'
import { DownloadsPage } from '@/features/account/downloads-page'

export const Route = createFileRoute('/perfil/arquivos')({
  component: DownloadsPage,
})
