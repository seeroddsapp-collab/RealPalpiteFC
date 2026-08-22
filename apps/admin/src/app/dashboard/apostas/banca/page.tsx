/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase-admin'
import { BancaForm } from '@/components/apostas/banca-form'
import { deleteMovement } from '@/actions/apostas'

function fmtArs(n: number) {
  const abs = Math.abs(n)
  const s = abs.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${n < 0 ? '-' : ''}$ ${s}`
}
function fmtDatetime(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
}

type Movement = { id: string; type: string; amount: number; notes: string | null; created_at: string }


export default async function BancaPage() {
  const db = createAdminClient()
  const [{ data: movs }, { data: bets }, { data: pendingBets }] = await Promise.all([
    db.from('personal_bankroll').select('*').order('created_at', { ascending: false }) as any,
    db.from('personal_bets').select('status, amount, payout').neq('status', 'pending').neq('status', 'void') as any,
    db.from('personal_bets').select('amount').eq('status', 'pending') as any,
  ])

  const movements: Movement[] = movs ?? []
  const settledBets = bets ?? []
  const pendingLocked: number = (pendingBets ?? []).reduce((s: number, b: any) => s + b.amount, 0)

  const totalDep = movements.filter((m: Movement) => m.type === 'deposit').reduce((s: number, m: Movement) => s + m.amount, 0)
  const totalWit = movements.filter((m: Movement) => m.type === 'withdrawal').reduce((s: number, m: Movement) => s + m.amount, 0)
  const netProfit = settledBets.reduce((acc: number, b: any) => {
    if (b.status === 'won') return acc + (b.payout ?? 0) - b.amount
    return acc - b.amount
  }, 0)
  const saldo = totalDep - totalWit + netProfit - pendingLocked

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/apostas" className="text-slate-400 hover:text-gold-400 transition-colors text-sm">← Voltar</Link>
        <h1 className="text-2xl font-bold text-gold-400">Banca</h1>
      </div>

      {/* Resumo */}
      <div className={`rounded-2xl p-5 border-2 ${saldo >= 0 ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-rose-500/5 border-rose-500/30'}`}>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Saldo Estimado na Banca</p>
        <p className={`text-4xl font-bold font-mono ${saldo >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmtArs(saldo)}</p>
        <div className="mt-3 space-y-1 text-xs font-mono text-slate-400">
          <div className="flex justify-between gap-4">
            <span>Total depositado</span>
            <span className="text-emerald-400">+{fmtArs(totalDep)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Total retirado</span>
            <span className="text-rose-400">-{fmtArs(totalWit)}</span>
          </div>
          <div className="flex justify-between gap-4 border-t border-slate-700 pt-1">
            <span>Lucro / Perda apostas</span>
            <span className={netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {netProfit >= 0 ? '+' : ''}{fmtArs(netProfit)}
            </span>
          </div>
          {pendingLocked > 0 && (
            <div className="flex justify-between gap-4 border-t border-slate-700 pt-1">
              <span className="text-amber-400">Bloqueado (pendentes)</span>
              <span className="text-amber-400">-{fmtArs(pendingLocked)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Formulário */}
      <BancaForm />

      {/* Histórico de movimentos */}
      <div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Movimentos</p>

        {movements.length === 0 ? (
          <p className="text-center py-8 text-slate-500 text-sm bg-white dark:bg-navy-800 rounded-2xl border border-stone-200 dark:border-navy-700">
            Nenhum movimento registrado.
          </p>
        ) : (
          <div className="space-y-2">
            {movements.map((m: Movement) => (
              <div key={m.id} className="flex items-center gap-3 bg-white dark:bg-navy-800 rounded-xl border border-stone-200 dark:border-navy-700 px-4 py-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm ${
                  m.type === 'deposit'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-rose-500/10 text-rose-400'
                }`}>
                  {m.type === 'deposit' ? '↓' : '↑'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {m.type === 'deposit' ? 'Depósito' : 'Retirada'}
                  </p>
                  {m.notes && <p className="text-xs text-slate-400 truncate">{m.notes}</p>}
                  <p className="text-xs text-slate-500">{fmtDatetime(m.created_at)}</p>
                </div>
                <p className={`font-bold font-mono text-sm shrink-0 ${m.type === 'deposit' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {m.type === 'deposit' ? '+' : '-'}{fmtArs(m.amount)}
                </p>
                <form action={deleteMovement.bind(null, m.id)}>
                  <button type="submit" className="text-slate-600 hover:text-rose-400 text-sm transition-colors" title="Excluir">🗑</button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
