import { Link, useRouterState } from '@tanstack/react-router'
import { LogIn, Search, ShoppingCart } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { useSession } from '@/features/auth/session'
import { useCart } from '@/features/cart/use-cart'
import { cn } from '@/lib/utils'
import { notifyUnavailable } from '@/lib/unavailable'

// Menu da conta (Radix DropdownMenu) só é baixado para quem está autenticado.
const UserMenu = lazy(() => import('@/features/auth/user-menu').then((m) => ({ default: m.UserMenu })))

const MARKET_PATHS = ['/nft', '/carrinho', '/pagamento']

export function SiteHeader() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isMarket = MARKET_PATHS.some((path) => pathname.startsWith(path))
  const isHome = pathname === '/'
  const { user, isPending } = useSession()
  const itemCount = useCart().data?.itemCount ?? 0

  return (
    <header className="hidden md:block">
      <div className="container-site flex h-[68px] items-center justify-between border-b border-border">
        <Link to="/" className="text-sm font-bold tracking-wider" aria-label="Kurio, página inicial">
          KURIO
        </Link>

        <nav aria-label="Principal" className="flex h-full items-stretch gap-6 lg:gap-10">
          <NavItem to="/" active={isHome}>
            Início
          </NavItem>
          <NavItem to="/" hash="catalogo" active={isMarket}>
            Mercado
          </NavItem>
          <NavButton onClick={() => notifyUnavailable('A página de criadores')}>Criadores</NavButton>
          <NavButton onClick={() => notifyUnavailable('A seção Aprenda')}>Aprenda</NavButton>
        </nav>

        <div className="flex items-center gap-6">
          <Link to="/" hash="catalogo" aria-label="Buscar NFTs" className="rounded-sm p-1 hover:text-primary">
            <Search className="size-6" aria-hidden="true" />
          </Link>
          <Link
            to="/carrinho"
            aria-label={itemCount > 0 ? `Carrinho, ${itemCount} ${itemCount === 1 ? 'item' : 'itens'}` : 'Carrinho'}
            className="relative rounded-sm p-1 hover:text-primary"
          >
            <ShoppingCart className="size-6" aria-hidden="true" />
            {itemCount > 0 && (
              <span aria-hidden="true" className="absolute -top-0.5 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </Link>
          {isPending ? (
            <span className="h-9 w-24" aria-hidden="true" />
          ) : user ? (
            <Suspense fallback={<span className="h-9 w-24" aria-hidden="true" />}>
              <UserMenu user={user} />
            </Suspense>
          ) : (
            <Link
              to="."
              search={(prev) => ({ ...prev, auth: 'entrar' as const })}
              className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-2.5 text-base font-medium text-primary-foreground hover:bg-primary-hover"
            >
              <LogIn className="size-5" aria-hidden="true" />
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

const navItemClass = 'relative flex items-center pt-0.5 text-base transition-colors hover:text-primary'
const activeIndicator = 'after:absolute after:inset-x-0 after:-bottom-px after:h-[3px] after:bg-primary'

function NavItem({
  to,
  hash,
  active,
  children,
}: {
  to: '/'
  hash?: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      hash={hash}
      activeOptions={{ exact: true, includeHash: true }}
      aria-current={active ? 'page' : undefined}
      className={cn(navItemClass, active && ['font-bold text-primary', activeIndicator])}
    >
      {children}
    </Link>
  )
}

function NavButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={navItemClass}>
      {children}
    </button>
  )
}
