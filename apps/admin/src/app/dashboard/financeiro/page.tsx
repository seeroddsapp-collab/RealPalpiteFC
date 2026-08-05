export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase-admin'

const PAGE_SIZE = 50

type SearchParams = { page?: string; tab?: string; type?: string }

type UserRef = { username: string | null; telegram_id: number } | null
type DepositRow    = { id: string; amount: number; status: string; created_at: string; confirmed_at: string | null; users: UserRef }
type WithdrawalRow = { id: string; amount: number; status: string; created_at: string; pix_key: string; pix_key_type: string; users: UserRef }
type TxRow         = { id: string; amount: number; balance_after: number; type: string; description: string | null; created_at: string; users: UserRef }

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
  pending:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  confirmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  expired:   'bg-red-500/10 text-red-400 border-red-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
}
const DEPOSIT_STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente', confirmed: 'Confirmado', expired: 'Expirado', cancelled: 'Cancelado',
}
const WITHDRAWAL_STATUS_CSS: Record<string, string> = {
  processing: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  completed:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  failed:     'bg-red-500/10 text-red-400 border-red-500/20',
}
const WITHDRAWAL_STATUS_LABEL: Record<string, string> = {
  processing: 'Processando', completed: 'Concluído', failed: 'Falhou',
}
const TX_TYPE_CSS: Record<string, string> = {
  entry:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
  prize:    'bg-gold-500/10 text-gold-400 border-gold-500/20',
  refund:   'bg-slate-500/10 text-slate-400 border-slate-500/20',
  deposit:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  withdraw: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
}
const TX_TYPE_LABEL: Record<string, string> = {
  entry: 'Entrada', prize: 'Prêmio', refund: 'Devolução', deposit: 'Depósito', withdraw: 'Saque',
}

