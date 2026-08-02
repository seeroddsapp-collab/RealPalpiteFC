import type { SupabaseClient } from '../client';
import type { EntryRow, EntryInsert } from '../database.types';

export class EntriesRepository {
  constructor(private readonly db: SupabaseClient) {}

  async create(payload: EntryInsert): Promise<EntryRow> {
    const { data, error } = await this.db
      .from('entries')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async findByPool(poolId: string): Promise<EntryRow[]> {
    const { data, error } = await this.db
      .from('entries')
      .select('*')
      .eq('pool_id', poolId)
      .order('created_at');

    if (error) throw error;
    return data;
  }

  async findByUser(userId: string): Promise<EntryRow[]> {
    const { data, error } = await this.db
      .from('entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async findById(id: string): Promise<EntryRow | null> {
    const { data, error } = await this.db
      .from('entries')
      .select('*')
      .eq('id', id)
      .single();
    if (error?.code === 'PGRST116') return null;
    if (error) throw error;
    return data;
  }

  async deleteById(id: string): Promise<void> {
    const { error } = await this.db
      .from('entries')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // Todas as entradas do usuário, mais recentes primeiro (sem limite).
  async findAllByUser(userId: string): Promise<EntryRow[]> {
    const { data, error } = await this.db
      .from('entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Conta quantas entradas um usuário já tem em um pool (limite = 2, Regra 5).
  async countByUserAndPool(userId: string, poolId: string): Promise<number> {
    const { count, error } = await this.db
      .from('entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('pool_id', poolId);

    if (error) throw error;
    return count ?? 0;
  }

  // Marca as entradas vencedoras como true e as perdedoras como false.
  async resolveEntries(poolId: string, winnerEntryIds: string[]): Promise<void> {
    const hasWinners = winnerEntryIds.length > 0;

    if (hasWinners) {
      // Marca vencedores
      const { error: winError } = await this.db
        .from('entries')
        .update({ is_winner: true })
        .eq('pool_id', poolId)
        .in('id', winnerEntryIds);

      if (winError) throw winError;

      // Marca perdedores
      const { error: loseError } = await this.db
        .from('entries')
        .update({ is_winner: false })
        .eq('pool_id', poolId)
        .not('id', 'in', `(${winnerEntryIds.map(id => `'${id}'`).join(',')})`);

      if (loseError) throw loseError;
    } else {
      // Sem vencedores: todos marcados como false
      const { error } = await this.db
        .from('entries')
        .update({ is_winner: false })
        .eq('pool_id', poolId);

      if (error) throw error;
    }
  }
}
