import { createClient as supabaseCreateClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export type SupabaseClient = ReturnType<typeof supabaseCreateClient<Database>>;

export function createClient(url: string, key: string): SupabaseClient {
  return supabaseCreateClient<Database>(url, key, {
    auth: { persistSession: false },
  });
}
