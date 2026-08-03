export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase-admin'
import { fmtBrl, fmtDate, MODALITY_LABEL } from '@/lib/utils'

async function getPools(status?: string) {
  const db = createAdminClient()
  let query = db
    .from('pools')
    .select('id, modality, tier_brl, status, created_at, match:matches(id, home_team, away_team, kickoff_at)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (status) query = query.eq('status', status)

  const { data } = await query
  return data ?? []
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
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const pools = await getPools(status)
  const counts = await getEntryCounts(pools.map(p => p.id))

  const tabs = [
    { label: 'Todas',     value: undefined },
    { label: 'Abertas',   value: 'open' },
    { label: 'Fechadas',  value: 'closed' },
    { label: 'Resolvidas',value: 'resolved' },
    { label: 'Canceladas',value: 'cancelled' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Pools</h1>

      <div className="flex gap-2 mb-6">
        {tabs.map(t => (
          <Link
            key={t.label}
            href={t.value ? `/dashboard/pools?status=${t.value}` : '/dashboard/pools'}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              status === t.value
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-400'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
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
            <tbody className="divide-y divide-slate-100">
              {pools.map(p => {
                const match = Array.isArray(p.match) ? p.match[0] : p.match
                const entryCount = counts[p.id] ?? 0
                const arrecadado = entryCount * p.tier_brl
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-slate-800">
                      <div>{match ? `${match.home_team} × ${match.away_team}` : '—'}</div>
                      {match?.kickoff_at && (
                        <div className="text-xs text-slate-400">{fmtDate(match.kickoff_at)}</div>
                      )}
                    </td>
                    <td className="px-6 py-3 text-slate-700">
                      {MODALITY_LABEL[p.modality] ?? p.modality}
                    </td>
                    <td className="px-6 py-3 text-slate-700 font-medium">{fmtBrl(p.tier_brl)}</td>
                    <td className="px-6 py-3 text-slate-700">{entryCount}</td>
                    <td className="px-6 py-3 text-slate-700">{fmtBrl(arrecadado)}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.status === 'open'      ? 'bg-green-100 text-green-800' :
                        p.status === 'resolved'  ? 'bg-blue-100 text-blue-800'  :
                        p.status === 'cancelled' ? 'bg-red-100 text-red-800'    :
                                                   'bg-yellow-100 text-yellow-800'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <Link
                        href={`/dashboard/resultado/${p.id}`}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Intervir
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {pools.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    Nenhuma pool encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
