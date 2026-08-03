export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase-admin'
import { fmtBrl } from '@/lib/utils'

async function getStats() {
  const db = createAdminClient()

  const [
    { count: totalPools },
    { count: openPools },
    { count: totalUsers },
    { data: recentEntries },
  ] = await Promise.all([
    db.from('pools').select('*', { count: 'exact', head: true }),
    db.from('pools').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    db.from('users').select('*', { count: 'exact', head: true }),
    db.from('entries').select('amount').gte('created_at', new Date(Date.now() - 7 * 86_400_000).toISOString()),
  ])

  const arrecadacao7d = (recentEntries ?? []).reduce((s, e) => s + (e.amount ?? 0), 0)

  const { data: feesData } = await db
    .from('transactions')
    .select('amount')
    .eq('type', 'fee')
    .gte('created_at', new Date(Date.now() - 30 * 86_400_000).toISOString())

  const taxas30d = (feesData ?? []).reduce((s, t) => s + (t.amount ?? 0), 0)

  return { totalPools, openPools, totalUsers, arrecadacao7d, taxas30d }
}

async function getRecentPools() {
  const db = createAdminClient()
  const { data } = await db
    .from('pools')
    .select('id, modality, tier_brl, status, created_at, match:matches(home_team, away_team)')
    .order('created_at', { ascending: false })
    .limit(10)
  return data ?? []
}

export default async function DashboardPage() {
  const [stats, pools] = await Promise.all([getStats(), getRecentPools()])

  const cards = [
    { label: 'Pools Abertas',      value: String(stats.openPools ?? 0),        color: 'text-green-600' },
    { label: 'Total de Pools',     value: String(stats.totalPools ?? 0),        color: 'text-blue-600' },
    { label: 'Usuários',           value: String(stats.totalUsers ?? 0),        color: 'text-purple-600' },
    { label: 'Arrecadação 7d',     value: fmtBrl(stats.arrecadacao7d),          color: 'text-slate-900' },
    { label: 'Taxas 30d',          value: fmtBrl(stats.taxas30d),              color: 'text-amber-600' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{c.label}</p>
            <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Pools Recentes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="px-6 py-3 text-left">Partida</th>
                <th className="px-6 py-3 text-left">Modalidade</th>
                <th className="px-6 py-3 text-left">Tier</th>
                <th className="px-6 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pools.map(p => {
                const match = Array.isArray(p.match) ? p.match[0] : p.match
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-slate-800">
                      {match ? `${match.home_team} × ${match.away_team}` : '—'}
                    </td>
                    <td className="px-6 py-3 text-slate-600 capitalize">{p.modality.replace(/_/g, ' ')}</td>
                    <td className="px-6 py-3 text-slate-600">{fmtBrl(p.tier_brl)}</td>
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
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
