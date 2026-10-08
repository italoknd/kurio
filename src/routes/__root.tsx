import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet, useRouterState } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { MobileNav } from '@/components/layout/mobile-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { NotFound } from '@/components/feedback/not-found'
import { RouteError } from '@/components/feedback/route-error'
import { ConnectionStatus } from '@/components/realtime/connection-status'
import { RealtimeConnection } from '@/components/realtime/realtime-connection'
import { Toaster } from '@/components/ui/sonner'
import { AuthDialog } from '@/features/auth/auth-dialog'
import { validateRootSearch } from '@/features/auth/guards'
import { SessionManager } from '@/features/auth/session-manager'
import { TooltipProvider } from '@/components/ui/tooltip'
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
    <TooltipProvider>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 font-bold text-primary-foreground focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        Pular para o conteúdo
      </a>
      <SiteHeader />
      <main id="conteudo" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>
      <SiteFooter className={minimalMobileChrome ? 'hidden md:block' : undefined} />
      {!minimalMobileChrome && <MobileNav />}
      <ConnectionStatus />
      <RealtimeConnection />
      <SessionManager />
      <AuthDialog />
      <Toaster position="top-center" />
      <Suspense>
        {MockPanel && <MockPanel />}
        {Devtools && <Devtools />}
      </Suspense>
    </TooltipProvider>
  )
}
