export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase-admin'
import { fmtBrl } from '@/lib/utils'
import { StatusBadge } from '@/components/status-badge'

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
    { label: 'Pools Abertas',  value: String(stats.openPools ?? 0),   accent: true },
    { label: 'Total de Pools', value: String(stats.totalPools ?? 0),  accent: false },
    { label: 'Usuários',       value: String(stats.totalUsers ?? 0),  accent: false },
    { label: 'Arrecadação 7d', value: fmtBrl(stats.arrecadacao7d),    accent: false },
    { label: 'Taxas 30d',      value: fmtBrl(stats.taxas30d),         accent: false },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Dashboard</h1>
      <p className="text-slate-400 text-sm mb-7">Visão geral da operação</p>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {cards.map(c => (
          <div key={c.label} className={`rounded-xl p-5 shadow-sm border ${
            c.accent
              ? 'bg-navy-900 border-gold-600/30'
              : 'bg-white border-stone-200'
          }`}>
            <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${c.accent ? 'text-gold-500' : 'text-slate-400'}`}>
              {c.label}
            </p>
            <p className={`text-2xl font-bold ${c.accent ? 'text-white' : 'text-slate-800'}`}>
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center gap-2">
          <div className="w-1 h-5 bg-gold-500 rounded-full" />
          <h2 className="font-semibold text-slate-800">Pools Recentes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-slate-400 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-6 py-3 text-left">Partida</th>
                <th className="px-6 py-3 text-left">Modalidade</th>
                <th className="px-6 py-3 text-left">Tier</th>
                <th className="px-6 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {pools.map(p => {
                const match = Array.isArray(p.match) ? p.match[0] : p.match
                return (
                  <tr key={p.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-3 text-slate-800 font-medium">
                      {match ? `${match.home_team} × ${match.away_team}` : '—'}
                    </td>
                    <td className="px-6 py-3 text-slate-500 capitalize">{p.modality.replace(/_/g, ' ')}</td>
                    <td className="px-6 py-3 text-slate-600 font-mono text-xs">{fmtBrl(p.tier_brl)}</td>
                    <td className="px-6 py-3">
                      <StatusBadge status={p.status} />
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
