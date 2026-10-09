import type { OrderStatus } from '@/types/order'

/** Filtros da Atividade (parâmetro `status` da URL) e o status de pedido correspondente. */
export const ACTIVITY_FILTERS = {
  todos: 'Todos',
  pendentes: 'Em processamento',
  confirmados: 'Confirmados',
  recusados: 'Recusados',
} as const

export type ActivityFilter = keyof typeof ACTIVITY_FILTERS

export const FILTER_STATUS: Record<ActivityFilter, OrderStatus | undefined> = {
  todos: undefined,
  pendentes: 'pending',
  confirmados: 'confirmed',
  recusados: 'rejected',
}
