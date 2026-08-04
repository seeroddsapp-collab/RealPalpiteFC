import type { SupabaseClient } from '../client';
import type { UserRow } from '../database.types';

export class UsersRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findByTelegramId(telegramId: number): Promise<UserRow | null> {
    const { data, error } = await this.db
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .single();

    if (error?.code === 'PGRST116') return null;
    if (error) throw error;
    return data;
  }

  async findById(id: string): Promise<UserRow | null> {
    const { data, error } = await this.db
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error?.code === 'PGRST116') return null;
    if (error) throw error;
    return data;
  }

  async create(telegramId: number, username?: string): Promise<UserRow> {
    const { data, error } = await this.db
      .from('users')
      .insert({ telegram_id: telegramId, username: username ?? null })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async upsert(telegramId: number, username?: string): Promise<UserRow> {
    const { data, error } = await this.db
      .from('users')
      .upsert(
        { telegram_id: telegramId, username: username ?? null },
        { onConflict: 'telegram_id', ignoreDuplicates: false },
      )
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async updateBalance(userId: string, newBalance: number): Promise<void> {
    const { error } = await this.db
      .from('users')
      .update({ virtual_balance: newBalance })
      .eq('id', userId);

    if (error) throw error;
  }

  // Debita atomicamente — retorna novo saldo, ou null se saldo insuficiente.
  async debitBalance(userId: string, amount: number): Promise<number | null> {
    const { data, error } = await (this.db as any).rpc('debit_balance', {
      p_user_id: userId,
      p_amount: amount,
    });
    if (error) throw error;
    return (data as number) ?? null;
  }

  // Credita atomicamente — retorna novo saldo.
  async creditBalance(userId: string, amount: number): Promise<number> {
    const { data, error } = await (this.db as any).rpc('credit_balance', {
      p_user_id: userId,
      p_amount: amount,
    });
    if (error) throw error;
    return data as number;
  }

  async findFirst(): Promise<UserRow | null> {
    const { data, error } = await this.db
      .from('users')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async setBlocked(userId: string, isBlocked: boolean): Promise<void> {
    const { error } = await this.db
      .from('users')
      .update({ is_blocked: isBlocked })
      .eq('id', userId);

    if (error) throw error;
  }

  async updatePixKey(
    userId: string,
    pixKey: string,
    pixKeyType: 'cpf' | 'phone' | 'email' | 'random_key',
  ): Promise<void> {
    const { error } = await this.db
      .from('users')
      .update({ pix_key: pixKey, pix_key_type: pixKeyType })
      .eq('id', userId);

    if (error) throw error;
  }
}
