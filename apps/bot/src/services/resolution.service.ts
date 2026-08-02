import {
  calculatePool,
  evaluatePrediction,
  type EntryInput,
  type EvaluationContext,
  type MatchResult,
  type ResultadoPrediction,
  type DuplaChancePrediction,
  type TotalDeGolsPrediction,
  type PlacarExatoPrediction,
} from '@realpalpitefc/core';
import type { Db, PoolRow, Json } from '@realpalpitefc/database';

export type Notification = {
  telegramId: number;
  message: string;
};

export type ResolutionResult = {
  scenario: string;
  notifications: Notification[];
};

function buildEvalContext(pool: PoolRow, prediction: Json, result: MatchResult): EvaluationContext {
  switch (pool.modality) {
    case 'dupla_chance_resultado':
      return {
        modality: 'dupla_chance_resultado',
        prediction: prediction as ResultadoPrediction,
        result,
      };
    case 'dupla_chance':
      return {
        modality: 'dupla_chance',
        prediction: prediction as DuplaChancePrediction,
        result,
      };
    case 'total_de_gols':
      return {
        modality: 'total_de_gols',
        prediction: prediction as TotalDeGolsPrediction,
        result,
      };
    case 'placar_exato':
      return {
        modality: 'placar_exato',
        prediction: prediction as PlacarExatoPrediction,
        result,
      };
  }
}

export async function resolvePool(
  db: Db,
  pool: PoolRow,
  matchResult: MatchResult,
  cancelled = false,
): Promise<ResolutionResult> {
  // Garante que a pool está fechada antes de resolver
  if (pool.status === 'open') {
    await db.pools.close(pool.id);
  }
  if (pool.status === 'resolved' || pool.status === 'cancelled') {
    return { scenario: 'already_done', notifications: [] };
  }

  const dbEntries = await db.entries.findByPool(pool.id);
  if (dbEntries.length === 0) {
    await db.pools.cancel(pool.id);
    return { scenario: 'no_entries', notifications: [] };
  }

  // Avalia palpites (Regra 9: apenas tempo normal)
  const entryInputs: EntryInput[] = dbEntries.map(e => {
    const isWinner = cancelled
      ? false
      : evaluatePrediction(buildEvalContext(pool, e.prediction, matchResult));
    return { id: e.id, userId: e.user_id, amount: e.amount, isWinner };
  });

  const calcResult = calculatePool({ entries: entryInputs, matchCancelled: cancelled });

  // Marca winners/losers no banco
  const winnerIds = entryInputs.filter(e => e.isWinner).map(e => e.id);
  await db.entries.resolveEntries(pool.id, winnerIds);

  const notifications: Notification[] = [];

  // Cria transações e atualiza saldos
  for (const payout of calcResult.payouts) {
    const user = await db.users.findById(payout.userId);
    if (!user) continue;

    const type = calcResult.scenario === 'with_winners'
      ? 'prize'
      : cancelled ? 'refund' : 'refund';

    const description = cancelled
      ? `Devolução (partida cancelada)`
      : calcResult.scenario === 'with_winners'
        ? `Prêmio — ${pool.modality}`
        : `Devolução (sem acertador) — ${pool.modality}`;

    const newBalance = user.virtual_balance + payout.amount;

    await db.transactions.create({
      user_id: payout.userId,
      type,
      amount: payout.amount,
      balance_after: newBalance,
      pool_id: pool.id,
      description,
    });

    await db.users.updateBalance(payout.userId, newBalance);

    // Monta notificação push
    let msg: string;
    if (calcResult.scenario === 'with_winners') {
      msg = `🏆 *Você ganhou!* Prêmio de *R$${payout.amount.toFixed(2)}* creditado!\n_${pool.modality}_`;
    } else if (payout.amount > 0) {
      msg = `↩️ *Devolução* de *R$${payout.amount.toFixed(2)}* creditada!\n_${description}_`;
    } else {
      msg = `📋 _Lista encerrada sem ganhadores._`;
    }

    notifications.push({ telegramId: user.telegram_id, message: msg });
  }

  await db.pools.resolve(pool.id);

  return { scenario: calcResult.scenario, notifications };
}
