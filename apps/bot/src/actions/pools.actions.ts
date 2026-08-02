import type { BotContext } from '../context';
import type { Db, PoolRow, Json } from '@realpalpitefc/database';
import type {
  ResultadoPrediction,
  DuplaChancePrediction,
  TotalDeGolsPrediction,
  PlacarExatoPrediction,
} from '@realpalpitefc/core';
import { canUserEnterPool } from '@realpalpitefc/core';
import {
  msgTierSelect,
  msgPools,
  msgNoPools,
  msgPoolDetail,
  msgConfirmEntry,
  msgEntryOk,
  decodePred,
} from '../formatters/messages';
import { kbTierSelect, kbPools, kbPrediction, kbConfirm, kbBackToMenu } from '../keyboards/keyboards';

type MatchCtx = BotContext & { match: RegExpMatchArray };

function safeEdit(ctx: BotContext, text: string, extra: Record<string, unknown>) {
  return ctx.editMessageText(text, extra as never)
    .catch(() => ctx.editMessageCaption(text, extra as never))
    .catch(() => ctx.reply(text, extra as never));
}

// Extrai poolId de callback_data cujo prefixo tem comprimento fixo.
// UUID tem sempre 36 chars. O separador `:` fica em (prefixLen + 36).
function extractPoolIdAndPred(data: string, prefixLen: number): [string, string] {
  const rest = data.slice(prefixLen);
  const poolId = rest.slice(0, 36);
  const pred = rest.slice(37); // pula o `:` separador
  return [poolId, pred];
}

function parsePrediction(
  modality: PoolRow['modality'],
  pred: string,
): ResultadoPrediction | DuplaChancePrediction | TotalDeGolsPrediction | PlacarExatoPrediction {
  switch (modality) {
    case 'dupla_chance_resultado':
      if (pred === 'h') return 'home';
      if (pred === 'd') return 'draw';
      return 'away';
    case 'dupla_chance':
      return pred as DuplaChancePrediction; // '1x' | '12' | 'x2'
    case 'total_de_gols': {
      const [c, t] = pred.split('_');
      const choice    = (c === 'o' ? 'over' : 'under') as 'over' | 'under';
      const threshold = parseFloat(t) as 1.5 | 2.5 | 3.5;
      const gols: TotalDeGolsPrediction = { choice, threshold };
      return gols;
    }
    case 'placar_exato': {
      const [h, a] = pred.split('-').map(Number);
      return { homeScore: h, awayScore: a };
    }
  }
}

