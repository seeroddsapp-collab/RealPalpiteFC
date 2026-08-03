'use client'
import { signOut } from '@/actions/auth'

export function LogoutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="w-full text-left px-3 py-2.5 rounded-lg text-slate-500 hover:bg-navy-800 hover:text-slate-300 text-sm font-medium transition-colors flex items-center gap-3"
      >
        <span className="opacity-60">🚪</span> Sair
      </button>
    </form>
  )
}
