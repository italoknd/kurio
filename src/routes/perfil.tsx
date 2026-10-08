import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { Activity, CircleAlert, Download, Heart, LogOut, MapPin, Tag, User } from 'lucide-react'
import { requireAuth } from '@/features/auth/guards'
import { useSignOut } from '@/features/auth/use-auth'
import { notifyUnavailable } from '@/lib/unavailable'

/** Layout da área do colecionador (frames desktop-08-perfil e desktop-09-carteiras). */
export const Route = createFileRoute('/perfil')({
  staticData: { requiresAuth: true },
  beforeLoad: requireAuth,
  component: ProfileLayout,
})

const LINKS = [
  { to: '/perfil', label: 'Dados do perfil', Icon: User },
  { to: '/perfil/carteiras', label: 'Carteiras', Icon: MapPin },
  { to: '/perfil/favoritos', label: 'Lista de interesse', Icon: Heart },
] as const

const UNAVAILABLE = [
  { label: 'Atividade', feature: 'A página de atividade', Icon: Activity },
  { label: 'Ofertas', feature: 'A página de ofertas', Icon: Tag },
  { label: 'Arquivos baixados', feature: 'A página de downloads', Icon: Download },
  { label: 'Suporte', feature: 'O suporte', Icon: CircleAlert },
]

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
                  activeOptions={{ exact: true }}
                  className={`${itemClass} data-[status=active]:before:absolute data-[status=active]:before:inset-y-0 data-[status=active]:before:left-0 data-[status=active]:before:w-1.5 data-[status=active]:before:bg-primary`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            ))}
            {UNAVAILABLE.map(({ label, feature, Icon }) => (
              <li key={label}>
                <button type="button" className={itemClass} onClick={() => notifyUnavailable(feature)}>
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                </button>
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
