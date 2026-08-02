export { Db } from './db';
export { createClient } from './client';
export type { SupabaseClient } from './client';

export type {
  Json,
  Database,
  UserRow,
  ChampionshipRow,
  MatchRow,
  PoolRow,
  EntryRow,
  TransactionRow,
  AuditLogRow,
  MatchInsert,
  PoolInsert,
  EntryInsert,
  TransactionInsert,
  AuditLogInsert,
} from './database.types';

export { UsersRepository } from './repositories/users.repository';
export { ChampionshipsRepository } from './repositories/championships.repository';
export { MatchesRepository } from './repositories/matches.repository';
export { PoolsRepository } from './repositories/pools.repository';
export { EntriesRepository } from './repositories/entries.repository';
export { TransactionsRepository } from './repositories/transactions.repository';
export { AuditRepository } from './repositories/audit.repository';
