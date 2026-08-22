import type { Telegraf } from 'telegraf';
import type { BotContext } from '../context';
import type { Db, PoolInsert, PoolRow } from '@realpalpitefc/database';
import type { SportsDataService } from '@realpalpitefc/sports-data';
import { notifyGroupsPoolsOpened } from './group-notifications.service';
import { getGhostSettings, randomGhostCount, type GhostSettings } from './ghost.service';

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
  ghost?: GhostSettings,
): Promise<void> {
  const existingKeys = new Set(existing.map(p => `${p.modality}:${p.tier_brl}`));
  const missing = GLOBAL_POOLS_CONFIG.filter(p => !existingKeys.has(`${p.modality}:${p.tier_brl}`));
  for (const poolConfig of missing) {
    const pool = await db.pools.create({ ...poolConfig, match_id: matchId, created_by: null });
    if (ghost?.enabled && Math.random() * 100 < ghost.fillRate) {
      const count = randomGhostCount(ghost.maxInitial);
      await db.pools.updateGhostCount(pool.id, count).catch(() => null);
    }
  }

  // Aplica ghost count em pools existentes que não têm nenhum ainda
  if (ghost?.enabled) {
    for (const pool of existing) {
      if ((pool.ghost_count ?? 0) === 0) {
        const count = randomGhostCount(ghost.maxInitial);
        await db.pools.updateGhostCount(pool.id, count).catch(() => null);
      }
    }
  }
}

export async function syncMatches(
  db: Db,
  sportsData: SportsDataService,
  bot?: Telegraf<BotContext>,
  botUsername?: string,
): Promise<{ inserted: number; updated: number; errors: string[] }> {
  const championships = await db.championships.findActive();
  const active = championships.filter(c => c.espn_code);

  if (active.length === 0) {
    console.log('[sync] Nenhum campeonato com espn_code cadastrado.');
    return { inserted: 0, updated: 0, errors: [] };
  }

  let totalInserted = 0;
  let totalUpdated = 0;
  const errors: string[] = [];

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

        if (m.status === 'scheduled' || m.status === 'in_progress') {
          const existingPools = await db.pools.findOpenByMatch(matchId);
          const ghost = await getGhostSettings(db.client).catch(() => undefined);
          await createMissingPools(db, matchId, existingPools, ghost).catch((err: unknown) =>
            console.error(`[sync] Erro ao criar pools para partida ${matchId}:`, err),
          );
        }
      }

      totalInserted += inserted;
      totalUpdated += updated;
      console.log(`[sync] ${champ.name}: ${inserted} novas, ${updated} atualizadas`);

      if (!champ.logo_url) {
        const logoUrl = await sportsData.getChampionshipLogoUrl(champ.espn_code!).catch(() => null);
        if (logoUrl) {
          await db.championships.updateLogoUrl(champ.id, logoUrl).catch(() => null);
        }
      }
    } catch (err) {
      console.error(`[sync] Erro ao sincronizar ${champ.name}:`, err);
      errors.push(`${champ.name}: ${String(err)}`);
    }
  }

  if (bot && botUsername) {
    await notifyGroupsPoolsOpened(db, bot, botUsername).catch(err =>
      console.error('[sync] Falha ao notificar grupos sobre bolões abertos:', err),
    );
  }

  return { inserted: totalInserted, updated: totalUpdated, errors };
}

export function startMatchSyncCron(
  db: Db,
  sportsData: SportsDataService,
  bot?: Telegraf<BotContext>,
  botUsername?: string,
): void {
  syncMatches(db, sportsData, bot, botUsername).catch(err =>
    console.error('[sync] Falha na sincronização inicial:', err),
  );

  setInterval(() => {
    syncMatches(db, sportsData, bot, botUsername).catch(err =>
      console.error('[sync] Falha na sincronização periódica:', err),
    );
  }, SYNC_INTERVAL_MS);
}
