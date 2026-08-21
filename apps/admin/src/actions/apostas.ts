'use server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase-admin'

export async function createBet(data: {
  bet_date: string
  amount: number
  odd: number
  category: string
  notes: string
}) {
  const db = createAdminClient()
  const { error } = await db.from('personal_bets').insert({
    bet_date: data.bet_date,
    amount: data.amount,
    odd: data.odd,
    category: data.category,
    status: 'pending',
    notes: data.notes || null,
  })
  if (error) throw error
  revalidatePath('/dashboard/apostas')
}

export async function finalizeBet(id: string, status: 'won' | 'lost' | 'void', payout: number | null) {
  const db = createAdminClient()
  const { error } = await db.from('personal_bets').update({ status, payout }).eq('id', id)
  if (error) throw error
  revalidatePath('/dashboard/apostas')
  revalidatePath('/dashboard/apostas/historico')
}

export async function deleteBet(id: string) {
  const db = createAdminClient()
  await db.from('personal_bets').delete().eq('id', id)
  revalidatePath('/dashboard/apostas')
  revalidatePath('/dashboard/apostas/historico')
}

export async function createBankrollMovement(type: 'deposit' | 'withdrawal', amount: number, notes: string) {
  const db = createAdminClient()
  await db.from('personal_bankroll').insert({ type, amount, notes: notes || null })
  revalidatePath('/dashboard/apostas')
  revalidatePath('/dashboard/apostas/banca')
}

export async function deleteMovement(id: string) {
  const db = createAdminClient()
  await db.from('personal_bankroll').delete().eq('id', id)
  revalidatePath('/dashboard/apostas')
  revalidatePath('/dashboard/apostas/banca')
}
