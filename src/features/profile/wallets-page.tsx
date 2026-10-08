import { useId, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { EnsField } from '@/components/forms/ens-field'
import { SelectField } from '@/components/forms/select-field'
import { TextField } from '@/components/forms/text-field'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { useWallets } from '@/features/checkout/use-checkout'
import { WALLET_FIELDS, walletSchema, type WalletOutput, type WalletValues } from '@/features/profile/schemas'
import { useSaveWallet } from '@/features/profile/use-profile'
import { applyServerErrors, errorMessage, zodResolver } from '@/lib/forms'
import { HttpError } from '@/lib/http'
import { usePageTitle } from '@/lib/use-page-title'
import { NFT_NETWORKS, type NftNetwork } from '@/types/nft'
import { WALLET_TYPES, type Wallet, type WalletInput, type WalletRole, type WalletType } from '@/types/wallet'

const EMPTY: WalletValues = {
  displayName: '',
  nickname: '',
  network: '',
  profileName: '',
  address: '',
  secondaryAddress: '',
  type: '',
  referralCode: '',
  email: '',
  ensName: '',
}

function toValues(wallet: Wallet): WalletValues {
  const { id: _id, role: _role, secondaryAddress, ...rest } = wallet
  return { ...rest, secondaryAddress: secondaryAddress ?? '' }
}

/** Carteiras principal e secundária (frame desktop-09). */
export function WalletsPage() {
  usePageTitle('Carteiras')
  const wallets = useWallets()

  if (wallets.isError && !wallets.data) {
    return (
      <section role="alert" className="flex flex-col items-start gap-3">
        <h1 className="text-lg font-bold">Não foi possível carregar as carteiras</h1>
        <p className="text-muted-foreground">{errorMessage(wallets.error)}</p>
        <Button onClick={() => void wallets.refetch()} disabled={wallets.isFetching}>Tentar novamente</Button>
      </section>
    )
  }

  if (!wallets.data) {
    return (
      <div aria-busy="true" aria-label="Carregando carteiras" className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    )
  }

  const primary = wallets.data.find((w) => w.role === 'primary')
  const secondary = wallets.data.find((w) => w.role === 'secondary')

  return (
    <div className="flex flex-col gap-10">
      <h1 className="sr-only">Carteiras</h1>
      <WalletSection key={primary?.id ?? 'nova-principal'} role="primary" wallet={primary} />
      <WalletSection key={secondary?.id ?? 'nova-secundaria'} role="secondary" wallet={secondary} primary={primary} />
    </div>
  )
}

const TITLES: Record<WalletRole, string> = { primary: 'Carteira principal', secondary: 'Carteira secundária' }

function WalletSection({ role, wallet, primary }: { role: WalletRole; wallet: Wallet | undefined; primary?: Wallet }) {
  const [adding, setAdding] = useState(false)
  const headingId = useId()
  const editing = wallet !== undefined || adding

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={headingId} className="text-base font-bold">{TITLES[role]}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {wallet || adding
              ? role === 'primary'
                ? 'Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.'
                : 'Usada como alternativa no pagamento.'
              : `Você ainda não adicionou uma ${TITLES[role].toLowerCase()}.`}
          </p>
        </div>
        {!wallet && !adding && (
          <Button variant="link" className="h-auto p-0 text-base" onClick={() => setAdding(true)}>
            Adicionar<span className="sr-only"> {TITLES[role].toLowerCase()}</span>
          </Button>
        )}
      </div>

      {editing && (
        <WalletForm
          role={role}
          wallet={wallet}
          primary={role === 'secondary' ? primary : undefined}
          onCancel={wallet ? undefined : () => setAdding(false)}
        />
      )}
    </section>
  )
}

interface WalletFormProps {
  role: WalletRole
  wallet: Wallet | undefined
  primary: Wallet | undefined
  onCancel?: () => void
}

function WalletForm({ role, wallet, primary, onCancel }: WalletFormProps) {
  const save = useSaveWallet()
  const form = useForm<WalletValues, unknown, WalletOutput>({
    resolver: zodResolver(walletSchema),
    defaultValues: wallet ? toValues(wallet) : EMPTY,
  })
  const { errors } = form.formState
  const [sameAsPrimary, setSameAsPrimary] = useState(false)
  const copyId = useId()

  const submit = form.handleSubmit((values) => {
    const body: WalletInput = {
      ...values,
      role,
      network: values.network as NftNetwork,
      type: values.type as WalletType,
      secondaryAddress: values.secondaryAddress || null,
    }
    save.mutate(
      { walletId: wallet?.id, body },
      {
        onSuccess: () => {
          toast.success(`${TITLES[role]} salva.`)
          if (wallet) form.reset(values)
        },
        onError: (error) => {
          if (applyServerErrors(error, form.setError, WALLET_FIELDS)) return
          toast.error(error instanceof HttpError && error.reason === 'WALLET_ROLE_TAKEN' ? error.message : errorMessage(error))
        },
      },
    )
  })

  return (
    <form onSubmit={submit} noValidate aria-label={TITLES[role]} className="flex flex-col gap-5">
      {role === 'secondary' && primary && (
        <div className="flex items-center gap-2 self-end">
          <Checkbox
            id={copyId}
            checked={sameAsPrimary}
            onCheckedChange={(checked) => {
              setSameAsPrimary(checked === true)
              // Copia os dados da principal; o usuário ainda pode ajustar antes de salvar.
              if (checked === true) form.reset({ ...toValues(primary), nickname: `${primary.nickname} (secundária)` })
            }}
          />
          <label htmlFor={copyId} className="text-sm">Igual à carteira principal</label>
        </div>
      )}

      <div className="grid gap-x-7 gap-y-5 md:grid-cols-2">
        <TextField label="Nome de exibição" required error={errors.displayName?.message} {...form.register('displayName')} />
        <TextField label="Apelido da carteira" required error={errors.nickname?.message} {...form.register('nickname')} />
        <Controller
          control={form.control}
          name="network"
          render={({ field }) => (
            <SelectField
              label="Rede"
              required
              value={field.value || undefined}
              onChange={field.onChange}
              options={NFT_NETWORKS}
              placeholder="Selecione uma rede"
              error={errors.network?.message}
            />
          )}
        />
        <TextField label="Nome do perfil" required error={errors.profileName?.message} {...form.register('profileName')} />
        <TextField
          label="Endereço da carteira"
          required
          placeholder="Endereço 0x da carteira"
          spellCheck={false}
          autoComplete="off"
          error={errors.address?.message}
          {...form.register('address')}
        />
        <TextField
          label="ENS ou carteira secundária (opcional)"
          placeholder="ENS ou carteira secundária"
          spellCheck={false}
          autoComplete="off"
          error={errors.secondaryAddress?.message}
          {...form.register('secondaryAddress')}
        />
        <Controller
          control={form.control}
          name="type"
          render={({ field }) => (
            <SelectField
              label="Tipo de carteira"
              required
              value={field.value || undefined}
              onChange={field.onChange}
              options={WALLET_TYPES}
              placeholder="Selecione uma carteira"
              error={errors.type?.message}
            />
          )}
        />
        <TextField label="Código de indicação" required error={errors.referralCode?.message} {...form.register('referralCode')} />
        <TextField label="E-mail" required type="email" autoComplete="email" error={errors.email?.message} {...form.register('email')} />
        <EnsField label="Nome ENS" required error={errors.ensName?.message} {...form.register('ensName')} />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Salvando…' : 'Salvar carteira'}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={save.isPending}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}
