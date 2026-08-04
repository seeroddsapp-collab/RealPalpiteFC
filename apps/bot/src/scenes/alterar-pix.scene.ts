import { Scenes } from 'telegraf';
import type { BotContext } from '../context';
import type { Db } from '@realpalpitefc/database';
import type { PixKeyType } from '../services/mercadopago.service';
import { kbMinhaConta, kbPixKeyType } from '../keyboards/keyboards';

export const ALTERAR_PIX_SCENE = 'alterar_pix';

interface PixTypeInfo {
  label: string;
  type: PixKeyType;
  instruction: string;
  example: string;
}

const PIX_TYPES: Record<string, PixTypeInfo> = {
  apix_cpf: {
    label: 'CPF',
    type: 'cpf',
    instruction: 'Digite seu CPF (somente os 11 números, sem pontos ou traço)',
    example: '12345678901',
  },
  apix_phone: {
    label: 'Celular',
    type: 'phone',
    instruction: 'Digite seu celular com DDD (somente números)',
    example: '11987654321',
  },
  apix_email: {
    label: 'E-mail',
    type: 'email',
    instruction: 'Digite o e-mail cadastrado no seu banco',
    example: 'seunome@email.com',
  },
  apix_random: {
    label: 'Chave aleatória',
    type: 'random_key',
    instruction: 'Cole sua chave aleatória (formato UUID gerado pelo banco)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  },
};

function validatePixKey(key: string, type: PixKeyType): string | null {
  const digits = key.replace(/\D/g, '');
  switch (type) {
    case 'cpf':
      if (digits.length !== 11) return '❌ CPF deve ter exatamente 11 dígitos.';
      return null;
    case 'phone':
      if (digits.length < 10 || digits.length > 13) return '❌ Celular inválido. Use DDD + número (ex: 11987654321).';
      return null;
    case 'email':
      if (!key.includes('@') || !key.includes('.')) return '❌ E-mail inválido. Verifique e tente novamente.';
      return null;
    case 'random_key':
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) {
        return '❌ Chave aleatória inválida. Deve estar no formato UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).';
      }
      return null;
  }
}

export function buildAlterarPixScene(db: Db) {
  return new Scenes.WizardScene<BotContext>(
    ALTERAR_PIX_SCENE,

    // Step 0 — pergunta o tipo da chave
    async ctx => {
      const user = ctx.session.user;
      if (!user) return ctx.scene.leave();

      const title = user.pix_key ? 'Alterar chave PIX' : 'Cadastrar chave PIX';
      await ctx.reply(
        `🔑 *${title}*\n\nQue tipo de chave PIX você vai cadastrar?`,
        {
          parse_mode: 'Markdown',
          reply_markup: kbPixKeyType().reply_markup,
        },
      );
      return ctx.wizard.next();
    },

    // Step 1 — usuário clica no tipo; mostra instruções específicas
    async ctx => {
      // Suporte a /cancelar digitado
      if (ctx.message && 'text' in ctx.message && ctx.message.text === '/cancelar') {
        await ctx.reply('Operação cancelada.', { reply_markup: kbMinhaConta().reply_markup });
        return ctx.scene.leave();
      }

      const cb = ctx.callbackQuery;
      if (!cb || !('data' in cb)) {
        await ctx.reply('Por favor, toque em um dos tipos de chave acima 👆');
        return;
      }

      const selected = PIX_TYPES[cb.data];
      if (!selected) {
        await ctx.answerCbQuery();
        return ctx.scene.leave();
      }

      await ctx.answerCbQuery();
      (ctx.wizard.state as Record<string, unknown>).pixKeyType = selected.type;

      await ctx.editMessageText(
        `🔑 *${selected.label}*\n\n` +
        `${selected.instruction}:\n\n` +
        `_Exemplo: \`${selected.example}\`_\n\n` +
        `Ou envie /cancelar para desistir.`,
        { parse_mode: 'Markdown' },
      );

      return ctx.wizard.next();
    },

    // Step 2 — valida e salva a chave
    async ctx => {
      if (ctx.message && 'text' in ctx.message && ctx.message.text === '/cancelar') {
        await ctx.reply('Operação cancelada.', { reply_markup: kbMinhaConta().reply_markup });
        return ctx.scene.leave();
      }

      const text = ctx.message && 'text' in ctx.message ? ctx.message.text.trim() : '';
      const pixKeyType = (ctx.wizard.state as Record<string, unknown>).pixKeyType as PixKeyType;

      if (!text || text.length < 5) {
        await ctx.reply('Chave muito curta. Tente novamente ou envie /cancelar.');
        return;
      }

      const error = validatePixKey(text, pixKeyType);
      if (error) {
        await ctx.reply(`${error}\n\nTente novamente ou envie /cancelar.`);
        return;
      }

      const user = ctx.session.user!;
      await db.users.updatePixKey(user.id, text, pixKeyType);
      ctx.session.user = { ...user, pix_key: text, pix_key_type: pixKeyType };

      const labels: Record<PixKeyType, string> = {
        cpf: 'CPF',
        phone: 'Celular',
        email: 'E-mail',
        random_key: 'Chave aleatória',
      };

      await ctx.reply(
        `✅ *Chave PIX salva!*\n\n` +
        `Tipo: *${labels[pixKeyType]}*\n` +
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
