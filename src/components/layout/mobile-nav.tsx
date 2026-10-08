import { Link } from '@tanstack/react-router'
import { Heart, House, ShoppingCart, User } from 'lucide-react'

const ITEMS = [
  { to: '/', label: 'Início', Icon: House },
  { to: '/perfil/favoritos', label: 'Favoritos', Icon: Heart },
  { to: '/carrinho', label: 'Carrinho', Icon: ShoppingCart },
  { to: '/perfil', label: 'Perfil', Icon: User },
] as const

/** Navegação inferior do mobile (frame mobile-01-inicio). */
export function MobileNav() {
  return (
    <nav
      aria-label="Navegação inferior"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex h-16 items-center justify-around">
        {ITEMS.map(({ to, label, Icon }) => (
          <li key={label}>
            <Link
              to={to}
              aria-label={label}
              activeOptions={{ exact: true }}
              className="flex size-11 items-center justify-center rounded-full text-primary data-[status=active]:bg-primary/15"
            >
              <Icon className="size-5" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
