/**
 * Contratos compartilhados de transporte (REST). Usados pelo cliente Axios,
 * pelos hooks do TanStack Query e pelos handlers do MSW.
 */

/** Códigos de erro de negócio retornados pela API. */
export type ApiErrorCode =
  | 'VALIDATION_ERROR' // 422 — campos inválidos (ver `fields`)
  | 'UNAUTHENTICATED' // 401 — sessão ausente, inválida ou expirada
  | 'FORBIDDEN' // 403 — sem permissão para o recurso
  | 'NOT_FOUND' // 404 — recurso inexistente
  | 'CONFLICT' // 409 — conflito (cadastro duplicado, disponibilidade, idempotência)
  | 'UNAVAILABLE' // 503 — falha transitória do servidor
  | 'INTERNAL_ERROR' // 500 — erro inesperado

/** Corpo padrão de erro de todas as rotas REST. */
export interface ApiErrorBody {
  code: ApiErrorCode
  message: string
  /** Erros por campo, em validações (chave = nome do campo). */
  fields?: Record<string, string>
}

/** Resposta paginada padrão. */
export interface Paginated<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}
