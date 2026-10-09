import { createFileRoute } from '@tanstack/react-router'
import { ACTIVITY_FILTERS, type ActivityFilter } from '@/features/account/activity-filters'
import { ActivityPage } from '@/features/account/activity-page'

export const Route = createFileRoute('/perfil/atividade')({
  // Filtro de status na URL (sobrevive a refresh e ao histórico).
  validateSearch: (search: Record<string, unknown>): { status?: Exclude<ActivityFilter, 'todos'> } => ({
    status:
      typeof search.status === 'string' && search.status in ACTIVITY_FILTERS && search.status !== 'todos'
        ? (search.status as Exclude<ActivityFilter, 'todos'>)
        : undefined,
  }),
  component: ActivityRoute,
})

function ActivityRoute() {
  const { status } = Route.useSearch()
  return <ActivityPage filter={status ?? 'todos'} />
}
