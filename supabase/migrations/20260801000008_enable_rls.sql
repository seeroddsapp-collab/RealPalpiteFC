-- Habilita Row Level Security em todas as tabelas.
-- O bot usa SERVICE_ROLE_KEY (bypassa RLS) — policies aqui protegem acesso via ANON_KEY.

ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE championships ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pools          ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log      ENABLE ROW LEVEL SECURITY;

-- ── Leitura pública (anon) ────────────────────────────────────────────────────

-- Campeonatos ativos: visíveis a qualquer um
CREATE POLICY "championships_public_read" ON championships
  FOR SELECT USING (is_active = true);

-- Partidas: visíveis a qualquer um (necessário para exibir jogos disponíveis)
CREATE POLICY "matches_public_read" ON matches
  FOR SELECT USING (true);

-- Pools abertas e fechadas: visíveis (não canceladas)
CREATE POLICY "pools_public_read" ON pools
  FOR SELECT USING (status <> 'cancelled');

-- ── Dados pessoais: usuário vê apenas o próprio ────────────────────────────────
-- Nota: no contexto do bot, service_role bypassa estas policies.
-- Estas policies protegem acesso direto à API com anon/user token.

CREATE POLICY "users_own_read" ON users
  FOR SELECT USING (telegram_id::TEXT = current_setting('request.jwt.claims', true)::json->>'telegram_id');

CREATE POLICY "entries_own_read" ON entries
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users
      WHERE telegram_id::TEXT = current_setting('request.jwt.claims', true)::json->>'telegram_id'
    )
  );

CREATE POLICY "transactions_own_read" ON transactions
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users
      WHERE telegram_id::TEXT = current_setting('request.jwt.claims', true)::json->>'telegram_id'
    )
  );

-- ── audit_log: nenhum acesso via anon ─────────────────────────────────────────
-- Acesso apenas via service_role (painel admin usa service_role no servidor).
-- Sem policy = nenhum acesso por default com anon/user token.
