export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase-admin'
import { toggleChampionshipActive } from '@/actions/admin'
import { StatusBadge } from '@/components/status-badge'
import { SyncButton } from '@/components/sync-button'

async function getChampionships() {
  const db = createAdminClient()
  const [{ data: champs }, { data: matchRows }] = await Promise.all([
    db.from('championships').select('*').order('name'),
    db.from('matches').select('championship_id'),
  ])

  const matchCounts: Record<string, number> = {}
  for (const m of matchRows ?? []) {
    matchCounts[m.championship_id] = (matchCounts[m.championship_id] ?? 0) + 1
  }

  return { champs: champs ?? [], matchCounts }
}

export default async function CampeonatosPage() {
  const { champs, matchCounts } = await getChampionships()
  const active = champs.filter(c => c.is_active).length

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Campeonatos</h1>
          <p className="text-slate-400 text-sm">{active} ativos · {champs.length} total</p>
        </div>
        <SyncButton />
      </div>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-slate-400 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-6 py-3 text-left">Campeonato</th>
                <th className="px-6 py-3 text-left">ESPN Code</th>
                <th className="px-6 py-3 text-left">Partidas</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {champs.map(c => (
                <tr key={c.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      {c.logo_url && (
                        <img src={c.logo_url} alt="" className="w-6 h-6 object-contain flex-shrink-0" />
                      )}
                      <span className="font-medium text-slate-800">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <form
                      action={async (fd: FormData) => {
                        'use server'
                        const { updateChampionshipCodes } = await import('@/actions/admin')
                        await updateChampionshipCodes(c.id, {
                          espn_code: (fd.get('espn_code') as string) || null,
                          football_data_code: c.football_data_code,
                        })
                      }}
                      className="flex items-center gap-1"
                    >
                      <input
                        name="espn_code"
                        defaultValue={c.espn_code ?? ''}
                        className="border border-stone-200 rounded-lg px-2 py-1 text-xs w-28 font-mono focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 bg-stone-50"
                        placeholder="ex: bra.1"
                      />
                      <button
                        type="submit"
                        className="text-xs px-2 py-1 rounded-lg bg-gold-500/10 text-gold-700 hover:bg-gold-500/20 font-semibold transition-colors"
                      >
                        ✓
                      </button>
                    </form>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-slate-600 font-medium">{matchCounts[c.id] ?? 0}</span>
                    <span className="text-slate-400 text-xs ml-1">partidas</span>
                  </td>
                  <td className="px-6 py-3">
                    <StatusBadge status={c.is_active ? 'open' : 'cancelled'} />
                  </td>
                  <td className="px-6 py-3">
                    <form action={toggleChampionshipActive.bind(null, c.id, !c.is_active)}>
                      <button
                        type="submit"
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                          c.is_active
                            ? 'bg-stone-100 text-slate-600 hover:bg-stone-200'
                            : 'bg-gold-500/10 text-gold-700 hover:bg-gold-500/20'
                        }`}
                      >
                        {c.is_active ? 'Desativar' : 'Ativar'}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
