import type { Telegraf } from 'telegraf';
import type { Db } from '@realpalpitefc/database';
import type { BotContext } from '../context';
import { POOL_LOCK_MINUTES_BEFORE_KICKOFF, shouldPoolClose } from '@realpalpitefc/core';
import { msgPoolClosedNotification } from '../formatters/messages';
import { getGhostSettings } from '../services/ghost.service';

export function startClosePoolsCron(db: Db, bot: Telegraf<BotContext>): NodeJS.Timer {
  const INTERVAL_MS = 60_000;

  const run = async () => {
    try {
      const openPools = await db.pools.findOpen();
      if (openPools.length === 0) return;

      const matchIds = [...new Set(openPools.map(p => p.match_id))];
      const now = new Date();

      for (const matchId of matchIds) {
        const match = await db.matches.findById(matchId);
        if (!match) continue;

        if (shouldPoolClose(new Date(match.kickoff_at), now)) {
          const poolsToClose = openPools.filter(p => p.match_id === matchId);
          const anyGhost = poolsToClose.some(p => p.ghost_count > 0);
          const ghost = anyGhost ? await getGhostSettings(db.client).catch(() => null) : null;

          for (const pool of poolsToClose) {
            await db.pools.close(pool.id);
            console.log(`[close-pools] Pool ${pool.id} fechada (${POOL_LOCK_MINUTES_BEFORE_KICKOFF}min antes do kickoff)`);

            const entries = await db.entries.findByPool(pool.id);
            const userIds = [...new Set(entries.map(e => e.user_id))];

            // Ajusta fantasmas ao ratio configurado
            if (pool.ghost_count > 0 && ghost?.enabled && entries.length > 0) {
              const ghostAtClose = Math.max(1, entries.length * (ghost.ratioAtClose - 1));
              const dropped = pool.ghost_count - ghostAtClose;
              await db.pools.updateGhostCount(pool.id, ghostAtClose).catch(() => null);

              if (dropped > 0) {
                for (const userId of userIds) {
                  const user = await db.users.findById(userId);
                  if (!user) continue;
                  bot.telegram
                    .sendMessage(
                      user.telegram_id,
                      `👻 *${dropped} participante${dropped !== 1 ? 's' : ''} desistiu antes do fechamento.*\n👥 Total final: *${entries.length + ghostAtClose} participantes*`,
                      { parse_mode: 'Markdown' },
                    )
                    .catch(() => null);
                }
              }
            }

            for (const userId of userIds) {
              const user = await db.users.findById(userId);
              if (!user) continue;
              bot.telegram
                .sendMessage(user.telegram_id, msgPoolClosedNotification(match), { parse_mode: 'Markdown' })
                .catch(err => console.warn(`[close-pools] Falha ao notificar ${user.telegram_id}:`, err));
            }
          }
        }
      }
    } catch (err) {
      console.error('[close-pools] Erro no cron:', err);
    }
  };

  void run();
  return setInterval(run, INTERVAL_MS);
}