export function registerPoolsActions(bot: { action: (...args: unknown[]) => void }, db: Db) {

  // gl_p:{matchId} — selecionar tier de entrada
  (bot as any).action(/^gl_p:(.+)$/, async (ctx: MatchCtx) => {
    await ctx.answerCbQuery();
    const matchId = ctx.match[1];

    const match = await db.matches.findById(matchId);
    if (!match) { await ctx.answerCbQuery('Partida não encontrada.'); return; }

    const pools = await db.pools.findOpenByMatch(matchId);

    if (pools.length === 0) {
      await safeEdit(ctx, msgNoPools(), {
        parse_mode: 'Markdown',
        reply_markup: kbBackToMenu().reply_markup,
      });
      return;
    }

    const tiers = [...new Set(pools.map(p => p.tier_brl))].sort((a, b) => a - b);

    await safeEdit(ctx, msgTierSelect(match), {
      parse_mode: 'Markdown',
      reply_markup: kbTierSelect(tiers, matchId).reply_markup,
    });
  });

  // gl_tier:{matchId}:{tier} — pools filtradas pelo tier escolhido
  (bot as any).action(/^gl_tier:(.{36}):(\d+)$/, async (ctx: MatchCtx) => {
    await ctx.answerCbQuery();
    const matchId = ctx.match[1];
    const tier = parseInt(ctx.match[2], 10);

    const match = await db.matches.findById(matchId);
    if (!match) { await ctx.answerCbQuery('Partida não encontrada.'); return; }

    const allPools = await db.pools.findOpenByMatch(matchId);
    const pools = allPools.filter(p => p.tier_brl === tier);

    if (pools.length === 0) {
      await safeEdit(ctx, msgNoPools(), {
        parse_mode: 'Markdown',
        reply_markup: kbBackToMenu().reply_markup,
      });
      return;
    }

    const counts = await Promise.all(
      pools.map(p => db.entries.findByPool(p.id).then(e => [p.id, e.length] as [string, number])),
    );
    const entryCounts = Object.fromEntries(counts);

    await safeEdit(ctx, msgPools(match), {
      parse_mode: 'Markdown',
      reply_markup: kbPools(pools, matchId, entryCounts).reply_markup,
    });
  });

  // gl_e:{poolId} — detalhe da pool + opções de palpite
  (bot as any).action(/^gl_e:(.{36})$/, async (ctx: MatchCtx) => {
    await ctx.answerCbQuery();
    const poolId = ctx.match[1];

    const pool = await db.pools.findById(poolId);
    if (!pool || pool.status !== 'open') {
      await ctx.reply('❌ Esta lista não está mais disponível.');
      return;
    }

    const match = await db.matches.findById(pool.match_id);
    if (!match) { await ctx.reply('❌ Partida não encontrada.'); return; }

    const entries = await db.entries.findByPool(poolId);
    const entryCount = entries.length;

    await safeEdit(ctx, msgPoolDetail(pool, match, entryCount), {
      parse_mode: 'Markdown',
      reply_markup: kbPrediction(pool, match.id).reply_markup,
    });
  });

  // gl_pr:{poolId}:{pred} — tela de confirmação do palpite
  (bot as any).action(/^gl_pr:.{36}:.+$/, async (ctx: BotContext) => {
    const data = (ctx.callbackQuery as any).data as string;
    const [poolId, pred] = extractPoolIdAndPred(data, 'gl_pr:'.length);

    const pool = await db.pools.findById(poolId);
    if (!pool || pool.status !== 'open') {
      await ctx.answerCbQuery('❌ Esta lista não está mais disponível.', { show_alert: true });
      return;
    }

    const match = await db.matches.findById(pool.match_id);
    if (!match) {
      await ctx.answerCbQuery('❌ Partida não encontrada.', { show_alert: true });
      return;
    }

    const user = ctx.session.user!;
    if (user.virtual_balance < pool.tier_brl) {
      await ctx.answerCbQuery('❌ Saldo insuficiente.', { show_alert: true });
      return;
    }

    const existingCount = await db.entries.countByUserAndPool(user.id, poolId);
    const permission = canUserEnterPool(existingCount);
    if (!permission.allowed) {
      await ctx.answerCbQuery(`❌ ${permission.reason}`, { show_alert: true });
      return;
    }

    await ctx.answerCbQuery();
    const predLabel = decodePred(pool.modality, pred, match.home_team, match.away_team);

    await safeEdit(ctx, msgConfirmEntry(pool, match, predLabel, user.virtual_balance), {
      parse_mode: 'Markdown',
      reply_markup: kbConfirm(poolId, pred).reply_markup,
    });
  });

  // gl_ok:{poolId}:{pred} — processa a entrada
  (bot as any).action(/^gl_ok:.{36}:.+$/, async (ctx: BotContext) => {
    const data = (ctx.callbackQuery as any).data as string;
    const [poolId, pred] = extractPoolIdAndPred(data, 'gl_ok:'.length);

    const user = ctx.session.user!;

    const pool = await db.pools.findById(poolId);
    if (!pool || pool.status !== 'open') {
      await ctx.answerCbQuery('❌ Esta lista foi fechada ou cancelada.', { show_alert: true });
      return;
    }

    const match = await db.matches.findById(pool.match_id);
    if (!match) {
      await ctx.answerCbQuery('❌ Partida não encontrada.', { show_alert: true });
      return;
    }

    if (user.virtual_balance < pool.tier_brl) {
      await ctx.answerCbQuery('❌ Saldo insuficiente.', { show_alert: true });
      return;
    }

    const existingCount = await db.entries.countByUserAndPool(user.id, poolId);
    const permission = canUserEnterPool(existingCount);
    if (!permission.allowed) {
      await ctx.answerCbQuery(`❌ ${permission.reason}`, { show_alert: true });
      return;
    }

    await ctx.answerCbQuery();
    try {
      const prediction = parsePrediction(pool.modality, pred);
      const newBalance = user.virtual_balance - pool.tier_brl;

      // Cria entrada
      await db.entries.create({
        pool_id: poolId,
        user_id: user.id,
        prediction: prediction as unknown as Json,
        amount: pool.tier_brl,
      });

      // Registra transação
      await db.transactions.create({
        user_id: user.id,
        type: 'entry',
        amount: pool.tier_brl,
        balance_after: newBalance,
        pool_id: poolId,
        description: `Entrada: ${match.home_team} × ${match.away_team}`,
      });

      // Debita saldo
      await db.users.updateBalance(user.id, newBalance);

      const predLabel = decodePred(pool.modality, pred, match.home_team, match.away_team);

      await safeEdit(ctx, msgEntryOk(pool, predLabel), {
        parse_mode: 'Markdown',
        reply_markup: kbBackToMenu().reply_markup,
      });
    } catch (err) {
      console.error('[gl_ok] Erro ao processar entrada:', err);
      await ctx.reply('⚠️ Erro ao processar entrada. Tente novamente.');
    }
  });
}
