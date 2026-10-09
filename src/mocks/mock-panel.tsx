import { FlaskConical } from 'lucide-react'
import { useState, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { mockControls } from '@/mocks/browser'
import { getMockConfig, NETWORK_PROFILES, subscribeMockConfig, type NetworkProfile } from '@/mocks/config'

/**
 * Painel de cenários da demonstração: condições de rede, seed e reset.
 * Faz parte da camada de mocks e só é carregado quando ela está ativa.
 */
export default function MockPanel() {
  const config = useSyncExternalStore(subscribeMockConfig, getMockConfig)
  const [socketUp, setSocketUp] = useState(true)

  function reset() {
    mockControls.reset()
    window.location.reload()
  }

  function toggleSocket() {
    const next = !socketUp
    mockControls.socket.setAvailable(next)
    setSocketUp(next)
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed top-1/2 right-0 z-50 size-9 rounded-r-none bg-background p-0 md:top-auto md:right-auto md:bottom-4 md:left-4 md:size-auto md:rounded-md md:px-2.5"
          aria-label="Abrir painel de cenários dos mocks"
          data-mock-panel-trigger
        >
          <FlaskConical aria-hidden="true" />
          <span className="hidden md:inline">Cenários</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Cenários dos mocks</SheetTitle>
          <SheetDescription>
            Simula condições de rede e falhas na camada MSW. As escolhas persistem após refresh.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-6">
          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-bold">Rede (REST)</legend>
            <RadioGroup
              value={config.network}
              onValueChange={(value) => mockControls.setConfig({ network: value as NetworkProfile })}
            >
              {Object.entries(NETWORK_PROFILES).map(([key, profile]) => (
                <div key={key} className="flex items-start gap-3">
                  <RadioGroupItem value={key} id={`network-${key}`} className="mt-0.5" />
                  <Label htmlFor={`network-${key}`} className="flex flex-col items-start gap-0.5">
                    <span>{profile.label}</span>
                    <span className="text-xs font-normal text-muted-foreground">{profile.description}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </fieldset>

          <ChoiceGroup
            legend="Pagamento dos próximos pedidos"
            name="payment"
            value={config.payment}
            options={[
              ['aprovar', 'Confirmar'],
              ['recusar', 'Recusar'],
            ]}
            onChange={(value) => mockControls.setConfig({ payment: value as 'aprovar' | 'recusar' })}
          />

          <ChoiceGroup
            legend="Conexão da carteira"
            name="wallet"
            value={config.walletConnection}
            options={[
              ['aceitar', 'Aceitar'],
              ['recusar', 'Recusar'],
            ]}
            onChange={(value) => mockControls.setConfig({ walletConnection: value as 'aceitar' | 'recusar' })}
          />

          <ChoiceGroup
            legend="Login social (Google/Facebook)"
            name="social"
            value={config.socialLogin}
            options={[
              ['aceitar', 'Autorizar'],
              ['recusar', 'Negar acesso'],
            ]}
            onChange={(value) => mockControls.setConfig({ socialLogin: value as 'aceitar' | 'recusar' })}
          />

          <div className="space-y-2">
            <p className="text-sm font-bold">Sessão</p>
            <Button variant="outline" size="sm" onClick={() => mockControls.session.expireAll()}>
              Expirar sessões ativas
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-bold">Tempo real (Socket.IO)</p>
            <Button variant="outline" size="sm" onClick={toggleSocket} aria-pressed={!socketUp}>
              {socketUp ? 'Derrubar conexão' : 'Restabelecer conexão'}
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-bold">Seed atual: {config.seed}</p>
            <Button onClick={reset} className="w-full">
              Restaurar cenário padrão
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function ChoiceGroup({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string
  name: string
  value: string
  options: [string, string][]
  onChange: (value: string) => void
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-bold">{legend}</legend>
      <RadioGroup value={value} onValueChange={onChange} className="flex gap-4">
        {options.map(([optionValue, label]) => (
          <div key={optionValue} className="flex items-center gap-2">
            <RadioGroupItem value={optionValue} id={`${name}-${optionValue}`} />
            <Label htmlFor={`${name}-${optionValue}`}>{label}</Label>
          </div>
        ))}
      </RadioGroup>
    </fieldset>
  )
}
