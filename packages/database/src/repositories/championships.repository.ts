import type { SupabaseClient } from '../client';
import type { ChampionshipRow } from '../database.types';

export class ChampionshipsRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findActive(): Promise<ChampionshipRow[]> {
    const { data, error } = await this.db
      .from('championships')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data;
  }

  // Retorna apenas campeonatos com pelo menos 1 partida agendada dentro da janela.
  async findActiveWithUpcomingMatches(from: Date, to: Date): Promise<ChampionshipRow[]> {
    const { data: matches, error: matchErr } = await this.db
      .from('matches')
      .select('championship_id')
      .eq('status', 'scheduled')
      .gte('kickoff_at', from.toISOString())
      .lte('kickoff_at', to.toISOString());

    if (matchErr) throw matchErr;

    const ids = [...new Set(matches.map(m => m.championship_id))];
    if (ids.length === 0) return [];

    const { data, error } = await this.db
      .from('championships')
      .select('*')
      .eq('is_active', true)
      .in('id', ids)
      .order('name');

    if (error) throw error;
    return data;
  }

  async updateLogoUrl(id: string, logoUrl: string): Promise<void> {
    const { error } = await this.db
      .from('championships')
      .update({ logo_url: logoUrl })
      .eq('id', id);
    if (error) throw error;
  }

  async findById(id: string): Promise<ChampionshipRow | null> {
    const { data, error } = await this.db
      .from('championships')
      .select('*')
      .eq('id', id)
      .single();

    if (error?.code === 'PGRST116') return null;
    if (error) throw error;
    return data;
  }
}
