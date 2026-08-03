import { Scenes } from 'telegraf';
import type { BotContext } from '../context';
import type { Db } from '@realpalpitefc/database';
import type { MercadoPagoService } from '../services/mercadopago.service';
import { fmtBrl } from '../formatters/messages';

export const DEPOSITAR_SCENE = 'depositar';
const MIN_DEPOSIT = 10;

export function buildDepositarScene(db: Db, mp: MercadoPagoService) {
  return new Scenes.WizardScene<BotContext>(
    DEPOSITAR_SCENE,

    // Step 0 — pede o valor
    async ctx => {
      await ctx.reply(
        `💳 *Depósito via PIX*\n\n` +
          `Qual valor deseja depositar?\n` +
          `_Mínimo: ${fmtBrl(MIN_DEPOSIT)} · QR Code expira em 30 min_`,
        { parse_mode: 'Markdown' },
      );
      return ctx.wizard.next();
    },

    // Step 1 — valida valor e gera QR Code
    async ctx => {
      const text = ctx.message && 'text' in ctx.message ? ctx.message.text.trim() : '';
      const amount = parseFloat(text.replace(',', '.'));

      if (isNaN(amount) || amount < MIN_DEPOSIT) {
        await ctx.reply(
          `Valor inválido. Digite um número igual ou maior que ${fmtBrl(MIN_DEPOSIT)}.\nEx: *50* ou *100,00*`,
          { parse_mode: 'Markdown' },
        );
        return;
      }

      const user = ctx.session.user;
      if (!user) return ctx.scene.leave();

      const loadingMsg = await ctx.reply('⏳ Gerando QR Code PIX...');

      try {
        const depositId = crypto.randomUUID();

        const payment = await mp.createPixDeposit({
          amount,
          externalRef: depositId,
          description: 'Depósito RealPalpiteFC',
        });

        await db.pixDeposits.create({
          id: depositId,
          user_id: user.id,
          amount,
          mp_payment_id: payment.id,
          qr_code: payment.qrCode,
          qr_code_base64: payment.qrCodeBase64,
          status: 'pending',
          expires_at: payment.expiresAt,
        });

        // Envia imagem do QR Code
        const qrBuffer = Buffer.from(payment.qrCodeBase64, 'base64');
        await ctx.replyWithPhoto(
          { source: qrBuffer },
          {
            caption:
              `✅ *Depósito de ${fmtBrl(amount)}*\n\n` +
              `Escaneie o QR Code ou copie o código PIX abaixo.\n` +
              `_Expira em 30 minutos. O saldo é creditado automaticamente após confirmação._`,
            parse_mode: 'Markdown',
          },
        );

        // Envia código copia-e-cola
        await ctx.reply(`\`${payment.qrCode}\``, { parse_mode: 'Markdown' });

        await ctx.telegram.deleteMessage(ctx.chat!.id, loadingMsg.message_id).catch(() => {});
      } catch (err) {
        console.error('[depositar scene]', err);
        await ctx.reply('❌ Erro ao gerar QR Code. Tente novamente em instantes.');
        await ctx.telegram.deleteMessage(ctx.chat!.id, loadingMsg.message_id).catch(() => {});
      }

      return ctx.scene.leave();
    },
  );
}