function Chip({ css, label }: { css: string; label: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${css}`}>
      {label}
    </span>
  )
}

function KpiCard({
  label, value, sub, color = 'text-slate-700 dark:text-slate-200',
}: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white dark:bg-navy-800 rounded-xl p-4 border border-stone-200 dark:border-navy-700 flex flex-col gap-1">
      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 dark:text-slate-500">{sub}</p>}
    </div>
  )
}

// Gráfico 100% CSS/flexbox — naturalmente responsivo, sem SVG scaling issues
function FlowChart({ data }: { data: Array<{ label: string; dep: number; wit: number }> }) {
  const maxVal = Math.max(...data.map(d => Math.max(d.dep, d.wit)), 0.01)
  const step = Math.ceil(data.length / 8)

  function fmtY(val: number) {
    if (val === 0) return 'R$0'
    if (val >= 1000) return `R$${(val / 1000).toFixed(1)}k`
    return `R$${val.toFixed(0)}`
  }

  return (
    <div className="w-full select-none">
      {/* Legenda */}
      <div className="flex gap-5 mb-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block flex-shrink-0" />
          Depósitos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block flex-shrink-0" />
          Saques
        </span>
      </div>

      <div className="flex gap-3">
        {/* Eixo Y */}
        <div className="flex flex-col justify-between text-right shrink-0 w-12 pb-6">
          {[1, 0.75, 0.5, 0.25, 0].map(t => (
            <span key={t} className="text-[11px] text-slate-500 leading-none">{fmtY(maxVal * t)}</span>
          ))}
        </div>

        {/* Área do gráfico */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          {/* Barras + grid */}
          <div className="relative h-44 border-b border-l border-slate-700/60">
            {/* Linhas de grade */}
            {[0.25, 0.5, 0.75].map(t => (
              <div
                key={t}
                className="absolute inset-x-0 border-t border-slate-800"
                style={{ bottom: `${t * 100}%` }}
              />
            ))}

            {/* Grupos de barras */}
            <div className="absolute inset-0 flex items-end gap-px px-0.5 pt-1">
              {data.map(d => (
                <div key={d.label} className="flex-1 flex gap-px items-end h-full min-w-0">
                  <div
                    className="flex-1 bg-emerald-500/80 rounded-t-sm min-h-0"
                    style={{ height: `${(d.dep / maxVal * 100).toFixed(1)}%` }}
                  />
                  <div
                    className="flex-1 bg-rose-500/80 rounded-t-sm min-h-0"
                    style={{ height: `${(d.wit / maxVal * 100).toFixed(1)}%` }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Eixo X */}
          <div className="flex h-5">
            {data.map((d, i) => (
              <div key={d.label} className="flex-1 min-w-0 text-center overflow-hidden">
                {i % step === 0 && (
                  <span className="text-[10px] text-slate-500 leading-none whitespace-nowrap">
                    {d.label.slice(5)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function buildDailyData(
  deposits: Array<{ amount: number; confirmed_at: string | null }>,
  withdrawals: Array<{ amount: number; created_at: string }>,
  days: number,
) {
  const now = new Date()
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (days - 1 - i))
    const dateStr = d.toISOString().slice(0, 10)
    const dep = deposits.filter(x => x.confirmed_at?.slice(0, 10) === dateStr).reduce((s, x) => s + x.amount, 0)
    const wit = withdrawals.filter(x => x.created_at.slice(0, 10) === dateStr).reduce((s, x) => s + x.amount, 0)
    return { label: dateStr, dep, wit }
  })
}

export default async function FinanceiroPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const db = createAdminClient()
  const sp = await searchParams
  const tab  = sp.tab ?? 'depositos'
  const page = Math.max(1, Number(sp.page ?? 1))
  const txType = sp.type ?? 'all'
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const [
    { data: confirmedDeps },
    { data: completedWits },
    { data: pendingDeps },
    { data: processingWits },
    { data: entryTxs },
    { data: prizeTxs },
    { data: refundTxs },
    { data: userBalances },
    { count: totalUsers },
    // Chart data
    { data: recentDeps },
    { data: recentWits },
  ] = await Promise.all([
    db.from('pix_deposits').select('amount').eq('status', 'confirmed'),
    db.from('pix_withdrawals').select('amount').eq('status', 'completed'),
    db.from('pix_deposits').select('amount').eq('status', 'pending'),
    db.from('pix_withdrawals').select('amount').eq('status', 'processing'),
    db.from('transactions').select('amount').eq('type', 'entry'),
    db.from('transactions').select('amount').eq('type', 'prize'),
    db.from('transactions').select('amount').eq('type', 'refund'),
    db.from('users').select('virtual_balance'),
    db.from('users').select('*', { count: 'exact', head: true }),
    db.from('pix_deposits').select('amount,confirmed_at').eq('status', 'confirmed').gte('confirmed_at', thirtyDaysAgo.toISOString()),
    db.from('pix_withdrawals').select('amount,created_at').eq('status', 'completed').gte('created_at', thirtyDaysAgo.toISOString()),
  ])

  const sum = (arr: Array<{ amount: number }> | null) => (arr ?? []).reduce((s, r) => s + r.amount, 0)

  const totalDeposited  = sum(confirmedDeps)
  const totalWithdrawn  = sum(completedWits)
  const pendingAmt      = sum(pendingDeps)
  const processingAmt   = sum(processingWits)
  const arrecadacao     = sum(entryTxs)
  const premios         = sum(prizeTxs)
  const devolucoes      = sum(refundTxs)
  const receita         = arrecadacao - premios - devolucoes
  const custodia        = (userBalances ?? []).reduce((s, u) => s + (u.virtual_balance ?? 0), 0)
  const net             = totalDeposited - totalWithdrawn
  // Quanto a plataforma pode sacar com segurança: saldo estimado no MP menos o que pertence aos usuários
  const disponivel      = net - custodia

  const chartData = buildDailyData(recentDeps ?? [], recentWits ?? [], 30)

  // ── Tabelas ────────────────────────────────────────────────────────────────
  let deposits: DepositRow[] = [], withdrawals: WithdrawalRow[] = [], transactions: TxRow[] = [], count = 0

  if (tab === 'depositos') {
    const { data, count: c } = await db
      .from('pix_deposits')
      .select('*, users(username, telegram_id)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)
    deposits = (data ?? []) as unknown as DepositRow[]; count = c ?? 0

  } else if (tab === 'saques') {
    const { data, count: c } = await db
      .from('pix_withdrawals')
      .select('*, users(username, telegram_id)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)
    withdrawals = (data ?? []) as unknown as WithdrawalRow[]; count = c ?? 0

  } else {
    let q = db
      .from('transactions')
      .select('*, users(username, telegram_id)', { count: 'exact' })
      .order('created_at', { ascending: false })
    if (txType !== 'all') q = q.eq('type', txType)
    const { data, count: c } = await q.range(from, to)
    transactions = (data ?? []) as unknown as TxRow[]; count = c ?? 0
  }

  const totalPages = Math.ceil(count / PAGE_SIZE)

  function url(p: number, t = tab, ty = txType) {
    return `/dashboard/financeiro?tab=${t}&page=${p}&type=${ty}`
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gold-400">Financeiro</h1>

      {/* ── Indicador principal: Disponível para retirada ── */}
      <div className={`rounded-2xl p-5 border-2 flex flex-col sm:flex-row sm:items-center gap-4 ${
        disponivel >= 0
          ? 'bg-emerald-500/5 border-emerald-500/30'
          : 'bg-rose-500/5 border-rose-500/30'
      }`}>
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
            Disponível para Retirada
          </p>
          <p className={`text-4xl font-bold font-mono ${disponivel >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {fmtBrl(disponivel)}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Saldo estimado no Mercado Pago menos o que pertence aos usuários (custódia).
            Apenas esse valor é seguro sacar para sua conta.
          </p>
        </div>
        <div className="flex flex-col gap-1.5 text-xs font-mono w-full sm:min-w-48 sm:w-auto">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">Depósitos recebidos</span>
            <span className="text-emerald-400">+{fmtBrl(totalDeposited)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">Saques enviados</span>
            <span className="text-rose-400">−{fmtBrl(totalWithdrawn)}</span>
          </div>
          <div className="border-t border-slate-700 pt-1.5 flex items-center justify-between gap-4">
            <span className="text-slate-400">Saldo MP estimado</span>
            <span className="text-slate-200">{fmtBrl(net)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">Custódia usuários</span>
            <span className="text-rose-400">−{fmtBrl(custodia)}</span>
          </div>
          <div className="border-t border-slate-700 pt-1.5 flex items-center justify-between gap-4 font-bold">
            <span className="text-slate-300">Disponível</span>
            <span className={disponivel >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{fmtBrl(disponivel)}</span>
          </div>
        </div>
      </div>

      {/* ── Seção 1: Fluxo PIX ── */}
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 font-semibold">Fluxo PIX</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Total Depositado" value={fmtBrl(totalDeposited)} color="text-emerald-400" />
          <KpiCard label="Total Sacado"     value={fmtBrl(totalWithdrawn)} color="text-rose-400" />
          <KpiCard label="Saldo Líquido"    value={fmtBrl(net)}            color={net >= 0 ? 'text-gold-400' : 'text-rose-400'} />
          <KpiCard label="Custódia"         value={fmtBrl(custodia)}       sub={`${totalUsers ?? 0} usuários`} color="text-slate-200" />
        </div>
      </div>

      {/* ── Seção 2: Negócio ── */}
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 font-semibold">Bolões</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Arrecadação"       value={fmtBrl(arrecadacao)} sub="Total de entradas"    color="text-blue-400" />
          <KpiCard label="Prêmios Pagos"     value={fmtBrl(premios)}     sub="Distribuído a vencedores" color="text-amber-400" />
          <KpiCard label="Devoluções"        value={fmtBrl(devolucoes)}  sub="Sem acertador / cancelado" color="text-slate-400" />
          <KpiCard label="Receita Plataforma" value={fmtBrl(receita)}    sub="Arrecadação − prêmios − devoluções" color={receita >= 0 ? 'text-gold-400' : 'text-rose-400'} />
        </div>
      </div>

      {/* ── Seção 3: Pendências ── */}
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 font-semibold">Pendências</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-navy-800 rounded-xl p-4 border border-amber-500/20 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Depósitos Pendentes</p>
              <p className="text-lg font-bold text-amber-500 dark:text-amber-400 font-mono">{fmtBrl(pendingAmt)}</p>
            </div>
            <span className="text-2xl font-bold text-amber-500/40">{(pendingDeps ?? []).length}</span>
          </div>
          <div className="bg-white dark:bg-navy-800 rounded-xl p-4 border border-amber-500/20 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Saques em Processamento</p>
              <p className="text-lg font-bold text-amber-500 dark:text-amber-400 font-mono">{fmtBrl(processingAmt)}</p>
            </div>
            <span className="text-2xl font-bold text-amber-500/40">{(processingWits ?? []).length}</span>
          </div>
        </div>
      </div>

      {/* ── Seção 4: Gráfico ── */}
      <div className="bg-white dark:bg-navy-800 rounded-xl p-6 border border-stone-200 dark:border-navy-700">
        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide mb-4">
          Fluxo Últimos 30 Dias
        </p>
        <div className="overflow-x-auto">
          <FlowChart data={chartData} />
        </div>
      </div>

      {/* ── Seção 5: Tabelas ── */}
      <div>
        <div className="flex gap-1 border-b border-stone-200 dark:border-navy-700 mb-4">
          {(['depositos', 'saques', 'transacoes'] as const).map(t => (
            <a key={t} href={url(1, t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t ? 'border-gold-500 text-gold-400' : 'border-transparent text-slate-400 hover:text-gold-400'
              }`}
            >
              {t === 'depositos' ? 'Depósitos' : t === 'saques' ? 'Saques' : 'Transações'}
            </a>
          ))}
        </div>

        {/* Depósitos */}
        {tab === 'depositos' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-stone-100 dark:border-navy-700">
                  <th className="pb-3 pr-4">Usuário</th>
                  <th className="pb-3 pr-4">Valor</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Criado</th>
                  <th className="pb-3">Confirmado</th>
                </tr>
              </thead>
              <tbody>
                {deposits.map((d: DepositRow) => (
                  <tr key={d.id} className="border-b border-stone-100 dark:border-navy-700/50 hover:bg-stone-50 dark:hover:bg-navy-800/40">
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">@{d.users?.username ?? d.users?.telegram_id ?? '—'}</td>
                    <td className="py-3 pr-4 font-mono font-medium text-emerald-400">{fmtBrl(d.amount)}</td>
                    <td className="py-3 pr-4"><Chip css={DEPOSIT_STATUS_CSS[d.status] ?? ''} label={DEPOSIT_STATUS_LABEL[d.status] ?? d.status} /></td>
                    <td className="py-3 pr-4 text-slate-400 text-xs">{fmtDate(d.created_at)}</td>
                    <td className="py-3 text-slate-400 text-xs">{d.confirmed_at ? fmtDate(d.confirmed_at) : '—'}</td>
                  </tr>
                ))}
                {deposits.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-500">Nenhum depósito.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Saques */}
        {tab === 'saques' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-stone-100 dark:border-navy-700">
                  <th className="pb-3 pr-4">Usuário</th>
                  <th className="pb-3 pr-4">Valor</th>
                  <th className="pb-3 pr-4">Chave PIX</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Data</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w: WithdrawalRow) => (
                  <tr key={w.id} className="border-b border-stone-100 dark:border-navy-700/50 hover:bg-stone-50 dark:hover:bg-navy-800/40">
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">@{w.users?.username ?? w.users?.telegram_id ?? '—'}</td>
                    <td className="py-3 pr-4 font-mono font-medium text-rose-400">{fmtBrl(w.amount)}</td>
                    <td className="py-3 pr-4 text-slate-400 font-mono text-xs">{w.pix_key} <span className="text-slate-600">({w.pix_key_type})</span></td>
                    <td className="py-3 pr-4"><Chip css={WITHDRAWAL_STATUS_CSS[w.status] ?? ''} label={WITHDRAWAL_STATUS_LABEL[w.status] ?? w.status} /></td>
                    <td className="py-3 text-slate-400 text-xs">{fmtDate(w.created_at)}</td>
                  </tr>
                ))}
                {withdrawals.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-500">Nenhum saque.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Transações */}
        {tab === 'transacoes' && (
          <div className="space-y-3">
            {/* Filtro por tipo */}
            <div className="flex gap-2 flex-wrap">
              {(['all', 'entry', 'prize', 'refund', 'deposit', 'withdraw'] as const).map(t => (
                <a key={t} href={url(1, 'transacoes', t)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-colors ${
                    txType === t
                      ? 'bg-gold-500/20 text-gold-400 border-gold-500/40'
                      : 'bg-stone-100 dark:bg-navy-700 text-slate-500 dark:text-slate-400 border-stone-200 dark:border-navy-600 hover:text-gold-600 dark:hover:text-gold-400'
                  }`}
                >
                  {t === 'all' ? 'Todas' : TX_TYPE_LABEL[t] ?? t}
                </a>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-stone-100 dark:border-navy-700">
                    <th className="pb-3 pr-4">Usuário</th>
                    <th className="pb-3 pr-4">Tipo</th>
                    <th className="pb-3 pr-4">Valor</th>
                    <th className="pb-3 pr-4">Saldo após</th>
                    <th className="pb-3 pr-4">Descrição</th>
                    <th className="pb-3">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx: TxRow) => (
                    <tr key={tx.id} className="border-b border-stone-100 dark:border-navy-700/50 hover:bg-stone-50 dark:hover:bg-navy-800/40">
                      <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">@{tx.users?.username ?? tx.users?.telegram_id ?? '—'}</td>
                      <td className="py-3 pr-4"><Chip css={TX_TYPE_CSS[tx.type] ?? ''} label={TX_TYPE_LABEL[tx.type] ?? tx.type} /></td>
                      <td className="py-3 pr-4 font-mono font-medium text-slate-200">{fmtBrl(tx.amount)}</td>
                      <td className="py-3 pr-4 font-mono text-slate-400 text-xs">{fmtBrl(tx.balance_after)}</td>
                      <td className="py-3 pr-4 text-slate-500 text-xs max-w-48 truncate">{tx.description ?? '—'}</td>
                      <td className="py-3 text-slate-400 text-xs">{fmtDate(tx.created_at)}</td>
                    </tr>
                  ))}
                  {transactions.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-slate-500">Nenhuma transação.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex gap-2 justify-center pt-4">
            {page > 1 && <a href={url(page - 1)} className="px-3 py-1 rounded bg-stone-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-navy-700 text-sm">← Anterior</a>}
            <span className="px-3 py-1 text-slate-400 text-sm">{page} / {totalPages}</span>
            {page < totalPages && <a href={url(page + 1)} className="px-3 py-1 rounded bg-stone-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-navy-700 text-sm">Próxima →</a>}
          </div>
        )}
      </div>
    </div>
  )
}
