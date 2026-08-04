import { Scenes, Markup } from 'telegraf';
import type { BotContext } from '../context';
import type { Db } from '@realpalpitefc/database';
import type { MercadoPagoService, PixKeyType } from '../services/mercadopago.service';
import { fmtBrl } from '../formatters/messages';
import { kbMinhaConta } from '../keyboards/keyboards';

export const SACAR_SCENE = 'sacar';
const MIN_WITHDRAWAL = 20;
const MAX_DAILY = 500;
const FIRST_WITHDRAWAL_LOCK_HOURS = 24;

interface SacarSession extends Scenes.WizardSessionData {
  withdrawAmount?: number;
}

export function buildSacarScene(db: Db, mp: MercadoPagoService) {
  return new Scenes.WizardScene<BotContext>(
    SACAR_SCENE,

    // Step 0 — valida pré-condições e pede valor
    async ctx => {
      const user = ctx.session.user;
      if (!user) return ctx.scene.leave();

      // Lock de 24h no primeiro saque
      const hoursSinceSignup =
        (Date.now() - new Date(user.created_at).getTime()) / 3_600_000;
      if (hoursSinceSignup < FIRST_WITHDRAWAL_LOCK_HOURS) {
        const remaining = Math.ceil(FIRST_WITHDRAWAL_LOCK_HOURS - hoursSinceSignup);
        await ctx.reply(
          `⏳ *Saque disponível em ${remaining}h*\n\n` +
            `Por segurança, o primeiro saque fica disponível 24h após o cadastro.`,
          { parse_mode: 'Markdown' },
        );
        return ctx.scene.leave();
      }

      if (user.virtual_balance < MIN_WITHDRAWAL) {
        await ctx.reply(
          `Saldo insuficiente para saque.\n` +
            `Mínimo: *${fmtBrl(MIN_WITHDRAWAL)}* · Saldo atual: *${fmtBrl(user.virtual_balance)}*`,
          { parse_mode: 'Markdown' },
        );
        return ctx.scene.leave();
      }

      // Chave PIX obrigatória — redireciona para cadastro via Minha Conta
      if (!user.pix_key) {
        await ctx.reply(
          `🔑 *Cadastre sua chave PIX primeiro*\n\n` +
            `Para sacar, acesse *Minha Conta → Minha Chave PIX* e cadastre sua chave antes de prosseguir.`,
          {
            parse_mode: 'Markdown',
            reply_markup: kbMinhaConta().reply_markup,
          },
        );
        return ctx.scene.leave();
      }

      await ctx.reply(
        `💸 *Saque via PIX*\n\n` +
          `Saldo disponível: *${fmtBrl(user.virtual_balance)}*\n` +
          `Chave PIX: \`${user.pix_key}\`\n\n` +
          `Qual valor deseja sacar?\n` +
          `_Mínimo: ${fmtBrl(MIN_WITHDRAWAL)} · Máximo diário: ${fmtBrl(MAX_DAILY)}_`,
        { parse_mode: 'Markdown' },
      );
      return ctx.wizard.next();
    },

    // Step 1 — valida valor e apresenta confirmação
    async ctx => {
      const text = ctx.message && 'text' in ctx.message ? ctx.message.text.trim() : '';
      const user = ctx.session.user!;
      const session = ctx.scene.session as SacarSession;

      const amount = parseFloat(text.replace(',', '.'));

      if (isNaN(amount) || amount < MIN_WITHDRAWAL) {
        await ctx.reply(
          `Valor mínimo para saque é ${fmtBrl(MIN_WITHDRAWAL)}.\nDigite um número válido.`,
        );
        return;
      }

      if (amount > user.virtual_balance) {
        await ctx.reply(
          `Saldo insuficiente.\nSeu saldo é *${fmtBrl(user.virtual_balance)}*.`,
          { parse_mode: 'Markdown' },
        );
        return;
      }

      // Verifica limite diário
      const todayTotal = await db.pixWithdrawals.getTodayTotal(user.id);
      const remaining = MAX_DAILY - todayTotal;
      if (remaining <= 0) {
        await ctx.reply(
          `Limite diário de ${fmtBrl(MAX_DAILY)} atingido.\nO limite reseta à meia-noite.`,
        );
        return ctx.scene.leave();
      }
      if (amount > remaining) {
        await ctx.reply(
          `Você ainda pode sacar *${fmtBrl(remaining)}* hoje.\nLimite diário: ${fmtBrl(MAX_DAILY)}.`,
          { parse_mode: 'Markdown' },
        );
        return;
      }

      session.withdrawAmount = amount;

      await ctx.reply(
        `Confirma o saque de *${fmtBrl(amount)}*\npara a chave PIX \`${user.pix_key}\`?`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('✅ Confirmar saque', 'sacar_ok')],
            [Markup.button.callback('❌ Cancelar', 'sacar_cancel')],
          ]),
        },
      );
      return ctx.wizard.next();
    },

    // Step 2 — aguarda confirmação via callback (tratado externamente)
    async ctx => {
      if (ctx.callbackQuery) await ctx.answerCbQuery();
    },
  );
}

