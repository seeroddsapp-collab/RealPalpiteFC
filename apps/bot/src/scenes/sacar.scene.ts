import { Scenes, Markup } from 'telegraf';
import type { BotContext } from '../context';
import type { Db } from '@realpalpitefc/database';
import type { MercadoPagoService, PixKeyType } from '../services/mercadopago.service';
import { fmtBrl } from '../formatters/messages';

export const SACAR_SCENE = 'sacar';
const MIN_WITHDRAWAL = 20;
const MAX_DAILY = 500;
const FIRST_WITHDRAWAL_LOCK_HOURS = 24;

interface SacarSession extends Scenes.WizardSessionData {
  waitingForPixKey?: boolean;
  withdrawAmount?: number;
}

function detectPixKeyType(key: string): PixKeyType {
  const digits = key.replace(/\D/g, '');
  if (digits.length === 11 && !key.includes('@')) return 'cpf';
  if (key.includes('@')) return 'email';
  if (/^\+?[\d\s\-()]{10,15}$/.test(key) && digits.length >= 10) return 'phone';
  return 'random_key';
}

export function buildSacarScene(db: Db, mp: MercadoPagoService) {
  return new Scenes.WizardScene<BotContext>(
    SACAR_SCENE,

    // Step 0 — valida pré-condições e pede valor ou chave PIX
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

      // Se ainda não tem chave PIX, pede primeiro
      if (!user.pix_key) {
        await ctx.reply(
          `🔑 *Configure sua chave PIX*\n\n` +
            `Para sacar, informe sua chave PIX:\n` +
            `_(CPF sem pontos, celular com DDD, e-mail ou chave aleatória)_`,
          { parse_mode: 'Markdown' },
        );
        (ctx.scene.session as SacarSession).waitingForPixKey = true;
        return ctx.wizard.next();
      }

      // Já tem chave PIX — pede valor diretamente
      await ctx.reply(
        `💸 *Saque via PIX*\n\n` +
          `Saldo disponível: *${fmtBrl(user.virtual_balance)}*\n` +
          `Chave PIX: \`${user.pix_key}\`\n\n` +
          `Qual valor deseja sacar?\n` +
          `_Mínimo: ${fmtBrl(MIN_WITHDRAWAL)} · Máximo diário: ${fmtBrl(MAX_DAILY)}_`,
        { parse_mode: 'Markdown' },
      );
      (ctx.scene.session as SacarSession).waitingForPixKey = false;
      return ctx.wizard.next();
    },

    // Step 1 — registra chave PIX (se pedida) ou valida valor
    async ctx => {
      const text = ctx.message && 'text' in ctx.message ? ctx.message.text.trim() : '';
      const user = ctx.session.user!;
      const session = ctx.scene.session as SacarSession;

      if (session.waitingForPixKey) {
        if (!text) {
          await ctx.reply('Por favor, envie sua chave PIX como texto.');
          return;
        }
        const pixKeyType = detectPixKeyType(text);
        await db.users.updatePixKey(user.id, text, pixKeyType);
        // Atualiza sessão com nova chave
        ctx.session.user = { ...user, pix_key: text, pix_key_type: pixKeyType };
        session.waitingForPixKey = false;

        const balance = user.virtual_balance;
        await ctx.reply(
          `✅ Chave PIX salva!\n\n` +
            `Saldo disponível: *${fmtBrl(balance)}*\n\n` +
            `Qual valor deseja sacar?\n` +
            `_Mínimo: ${fmtBrl(MIN_WITHDRAWAL)} · Máximo diário: ${fmtBrl(MAX_DAILY)}_`,
          { parse_mode: 'Markdown' },
        );
        return; // permanece no step 1 aguardando o valor
      }

      // Valida o valor
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
      const pixKey = ctx.session.user?.pix_key ?? user.pix_key!;

      await ctx.reply(
        `Confirma o saque de *${fmtBrl(amount)}*\npara a chave PIX \`${pixKey}\`?`,
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

  await ctx.editMessageText('⏳ Processando saque...');

  try {
    const withdrawalId = crypto.randomUUID();

    // Debita o saldo imediatamente (otimista — estorna se falhar)
    const newBalance = user.virtual_balance - amount;
    await db.users.updateBalance(user.id, newBalance);
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

      // Atualiza saldo na sessão
      ctx.session.user = { ...user, virtual_balance: newBalance };

      await ctx.editMessageText(
        `✅ *Saque enviado!*\n\n` +
          `💸 *${fmtBrl(amount)}* para \`${pixKey}\`\n` +
          `Saldo restante: *${fmtBrl(newBalance)}*`,
        { parse_mode: 'Markdown' },
      );
    } catch (mpErr) {
      // Estorna o saldo em caso de falha na transferência
      await db.users.updateBalance(user.id, user.virtual_balance);
      await db.transactions.create({
        user_id: user.id,
        type: 'refund',
        amount,
        balance_after: user.virtual_balance,
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
