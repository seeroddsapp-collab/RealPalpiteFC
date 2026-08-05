export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase-admin'
import { fmtDate } from '@/lib/utils'
import { StatusBadge } from '@/components/status-badge'
import { Pagination } from '@/components/pagination'
import { SearchBar } from '@/components/search-bar'
import Link from 'next/link'

const PAGE_SIZE = 50

const MATCH_STATUS_MAP: Record<string, string> = {
  scheduled:   'open',
  in_progress: 'closed',
  finished:    'resolved',
  cancelled:   'cancelled',
  postponed:   'cancelled',
}

async function getMatches(page: number, q?: string, status?: string) {
  const db = createAdminClient()
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = db
    .from('matches')
    .select('*, championship:championships(name)', { count: 'exact' })
    .order('kickoff_at', { ascending: false })
    .range(from, to)

  if (q) query = query.or(`home_team.ilike.%${q}%,away_team.ilike.%${q}%`)
  if (status) query = query.eq('status', status)

  const { data, count } = await query
  return { matches: data ?? [], total: count ?? 0 }
}

export default async function PartidasPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>
}) {
  const { page: pageStr, q, status } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? '1'))
  const { matches, total } = await getMatches(page, q, status)

  const tabs = [
    { label: 'Todas',         value: undefined },
    { label: 'Agendadas',     value: 'scheduled' },
    { label: 'Em andamento',  value: 'in_progress' },
    { label: 'Encerradas',    value: 'finished' },
    { label: 'Canceladas',    value: 'cancelled' },
  ]

  function buildUrl(p: number) {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (q) params.set('q', q)
    params.set('page', String(p))
    return `/dashboard/partidas?${params.toString()}`
  }

  function tabUrl(s: string | undefined) {
    const params = new URLSearchParams()
    if (s) params.set('status', s)
    if (q) params.set('q', q)
    return `/dashboard/partidas?${params.toString()}`
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">Partidas</h1>
          <p className="text-slate-400 dark:text-slate-500 text-sm">{total} partida{total !== 1 ? 's' : ''} sincronizada{total !== 1 ? 's' : ''}</p>
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
                <th className="px-3 lg:px-6 py-2 lg:py-3 text-left">Partida</th>
                <th className="px-3 lg:px-6 py-2 lg:py-3 text-left hidden sm:table-cell">Campeonato</th>
                <th className="px-3 lg:px-6 py-2 lg:py-3 text-left hidden md:table-cell">Kickoff</th>
                <th className="px-3 lg:px-6 py-2 lg:py-3 text-left">Resultado</th>
                <th className="px-3 lg:px-6 py-2 lg:py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-navy-700">
              {matches.map(m => {
                const champ = Array.isArray(m.championship) ? m.championship[0] : m.championship
                const result = m.result as { home?: number; away?: number } | null
                return (
                  <tr key={m.id} className="hover:bg-stone-50 dark:hover:bg-navy-800 transition-colors">
                    <td className="px-3 lg:px-6 py-2 lg:py-3 max-w-[180px] lg:max-w-none">
                      <div className="truncate">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{m.home_team}</span>
                        <span className="text-slate-400 dark:text-slate-500 mx-2">×</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{m.away_team}</span>
                      </div>
                    </td>
                    <td className="px-3 lg:px-6 py-2 lg:py-3 text-slate-500 dark:text-slate-400 text-xs hidden sm:table-cell">{champ?.name ?? '—'}</td>
                    <td className="px-3 lg:px-6 py-2 lg:py-3 text-slate-500 dark:text-slate-400 text-xs hidden md:table-cell">{fmtDate(m.kickoff_at)}</td>
                    <td className="px-3 lg:px-6 py-2 lg:py-3">
                      {result?.home !== undefined && result?.away !== undefined ? (
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                          {result.home} – {result.away}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 lg:px-6 py-2 lg:py-3">
                      <StatusBadge status={MATCH_STATUS_MAP[m.status] ?? 'open'} />
                    </td>
                  </tr>
                )
              })}
              {matches.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-12 text-center text-slate-400 dark:text-slate-500">
                    Nenhuma partida encontrada.
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
