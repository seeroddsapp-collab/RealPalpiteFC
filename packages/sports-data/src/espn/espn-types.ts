import type { ProviderMatchStatus } from '../types';

export type EspnStatusType = {
  name: string;
  state: string;
  completed: boolean;
};

export type EspnCompetitor = {
  homeAway: 'home' | 'away';
  team: { id?: string; displayName: string; logo?: string };
  score?: string;
};

export type EspnCompetition = {
  date?: string;
  competitors: EspnCompetitor[];
  status: { type: EspnStatusType };
};

export type EspnEvent = {
  id: string;
  date: string;
  competitions: EspnCompetition[];
};

export type EspnLeague = {
  logos?: Array<{ href: string }>;
};

export type EspnScoreboardResponse = {
  leagues?: EspnLeague[];
  events?: EspnEvent[];
};

export type EspnSummaryResponse = {
  header?: {
    competitions: EspnCompetition[];
  };
};

export function parseEspnStatus(statusName: string): ProviderMatchStatus {
  switch (statusName) {
    case 'STATUS_FINAL':
    case 'STATUS_FULL_TIME':
      return 'finished';
    case 'STATUS_IN_PROGRESS':
    case 'STATUS_HALFTIME':
    case 'STATUS_END_PERIOD':
      return 'in_progress';
    case 'STATUS_POSTPONED':
      return 'postponed';
    case 'STATUS_CANCELED':
    case 'STATUS_CANCELLED':
    case 'STATUS_SUSPENDED':
      return 'cancelled';
    default:
      return 'scheduled';
  }
}
