/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase-admin'
import { FinalizarBtn } from '@/components/apostas/finalizar-btn'

function fmtArs(n: number) {
  const abs = Math.abs(n)
  const s = abs.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${n < 0 ? '-' : ''}$ ${s}`
}
function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
function fmtOdd(o: number) {
  return o.toFixed(3).replace(/(\.\d\d)0$/, '$1')
}

const STATUS_CSS: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  won:     'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  lost:    'bg-rose-500/10 text-rose-400 border-rose-500/20',
  void:    'bg-slate-500/10 text-slate-400 border-slate-500/20',
  sold:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente', won: 'Ganhou', lost: 'Perdeu', void: 'Nula', sold: 'Vendida',
}

type Bet = {
  id: string; bet_date: string; amount: number; odd: number
  category: string; status: string; payout: number | null; sell_price: number | null; notes: string | null
}

type SearchParams = { status?: string }

export default async function HistoricoPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const db = createAdminClient()
  const sp = await searchParams
  const filter = sp.status ?? 'all'

  const { data } = await db
    .from('personal_bets')
    .select('*')
    .order('bet_date', { ascending: false })
    .order('created_at', { ascending: false }) as any

  const allBets: Bet[] = data ?? []
  const filtered = filter === 'all' ? allBets : allBets.filter(b => b.status === filter)

  const won  = allBets.filter(b => b.status === 'won')
  const lost = allBets.filter(b => b.status === 'lost')
  const netProfit = allBets.reduce((acc, b) => {
    if (b.status === 'won') return acc + (b.payout ?? 0) - b.amount
    if (b.status === 'lost') return acc - b.amount
    if (b.status === 'sold') return acc + (b.sell_price ?? 0) - b.amount
    return acc
  }, 0)

  function url(s: string) { return `/dashboard/apostas/historico?status=${s}` }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/apostas" className="text-slate-400 hover:text-gold-400 transition-colors text-sm">← Voltar</Link>
        <h1 className="text-2xl font-bold text-gold-400">Histórico</h1>
      </div>

      {/* Resumo rápido */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-white dark:bg-navy-800 rounded-xl p-3 border border-stone-200 dark:border-navy-700">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Apostas</p>
          <p className="text-lg font-bold text-slate-200 mt-1">{allBets.length}</p>
        </div>
        <div className="bg-white dark:bg-navy-800 rounded-xl p-3 border border-stone-200 dark:border-navy-700">
          <p className="text-xs text-slate-500 uppercase tracking-wide">G/P</p>
          <p className="text-lg font-bold mt-1">
            <span className="text-emerald-400">{won.length}</span>
            <span className="text-slate-500"> / </span>
            <span className="text-rose-400">{lost.length}</span>
          </p>
        </div>
        <div className="bg-white dark:bg-navy-800 rounded-xl p-3 border border-stone-200 dark:border-navy-700">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Líquido</p>
          <p className={`text-lg font-bold font-mono mt-1 ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {fmtArs(netProfit)}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['all', 'pending', 'won', 'lost', 'sold', 'void'] as const).map(s => (
          <a key={s} href={url(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition-colors ${
              filter === s
                ? 'bg-gold-500/20 text-gold-400 border-gold-500/40'
                : 'border-stone-200 dark:border-navy-700 text-slate-400 hover:text-gold-400'
            }`}
          >
            {s === 'all' ? 'Todas' : STATUS_LABEL[s]}
            {s !== 'all' && <span className="ml-1 opacity-60">({allBets.filter(b => b.status === s).length})</span>}
          </a>
        ))}
      </div>

      {/* Lista de apostas - cards responsivos */}
      {filtered.length === 0 ? (
        <p className="text-center py-10 text-slate-500 text-sm">Nenhuma aposta encontrada.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(b => {
            const profit = b.status === 'won'
              ? (b.payout ?? 0) - b.amount
              : b.status === 'lost' ? -b.amount
              : b.status === 'sold' ? (b.sell_price ?? 0) - b.amount
              : null

            return (
              <div key={b.id} className={`bg-white dark:bg-navy-800 rounded-2xl border p-4 space-y-3 ${
                b.status === 'won' ? 'border-emerald-500/20' :
                b.status === 'lost' ? 'border-rose-500/20' :
                b.status === 'pending' ? 'border-amber-500/20' :
                'border-stone-200 dark:border-navy-700'
              }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-slate-500">{fmtDate(b.bet_date)}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-navy-700 text-slate-400 border border-navy-600">{b.category}</span>
                    </div>
                    {b.notes && <p className="text-xs text-slate-500 mt-0.5 truncate">{b.notes}</p>}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border font-semibold whitespace-nowrap ${STATUS_CSS[b.status]}`}>
                    {STATUS_LABEL[b.status]}
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-center">
                  <div className="bg-stone-50 dark:bg-navy-900/50 rounded-xl p-2">
                    <p className="text-[10px] text-slate-500 uppercase">Apostado</p>
                    <p className="text-sm font-bold font-mono text-slate-200 mt-0.5">{fmtArs(b.amount)}</p>
                  </div>
                  <div className="bg-stone-50 dark:bg-navy-900/50 rounded-xl p-2">
                    <p className="text-[10px] text-slate-500 uppercase">Odd</p>
                    <p className="text-sm font-bold font-mono text-gold-400 mt-0.5">{fmtOdd(b.odd)}</p>
                  </div>
                  {b.status === 'won' && b.payout != null ? (
                    <div className="bg-stone-50 dark:bg-navy-900/50 rounded-xl p-2">
                      <p className="text-[10px] text-slate-500 uppercase">Retorno</p>
                      <p className="text-sm font-bold font-mono text-emerald-400 mt-0.5">{fmtArs(b.payout)}</p>
                    </div>
                  ) : b.status === 'sold' && b.sell_price != null ? (
                    <div className="bg-stone-50 dark:bg-navy-900/50 rounded-xl p-2">
                      <p className="text-[10px] text-slate-500 uppercase">Venda</p>
                      <p className="text-sm font-bold font-mono text-blue-400 mt-0.5">{fmtArs(b.sell_price)}</p>
                    </div>
                  ) : (
                    <div className="bg-stone-50 dark:bg-navy-900/50 rounded-xl p-2">
                      <p className="text-[10px] text-slate-500 uppercase">Pot.</p>
                      <p className="text-sm font-bold font-mono text-slate-400 mt-0.5">{fmtArs(b.amount * b.odd)}</p>
                    </div>
                  )}
                  {profit !== null && (
                    <div className="bg-stone-50 dark:bg-navy-900/50 rounded-xl p-2">
                      <p className="text-[10px] text-slate-500 uppercase">Lucro real</p>
                      <p className={`text-sm font-bold font-mono mt-0.5 ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {profit >= 0 ? '+' : ''}{fmtArs(profit)}
                      </p>
                    </div>
                  )}
                </div>

                {b.status === 'pending' && (
                  <FinalizarBtn id={b.id} amount={b.amount} odd={b.odd} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
