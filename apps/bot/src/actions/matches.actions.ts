import type { BotContext } from '../context';
import type { Db } from '@realpalpitefc/database';
import { msgMatches } from '../formatters/messages';
import { kbMatches } from '../keyboards/keyboards';

type MatchCtx = BotContext & { match: RegExpMatchArray };

function safeEdit(ctx: BotContext, text: string, extra: Record<string, unknown>) {
  return ctx.editMessageText(text, extra as never)
    .catch((err: any) => {
      if (String(err?.description ?? err?.message ?? '').includes('message is not modified')) return;
      return ctx.reply(text, extra as never);
    });
}

export function registerMatchesActions(bot: { action: (...args: unknown[]) => void }, db: Db) {
  // gl_m:{champId} — partidas de um campeonato (próximos 21 dias)
  (bot as any).action(/^gl_m:(.+)$/, async (ctx: MatchCtx) => {
    await ctx.answerCbQuery();

    const champId = ctx.match[1];
    const champ = await db.championships.findById(champId);
    if (!champ) {
      await ctx.answerCbQuery('Campeonato não encontrado.');
      return;
    }

    const now = new Date();
    const in21Days = new Date(now.getTime() + 21 * 86_400_000);
    const matches = await db.matches.findByChampionship(champId, now, in21Days);

    await safeEdit(ctx, msgMatches(champ.name), {
      parse_mode: 'Markdown',
      reply_markup: kbMatches(matches).reply_markup,
    });
  });
}
