'use client'
import { useState, useTransition } from 'react'
import { createBet } from '@/actions/apostas'

const CATEGORIAS = [
  'Futebol · 1X2',
  'Futebol · Over/Under',
  'Futebol · Ambas Marcam',
  'Futebol · Handicap',
  'Futebol · Placar Exato',
  'Futebol · Cantos',
  'Basquete',
  'Tênis',
  'Vôlei',
  'Hóquei no Gelo',
  'MMA / Lutas',
  'E-sports',
  'Múltipla',
  'Outros',
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

export function NovaApostaForm() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    bet_date: today(),
    amount: '',
    odd: '',
    category: CATEGORIAS[0],
    notes: '',
  })
  const [ok, setOk] = useState(false)

  function set(key: keyof typeof form, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    const odd = parseFloat(form.odd)
    if (!amount || !odd || odd < 1) return
    startTransition(async () => {
      await createBet({ bet_date: form.bet_date, amount, odd, category: form.category, notes: form.notes })
      setForm({ bet_date: today(), amount: '', odd: '', category: CATEGORIAS[0], notes: '' })
      setOk(true)
      setTimeout(() => { setOk(false); setOpen(false) }, 1500)
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-white text-sm font-semibold transition-colors"
      >
        + Nova Aposta
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-navy-800 rounded-2xl border border-stone-200 dark:border-navy-700 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 dark:text-slate-200">Nova Aposta</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xl leading-none">&times;</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Data</label>
          <input
            type="date"
            value={form.bet_date}
            onChange={e => set('bet_date', e.target.value)}
            required
            className="w-full bg-stone-50 dark:bg-navy-900 border border-stone-200 dark:border-navy-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-gold-500/40"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Odd</label>
          <input
            type="number"
            step="0.01"
            min="1.01"
            placeholder="2.30"
            value={form.odd}
            onChange={e => set('odd', e.target.value)}
            required
            className="w-full bg-stone-50 dark:bg-navy-900 border border-stone-200 dark:border-navy-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-gold-500/40"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Apostado (ARS)</label>
        <input
          type="number"
          step="0.01"
          min="1"
          placeholder="2.000"
          value={form.amount}
          onChange={e => set('amount', e.target.value)}
          required
          className="w-full bg-stone-50 dark:bg-navy-900 border border-stone-200 dark:border-navy-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-gold-500/40"
        />
        {form.amount && form.odd && (
          <p className="text-xs text-slate-400 mt-1">
            Retorno potencial: <span className="text-emerald-400 font-semibold">
              ${(parseFloat(form.amount) * parseFloat(form.odd)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>{' '}
            · Lucro: <span className="text-emerald-400 font-semibold">
              ${(parseFloat(form.amount) * (parseFloat(form.odd) - 1)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
          </p>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Categoria</label>
        <select
          value={form.category}
          onChange={e => set('category', e.target.value)}
          className="w-full bg-stone-50 dark:bg-navy-900 border border-stone-200 dark:border-navy-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-gold-500/40"
        >
          {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Notas (opcional)</label>
        <input
          type="text"
          placeholder="Ex: Flamengo vs Palmeiras, jogo 1"
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          className="w-full bg-stone-50 dark:bg-navy-900 border border-stone-200 dark:border-navy-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-gold-500/40"
        />
      </div>

      <div className="flex items-center gap-3 pt-1">
        {ok && <span className="text-sm text-emerald-500 font-medium">✓ Registrada!</span>}
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
        >
          {isPending ? 'Salvando…' : 'Registrar Aposta'}
        </button>
      </div>
    </form>
  )
}
