import type {
  MatchResult,
  ResultadoPrediction,
  DuplaChancePrediction,
  TotalDeGolsPrediction,
  PlacarExatoPrediction,
} from './types';

export type EvaluationContext =
  | {
      modality: 'dupla_chance_resultado';
      prediction: ResultadoPrediction;
      result: MatchResult;
    }
  | {
      modality: 'dupla_chance';
      prediction: DuplaChancePrediction;
      result: MatchResult;
    }
  | {
      modality: 'total_de_gols';
      prediction: TotalDeGolsPrediction;
      result: MatchResult;
    }
  | {
      modality: 'placar_exato';
      prediction: PlacarExatoPrediction;
      result: MatchResult;
    };

export function evaluatePrediction(ctx: EvaluationContext): boolean {
  switch (ctx.modality) {
    case 'dupla_chance_resultado': {
      const actual = getMatchOutcome(ctx.result);
      return ctx.prediction === actual;
    }
    case 'dupla_chance': {
      const outcome = getMatchOutcome(ctx.result);
      if (ctx.prediction === '1x') return outcome === 'home' || outcome === 'draw';
      if (ctx.prediction === 'x2') return outcome === 'draw' || outcome === 'away';
      return outcome === 'home' || outcome === 'away'; // '12'
    }
    case 'total_de_gols': {
      const total = ctx.result.homeScore + ctx.result.awayScore;
      return ctx.prediction.choice === 'over'
        ? total > ctx.prediction.threshold
        : total < ctx.prediction.threshold;
    }
    case 'placar_exato': {
      return (
        ctx.result.homeScore === ctx.prediction.homeScore &&
        ctx.result.awayScore === ctx.prediction.awayScore
      );
    }
  }
}

function getMatchOutcome(result: MatchResult): ResultadoPrediction {
  if (result.homeScore > result.awayScore) return 'home';
  if (result.awayScore > result.homeScore) return 'away';
  return 'draw';
}
