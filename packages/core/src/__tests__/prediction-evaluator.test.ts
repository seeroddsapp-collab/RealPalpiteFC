import { describe, it, expect } from 'vitest';
import { evaluatePrediction } from '../prediction-evaluator';

describe('Dupla Chance / Resultado', () => {
  it('acerta vitória do mandante', () => {
    expect(
      evaluatePrediction({
        modality: 'dupla_chance_resultado',
        prediction: 'home',
        result: { homeScore: 2, awayScore: 1 },
      })
    ).toBe(true);
  });

  it('acerta vitória do visitante', () => {
    expect(
      evaluatePrediction({
        modality: 'dupla_chance_resultado',
        prediction: 'away',
        result: { homeScore: 0, awayScore: 1 },
      })
    ).toBe(true);
  });

  it('acerta empate', () => {
    expect(
      evaluatePrediction({
        modality: 'dupla_chance_resultado',
        prediction: 'draw',
        result: { homeScore: 1, awayScore: 1 },
      })
    ).toBe(true);
  });

  it('erra quando prevê mandante mas visitante vence', () => {
    expect(
      evaluatePrediction({
        modality: 'dupla_chance_resultado',
        prediction: 'home',
        result: { homeScore: 0, awayScore: 2 },
      })
    ).toBe(false);
  });
});

describe('Total de Gols (Over/Under) — Regra 9: apenas tempo normal', () => {
  it('acerta over 2.5 com 3 gols', () => {
    expect(
      evaluatePrediction({
        modality: 'total_de_gols',
        prediction: { choice: 'over', threshold: 2.5 },
        result: { homeScore: 2, awayScore: 1 },
      })
    ).toBe(true);
  });

  it('acerta under 2.5 com 2 gols', () => {
    expect(
      evaluatePrediction({
        modality: 'total_de_gols',
        prediction: { choice: 'under', threshold: 2.5 },
        result: { homeScore: 1, awayScore: 1 },
      })
    ).toBe(true);
  });

  it('erra over 2.5 com 1 gol', () => {
    expect(
      evaluatePrediction({
        modality: 'total_de_gols',
        prediction: { choice: 'over', threshold: 2.5 },
        result: { homeScore: 1, awayScore: 0 },
      })
    ).toBe(false);
  });

  it('acerta over 1.5 com 2 gols', () => {
    expect(
      evaluatePrediction({
        modality: 'total_de_gols',
        prediction: { choice: 'over', threshold: 1.5 },
        result: { homeScore: 1, awayScore: 1 },
      })
    ).toBe(true);
  });

  it('acerta under 3.5 com 3 gols', () => {
    expect(
      evaluatePrediction({
        modality: 'total_de_gols',
        prediction: { choice: 'under', threshold: 3.5 },
        result: { homeScore: 2, awayScore: 1 },
      })
    ).toBe(true);
  });

  it('erra under 1.5 com 2 gols', () => {
    expect(
      evaluatePrediction({
        modality: 'total_de_gols',
        prediction: { choice: 'under', threshold: 1.5 },
        result: { homeScore: 1, awayScore: 1 },
      })
    ).toBe(false);
  });
});

describe('Placar Exato', () => {
  it('acerta placar correto', () => {
    expect(
      evaluatePrediction({
        modality: 'placar_exato',
        prediction: { homeScore: 2, awayScore: 1 },
        result: { homeScore: 2, awayScore: 1 },
      })
    ).toBe(true);
  });

  it('erra quando placar é invertido', () => {
    expect(
      evaluatePrediction({
        modality: 'placar_exato',
        prediction: { homeScore: 1, awayScore: 2 },
        result: { homeScore: 2, awayScore: 1 },
      })
    ).toBe(false);
  });

  it('erra quando um dos placares difere', () => {
    expect(
      evaluatePrediction({
        modality: 'placar_exato',
        prediction: { homeScore: 2, awayScore: 0 },
        result: { homeScore: 2, awayScore: 1 },
      })
    ).toBe(false);
  });
});
