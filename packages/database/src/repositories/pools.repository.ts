import type { SupabaseClient } from '../client';
import type { PoolRow, PoolInsert } from '../database.types';

export class PoolsRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findById(id: string): Promise<PoolRow | null> {
    const { data, error } = await this.db
      .from('pools')
      .select('*')
      .eq('id', id)
      .single();

    if (error?.code === 'PGRST116') return null;
    if (error) throw error;
    return data;
  }

  async create(payload: PoolInsert): Promise<PoolRow> {
    const { data, error } = await this.db
      .from('pools')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  // Pools abertas para uma partida específica (exibidas ao usuário ao escolher o jogo).
  async findOpenByMatch(matchId: string): Promise<PoolRow[]> {
    const { data, error } = await this.db
      .from('pools')
      .select('*')
      .eq('match_id', matchId)
      .eq('status', 'open')
      .order('modality')
      .order('tier_brl');

    if (error) throw error;
    return data;
  }

  // Todas as pools abertas — usada pelo cron de fechamento.
  async findOpen(): Promise<PoolRow[]> {
    const { data, error } = await this.db
      .from('pools')
      .select('*')
      .eq('status', 'open')
      .order('created_at');

    if (error) throw error;
    return data;
  }

  // Pools fechadas ainda não resolvidas — usada pelo cron de resolução.
  async findClosed(): Promise<PoolRow[]> {
    const { data, error } = await this.db
      .from('pools')
      .select('*')
      .eq('status', 'closed')
      .order('closed_at');

    if (error) throw error;
    return data;
  }

  async close(poolId: string): Promise<void> {
    const { error } = await this.db
      .from('pools')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', poolId);

    if (error) throw error;
  }

  async resolve(poolId: string): Promise<void> {
    const { error } = await this.db
      .from('pools')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', poolId);

    if (error) throw error;
  }

  async findByIds(ids: string[]): Promise<PoolRow[]> {
    if (ids.length === 0) return [];
    const { data, error } = await this.db
      .from('pools')
      .select('*')
      .in('id', ids);
    if (error) throw error;
    return data;
  }

  async cancel(poolId: string): Promise<void> {
    const { error } = await this.db
      .from('pools')
      .update({ status: 'cancelled' })
      .eq('id', poolId);

    if (error) throw error;
  }

  async updateGhostCount(poolId: string, count: number): Promise<void> {
    const { error } = await this.db
      .from('pools')
      .update({ ghost_count: count })
      .eq('id', poolId);
    if (error) throw error;
  }

  async findByCreator(userId: string): Promise<PoolRow[]> {
    const { data, error } = await this.db
      .from('pools')
      .select('*')
      .eq('created_by', userId)
      .eq('type', 'private')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return data;
  }
}
