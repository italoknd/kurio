import { Link } from '@tanstack/react-router'
import { ChevronDown, Heart, LogOut, MapPin, User } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSignOut } from '@/features/auth/use-auth'
import type { User as SessionUser } from '@/types/auth'

export function UserAvatar({ user, className = 'size-8' }: { user: SessionUser; className?: string }) {
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt="" className={`${className} rounded-full object-cover`} />
  }
  return (
    <span
      aria-hidden="true"
      className={`${className} flex items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground`}
    >
      {user.displayName.charAt(0).toUpperCase()}
    </span>
  )
}

/** Menu da conta no header (estado autenticado, sem frame no Figma). */
export function UserMenu({ user }: { user: SessionUser }) {
  const signOut = useSignOut()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-surface-strong"
        aria-label={`Conta de ${user.displayName}`}
      >
        <UserAvatar user={user} />
        <span className="hidden max-w-32 truncate text-sm lg:inline">{user.displayName}</span>
        <ChevronDown className="size-4 text-primary" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/perfil">
            <User aria-hidden="true" /> Meu perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/perfil/carteiras">
            <MapPin aria-hidden="true" /> Carteiras
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/perfil/favoritos">
            <Heart aria-hidden="true" /> Lista de interesse
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut.run()} disabled={signOut.isPending}>
          <LogOut aria-hidden="true" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
