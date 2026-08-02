export type ProviderMatchStatus =
  | 'scheduled'
  | 'in_progress'
  | 'finished'
  | 'cancelled'
  | 'postponed';

export type ProviderMatchScore = {
  homeScore: number;
  awayScore: number;
};

export type ProviderMatch = {
  providerId: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: Date;
  status: ProviderMatchStatus;
  score?: ProviderMatchScore;
  homeTeamLogoUrl?: string;
  awayTeamLogoUrl?: string;
};

export type MatchIdentifiers = {
  espnMatchId?: string;
  espnLeagueCode?: string;
  footballDataMatchId?: number;
};

export type UpcomingMatchesParams = {
  espnLeagueCode?: string;
  footballDataCompetitionCode?: string | number;
  daysAhead?: number;
};
