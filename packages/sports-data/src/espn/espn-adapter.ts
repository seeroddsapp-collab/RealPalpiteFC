import type { SportsDataProvider } from '../provider-interface';
import type { ProviderMatch } from '../types';
import type { EspnScoreboardResponse, EspnSummaryResponse, EspnCompetition } from './espn-types';
import { parseEspnStatus } from './espn-types';

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const HEADERS = { 'User-Agent': 'RealPalpiteFC/1.0' };

type FetchFn = typeof globalThis.fetch;

export class EspnAdapter implements SportsDataProvider {
  readonly name = 'ESPN';

  constructor(private readonly fetchFn: FetchFn = globalThis.fetch) {}

  async getMatch(eventId: string, options?: { leagueCode?: string }): Promise<ProviderMatch | null> {
    const leagueCode = options?.leagueCode;
    if (!leagueCode) throw new Error('EspnAdapter.getMatch requer leagueCode em options');

    const url = `${ESPN_BASE}/${leagueCode}/summary?event=${eventId}`;
    const res = await this.fetchFn(url, { headers: HEADERS });

    if (!res.ok) throw new Error(`ESPN summary HTTP ${res.status} para evento ${eventId}`);

    const data = await res.json() as EspnSummaryResponse;
    const comp = data.header?.competitions?.[0];
    if (!comp) return null;

    return mapCompetition(eventId, comp.date ?? new Date().toISOString(), comp);
  }

  async getUpcomingMatches(leagueCode: string, daysAhead = 3): Promise<ProviderMatch[]> {
    const dateRange = buildDateRange(daysAhead);
    const url = `${ESPN_BASE}/${leagueCode}/scoreboard?dates=${dateRange}&limit=100`;
    const res = await this.fetchFn(url, { headers: HEADERS });

    if (!res.ok) throw new Error(`ESPN scoreboard HTTP ${res.status} para liga ${leagueCode}`);

    const data = await res.json() as EspnScoreboardResponse;
    const events = data.events ?? [];

    return events
      .map(event => {
        const comp = event.competitions[0];
        if (!comp) return null;
        return mapCompetition(event.id, event.date, comp);
      })
      .filter((m): m is ProviderMatch => m !== null);
  }

  async getLeagueLogoUrl(leagueCode: string): Promise<string | null> {
    const url = `${ESPN_BASE}/${leagueCode}/scoreboard?limit=1`;
    const res = await this.fetchFn(url, { headers: HEADERS });
    if (!res.ok) return null;
    const data = await res.json() as EspnScoreboardResponse;
    return data.leagues?.[0]?.logos?.[0]?.href ?? null;
  }
}

function mapCompetition(providerId: string, date: string, comp: EspnCompetition): ProviderMatch | null {
  const home = comp.competitors.find(c => c.homeAway === 'home');
  const away = comp.competitors.find(c => c.homeAway === 'away');
  if (!home || !away) return null;

  const status = parseEspnStatus(comp.status.type.name);
  const homeScore = home.score !== undefined ? parseInt(home.score, 10) : undefined;
  const awayScore = away.score !== undefined ? parseInt(away.score, 10) : undefined;

  return {
    providerId,
    homeTeam: home.team.displayName,
    awayTeam: away.team.displayName,
    kickoffAt: new Date(date),
    status,
    score:
      homeScore !== undefined && awayScore !== undefined && !isNaN(homeScore) && !isNaN(awayScore)
        ? { homeScore, awayScore }
        : undefined,
    homeTeamLogoUrl: home.team.logo,
    awayTeamLogoUrl: away.team.logo,
  };
}

function buildDateRange(daysAhead: number): string {
  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() + daysAhead);
  const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
  return `${fmt(today)}-${fmt(end)}`;
}
