-- Tabela de usuários do bot (Telegram)
-- Distinta de auth.users do Supabase, que será usada apenas pelo painel admin

CREATE TABLE users (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id      BIGINT      NOT NULL UNIQUE,
  username         TEXT,
  virtual_balance  NUMERIC(12, 2) NOT NULL DEFAULT 100.00, -- saldo inicial de boas-vindas
  is_blocked       BOOLEAN     NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_telegram_id ON users (telegram_id);

COMMENT ON TABLE  users                  IS 'Usuários cadastrados via bot do Telegram';
COMMENT ON COLUMN users.telegram_id      IS 'ID único do usuário no Telegram';
COMMENT ON COLUMN users.virtual_balance  IS 'Saldo em pontos virtuais (R$). Começa em R$100 para testes.';
