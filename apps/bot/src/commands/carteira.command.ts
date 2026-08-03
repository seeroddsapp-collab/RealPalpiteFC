import type { BotContext } from '../context';
import type { Db } from '@realpalpitefc/database';
import { Markup } from 'telegraf';
import { fmtBrl } from '../formatters/messages';
import { DEPOSITAR_SCENE } from '../scenes/depositar.scene';
import { SACAR_SCENE } from '../scenes/sacar.scene';

export function carteiraCommand(db: Db) {
  return async (ctx: BotContext) => {
    const user = ctx.session.user;
    if (!user) return;

    const [deposits, withdrawals] = await Promise.all([
      db.pixDeposits.findByUser(user.id, { limit: 3 }),
      db.pixWithdrawals.findByUser(user.id, { limit: 3 }),
    ]);

    const totalDeposited = deposits
      .filter(d => d.status === 'confirmed')
      .reduce((s, d) => s + d.amount, 0);

    const totalWithdrawn = withdrawals
      .filter(w => w.status === 'completed')
      .reduce((s, w) => s + w.amount, 0);

    let text =
      `💼 *Carteira*\n\n` +
      `💰 Saldo atual: *${fmtBrl(user.virtual_balance)}*\n\n` +
      `📥 Total depositado: ${fmtBrl(totalDeposited)}\n` +
      `📤 Total sacado: ${fmtBrl(totalWithdrawn)}`;

    if (user.pix_key) {
      text += `\n\n🔑 Chave PIX: \`${user.pix_key}\``;
    }

    await ctx.reply(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('📥 Depositar', 'carteira_depositar')],
        [Markup.button.callback('📤 Sacar', 'carteira_sacar')],
        [Markup.button.callback('🏠 Menu', 'menu')],
      ]),
    });
  };
}

export function registerCarteiraActions(bot: any, _db: Db) {
  bot.action('carteira_depositar', async (ctx: BotContext) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter(DEPOSITAR_SCENE);
  });

  bot.action('carteira_sacar', async (ctx: BotContext) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter(SACAR_SCENE);
  });
}
