import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { TextField } from '@/components/forms/text-field'
import { FacebookLogo, GoogleLogo } from '@/components/icons/social-login-icons'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useSocialLogin } from '@/features/auth/use-auth'
import { applyServerErrors, errorMessage, zodResolver } from '@/lib/forms'
import { SOCIAL_PROVIDERS, type Session, type SocialProvider } from '@/types/auth'

const LOGOS: Record<SocialProvider, () => React.ReactNode> = { google: GoogleLogo, facebook: FacebookLogo }

/** Conta fictícia sugerida pelo "provedor" (pode ser trocada por um e-mail já cadastrado). */
const SUGGESTED: Record<SocialProvider, { displayName: string; email: string }> = {
  google: { displayName: 'Colecionador Google', email: 'colecionador.google@exemplo.com' },
  facebook: { displayName: 'Colecionador Facebook', email: 'colecionador.facebook@exemplo.com' },
}

const consentSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe um nome com pelo menos 2 caracteres.'),
  email: z.string().trim().min(1, 'Informe o e-mail.').email('Informe um e-mail válido.'),
})

type ConsentValues = z.infer<typeof consentSchema>

interface SocialLoginProps {
  /** Chamado após autenticar (fecha o modal; a página de login redireciona sozinha). */
  onSuccess?: (session: Session) => void
}

/**
 * "Ou continue com" + Google/Facebook. Não há integração real: a tela do provedor é
 * simulada aqui e a API simulada (`POST /auth/social`) entra na conta com o e-mail
 * informado ou cria uma nova — como a conexão de carteira, que também é simulada.
 */
export function SocialLogin({ onSuccess }: SocialLoginProps = {}) {
  const [provider, setProvider] = useState<SocialProvider | null>(null)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-sm" role="presentation">
        <span className="h-px flex-1 bg-border" />
        Ou continue com
        <span className="h-px flex-1 bg-border" />
      </div>
      {(Object.keys(SOCIAL_PROVIDERS) as SocialProvider[]).map((id) => {
        const Logo = LOGOS[id]
        return (
          <Button
            key={id}
            variant="outline"
            className="w-full border-border text-sm font-medium text-muted-foreground"
            onClick={() => setProvider(id)}
          >
            <Logo />
            Continuar com {SOCIAL_PROVIDERS[id]}
          </Button>
        )
      })}
      {provider && <ConsentDialog key={provider} provider={provider} onClose={() => setProvider(null)} onSuccess={onSuccess} />}
    </div>
  )
}

function ConsentDialog({
  provider,
  onClose,
  onSuccess,
}: {
  provider: SocialProvider
  onClose: () => void
  onSuccess?: (session: Session) => void
}) {
  const social = useSocialLogin()
  const name = SOCIAL_PROVIDERS[provider]
  const Logo = LOGOS[provider]
  const form = useForm<ConsentValues>({ resolver: zodResolver(consentSchema), defaultValues: SUGGESTED[provider] })
  const { errors } = form.formState

  const submit = form.handleSubmit((values) =>
    social.mutate(
      { provider, ...values },
      {
        onSuccess: (session) => {
          onClose()
          onSuccess?.(session)
        },
        onError: (error) => applyServerErrors(error, form.setError, ['email', 'displayName']),
      },
    ),
  )

  const formError = social.error && !applyableFields(social.error) ? errorMessage(social.error) : null

  return (
    <Dialog open onOpenChange={(open) => !open && !social.isPending && onClose()}>
      <DialogContent className="gap-5 rounded-none border-b-10 border-primary bg-card px-6 py-8 sm:max-w-md sm:px-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-full border border-border bg-background [&_svg]:size-6">
            <Logo />
          </span>
          <DialogTitle className="text-lg font-bold">Continuar com {name}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Simulação do {name}: nenhum dado é enviado ao provedor. Autorize com a conta abaixo ou use o e-mail de
            uma conta Kurio existente (ex.: ana@kurio.dev) para entrar nela.
          </DialogDescription>
        </div>

        <form onSubmit={submit} noValidate aria-label={`Autorizar acesso com ${name}`} className="flex flex-col gap-4">
          {formError && (
            <p role="alert" className="rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          )}
          <TextField label={`Nome na conta ${name}`} autoComplete="name" error={errors.displayName?.message} {...form.register('displayName')} />
          <TextField label={`E-mail da conta ${name}`} type="email" autoComplete="email" error={errors.email?.message} {...form.register('email')} />
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onClose} disabled={social.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={social.isPending}>
              {social.isPending ? 'Autorizando…' : 'Autorizar e continuar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** O erro traz erros por campo conhecidos (exibidos nos próprios campos). */
function applyableFields(error: Error) {
  const fields = (error as { fields?: Record<string, string> }).fields ?? {}
  return 'email' in fields || 'displayName' in fields
}
