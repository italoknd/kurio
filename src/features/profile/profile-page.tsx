import { ImageIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { EnsField } from '@/components/forms/ens-field'
import { TextField } from '@/components/forms/text-field'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  PASSWORD_FIELDS,
  PROFILE_FIELDS,
  passwordSchema,
  profileSchema,
  type PasswordValues,
  type ProfileValues,
} from '@/features/profile/schemas'
import { useChangePassword, useProfile, useRemoveAvatar, useUpdateAvatar, useUpdateProfile } from '@/features/profile/use-profile'
import { applyServerErrors, errorMessage, zodResolver } from '@/lib/forms'
import { usePageTitle } from '@/lib/use-page-title'
import type { User } from '@/types/auth'

/** Dados do perfil, avatar e senha (frame desktop-08). */
export function ProfilePage() {
  usePageTitle('Meu perfil')
  const profile = useProfile()

  if (profile.isError && !profile.data) {
    return (
      <section role="alert" className="flex flex-col items-start gap-3">
        <h1 className="text-lg font-bold">Não foi possível carregar o perfil</h1>
        <p className="text-muted-foreground">{errorMessage(profile.error)}</p>
        <Button onClick={() => void profile.refetch()} disabled={profile.isFetching}>Tentar novamente</Button>
      </section>
    )
  }

  if (!profile.data) {
    return (
      <div aria-busy="true" aria-label="Carregando perfil" className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-10">
      <ProfileForm key={profile.data.id} user={profile.data} />
      <PasswordForm />
    </div>
  )
}

function toValues(user: User): ProfileValues {
  return {
    displayName: user.displayName,
    username: user.username,
    email: user.email,
    ensName: user.ensName ?? '',
    walletNickname: user.walletNickname ?? '',
  }
}

function ProfileForm({ user }: { user: User }) {
  const update = useUpdateProfile()
  const form = useForm<ProfileValues>({ resolver: zodResolver(profileSchema), defaultValues: toValues(user) })
  const { errors, isDirty } = form.formState

  const submit = form.handleSubmit((values) =>
    update.mutate(
      { ...values, ensName: values.ensName || null },
      {
        onSuccess: (saved) => {
          form.reset(toValues(saved))
          toast.success('Perfil atualizado.')
        },
        onError: (error) => {
          if (!applyServerErrors(error, form.setError, PROFILE_FIELDS)) toast.error(errorMessage(error))
        },
      },
    ),
  )

  return (
    <section aria-labelledby="perfil-titulo">
      <h1 id="perfil-titulo" className="text-base font-bold">Perfil do colecionador</h1>
      <div className="mt-6 grid gap-x-7 gap-y-5 md:grid-cols-2">
        <form id="perfil-form" onSubmit={submit} noValidate aria-labelledby="perfil-titulo" className="contents">
          <TextField label="Nome de exibição" required autoComplete="name" error={errors.displayName?.message} {...form.register('displayName')} />
          <TextField label="Nome de usuário" required autoComplete="username" error={errors.username?.message} {...form.register('username')} />
          <TextField label="E-mail" required type="email" autoComplete="email" error={errors.email?.message} {...form.register('email')} />
          <EnsField label="Nome ENS (opcional)" error={errors.ensName?.message} {...form.register('ensName')} />
          <TextField label="Apelido da carteira" required error={errors.walletNickname?.message} {...form.register('walletNickname')} />
        </form>
        <AvatarField user={user} />
      </div>
      <Button type="submit" form="perfil-form" disabled={update.isPending} className="mt-6 w-32">
        {update.isPending ? 'Salvando…' : 'Salvar'}
      </Button>
      {isDirty && !update.isPending && <p className="mt-2 text-xs text-muted-foreground">Há alterações não salvas.</p>}
    </section>
  )
}

const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const AVATAR_MAX_BYTES = 1_000_000

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/** Avatar: PNG, JPEG ou WebP de até 1 MB, validado antes do envio e novamente pela API. */
function AvatarField({ user }: { user: User }) {
  const updateAvatar = useUpdateAvatar()
  const removeAvatar = useRemoveAvatar()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const busy = updateAvatar.isPending || removeAvatar.isPending

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)
    if (!AVATAR_TYPES.includes(file.type)) return setError('Envie uma imagem PNG, JPEG ou WebP.')
    if (file.size > AVATAR_MAX_BYTES) return setError('A imagem deve ter no máximo 1 MB.')
    try {
      const dataUrl = await readAsDataUrl(file)
      updateAvatar.mutate(dataUrl, {
        onSuccess: () => toast.success('Avatar atualizado.'),
        onError: (err) => setError(errorMessage(err)),
      })
    } catch {
      setError('Não foi possível ler a imagem.')
    }
  }

  return (
    <div className="flex flex-col gap-2" role="group" aria-labelledby="avatar-rotulo" aria-describedby={error ? 'avatar-erro' : 'avatar-dica'}>
      <span id="avatar-rotulo" className="text-sm">Avatar</span>
      <div className="flex flex-wrap items-center gap-6">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="Seu avatar" className="size-12 rounded-full object-cover" />
        ) : (
          <span className="flex size-12 items-center justify-center rounded-full border border-border bg-card text-primary" aria-label="Sem avatar" role="img">
            <ImageIcon className="size-5" aria-hidden="true" />
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={AVATAR_TYPES.join(',')}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          data-testid="avatar-input"
          onChange={(event) => {
            void handleFile(event.target.files?.[0])
            event.target.value = ''
          }}
        />
        <Button onClick={() => inputRef.current?.click()} disabled={busy} className="w-24">
          {updateAvatar.isPending ? 'Enviando…' : 'Alterar'}
        </Button>
        {user.avatarUrl && (
          <Button
            variant="ghost"
            onClick={() =>
              removeAvatar.mutate(undefined, {
                onSuccess: () => toast.success('Avatar removido.'),
                onError: (err) => setError(errorMessage(err)),
              })
            }
            disabled={busy}
          >
            Remover
          </Button>
        )}
      </div>
      {error ? (
        <p id="avatar-erro" role="alert" className="text-xs text-destructive">{error}</p>
      ) : (
        <p id="avatar-dica" className="text-xs text-muted-foreground">PNG, JPEG ou WebP, até 1 MB.</p>
      )}
    </div>
  )
}

function PasswordForm() {
  const change = useChangePassword()
  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })
  const { errors } = form.formState

  const submit = form.handleSubmit(({ currentPassword, newPassword }) =>
    change.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          form.reset()
          toast.success('Senha alterada.')
        },
        onError: (error) => {
          if (!applyServerErrors(error, form.setError, PASSWORD_FIELDS)) toast.error(errorMessage(error))
        },
      },
    ),
  )

  return (
    <form onSubmit={submit} noValidate aria-labelledby="senha-titulo" className="flex flex-col gap-5 md:max-w-[417px]">
      <h2 id="senha-titulo" className="text-base font-bold">Alterar senha</h2>
      <TextField label="Senha atual" type="password" autoComplete="current-password" error={errors.currentPassword?.message} {...form.register('currentPassword')} />
      <TextField
        label="Nova senha"
        type="password"
        autoComplete="new-password"
        hint="Mínimo de 8 caracteres, com letras e números."
        error={errors.newPassword?.message}
        {...form.register('newPassword')}
      />
      <TextField label="Confirmar nova senha" type="password" autoComplete="new-password" error={errors.confirmPassword?.message} {...form.register('confirmPassword')} />
      <Button type="submit" disabled={change.isPending} className="w-40 self-start">
        {change.isPending ? 'Alterando…' : 'Alterar senha'}
      </Button>
    </form>
  )
}
