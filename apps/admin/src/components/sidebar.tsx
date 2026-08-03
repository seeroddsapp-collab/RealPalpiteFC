import Image from 'next/image'
import logo from '@/imagens/logorp.png'
import { LayoutDashboard, Layers, Users, Trophy } from 'lucide-react'
import { NavItem } from './nav-item'
import { LogoutButton } from './logout-button'

const NAV = [
  { href: '/dashboard',             label: 'Dashboard',   Icon: LayoutDashboard },
  { href: '/dashboard/pools',       label: 'Pools',       Icon: Layers },
  { href: '/dashboard/usuarios',    label: 'Usuários',    Icon: Users },
  { href: '/dashboard/campeonatos', label: 'Campeonatos', Icon: Trophy },
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
        {NAV.map(item => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-navy-800">
        <LogoutButton />
      </div>
    </aside>
  )
}
