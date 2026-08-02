import type { ProviderMatch, MatchIdentifiers, UpcomingMatchesParams } from './types';
import type { EspnAdapter } from './espn/espn-adapter';
import type { FootballDataAdapter } from './football-data/football-data-adapter';

export class SportsDataService {
  constructor(
    private readonly espn: EspnAdapter,
    private readonly footballData: FootballDataAdapter,
  ) {}

  async getMatch(ids: MatchIdentifiers): Promise<ProviderMatch | null> {
    if (ids.espnMatchId && ids.espnLeagueCode) {
      try {
        const result = await this.espn.getMatch(ids.espnMatchId, { leagueCode: ids.espnLeagueCode });
        if (result) return result;
      } catch {
        // ESPN indisponível — ativa fallback para football-data.org
      }
    }

    if (ids.footballDataMatchId !== undefined) {
      try {
        return await this.footballData.getMatch(String(ids.footballDataMatchId));
      } catch {
        return null;
      }
    }

    return null;
  }

  async getUpcomingMatches(params: UpcomingMatchesParams): Promise<ProviderMatch[]> {
    if (params.espnLeagueCode) {
      try {
        return await this.espn.getUpcomingMatches(params.espnLeagueCode, params.daysAhead);
      } catch {
        // ESPN indisponível — ativa fallback para football-data.org
      }
    }

    if (params.footballDataCompetitionCode !== undefined) {
      try {
        return await this.footballData.getUpcomingMatches(
          params.footballDataCompetitionCode,
          params.daysAhead,
        );
      } catch {
        return [];
      }
    }

    return [];
  }

  async getChampionshipLogoUrl(leagueCode: string): Promise<string | null> {
    try {
      return await this.espn.getLeagueLogoUrl(leagueCode);
    } catch {
      return null;
    }
  }
}
