import { useForm } from 'react-hook-form'
import { TextField } from '@/components/forms/text-field'
import { Button } from '@/components/ui/button'
import { loginSchema, registerSchema, type LoginValues, type RegisterValues } from '@/features/auth/schemas'
import { useLogin, useRegister } from '@/features/auth/use-auth'
import { applyServerErrors, errorMessage, zodResolver } from '@/lib/forms'
import { HttpError } from '@/lib/http'
import { notifyUnavailable } from '@/lib/unavailable'
import type { Session } from '@/types/auth'

interface FormProps {
  /** Chamado após autenticar (o aviso de boas-vindas fica no hook de login/cadastro). */
  onSuccess?: (session: Session) => void
}

export function LoginForm({ onSuccess }: FormProps = {}) {
  const login = useLogin()
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })
  const { errors } = form.formState

  const submit = form.handleSubmit((values) =>
    login.mutate(values, {
      onSuccess,
      onError: (error) => applyServerErrors(error, form.setError, ['email', 'password']),
    }),
  )

  // 401 aqui é credencial incorreta (sem sessão prévia), exibido no topo do formulário.
  const formError = login.error && !(login.error instanceof HttpError && Object.keys(login.error.fields).length > 0)
    ? errorMessage(login.error)
    : null

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4" aria-label="Entrar">
      {formError && <FormAlert>{formError}</FormAlert>}
      <TextField
        label="E-mail"
        hideLabel
        type="email"
        autoComplete="email"
        placeholder="contato@email.com"
        error={errors.email?.message}
        {...form.register('email')}
      />
      <TextField
        label="Senha"
        hideLabel
        type="password"
        autoComplete="current-password"
        placeholder="Senha"
        error={errors.password?.message}
        {...form.register('password')}
      />
      <button
        type="button"
        onClick={() => notifyUnavailable('A recuperação de senha')}
        className="self-end text-sm text-primary hover:underline"
      >
        Esqueceu a senha?
      </button>
      <Button type="submit" size="lg" disabled={login.isPending} className="mt-1 w-full">
        {login.isPending ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  )
}

export function RegisterForm({ onSuccess, submitLabel = 'Criar conta' }: FormProps & { submitLabel?: string } = {}) {
  const register = useRegister()
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  })
  const { errors } = form.formState

  const submit = form.handleSubmit(({ username, email, password }) =>
    register.mutate(
      { username, email, password },
      { onSuccess, onError: (error) => applyServerErrors(error, form.setError, ['username', 'email', 'password']) },
    ),
  )

  const formError = register.error && !(register.error instanceof HttpError && Object.keys(register.error.fields).length > 0)
    ? errorMessage(register.error)
    : null

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4" aria-label="Criar conta">
      {formError && <FormAlert>{formError}</FormAlert>}
      <TextField
        label="Nome de usuário"
        hideLabel
        autoComplete="username"
        placeholder="Nome de usuário"
        error={errors.username?.message}
        {...form.register('username')}
      />
      <TextField
        label="E-mail"
        hideLabel
        type="email"
        autoComplete="email"
        placeholder="Digite seu e-mail"
        error={errors.email?.message}
        {...form.register('email')}
      />
      <TextField
        label="Senha"
        hideLabel
        type="password"
        autoComplete="new-password"
        placeholder="Senha"
        hint="Mínimo de 8 caracteres, com letras e números."
        error={errors.password?.message}
        {...form.register('password')}
      />
      <TextField
        label="Confirmar senha"
        hideLabel
        type="password"
        autoComplete="new-password"
        placeholder="Confirmar senha"
        error={errors.confirmPassword?.message}
        {...form.register('confirmPassword')}
      />
      <Button type="submit" size="lg" disabled={register.isPending} className="mt-1 w-full">
        {register.isPending ? 'Criando…' : submitLabel}
      </Button>
    </form>
  )
}

function FormAlert({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {children}
    </p>
  )
}
