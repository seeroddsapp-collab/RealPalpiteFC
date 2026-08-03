export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase-admin'
import { fmtBrl, fmtDate } from '@/lib/utils'
import { toggleUserBlocked } from '@/actions/admin'

async function getUsers() {
  const db = createAdminClient()
  const { data } = await db
    .from('users')
    .select('id, telegram_id, username, virtual_balance, is_blocked, created_at')
    .order('created_at', { ascending: false })
    .limit(200)
  return data ?? []
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

export default async function UsuariosPage() {
  const users = await getUsers()
  const counts = await getEntryCounts(users.map(u => u.id))

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Usuários</h1>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="px-6 py-3 text-left">Telegram</th>
                <th className="px-6 py-3 text-left">Saldo</th>
                <th className="px-6 py-3 text-left">Entradas</th>
                <th className="px-6 py-3 text-left">Cadastro</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.id} className={`hover:bg-slate-50 ${u.is_blocked ? 'opacity-60' : ''}`}>
                  <td className="px-6 py-3">
                    <div className="font-medium text-slate-900">
                      {u.username ? `@${u.username}` : `ID ${u.telegram_id}`}
                    </div>
                    <div className="text-xs text-slate-400">Telegram: {String(u.telegram_id)}</div>
                  </td>
                  <td className="px-6 py-3 font-medium text-slate-800">{fmtBrl(u.virtual_balance)}</td>
                  <td className="px-6 py-3 text-slate-600">{counts[u.id] ?? 0}</td>
                  <td className="px-6 py-3 text-slate-400 text-xs">{fmtDate(u.created_at)}</td>
                  <td className="px-6 py-3">
                    {u.is_blocked ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Bloqueado
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Ativo
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <form action={toggleUserBlocked.bind(null, u.id, !u.is_blocked)}>
                      <button
                        type="submit"
                        className={`text-xs px-3 py-1 rounded-md font-medium transition-colors ${
                          u.is_blocked
                            ? 'bg-green-50 text-green-700 hover:bg-green-100'
                            : 'bg-red-50 text-red-700 hover:bg-red-100'
                        }`}
                      >
                        {u.is_blocked ? 'Desbloquear' : 'Bloquear'}
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
