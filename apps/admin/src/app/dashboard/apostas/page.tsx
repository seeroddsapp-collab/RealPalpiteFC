/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase-admin'
import { NovaApostaForm } from '@/components/apostas/nova-aposta-form'
import { FinalizarBtn } from '@/components/apostas/finalizar-btn'

const PAGE_SIZE = 8

type SearchParams = { status?: string; period?: string; page?: string }

type Bet = {
  id: string; bet_date: string; amount: number; odd: number
  category: string; status: string; payout: number | null; sell_price: number | null; notes: string | null
}
type Movement = { id: string; type: string; amount: number; created_at: string; notes: string | null }

function fmtArs(n: number) {
  const abs = Math.abs(n)
  const s = abs.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${n < 0 ? '-' : ''}$ ${s}`
}
function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
}

function KpiCard({ label, value, sub, color = 'text-slate-200', border = '' }: {
  label: string; value: string; sub?: string; color?: string; border?: string
}) {
  return (
    <div className={`bg-white dark:bg-navy-800 rounded-2xl p-4 border ${border || 'border-stone-200 dark:border-navy-700'}`}>
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold font-mono mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
    </div>
  )
}

function ProfitChart({ points }: { points: Array<{ cumulative: number }> }) {
  if (points.length < 2) return (
    <p className="text-xs text-slate-500 text-center py-6">Finalize mais apostas para ver o gráfico.</p>
  )
  const vals = points.map(p => p.cumulative)
  const min = Math.min(0, ...vals)
  const max = Math.max(0, ...vals)
  const range = max - min || 1
  const W = 500; const H = 100; const PAD = 4
  const px = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2)
  const py = (v: number) => H - PAD - ((v - min) / range) * (H - PAD * 2)
  const zY = py(0)
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${px(i).toFixed(1)} ${py(p.cumulative).toFixed(1)}`).join(' ')
  const fill = `M ${px(0).toFixed(1)} ${zY.toFixed(1)} ` + points.map((p, i) => `L ${px(i).toFixed(1)} ${py(p.cumulative).toFixed(1)}`).join(' ') + ` L ${px(points.length - 1).toFixed(1)} ${zY.toFixed(1)} Z`
  const last = vals[vals.length - 1]
  const pos = last >= 0
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24" preserveAspectRatio="none">
      <line x1={PAD} y1={zY} x2={W - PAD} y2={zY} stroke="#475569" strokeWidth="0.8" strokeDasharray="4 3" />
      <path d={fill} fill={pos ? 'rgb(52 211 153 / 0.12)' : 'rgb(251 113 133 / 0.12)'} />
      <path d={line} fill="none" stroke={pos ? '#34d399' : '#fb7185'} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={px(points.length - 1)} cy={py(last)} r="3" fill={pos ? '#34d399' : '#fb7185'} />
    </svg>
  )
}

const STATUS_LABEL: Record<string, string> = { pending: 'Pendente', won: 'Ganhou', lost: 'Perdeu', void: 'Nula', sold: 'Vendida' }
const STATUS_CSS: Record<string, string> = {
  pending: 'border-amber-500/20',
  won:     'border-emerald-500/20',
  lost:    'border-rose-500/20',
  void:    'border-stone-200 dark:border-navy-700',
  sold:    'border-blue-500/20',
}
const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  won:     'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  lost:    'bg-rose-500/10 text-rose-400 border-rose-500/20',
  void:    'bg-slate-500/10 text-slate-400 border-slate-500/20',
  sold:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
}

function todayBrazil() {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function periodCutoff(p: string): string | null {
  const now = new Date()
  if (p === 'hoje') return todayBrazil()
  if (p === 'semana') { const d = new Date(now); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10) }
  if (p === 'mes') return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  if (p === 'ano') { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return d.toISOString().slice(0, 10) }
  return null
}

