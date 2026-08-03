export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase-admin'
import { fmtBrl, fmtDate } from '@/lib/utils'
import { toggleUserBlocked } from '@/actions/admin'
import { StatusBadge } from '@/components/status-badge'
import { Pagination } from '@/components/pagination'
import { SearchBar } from '@/components/search-bar'
import Link from 'next/link'

const PAGE_SIZE = 50

async function getUsers(page: number, q?: string) {
  const db = createAdminClient()
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = db
    .from('users')
    .select('id, telegram_id, username, virtual_balance, is_blocked, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (q) {
    query = query.ilike('username', `%${q}%`)
  }

  const { data, count } = await query
  return { users: data ?? [], total: count ?? 0 }
}

async function getEntryCounts(userIds: string[]) {
  if (userIds.length === 0) return {}
  const db = createAdminClient()
  const { data } = await db.from('entries').select('user_id').in('user_id', userIds)
  const counts: Record<string, number> = {}
  for (const e of data ?? []) {
    counts[e.user_id] = (counts[e.user_id] ?? 0) + 1
  }
  return counts
}

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  const { page: pageStr, q } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? '1'))
  const { users, total } = await getUsers(page, q)
  const counts = await getEntryCounts(users.map(u => u.id))

  function buildUrl(p: number) {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    params.set('page', String(p))
    return `/dashboard/usuarios?${params.toString()}`
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Usuários</h1>
          <p className="text-slate-400 text-sm">{total} usuário{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}</p>
        </div>
        <SearchBar placeholder="Buscar por @username" defaultValue={q} />
      </div>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-slate-400 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-6 py-3 text-left">Telegram</th>
                <th className="px-6 py-3 text-left">Saldo</th>
                <th className="px-6 py-3 text-left">Palpites</th>
                <th className="px-6 py-3 text-left">Cadastro</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {users.map(u => (
                <tr key={u.id} className={`hover:bg-stone-50 transition-colors ${u.is_blocked ? 'opacity-60' : ''}`}>
                  <td className="px-6 py-3">
                    <Link href={`/dashboard/usuarios/${u.id}`} className="group">
                      <div className="font-medium text-slate-800 group-hover:text-gold-600 transition-colors">
                        {u.username ? `@${u.username}` : `ID ${u.telegram_id}`}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">ID: {String(u.telegram_id)}</div>
                    </Link>
                  </td>
                  <td className="px-6 py-3 font-medium text-slate-700 font-mono text-xs">{fmtBrl(u.virtual_balance)}</td>
                  <td className="px-6 py-3 text-slate-600">{counts[u.id] ?? 0}</td>
                  <td className="px-6 py-3 text-slate-400 text-xs">{fmtDate(u.created_at)}</td>
                  <td className="px-6 py-3">
                    <StatusBadge status={u.is_blocked ? 'cancelled' : 'open'} />
                  </td>
                  <td className="px-6 py-3">
                    <form action={toggleUserBlocked.bind(null, u.id, !u.is_blocked)}>
                      <button
                        type="submit"
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                          u.is_blocked
                            ? 'bg-gold-500/10 text-gold-700 hover:bg-gold-500/20'
                            : 'bg-red-50 text-red-600 hover:bg-red-100'
                        }`}
                      >
                        {u.is_blocked ? 'Desbloquear' : 'Bloquear'}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    Nenhum usuário encontrado.
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
