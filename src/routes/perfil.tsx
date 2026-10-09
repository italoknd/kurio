import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { Activity, CircleAlert, Download, Heart, LogOut, MapPin, Tag, User } from 'lucide-react'
import { requireAuth } from '@/features/auth/guards'
import { useSignOut } from '@/features/auth/use-auth'

/** Layout da área do colecionador (frames desktop-08-perfil e desktop-09-carteiras). */
export const Route = createFileRoute('/perfil')({
  staticData: { requiresAuth: true },
  beforeLoad: requireAuth,
  component: ProfileLayout,
})

const LINKS = [
  { to: '/perfil', label: 'Dados do perfil', Icon: User },
  { to: '/perfil/carteiras', label: 'Carteiras', Icon: MapPin },
  { to: '/perfil/atividade', label: 'Atividade', Icon: Activity },
  { to: '/perfil/favoritos', label: 'Lista de interesse', Icon: Heart },
  { to: '/perfil/ofertas', label: 'Ofertas', Icon: Tag },
  { to: '/perfil/arquivos', label: 'Arquivos baixados', Icon: Download },
  { to: '/perfil/suporte', label: 'Suporte', Icon: CircleAlert },
] as const

const itemClass =
  'relative flex h-11 w-full items-center gap-3 px-4 text-sm text-primary transition-colors hover:bg-surface-strong'

function ProfileLayout() {
  const signOut = useSignOut()

  return (
    <div className="container-site grid gap-6 py-6 md:grid-cols-[310px_1fr] md:gap-7 md:py-8">
      <aside className="self-start bg-card py-2">
        <h2 className="px-3 py-2 text-lg font-bold">Meu perfil</h2>
        <nav aria-label="Área do colecionador">
          <ul>
            {LINKS.map(({ to, label, Icon }) => (
              <li key={to}>
                <Link
                  to={to}
                  activeOptions={{ exact: true, includeSearch: false }}
                  className={`${itemClass} data-[status=active]:before:absolute data-[status=active]:before:inset-y-0 data-[status=active]:before:left-0 data-[status=active]:before:w-1.5 data-[status=active]:before:bg-primary`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={signOut.run}
            disabled={signOut.isPending}
            className={`${itemClass} mt-1 border-t border-border font-bold`}
          >
            <LogOut className="size-4" aria-hidden="true" />
            Sair
          </button>
        </nav>
      </aside>
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
