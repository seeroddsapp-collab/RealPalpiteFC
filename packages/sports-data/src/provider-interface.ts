import type { ProviderMatch } from './types';

export interface SportsDataProvider {
  readonly name: string;
  getMatch(id: string, options?: { leagueCode?: string }): Promise<ProviderMatch | null>;
  getUpcomingMatches(leagueCode: string | number, daysAhead?: number): Promise<ProviderMatch[]>;
}
