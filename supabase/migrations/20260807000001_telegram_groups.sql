-- Grupos do Telegram onde o bot foi adicionado como admin
CREATE TABLE IF NOT EXISTS telegram_groups (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id               BIGINT      UNIQUE NOT NULL,
  title                 TEXT,
  added_by_telegram_id  BIGINT,
  is_active             BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Controle para não enviar notificação duplicada de abertura de bolão por partida
ALTER TABLE matches ADD COLUMN IF NOT EXISTS groups_notified BOOLEAN NOT NULL DEFAULT FALSE;
