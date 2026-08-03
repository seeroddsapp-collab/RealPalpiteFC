export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase-admin'
import { toggleChampionshipActive, updateChampionshipCodes } from '@/actions/admin'

async function getChampionships() {
  const db = createAdminClient()
  const { data } = await db
    .from('championships')
    .select('id, name, espn_code, football_data_code, is_active, logo_url')
    .order('name')
  return data ?? []
}

export default async function CampeonatosPage() {
  const champs = await getChampionships()

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Campeonatos</h1>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="px-6 py-3 text-left">Nome</th>
                <th className="px-6 py-3 text-left">ESPN Code</th>
                <th className="px-6 py-3 text-left">Football-Data Code</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {champs.map(c => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      {c.logo_url && (
                        <img src={c.logo_url} alt="" className="w-6 h-6 object-contain" />
                      )}
                      <span className="font-medium text-slate-900">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <form action={updateChampionshipCodes.bind(null, c.id, { espn_code: null, football_data_code: c.football_data_code })}>
                      <input
                        name="espn_code"
                        defaultValue={c.espn_code ?? ''}
                        className="border border-slate-200 rounded px-2 py-1 text-xs w-32 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="ex: bra.1"
                      />
                      <button
                        type="submit"
                        className="ml-1 text-xs text-blue-600 hover:underline"
                        formAction={async (fd) => {
                          'use server'
                          const { updateChampionshipCodes: fn } = await import('@/actions/admin')
                          await fn(c.id, {
                            espn_code: (fd.get('espn_code') as string) || null,
                            football_data_code: c.football_data_code,
                          })
                        }}
                      >
                        ✓
                      </button>
                    </form>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-slate-500 text-xs font-mono">
                      {c.football_data_code ?? '—'}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      c.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {c.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <form action={toggleChampionshipActive.bind(null, c.id, !c.is_active)}>
                      <button
                        type="submit"
                        className={`text-xs px-3 py-1 rounded-md font-medium transition-colors ${
                          c.is_active
                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            : 'bg-green-50 text-green-700 hover:bg-green-100'
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
