import { describe, it, expect } from 'vitest';
import { calculatePool } from '../pool-calculator';
import type { EntryInput } from '../pool-calculator';

// Helpers
const entry = (id: string, userId: string, amount: number, isWinner: boolean): EntryInput => ({
  id,
  userId,
  amount,
  isWinner,
});

const payout = (userId: string, amount: number) => ({ userId, amount });

const sortPayouts = (payouts: { userId: string; amount: number }[]) =>
  [...payouts].sort((a, b) => a.userId.localeCompare(b.userId));

// ─── Regra 6: jogo cancelado ──────────────────────────────────────────────────

describe('Regra 6 — jogo cancelado ou adiado', () => {
  it('devolve 100% a todos os participantes sem taxa', () => {
    const result = calculatePool({
      entries: [
        entry('e1', 'userA', 10, false),
        entry('e2', 'userB', 10, false),
        entry('e3', 'userC', 10, false),
      ],
      matchCancelled: true,
    });

    expect(result.scenario).toBe('cancelled');
    expect(result.totalCollected).toBe(30);
    expect(result.houseFeeNominal).toBe(0);
    expect(result.remainderRetained).toBe(0);
    expect(sortPayouts(result.payouts)).toEqual(
      sortPayouts([payout('userA', 10), payout('userB', 10), payout('userC', 10)])
    );
  });

  it('cancela corretamente quando usuário tem 2 entradas', () => {
    const result = calculatePool({
      entries: [
        entry('e1', 'userA', 10, false),
        entry('e2', 'userA', 10, false),
        entry('e3', 'userB', 10, false),
      ],
      matchCancelled: true,
    });

    expect(result.scenario).toBe('cancelled');
    expect(result.houseFeeNominal).toBe(0);
    expect(sortPayouts(result.payouts)).toEqual(
      sortPayouts([payout('userA', 20), payout('userB', 10)])
    );
  });
});

// ─── Regra 5: único participante ─────────────────────────────────────────────

describe('Regra 5 — único participante ao fechar', () => {
  it('devolve 100% sem taxa com 1 entrada', () => {
    const result = calculatePool({
      entries: [entry('e1', 'userA', 25, false)],
      matchCancelled: false,
    });

    expect(result.scenario).toBe('single_participant');
    expect(result.totalCollected).toBe(25);
    expect(result.houseFeeNominal).toBe(0);
    expect(result.remainderRetained).toBe(0);
    expect(result.payouts).toEqual([payout('userA', 25)]);
  });

  it('devolve 100% sem taxa com 2 entradas do mesmo usuário', () => {
    const result = calculatePool({
      entries: [
        entry('e1', 'userA', 10, false),
        entry('e2', 'userA', 10, false),
      ],
      matchCancelled: false,
    });

    expect(result.scenario).toBe('single_participant');
    expect(result.totalCollected).toBe(20);
    expect(result.houseFeeNominal).toBe(0);
    expect(result.payouts).toEqual([payout('userA', 20)]);
  });
});

// ─── Regras 2 e 3: com acertador(es) ─────────────────────────────────────────

describe('Regras 2 e 3 — com acertador(es)', () => {
  it('prêmio = 95% do total; taxa da casa = 5%; 1 vencedor recebe tudo', () => {
    // 3 entradas × R$10 = R$30 total
    // Taxa (5%): R$1.50 | Prêmio: R$28.50
    const result = calculatePool({
      entries: [
        entry('e1', 'userA', 10, true),
        entry('e2', 'userB', 10, false),
        entry('e3', 'userC', 10, false),
      ],
      matchCancelled: false,
    });

    expect(result.scenario).toBe('with_winners');
    expect(result.totalCollected).toBe(30);
    expect(result.houseFeeNominal).toBe(1.5);
    expect(result.remainderRetained).toBe(0);
    expect(result.payouts).toEqual([payout('userA', 28.5)]);
  });

  it('prêmio dividido igualmente entre bilhetes vencedores (Regra 3)', () => {
    // 4 entradas × R$10 = R$40 | Taxa: R$2 | Prêmio: R$38
    // 2 vencedores (userA e userB) → R$19 cada
    const result = calculatePool({
      entries: [
        entry('e1', 'userA', 10, true),
        entry('e2', 'userB', 10, true),
        entry('e3', 'userC', 10, false),
        entry('e4', 'userD', 10, false),
      ],
      matchCancelled: false,
    });

    expect(result.scenario).toBe('with_winners');
    expect(result.houseFeeNominal).toBe(2);
    expect(result.remainderRetained).toBe(0);
    expect(sortPayouts(result.payouts)).toEqual(
      sortPayouts([payout('userA', 19), payout('userB', 19)])
    );
  });

  it('usuário com 2 bilhetes vencedores recebe 2x o prêmio por bilhete (Regra 7)', () => {
    // 4 entradas × R$10 = R$40 | Taxa: R$2 | Prêmio: R$38
    // userA tem 2 bilhetes vencedores → prêmio por bilhete = R$38/2 = R$19 → total R$38
    const result = calculatePool({
      entries: [
        entry('e1', 'userA', 10, true),
        entry('e2', 'userA', 10, true),
        entry('e3', 'userB', 10, false),
        entry('e4', 'userC', 10, false),
      ],
      matchCancelled: false,
    });

    expect(result.scenario).toBe('with_winners');
    expect(result.payouts).toEqual([payout('userA', 38)]);
  });
});

