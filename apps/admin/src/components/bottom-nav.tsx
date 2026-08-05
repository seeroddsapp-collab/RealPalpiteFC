'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CalendarDays, Wallet, Users, MoreHorizontal } from 'lucide-react'
import { useMobileNav } from './mobile-nav-context'
import type { LucideIcon } from 'lucide-react'

function NavBtn({
  href, label, Icon, exact,
}: {
  href: string
  label: string
  Icon: LucideIcon
  exact?: boolean
}) {
  const pathname = usePathname()
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')

  return (
    <Link href={href} className="flex-1 flex flex-col items-center justify-end gap-0.5 pb-2 pt-1">
      <Icon size={20} className={active ? 'text-gold-500 dark:text-gold-400' : 'text-slate-400 dark:text-slate-500'} />
      <span className={`text-[10px] font-medium leading-tight ${active ? 'text-gold-500 dark:text-gold-400' : 'text-slate-400 dark:text-slate-500'}`}>
        {label}
      </span>
    </Link>
  )
}

export function BottomNav() {
  const { setOpen } = useMobileNav()
  const pathname = usePathname()
  const financeiroActive = pathname === '/dashboard/financeiro' || pathname.startsWith('/dashboard/financeiro/')

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white dark:bg-navy-900 border-t border-stone-200 dark:border-navy-800 h-16">
      {/* div interno com relative — não pode usar relative no elemento fixed */}
      <div className="relative h-full flex items-center px-1">

        {/* FAB central — absolute relativo ao div interno (h-16=64px) */}
        <Link
          href="/dashboard/financeiro"
          className={`absolute left-1/2 -translate-x-1/2 bottom-full translate-y-8 w-16 h-16 z-10 rounded-full flex items-center justify-center shadow-xl shadow-gold-500/40 border-4 border-white dark:border-navy-950 transition-transform active:scale-95 ${
            financeiroActive ? 'bg-gold-600' : 'bg-gold-500 hover:bg-gold-600'
          }`}
        >
          <Wallet size={24} className="text-white" />
        </Link>

        <NavBtn href="/dashboard" label="Início" Icon={LayoutDashboard} exact />
        <NavBtn href="/dashboard/partidas" label="Partidas" Icon={CalendarDays} />

        {/* Espaço + label do FAB */}
        <div className="flex-1 flex flex-col items-center justify-end pb-2">
          <span className={`text-[10px] font-medium leading-tight ${financeiroActive ? 'text-gold-500 dark:text-gold-400' : 'text-slate-400 dark:text-slate-500'}`}>
            Finanças
          </span>
        </div>

        <NavBtn href="/dashboard/usuarios" label="Usuários" Icon={Users} />

        <button
          onClick={() => setOpen(true)}
          className="flex-1 flex flex-col items-center justify-end gap-0.5 pb-2 pt-1 text-slate-400 dark:text-slate-500"
        >
          <MoreHorizontal size={20} />
          <span className="text-[10px] font-medium leading-tight">Mais</span>
        </button>

      </div>
    </nav>
  )
}
