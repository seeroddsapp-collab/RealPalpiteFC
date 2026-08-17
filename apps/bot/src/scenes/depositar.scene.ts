import { Scenes } from 'telegraf';
import type { BotContext } from '../context';
import type { Db } from '@realpalpitefc/database';
import type { AsaasService } from '../services/asaas.service';
import { fmtBrl } from '../formatters/messages';

export const DEPOSITAR_SCENE = 'depositar';
const MIN_DEPOSIT = 5;
const MAX_DEPOSIT = 5000;

export function buildDepositarScene(db: Db, asaas: AsaasService) {
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

      if (amount > MAX_DEPOSIT) {
        await ctx.reply(
          `Valor máximo por depósito é *${fmtBrl(MAX_DEPOSIT)}*.\nPara depósitos maiores, realize múltiplas transferências.`,
          { parse_mode: 'Markdown' },
        );
        return;
      }

      const user = ctx.session.user;
      if (!user) return ctx.scene.leave();

      const loadingMsg = await ctx.reply('⏳ Gerando QR Code PIX...');

      try {
        const depositId = crypto.randomUUID();

        const customerName = user.username ? `@${user.username}` : `Apostador ${user.id.slice(0, 8)}`;

        const payment = await asaas.createPixDeposit({
          amount,
          externalRef: depositId,
          customerRef: `rpfc_${user.id}`,
          customerName,
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

        // Envia código PIX copia-e-cola (sem foto — Render free tier não suporta sendPhoto)
        await ctx.reply(
          `✅ *Depósito de ${fmtBrl(amount)}*\n\n` +
          `Copie o código PIX abaixo e cole no seu banco em *PIX → Copia e Cola*:\n` +
          `_Expira em 30 minutos. O saldo é creditado automaticamente após o pagamento._`,
          { parse_mode: 'Markdown' },
        );
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