export default async function ApostasPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const db = createAdminClient()
  const sp = await searchParams
  const statusFilter = sp.status ?? 'all'
  const periodFilter = sp.period ?? 'tudo'
  const page = Math.max(1, Number(sp.page ?? 1))

  const [{ data: bets }, { data: bankroll }] = await Promise.all([
    (db as any).from('personal_bets').select('*').order('bet_date', { ascending: false }).order('created_at', { ascending: false }),
    (db as any).from('personal_bankroll').select('*').order('created_at', { ascending: false }),
  ])

  const allBets: Bet[] = bets ?? []
  const allMovements: Movement[] = bankroll ?? []

  // Aplica filtro de período — afeta KPIs e lista
  const cutoff = periodCutoff(periodFilter)
  const periodBets = periodFilter === 'hoje'
    ? allBets.filter(b => b.bet_date === todayBrazil())
    : cutoff ? allBets.filter(b => b.bet_date >= cutoff!) : allBets

  // KPIs — baseados no período selecionado
  const settled = periodBets.filter(b => b.status !== 'pending')
  const won  = settled.filter(b => b.status === 'won')
  const lost = settled.filter(b => b.status === 'lost')

  const sold = settled.filter(b => b.status === 'sold')
  const netProfit = settled.reduce((acc, b) => {
    if (b.status === 'won') return acc + (b.payout ?? 0) - b.amount
    if (b.status === 'lost') return acc - b.amount
    if (b.status === 'sold') return acc + (b.sell_price ?? 0) - b.amount
    return acc
  }, 0)
  const totalWagered = [...won, ...lost, ...sold].reduce((s, b) => s + b.amount, 0)
  const roi = totalWagered > 0 ? (netProfit / totalWagered) * 100 : 0
  const winRate = won.length + lost.length > 0 ? (won.length / (won.length + lost.length)) * 100 : 0

  // Saldo da banca sempre all-time (depósitos e retiradas não têm filtro de período)
  const totalDep = allMovements.filter(m => m.type === 'deposit').reduce((s, m) => s + m.amount, 0)
  const totalWit = allMovements.filter(m => m.type === 'withdrawal').reduce((s, m) => s + m.amount, 0)
  const allTimeProfit = allBets.filter(b => b.status !== 'pending').reduce((acc, b) => {
    if (b.status === 'won') return acc + (b.payout ?? 0) - b.amount
    if (b.status === 'lost') return acc - b.amount
    if (b.status === 'sold') return acc + (b.sell_price ?? 0) - b.amount
    return acc
  }, 0)
  const bancaROI = totalDep > 0 ? (allTimeProfit / totalDep) * 100 : 0

  const pendingBets = allBets.filter(b => b.status === 'pending')
  const pendingLocked = pendingBets.reduce((s, b) => s + b.amount, 0)
  const pendingPotential = pendingBets.reduce((s, b) => s + b.amount * b.odd, 0)

  const soldTotal = sold.reduce((s, b) => s + (b.sell_price ?? 0), 0)
  const soldProfit = sold.reduce((acc, b) => acc + (b.sell_price ?? 0) - b.amount, 0)
  const saldoBanca = totalDep - totalWit + allTimeProfit - pendingLocked

  // Gráfico — sempre all-time (mostra evolução completa)
  let cumulative = 0
  const chartPoints = [...allBets].reverse()
    .filter(b => b.status === 'won' || b.status === 'lost')
    .map(b => {
      cumulative += b.status === 'won' ? (b.payout ?? 0) - b.amount : -b.amount
      return { cumulative }
    })

  // Lista: período já aplicado, aplica filtro de status por cima

  let filtered = periodBets
  if (statusFilter !== 'all') filtered = filtered.filter(b => b.status === statusFilter)

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Breakdown por categoria (all-time)
  const catMap = new Map<string, { total: number; won: number; profit: number }>()
  for (const b of settled.filter(b => b.status !== 'void')) {
    const s = catMap.get(b.category) ?? { total: 0, won: 0, profit: 0 }
    s.total++
    if (b.status === 'won') { s.won++; s.profit += (b.payout ?? 0) - b.amount }
    else if (b.status === 'sold') { s.profit += (b.sell_price ?? 0) - b.amount }
    else s.profit -= b.amount
    catMap.set(b.category, s)
  }
  const catList = [...catMap.entries()]
    .map(([cat, s]) => ({ cat, ...s }))
    .sort((a, b) => b.profit - a.profit)

  function url(params: Partial<{ status: string; period: string; page: number }>) {
    const s = params.status ?? statusFilter
    const p = params.period ?? periodFilter
    const pg = params.page ?? 1
    return `/dashboard/apostas?status=${s}&period=${p}&page=${pg}`
  }

  const pendingCount = allBets.filter(b => b.status === 'pending').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gold-400">Minhas Apostas</h1>
          <p className="text-xs text-slate-500 mt-0.5">Controle pessoal · 1xbet · Pesos Argentinos</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/dashboard/apostas/historico" className="px-4 py-2 rounded-xl text-sm font-medium border border-stone-200 dark:border-navy-700 text-slate-500 dark:text-slate-400 hover:text-gold-500 transition-colors">
            Histórico
          </Link>
          <Link href="/dashboard/apostas/banca" className="px-4 py-2 rounded-xl text-sm font-medium border border-stone-200 dark:border-navy-700 text-slate-500 dark:text-slate-400 hover:text-gold-500 transition-colors">
            Banca
          </Link>
          <NovaApostaForm />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KpiCard
          label="Ganho Líquido Real"
          value={fmtArs(netProfit)}
          sub={`${settled.filter(b => b.status !== 'void').length} apostas finalizadas`}
          color={netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}
          border={netProfit >= 0 ? 'border-emerald-500/30' : 'border-rose-500/30'}
        />
        <KpiCard
          label="ROI"
          value={`${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%`}
          sub={`sobre ${fmtArs(totalWagered)} apostados`}
          color={roi >= 0 ? 'text-emerald-400' : 'text-rose-400'}
        />
        <KpiCard
          label="Taxa de Acertos"
          value={`${winRate.toFixed(0)}%`}
          sub={`${won.length}G · ${lost.length}P · ${sold.length > 0 ? `${sold.length}V · ` : ''}${settled.filter(b => b.status === 'void').length}N`}
          color={winRate >= 50 ? 'text-gold-400' : 'text-slate-300'}
        />
        <KpiCard
          label="Saldo na Banca"
          value={fmtArs(saldoBanca)}
          sub={totalDep > 0 ? `${bancaROI >= 0 ? '+' : ''}${bancaROI.toFixed(1)}% sobre dep. ${fmtArs(totalDep)}` : `dep ${fmtArs(totalDep)} · ret ${fmtArs(totalWit)}`}
          color={saldoBanca >= 0 ? 'text-slate-200' : 'text-rose-400'}
        />
        <KpiCard
          label="Em Jogo"
          value={pendingBets.length > 0 ? fmtArs(pendingLocked) : '—'}
          sub={pendingBets.length > 0 ? `${pendingBets.length} aposta${pendingBets.length !== 1 ? 's' : ''} · pot. ${fmtArs(pendingPotential)}` : 'Nenhuma aposta pendente'}
          color={pendingBets.length > 0 ? 'text-amber-400' : 'text-slate-500'}
          border={pendingBets.length > 0 ? 'border-amber-500/20' : ''}
        />
        <KpiCard
          label="Apostas Vendidas"
          value={sold.length > 0 ? fmtArs(soldTotal) : '—'}
          sub={sold.length > 0 ? `${sold.length} venda${sold.length !== 1 ? 's' : ''} · ${soldProfit >= 0 ? '+' : ''}${fmtArs(soldProfit)} líquido` : 'Nenhuma venda no período'}
          color="text-blue-400"
          border={sold.length > 0 ? 'border-blue-500/20' : ''}
        />
      </div>

      {/* Gráfico */}
      {chartPoints.length >= 2 && (
        <div className="bg-white dark:bg-navy-800 rounded-2xl border border-stone-200 dark:border-navy-700 p-5">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Lucro Acumulado</p>
          <ProfitChart points={chartPoints} />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>1ª aposta</span>
            <span className={netProfit >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>{fmtArs(netProfit)}</span>
          </div>
        </div>
      )}

      {/* Lista com filtros */}
      <div className="space-y-3">
        {/* Título + contagem */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Apostas
            {filtered.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-navy-700 text-slate-400 text-[10px] normal-case font-normal">
                {filtered.length}
              </span>
            )}
            {pendingCount > 0 && statusFilter !== 'pending' && (
              <a href={url({ status: 'pending', page: 1 })}
                className="ml-2 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] normal-case font-semibold border border-amber-500/20 hover:bg-amber-500/25 transition-colors"
              >
                {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
              </a>
            )}
          </p>
        </div>

        {/* Filtro de status */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {(['all', 'pending', 'won', 'lost', 'sold', 'void'] as const).map(s => {
            const count = s === 'all' ? periodBets.length : periodBets.filter(b => b.status === s).length
            const active = statusFilter === s
            return (
              <a key={s} href={url({ status: s, page: 1 })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-colors shrink-0 ${
                  active
                    ? s === 'won'     ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : s === 'lost'    ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                    : s === 'pending' ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                    : s === 'void'    ? 'bg-slate-500/20 border-slate-500/40 text-slate-400'
                    :                  'bg-gold-500/20 border-gold-500/40 text-gold-400'
                    : 'border-stone-200 dark:border-navy-700 text-slate-400 hover:text-slate-200 dark:hover:text-slate-300'
                }`}
              >
                {s === 'all' ? 'Todas' : STATUS_LABEL[s]}
                <span className="opacity-60 text-[10px]">{count}</span>
              </a>
            )
          })}
        </div>

        {/* Filtro de período */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {(['tudo', 'ano', 'mes', 'semana', 'hoje'] as const).map(p => {
            const labels: Record<string, string> = { tudo: 'Tudo', ano: '12 meses', mes: 'Mês atual', semana: '7 dias', hoje: 'Hoje' }
            return (
              <a key={p} href={url({ period: p, page: 1 })}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-colors shrink-0 ${
                  periodFilter === p
                    ? 'bg-navy-700 border-navy-600 text-slate-200'
                    : 'border-stone-200 dark:border-navy-700 text-slate-500 hover:text-slate-300'
                }`}
              >
                {labels[p]}
              </a>
            )
          })}
        </div>

        {/* Cards */}
        {paginated.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm bg-white dark:bg-navy-800 rounded-2xl border border-stone-200 dark:border-navy-700">
            {allBets.length === 0
              ? 'Nenhuma aposta registrada ainda. Use + Nova Aposta para começar.'
              : 'Nenhuma aposta neste filtro.'}
          </div>
        ) : (
          <div className="space-y-3">
            {paginated.map(b => {
              const profit = b.status === 'won'
                ? (b.payout ?? 0) - b.amount
                : b.status === 'lost' ? -b.amount
                : b.status === 'sold' ? (b.sell_price ?? 0) - b.amount
                : null

              return (
                <div key={b.id} className={`bg-white dark:bg-navy-800 rounded-2xl border p-4 space-y-3 ${STATUS_CSS[b.status] ?? 'border-stone-200 dark:border-navy-700'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{fmtDate(b.bet_date)}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-navy-700 text-slate-300 border border-navy-600">{b.category}</span>
                      </div>
                      {b.notes && <p className="text-xs text-slate-500 mt-0.5 truncate">{b.notes}</p>}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full border font-semibold whitespace-nowrap shrink-0 ${STATUS_BADGE[b.status] ?? ''}`}>
                      {STATUS_LABEL[b.status] ?? b.status}
                    </span>
                  </div>

                  <div className={`grid gap-2 text-center ${profit !== null ? 'grid-cols-4' : 'grid-cols-3'}`}>
                    <div className="bg-stone-50 dark:bg-navy-900/50 rounded-xl p-2">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">Apostado</p>
                      <p className="text-sm font-bold font-mono text-slate-700 dark:text-slate-200 mt-0.5">{fmtArs(b.amount)}</p>
                    </div>
                    <div className="bg-stone-50 dark:bg-navy-900/50 rounded-xl p-2">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">Odd</p>
                      <p className="text-sm font-bold font-mono text-gold-400 mt-0.5">{b.odd.toFixed(2)}</p>
                    </div>
                    <div className="bg-stone-50 dark:bg-navy-900/50 rounded-xl p-2">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                        {b.status === 'won' ? 'Retorno' : b.status === 'sold' ? 'Venda' : 'Pot.'}
                      </p>
                      <p className={`text-sm font-bold font-mono mt-0.5 ${b.status === 'won' ? 'text-emerald-400' : b.status === 'sold' ? 'text-blue-400' : 'text-slate-400'}`}>
                        {b.status === 'won' && b.payout
                          ? fmtArs(b.payout)
                          : b.status === 'sold' && b.sell_price != null
                          ? fmtArs(b.sell_price)
                          : fmtArs(b.amount * b.odd)}
                      </p>
                    </div>
                    {profit !== null && (
                      <div className="bg-stone-50 dark:bg-navy-900/50 rounded-xl p-2">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">Lucro real</p>
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

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            {page > 1 && (
              <a href={url({ page: page - 1 })}
                className="px-4 py-2 rounded-xl text-sm border border-stone-200 dark:border-navy-700 text-slate-400 hover:text-slate-200 transition-colors"
              >
                ← Anterior
              </a>
            )}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pg: number
                if (totalPages <= 7) {
                  pg = i + 1
                } else if (page <= 4) {
                  pg = i + 1
                } else if (page >= totalPages - 3) {
                  pg = totalPages - 6 + i
                } else {
                  pg = page - 3 + i
                }
                return (
                  <a key={pg} href={url({ page: pg })}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-medium transition-colors ${
                      pg === page
                        ? 'bg-gold-500 text-white'
                        : 'text-slate-400 hover:text-slate-200 border border-stone-200 dark:border-navy-700'
                    }`}
                  >
                    {pg}
                  </a>
                )
              })}
            </div>
            {page < totalPages && (
              <a href={url({ page: page + 1 })}
                className="px-4 py-2 rounded-xl text-sm border border-stone-200 dark:border-navy-700 text-slate-400 hover:text-slate-200 transition-colors"
              >
                Próxima →
              </a>
            )}
          </div>
        )}
      </div>

      {/* Breakdown por categoria */}
      {catList.length > 0 && (
        <div className="bg-white dark:bg-navy-800 rounded-2xl border border-stone-200 dark:border-navy-700 p-5">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">Por Categoria</p>
          <div className="space-y-2">
            {catList.map(c => (
              <div key={c.cat} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{c.cat}</p>
                  <p className="text-xs text-slate-400">{c.total} aposta{c.total !== 1 ? 's' : ''} · {c.total > 0 ? Math.round(c.won / c.total * 100) : 0}% acertos</p>
                </div>
                <p className={`text-sm font-bold font-mono shrink-0 ${c.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {c.profit >= 0 ? '+' : ''}{fmtArs(c.profit)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
