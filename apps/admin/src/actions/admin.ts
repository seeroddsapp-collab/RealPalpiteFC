'use server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase-admin'
import { createSupabaseServer } from '@/lib/supabase-server'
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

async function fetchEspnMatches(leagueCode: string, daysAhead: number) {
  const now = new Date()
  const end = new Date(now)
  end.setDate(end.getDate() + daysAhead)
  const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '')
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueCode}/scoreboard?dates=${fmt(now)}-${fmt(end)}&limit=100`
  const res = await fetch(url, { headers: { 'User-Agent': 'RealPalpiteFC/1.0' } })
  if (!res.ok) throw new Error(`ESPN HTTP ${res.status}`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await res.json() as Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data['events'] ?? []) as Record<string, any>[]).map((event) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const comp = (event['competitions'] as Record<string, any>[] | undefined)?.[0]
    if (!comp) return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const competitors = comp['competitors'] as Record<string, any>[] | undefined
    const home = competitors?.find(c => c['homeAway'] === 'home')
    const away = competitors?.find(c => c['homeAway'] === 'away')
    if (!home || !away) return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sn = (comp['status'] as Record<string, any>)?.['type']?.['name'] as string ?? ''
    const status =
      ['STATUS_FINAL', 'STATUS_FULL_TIME'].includes(sn) ? 'finished' :
      ['STATUS_IN_PROGRESS', 'STATUS_HALFTIME', 'STATUS_END_PERIOD'].includes(sn) ? 'in_progress' :
      sn === 'STATUS_POSTPONED' ? 'postponed' :
      ['STATUS_CANCELED', 'STATUS_CANCELLED', 'STATUS_SUSPENDED'].includes(sn) ? 'cancelled' : 'scheduled'
    const hs = home['score'] !== undefined ? parseInt(home['score'] as string, 10) : undefined
    const as_ = away['score'] !== undefined ? parseInt(away['score'] as string, 10) : undefined
    return {
      providerId: event['id'] as string,
      homeTeam: (home['team'] as Record<string, string>)['displayName'],
      awayTeam: (away['team'] as Record<string, string>)['displayName'],
      kickoffAt: new Date(event['date'] as string),
      status,
      score: hs !== undefined && as_ !== undefined && !isNaN(hs) && !isNaN(as_) ? { homeScore: hs, awayScore: as_ } : undefined,
      homeTeamLogoUrl: ((home['team'] as Record<string, string>)['logo']) ?? null,
      awayTeamLogoUrl: ((away['team'] as Record<string, string>)['logo']) ?? null,
    }
  }).filter((m): m is NonNullable<typeof m> => m !== null)
}

export async function triggerSync(): Promise<{ inserted: number; updated: number; error?: string }> {
  const db = createAdminClient()

  const { data: champs } = await db.from('championships').select('*').eq('is_active', true)
  const active = (champs ?? []).filter(c => c.espn_code)

  if (active.length === 0) return { inserted: 0, updated: 0, error: 'Nenhum campeonato ativo com espn_code.' }

  let inserted = 0
  let updated = 0

  for (const champ of active) {
    try {
      const matches = await fetchEspnMatches(champ.espn_code!, DAYS_AHEAD)

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
