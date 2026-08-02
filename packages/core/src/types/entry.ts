// Resultado 1X2 — acerta 1 dos 3 (casa, empate, fora)
export type ResultadoPrediction = 'home' | 'draw' | 'away';

// Dupla Chance — acerta 1 de 3 combinações (2 desfechos cobertos)
export type DuplaChancePrediction = '1x' | '12' | 'x2';

export type TotalDeGolsPrediction = {
  choice: 'over' | 'under';
  threshold: 1.5 | 2.5 | 3.5;
};

export type PlacarExatoPrediction = {
  homeScore: number;
  awayScore: number;
};

export type Prediction =
  | ResultadoPrediction
  | DuplaChancePrediction
  | TotalDeGolsPrediction
  | PlacarExatoPrediction;

export type Entry = {
  id: string;
  poolId: string;
  userId: string;
  prediction: Prediction;
  amount: number; // igual ao tierBrl do pool
  isWinner?: boolean;
  createdAt: Date;
};
