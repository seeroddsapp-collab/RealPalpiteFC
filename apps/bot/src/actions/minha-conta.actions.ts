import type { BotContext } from '../context';
import type { Db } from '@realpalpitefc/database';
import {
  msgMinhaConta,
  msgMinhaContaPixKey,
  msgExtrato,
  fmtBrl,
} from '../formatters/messages';
import {
  kbMinhaConta,
  kbMinhaContaCarteira,
  kbMinhaContaPixKey,
  kbBackToMenu,
} from '../keyboards/keyboards';
import { DEPOSITAR_SCENE } from '../scenes/depositar.scene';
import { SACAR_SCENE } from '../scenes/sacar.scene';
import { ALTERAR_PIX_SCENE } from '../scenes/alterar-pix.scene';

function safeEdit(ctx: BotContext, text: string, extra: Record<string, unknown>) {
  return ctx
    .editMessageText(text, extra as never)
    .catch((err: any) => {
      if (String(err?.description ?? err?.message ?? '').includes('message is not modified')) return;
      return ctx.reply(text, extra as never);
    });
}

export function registerMinhaContaActions(bot: { action: (...args: unknown[]) => void }, db: Db) {
  // Abre o submenu Minha Conta
  (bot as any).action('minha_conta', async (ctx: BotContext) => {
    await ctx.answerCbQuery();
    const user = ctx.session.user!;
    await safeEdit(ctx, msgMinhaConta(user.virtual_balance, user.pix_key ?? null), {
      parse_mode: 'Markdown',
      reply_markup: kbMinhaConta().reply_markup,
    });
  });

  // Carteira — saldo + botões depositar/sacar
  (bot as any).action('mc_carteira', async (ctx: BotContext) => {
    await ctx.answerCbQuery();
    const user = ctx.session.user!;
    const [deposits, withdrawals] = await Promise.all([
      db.pixDeposits.findByUser(user.id, { limit: 5 }),
      db.pixWithdrawals.findByUser(user.id, { limit: 5 }),
    ]);
    const totalDeposited = deposits
      .filter(d => d.status === 'confirmed')
      .reduce((s, d) => s + d.amount, 0);
    const totalWithdrawn = withdrawals
      .filter(w => w.status === 'completed')
      .reduce((s, w) => s + w.amount, 0);

    let text =
      `💰 *Carteira*\n\n` +
      `Saldo disponível: *${fmtBrl(user.virtual_balance)}*\n\n` +
      `📥 Total depositado: ${fmtBrl(totalDeposited)}\n` +
      `📤 Total sacado: ${fmtBrl(totalWithdrawn)}`;

    if (user.pix_key) {
      text += `\n\n🔑 Chave PIX: \`${user.pix_key}\``;
    }

    await safeEdit(ctx, text, {
      parse_mode: 'Markdown',
      reply_markup: kbMinhaContaCarteira(user.virtual_balance).reply_markup,
    });
  });

  // Extrato — últimas transações
  (bot as any).action('mc_extrato', async (ctx: BotContext) => {
    await ctx.answerCbQuery();
    const user = ctx.session.user!;
    const txs = await db.transactions.findByUser(user.id, { limit: 15 });
    await safeEdit(ctx, msgExtrato(user.virtual_balance, txs), {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '⬅️ Minha Conta', callback_data: 'minha_conta' }],
        ],
      },
    });
  });

  // Minha Chave PIX — exibe e oferece alterar
  (bot as any).action('mc_pix_key', async (ctx: BotContext) => {
    await ctx.answerCbQuery();
    const user = ctx.session.user!;
    await safeEdit(
      ctx,
      msgMinhaContaPixKey(user.pix_key ?? null, user.pix_key_type ?? null),
      {
        parse_mode: 'Markdown',
        reply_markup: kbMinhaContaPixKey(!!user.pix_key).reply_markup,
      },
    );
  });

  // Entra na cena de alterar chave PIX
  (bot as any).action('mc_alterar_pix', async (ctx: BotContext) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter(ALTERAR_PIX_SCENE);
  });

  // Atalhos de Depositar/Sacar já registrados em carteira.command.ts
  // mas adicionamos aqui como alias do mc_carteira para consistência
  (bot as any).action('mc_depositar', async (ctx: BotContext) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter(DEPOSITAR_SCENE);
  });

  (bot as any).action('mc_sacar', async (ctx: BotContext) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter(SACAR_SCENE);
  });
}
