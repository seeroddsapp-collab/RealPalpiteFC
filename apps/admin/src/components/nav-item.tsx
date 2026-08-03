'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'

interface NavItemProps {
  href: string
  label: string
  Icon: LucideIcon
}

export function NavItem({ href, label, Icon }: NavItemProps) {
  const pathname = usePathname()
  const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group ${
        active
          ? 'bg-navy-800 text-gold-400 border-l-2 border-gold-500'
          : 'text-slate-400 hover:bg-navy-800 hover:text-gold-400 border-l-2 border-transparent'
      }`}
    >
      <Icon size={16} className={active ? 'text-gold-500' : 'text-slate-500 group-hover:text-gold-500'} />
      {label}
    </Link>
  )
}
