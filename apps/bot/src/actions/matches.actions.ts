import type { BotContext } from '../context';
import type { Db } from '@realpalpitefc/database';
import { msgMatches } from '../formatters/messages';
import { kbMatches } from '../keyboards/keyboards';
import { generateChampionshipImage } from '../utils/match-image';

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

    const matchText = msgMatches(champ.name);
    const matchMarkup = kbMatches(matches).reply_markup;

    // Exibe banner do campeonato se houver logo disponível
    if (champ.logo_url) {
      try {
        const banner = await generateChampionshipImage(champ.logo_url, champ.name);
        try { await ctx.deleteMessage(); } catch {}
        await ctx.replyWithPhoto(
          { source: banner, filename: 'championship.png' },
          { caption: matchText, parse_mode: 'Markdown', reply_markup: matchMarkup },
        );
        return;
      } catch {
        // fallback para texto se a imagem falhar
      }
    }

    await safeEdit(ctx, matchText, {
      parse_mode: 'Markdown',
      reply_markup: matchMarkup,
    });
  });
}
