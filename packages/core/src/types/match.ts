export type MatchStatus =
  | 'scheduled'
  | 'in_progress'
  | 'finished'
  | 'cancelled'
  | 'postponed';

export type MatchResult = {
  homeScore: number;
  awayScore: number;
};

export type Match = {
  id: string;
  championshipId: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: Date;
  status: MatchStatus;
  result?: MatchResult;
};
