// Tipos gerados manualmente a partir das migrations (supabase/migrations/).
// Refletem fielmente o schema aplicado ao Supabase.
// Formato exigido pelo supabase-js v2: cada tabela requer Relationships: [].

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          telegram_id: number;
          username: string | null;
          virtual_balance: number;
          is_blocked: boolean;
          pix_key: string | null;
          pix_key_type: 'cpf' | 'phone' | 'email' | 'random_key' | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          telegram_id: number;
          username?: string | null;
          virtual_balance?: number;
          is_blocked?: boolean;
          pix_key?: string | null;
          pix_key_type?: 'cpf' | 'phone' | 'email' | 'random_key' | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          telegram_id?: number;
          username?: string | null;
          virtual_balance?: number;
          is_blocked?: boolean;
          pix_key?: string | null;
          pix_key_type?: 'cpf' | 'phone' | 'email' | 'random_key' | null;
          created_at?: string;
        };
        Relationships: [];
      };
      championships: {
        Row: {
          id: string;
          name: string;
          espn_code: string | null;
          football_data_code: number | null;
          modalities: string[];
          is_active: boolean;
          logo_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          espn_code?: string | null;
          football_data_code?: number | null;
          modalities?: string[];
          is_active?: boolean;
          logo_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          espn_code?: string | null;
          football_data_code?: number | null;
          modalities?: string[];
          is_active?: boolean;
          logo_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      matches: {
        Row: {
          id: string;
          championship_id: string;
          home_team: string;
          away_team: string;
          kickoff_at: string;
          status: 'scheduled' | 'in_progress' | 'finished' | 'cancelled' | 'postponed';
          result: Json | null;
          espn_match_id: string | null;
          football_data_match_id: string | null;
          home_team_logo_url: string | null;
          away_team_logo_url: string | null;
          groups_notified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          championship_id: string;
          home_team: string;
          away_team: string;
          kickoff_at: string;
          status?: 'scheduled' | 'in_progress' | 'finished' | 'cancelled' | 'postponed';
          result?: Json | null;
          espn_match_id?: string | null;
          football_data_match_id?: string | null;
          home_team_logo_url?: string | null;
          away_team_logo_url?: string | null;
          groups_notified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          championship_id?: string;
          home_team?: string;
          away_team?: string;
          kickoff_at?: string;
          status?: 'scheduled' | 'in_progress' | 'finished' | 'cancelled' | 'postponed';
          result?: Json | null;
          espn_match_id?: string | null;
          football_data_match_id?: string | null;
          home_team_logo_url?: string | null;
          away_team_logo_url?: string | null;
          groups_notified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'matches_championship_id_fkey';
            columns: ['championship_id'];
            isOneToOne: false;
            referencedRelation: 'championships';
            referencedColumns: ['id'];
          },
        ];
      };
      pools: {
        Row: {
          id: string;
          match_id: string;
          modality: 'dupla_chance_resultado' | 'dupla_chance' | 'total_de_gols' | 'placar_exato';
          tier_brl: number;
          type: 'global' | 'private';
          status: 'open' | 'closed' | 'resolved' | 'cancelled';
          goal_threshold: number | null;
          created_by: string | null;
          closed_at: string | null;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          modality: 'dupla_chance_resultado' | 'dupla_chance' | 'total_de_gols' | 'placar_exato';
          tier_brl: number;
          type?: 'global' | 'private';
          status?: 'open' | 'closed' | 'resolved' | 'cancelled';
          goal_threshold?: number | null;
          created_by?: string | null;
          closed_at?: string | null;
          resolved_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          modality?: 'dupla_chance_resultado' | 'dupla_chance' | 'total_de_gols' | 'placar_exato';
          tier_brl?: number;
          type?: 'global' | 'private';
          status?: 'open' | 'closed' | 'resolved' | 'cancelled';
          goal_threshold?: number | null;
          created_by?: string | null;
          closed_at?: string | null;
          resolved_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'pools_match_id_fkey';
            columns: ['match_id'];
            isOneToOne: false;
            referencedRelation: 'matches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pools_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      entries: {
        Row: {
          id: string;
          pool_id: string;
          user_id: string;
          prediction: Json;
          amount: number;
          is_winner: boolean | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          pool_id: string;
          user_id: string;
          prediction: Json;
          amount: number;
          is_winner?: boolean | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          pool_id?: string;
          user_id?: string;
          prediction?: Json;
          amount?: number;
          is_winner?: boolean | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'entries_pool_id_fkey';
            columns: ['pool_id'];
            isOneToOne: false;
            referencedRelation: 'pools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'entries_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          type: 'entry' | 'prize' | 'refund' | 'bonus' | 'deposit' | 'withdrawal';
          amount: number;
          balance_after: number;
          pool_id: string | null;
          description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'entry' | 'prize' | 'refund' | 'bonus' | 'deposit' | 'withdrawal';
          amount: number;
          balance_after: number;
          pool_id?: string | null;
          description: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'entry' | 'prize' | 'refund' | 'bonus' | 'deposit' | 'withdrawal';
          amount?: number;
          balance_after?: number;
          pool_id?: string | null;
          description?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'transactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_pool_id_fkey';
            columns: ['pool_id'];
            isOneToOne: false;
            referencedRelation: 'pools';
            referencedColumns: ['id'];
          },
        ];
      };
      pix_deposits: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          mp_payment_id: string | null;
          qr_code: string | null;
          qr_code_base64: string | null;
          status: 'pending' | 'confirmed' | 'expired' | 'cancelled';
          expires_at: string;
          confirmed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          mp_payment_id?: string | null;
          qr_code?: string | null;
          qr_code_base64?: string | null;
          status?: 'pending' | 'confirmed' | 'expired' | 'cancelled';
          expires_at: string;
          confirmed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          mp_payment_id?: string | null;
          qr_code?: string | null;
          qr_code_base64?: string | null;
          status?: 'pending' | 'confirmed' | 'expired' | 'cancelled';
          expires_at?: string;
          confirmed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'pix_deposits_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      pix_withdrawals: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          pix_key: string;
          pix_key_type: 'cpf' | 'phone' | 'email' | 'random_key';
          mp_transfer_id: string | null;
          status: 'processing' | 'completed' | 'failed';
          completed_at: string | null;
          failure_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          pix_key: string;
          pix_key_type: 'cpf' | 'phone' | 'email' | 'random_key';
          mp_transfer_id?: string | null;
          status?: 'processing' | 'completed' | 'failed';
          completed_at?: string | null;
          failure_reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          pix_key?: string;
          pix_key_type?: 'cpf' | 'phone' | 'email' | 'random_key';
          mp_transfer_id?: string | null;
          status?: 'processing' | 'completed' | 'failed';
          completed_at?: string | null;
          failure_reason?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'pix_withdrawals_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      audit_log: {
        Row: {
          id: string;
          admin_id: string;
          pool_id: string;
          previous_result: Json;
          new_result: Json;
          reason: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          pool_id: string;
          previous_result: Json;
          new_result: Json;
          reason: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string;
          pool_id?: string;
          previous_result?: Json;
          new_result?: Json;
          reason?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_log_admin_id_fkey';
            columns: ['admin_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'audit_log_pool_id_fkey';
            columns: ['pool_id'];
            isOneToOne: false;
            referencedRelation: 'pools';
            referencedColumns: ['id'];
          },
        ];
      };
      telegram_groups: {
        Row: {
          id: string;
          chat_id: number;
          title: string | null;
          added_by_telegram_id: number | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          chat_id: number;
          title?: string | null;
          added_by_telegram_id?: number | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          chat_id?: number;
          title?: string | null;
          added_by_telegram_id?: number | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Atalhos de tipo para as linhas de cada tabela
export type UserRow = Database['public']['Tables']['users']['Row'];
export type ChampionshipRow = Database['public']['Tables']['championships']['Row'];
export type MatchRow = Database['public']['Tables']['matches']['Row'];
export type PoolRow = Database['public']['Tables']['pools']['Row'];
export type EntryRow = Database['public']['Tables']['entries']['Row'];
export type TransactionRow = Database['public']['Tables']['transactions']['Row'];
export type AuditLogRow = Database['public']['Tables']['audit_log']['Row'];

export type MatchInsert = Database['public']['Tables']['matches']['Insert'];
export type PoolInsert = Database['public']['Tables']['pools']['Insert'];
export type EntryInsert = Database['public']['Tables']['entries']['Insert'];
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];
export type AuditLogInsert = Database['public']['Tables']['audit_log']['Insert'];
export type PixDepositRow = Database['public']['Tables']['pix_deposits']['Row'];
export type PixDepositInsert = Database['public']['Tables']['pix_deposits']['Insert'];
export type PixWithdrawalRow = Database['public']['Tables']['pix_withdrawals']['Row'];
export type PixWithdrawalInsert = Database['public']['Tables']['pix_withdrawals']['Insert'];
