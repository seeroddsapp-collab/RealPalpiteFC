import type { BotContext } from '../context';
import type { Db, EntryRow } from '@realpalpitefc/database';
import { canUserCancelEntry } from '@realpalpitefc/core';
import {
  msgMyEntriesMenu,
  msgMyEntriesAtivasList,
  msgMyEntriesRecentes,
  msgMyEntriesHist,
  msgMyEntriesBanca,
  msgEntryDetail,
  msgCancelConfirm,
  msgCancelOk,
  type EntryDetail,
  type HistFilter,
} from '../formatters/messages';
import {
  kbMyEntriesMenu,
  kbMyEntriesBack,
  kbMyEntriesHist,
  kbMyEntriesBanca,
  kbMyEntriesAtivas,
  kbEntryDetail,
  kbCancelConfirm,
} from '../keyboards/keyboards';

type MatchCtx = BotContext & { match: RegExpMatchArray };

function safeEdit(ctx: BotContext, text: string, extra: Record<string, unknown>) {
  return ctx.editMessageText(text, extra as never)
    .catch((err: any) => {
      if (String(err?.description ?? err?.message ?? '').includes('message is not modified')) return;
      return ctx.editMessageCaption(text, extra as never)
        .catch((err2: any) => {
          if (String(err2?.description ?? err2?.message ?? '').includes('message is not modified')) return;
          return ctx.reply(text, extra as never);
        });
    });
}

async function loadDetails(db: Db, entries: EntryRow[]): Promise<EntryDetail[]> {
  if (entries.length === 0) return [];

  const poolIds = [...new Set(entries.map(e => e.pool_id))];
  const pools   = await db.pools.findByIds(poolIds);
  const poolMap = Object.fromEntries(pools.map(p => [p.id, p]));

  const matchIds = [...new Set(pools.map(p => p.match_id))];
  const matches  = await db.matches.findByIds(matchIds);
  const matchMap = Object.fromEntries(matches.map(m => [m.id, m]));

  const txs = await db.transactions.findByUserAndPoolIds(entries[0]!.user_id, poolIds);
  const txByPool: Record<string, number> = {};
  for (const tx of txs) {
    if (tx.pool_id) txByPool[tx.pool_id] = (txByPool[tx.pool_id] ?? 0) + tx.amount;
  }

  return entries
    .map(entry => {
      const pool  = poolMap[entry.pool_id];
      if (!pool) return null;
      const match = matchMap[pool.match_id];
      if (!match) return null;
      const detail: EntryDetail = { entry, pool, match, prizeOrRefund: txByPool[pool.id] };
      return detail;
    })
    .filter((d): d is EntryDetail => d !== null);
}

