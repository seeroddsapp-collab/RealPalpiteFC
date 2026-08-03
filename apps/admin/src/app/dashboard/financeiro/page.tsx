export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase-admin'

const PAGE_SIZE = 50

type SearchParams = { page?: string; tab?: string }

function fmtBrl(n: number) {
  return `R$ ${n.toFixed(2).replace('.', ',')}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

const DEPOSIT_STATUS_CSS: Record<string, string> = {
  pending:   'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  expired:   'bg-red-50 text-red-700 border-red-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
}
const DEPOSIT_STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente', confirmed: 'Confirmado', expired: 'Expirado', cancelled: 'Cancelado',
}
const WITHDRAWAL_STATUS_CSS: Record<string, string> = {
  processing: 'bg-amber-50 text-amber-700 border-amber-200',
  completed:  'bg-blue-50 text-blue-700 border-blue-200',
  failed:     'bg-red-50 text-red-700 border-red-200',
}
const WITHDRAWAL_STATUS_LABEL: Record<string, string> = {
  processing: 'Processando', completed: 'Concluído', failed: 'Falhou',
}

function StatusChip({ css, label }: { css: string; label: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${css}`}>
      {label}
    </span>
  )
}

export default async function FinanceiroPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createAdminClient()
  const tab  = searchParams.tab ?? 'depositos'
  const page = Math.max(1, Number(searchParams.page ?? 1))
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  // Stats globais
  const [{ data: totalDepositedRow }, { data: totalWithdrawnRow }, { count: totalUsers }] =
    await Promise.all([
      supabase
        .from('pix_deposits')
        .select('amount')
        .eq('status', 'confirmed'),
      supabase
        .from('pix_withdrawals')
        .select('amount')
        .eq('status', 'completed'),
      supabase.from('users').select('*', { count: 'exact', head: true }),
    ])

  const totalDeposited = (totalDepositedRow ?? []).reduce((s: number, r: { amount: number }) => s + r.amount, 0)
  const totalWithdrawn = (totalWithdrawnRow ?? []).reduce((s: number, r: { amount: number }) => s + r.amount, 0)
  const net = totalDeposited - totalWithdrawn

  // Dados da aba ativa
  let deposits: any[] = [], withdrawals: any[] = [], count = 0

  if (tab === 'depositos') {
    const { data, count: c, error } = await supabase
      .from('pix_deposits')
      .select('*, users(username, telegram_id)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)
    if (!error) { deposits = data ?? []; count = c ?? 0 }
  } else {
    const { data, count: c, error } = await supabase
      .from('pix_withdrawals')
      .select('*, users(username, telegram_id)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)
    if (!error) { withdrawals = data ?? []; count = c ?? 0 }
  }

  const totalPages = Math.ceil(count / PAGE_SIZE)

  function buildUrl(p: number, t = tab) {
    return `/dashboard/financeiro?tab=${t}&page=${p}`
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gold-400">Financeiro</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-navy-800 rounded-lg p-4 border border-navy-700">
          <p className="text-xs text-slate-400 mb-1">Total Depositado</p>
          <p className="text-xl font-bold text-emerald-400">{fmtBrl(totalDeposited)}</p>
        </div>
        <div className="bg-navy-800 rounded-lg p-4 border border-navy-700">
          <p className="text-xs text-slate-400 mb-1">Total Sacado</p>
          <p className="text-xl font-bold text-rose-400">{fmtBrl(totalWithdrawn)}</p>
        </div>
        <div className="bg-navy-800 rounded-lg p-4 border border-navy-700">
          <p className="text-xs text-slate-400 mb-1">Saldo Líquido</p>
          <p className={`text-xl font-bold ${net >= 0 ? 'text-gold-400' : 'text-rose-400'}`}>
            {fmtBrl(net)}
          </p>
        </div>
        <div className="bg-navy-800 rounded-lg p-4 border border-navy-700">
          <p className="text-xs text-slate-400 mb-1">Usuários</p>
          <p className="text-xl font-bold text-slate-200">{totalUsers ?? 0}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-navy-700">
        {['depositos', 'saques'].map(t => (
          <a
            key={t}
            href={buildUrl(1, t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
              tab === t
                ? 'border-gold-500 text-gold-400'
                : 'border-transparent text-slate-400 hover:text-gold-400'
            }`}
          >
            {t === 'depositos' ? 'Depósitos' : 'Saques'}
          </a>
        ))}
      </div>

      {/* Tabela de Depósitos */}
      {tab === 'depositos' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-navy-700">
                <th className="pb-3 pr-4">Usuário</th>
                <th className="pb-3 pr-4">Valor</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Data</th>
                <th className="pb-3">Confirmado</th>
              </tr>
            </thead>
            <tbody>
              {deposits.map((d: any) => (
                <tr key={d.id} className="border-b border-navy-700/50 hover:bg-navy-800/40">
                  <td className="py-3 pr-4 text-slate-300">
                    @{d.users?.username ?? d.users?.telegram_id ?? '—'}
                  </td>
                  <td className="py-3 pr-4 font-medium text-emerald-400">{fmtBrl(d.amount)}</td>
                  <td className="py-3 pr-4">
                    <StatusChip
                      css={DEPOSIT_STATUS_CSS[d.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}
                      label={DEPOSIT_STATUS_LABEL[d.status] ?? d.status}
                    />
                  </td>
                  <td className="py-3 pr-4 text-slate-400 text-xs">{fmtDate(d.created_at)}</td>
                  <td className="py-3 text-slate-400 text-xs">
                    {d.confirmed_at ? fmtDate(d.confirmed_at) : '—'}
                  </td>
                </tr>
              ))}
              {deposits.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Nenhum depósito encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tabela de Saques */}
      {tab === 'saques' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-navy-700">
                <th className="pb-3 pr-4">Usuário</th>
                <th className="pb-3 pr-4">Valor</th>
                <th className="pb-3 pr-4">Chave PIX</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3">Data</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map((w: any) => (
                <tr key={w.id} className="border-b border-navy-700/50 hover:bg-navy-800/40">
                  <td className="py-3 pr-4 text-slate-300">
                    @{w.users?.username ?? w.users?.telegram_id ?? '—'}
                  </td>
                  <td className="py-3 pr-4 font-medium text-rose-400">{fmtBrl(w.amount)}</td>
                  <td className="py-3 pr-4 text-slate-400 font-mono text-xs">
                    {w.pix_key} <span className="text-slate-600">({w.pix_key_type})</span>
                  </td>
                  <td className="py-3 pr-4">
                    <StatusChip
                      css={WITHDRAWAL_STATUS_CSS[w.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}
                      label={WITHDRAWAL_STATUS_LABEL[w.status] ?? w.status}
                    />
                  </td>
                  <td className="py-3 text-slate-400 text-xs">{fmtDate(w.created_at)}</td>
                </tr>
              ))}
              {withdrawals.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Nenhum saque encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex gap-2 justify-center pt-2">
          {page > 1 && (
            <a href={buildUrl(page - 1)} className="px-3 py-1 rounded bg-navy-800 text-slate-300 hover:bg-navy-700 text-sm">
              ← Anterior
            </a>
          )}
          <span className="px-3 py-1 text-slate-400 text-sm">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <a href={buildUrl(page + 1)} className="px-3 py-1 rounded bg-navy-800 text-slate-300 hover:bg-navy-700 text-sm">
              Próxima →
            </a>
          )}
        </div>
      )}
    </div>
  )
}
