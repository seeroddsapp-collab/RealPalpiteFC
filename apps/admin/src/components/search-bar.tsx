'use client'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { useState, useTransition } from 'react'

interface SearchBarProps {
  placeholder: string
  paramName?: string
  defaultValue?: string
}

export function SearchBar({ placeholder, paramName = 'q', defaultValue = '' }: SearchBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(defaultValue)
  const [, startTransition] = useTransition()

  function navigate(val: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (val) {
      params.set(paramName, val)
    } else {
      params.delete(paramName)
    }
    params.delete('page')
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    navigate(value)
  }

  function handleClear() {
    setValue('')
    navigate('')
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-8 py-2 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 w-64 transition-colors"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <X size={13} />
        </button>
      )}
    </form>
  )
}
