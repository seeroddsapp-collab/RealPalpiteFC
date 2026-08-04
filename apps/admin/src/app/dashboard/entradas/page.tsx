export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase-admin'
import { fmtBrl, fmtDate, MODALITY_LABEL } from '@/lib/utils'
import { Pagination } from '@/components/pagination'
import { SearchBar } from '@/components/search-bar'
import Link from 'next/link'

type PoolRow = { modality: string; tier_brl: number; match: MatchRow | MatchRow[] | null }
type MatchRow = { home_team: string; away_team: string }
type UserRow = { id: string; username: string | null; telegram_id: number }

function resolvePool(raw: PoolRow | PoolRow[] | null): PoolRow | null {
  if (!raw) return null
  return Array.isArray(raw) ? raw[0] : raw
}
function resolveMatch(pool: PoolRow | null): MatchRow | null {
  if (!pool?.match) return null
  return Array.isArray(pool.match) ? pool.match[0] : pool.match
}
function resolveUser(raw: UserRow | UserRow[] | null): UserRow | null {
  if (!raw) return null
  return Array.isArray(raw) ? raw[0] : raw
}

const PAGE_SIZE = 50

async function getEntries(page: number, q?: string) {
  const db = createAdminClient()
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let userIds: string[] | null = null
  if (q) {
    const { data } = await db
      .from('users')
      .select('id')
      .ilike('username', `%${q}%`)
    userIds = (data ?? []).map(u => u.id)
    if (userIds.length === 0) return { entries: [], total: 0 }
  }

  let query = db
    .from('entries')
    .select(
      'id, amount, is_winner, created_at, prediction, user:users(id, username, telegram_id), pool:pools(modality, tier_brl, match:matches(home_team, away_team))',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to)

  if (userIds) query = query.in('user_id', userIds)

  const { data, count } = await query
  return { entries: data ?? [], total: count ?? 0 }
}

export default async function EntradasPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  const { page: pageStr, q } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? '1'))
  const { entries, total } = await getEntries(page, q)

  function buildUrl(p: number) {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    params.set('page', String(p))
    return `/dashboard/entradas?${params.toString()}`
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">Entradas</h1>
          <p className="text-slate-400 dark:text-slate-500 text-sm">{total} palpite{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}</p>
        </div>
        <SearchBar placeholder="Buscar por @username" defaultValue={q} />
      </div>

      <div className="bg-white dark:bg-navy-900 rounded-xl border border-stone-200 dark:border-navy-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 dark:bg-navy-800 text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-6 py-3 text-left">Usuário</th>
                <th className="px-6 py-3 text-left">Partida</th>
                <th className="px-6 py-3 text-left">Modalidade</th>
                <th className="px-6 py-3 text-left">Palpite</th>
                <th className="px-6 py-3 text-left">Valor</th>
                <th className="px-6 py-3 text-left">Resultado</th>
                <th className="px-6 py-3 text-left">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-navy-700">
              {entries.map(e => {
                const user = resolveUser(e.user as UserRow | UserRow[] | null)
                const pool = resolvePool(e.pool as PoolRow | PoolRow[] | null)
                const match = resolveMatch(pool)
                return (
                  <tr key={e.id} className="hover:bg-stone-50 dark:hover:bg-navy-800 transition-colors">
                    <td className="px-6 py-3">
                      {user ? (
                        <Link href={`/dashboard/usuarios/${user.id}`} className="font-medium text-slate-800 dark:text-slate-200 hover:text-gold-600 transition-colors">
                          {user.username ? `@${user.username}` : `ID ${user.telegram_id}`}
                        </Link>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-3 text-slate-600 dark:text-slate-300 text-xs">
                      {match ? `${match.home_team} × ${match.away_team}` : '—'}
                    </td>
                    <td className="px-6 py-3 text-slate-500 dark:text-slate-400 text-xs">
                      {pool ? (MODALITY_LABEL[pool.modality] ?? pool.modality) : '—'}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-slate-700 dark:text-slate-200">
                      {JSON.stringify(e.prediction)}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {fmtBrl(e.amount)}
                    </td>
                    <td className="px-6 py-3">
                      {e.is_winner === null ? (
                        <span className="text-slate-300 dark:text-slate-600 text-xs">Pendente</span>
                      ) : e.is_winner ? (
                        <span className="text-xs font-semibold text-emerald-600">Ganhou</span>
                      ) : (
                        <span className="text-xs font-semibold text-red-500">Perdeu</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-slate-400 dark:text-slate-500 text-xs">{fmtDate(e.created_at)}</td>
                  </tr>
                )
              })}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                    Nenhuma entrada encontrada.
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
