import type { Db, PoolInsert } from '@realpalpitefc/database';
import type { SportsDataService } from '@realpalpitefc/sports-data';

const DAYS_AHEAD = 21;
const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 horas

// Pools globais criadas automaticamente para cada partida nova do ESPN
const DEFAULT_GLOBAL_POOLS: Omit<PoolInsert, 'match_id' | 'created_by'>[] = [
  { modality: 'dupla_chance_resultado', tier_brl: 10, type: 'global', status: 'open' },
  { modality: 'dupla_chance',           tier_brl: 10, type: 'global', status: 'open' },
  { modality: 'total_de_gols',          tier_brl: 10, type: 'global', status: 'open', goal_threshold: 2.5 },
  { modality: 'placar_exato',           tier_brl: 25, type: 'global', status: 'open' },
];

async function createDefaultPools(db: Db, matchId: string, createdBy: string): Promise<void> {
  for (const pool of DEFAULT_GLOBAL_POOLS) {
    await db.pools.create({ ...pool, match_id: matchId, created_by: createdBy });
  }
}

export async function syncMatches(db: Db, sportsData: SportsDataService): Promise<void> {
  const championships = await db.championships.findActive();
  const active = championships.filter(c => c.espn_code);

  if (active.length === 0) {
    console.log('[sync] Nenhum campeonato com espn_code cadastrado.');
    return;
  }

  // Usa o primeiro usuário como "criador de sistema" para pools globais
  const firstUser = await db.users.findFirst();
  const systemUserId = firstUser?.id;
  if (!systemUserId) {
    console.warn('[sync] Nenhum usuário no banco — pools não serão criadas automaticamente.');
  }

  for (const champ of active) {
    try {
      const matches = await sportsData.getUpcomingMatches({
        espnLeagueCode: champ.espn_code!,
        daysAhead: DAYS_AHEAD,
      });

      let inserted = 0;
      let updated = 0;

      for (const m of matches) {
        const { op, id: matchId } = await db.matches.upsertByEspnId({
          championship_id: champ.id,
          home_team: m.homeTeam,
          away_team: m.awayTeam,
          kickoff_at: m.kickoffAt.toISOString(),
          status: m.status,
          espn_match_id: m.providerId,
          result: m.score
            ? { homeScore: m.score.homeScore, awayScore: m.score.awayScore }
            : null,
          home_team_logo_url: m.homeTeamLogoUrl ?? null,
          away_team_logo_url: m.awayTeamLogoUrl ?? null,
        });

        if (op === 'inserted') {
          inserted++;
        } else {
          updated++;
        }

        // Cria pools globais se a partida ainda não tiver nenhuma
        if (systemUserId) {
          const existingPools = await db.pools.findOpenByMatch(matchId);
          if (existingPools.length === 0) {
            await createDefaultPools(db, matchId, systemUserId).catch(err =>
              console.error(`[sync] Erro ao criar pools para partida ${matchId}:`, err),
            );
          }
        }
      }

      console.log(`[sync] ${champ.name}: ${inserted} novas, ${updated} atualizadas`);

      // Persiste logo do campeonato na primeira vez que aparece
      if (!champ.logo_url) {
        const logoUrl = await sportsData.getChampionshipLogoUrl(champ.espn_code!).catch(() => null);
        if (logoUrl) {
          await db.championships.updateLogoUrl(champ.id, logoUrl).catch(() => null);
        }
      }
    } catch (err) {
      console.error(`[sync] Erro ao sincronizar ${champ.name}:`, err);
    }
  }
}

export function startMatchSyncCron(db: Db, sportsData: SportsDataService): void {
  syncMatches(db, sportsData).catch(err =>
    console.error('[sync] Falha na sincronização inicial:', err),
  );

  setInterval(() => {
    syncMatches(db, sportsData).catch(err =>
      console.error('[sync] Falha na sincronização periódica:', err),
    );
  }, SYNC_INTERVAL_MS);
}
