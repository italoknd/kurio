import { useNavigate, useSearch } from '@tanstack/react-router'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { LoginForm, RegisterForm } from '@/features/auth/auth-forms'
import { SocialLogin } from '@/features/auth/social-login'
import { cn } from '@/lib/utils'

export type AuthMode = 'entrar' | 'cadastro'

const DESCRIPTIONS: Record<AuthMode, string> = {
  entrar: 'Entre para gerenciar sua carteira, coleção e perfil de criador.',
  cadastro: 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.',
}

/**
 * Login/cadastro em modal sobre a página atual (frames desktop-06 e desktop-07).
 * Aberto pelo parâmetro de busca `?auth=entrar|cadastro`, então "voltar" fecha o
 * modal e, após autenticar, o usuário continua na mesma página.
 */
export function AuthDialog() {
  const navigate = useNavigate()
  const mode = useSearch({ strict: false, select: (search) => search.auth })

  function setMode(next: AuthMode | undefined) {
    void navigate({ to: '.', search: (prev) => ({ ...prev, auth: next }), replace: next !== undefined && mode !== undefined })
  }

  function handleSuccess() {
    setMode(undefined)
  }

  return (
    <Dialog open={mode !== undefined} onOpenChange={(open) => !open && setMode(undefined)}>
      <DialogContent
        onOpenAutoFocus={(event) => {
          // Foco inicial no primeiro campo do formulário, não na aba.
          event.preventDefault()
          const content = event.currentTarget as HTMLElement
          content.querySelector<HTMLInputElement>('form input')?.focus()
        }}
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-none border-b-10 border-primary bg-card px-6 py-10 sm:max-w-125 sm:px-20"
      >
        {mode && (
          <>
            <div role="tablist" aria-label="Acesso à conta" className="flex items-center justify-center text-xl">
              <ModeTab active={mode === 'entrar'} onClick={() => setMode('entrar')}>
                Entrar
              </ModeTab>
              <span aria-hidden="true" className="mx-1.5 h-6 w-px bg-primary" />
              <ModeTab active={mode === 'cadastro'} onClick={() => setMode('cadastro')}>
                Criar conta
              </ModeTab>
            </div>
            <DialogTitle className="sr-only">{mode === 'entrar' ? 'Entrar' : 'Criar conta'}</DialogTitle>
            <DialogDescription className="mt-8 mb-6 text-center text-sm text-foreground">{DESCRIPTIONS[mode]}</DialogDescription>
            <div role="tabpanel">
              {mode === 'entrar' ? <LoginForm onSuccess={handleSuccess} /> : <RegisterForm onSuccess={handleSuccess} />}
            </div>
            <div className="mt-8">
              <SocialLogin onSuccess={handleSuccess} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ModeTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn('rounded-sm px-1 transition-colors', active ? 'text-primary' : 'text-foreground hover:text-primary')}
    >
      {children}
    </button>
  )
}
