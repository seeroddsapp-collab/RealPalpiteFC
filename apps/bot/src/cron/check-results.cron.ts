import type { Telegraf } from 'telegraf';
import type { BotContext } from '../context';
import type { Db, MatchRow } from '@realpalpitefc/database';
import type { SportsDataService } from '@realpalpitefc/sports-data';
import { resolvePool } from '../services/resolution.service';
import { notifyGroupsBatchResults, type MatchGroupSummary } from '../services/group-notifications.service';
import { fmtBrl, fmtModality } from '../formatters/messages';

const INTERVAL_MS = 2 * 60_000;

function buildUserDm(
  match: { home_team: string; away_team: string },
  score: { homeScore: number; awayScore: number },
  results: Array<{ modality: Parameters<typeof fmtModality>[0]; tier: number; creditType: 'prize' | 'refund'; amount: number; newBalance: number }>,
): string {
  let msg = `⚽ *${match.home_team} ${score.homeScore} x ${score.awayScore} ${match.away_team}*\n\n`;
  msg += `Seus resultados:\n`;

  for (const r of results) {
    const label = fmtModality(r.modality);
    if (r.creditType === 'prize') {
      msg += `✅ ${label} (${fmtBrl(r.tier)}) → Ganhou *${fmtBrl(r.amount)}*\n`;
    } else {
      msg += `↩️ ${label} (${fmtBrl(r.tier)}) → Devolvido *${fmtBrl(r.amount)}*\n`;
    }
  }

  const lastBalance = results[results.length - 1].newBalance;
  msg += `\n💰 Saldo: *${fmtBrl(lastBalance)}*`;
  return msg;
}

async function processMatch(
  db: Db,
  sportsData: SportsDataService,
  match: MatchRow & { championships?: { espn_code: string | null; football_data_code: number | null } },
  bot: Telegraf<BotContext>,
): Promise<MatchGroupSummary | null> {
  const champData = match.championships;

  const providerMatch = await sportsData.getMatch({
    espnMatchId: match.espn_match_id ?? undefined,
    espnLeagueCode: champData?.espn_code ?? undefined,
    footballDataMatchId: match.football_data_match_id
      ? Number(match.football_data_match_id)
      : undefined,
  });

  if (!providerMatch) return null;

  const newStatus = providerMatch.status;
  const cancelled = newStatus === 'cancelled' || newStatus === 'postponed';

  if (newStatus !== match.status) {
    const result = providerMatch.score
      ? { homeScore: providerMatch.score.homeScore, awayScore: providerMatch.score.awayScore }
      : null;
    await db.matches.updateStatus(match.id, newStatus, result ?? undefined);
    console.log(`[check-results] Partida ${match.id}: ${match.status} → ${newStatus}`);
  }

  if (newStatus !== 'finished' && !cancelled) return null;

  const closedPools = await db.pools.findClosed();
  let poolsForMatch = closedPools.filter(p => p.match_id === match.id);

  if (cancelled) {
    const openPools = await db.pools.findOpenByMatch(match.id);
    const openNotYetListed = openPools.filter(op => !poolsForMatch.some(cp => cp.id === op.id));
    poolsForMatch = [...poolsForMatch, ...openNotYetListed];
  }

  if (poolsForMatch.length === 0) return null;

  const matchResult = providerMatch.score
    ? { homeScore: providerMatch.score.homeScore, awayScore: providerMatch.score.awayScore }
    : { homeScore: 0, awayScore: 0 };

  // Acumula resultados de todas as pools
  type UserEntry = { modality: Parameters<typeof fmtModality>[0]; tier: number; creditType: 'prize' | 'refund'; amount: number; newBalance: number };
  const byUser = new Map<number, UserEntry[]>();
  let groupScenario: string | null = null;
  let groupTotalWinners = 0;
  let groupTotalPrize = 0;

  for (const pool of poolsForMatch) {
    const result = await resolvePool(db, pool, matchResult, cancelled);

    // Agrega dados para notificação de grupo
    if (result.scenario !== 'already_done' && result.scenario !== 'no_entries') {
      if (!groupScenario) groupScenario = result.scenario;
      groupTotalWinners += result.totalWinners;
      groupTotalPrize += result.totalPrizeBrl;
    }

    // Coleta resultados por usuário para DM consolidado
    for (const r of result.userResults) {
      if (!byUser.has(r.telegramId)) byUser.set(r.telegramId, []);
      byUser.get(r.telegramId)!.push({
        modality: r.modality,
        tier: r.tier,
        creditType: r.creditType,
        amount: r.amount,
        newBalance: r.newBalance,
      });
    }

    console.log(`[check-results] Pool ${pool.id} — cenário: ${result.scenario}`);
  }

  // Envia UM DM por usuário com todos os resultados da partida
  for (const [telegramId, entries] of byUser) {
    const msg = buildUserDm(match, matchResult, entries);
    await bot.telegram
      .sendMessage(telegramId, msg, { parse_mode: 'Markdown' })
      .catch(err => console.warn(`[check-results] Falha ao notificar ${telegramId}:`, err));
  }

  if (!groupScenario) return null;

  return {
    homeTeam: match.home_team,
    awayTeam: match.away_team,
    homeScore: matchResult.homeScore,
    awayScore: matchResult.awayScore,
    scenario: groupScenario,
    totalWinners: groupTotalWinners,
    totalPrizeBrl: groupTotalPrize,
  };
}

export function startCheckResultsCron(
  db: Db,
  sportsData: SportsDataService,
  bot: Telegraf<BotContext>,
  botUsername: string,
): NodeJS.Timer {
  const run = async () => {
    try {
      const inProgress = await db.matches.findInProgress();
      const scheduledSoon = await db.matches.findScheduledSoon(180);

      const all = [...inProgress];
      for (const m of scheduledSoon) {
        if (!all.some(x => x.id === m.id)) all.push(m);
      }

      const groupBatch: MatchGroupSummary[] = [];

      for (const match of all) {
        const champ = await db.championships.findById(match.championship_id);
        const matchWithChamp = {
          ...match,
          championships: champ
            ? { espn_code: champ.espn_code, football_data_code: champ.football_data_code }
            : undefined,
        };
        const summary = await processMatch(db, sportsData, matchWithChamp, bot);
        if (summary) groupBatch.push(summary);
      }

      // Uma única mensagem para os grupos com todos os resultados do ciclo
      if (groupBatch.length > 0) {
        await notifyGroupsBatchResults(db, bot, botUsername, groupBatch)
          .catch(err => console.warn('[check-results] Falha ao notificar grupos:', err));
      }
    } catch (err) {
      console.error('[check-results] Erro no cron:', err);
    }
  };

  void run();
  return setInterval(run, INTERVAL_MS);
}
