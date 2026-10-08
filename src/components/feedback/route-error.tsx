import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import { useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { HttpError } from '@/lib/http'

/** Erro inesperado ao carregar uma rota, com nova tentativa. */
export function RouteError({ error }: ErrorComponentProps) {
  const router = useRouter()
  const queryErrorReset = useQueryErrorResetBoundary()

  useEffect(() => {
    queryErrorReset.reset()
  }, [queryErrorReset])

  const message = error instanceof HttpError ? error.message : 'Algo deu errado ao carregar esta página.'

  return (
    <section role="alert" className="container-site flex flex-col items-center gap-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Não foi possível carregar</h1>
      <p className="text-muted-foreground">{message}</p>
      <Button onClick={() => router.invalidate()}>Tentar novamente</Button>
    </section>
  )
}
