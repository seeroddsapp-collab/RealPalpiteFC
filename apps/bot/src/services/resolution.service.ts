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

export type UserPoolResult = {
  telegramId: number;
  userId: string;
  modality: PoolRow['modality'];
  tier: number;
  creditType: 'prize' | 'refund';
  amount: number;
  newBalance: number;
};

export type ResolutionResult = {
  scenario: string;
  userResults: UserPoolResult[];
  totalWinners: number;
  totalPrizeBrl: number;
  winnerInfo: { username: string | null; prize: number } | null;
};

function buildEvalContext(pool: PoolRow, prediction: Json, result: MatchResult): EvaluationContext {
  switch (pool.modality) {
    case 'dupla_chance_resultado':
      return { modality: 'dupla_chance_resultado', prediction: prediction as ResultadoPrediction, result };
    case 'dupla_chance':
      return { modality: 'dupla_chance', prediction: prediction as DuplaChancePrediction, result };
    case 'total_de_gols':
      return { modality: 'total_de_gols', prediction: prediction as TotalDeGolsPrediction, result };
    case 'placar_exato':
      return { modality: 'placar_exato', prediction: prediction as PlacarExatoPrediction, result };
  }
}

export async function resolvePool(
  db: Db,
  pool: PoolRow,
  matchResult: MatchResult,
  cancelled = false,
): Promise<ResolutionResult> {
  if (pool.status === 'open') {
    await db.pools.close(pool.id);
  }
  if (pool.status === 'resolved' || pool.status === 'cancelled') {
    return { scenario: 'already_done', userResults: [], totalWinners: 0, totalPrizeBrl: 0, winnerInfo: null };
  }

  const dbEntries = await db.entries.findByPool(pool.id);
  if (dbEntries.length === 0) {
    await db.pools.cancel(pool.id);
    return { scenario: 'no_entries', userResults: [], totalWinners: 0, totalPrizeBrl: 0, winnerInfo: null };
  }

  const entryInputs: EntryInput[] = dbEntries.map(e => {
    const isWinner = cancelled
      ? false
      : evaluatePrediction(buildEvalContext(pool, e.prediction, matchResult));
    return { id: e.id, userId: e.user_id, amount: e.amount, isWinner };
  });

  const calcResult = calculatePool({ entries: entryInputs, matchCancelled: cancelled });

  const winnerIds = entryInputs.filter(e => e.isWinner).map(e => e.id);
  await db.entries.resolveEntries(pool.id, winnerIds);

  const userResults: UserPoolResult[] = [];
  let totalWinners = 0;
  let totalPrizeBrl = 0;
  let winnerInfo: { username: string | null; prize: number } | null = null;

  for (const payout of calcResult.payouts) {
    if (payout.amount <= 0) continue;

    const user = await db.users.findById(payout.userId);
    if (!user) continue;

    const isWinner = entryInputs.find(e => e.userId === payout.userId)?.isWinner ?? false;
    const creditType: 'prize' | 'refund' = isWinner ? 'prize' : 'refund';

    if (isWinner) {
      totalWinners++;
      totalPrizeBrl += payout.amount;
      if (!winnerInfo) winnerInfo = { username: user.username ?? null, prize: payout.amount };
    }

    const description = cancelled
      ? `Devolução (partida cancelada)`
      : isWinner
        ? `Prêmio — ${pool.modality}`
        : `Devolução (sem acertador) — ${pool.modality}`;

    const newBalance = user.virtual_balance + payout.amount;

    await db.transactions.create({
      user_id: payout.userId,
      type: creditType,
      amount: payout.amount,
      balance_after: newBalance,
      pool_id: pool.id,
      description,
    });

    await db.users.updateBalance(payout.userId, newBalance);

    userResults.push({
      telegramId: user.telegram_id,
      userId: payout.userId,
      modality: pool.modality,
      tier: pool.tier_brl,
      creditType,
      amount: payout.amount,
      newBalance,
    });
  }

  await db.pools.resolve(pool.id);

  return { scenario: calcResult.scenario, userResults, totalWinners, totalPrizeBrl, winnerInfo };
}
