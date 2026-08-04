import type { BotContext } from '../context';
import type { Db } from '@realpalpitefc/database';
import { msgWelcome, msgPoolInvite } from '../formatters/messages';
import { kbMainMenu, kbPoolInvite } from '../keyboards/keyboards';

export function startCommand(db: Db) {
  return async (ctx: BotContext): Promise<void> => {
    const user = ctx.session.user!;

    const payload = (ctx.message as any)?.text?.split(' ')[1] as string | undefined;

    if (payload?.startsWith('join_')) {
      const poolId = payload.slice('join_'.length);
      const pool   = await db.pools.findById(poolId);
      const match  = pool ? await db.matches.findById(pool.match_id) : null;

      if (!pool || !match || pool.status !== 'open') {
        await ctx.reply(
          '❌ Este bolao nao esta mais disponivel.',
          { reply_markup: kbMainMenu().reply_markup },
        );
        return;
      }

      await ctx.reply(msgPoolInvite(pool, match), {
        parse_mode: 'Markdown',
        reply_markup: kbPoolInvite(poolId).reply_markup,
      });
      return;
    }

    await ctx.reply(msgWelcome(ctx.from?.first_name, user.username, user.virtual_balance), {
      parse_mode: 'Markdown',
      reply_markup: kbMainMenu().reply_markup,
    });
  };
}
