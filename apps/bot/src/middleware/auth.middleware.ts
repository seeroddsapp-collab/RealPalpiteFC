import type { Middleware } from 'telegraf';
import type { BotContext } from '../context';
import type { Db } from '@realpalpitefc/database';

export function authMiddleware(db: Db): Middleware<BotContext> {
  return async (ctx, next) => {
    if (!ctx.from) return next();

    try {
      let user = await db.users.findByTelegramId(ctx.from.id);

      if (!user) {
        user = await db.users.create(ctx.from.id, ctx.from.username);
      } else if (ctx.from.username && ctx.from.username !== user.username) {
        await db.users.updateUsername(user.id, ctx.from.username);
        user = { ...user, username: ctx.from.username };
      }

      if (user.is_blocked) {
        await ctx.reply('❌ Sua conta está bloqueada. Entre em contato com o suporte.');
        return;
      }

      ctx.session.user = user;
    } catch (err) {
      console.error('[auth] Erro ao buscar/criar usuário:', err);
      await ctx.reply('⚠️ Erro interno. Tente novamente em instantes.').catch(() => {});
      return;
    }

    return next();
  };
}
