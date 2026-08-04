'use server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase-admin'
import { createSupabaseServer } from '@/lib/supabase-server'

export async function triggerSync(): Promise<{ inserted: number; updated: number; error?: string }> {
  const botUrl = process.env.BOT_URL
  const syncSecret = process.env.BOT_SYNC_SECRET

  if (!botUrl || !syncSecret) {
    return { inserted: 0, updated: 0, error: 'BOT_URL ou BOT_SYNC_SECRET não configurados no Vercel.' }
  }

  const res = await fetch(`${botUrl}/api/sync`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${syncSecret}` },
    // aguarda até 60s — sync pode demorar
    signal: AbortSignal.timeout(60_000),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.status.toString())
    return { inserted: 0, updated: 0, error: `Bot respondeu ${res.status}: ${text}` }
  }

  const data = await res.json() as { inserted: number; updated: number; errors: string[] }

  revalidatePath('/dashboard/campeonatos')
  revalidatePath('/dashboard/partidas')

  return {
    inserted: data.inserted,
    updated: data.updated,
    error: data.errors?.length > 0 ? data.errors.join(' | ') : undefined,
  }
}

export async function toggleUserBlocked(userId: string, isBlocked: boolean) {
  const db = createAdminClient()
  await db.from('users').update({ is_blocked: isBlocked }).eq('id', userId)
  revalidatePath('/dashboard/usuarios')
}

export async function toggleChampionshipActive(champId: string, isActive: boolean) {
  const db = createAdminClient()
  await db.from('championships').update({ is_active: isActive }).eq('id', champId)
  revalidatePath('/dashboard/campeonatos')
}

export async function updateChampionshipCodes(
  champId: string,
  data: { espn_code: string | null; football_data_code: string | null },
) {
  const db = createAdminClient()
  await db.from('championships').update(data).eq('id', champId)
  revalidatePath('/dashboard/campeonatos')
}

export async function overrideResult(
  poolId: string,
  matchId: string,
  newResult: { homeScore: number; awayScore: number },
  reason: string,
) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const db = createAdminClient()

  const { data: match } = await db
    .from('matches')
    .select('result')
    .eq('id', matchId)
    .single()

  await db.from('audit_log').insert({
    admin_id: user.id,
    pool_id: poolId,
    previous_result: match?.result ?? null,
    new_result: newResult,
    reason,
  })

  await db.from('matches')
    .update({ result: newResult })
    .eq('id', matchId)

  revalidatePath(`/dashboard/resultado/${poolId}`)
  revalidatePath('/dashboard/pools')
}
