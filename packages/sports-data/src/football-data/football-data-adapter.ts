import type { SportsDataProvider } from '../provider-interface';
import type { ProviderMatch } from '../types';
import type {
  FootballDataMatchResponse,
  FootballDataCompetitionMatchesResponse,
  FootballDataMatch,
} from './football-data-types';
import { parseFootballDataStatus } from './football-data-types';

const FD_BASE = 'https://api.football-data.org/v4';

type FetchFn = typeof globalThis.fetch;

export class FootballDataAdapter implements SportsDataProvider {
  readonly name = 'football-data.org';

  constructor(
    private readonly apiKey: string,
    private readonly fetchFn: FetchFn = globalThis.fetch,
  ) {}

  async getMatch(matchId: string): Promise<ProviderMatch | null> {
    const res = await this.fetchFn(`${FD_BASE}/matches/${matchId}`, {
      headers: { 'X-Auth-Token': this.apiKey },
    });

    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`football-data.org HTTP ${res.status} para partida ${matchId}`);

    const data = await res.json() as FootballDataMatchResponse;
    return mapMatch(data);
  }

  async getUpcomingMatches(competitionCode: string | number, daysAhead = 3): Promise<ProviderMatch[]> {
    const today = new Date().toISOString().slice(0, 10);
    const end = new Date(Date.now() + daysAhead * 86_400_000).toISOString().slice(0, 10);

    const url =
      `${FD_BASE}/competitions/${competitionCode}/matches` +
      `?status=SCHEDULED&dateFrom=${today}&dateTo=${end}`;
    const res = await this.fetchFn(url, { headers: { 'X-Auth-Token': this.apiKey } });

    if (!res.ok)
      throw new Error(`football-data.org HTTP ${res.status} para competição ${competitionCode}`);

    const data = await res.json() as FootballDataCompetitionMatchesResponse;
    return data.matches.map(mapMatch);
  }
}

function mapMatch(m: FootballDataMatch): ProviderMatch {
  const { fullTime } = m.score;
  return {
    providerId: String(m.id),
    homeTeam: m.homeTeam.name,
    awayTeam: m.awayTeam.name,
    kickoffAt: new Date(m.utcDate),
    status: parseFootballDataStatus(m.status),
    score:
      fullTime.home !== null && fullTime.away !== null
        ? { homeScore: fullTime.home, awayScore: fullTime.away }
        : undefined,
  };
}
