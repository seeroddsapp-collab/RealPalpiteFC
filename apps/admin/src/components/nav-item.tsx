'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Layers, Users, Trophy, CalendarDays, FileText, ShieldCheck, Wallet, type LucideIcon } from 'lucide-react'

const NAV: { href: string; label: string; Icon: LucideIcon; exact?: boolean }[] = [
  { href: '/dashboard',              label: 'Dashboard',   Icon: LayoutDashboard, exact: true },
  { href: '/dashboard/pools',        label: 'Pools',       Icon: Layers },
  { href: '/dashboard/partidas',     label: 'Partidas',    Icon: CalendarDays },
  { href: '/dashboard/entradas',     label: 'Entradas',    Icon: FileText },
  { href: '/dashboard/usuarios',     label: 'Usuários',    Icon: Users },
  { href: '/dashboard/campeonatos',  label: 'Campeonatos', Icon: Trophy },
  { href: '/dashboard/financeiro',   label: 'Financeiro',  Icon: Wallet },
  { href: '/dashboard/audit',        label: 'Audit Log',   Icon: ShieldCheck },
]

function NavItem({ href, label, Icon, exact }: { href: string; label: string; Icon: LucideIcon; exact?: boolean }) {
  const pathname = usePathname()
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group border-l-2 ${
        active
          ? 'bg-navy-800 text-gold-400 border-gold-500'
          : 'text-slate-400 hover:bg-navy-800 hover:text-gold-400 border-transparent'
      }`}
    >
      <Icon size={16} className={active ? 'text-gold-500' : 'text-slate-500 group-hover:text-gold-500'} />
      {label}
    </Link>
  )
}

export function NavList() {
  return (
    <>
      {NAV.map(item => (
        <NavItem key={item.href} {...item} />
      ))}
    </>
  )
}
