import type { BotContext } from '../context';
import type { Db } from '@realpalpitefc/database';
import { msgMyPools } from '../formatters/messages';
import { kbMyPools, kbMyPoolsBack } from '../keyboards/keyboards';

type MatchCtx = BotContext & { match: RegExpMatchArray };

function safeEdit(ctx: BotContext, text: string, extra: Record<string, unknown>) {
  return ctx.editMessageText(text, extra as never)
    .catch((err: any) => {
      if (String(err?.description ?? err?.message ?? '').includes('message is not modified')) return;
      return ctx.reply(text, extra as never);
    });
}

export function registerPrivatePoolsActions(bot: { action: (...args: unknown[]) => void }, db: Db) {

  // ── Minhas Listas Privadas ────────────────────────────────────────────────
  (bot as any).action('my_pools', async (ctx: BotContext) => {
    await ctx.answerCbQuery();
    const userId = ctx.session.user!.id;
    const pools  = await db.pools.findByCreator(userId);

    if (pools.length === 0) {
      await safeEdit(ctx, msgMyPools([], {}, {}), {
        parse_mode: 'Markdown',
        reply_markup: kbMyPools([], {}).reply_markup,
      });
      return;
    }

    const matchIds = [...new Set(pools.map(p => p.match_id))];
    const matches  = await db.matches.findByIds(matchIds);
    const matchMap = Object.fromEntries(matches.map(m => [m.id, m]));

    const counts = await Promise.all(
      pools.map(p => db.entries.findByPool(p.id).then(e => [p.id, e.length] as [string, number])),
    );
    const entryCounts = Object.fromEntries(counts);

    const openPools   = pools.filter(p => p.status === 'open');
    const poolLabels: Record<string, string> = {};
    for (const pool of openPools) {
      const match = matchMap[pool.match_id];
      if (!match) continue;
      const abbrev = (n: string) => n.length > 8 ? n.slice(0, 7) + '.' : n;
      poolLabels[pool.id] = `${abbrev(match.home_team)} × ${abbrev(match.away_team)}`;
    }

    await safeEdit(ctx, msgMyPools(pools, matchMap, entryCounts), {
      parse_mode: 'Markdown',
      reply_markup: kbMyPools(openPools.map(p => p.id), poolLabels).reply_markup,
    });
  });

  // ── Compartilhar link de convite ──────────────────────────────────────────
  (bot as any).action(/^my_pool_share:(.{36})$/, async (ctx: MatchCtx) => {
    await ctx.answerCbQuery();
    const poolId = ctx.match[1];

    const pool = await db.pools.findById(poolId);
    if (!pool || pool.status !== 'open') {
      await ctx.answerCbQuery('❌ Este bolao nao esta mais aberto.', { show_alert: true });
      return;
    }

    const botUsername = (ctx as any).botInfo?.username ?? 'bot';
    const shareLink   = `https://t.me/${botUsername}?start=join_${poolId}`;

    const match = await db.matches.findById(pool.match_id);
    const matchName = match
      ? `${match.home_team} × ${match.away_team}`
      : 'Bolao privado';

    await ctx.reply(
      `🔗 *Link de convite — ${matchName}*\n\n` +
      `${shareLink}\n\n` +
      `_Envie para seus amigos entrarem no bolao!_`,
      {
        parse_mode: 'Markdown',
        reply_markup: kbMyPoolsBack().reply_markup,
      },
    );
  });
}
