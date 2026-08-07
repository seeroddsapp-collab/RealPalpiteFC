import { createClient } from './client';
import type { SupabaseClient } from './client';
import { UsersRepository } from './repositories/users.repository';
import { ChampionshipsRepository } from './repositories/championships.repository';
import { MatchesRepository } from './repositories/matches.repository';
import { PoolsRepository } from './repositories/pools.repository';
import { EntriesRepository } from './repositories/entries.repository';
import { TransactionsRepository } from './repositories/transactions.repository';
import { AuditRepository } from './repositories/audit.repository';
import { PixDepositsRepository } from './repositories/pix-deposits.repository';
import { PixWithdrawalsRepository } from './repositories/pix-withdrawals.repository';

// Ponto de entrada principal do pacote.
// O bot instancia com SERVICE_ROLE_KEY (bypassa RLS).
// O admin instancia com SERVICE_ROLE_KEY no servidor (nunca exposto ao cliente).
export class Db {
  readonly client: SupabaseClient;
  readonly users: UsersRepository;
  readonly championships: ChampionshipsRepository;
  readonly matches: MatchesRepository;
  readonly pools: PoolsRepository;
  readonly entries: EntriesRepository;
  readonly transactions: TransactionsRepository;
  readonly audit: AuditRepository;
  readonly pixDeposits: PixDepositsRepository;
  readonly pixWithdrawals: PixWithdrawalsRepository;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.client = createClient(supabaseUrl, supabaseKey);
    this.users = new UsersRepository(this.client);
    this.championships = new ChampionshipsRepository(this.client);
    this.matches = new MatchesRepository(this.client);
    this.pools = new PoolsRepository(this.client);
    this.entries = new EntriesRepository(this.client);
    this.transactions = new TransactionsRepository(this.client);
    this.audit = new AuditRepository(this.client);
    this.pixDeposits = new PixDepositsRepository(this.client);
    this.pixWithdrawals = new PixWithdrawalsRepository(this.client);
  }
}
