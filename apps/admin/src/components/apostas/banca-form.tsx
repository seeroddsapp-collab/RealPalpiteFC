'use client'
import { useState, useTransition } from 'react'
import { createBankrollMovement } from '@/actions/apostas'

export function BancaForm() {
  const [type, setType] = useState<'deposit' | 'withdrawal'>('deposit')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()
  const [ok, setOk] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const n = parseFloat(amount)
    if (!n || n <= 0) return
    startTransition(async () => {
      await createBankrollMovement(type, n, notes)
      setAmount('')
      setNotes('')
      setOk(true)
      setTimeout(() => setOk(false), 2000)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-navy-800 rounded-2xl border border-stone-200 dark:border-navy-700 p-5 space-y-4">
      <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Novo Movimento</h3>

      <div className="flex gap-2">
        {(['deposit', 'withdrawal'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${
              type === t
                ? t === 'deposit'
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/40 text-rose-400'
                : 'border-stone-200 dark:border-navy-600 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            {t === 'deposit' ? '↓ Depósito' : '↑ Retirada'}
          </button>
        ))}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Valor (ARS)</label>
        <input
          type="number"
          step="0.01"
          min="1"
          placeholder="5.000"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          required
          className="w-full bg-stone-50 dark:bg-navy-900 border border-stone-200 dark:border-navy-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-gold-500/40"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Notas (opcional)</label>
        <input
          type="text"
          placeholder="Ex: recarga via transferência"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="w-full bg-stone-50 dark:bg-navy-900 border border-stone-200 dark:border-navy-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-gold-500/40"
        />
      </div>

      <div className="flex items-center gap-3">
        {ok && <span className="text-sm text-emerald-500 font-medium">✓ Registrado!</span>}
        <button
          type="submit"
          disabled={isPending}
          className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-colors ${
            type === 'deposit' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
          }`}
        >
          {isPending ? 'Salvando…' : type === 'deposit' ? 'Registrar Depósito' : 'Registrar Retirada'}
        </button>
      </div>
    </form>
  )
}
