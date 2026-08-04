import type { Telegraf } from 'telegraf';
import type { BotContext } from '../context';
import type { Db } from '@realpalpitefc/database';
import type { SportsDataService } from '@realpalpitefc/sports-data';
import type { MatchRow } from '@realpalpitefc/database';
import { resolvePool } from '../services/resolution.service';

const INTERVAL_MS = 2 * 60_000; // a cada 2 minutos

async function processMatch(
  db: Db,
  sportsData: SportsDataService,
  match: MatchRow & { championships?: { espn_code: string | null; football_data_code: number | null } },
  bot: Telegraf<BotContext>,
): Promise<void> {
  const champData = match.championships;

  const providerMatch = await sportsData.getMatch({
    espnMatchId: match.espn_match_id ?? undefined,
    espnLeagueCode: champData?.espn_code ?? undefined,
    footballDataMatchId: match.football_data_match_id
      ? Number(match.football_data_match_id)
      : undefined,
  });

  if (!providerMatch) return;

  const newStatus = providerMatch.status;
  const cancelled = newStatus === 'cancelled' || newStatus === 'postponed';

  // Atualiza status no banco se mudou
  if (newStatus !== match.status) {
    const result = providerMatch.score
      ? { homeScore: providerMatch.score.homeScore, awayScore: providerMatch.score.awayScore }
      : null;

    await db.matches.updateStatus(match.id, newStatus, result ?? undefined);
    console.log(`[check-results] Partida ${match.id}: ${match.status} → ${newStatus}`);
  }

  // Resolve pools quando a partida termina ou é cancelada/adiada
  if (newStatus === 'finished' || cancelled) {
    const closedPools = await db.pools.findClosed();
    let poolsForMatch = closedPools.filter(p => p.match_id === match.id);

    // Partida cancelada/adiada: também processar pools ainda abertas
    // (ex: adiamento detectado antes das pools fecharem 5 min antes do kickoff)
    if (cancelled) {
      const openPools = await db.pools.findOpenByMatch(match.id);
      const openNotYetListed = openPools.filter(op => !poolsForMatch.some(cp => cp.id === op.id));
      poolsForMatch = [...poolsForMatch, ...openNotYetListed];
    }

    for (const pool of poolsForMatch) {
      const matchResult = providerMatch.score
        ? { homeScore: providerMatch.score.homeScore, awayScore: providerMatch.score.awayScore }
        : { homeScore: 0, awayScore: 0 };

      const result = await resolvePool(db, pool, matchResult, cancelled);

      // Envia notificações push para cada usuário
      for (const notif of result.notifications) {
        await bot.telegram
          .sendMessage(notif.telegramId, notif.message, { parse_mode: 'Markdown' })
          .catch(err => console.warn(`[check-results] Falha ao notificar ${notif.telegramId}:`, err));
      }

      console.log(`[check-results] Pool ${pool.id} resolvida — cenário: ${result.scenario}`);
    }
  }
}

export function startCheckResultsCron(
  db: Db,
  sportsData: SportsDataService,
  bot: Telegraf<BotContext>,
): NodeJS.Timer {
  const run = async () => {
    try {
      // Busca partidas em andamento + agendadas prestes a começar (próximas 3h)
      const inProgress = await db.matches.findInProgress();
      const scheduledSoon = await db.matches.findScheduledSoon(180); // próximas 3h

      // Junta e deduplica
      const all = [...inProgress];
      for (const m of scheduledSoon) {
        if (!all.some(x => x.id === m.id)) all.push(m);
      }

      for (const match of all) {
        // Busca o campeonato para obter espn_code
        const champ = await db.championships.findById(match.championship_id);
        const matchWithChamp = { ...match, championships: champ ?? undefined };
        await processMatch(db, sportsData, matchWithChamp as never, bot);
      }
    } catch (err) {
      console.error('[check-results] Erro no cron:', err);
    }
  };

  void run();
  return setInterval(run, INTERVAL_MS);
}
