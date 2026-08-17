import type { Telegraf } from 'telegraf';
import type { BotContext } from '../context';
import type { Db } from '@realpalpitefc/database';
import { fmtBrl } from '../formatters/messages';

const INTERVAL_MS = 2 * 60_000;

export function startDepositExpiryCron(
  db: Db,
  bot: Telegraf<BotContext>,
): NodeJS.Timer {
  const run = async () => {
    try {
      const { data: expired } = await db.client
        .from('pix_deposits')
        .select('id, user_id, amount')
        .eq('status', 'pending')
        .lt('expires_at', new Date().toISOString());

      if (!expired || expired.length === 0) return;

      for (const deposit of expired) {
        await db.client
          .from('pix_deposits')
          .update({ status: 'expired' })
          .eq('id', deposit.id);

        const user = await db.users.findById(deposit.user_id);
        if (!user) continue;

        await bot.telegram
          .sendMessage(
            user.telegram_id,
            `⏰ *QR Code expirado*\n\n` +
            `Seu depósito de *${fmtBrl(deposit.amount)}* não foi pago e expirou.\n\n` +
            `Use /depositar para gerar um novo código.`,
            { parse_mode: 'Markdown' },
          )
          .catch(() => {});
      }
    } catch (err) {
      console.error('[deposit-expiry] Erro:', err);
    }
  };

  void run();
  return setInterval(run, INTERVAL_MS);
}
