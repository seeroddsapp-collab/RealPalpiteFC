'use client'
import { signOut } from '@/actions/auth'

export function LogoutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="w-full text-left px-3 py-2 rounded-md text-slate-400 hover:bg-slate-800 hover:text-white text-sm transition-colors"
      >
        Sair
      </button>
    </form>
  )
}
