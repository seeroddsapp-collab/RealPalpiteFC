import type { SupabaseClient } from '../client';
import type { PixWithdrawalRow, PixWithdrawalInsert } from '../database.types';

export class PixWithdrawalsRepository {
  constructor(private readonly db: SupabaseClient) {}

  async create(payload: PixWithdrawalInsert): Promise<PixWithdrawalRow> {
    const { data, error } = await this.db
      .from('pix_withdrawals')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async updateStatus(
    id: string,
    status: PixWithdrawalRow['status'],
    opts: { mpTransferId?: string; failureReason?: string; completedAt?: Date } = {},
  ): Promise<void> {
    const { error } = await this.db
      .from('pix_withdrawals')
      .update({
        status,
        ...(opts.mpTransferId ? { mp_transfer_id: opts.mpTransferId } : {}),
        ...(opts.failureReason ? { failure_reason: opts.failureReason } : {}),
        ...(opts.completedAt ? { completed_at: opts.completedAt.toISOString() } : {}),
      })
      .eq('id', id);

    if (error) throw error;
  }

  // Soma dos saques concluídos hoje (para limite diário de R$500)
  async getTodayTotal(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await this.db
      .from('pix_withdrawals')
      .select('amount')
      .eq('user_id', userId)
      .in('status', ['processing', 'completed'])
      .gte('created_at', today.toISOString());

    if (error) throw error;
    return (data ?? []).reduce((sum, row) => sum + row.amount, 0);
  }

  async findByUser(
    userId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<PixWithdrawalRow[]> {
    const { limit = 50, offset = 0 } = options;
    const { data, error } = await this.db
      .from('pix_withdrawals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data ?? [];
  }

  async findAll(options: { limit?: number; offset?: number } = {}): Promise<{ data: PixWithdrawalRow[]; count: number }> {
    const { limit = 50, offset = 0 } = options;
    const { data, error, count } = await this.db
      .from('pix_withdrawals')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { data: data ?? [], count: count ?? 0 };
  }
}
