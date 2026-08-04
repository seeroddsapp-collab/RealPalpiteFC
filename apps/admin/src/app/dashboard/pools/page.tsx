export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase-admin'
import { fmtBrl, fmtDate, MODALITY_LABEL } from '@/lib/utils'
import { StatusBadge } from '@/components/status-badge'
import { Pagination } from '@/components/pagination'
import { SearchBar } from '@/components/search-bar'

const PAGE_SIZE = 50

async function getPools(page: number, status?: string, q?: string) {
  const db = createAdminClient()
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let matchIds: string[] | null = null
  if (q) {
    const { data } = await db
      .from('matches')
      .select('id')
      .or(`home_team.ilike.%${q}%,away_team.ilike.%${q}%`)
    matchIds = (data ?? []).map(m => m.id)
    if (matchIds.length === 0) return { pools: [], total: 0 }
  }

  let query = db
    .from('pools')
    .select('id, modality, tier_brl, status, created_at, match:matches(id, home_team, away_team, kickoff_at)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status) query = query.eq('status', status)
  if (matchIds) query = query.in('match_id', matchIds)

  const { data, count } = await query
  return { pools: data ?? [], total: count ?? 0 }
}

async function getEntryCounts(poolIds: string[]) {
  if (poolIds.length === 0) return {}
  const db = createAdminClient()
  const { data } = await db.from('entries').select('pool_id').in('pool_id', poolIds)
  const counts: Record<string, number> = {}
  for (const e of data ?? []) {
    counts[e.pool_id] = (counts[e.pool_id] ?? 0) + 1
  }
  return counts
}

export default async function PoolsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; q?: string }>
}) {
  const { status, page: pageStr, q } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? '1'))
  const { pools, total } = await getPools(page, status, q)
  const counts = await getEntryCounts(pools.map(p => p.id))

  const tabs = [
    { label: 'Todas',      value: undefined },
    { label: 'Abertas',    value: 'open' },
    { label: 'Fechadas',   value: 'closed' },
    { label: 'Resolvidas', value: 'resolved' },
    { label: 'Canceladas', value: 'cancelled' },
  ]

  function buildUrl(p: number) {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (q) params.set('q', q)
    params.set('page', String(p))
    return `/dashboard/pools?${params.toString()}`
  }

  function tabUrl(s: string | undefined) {
    const params = new URLSearchParams()
    if (s) params.set('status', s)
    if (q) params.set('q', q)
    return `/dashboard/pools?${params.toString()}`
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">Pools</h1>
          <p className="text-slate-400 dark:text-slate-500 text-sm">{total} pool{total !== 1 ? 's' : ''} encontrada{total !== 1 ? 's' : ''}</p>
        </div>
        <SearchBar placeholder="Buscar por time..." defaultValue={q} />
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(t => (
          <Link
            key={t.label}
            href={tabUrl(t.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              status === t.value
                ? 'bg-gold-500 text-navy-900'
                : 'bg-white dark:bg-navy-900 border border-stone-200 dark:border-navy-700 text-slate-500 dark:text-slate-400 hover:border-gold-400 hover:text-gold-600'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="bg-white dark:bg-navy-900 rounded-xl border border-stone-200 dark:border-navy-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 dark:bg-navy-800 text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-6 py-3 text-left">Partida</th>
                <th className="px-6 py-3 text-left">Modalidade</th>
                <th className="px-6 py-3 text-left">Tier</th>
                <th className="px-6 py-3 text-left">Entradas</th>
                <th className="px-6 py-3 text-left">Arrecadado</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-navy-700">
              {pools.map(p => {
                const match = Array.isArray(p.match) ? p.match[0] : p.match
                const entryCount = counts[p.id] ?? 0
                const arrecadado = entryCount * p.tier_brl
                return (
                  <tr key={p.id} className="hover:bg-stone-50 dark:hover:bg-navy-800 transition-colors">
                    <td className="px-6 py-3">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{match ? `${match.home_team} × ${match.away_team}` : '—'}</div>
                      {match?.kickoff_at && (
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{fmtDate(match.kickoff_at)}</div>
                      )}
                    </td>
                    <td className="px-6 py-3 text-slate-600 dark:text-slate-300">{MODALITY_LABEL[p.modality] ?? p.modality}</td>
                    <td className="px-6 py-3 font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">{fmtBrl(p.tier_brl)}</td>
                    <td className="px-6 py-3 text-slate-600 dark:text-slate-300">{entryCount}</td>
                    <td className="px-6 py-3 text-slate-700 dark:text-slate-200 font-medium">{fmtBrl(arrecadado)}</td>
                    <td className="px-6 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-6 py-3">
                      <Link
                        href={`/dashboard/resultado/${p.id}`}
                        className="text-xs font-semibold text-gold-600 hover:text-gold-500 transition-colors"
                      >
                        Intervir →
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {pools.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                    Nenhuma pool encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} buildUrl={buildUrl} />
      </div>
    </div>
  )
}
