import { Scenes } from 'telegraf';
import type { BotContext } from '../context';
import type { Db } from '@realpalpitefc/database';
import type { PixKeyType } from '../services/mercadopago.service';
import { kbMinhaConta } from '../keyboards/keyboards';

export const ALTERAR_PIX_SCENE = 'alterar_pix';

function detectPixKeyType(key: string): PixKeyType {
  const digits = key.replace(/\D/g, '');
  if (digits.length === 11 && !key.includes('@')) return 'cpf';
  if (key.includes('@')) return 'email';
  if (/^\+?[\d\s\-()]{10,15}$/.test(key) && digits.length >= 10) return 'phone';
  return 'random_key';
}

export function buildAlterarPixScene(db: Db) {
  return new Scenes.WizardScene<BotContext>(
    ALTERAR_PIX_SCENE,

    // Step 0 — pede a chave PIX
    async ctx => {
      const user = ctx.session.user;
      if (!user) return ctx.scene.leave();

      const action = user.pix_key ? 'Nova chave PIX' : 'Cadastrar chave PIX';
      await ctx.reply(
        `🔑 *${action}*\n\n` +
          `Informe sua chave PIX:\n` +
          `_CPF sem pontos, celular com DDD, e-mail ou chave aleatória_\n\n` +
          `Ou envie /cancelar para desistir.`,
        { parse_mode: 'Markdown' },
      );
      return ctx.wizard.next();
    },

    // Step 1 — valida e salva
    async ctx => {
      if (ctx.message && 'text' in ctx.message && ctx.message.text === '/cancelar') {
        await ctx.reply('Operação cancelada.', {
          reply_markup: kbMinhaConta().reply_markup,
        });
        return ctx.scene.leave();
      }

      const text = ctx.message && 'text' in ctx.message ? ctx.message.text.trim() : '';
      if (!text || text.length < 5) {
        await ctx.reply('Chave inválida. Tente novamente ou envie /cancelar.');
        return;
      }

      const user = ctx.session.user!;
      const pixKeyType = detectPixKeyType(text);

      await db.users.updatePixKey(user.id, text, pixKeyType);
      ctx.session.user = { ...user, pix_key: text, pix_key_type: pixKeyType };

      const tipos: Record<string, string> = {
        cpf: 'CPF', phone: 'Celular', email: 'E-mail', random_key: 'Chave aleatória',
      };

      await ctx.reply(
        `✅ *Chave PIX salva!*\n\n` +
          `Tipo detectado: *${tipos[pixKeyType]}*\n` +
          `Chave: \`${text}\``,
        {
          parse_mode: 'Markdown',
          reply_markup: kbMinhaConta().reply_markup,
        },
      );

      return ctx.scene.leave();
    },
  );
}