function periodToDate(period: HistFilter['period']): Date | undefined {
  if (period === 'all') return undefined;
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

export function registerMyEntriesActions(bot: { action: (...args: unknown[]) => void }, db: Db) {

  // ── Menu Minhas Entradas ──────────────────────────────────────────────────
  (bot as any).action('me', async (ctx: BotContext) => {
    await ctx.answerCbQuery();
    await safeEdit(ctx, msgMyEntriesMenu(), {
      parse_mode: 'Markdown',
      reply_markup: kbMyEntriesMenu().reply_markup,
    });
  });

  // ── Entradas Ativas (lista com botões por entrada) ────────────────────────
  (bot as any).action('me_ativas', async (ctx: BotContext) => {
    await ctx.answerCbQuery();
    const userId  = ctx.session.user!.id;
    const entries = await db.entries.findAllByUser(userId);
    const all     = await loadDetails(db, entries);
    const ativas  = all.filter(d => d.pool.status === 'open' || d.pool.status === 'closed');

    await safeEdit(ctx, msgMyEntriesAtivasList(ativas.length), {
      parse_mode: 'Markdown',
      reply_markup: kbMyEntriesAtivas(ativas).reply_markup,
    });
  });

  // ── Detalhe de uma entrada ativa ──────────────────────────────────────────
  (bot as any).action(/^me_entry:(.{36})$/, async (ctx: MatchCtx) => {
    await ctx.answerCbQuery();
    const entryId = ctx.match[1];

    const entry = await db.entries.findById(entryId);
    if (!entry) {
      await ctx.answerCbQuery('❌ Entrada não encontrada.', { show_alert: true });
      return;
    }

    const pool = await db.pools.findById(entry.pool_id);
    if (!pool) {
      await ctx.answerCbQuery('❌ Bolão não encontrado.', { show_alert: true });
      return;
    }

    const match = await db.matches.findById(pool.match_id);
    if (!match) {
      await ctx.answerCbQuery('❌ Partida não encontrada.', { show_alert: true });
      return;
    }

    const canCancel = (pool.status === 'open') && canUserCancelEntry(new Date(match.kickoff_at));

    await safeEdit(ctx, msgEntryDetail(entry, pool, match, canCancel), {
      parse_mode: 'Markdown',
      reply_markup: kbEntryDetail(entryId, canCancel).reply_markup,
    });
  });

  // ── Tela de confirmação de cancelamento ───────────────────────────────────
  (bot as any).action(/^me_cancel:(.{36})$/, async (ctx: MatchCtx) => {
    await ctx.answerCbQuery();
    const entryId = ctx.match[1];

    const entry = await db.entries.findById(entryId);
    if (!entry) {
      await ctx.answerCbQuery('❌ Entrada não encontrada.', { show_alert: true });
      return;
    }

    const pool  = await db.pools.findById(entry.pool_id);
    const match = pool ? await db.matches.findById(pool.match_id) : null;
    if (!pool || !match) {
      await ctx.answerCbQuery('❌ Dados não encontrados.', { show_alert: true });
      return;
    }

    if (pool.status !== 'open' || !canUserCancelEntry(new Date(match.kickoff_at))) {
      await ctx.answerCbQuery('❌ Prazo de cancelamento encerrado.', { show_alert: true });
      return;
    }

    await safeEdit(ctx, msgCancelConfirm(pool, match), {
      parse_mode: 'Markdown',
      reply_markup: kbCancelConfirm(entryId).reply_markup,
    });
  });

  // ── Processar cancelamento ────────────────────────────────────────────────
  (bot as any).action(/^me_cancel_ok:(.{36})$/, async (ctx: MatchCtx) => {
    const entryId = ctx.match[1];

    const entry = await db.entries.findById(entryId);
    if (!entry) {
      await ctx.answerCbQuery('❌ Entrada não encontrada.', { show_alert: true });
      return;
    }

    const pool  = await db.pools.findById(entry.pool_id);
    const match = pool ? await db.matches.findById(pool.match_id) : null;
    if (!pool || !match) {
      await ctx.answerCbQuery('❌ Dados não encontrados.', { show_alert: true });
      return;
    }

    // Dupla verificação — pool ainda aberta e dentro do prazo
    if (pool.status !== 'open' || !canUserCancelEntry(new Date(match.kickoff_at))) {
      await ctx.answerCbQuery('❌ Prazo de cancelamento encerrado.', { show_alert: true });
      return;
    }

    await ctx.answerCbQuery();

    try {
      const user = ctx.session.user!;

      // 1. Credita o saldo antes de qualquer outra operação — dinheiro é prioridade
      const newBalance = await db.users.creditBalance(user.id, entry.amount);

      // 2. Registra o estorno
      await db.transactions.create({
        user_id:      user.id,
        type:         'refund',
        amount:       entry.amount,
        balance_after: newBalance,
        pool_id:      pool.id,
        description:  `Cancelamento: ${match.home_team} × ${match.away_team}`,
      });

      // 3. Remove a entrada (se falhar, o saldo já foi devolvido e a transação registrada)
      await db.entries.deleteById(entryId);

      ctx.session.user!.virtual_balance = newBalance;

      await safeEdit(ctx, msgCancelOk(entry.amount), {
        parse_mode: 'Markdown',
        reply_markup: kbMyEntriesMenu().reply_markup,
      });
    } catch (err) {
      console.error('[me_cancel_ok] Erro ao cancelar entrada:', err);
      await ctx.reply('⚠️ Erro ao cancelar. Tente novamente.');
    }
  });

  // ── Finalizadas Recentes ──────────────────────────────────────────────────
  (bot as any).action('me_rec', async (ctx: BotContext) => {
    const userId  = ctx.session.user!.id;
    const entries = await db.entries.findAllByUser(userId);
    const all     = await loadDetails(db, entries);
    const rec     = all
      .filter(d => d.pool.status === 'resolved' || d.pool.status === 'cancelled')
      .slice(0, 15);

    await ctx.answerCbQuery(rec.length === 0 ? 'Nenhuma entrada finalizada ainda.' : undefined);

    await safeEdit(ctx, msgMyEntriesRecentes(rec), {
      parse_mode: 'Markdown',
      reply_markup: kbMyEntriesBack().reply_markup,
    });
  });

  // ── Histórico com filtros ─────────────────────────────────────────────────
  (bot as any).action(/^me_hist:(\w+):(\w+)$/, async (ctx: MatchCtx) => {
    const period  = ctx.match[1] as HistFilter['period'];
    const outcome = ctx.match[2] as HistFilter['outcome'];
    const filter: HistFilter = { period, outcome };

    const userId  = ctx.session.user!.id;
    const from    = periodToDate(period);
    const entries = await db.entries.findAllByUser(userId);
    const all     = await loadDetails(db, entries);

    let filtered = all.filter(d =>
      d.pool.status === 'resolved' || d.pool.status === 'cancelled',
    );
    if (from) filtered = filtered.filter(d => new Date(d.entry.created_at) >= from);
    if (outcome === 'won')  filtered = filtered.filter(d => d.entry.is_winner === true);
    if (outcome === 'lost') filtered = filtered.filter(d => d.entry.is_winner === false);

    await ctx.answerCbQuery(filtered.length === 0 ? 'Nenhuma entrada neste período.' : undefined);

    await safeEdit(ctx, msgMyEntriesHist(filtered, filter), {
      parse_mode: 'Markdown',
      reply_markup: kbMyEntriesHist(filter).reply_markup,
    });
  });

  // ── Gestão de Banca ───────────────────────────────────────────────────────
  (bot as any).action(/^me_banca:(\w+)$/, async (ctx: MatchCtx) => {
    const period  = ctx.match[1] as HistFilter['period'];
    const from    = periodToDate(period);
    const userId  = ctx.session.user!.id;
    const balance = ctx.session.user!.virtual_balance;

    const [summary, entries] = await Promise.all([
      db.transactions.getSummaryByUser(userId, from),
      db.entries.findAllByUser(userId),
    ]);

    const periodEntries = from
      ? entries.filter(e => new Date(e.created_at) >= from)
      : entries;
    const resolved  = periodEntries.filter(e => e.is_winner !== null);
    const wonCount  = resolved.filter(e => e.is_winner === true).length;

    const semMovimentacao = summary.invested === 0 && summary.prizes === 0 && summary.refunds === 0;
    await ctx.answerCbQuery(semMovimentacao ? 'Nenhuma movimentação neste período.' : undefined);

    await safeEdit(ctx, msgMyEntriesBanca(summary, periodEntries.length, wonCount, resolved.length, period, balance), {
      parse_mode: 'Markdown',
      reply_markup: kbMyEntriesBanca(period).reply_markup,
    });
  });
}
