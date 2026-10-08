import { createFileRoute } from '@tanstack/react-router'
import { AuthPage } from '@/features/auth/auth-page'
import { validateAuthSearch } from '@/features/auth/guards'

export const Route = createFileRoute('/entrar')({
  validateSearch: validateAuthSearch,
  staticData: { minimalMobileChrome: true },
  component: LoginRoute,
})

function LoginRoute() {
  const { redirect, motivo } = Route.useSearch()
  return <AuthPage mode="entrar" redirect={redirect} motivo={motivo} />
}
