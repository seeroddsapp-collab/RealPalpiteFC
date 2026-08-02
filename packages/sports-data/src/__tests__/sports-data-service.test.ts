import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SportsDataService } from '../sports-data-service';
import { EspnAdapter } from '../espn/espn-adapter';
import { FootballDataAdapter } from '../football-data/football-data-adapter';
import type { ProviderMatch } from '../types';

function makeMatch(overrides: Partial<ProviderMatch> = {}): ProviderMatch {
  return {
    providerId: '123',
    homeTeam: 'Flamengo',
    awayTeam: 'Corinthians',
    kickoffAt: new Date('2025-11-15T20:00:00Z'),
    status: 'finished',
    score: { homeScore: 2, awayScore: 1 },
    ...overrides,
  };
}

describe('SportsDataService — lógica de fallback', () => {
  let espn: EspnAdapter;
  let footballData: FootballDataAdapter;
  let service: SportsDataService;

  beforeEach(() => {
    espn = new EspnAdapter(vi.fn());
    footballData = new FootballDataAdapter('test-key', vi.fn());
    service = new SportsDataService(espn, footballData);
  });

  describe('getMatch', () => {
    it('retorna resultado da ESPN quando disponível', async () => {
      vi.spyOn(espn, 'getMatch').mockResolvedValue(makeMatch({ homeTeam: 'Flamengo' }));

      const result = await service.getMatch({ espnMatchId: '12345', espnLeagueCode: 'bra.1' });

      expect(result?.homeTeam).toBe('Flamengo');
      expect(espn.getMatch).toHaveBeenCalledWith('12345', { leagueCode: 'bra.1' });
    });

    it('usa football-data.org quando ESPN lança erro', async () => {
      vi.spyOn(espn, 'getMatch').mockRejectedValue(new Error('ESPN down'));
      vi.spyOn(footballData, 'getMatch').mockResolvedValue(makeMatch({ homeTeam: 'Palmeiras' }));

      const result = await service.getMatch({
        espnMatchId: '12345',
        espnLeagueCode: 'bra.1',
        footballDataMatchId: 67890,
      });

      expect(result?.homeTeam).toBe('Palmeiras');
      expect(footballData.getMatch).toHaveBeenCalledWith('67890');
    });

    it('usa football-data.org quando ESPN retorna null (sem dados)', async () => {
      vi.spyOn(espn, 'getMatch').mockResolvedValue(null);
      vi.spyOn(footballData, 'getMatch').mockResolvedValue(makeMatch());

      const result = await service.getMatch({
        espnMatchId: '12345',
        espnLeagueCode: 'bra.1',
        footballDataMatchId: 67890,
      });

      expect(result).not.toBeNull();
      expect(footballData.getMatch).toHaveBeenCalled();
    });

    it('retorna null quando ambos os provedores falham', async () => {
      vi.spyOn(espn, 'getMatch').mockRejectedValue(new Error('ESPN down'));
      vi.spyOn(footballData, 'getMatch').mockRejectedValue(new Error('FD down'));

      const result = await service.getMatch({
        espnMatchId: '12345',
        espnLeagueCode: 'bra.1',
        footballDataMatchId: 67890,
      });

      expect(result).toBeNull();
    });

    it('pula ESPN quando IDs ESPN não fornecidos', async () => {
      vi.spyOn(espn, 'getMatch');
      vi.spyOn(footballData, 'getMatch').mockResolvedValue(makeMatch());

      const result = await service.getMatch({ footballDataMatchId: 67890 });

      expect(espn.getMatch).not.toHaveBeenCalled();
      expect(result).not.toBeNull();
    });

    it('retorna null quando nenhum identificador fornecido', async () => {
      const result = await service.getMatch({});
      expect(result).toBeNull();
    });
  });

  describe('getUpcomingMatches', () => {
    it('retorna partidas da ESPN quando disponível', async () => {
      vi.spyOn(espn, 'getUpcomingMatches').mockResolvedValue([makeMatch(), makeMatch()]);
      vi.spyOn(footballData, 'getUpcomingMatches');

      const result = await service.getUpcomingMatches({ espnLeagueCode: 'bra.1', daysAhead: 7 });

      expect(result).toHaveLength(2);
      expect(espn.getUpcomingMatches).toHaveBeenCalledWith('bra.1', 7);
      expect(footballData.getUpcomingMatches).not.toHaveBeenCalled();
    });

    it('usa football-data.org quando ESPN lança erro', async () => {
      vi.spyOn(espn, 'getUpcomingMatches').mockRejectedValue(new Error('ESPN down'));
      vi.spyOn(footballData, 'getUpcomingMatches').mockResolvedValue([makeMatch()]);

      const result = await service.getUpcomingMatches({
        espnLeagueCode: 'bra.1',
        footballDataCompetitionCode: 'BSA',
      });

      expect(result).toHaveLength(1);
      expect(footballData.getUpcomingMatches).toHaveBeenCalled();
    });

    it('retorna array vazio quando ambos os provedores falham', async () => {
      vi.spyOn(espn, 'getUpcomingMatches').mockRejectedValue(new Error('ESPN down'));
      vi.spyOn(footballData, 'getUpcomingMatches').mockRejectedValue(new Error('FD down'));

      const result = await service.getUpcomingMatches({
        espnLeagueCode: 'bra.1',
        footballDataCompetitionCode: 'BSA',
      });

      expect(result).toEqual([]);
    });

    it('pula ESPN quando espnLeagueCode não fornecido', async () => {
      vi.spyOn(espn, 'getUpcomingMatches');
      vi.spyOn(footballData, 'getUpcomingMatches').mockResolvedValue([makeMatch()]);

      const result = await service.getUpcomingMatches({ footballDataCompetitionCode: 'BSA' });

      expect(espn.getUpcomingMatches).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('retorna array vazio quando nenhum código fornecido', async () => {
      const result = await service.getUpcomingMatches({});
      expect(result).toEqual([]);
    });
  });
});
