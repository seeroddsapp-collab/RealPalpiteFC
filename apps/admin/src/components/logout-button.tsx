'use client'
import { LogOut } from 'lucide-react'
import { signOut } from '@/actions/auth'

export function LogoutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="w-full text-left px-3 py-2.5 rounded-lg text-slate-500 hover:bg-stone-100 dark:hover:bg-navy-800 hover:text-slate-700 dark:hover:text-slate-300 text-sm font-medium transition-colors flex items-center gap-3 border-l-2 border-transparent"
      >
        <LogOut size={16} className="text-slate-400 dark:text-slate-600" />
        Sair
      </button>
    </form>
  )
}
