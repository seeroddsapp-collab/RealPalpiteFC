import type { SupabaseClient } from '../client';
import type { MatchRow, MatchInsert, Json } from '../database.types';

export class MatchesRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findById(id: string): Promise<MatchRow | null> {
    const { data, error } = await this.db
      .from('matches')
      .select('*')
      .eq('id', id)
      .single();

    if (error?.code === 'PGRST116') return null;
    if (error) throw error;
    return data;
  }

  async create(payload: MatchInsert): Promise<MatchRow> {
    const { data, error } = await this.db
      .from('matches')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  // Busca partidas de um campeonato dentro de uma janela de datas (para popular o menu do bot).
  async findByIds(ids: string[]): Promise<MatchRow[]> {
    if (ids.length === 0) return [];
    const { data, error } = await this.db
      .from('matches')
      .select('*')
      .in('id', ids);
    if (error) throw error;
    return data;
  }

  async findByChampionship(championshipId: string, from: Date, to: Date): Promise<MatchRow[]> {
    const { data, error } = await this.db
      .from('matches')
      .select('*')
      .eq('championship_id', championshipId)
      .gte('kickoff_at', from.toISOString())
      .lte('kickoff_at', to.toISOString())
      .order('kickoff_at');

    if (error) throw error;
    return data;
  }

  // Partidas agendadas que vão começar até `minutesAhead` minutos — usada pelo cron de fechamento.
  async findScheduledSoon(minutesAhead: number): Promise<MatchRow[]> {
    const now = new Date();
    const cutoff = new Date(now.getTime() + minutesAhead * 60_000);

    const { data, error } = await this.db
      .from('matches')
      .select('*')
      .eq('status', 'scheduled')
      .lte('kickoff_at', cutoff.toISOString())
      .order('kickoff_at');

    if (error) throw error;
    return data;
  }

  // Partidas em andamento — usada pelo cron de verificação de resultado.
  async findInProgress(): Promise<MatchRow[]> {
    const { data, error } = await this.db
      .from('matches')
      .select('*')
      .eq('status', 'in_progress')
      .order('kickoff_at');

    if (error) throw error;
    return data;
  }

  async updateStatus(
    matchId: string,
    status: MatchRow['status'],
    result?: Json,
  ): Promise<void> {
    const update: Partial<MatchRow> = { status };
    if (result !== undefined) update.result = result;

    const { error } = await this.db
      .from('matches')
      .update(update)
      .eq('id', matchId);

    if (error) throw error;
  }

  // Insere ou atualiza uma partida a partir do ID da ESPN.
  // Retorna op ('inserted' | 'updated') e o id da linha.
  async upsertByEspnId(
    payload: MatchInsert & { espn_match_id: string },
  ): Promise<{ op: 'inserted' | 'updated'; id: string }> {
    const { data: existing, error: selectErr } = await this.db
      .from('matches')
      .select('id')
      .eq('espn_match_id', payload.espn_match_id)
      .maybeSingle();

    if (selectErr) throw selectErr;

    if (existing) {
      const { error } = await this.db
        .from('matches')
        .update({
          home_team: payload.home_team,
          away_team: payload.away_team,
          kickoff_at: payload.kickoff_at,
          status: payload.status,
          result: payload.result ?? null,
          home_team_logo_url: payload.home_team_logo_url ?? null,
          away_team_logo_url: payload.away_team_logo_url ?? null,
        })
        .eq('id', existing.id);
      if (error) throw error;
      return { op: 'updated', id: existing.id };
    }

    const { data, error } = await this.db
      .from('matches')
      .insert(payload)
      .select('id')
      .single();
    if (error) throw error;
    return { op: 'inserted', id: data.id };
  }
}
