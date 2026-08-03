import type { SupabaseClient } from '../client';
import type { PixDepositRow, PixDepositInsert } from '../database.types';

export class PixDepositsRepository {
  constructor(private readonly db: SupabaseClient) {}

  async create(payload: PixDepositInsert): Promise<PixDepositRow> {
    const { data, error } = await this.db
      .from('pix_deposits')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async findByMpPaymentId(mpPaymentId: string): Promise<PixDepositRow | null> {
    const { data, error } = await this.db
      .from('pix_deposits')
      .select('*')
      .eq('mp_payment_id', mpPaymentId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async findPendingByUser(userId: string): Promise<PixDepositRow[]> {
    const { data, error } = await this.db
      .from('pix_deposits')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async updateStatus(
    id: string,
    status: PixDepositRow['status'],
    confirmedAt?: Date,
  ): Promise<void> {
    const { error } = await this.db
      .from('pix_deposits')
      .update({
        status,
        ...(confirmedAt ? { confirmed_at: confirmedAt.toISOString() } : {}),
      })
      .eq('id', id);

    if (error) throw error;
  }

  async findByUser(
    userId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<PixDepositRow[]> {
    const { limit = 50, offset = 0 } = options;
    const { data, error } = await this.db
      .from('pix_deposits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data ?? [];
  }

  async findAll(options: { limit?: number; offset?: number } = {}): Promise<{ data: PixDepositRow[]; count: number }> {
    const { limit = 50, offset = 0 } = options;
    const { data, error, count } = await this.db
      .from('pix_deposits')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { data: data ?? [], count: count ?? 0 };
  }
}
