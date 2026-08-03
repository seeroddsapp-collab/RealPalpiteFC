-- Fase 7.5 — Fluxo PIX Real (Mercado Pago)

-- 1. Adiciona campos PIX na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS pix_key TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pix_key_type TEXT
  CHECK (pix_key_type IN ('cpf', 'phone', 'email', 'random_key'));

-- 2. Expande o CHECK de type na tabela transactions para incluir depósito e saque
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('entry', 'prize', 'refund', 'bonus', 'deposit', 'withdrawal'));

-- 3. Tabela de depósitos PIX (geração de QR Code e confirmação via webhook)
CREATE TABLE IF NOT EXISTS pix_deposits (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount         NUMERIC(12,2) NOT NULL CHECK (amount >= 10),
  mp_payment_id  TEXT          UNIQUE,
  qr_code        TEXT,
  qr_code_base64 TEXT,
  status         TEXT          NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'confirmed', 'expired', 'cancelled')),
  expires_at     TIMESTAMPTZ   NOT NULL,
  confirmed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pix_deposits_user_id      ON pix_deposits (user_id);
CREATE INDEX IF NOT EXISTS idx_pix_deposits_mp_payment_id ON pix_deposits (mp_payment_id);
CREATE INDEX IF NOT EXISTS idx_pix_deposits_status        ON pix_deposits (status);

-- 4. Tabela de saques PIX (transferência para chave PIX do usuário)
CREATE TABLE IF NOT EXISTS pix_withdrawals (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount          NUMERIC(12,2) NOT NULL CHECK (amount >= 20),
  pix_key         TEXT          NOT NULL,
  pix_key_type    TEXT          NOT NULL
                    CHECK (pix_key_type IN ('cpf', 'phone', 'email', 'random_key')),
  mp_transfer_id  TEXT          UNIQUE,
  status          TEXT          NOT NULL DEFAULT 'processing'
                    CHECK (status IN ('processing', 'completed', 'failed')),
  completed_at    TIMESTAMPTZ,
  failure_reason  TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pix_withdrawals_user_id ON pix_withdrawals (user_id);
CREATE INDEX IF NOT EXISTS idx_pix_withdrawals_status  ON pix_withdrawals (status);

-- 5. RLS nas novas tabelas (bot usa SERVICE_ROLE_KEY, bypassa RLS)
ALTER TABLE pix_deposits    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pix_withdrawals ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE pix_deposits IS 'Depósitos PIX via Mercado Pago. Status: pending → confirmed | expired | cancelled.';
COMMENT ON TABLE pix_withdrawals IS 'Saques PIX via Mercado Pago. Mínimo R$20, máximo R$500/dia, lock de 24h no primeiro saque.';
