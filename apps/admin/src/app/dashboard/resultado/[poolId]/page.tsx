export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase-admin'
import { fmtDate, fmtBrl, MODALITY_LABEL } from '@/lib/utils'
import { overrideResult } from '@/actions/admin'

async function getPoolDetail(poolId: string) {
  const db = createAdminClient()

  const { data: pool } = await db
    .from('pools')
    .select('*, match:matches(id, home_team, away_team, kickoff_at, result, status)')
    .eq('id', poolId)
    .single()

  if (!pool) return null

  const { data: entries } = await db
    .from('entries')
    .select('id, user_id, prediction, amount, is_winner, created_at')
    .eq('pool_id', poolId)
    .order('created_at')

  const { data: audit } = await db
    .from('audit_log')
    .select('id, previous_result, new_result, reason, created_at, admin_id')
    .eq('pool_id', poolId)
    .order('created_at', { ascending: false })

  return { pool, entries: entries ?? [], audit: audit ?? [] }
}

export default async function ResultadoPage({ params }: { params: Promise<{ poolId: string }> }) {
  const { poolId } = await params
  const detail = await getPoolDetail(poolId)
  if (!detail) notFound()

  const { pool, entries, audit } = detail
  const match = Array.isArray(pool.match) ? pool.match[0] : pool.match

  const currentResult = match?.result as { homeScore?: number; awayScore?: number } | null

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Intervenção em Resultado</h1>
      <p className="text-slate-500 text-sm mb-8">
        Registra a alteração no audit_log e atualiza o resultado da partida.
      </p>

      {/* Pool info */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6 shadow-sm">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wide mb-0.5">Partida</p>
            <p className="font-semibold text-slate-900">
              {match ? `${match.home_team} × ${match.away_team}` : '—'}
            </p>
            {match?.kickoff_at && (
              <p className="text-slate-400 text-xs">{fmtDate(match.kickoff_at)}</p>
            )}
          </div>
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wide mb-0.5">Pool</p>
            <p className="font-medium text-slate-800">{MODALITY_LABEL[pool.modality] ?? pool.modality}</p>
            <p className="text-slate-500 text-xs">{fmtBrl(pool.tier_brl)} · {entries.length} entradas</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wide mb-0.5">Resultado atual</p>
            {currentResult
              ? <p className="font-mono font-semibold text-slate-900">{currentResult.homeScore} × {currentResult.awayScore}</p>
              : <p className="text-slate-400 italic">Sem resultado</p>
            }
          </div>
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wide mb-0.5">Status da pool</p>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              pool.status === 'open'     ? 'bg-green-100 text-green-800' :
              pool.status === 'resolved' ? 'bg-blue-100 text-blue-800'  :
                                           'bg-slate-100 text-slate-600'
            }`}>
              {pool.status}
            </span>
          </div>
        </div>
      </div>

      {/* Override form */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6 shadow-sm">
        <h2 className="font-semibold text-slate-900 mb-4">Registrar Novo Resultado</h2>
        <form
          action={async (fd: FormData) => {
            'use server'
            const homeScore = parseInt(fd.get('homeScore') as string, 10)
            const awayScore = parseInt(fd.get('awayScore') as string, 10)
            const reason    = fd.get('reason') as string
            if (isNaN(homeScore) || isNaN(awayScore) || !reason?.trim()) return
            await overrideResult(poolId, match?.id ?? '', { homeScore, awayScore }, reason)
          }}
          className="space-y-4"
        >
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Gols {match?.home_team ?? 'Casa'}</label>
              <input
                name="homeScore"
                type="number"
                min={0}
                max={20}
                required
                defaultValue={currentResult?.homeScore ?? 0}
                className="w-20 border border-slate-300 rounded-md px-3 py-2 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <span className="text-2xl font-bold text-slate-400 mt-4">×</span>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Gols {match?.away_team ?? 'Fora'}</label>
              <input
                name="awayScore"
                type="number"
                min={0}
                max={20}
                required
                defaultValue={currentResult?.awayScore ?? 0}
                className="w-20 border border-slate-300 rounded-md px-3 py-2 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Motivo da alteração *</label>
            <textarea
              name="reason"
              required
              rows={3}
              placeholder="Descreva o motivo da intervenção..."
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-6 py-2 rounded-md transition-colors"
          >
            Salvar alteração
          </button>
        </form>
      </div>

      {/* Audit log */}
      {audit.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Histórico de Intervenções</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {audit.map(a => {
              const prev = a.previous_result as { homeScore?: number; awayScore?: number } | null
              const next = a.new_result as { homeScore?: number; awayScore?: number } | null
              return (
                <div key={a.id} className="px-6 py-4 text-sm">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-slate-700">
                      {prev ? `${prev.homeScore}×${prev.awayScore}` : '—'}
                      {' → '}
                      {next ? `${next.homeScore}×${next.awayScore}` : '—'}
                    </span>
                    <span className="text-slate-400 text-xs">{fmtDate(a.created_at)}</span>
                  </div>
                  <p className="text-slate-500 italic">&ldquo;{a.reason}&rdquo;</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Entries */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Entradas ({entries.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="px-6 py-3 text-left">Palpite</th>
                <th className="px-6 py-3 text-left">Valor</th>
                <th className="px-6 py-3 text-left">Resultado</th>
                <th className="px-6 py-3 text-left">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map(e => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-mono text-xs text-slate-700">
                    {JSON.stringify(e.prediction)}
                  </td>
                  <td className="px-6 py-3 text-slate-700">{fmtBrl(e.amount)}</td>
                  <td className="px-6 py-3">
                    {e.is_winner === null ? (
                      <span className="text-slate-400 text-xs">Pendente</span>
                    ) : e.is_winner ? (
                      <span className="text-green-600 font-medium text-xs">✓ Ganhou</span>
                    ) : (
                      <span className="text-red-500 text-xs">✗ Perdeu</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-slate-400 text-xs">{fmtDate(e.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
