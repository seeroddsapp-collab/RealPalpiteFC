export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase-admin'
import { fmtBrl, fmtDate, MODALITY_LABEL } from '@/lib/utils'
import { StatusBadge } from '@/components/status-badge'

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
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Pools</h1>
      <p className="text-slate-400 text-sm mb-6">Gerencie e intervenha em listas de palpites</p>

      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(t => (
          <Link
            key={t.label}
            href={t.value ? `/dashboard/pools?status=${t.value}` : '/dashboard/pools'}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              status === t.value
                ? 'bg-gold-500 text-navy-900'
                : 'bg-white border border-stone-200 text-slate-500 hover:border-gold-400 hover:text-gold-600'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-slate-400 text-xs uppercase tracking-wide">
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
            <tbody className="divide-y divide-stone-100">
              {pools.map(p => {
                const match = Array.isArray(p.match) ? p.match[0] : p.match
                const entryCount = counts[p.id] ?? 0
                const arrecadado = entryCount * p.tier_brl
                return (
                  <tr key={p.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="font-medium text-slate-800">{match ? `${match.home_team} × ${match.away_team}` : '—'}</div>
                      {match?.kickoff_at && (
                        <div className="text-xs text-slate-400 mt-0.5">{fmtDate(match.kickoff_at)}</div>
                      )}
                    </td>
                    <td className="px-6 py-3 text-slate-600">{MODALITY_LABEL[p.modality] ?? p.modality}</td>
                    <td className="px-6 py-3 font-mono text-xs font-semibold text-slate-700">{fmtBrl(p.tier_brl)}</td>
                    <td className="px-6 py-3 text-slate-600">{entryCount}</td>
                    <td className="px-6 py-3 text-slate-700 font-medium">{fmtBrl(arrecadado)}</td>
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
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
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
