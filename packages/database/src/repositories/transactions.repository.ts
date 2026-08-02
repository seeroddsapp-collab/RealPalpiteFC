import type { SupabaseClient } from '../client';
import type { TransactionRow, TransactionInsert } from '../database.types';

export class TransactionsRepository {
  constructor(private readonly db: SupabaseClient) {}

  async create(payload: TransactionInsert): Promise<TransactionRow> {
    const { data, error } = await this.db
      .from('transactions')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  // Extrato paginado do usuário, do mais recente para o mais antigo.
  async findByUser(
    userId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<TransactionRow[]> {
    const { limit = 20, offset = 0 } = options;

    const { data, error } = await this.db
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data;
  }

  // Resumo financeiro do usuário em um período (null = todo o histórico).
  async getSummaryByUser(
    userId: string,
    from?: Date,
  ): Promise<{ invested: number; prizes: number; refunds: number }> {
    let query = this.db
      .from('transactions')
      .select('type, amount')
      .eq('user_id', userId);

    if (from) query = query.gte('created_at', from.toISOString());

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).reduce(
      (acc, tx) => {
        if (tx.type === 'entry')  acc.invested += tx.amount;
        if (tx.type === 'prize')  acc.prizes   += tx.amount;
        if (tx.type === 'refund') acc.refunds  += tx.amount;
        return acc;
      },
      { invested: 0, prizes: 0, refunds: 0 },
    );
  }

  // Transações de prêmio/devolução de um conjunto de pools — usada em Minhas Entradas.
  async findByUserAndPoolIds(
    userId: string,
    poolIds: string[],
  ): Promise<TransactionRow[]> {
    if (poolIds.length === 0) return [];
    const { data, error } = await this.db
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .in('pool_id', poolIds)
      .in('type', ['prize', 'refund']);
    if (error) throw error;
    return data;
  }

  // Soma de todas as taxas retidas — útil para o painel admin.
  async sumFeesByPool(poolId: string): Promise<number> {
    const { data, error } = await this.db
      .from('transactions')
      .select('amount')
      .eq('pool_id', poolId)
      .eq('type', 'entry');

    if (error) throw error;
    return (data ?? []).reduce((sum, row) => sum + row.amount, 0);
  }
}
