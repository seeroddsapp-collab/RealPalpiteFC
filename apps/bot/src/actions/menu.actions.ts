import type { BotContext } from '../context';
import type { Db } from '@realpalpitefc/database';
import {
  msgMainMenu,
  msgChampionships,
  msgNoChampionships,
  msgHowToPlay,
} from '../formatters/messages';
import { kbMainMenu, kbChampionships, kbBackToMenu } from '../keyboards/keyboards';

function safeEdit(ctx: BotContext, text: string, extra: Record<string, unknown>) {
  return ctx.editMessageText(text, extra as never)
    .catch((err: any) => {
      if (String(err?.description ?? err?.message ?? '').includes('message is not modified')) return;
      return ctx.reply(text, extra as never);
    });
}

export function registerMenuActions(bot: { action: (...args: unknown[]) => void }, db: Db) {
  // Menu principal
  (bot as any).action('menu', async (ctx: BotContext) => {
    await ctx.answerCbQuery();
    const user = ctx.session.user!;
    await safeEdit(ctx, msgMainMenu(user.virtual_balance), {
      parse_mode: 'Markdown',
      reply_markup: kbMainMenu().reply_markup,
    });
  });

  // Listas Globais → lista de campeonatos
  (bot as any).action('gl_ch', async (ctx: BotContext) => {
    await ctx.answerCbQuery();
    const now = new Date();
    const in21Days = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
    const championships = await db.championships.findActiveWithUpcomingMatches(now, in21Days);

    if (championships.length === 0) {
      await safeEdit(ctx, msgNoChampionships(), {
        parse_mode: 'Markdown',
        reply_markup: kbBackToMenu().reply_markup,
      });
      return;
    }

    await safeEdit(ctx, msgChampionships(), {
      parse_mode: 'Markdown',
      reply_markup: kbChampionships(championships).reply_markup,
    });
  });

  // Minhas Entradas — delegado para registerMyEntriesActions

  // Como Jogar
  (bot as any).action('how_to_play', async (ctx: BotContext) => {
    await ctx.answerCbQuery();
    await safeEdit(ctx, msgHowToPlay(), {
      parse_mode: 'Markdown',
      reply_markup: kbBackToMenu().reply_markup,
    });
  });
}
