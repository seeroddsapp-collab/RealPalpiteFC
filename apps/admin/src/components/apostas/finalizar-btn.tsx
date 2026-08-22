'use client'
import { useState, useTransition } from 'react'
import { finalizeBet, deleteBet, sellBet } from '@/actions/apostas'

type Props = {
  id: string
  amount: number
  odd: number
}

export function FinalizarBtn({ id, amount, odd }: Props) {
  const [mode, setMode] = useState<'idle' | 'won' | 'sell' | 'confirm-lost' | 'confirm-void'>('idle')
  const [payout, setPayout] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [isPending, startTransition] = useTransition()

  const expectedPayout = (amount * odd).toFixed(2)

  function handleWon() {
    const p = parseFloat(payout)
    if (!p || p <= 0) return
    startTransition(async () => {
      await finalizeBet(id, 'won', p)
      setMode('idle')
    })
  }

  function handleLost() {
    startTransition(async () => {
      await finalizeBet(id, 'lost', null)
      setMode('idle')
    })
  }

  function handleVoid() {
    startTransition(async () => {
      await finalizeBet(id, 'void', null)
      setMode('idle')
    })
  }

  function handleSell() {
    const p = parseFloat(sellPrice)
    if (isNaN(p) || p < 0) return
    startTransition(async () => {
      await sellBet(id, p)
      setMode('idle')
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteBet(id)
    })
  }

  if (mode === 'sell') {
    const diff = sellPrice ? parseFloat(sellPrice) - amount : null
    return (
      <div className="flex flex-col gap-2 w-full">
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder={`Valor recebido na venda (apostado: $${amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })})`}
            value={sellPrice}
            onChange={e => setSellPrice(e.target.value)}
            autoFocus
            className="flex-1 min-w-0 bg-stone-50 dark:bg-navy-900 border border-blue-500/50 rounded-lg px-3 py-1.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
          <button
            onClick={handleSell}
            disabled={isPending || !sellPrice}
            className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white text-xs font-bold transition-colors whitespace-nowrap"
          >
            ✓ Confirmar
          </button>
          <button
            onClick={() => { setMode('idle'); setSellPrice('') }}
            className="px-2 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 text-xs"
          >
            ✕
          </button>
        </div>
        {diff !== null && !isNaN(diff) && (
          <p className="text-xs text-slate-500">
            {diff >= 0
              ? <>Lucro na venda: <span className="text-emerald-400 font-semibold">+${diff.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></>
              : <>Perda na venda: <span className="text-rose-400 font-semibold">-${Math.abs(diff).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></>
            }
          </p>
        )}
      </div>
    )
  }

  if (mode === 'won') {
    return (
      <div className="flex flex-col gap-2 w-full">
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder={`Retorno (ex: ${expectedPayout})`}
            value={payout}
            onChange={e => setPayout(e.target.value)}
            autoFocus
            className="flex-1 min-w-0 bg-stone-50 dark:bg-navy-900 border border-emerald-500/50 rounded-lg px-3 py-1.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
          <button
            onClick={handleWon}
            disabled={isPending || !payout}
            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs font-bold transition-colors whitespace-nowrap"
          >
            ✓ Confirmar
          </button>
          <button
            onClick={() => { setMode('idle'); setPayout('') }}
            className="px-2 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 text-xs"
          >
            ✕
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Insira o valor <strong>total retornado</strong> pela 1xbet (aposta + lucro).
          {payout && ` Lucro real: `}
          {payout && <span className="text-emerald-400 font-semibold">${(parseFloat(payout) - amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>}
        </p>
      </div>
    )
  }

  if (mode === 'confirm-lost') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">Confirmar perda de <span className="text-rose-400 font-semibold">${amount.toLocaleString('es-AR')}</span>?</span>
        <button onClick={handleLost} disabled={isPending} className="px-3 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white text-xs font-bold transition-colors">Perdeu</button>
        <button onClick={() => setMode('idle')} className="px-2 py-1 rounded-lg text-slate-400 hover:text-slate-200 text-xs">✕</button>
      </div>
    )
  }

  if (mode === 'confirm-void') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">Marcar como nula (reembolso)?</span>
        <button onClick={handleVoid} disabled={isPending} className="px-3 py-1 rounded-lg bg-slate-500 hover:bg-slate-600 disabled:opacity-40 text-white text-xs font-bold transition-colors">Nula</button>
        <button onClick={() => setMode('idle')} className="px-2 py-1 rounded-lg text-slate-400 hover:text-slate-200 text-xs">✕</button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <button
        onClick={() => setMode('won')}
        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/20 transition-colors"
      >
        ✓ Ganhou
      </button>
      <button
        onClick={() => setMode('confirm-lost')}
        className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/20 transition-colors"
      >
        ✕ Perdeu
      </button>
      <button
        onClick={() => setMode('sell')}
        className="px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-semibold border border-blue-500/20 transition-colors"
      >
        💰 Vender
      </button>
      <button
        onClick={() => setMode('confirm-void')}
        className="px-2 py-1.5 rounded-lg text-slate-500 hover:text-slate-300 text-xs border border-slate-700 transition-colors"
      >
        ○ Nula
      </button>
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="px-2 py-1.5 rounded-lg text-slate-600 hover:text-rose-400 text-xs transition-colors"
        title="Excluir"
      >
        🗑
      </button>
    </div>
  )
}
