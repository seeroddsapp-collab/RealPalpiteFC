import type { Telegraf } from 'telegraf';
import type { BotContext } from '../context';
import type { Db } from '@realpalpitefc/database';
import { fmtBrl } from '../formatters/messages';

export type MatchGroupSummary = {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  scenario: string;
  totalWinners: number;
  totalPrizeBrl: number;
};

async function getActiveGroupIds(db: Db): Promise<number[]> {
  const { data } = await db.client
    .from('telegram_groups')
    .select('chat_id')
    .eq('is_active', true);
  return (data ?? []).map((r: { chat_id: number }) => Number(r.chat_id));
}

function fmtKickoff(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export async function notifyGroupsPoolsOpened(
  db: Db,
  bot: Telegraf<BotContext>,
  botUsername: string,
): Promise<void> {
  const now = new Date().toISOString();
  const next48h = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const { data: matches } = await db.client
    .from('matches')
    .select('id, home_team, away_team, kickoff_at')
    .eq('status', 'scheduled')
    .eq('groups_notified', false)
    .gte('kickoff_at', now)
    .lte('kickoff_at', next48h);

  if (!matches || matches.length === 0) return;

  const groupIds = await getActiveGroupIds(db);
  if (groupIds.length === 0) return;

  for (const match of matches) {
    const msg =
      `⚽ *Bolão aberto!*\n\n` +
      `*${match.home_team} x ${match.away_team}*\n` +
      `🗓 ${fmtKickoff(match.kickoff_at)}\n\n` +
      `Faça seu palpite agora em @${botUsername}!`;

    for (const chatId of groupIds) {
      await bot.telegram
        .sendMessage(chatId, msg, { parse_mode: 'Markdown' })
        .catch(err => console.warn(`[groups] Falha ao notificar grupo ${chatId}:`, err));
    }

    await db.client
      .from('matches')
      .update({ groups_notified: true })
      .eq('id', match.id);
  }
}

export async function notifyGroupsBatchResults(
  db: Db,
  bot: Telegraf<BotContext>,
  botUsername: string,
  summaries: MatchGroupSummary[],
): Promise<void> {
  const groupIds = await getActiveGroupIds(db);
  if (groupIds.length === 0) return;

  const lines = summaries.map(m => {
    const score = `${m.homeScore} x ${m.awayScore}`;
    if (m.scenario === 'with_winners') {
      const plural = m.totalWinners > 1 ? 's' : '';
      return (
        `⚽ *${m.homeTeam} ${score} ${m.awayTeam}*\n` +
        `🥇 ${m.totalWinners} premiado${plural} · *${fmtBrl(m.totalPrizeBrl)}* distribuídos`
      );
    }
    return (
      `⚽ *${m.homeTeam} ${score} ${m.awayTeam}*\n` +
      `📋 Sem acertadores · palpites devolvidos`
    );
  });

  const title = summaries.length === 1 ? `🏆 *Resultado do Bolão*` : `🏆 *Resultados dos Bolões*`;
  const msg = `${title}\n\n${lines.join('\n\n')}\n\n👉 [Ver seus resultados](https://t.me/${botUsername})`;

  for (const chatId of groupIds) {
    await bot.telegram
      .sendMessage(chatId, msg, { parse_mode: 'Markdown' })
      .catch(err => console.warn(`[groups] Falha ao notificar resultado grupo ${chatId}:`, err));
  }
}

export async function handleGroupBoloes(ctx: any, db: Db, botUsername: string): Promise<void> {
  try {
    const now = new Date().toISOString();
    const next48h = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const { data: matches } = await db.client
      .from('matches')
      .select('home_team, away_team, kickoff_at, championships(name)')
      .eq('status', 'scheduled')
      .gte('kickoff_at', now)
      .lte('kickoff_at', next48h)
      .order('kickoff_at', { ascending: true })
      .limit(10);

    if (!matches || matches.length === 0) {
      await ctx.reply(
        `Sem bolões abertos hoje ou amanhã.\n\n` +
        `Navegue pelos campeonatos disponíveis no bot para ver os próximos jogos e garantir seu palpite!\n\n` +
        `👉 [Abrir o bot](https://t.me/${botUsername})`,
        { parse_mode: 'Markdown' },
      );
      return;
    }

    const byChamp = new Map<string, typeof matches>();
    for (const m of matches) {
      const champ = (m.championships as any)?.name ?? 'Campeonato';
      if (!byChamp.has(champ)) byChamp.set(champ, []);
      byChamp.get(champ)!.push(m);
    }

    let msg = `⚽ *Bolões de Hoje e Amanhã*\n\n`;
    for (const [champ, games] of byChamp) {
      msg += `🏆 *${champ}*\n`;
      for (const m of games) {
        msg += `${m.home_team} x ${m.away_team} — ${fmtKickoff(m.kickoff_at)}\n`;
      }
      msg += `\n`;
    }
    msg += `👉 [Faça seu palpite agora!](https://t.me/${botUsername})`;

    await ctx.reply(msg, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('[groups /boloes]', err);
  }
}

export async function handleGroupRanking(ctx: any, db: Db): Promise<void> {
  try {
    const { data } = await db.client
      .from('transactions')
      .select('user_id, amount')
      .eq('type', 'prize');

    if (!data || data.length === 0) {
      await ctx.reply('Ainda não temos ganhadores. Seja o primeiro! 🏆');
      return;
    }

    const totals = new Map<string, number>();
    for (const t of data) {
      totals.set(t.user_id, (totals.get(t.user_id) ?? 0) + Number(t.amount));
    }
    const top5 = [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
    let msg = `🏆 *Ranking de Campeões*\n\n`;
    for (let i = 0; i < top5.length; i++) {
      const [userId, total] = top5[i];
      const user = await db.users.findById(userId);
      const name = user?.username ? `@${user.username}` : 'Anônimo';
      msg += `${medals[i]} ${name} — *${fmtBrl(total)}*\n`;
    }

    await ctx.reply(msg, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('[groups /ranking]', err);
  }
}
