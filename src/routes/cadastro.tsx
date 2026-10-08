import { createFileRoute } from '@tanstack/react-router'
import { AuthPage } from '@/features/auth/auth-page'
import { validateAuthSearch } from '@/features/auth/guards'

export const Route = createFileRoute('/cadastro')({
  validateSearch: validateAuthSearch,
  staticData: { minimalMobileChrome: true },
  component: RegisterRoute,
})

function RegisterRoute() {
  const { redirect } = Route.useSearch()
  return <AuthPage mode="cadastro" redirect={redirect} />
}