// ─── Regra 8: resíduo de arredondamento fica com a casa ──────────────────────

describe('Regra 8 — resíduo de arredondamento fica com a casa', () => {
  it('retém o centavo restante quando prêmio não divide exatamente', () => {
    // 4 entradas × R$5 = R$20 total → 2000 centavos
    // Taxa (5%): floor(2000 × 0.05) = 100 centavos = R$1.00
    // Prêmio: 1900 centavos
    // 3 bilhetes vencedores: floor(1900/3) = 633 centavos cada
    // Total pago: 633 × 3 = 1899 centavos
    // Resíduo: 1 centavo = R$0.01 → fica com a casa
    const result = calculatePool({
      entries: [
        entry('e1', 'userA', 5, true),
        entry('e2', 'userB', 5, true),
        entry('e3', 'userC', 5, true),
        entry('e4', 'userD', 5, false),
      ],
      matchCancelled: false,
    });

    expect(result.remainderRetained).toBe(0.01);
    expect(result.houseFeeNominal).toBe(1.0);

    const totalPaid = result.payouts.reduce((s, p) => s + p.amount, 0);
    const totalRetained = result.houseFeeNominal + result.remainderRetained;
    expect(totalPaid + totalRetained).toBeCloseTo(result.totalCollected, 10);
  });
});

// ─── Regra 4: sem acertador, 2+ participantes ────────────────────────────────

describe('Regra 4 — sem acertador com 2+ participantes', () => {
  it('taxa 10%; devolução proporcional de 90%', () => {
    // 2 entradas × R$10 = R$20 | Taxa: R$2 | Devolução: R$18
    // R$9 por entrada
    const result = calculatePool({
      entries: [
        entry('e1', 'userA', 10, false),
        entry('e2', 'userB', 10, false),
      ],
      matchCancelled: false,
    });

    expect(result.scenario).toBe('no_winner');
    expect(result.totalCollected).toBe(20);
    expect(result.houseFeeNominal).toBe(2);
    expect(result.remainderRetained).toBe(0);
    expect(sortPayouts(result.payouts)).toEqual(
      sortPayouts([payout('userA', 9), payout('userB', 9)])
    );
  });

  it('usuário com 2 entradas recebe devolução proporcional dobrada', () => {
    // userA tem 2 entradas, userB tem 1 → userA entrou R$20, userB R$10
    // Total: R$30 | Taxa (10%): R$3 | Devolução: R$27
    // userA: 20/30 × 27 = R$18 | userB: 10/30 × 27 = R$9
    const result = calculatePool({
      entries: [
        entry('e1', 'userA', 10, false),
        entry('e2', 'userA', 10, false),
        entry('e3', 'userB', 10, false),
      ],
      matchCancelled: false,
    });

    expect(result.scenario).toBe('no_winner');
    expect(result.houseFeeNominal).toBe(3);
    expect(sortPayouts(result.payouts)).toEqual(
      sortPayouts([payout('userA', 18), payout('userB', 9)])
    );
  });

  it('soma dos pagamentos + taxas = total arrecadado (conservação de valor)', () => {
    const result = calculatePool({
      entries: [
        entry('e1', 'userA', 25, false),
        entry('e2', 'userB', 25, false),
        entry('e3', 'userC', 25, false),
      ],
      matchCancelled: false,
    });

    const totalPaid = result.payouts.reduce((s, p) => s + p.amount, 0);
    const totalRetained = result.houseFeeNominal + result.remainderRetained;
    expect(totalPaid + totalRetained).toBeCloseTo(result.totalCollected, 10);
  });
});
