import { describe, it, expect } from 'vitest';
import { shouldPoolClose, canUserEnterPool, POOL_LOCK_MINUTES_BEFORE_KICKOFF } from '../list-rules';

// ─── Regra 1: fechamento 5 min antes do kickoff ───────────────────────────────

describe('Regra 1 — shouldPoolClose', () => {
  const kickoff = new Date('2025-10-15T20:00:00Z');

  it('não fecha quando faltam mais de 5 minutos', () => {
    const now = new Date('2025-10-15T19:54:00Z'); // 6 min antes
    expect(shouldPoolClose(kickoff, now)).toBe(false);
  });

  it('fecha quando faltam exatamente 5 minutos', () => {
    const now = new Date('2025-10-15T19:55:00Z'); // exatos 5 min
    expect(shouldPoolClose(kickoff, now)).toBe(true);
  });

  it('fecha quando faltam menos de 5 minutos', () => {
    const now = new Date('2025-10-15T19:57:30Z'); // 2,5 min
    expect(shouldPoolClose(kickoff, now)).toBe(true);
  });

  it('fecha no horário exato do kickoff', () => {
    expect(shouldPoolClose(kickoff, kickoff)).toBe(true);
  });

  it('fecha após o kickoff (jogo já começou)', () => {
    const now = new Date('2025-10-15T20:10:00Z');
    expect(shouldPoolClose(kickoff, now)).toBe(true);
  });

  it(`usa a constante ${POOL_LOCK_MINUTES_BEFORE_KICKOFF} minutos como limite`, () => {
    const margem = POOL_LOCK_MINUTES_BEFORE_KICKOFF * 60 * 1000;
    const exatamenteNaFronteira = new Date(kickoff.getTime() - margem);
    expect(shouldPoolClose(kickoff, exatamenteNaFronteira)).toBe(true);
  });
});

// ─── Regra 7: máximo de 2 entradas por usuário ───────────────────────────────

describe('Regra 7 — canUserEnterPool', () => {
  it('permite quando o usuário não tem entradas', () => {
    const result = canUserEnterPool(0);
    expect(result.allowed).toBe(true);
  });

  it('permite quando o usuário tem 1 entrada', () => {
    const result = canUserEnterPool(1);
    expect(result.allowed).toBe(true);
  });

  it('bloqueia quando o usuário já tem 2 entradas', () => {
    const result = canUserEnterPool(2);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toContain('2');
    }
  });

  it('bloqueia quando o usuário tem mais de 2 entradas (estado inconsistente)', () => {
    const result = canUserEnterPool(3);
    expect(result.allowed).toBe(false);
  });
});
