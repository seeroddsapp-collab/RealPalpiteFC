-- Entradas/bilhetes de usuários em pools
-- Cada linha = 1 bilhete. Usuário pode ter até 2 por pool (Regra 7 — validado em packages/core).

CREATE TABLE entries (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id     UUID          NOT NULL REFERENCES pools (id),
  user_id     UUID          NOT NULL REFERENCES users (id),
  prediction  JSONB         NOT NULL,       -- varia por modalidade:
                                            -- dupla_chance: "home" | "draw" | "away"
                                            -- total_de_gols: "over" | "under"
                                            -- placar_exato: {homeScore: int, awayScore: int}
  amount      NUMERIC(8, 2) NOT NULL,       -- igual ao tier_brl da pool
  is_winner   BOOLEAN,                      -- NULL até resolução; true/false após
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_entries_pool_id          ON entries (pool_id);
CREATE INDEX idx_entries_user_id          ON entries (user_id);
CREATE INDEX idx_entries_pool_id_user_id  ON entries (pool_id, user_id);

COMMENT ON TABLE  entries            IS 'Bilhetes de entrada em pools. Limite de 2 por usuário por pool, validado em packages/core.';
COMMENT ON COLUMN entries.prediction IS 'Palpite serializado como JSONB. Estrutura depende da modalidade da pool.';
COMMENT ON COLUMN entries.is_winner  IS 'NULL antes da resolução. Definido por evaluatePrediction() em packages/core.';
