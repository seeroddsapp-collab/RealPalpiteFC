-- Histórico de movimentações do saldo virtual de cada usuário
-- Cada operação no saldo gera uma linha aqui (imutável — nunca deletar).

CREATE TABLE transactions (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID          NOT NULL REFERENCES users (id),
  type          TEXT          NOT NULL
                  CHECK (type IN ('entry', 'prize', 'refund', 'bonus')),
  amount        NUMERIC(12, 2) NOT NULL CHECK (amount > 0), -- sempre positivo; direção = type
  balance_after NUMERIC(12, 2) NOT NULL,                   -- saldo do usuário após esta transação
  pool_id       UUID          REFERENCES pools (id),        -- NULL para bonus
  description   TEXT          NOT NULL,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id    ON transactions (user_id);
CREATE INDEX idx_transactions_pool_id    ON transactions (pool_id);
CREATE INDEX idx_transactions_created_at ON transactions (created_at DESC);

COMMENT ON TABLE  transactions             IS 'Ledger imutável de movimentações de saldo virtual. entry = débito; prize/refund/bonus = crédito.';
COMMENT ON COLUMN transactions.amount      IS 'Sempre positivo. O campo type indica se é débito (entry) ou crédito (prize/refund/bonus).';
COMMENT ON COLUMN transactions.balance_after IS 'Saldo do usuário após a transação. Permite reconstruir histórico sem somar tudo.';
