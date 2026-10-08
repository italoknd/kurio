import type { FieldErrors, FieldValues, Path, Resolver, UseFormSetError } from 'react-hook-form'
import type { z } from 'zod'
import { HttpError } from '@/lib/http'

/** Adaptador zod → react-hook-form (evita a dependência @hookform/resolvers). */
export function zodResolver<TSchema extends z.ZodType<FieldValues, FieldValues>>(
  schema: TSchema,
): Resolver<z.input<TSchema>, unknown, z.output<TSchema>> {
  return async (values) => {
    const result = await schema.safeParseAsync(values)
    if (result.success) return { values: result.data, errors: {} }

    const errors: Record<string, unknown> = {}
    for (const issue of result.error.issues) {
      const path = issue.path.map(String)
      let node = errors
      path.slice(0, -1).forEach((key) => {
        node[key] ??= {}
        node = node[key] as Record<string, unknown>
      })
      const leaf = path[path.length - 1] ?? 'root'
      node[leaf] ??= { type: issue.code, message: issue.message }
    }
    return { values: {}, errors: errors as FieldErrors<z.input<TSchema>> }
  }
}

/**
 * Aplica os erros por campo retornados pela API (`fields`) ao formulário.
 * Retorna `true` se algum campo conhecido recebeu erro.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: readonly Path<T>[],
): boolean {
  if (!(error instanceof HttpError)) return false
  let applied = false
  for (const [field, message] of Object.entries(error.fields)) {
    if ((knownFields as readonly string[]).includes(field)) {
      setError(field as Path<T>, { type: 'server', message }, { shouldFocus: !applied })
      applied = true
    }
  }
  return applied
}

/** Mensagem amigável para qualquer erro de mutation. */
export function errorMessage(error: unknown) {
  return error instanceof HttpError ? error.message : 'Não foi possível concluir a operação. Tente novamente.'
}
