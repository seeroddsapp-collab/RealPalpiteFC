import Link from 'next/link'
import { LogoutButton } from './logout-button'

const NAV = [
  { href: '/dashboard',             label: '📊 Dashboard' },
  { href: '/dashboard/pools',       label: '🎯 Pools' },
  { href: '/dashboard/usuarios',    label: '👥 Usuários' },
  { href: '/dashboard/campeonatos', label: '🏆 Campeonatos' },
]

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-slate-900 flex flex-col">
      <div className="px-6 py-5 border-b border-slate-700">
        <span className="text-white font-bold text-lg tracking-tight">⚽ RealPalpiteFC</span>
        <p className="text-slate-400 text-xs mt-0.5">Painel Admin</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="block px-3 py-2 rounded-md text-slate-300 hover:bg-slate-800 hover:text-white text-sm transition-colors"
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-slate-700">
        <LogoutButton />
      </div>
    </aside>
  )
}
