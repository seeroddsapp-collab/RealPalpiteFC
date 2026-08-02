const FEE_WITH_WINNER = 0.05; // 5% — Regra 3
const FEE_NO_WINNER = 0.10;   // 10% — Regra 4

function toCents(brl: number): number {
  return Math.round(brl * 100);
}

function toBrl(cents: number): number {
  return cents / 100;
}

export type EntryInput = {
  id: string;
  userId: string;
  amount: number; // em BRL
  isWinner: boolean;
};

export type Payout = {
  userId: string;
  amount: number; // valor a creditar em BRL
};

export type CalculationScenario =
  | 'with_winners'
  | 'no_winner'
  | 'single_participant'
  | 'cancelled';

export type CalculationResult = {
  scenario: CalculationScenario;
  totalCollected: number;
  houseFeeNominal: number;   // taxa percentual (5% ou 10%)
  remainderRetained: number; // resíduo de arredondamento — Regra 8
  payouts: Payout[];         // um registro por userId (já agregado)
};

export type PoolCalculationInput = {
  entries: EntryInput[];
  matchCancelled: boolean; // true para cancelado ou adiado — Regra 6
};

export function calculatePool({
  entries,
  matchCancelled,
}: PoolCalculationInput): CalculationResult {
  const totalCents = entries.reduce((sum, e) => sum + toCents(e.amount), 0);

  // Regra 6: cancelado ou adiado → devolução 100%
  if (matchCancelled) {
    return buildFullRefund(entries, totalCents, 'cancelled');
  }

  // Regra 5: apenas 1 participante → devolução 100%
  const uniqueUsers = new Set(entries.map((e) => e.userId));
  if (uniqueUsers.size === 1) {
    return buildFullRefund(entries, totalCents, 'single_participant');
  }

  const winningEntries = entries.filter((e) => e.isWinner);

  // Regras 2 e 3: há acertadores
  if (winningEntries.length > 0) {
    return buildWithWinners(winningEntries, totalCents);
  }

  // Regra 4: sem acertadores, 2+ participantes
  return buildNoWinner(entries, totalCents);
}

function buildFullRefund(
  entries: EntryInput[],
  totalCents: number,
  scenario: 'cancelled' | 'single_participant',
): CalculationResult {
  const payoutMap = new Map<string, number>();
  for (const entry of entries) {
    const c = toCents(entry.amount);
    payoutMap.set(entry.userId, (payoutMap.get(entry.userId) ?? 0) + c);
  }

  return {
    scenario,
    totalCollected: toBrl(totalCents),
    houseFeeNominal: 0,
    remainderRetained: 0,
    payouts: toPayouts(payoutMap),
  };
}

function buildWithWinners(
  winningEntries: EntryInput[],
  totalCents: number,
): CalculationResult {
  const houseFeeCents = Math.floor(totalCents * FEE_WITH_WINNER);
  const prizeCents = totalCents - houseFeeCents;

  // Regra 3: prêmio dividido por bilhete vencedor (não por usuário)
  const prizePerTicketCents = Math.floor(prizeCents / winningEntries.length);

  const payoutMap = new Map<string, number>();
  for (const entry of winningEntries) {
    payoutMap.set(entry.userId, (payoutMap.get(entry.userId) ?? 0) + prizePerTicketCents);
  }

  // Regra 8: resíduo de arredondamento fica com a casa
  const totalPaidCents = prizePerTicketCents * winningEntries.length;
  const remainderCents = prizeCents - totalPaidCents;

  return {
    scenario: 'with_winners',
    totalCollected: toBrl(totalCents),
    houseFeeNominal: toBrl(houseFeeCents),
    remainderRetained: toBrl(remainderCents),
    payouts: toPayouts(payoutMap),
  };
}

function buildNoWinner(entries: EntryInput[], totalCents: number): CalculationResult {
  const houseFeeCents = Math.floor(totalCents * FEE_NO_WINNER);
  const refundCents = totalCents - houseFeeCents;

  // Regra 4: devolução proporcional ao valor que cada um entrou
  const payoutMap = new Map<string, number>();
  let totalRefundedCents = 0;

  for (const entry of entries) {
    const entryCents = toCents(entry.amount);
    const entryRefundCents = Math.floor((entryCents * refundCents) / totalCents);
    payoutMap.set(entry.userId, (payoutMap.get(entry.userId) ?? 0) + entryRefundCents);
    totalRefundedCents += entryRefundCents;
  }

  // Regra 8: resíduo fica com a casa
  const remainderCents = refundCents - totalRefundedCents;

  return {
    scenario: 'no_winner',
    totalCollected: toBrl(totalCents),
    houseFeeNominal: toBrl(houseFeeCents),
    remainderRetained: toBrl(remainderCents),
    payouts: toPayouts(payoutMap),
  };
}

function toPayouts(map: Map<string, number>): Payout[] {
  return [...map.entries()].map(([userId, cents]) => ({ userId, amount: toBrl(cents) }));
}
