import { vi, describe, it, expect } from 'vitest';
import { EspnAdapter } from '../espn/espn-adapter';
import type { EspnSummaryResponse, EspnScoreboardResponse } from '../espn/espn-types';

function makeFetchOk(data: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  } as unknown as Response);
}

function makeFetchError(status: number) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({}),
  } as unknown as Response);
}

function buildSummaryResponse(opts: {
  homeTeam?: string;
  awayTeam?: string;
  homeScore?: string;
  awayScore?: string;
  statusName?: string;
  date?: string;
}): EspnSummaryResponse {
  return {
    header: {
      competitions: [
        {
          date: opts.date ?? '2025-11-15T20:00:00Z',
          competitors: [
            {
              homeAway: 'home',
              team: { displayName: opts.homeTeam ?? 'TimeA' },
              score: opts.homeScore,
            },
            {
              homeAway: 'away',
              team: { displayName: opts.awayTeam ?? 'TimeB' },
              score: opts.awayScore,
            },
          ],
          status: {
            type: { name: opts.statusName ?? 'STATUS_SCHEDULED', state: 'pre', completed: false },
          },
        },
      ],
    },
  };
}

function buildScoreboardResponse(
  events: Array<{
    id: string;
    homeTeam: string;
    awayTeam: string;
    statusName: string;
    homeScore?: string;
    awayScore?: string;
  }>,
): EspnScoreboardResponse {
  return {
    events: events.map(e => ({
      id: e.id,
      date: '2025-11-15T20:00:00Z',
      competitions: [
        {
          competitors: [
            { homeAway: 'home', team: { displayName: e.homeTeam }, score: e.homeScore },
            { homeAway: 'away', team: { displayName: e.awayTeam }, score: e.awayScore },
          ],
          status: { type: { name: e.statusName, state: 'post', completed: true } },
        },
      ],
    })),
  };
}

describe('EspnAdapter', () => {
  describe('getMatch', () => {
    it('parseia jogo finalizado com placar', async () => {
      const adapter = new EspnAdapter(
        makeFetchOk(
          buildSummaryResponse({
            homeTeam: 'Flamengo',
            awayTeam: 'Corinthians',
            homeScore: '2',
            awayScore: '1',
            statusName: 'STATUS_FINAL',
          }),
        ),
      );

      const match = await adapter.getMatch('12345', { leagueCode: 'bra.1' });

      expect(match).not.toBeNull();
      expect(match!.homeTeam).toBe('Flamengo');
      expect(match!.awayTeam).toBe('Corinthians');
      expect(match!.status).toBe('finished');
      expect(match!.score).toEqual({ homeScore: 2, awayScore: 1 });
      expect(match!.providerId).toBe('12345');
    });

    it('mapeia STATUS_IN_PROGRESS como in_progress', async () => {
      const adapter = new EspnAdapter(
        makeFetchOk(buildSummaryResponse({ statusName: 'STATUS_IN_PROGRESS', homeScore: '1', awayScore: '0' })),
      );

      const match = await adapter.getMatch('12345', { leagueCode: 'bra.1' });
      expect(match!.status).toBe('in_progress');
    });

    it('mapeia STATUS_HALFTIME como in_progress', async () => {
      const adapter = new EspnAdapter(
        makeFetchOk(buildSummaryResponse({ statusName: 'STATUS_HALFTIME', homeScore: '0', awayScore: '0' })),
      );

      const match = await adapter.getMatch('12345', { leagueCode: 'bra.1' });
      expect(match!.status).toBe('in_progress');
    });

    it('mapeia STATUS_POSTPONED como postponed', async () => {
      const adapter = new EspnAdapter(
        makeFetchOk(buildSummaryResponse({ statusName: 'STATUS_POSTPONED' })),
      );

      const match = await adapter.getMatch('12345', { leagueCode: 'bra.1' });
      expect(match!.status).toBe('postponed');
    });

    it('mapeia STATUS_CANCELED como cancelled', async () => {
      const adapter = new EspnAdapter(
        makeFetchOk(buildSummaryResponse({ statusName: 'STATUS_CANCELED' })),
      );

      const match = await adapter.getMatch('12345', { leagueCode: 'bra.1' });
      expect(match!.status).toBe('cancelled');
    });

    it('retorna score undefined para jogo não iniciado sem placar', async () => {
      const adapter = new EspnAdapter(
        makeFetchOk(buildSummaryResponse({ statusName: 'STATUS_SCHEDULED' })),
      );

      const match = await adapter.getMatch('12345', { leagueCode: 'bra.1' });
      expect(match!.status).toBe('scheduled');
      expect(match!.score).toBeUndefined();
    });

    it('lança erro quando ESPN retorna status HTTP de erro', async () => {
      const adapter = new EspnAdapter(makeFetchError(503));
      await expect(adapter.getMatch('12345', { leagueCode: 'bra.1' })).rejects.toThrow(
        'ESPN summary HTTP 503',
      );
    });

    it('lança erro quando leagueCode não é fornecido', async () => {
      const adapter = new EspnAdapter(vi.fn());
      await expect(adapter.getMatch('12345')).rejects.toThrow('requer leagueCode');
    });
  });

  describe('getUpcomingMatches', () => {
    it('retorna lista de partidas do scoreboard', async () => {
      const adapter = new EspnAdapter(
        makeFetchOk(
          buildScoreboardResponse([
            { id: '1', homeTeam: 'Flamengo', awayTeam: 'Corinthians', statusName: 'STATUS_SCHEDULED' },
            { id: '2', homeTeam: 'Palmeiras', awayTeam: 'Santos', statusName: 'STATUS_SCHEDULED' },
          ]),
        ),
      );

      const matches = await adapter.getUpcomingMatches('bra.1');
      expect(matches).toHaveLength(2);
      expect(matches[0].homeTeam).toBe('Flamengo');
      expect(matches[1].homeTeam).toBe('Palmeiras');
    });

    it('retorna lista vazia quando events está ausente', async () => {
      const adapter = new EspnAdapter(makeFetchOk({ events: undefined }));
      const matches = await adapter.getUpcomingMatches('bra.1');
      expect(matches).toEqual([]);
    });

    it('lança erro quando ESPN retorna status HTTP de erro', async () => {
      const adapter = new EspnAdapter(makeFetchError(404));
      await expect(adapter.getUpcomingMatches('bra.1')).rejects.toThrow('ESPN scoreboard HTTP 404');
    });
  });
});
