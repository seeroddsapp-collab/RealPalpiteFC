import type { SupabaseClient } from '../client';
import type { AuditLogRow, AuditLogInsert } from '../database.types';

export class AuditRepository {
  constructor(private readonly db: SupabaseClient) {}

  async create(payload: AuditLogInsert): Promise<AuditLogRow> {
    const { data, error } = await this.db
      .from('audit_log')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async findByPool(poolId: string): Promise<AuditLogRow[]> {
    const { data, error } = await this.db
      .from('audit_log')
      .select('*')
      .eq('pool_id', poolId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async findByAdmin(adminId: string): Promise<AuditLogRow[]> {
    const { data, error } = await this.db
      .from('audit_log')
      .select('*')
      .eq('admin_id', adminId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}
