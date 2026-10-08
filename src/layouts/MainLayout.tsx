import { NavLink, Outlet } from 'react-router'

const navItems = [{ to: '/', label: 'Início' }]
const currentYear = new Date().getFullYear()

export function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <span className="text-xl font-bold tracking-tight text-indigo-600">Kurio</span>
          <nav className="flex gap-4">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end
                className={({ isActive }) =>
                  `text-sm font-medium ${isActive ? 'text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-sm text-slate-500">
        © {currentYear} Kurio
      </footer>
    </div>
  )
}
