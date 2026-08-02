import { createClient } from './client';
import { UsersRepository } from './repositories/users.repository';
import { ChampionshipsRepository } from './repositories/championships.repository';
import { MatchesRepository } from './repositories/matches.repository';
import { PoolsRepository } from './repositories/pools.repository';
import { EntriesRepository } from './repositories/entries.repository';
import { TransactionsRepository } from './repositories/transactions.repository';
import { AuditRepository } from './repositories/audit.repository';

// Ponto de entrada principal do pacote.
// O bot instancia com SERVICE_ROLE_KEY (bypassa RLS).
// O admin instancia com SERVICE_ROLE_KEY no servidor (nunca exposto ao cliente).
export class Db {
  readonly users: UsersRepository;
  readonly championships: ChampionshipsRepository;
  readonly matches: MatchesRepository;
  readonly pools: PoolsRepository;
  readonly entries: EntriesRepository;
  readonly transactions: TransactionsRepository;
  readonly audit: AuditRepository;

  constructor(supabaseUrl: string, supabaseKey: string) {
    const client = createClient(supabaseUrl, supabaseKey);
    this.users = new UsersRepository(client);
    this.championships = new ChampionshipsRepository(client);
    this.matches = new MatchesRepository(client);
    this.pools = new PoolsRepository(client);
    this.entries = new EntriesRepository(client);
    this.transactions = new TransactionsRepository(client);
    this.audit = new AuditRepository(client);
  }
}
