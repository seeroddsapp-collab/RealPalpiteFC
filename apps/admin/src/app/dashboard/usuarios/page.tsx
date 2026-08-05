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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">Usuários</h1>
          <p className="text-slate-400 dark:text-slate-500 text-sm">{total} usuário{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}</p>
        </div>
        <SearchBar placeholder="Buscar por @username" defaultValue={q} />
      </div>

      <div className="bg-white dark:bg-navy-900 rounded-xl border border-stone-200 dark:border-navy-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 dark:bg-navy-800 text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-3 lg:px-6 py-2 lg:py-3 text-left">Telegram</th>
                <th className="px-3 lg:px-6 py-2 lg:py-3 text-left">Saldo</th>
                <th className="px-3 lg:px-6 py-2 lg:py-3 text-left hidden sm:table-cell">Palpites</th>
                <th className="px-3 lg:px-6 py-2 lg:py-3 text-left hidden md:table-cell">Cadastro</th>
                <th className="px-3 lg:px-6 py-2 lg:py-3 text-left">Status</th>
                <th className="px-3 lg:px-6 py-2 lg:py-3 text-left">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-navy-700">
              {users.map(u => (
                <tr key={u.id} className={`hover:bg-stone-50 dark:hover:bg-navy-800 transition-colors ${u.is_blocked ? 'opacity-60' : ''}`}>
                  <td className="px-3 lg:px-6 py-2 lg:py-3 max-w-[130px] sm:max-w-none">
                    <Link href={`/dashboard/usuarios/${u.id}`} className="group">
                      <div className="font-medium text-slate-800 dark:text-slate-200 group-hover:text-gold-600 transition-colors truncate">
                        {u.username ? `@${u.username}` : `ID ${u.telegram_id}`}
                      </div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">ID: {String(u.telegram_id)}</div>
                    </Link>
                  </td>
                  <td className="px-3 lg:px-6 py-2 lg:py-3 font-medium text-slate-700 dark:text-slate-200 font-mono text-xs">{fmtBrl(u.virtual_balance)}</td>
                  <td className="px-3 lg:px-6 py-2 lg:py-3 text-slate-600 dark:text-slate-300 hidden sm:table-cell">{counts[u.id] ?? 0}</td>
                  <td className="px-3 lg:px-6 py-2 lg:py-3 text-slate-400 dark:text-slate-500 text-xs hidden md:table-cell">{fmtDate(u.created_at)}</td>
                  <td className="px-3 lg:px-6 py-2 lg:py-3">
                    <StatusBadge status={u.is_blocked ? 'cancelled' : 'open'} />
                  </td>
                  <td className="px-3 lg:px-6 py-2 lg:py-3">
                    <form action={toggleUserBlocked.bind(null, u.id, !u.is_blocked)}>
                      <button
                        type="submit"
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                          u.is_blocked
                            ? 'bg-gold-500/10 text-gold-700 hover:bg-gold-500/20'
                            : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'
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
                  <td colSpan={6} className="px-3 py-12 text-center text-slate-400 dark:text-slate-500">
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
