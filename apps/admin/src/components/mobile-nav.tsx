'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import logo from '@/imagens/logorp.png'
import { NavList } from './nav-item'
import { LogoutButton } from './logout-button'
import { ThemeToggle } from './theme-toggle'
import { useMobileNav } from './mobile-nav-context'
import { X } from 'lucide-react'

export function MobileHeader() {
  const { open, setOpen } = useMobileNav()
  const pathname = usePathname()

  useEffect(() => { setOpen(false) }, [pathname, setOpen])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Header fixo no topo — visível apenas em mobile */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 bg-white dark:bg-navy-900 border-b border-stone-200 dark:border-navy-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Image src={logo} alt="RPFC" width={28} height={28} className="rounded-lg" />
          <span className="text-gold-500 font-bold text-sm tracking-wide">RPFC Admin</span>
        </div>
        <ThemeToggle />
      </header>

      {/* Overlay escuro */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer deslizante */}
      <aside
        className={`lg:hidden fixed top-0 left-0 z-50 h-full w-72 bg-white dark:bg-navy-900 border-r border-stone-200 dark:border-navy-800 flex flex-col transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo + fechar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-navy-800">
          <div className="flex items-center gap-3">
            <Image src={logo} alt="RealPalpiteFC" width={36} height={36} className="rounded-xl" />
            <div>
              <p className="text-gold-500 font-bold text-sm tracking-wide leading-tight">RealPalpiteFC</p>
              <p className="text-slate-400 dark:text-slate-500 text-xs tracking-widest uppercase">Admin</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-stone-100 dark:hover:bg-navy-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <NavList />
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-stone-200 dark:border-navy-800">
          <LogoutButton />
        </div>
      </aside>
    </>
  )
}
