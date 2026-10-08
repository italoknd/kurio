import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { LoginForm, RegisterForm, SocialLogin } from '@/features/auth/auth-forms'
import { safeRedirect } from '@/features/auth/guards'
import { useSession } from '@/features/auth/session'
import type { AuthMode } from '@/features/auth/auth-dialog'
import type { Session } from '@/types/auth'

interface AuthPageProps {
  mode: AuthMode
  redirect?: string
  motivo?: 'expirada'
}

/**
 * Login/cadastro em página cheia (frames mobile-05 e mobile-06). Usada no mobile,
 * no acesso direto e no redirecionamento de rotas privadas; ao autenticar, volta
 * para o destino em `redirect`.
 */
export function AuthPage({ mode, redirect, motivo }: AuthPageProps) {
  const navigate = useNavigate()
  const { isAuthenticated } = useSession()
  const target = safeRedirect(redirect)

  // Já autenticado (ex.: acesso direto a /entrar): segue para o destino.
  useEffect(() => {
    if (isAuthenticated) void navigate({ to: target, replace: true })
  }, [isAuthenticated, navigate, target])

  function handleSuccess(session: Session) {
    toast.success(`Olá, ${session.user.displayName}!`)
  }

  const isLogin = mode === 'entrar'

  return (
    <section className="mx-auto flex w-full max-w-[420px] flex-col px-4 pt-16 pb-10 md:pt-12">
      <p className="text-center text-3xl font-bold tracking-wider" aria-hidden="true">
        KURIO
      </p>
      <h1 className="mt-16 mb-8 text-center text-lg font-bold md:mt-10">
        {isLogin ? 'Entrar' : 'Criar perfil de colecionador'}
      </h1>

      {motivo === 'expirada' && (
        <p role="status" className="mb-4 rounded-md border border-primary/60 bg-primary/10 px-3 py-2 text-sm">
          Sua sessão expirou. Entre novamente para continuar de onde parou.
        </p>
      )}

      {isLogin ? (
        <LoginForm onSuccess={handleSuccess} />
      ) : (
        <RegisterForm onSuccess={handleSuccess} submitLabel="Criar perfil" />
      )}

      <div className="mt-8">
        <SocialLogin />
      </div>

      <p className="mt-10 text-center text-sm">
        {isLogin ? 'Novo na Kurio? ' : 'Já tem uma conta? '}
        <Link
          to={isLogin ? '/cadastro' : '/entrar'}
          search={{ redirect }}
          className="font-bold text-primary hover:underline"
        >
          {isLogin ? 'Crie uma conta' : 'Entre'}
        </Link>
      </p>
    </section>
  )
}
