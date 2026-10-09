import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet, useRouterState } from '@tanstack/react-router'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { MobileNav } from '@/components/layout/mobile-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { NotFound } from '@/components/feedback/not-found'
import { RouteError } from '@/components/feedback/route-error'
import { ConnectionStatus } from '@/components/realtime/connection-status'
import { RealtimeConnection } from '@/components/realtime/realtime-connection'
import { Toaster } from '@/components/ui/sonner'
import { validateRootSearch } from '@/features/auth/guards'
import { SessionManager } from '@/features/auth/session-manager'
import { env } from '@/lib/env'

export interface RouterContext {
  queryClient: QueryClient
}

declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    /** Rota privada: sem sessão, leva ao login guardando o destino. */
    requiresAuth?: boolean
    /** Página sem navegação inferior e rodapé no mobile (login/cadastro, como no Figma). */
    minimalMobileChrome?: boolean
  }
}

// Formulários de login/cadastro (e o zod) só são baixados quando o modal é aberto.
const AuthDialog = lazy(() => import('@/features/auth/auth-dialog').then((m) => ({ default: m.AuthDialog })))

const MockPanel = env.enableMocks ? lazy(() => import('@/mocks/mock-panel')) : null

const Devtools = import.meta.env.DEV
  ? lazy(async () => {
      const [{ TanStackRouterDevtools }, { ReactQueryDevtools }] = await Promise.all([
        import('@tanstack/react-router-devtools'),
        import('@tanstack/react-query-devtools'),
      ])
      return {
        default: () => (
          <>
            <TanStackRouterDevtools position="bottom-right" />
            <ReactQueryDevtools buttonPosition="top-right" />
          </>
        ),
      }
    })
  : null

export const Route = createRootRouteWithContext<RouterContext>()({
  validateSearch: validateRootSearch,
  component: RootLayout,
  notFoundComponent: NotFound,
  errorComponent: RouteError,
})

function RootLayout() {
  const minimalMobileChrome = useRouterState({
    select: (state) => state.matches.some((match) => match.staticData?.minimalMobileChrome),
  })

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 font-bold text-primary-foreground focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        Pular para o conteúdo
      </a>
      <SiteHeader />
      <main id="conteudo" tabIndex={-1} className="min-h-dvh outline-none">
        <Outlet />
      </main>
      <SiteFooter className={minimalMobileChrome ? 'hidden md:block' : undefined} />
      {!minimalMobileChrome && <MobileNav />}
      <ConnectionStatus />
      <RealtimeConnection />
      <SessionManager />
      <AuthDialogSlot />
      {/* No mobile, abaixo da barra superior (voltar/favoritar) para não cobrir seus botões. */}
      <Toaster position="top-center" mobileOffset={{ top: 72 }} />
      <Suspense>
        {MockPanel && <IdleMount><MockPanel /></IdleMount>}
        {Devtools && <Devtools />}
      </Suspense>
    </>
  )
}

function AuthDialogSlot() {
  const open = useRouterState({ select: (state) => (state.location.search as { auth?: string }).auth !== undefined })
  const opener = useRef<HTMLElement | null>(null)

  // O modal abre por parâmetro de busca (e é montado sob demanda): guarda quem tinha o
  // foco ao abrir e o devolve ao fechar, se ainda existir (após o login, o "Entrar" some).
  useEffect(() => {
    if (open) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      return
    }
    const element = opener.current
    opener.current = null
    if (element?.isConnected) element.focus()
  }, [open])

  if (!open) return null
  return (
    <Suspense>
      <AuthDialog />
    </Suspense>
  )
}

/** Monta o conteúdo só quando o navegador fica ocioso (ferramentas fora do caminho crítico). */
function IdleMount({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    // Safari não tem requestIdleCallback: cai para um atraso fixo.
    const idle = (window as { requestIdleCallback?: Window['requestIdleCallback'] }).requestIdleCallback
    if (idle) {
      const id = idle(() => setReady(true), { timeout: 3000 })
      return () => window.cancelIdleCallback(id)
    }
    const id = window.setTimeout(() => setReady(true), 1500)
    return () => window.clearTimeout(id)
  }, [])
  return ready ? children : null
}
