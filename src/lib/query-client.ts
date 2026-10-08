import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { reportRequestError } from '@/features/auth/session-expiry'
import { HttpError } from '@/lib/http'

const MAX_RETRIES = 2

/**
 * Política de cache e retries (documentada em ARCHITECTURE.md):
 * - consultas ficam "frescas" por 30s e saem do cache após 5 min sem uso;
 * - só falhas transitórias (rede, timeout, 5xx) são repetidas, até 2 vezes com backoff;
 * - mutations nunca são repetidas automaticamente (evita operações duplicadas);
 * - todo erro passa por `reportRequestError`, que detecta sessão expirada (401 com token).
 */
export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({ onError: reportRequestError }),
    mutationCache: new MutationCache({ onError: reportRequestError }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) =>
          failureCount < MAX_RETRIES && error instanceof HttpError && error.isTransient,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      },
      mutations: {
        retry: false,
      },
    },
  })
}
