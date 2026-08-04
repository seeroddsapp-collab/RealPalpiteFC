import type { Db, PoolInsert, PoolRow } from '@realpalpitefc/database';
import type { SportsDataService } from '@realpalpitefc/sports-data';

const DAYS_AHEAD = 21;
const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 horas

// Pools globais criadas automaticamente para cada partida
const GLOBAL_POOLS_CONFIG: Omit<PoolInsert, 'match_id' | 'created_by'>[] = [
  // Resultado 1X2: R$5, R$10, R$25
  { modality: 'dupla_chance_resultado', tier_brl: 5,  type: 'global', status: 'open' },
  { modality: 'dupla_chance_resultado', tier_brl: 10, type: 'global', status: 'open' },
  { modality: 'dupla_chance_resultado', tier_brl: 25, type: 'global', status: 'open' },
  // Dupla Chance: R$5, R$10, R$25
  { modality: 'dupla_chance',           tier_brl: 5,  type: 'global', status: 'open' },
  { modality: 'dupla_chance',           tier_brl: 10, type: 'global', status: 'open' },
  { modality: 'dupla_chance',           tier_brl: 25, type: 'global', status: 'open' },
  // Total de Gols: R$5, R$10, R$25, R$50
  { modality: 'total_de_gols',          tier_brl: 5,  type: 'global', status: 'open' },
  { modality: 'total_de_gols',          tier_brl: 10, type: 'global', status: 'open' },
  { modality: 'total_de_gols',          tier_brl: 25, type: 'global', status: 'open' },
  { modality: 'total_de_gols',          tier_brl: 50, type: 'global', status: 'open' },
  // Placar Exato: R$10, R$25, R$50
  { modality: 'placar_exato',           tier_brl: 10, type: 'global', status: 'open' },
  { modality: 'placar_exato',           tier_brl: 25, type: 'global', status: 'open' },
  { modality: 'placar_exato',           tier_brl: 50, type: 'global', status: 'open' },
];

async function createMissingPools(
  db: Db,
  matchId: string,
  existing: PoolRow[],
): Promise<void> {
  const existingKeys = new Set(existing.map(p => `${p.modality}:${p.tier_brl}`));
  const missing = GLOBAL_POOLS_CONFIG.filter(p => !existingKeys.has(`${p.modality}:${p.tier_brl}`));
  for (const pool of missing) {
    await db.pools.create({ ...pool, match_id: matchId, created_by: null });
  }
}

export async function syncMatches(db: Db, sportsData: SportsDataService): Promise<void> {
  const championships = await db.championships.findActive();
  const active = championships.filter(c => c.espn_code);

  if (active.length === 0) {
    console.log('[sync] Nenhum campeonato com espn_code cadastrado.');
    return;
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

        // Cria pools globais faltantes para a partida (apenas se estiver agendada)
        if (m.status === 'scheduled' || m.status === 'in_progress') {
          const existingPools = await db.pools.findOpenByMatch(matchId);
          await createMissingPools(db, matchId, existingPools).catch((err: unknown) =>
            console.error(`[sync] Erro ao criar pools para partida ${matchId}:`, err),
          );
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
