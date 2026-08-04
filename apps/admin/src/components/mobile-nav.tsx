'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import logo from '@/imagens/logorp.png'
import { NavList } from './nav-item'
import { LogoutButton } from './logout-button'
import { Menu, X } from 'lucide-react'

export function MobileHeader() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Fecha o drawer ao navegar
  useEffect(() => { setOpen(false) }, [pathname])

  // Trava o scroll do body quando o drawer está aberto
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Header fixo no topo — visível apenas em mobile */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 bg-navy-900 border-b border-navy-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Image src={logo} alt="RPFC" width={28} height={28} className="rounded-lg" />
          <span className="text-gold-500 font-bold text-sm tracking-wide">RPFC Admin</span>
        </div>
        <button
          onClick={() => setOpen(v => !v)}
          className="p-2 rounded-lg text-slate-400 hover:text-gold-400 hover:bg-navy-800 transition-colors"
          aria-label="Menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
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
        className={`lg:hidden fixed top-0 left-0 z-50 h-full w-72 bg-navy-900 border-r border-navy-800 flex flex-col transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-navy-800">
          <Image src={logo} alt="RealPalpiteFC" width={40} height={40} className="rounded-xl" />
          <div>
            <p className="text-gold-500 font-bold text-sm tracking-wide">RealPalpiteFC</p>
            <p className="text-slate-500 text-xs tracking-widest uppercase">Admin</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <NavList />
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-navy-800">
          <LogoutButton />
        </div>
      </aside>
    </>
  )
}
