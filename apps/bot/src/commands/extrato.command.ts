import type { BotContext } from '../context';
import type { Db } from '@realpalpitefc/database';
import { msgExtrato } from '../formatters/messages';
import { kbBackToMenu } from '../keyboards/keyboards';

export function extratoCommand(db: Db) {
  return async (ctx: BotContext): Promise<void> => {
    const user = ctx.session.user!;

    const txs = await db.transactions.findByUser(user.id, { limit: 20 });

    await ctx.reply(msgExtrato(user.virtual_balance, txs), {
      parse_mode: 'Markdown',
      reply_markup: kbBackToMenu().reply_markup,
    });
  };
}
