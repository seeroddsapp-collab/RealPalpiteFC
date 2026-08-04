'use server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase-admin'
import { createSupabaseServer } from '@/lib/supabase-server'
import { EspnAdapter } from '@realpalpitefc/sports-data'

const DAYS_AHEAD = 21
const GLOBAL_POOLS = [
  { modality: 'dupla_chance_resultado', tier_brl: 5 },
  { modality: 'dupla_chance_resultado', tier_brl: 10 },
  { modality: 'dupla_chance_resultado', tier_brl: 25 },
  { modality: 'dupla_chance',           tier_brl: 5 },
  { modality: 'dupla_chance',           tier_brl: 10 },
  { modality: 'dupla_chance',           tier_brl: 25 },
  { modality: 'total_de_gols',          tier_brl: 5 },
  { modality: 'total_de_gols',          tier_brl: 10 },
  { modality: 'total_de_gols',          tier_brl: 25 },
  { modality: 'total_de_gols',          tier_brl: 50 },
  { modality: 'placar_exato',           tier_brl: 10 },
  { modality: 'placar_exato',           tier_brl: 25 },
  { modality: 'placar_exato',           tier_brl: 50 },
] as const

export async function triggerSync(): Promise<{ inserted: number; updated: number; error?: string }> {
  const db = createAdminClient()
  const espn = new EspnAdapter()

  const { data: champs } = await db.from('championships').select('*').eq('is_active', true)
  const active = (champs ?? []).filter(c => c.espn_code)

  if (active.length === 0) return { inserted: 0, updated: 0, error: 'Nenhum campeonato ativo com espn_code.' }

  let inserted = 0
  let updated = 0

  for (const champ of active) {
    try {
      const matches = await espn.getUpcomingMatches(champ.espn_code!, DAYS_AHEAD)

      for (const m of matches) {
        const { data: existing } = await db
          .from('matches')
          .select('id')
          .eq('espn_match_id', m.providerId)
          .maybeSingle()

        if (existing) {
          await db.from('matches').update({
            home_team: m.homeTeam,
            away_team: m.awayTeam,
            kickoff_at: m.kickoffAt.toISOString(),
            status: m.status,
            result: m.score ? { homeScore: m.score.homeScore, awayScore: m.score.awayScore } : null,
            home_team_logo_url: m.homeTeamLogoUrl ?? null,
            away_team_logo_url: m.awayTeamLogoUrl ?? null,
          }).eq('id', existing.id)
          updated++

          if (m.status === 'scheduled' || m.status === 'in_progress') {
            const { data: openPools } = await db.from('pools').select('modality,tier_brl').eq('match_id', existing.id).eq('status', 'open')
            const existingKeys = new Set((openPools ?? []).map(p => `${p.modality}:${p.tier_brl}`))
            for (const pool of GLOBAL_POOLS) {
              if (!existingKeys.has(`${pool.modality}:${pool.tier_brl}`)) {
                await db.from('pools').insert({ ...pool, match_id: existing.id, type: 'global', status: 'open', created_by: null })
              }
            }
          }
        } else {
          const { data: newMatch } = await db.from('matches').insert({
            championship_id: champ.id,
            home_team: m.homeTeam,
            away_team: m.awayTeam,
            kickoff_at: m.kickoffAt.toISOString(),
            status: m.status,
            espn_match_id: m.providerId,
            result: m.score ? { homeScore: m.score.homeScore, awayScore: m.score.awayScore } : null,
            home_team_logo_url: m.homeTeamLogoUrl ?? null,
            away_team_logo_url: m.awayTeamLogoUrl ?? null,
          }).select('id').single()

          if (newMatch && (m.status === 'scheduled' || m.status === 'in_progress')) {
            for (const pool of GLOBAL_POOLS) {
              await db.from('pools').insert({ ...pool, match_id: newMatch.id, type: 'global', status: 'open', created_by: null })
            }
          }
          inserted++
        }
      }
    } catch (err) {
      console.error(`[sync] Erro ao sincronizar ${champ.name}:`, err)
      return { inserted, updated, error: `Erro em ${champ.name}: ${String(err)}` }
    }
  }

  revalidatePath('/dashboard/campeonatos')
  revalidatePath('/dashboard/partidas')
  return { inserted, updated }
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
