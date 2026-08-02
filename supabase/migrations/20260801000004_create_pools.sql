-- Pools (listas de bolão) vinculadas a uma partida e modalidade

CREATE TABLE pools (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id        UUID          NOT NULL REFERENCES matches (id),
  modality        TEXT          NOT NULL
                    CHECK (modality IN ('dupla_chance_resultado', 'total_de_gols', 'placar_exato')),
  tier_brl        NUMERIC(8, 2) NOT NULL,  -- valor de entrada em R$ (ex: 5, 10, 25, 50)
  type            TEXT          NOT NULL DEFAULT 'global'
                    CHECK (type IN ('global', 'private')),
  status          TEXT          NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'closed', 'resolved', 'cancelled')),
  goal_threshold  NUMERIC(4, 1),           -- obrigatório para modality = 'total_de_gols' (ex: 2.5)
  created_by      UUID          NOT NULL REFERENCES users (id),
  closed_at       TIMESTAMPTZ,             -- preenchido ao fechar (5 min antes do kickoff — Regra 1)
  resolved_at     TIMESTAMPTZ,             -- preenchido após distribuição de prêmio/devolução
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pools_match_id  ON pools (match_id);
CREATE INDEX idx_pools_status    ON pools (status);
CREATE INDEX idx_pools_type      ON pools (type);

COMMENT ON TABLE  pools                IS 'Pools (listas) de bolão. Uma pool por combinação partida+modalidade+tier (global) ou criada livremente (private).';
COMMENT ON COLUMN pools.tier_brl       IS 'Valor de entrada em R$. Validar contra TIERS_BY_MODALITY em packages/core.';
COMMENT ON COLUMN pools.goal_threshold IS 'Limiar de gols para over/under. Obrigatório quando modality = total_de_gols.';
COMMENT ON COLUMN pools.closed_at      IS 'Preenchido pelo cron 5 min antes do kickoff (Regra 1).';
COMMENT ON COLUMN pools.resolved_at    IS 'Preenchido após calculatePool() e distribuição de pagamentos.';
