import type { ProviderMatchStatus } from '../types';

export type FootballDataStatus =
  | 'TIMED'
  | 'SCHEDULED'
  | 'IN_PLAY'
  | 'PAUSED'
  | 'FINISHED'
  | 'CANCELLED'
  | 'POSTPONED'
  | 'SUSPENDED'
  | 'AWARDED';

export type FootballDataScore = {
  fullTime: { home: number | null; away: number | null };
};

export type FootballDataMatch = {
  id: number;
  homeTeam: { name: string };
  awayTeam: { name: string };
  utcDate: string;
  status: FootballDataStatus;
  score: FootballDataScore;
};

export type FootballDataMatchResponse = FootballDataMatch;

export type FootballDataCompetitionMatchesResponse = {
  matches: FootballDataMatch[];
};

export function parseFootballDataStatus(status: FootballDataStatus): ProviderMatchStatus {
  switch (status) {
    case 'FINISHED':
    case 'AWARDED':
      return 'finished';
    case 'IN_PLAY':
    case 'PAUSED':
      return 'in_progress';
    case 'POSTPONED':
      return 'postponed';
    case 'CANCELLED':
    case 'SUSPENDED':
      return 'cancelled';
    case 'TIMED':
    case 'SCHEDULED':
    default:
      return 'scheduled';
  }
}
