import Link from 'next/link'
import Image from 'next/image'
import logo from '@/imagens/logorp.png'
import { LogoutButton } from './logout-button'

const NAV = [
  { href: '/dashboard',             label: 'Dashboard',    icon: '📊' },
  { href: '/dashboard/pools',       label: 'Pools',        icon: '🎯' },
  { href: '/dashboard/usuarios',    label: 'Usuários',     icon: '👥' },
  { href: '/dashboard/campeonatos', label: 'Campeonatos',  icon: '🏆' },
]

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-navy-900 flex flex-col border-r border-navy-800">
      {/* Logo */}
      <div className="flex flex-col items-center gap-3 px-6 py-7 border-b border-navy-800">
        <Image src={logo} alt="RealPalpiteFC" width={72} height={72} className="rounded-2xl" />
        <div className="text-center">
          <p className="text-gold-500 font-bold text-base tracking-wide leading-tight">RealPalpiteFC</p>
          <p className="text-slate-500 text-xs mt-0.5 tracking-widest uppercase">Admin</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {NAV.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-navy-800 hover:text-gold-400 text-sm font-medium transition-colors group"
          >
            <span className="text-base opacity-70 group-hover:opacity-100">{icon}</span>
            {label}
          </Link>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-navy-800">
        <LogoutButton />
      </div>
    </aside>
  )
}
