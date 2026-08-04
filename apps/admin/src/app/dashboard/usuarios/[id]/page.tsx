export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase-admin'
import { fmtBrl, fmtDate, MODALITY_LABEL } from '@/lib/utils'
import { StatusBadge } from '@/components/status-badge'
import { toggleUserBlocked } from '@/actions/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

type MatchRow = { home_team: string; away_team: string; kickoff_at?: string }
type PoolRow = { modality: string; tier_brl: number; status?: string; match: MatchRow | MatchRow[] | null }

function resolvePool(raw: PoolRow | PoolRow[] | null): PoolRow | null {
  if (!raw) return null
  return Array.isArray(raw) ? raw[0] : raw
}
function resolveMatch(pool: PoolRow | null): MatchRow | null {
  if (!pool?.match) return null
  return Array.isArray(pool.match) ? pool.match[0] : pool.match
}

async function getUser(id: string) {
  const db = createAdminClient()
  const { data } = await db
    .from('users')
    .select('*')
    .eq('id', id)
    .single()
  return data
}

async function getUserEntries(userId: string) {
  const db = createAdminClient()
  const { data } = await db
    .from('entries')
    .select('id, amount, is_winner, created_at, prediction, pool:pools(modality, tier_brl, status, match:matches(home_team, away_team, kickoff_at))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  return data ?? []
}

async function getUserTransactions(userId: string) {
  const db = createAdminClient()
  const { data } = await db
    .from('transactions')
    .select('id, type, amount, balance_after, description, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)
  return data ?? []
}

const TX_TYPE_LABEL: Record<string, string> = {
  entry:   'Entrada',
  prize:   'Prêmio',
  refund:  'Reembolso',
  bonus:   'Bônus',
}

const TX_TYPE_COLOR: Record<string, string> = {
  entry:   'text-red-500',
  prize:   'text-emerald-600',
  refund:  'text-blue-600',
  bonus:   'text-gold-600',
}

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [user, entries, transactions] = await Promise.all([
    getUser(id),
    getUserEntries(id),
    getUserTransactions(id),
  ])

  if (!user) notFound()

  const vitorias = entries.filter(e => e.is_winner === true).length
  const derrotas = entries.filter(e => e.is_winner === false).length

  return (
    <div>
      <Link href="/dashboard/usuarios" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-gold-600 transition-colors mb-6">
        <ArrowLeft size={14} /> Voltar
      </Link>

      {/* Header */}
      <div className="bg-white dark:bg-navy-900 rounded-xl border border-stone-200 dark:border-navy-700 shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {user.username ? `@${user.username}` : `Usuário ${user.telegram_id}`}
            </h1>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-0.5">Telegram ID: {String(user.telegram_id)}</p>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">Cadastro: {fmtDate(user.created_at)}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={user.is_blocked ? 'cancelled' : 'open'} />
            <form action={toggleUserBlocked.bind(null, user.id, !user.is_blocked)}>
              <button
                type="submit"
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  user.is_blocked
                    ? 'bg-gold-500/10 text-gold-700 hover:bg-gold-500/20'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'
                }`}
              >
                {user.is_blocked ? 'Desbloquear' : 'Bloquear'}
              </button>
            </form>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-stone-100 dark:border-navy-700">
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Saldo</p>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-200 font-mono">{fmtBrl(user.virtual_balance)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Total Palpites</p>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{entries.length}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Vitórias</p>
            <p className="text-xl font-bold text-emerald-600">{vitorias}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Derrotas</p>
            <p className="text-xl font-bold text-red-500">{derrotas}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entradas */}
        <div className="lg:col-span-2 bg-white dark:bg-navy-900 rounded-xl border border-stone-200 dark:border-navy-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 dark:border-navy-700 flex items-center gap-2">
            <div className="w-1 h-5 bg-gold-500 rounded-full" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-200">Últimos Palpites</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 dark:bg-navy-800 text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Partida / Modalidade</th>
                  <th className="px-4 py-3 text-left">Palpite</th>
                  <th className="px-4 py-3 text-left">Valor</th>
                  <th className="px-4 py-3 text-left">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-navy-700">
                {entries.map(e => {
                  const pool = resolvePool(e.pool as PoolRow | PoolRow[] | null)
                  const match = resolveMatch(pool)
                  return (
                    <tr key={e.id} className="hover:bg-stone-50 dark:hover:bg-navy-800">
                      <td className="px-4 py-3">
                        <div className="text-xs font-medium text-slate-700 dark:text-slate-200">{match ? `${match.home_team} × ${match.away_team}` : '—'}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">{pool ? (MODALITY_LABEL[pool.modality] ?? pool.modality) : '—'}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">{JSON.stringify(e.prediction)}</td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">{fmtBrl(e.amount)}</td>
                      <td className="px-4 py-3">
                        {e.is_winner === null ? (
                          <span className="text-slate-300 dark:text-slate-600 text-xs">Pendente</span>
                        ) : e.is_winner ? (
                          <span className="text-xs font-semibold text-emerald-600">Ganhou</span>
                        ) : (
                          <span className="text-xs font-semibold text-red-500">Perdeu</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {entries.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500 text-xs">Sem palpites ainda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Transações */}
        <div className="bg-white dark:bg-navy-900 rounded-xl border border-stone-200 dark:border-navy-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 dark:border-navy-700 flex items-center gap-2">
            <div className="w-1 h-5 bg-gold-500 rounded-full" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-200">Transações</h2>
          </div>
          <div className="divide-y divide-stone-100 dark:divide-navy-700">
            {transactions.map(tx => (
              <div key={tx.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{TX_TYPE_LABEL[tx.type] ?? tx.type}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{fmtDate(tx.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-bold font-mono ${TX_TYPE_COLOR[tx.type] ?? 'text-slate-600 dark:text-slate-300'}`}>
                    {tx.type === 'entry' ? '-' : '+'}{fmtBrl(Math.abs(tx.amount))}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">{fmtBrl(tx.balance_after)}</p>
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <p className="px-4 py-8 text-center text-slate-400 dark:text-slate-500 text-xs">Sem transações ainda.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
