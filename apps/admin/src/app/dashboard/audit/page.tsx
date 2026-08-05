export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase-admin'
import { fmtDate, MODALITY_LABEL } from '@/lib/utils'
import { Pagination } from '@/components/pagination'

type MatchRow = { home_team: string; away_team: string }
type PoolRow = { modality: string; tier_brl: number; match: MatchRow | MatchRow[] | null }

function resolvePool(raw: PoolRow | PoolRow[] | null): PoolRow | null {
  if (!raw) return null
  return Array.isArray(raw) ? raw[0] : raw
}
function resolveMatch(pool: PoolRow | null): MatchRow | null {
  if (!pool?.match) return null
  return Array.isArray(pool.match) ? pool.match[0] : pool.match
}

const PAGE_SIZE = 50

async function getAuditLog(page: number) {
  const db = createAdminClient()
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data, count } = await db
    .from('audit_log')
    .select(
      'id, reason, previous_result, new_result, created_at, pool:pools(modality, tier_brl, match:matches(home_team, away_team))',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to)

  return { logs: data ?? [], total: count ?? 0 }
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? '1'))
  const { logs, total } = await getAuditLog(page)

  function buildUrl(p: number) {
    return `/dashboard/audit?page=${p}`
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">Audit Log</h1>
        <p className="text-slate-400 dark:text-slate-500 text-sm">{total} intervenção{total !== 1 ? 'ões' : ''} de resultado</p>
      </div>

      {logs.length === 0 ? (
        <div className="bg-white dark:bg-navy-900 rounded-xl border border-stone-200 dark:border-navy-700 shadow-sm px-6 py-16 text-center">
          <p className="text-slate-400 dark:text-slate-500">Nenhuma intervenção de resultado registrada ainda.</p>
          <p className="text-slate-300 dark:text-slate-600 text-sm mt-1">Aparecerá aqui quando você usar "Intervir" em uma pool.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-navy-900 rounded-xl border border-stone-200 dark:border-navy-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 dark:bg-navy-800 text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-3 lg:px-6 py-2 lg:py-3 text-left">Data</th>
                  <th className="px-3 lg:px-6 py-2 lg:py-3 text-left">Pool</th>
                  <th className="px-3 lg:px-6 py-2 lg:py-3 text-left hidden sm:table-cell">Resultado anterior</th>
                  <th className="px-3 lg:px-6 py-2 lg:py-3 text-left">Novo resultado</th>
                  <th className="px-3 lg:px-6 py-2 lg:py-3 text-left">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-navy-700">
                {logs.map(log => {
                  const pool = resolvePool(log.pool as PoolRow | PoolRow[] | null)
                  const match = resolveMatch(pool)
                  return (
                    <tr key={log.id} className="hover:bg-stone-50 dark:hover:bg-navy-800 transition-colors">
                      <td className="px-3 lg:px-6 py-2 lg:py-3 text-slate-400 dark:text-slate-500 text-xs whitespace-nowrap">{fmtDate(log.created_at)}</td>
                      <td className="px-3 lg:px-6 py-2 lg:py-3 max-w-[140px] sm:max-w-none">
                        {match && (
                          <div className="font-medium text-slate-800 dark:text-slate-200 text-xs truncate">{match.home_team} × {match.away_team}</div>
                        )}
                        {pool && (
                          <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{MODALITY_LABEL[pool.modality] ?? pool.modality}</div>
                        )}
                      </td>
                      <td className="px-3 lg:px-6 py-2 lg:py-3 font-mono text-xs text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                        {JSON.stringify(log.previous_result)}
                      </td>
                      <td className="px-3 lg:px-6 py-2 lg:py-3 font-mono text-xs text-gold-700 font-semibold">
                        {JSON.stringify(log.new_result)}
                      </td>
                      <td className="px-3 lg:px-6 py-2 lg:py-3 text-slate-600 dark:text-slate-300 text-xs max-w-xs">
                        <span className="line-clamp-2">{log.reason}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={total} pageSize={PAGE_SIZE} buildUrl={buildUrl} />
        </div>
      )}
    </div>
  )
}