// Handler do callback "sacar_ok" — registrado no index.ts
export async function handleSacarOk(
  ctx: BotContext,
  db: Db,
  mp: MercadoPagoService,
): Promise<void> {
  await ctx.answerCbQuery();
  const user = ctx.session.user;
  if (!user) return;

  const session = ctx.scene.session as SacarSession;
  const amount = session.withdrawAmount;
  if (!amount) {
    await ctx.editMessageText('Sessão expirada. Use /sacar novamente.');
    await ctx.scene.leave();
    return;
  }

  const pixKey = user.pix_key!;
  const pixKeyType = (user.pix_key_type as PixKeyType) ?? 'random_key';

  await ctx.editMessageText('⏳ Verificando e processando saque...');

  try {
    // Re-verifica saldo e limite diário diretamente do banco (evita race condition C-6)
    const freshUser = await db.users.findById(user.id);
    if (!freshUser || freshUser.virtual_balance < amount) {
      await ctx.editMessageText('❌ Saldo insuficiente. Tente novamente.');
      await ctx.scene.leave();
      return;
    }

    const todayTotal = await db.pixWithdrawals.getTodayTotal(user.id);
    if (todayTotal + amount > MAX_DAILY) {
      const remaining = MAX_DAILY - todayTotal;
      await ctx.editMessageText(
        `❌ Limite diário excedido.\n` +
          `Você ainda pode sacar *${fmtBrl(remaining > 0 ? remaining : 0)}* hoje.`,
        { parse_mode: 'Markdown' },
      );
      await ctx.scene.leave();
      return;
    }

    const withdrawalId = crypto.randomUUID();

    // Debita atomicamente — protege contra race condition simultânea
    const newBalance = await db.users.debitBalance(user.id, amount);
    if (newBalance === null) {
      await ctx.editMessageText('❌ Saldo insuficiente. Tente novamente.');
      await ctx.scene.leave();
      return;
    }

    await db.transactions.create({
      user_id: user.id,
      type: 'withdrawal',
      amount,
      balance_after: newBalance,
      description: `Saque PIX para ${pixKey}`,
    });

    // Cria registro de saque
    const withdrawal = await db.pixWithdrawals.create({
      id: withdrawalId,
      user_id: user.id,
      amount,
      pix_key: pixKey,
      pix_key_type: pixKeyType,
      status: 'processing',
    });

    // Executa a transferência no MP
    try {
      const transfer = await mp.sendPix({
        amount,
        pixKey,
        pixKeyType,
        externalRef: withdrawalId,
      });

      await db.pixWithdrawals.updateStatus(withdrawal.id, 'completed', {
        mpTransferId: transfer.id,
        completedAt: new Date(),
      });

      ctx.session.user = { ...user, virtual_balance: newBalance };

      await ctx.editMessageText(
        `✅ *Saque enviado!*\n\n` +
          `💸 *${fmtBrl(amount)}* para \`${pixKey}\`\n` +
          `Saldo restante: *${fmtBrl(newBalance)}*`,
        { parse_mode: 'Markdown' },
      );
    } catch (mpErr) {
      // Estorna atomicamente em caso de falha na transferência
      const restoredBalance = await db.users.creditBalance(user.id, amount);
      await db.transactions.create({
        user_id: user.id,
        type: 'refund',
        amount,
        balance_after: restoredBalance,
        description: `Estorno de saque PIX com falha`,
      });
      await db.pixWithdrawals.updateStatus(withdrawal.id, 'failed', {
        failureReason: String(mpErr),
      });

      console.error('[sacar] MP transfer failed:', mpErr);
      await ctx.editMessageText(
        `❌ *Falha ao processar saque.*\n\n` +
          `Seu saldo foi estornado. Tente novamente em instantes.`,
        { parse_mode: 'Markdown' },
      );
    }
  } catch (err) {
    console.error('[sacar] Unexpected error:', err);
    await ctx.editMessageText('❌ Erro inesperado. Tente novamente.');
  }

  await ctx.scene.leave();
}
