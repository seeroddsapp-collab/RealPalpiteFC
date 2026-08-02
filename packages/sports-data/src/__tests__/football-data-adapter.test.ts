import { vi, describe, it, expect } from 'vitest';
import { FootballDataAdapter } from '../football-data/football-data-adapter';
import type {
  FootballDataMatchResponse,
  FootballDataCompetitionMatchesResponse,
} from '../football-data/football-data-types';

function makeFetchOk(data: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  } as unknown as Response);
}

function makeFetchStatus(status: number) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve({}),
  } as unknown as Response);
}

function buildMatchResponse(overrides: Partial<FootballDataMatchResponse> = {}): FootballDataMatchResponse {
  return {
    id: 67890,
    homeTeam: { name: 'Flamengo' },
    awayTeam: { name: 'Corinthians' },
    utcDate: '2025-11-15T20:00:00Z',
    status: 'FINISHED',
    score: { fullTime: { home: 2, away: 1 } },
    ...overrides,
  };
}

describe('FootballDataAdapter', () => {
  describe('getMatch', () => {
    it('parseia corretamente partida finalizada', async () => {
      const adapter = new FootballDataAdapter('test-key', makeFetchOk(buildMatchResponse()));

      const match = await adapter.getMatch('67890');

      expect(match!.homeTeam).toBe('Flamengo');
      expect(match!.awayTeam).toBe('Corinthians');
      expect(match!.status).toBe('finished');
      expect(match!.score).toEqual({ homeScore: 2, awayScore: 1 });
      expect(match!.providerId).toBe('67890');
    });

    it('retorna null para partida não encontrada (404)', async () => {
      const adapter = new FootballDataAdapter('test-key', makeFetchStatus(404));
      const match = await adapter.getMatch('99999');
      expect(match).toBeNull();
    });

    it('lança erro em falhas HTTP não-404', async () => {
      const adapter = new FootballDataAdapter('test-key', makeFetchStatus(429));
      await expect(adapter.getMatch('12345')).rejects.toThrow('football-data.org HTTP 429');
    });

    it('mapeia PAUSED como in_progress (intervalo)', async () => {
      const adapter = new FootballDataAdapter(
        'test-key',
        makeFetchOk(buildMatchResponse({ status: 'PAUSED', score: { fullTime: { home: null, away: null } } })),
      );

      const match = await adapter.getMatch('12345');
      expect(match!.status).toBe('in_progress');
      expect(match!.score).toBeUndefined();
    });

    it('mapeia IN_PLAY como in_progress com placar parcial', async () => {
      const adapter = new FootballDataAdapter(
        'test-key',
        makeFetchOk(buildMatchResponse({ status: 'IN_PLAY', score: { fullTime: { home: 1, away: 0 } } })),
      );

      const match = await adapter.getMatch('12345');
      expect(match!.status).toBe('in_progress');
      expect(match!.score).toEqual({ homeScore: 1, awayScore: 0 });
    });

    it('mapeia POSTPONED como postponed', async () => {
      const adapter = new FootballDataAdapter(
        'test-key',
        makeFetchOk(
          buildMatchResponse({ status: 'POSTPONED', score: { fullTime: { home: null, away: null } } }),
        ),
      );

      const match = await adapter.getMatch('12345');
      expect(match!.status).toBe('postponed');
    });

    it('mapeia CANCELLED como cancelled', async () => {
      const adapter = new FootballDataAdapter(
        'test-key',
        makeFetchOk(
          buildMatchResponse({ status: 'CANCELLED', score: { fullTime: { home: null, away: null } } }),
        ),
      );

      const match = await adapter.getMatch('12345');
      expect(match!.status).toBe('cancelled');
    });

    it('mapeia AWARDED como finished (resultado técnico)', async () => {
      const adapter = new FootballDataAdapter('test-key', makeFetchOk(buildMatchResponse({ status: 'AWARDED' })));

      const match = await adapter.getMatch('12345');
      expect(match!.status).toBe('finished');
    });
  });

  describe('getUpcomingMatches', () => {
    it('retorna lista de partidas agendadas', async () => {
      const mockData: FootballDataCompetitionMatchesResponse = {
        matches: [
          buildMatchResponse({ id: 1, status: 'TIMED', score: { fullTime: { home: null, away: null } } }),
          buildMatchResponse({ id: 2, status: 'SCHEDULED', score: { fullTime: { home: null, away: null } } }),
        ],
      };

      const adapter = new FootballDataAdapter('test-key', makeFetchOk(mockData));
      const matches = await adapter.getUpcomingMatches('BSA');

      expect(matches).toHaveLength(2);
      expect(matches[0].status).toBe('scheduled');
      expect(matches[1].status).toBe('scheduled');
    });

    it('aceita código numérico de competição', async () => {
      const mockData: FootballDataCompetitionMatchesResponse = { matches: [buildMatchResponse()] };
      const mockFetch = makeFetchOk(mockData);
      const adapter = new FootballDataAdapter('test-key', mockFetch);

      await adapter.getUpcomingMatches(2013);

      const calledUrl = (mockFetch.mock.calls[0][0] as string);
      expect(calledUrl).toContain('/competitions/2013/matches');
    });

    it('lança erro quando API falha', async () => {
      const adapter = new FootballDataAdapter('test-key', makeFetchStatus(500));
      await expect(adapter.getUpcomingMatches('BSA')).rejects.toThrow('football-data.org HTTP 500');
    });
  });
});
