-- Partidas vinculadas a campeonatos

CREATE TABLE matches (
  id                        UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_id           UUID   NOT NULL REFERENCES championships (id),
  home_team                 TEXT   NOT NULL,
  away_team                 TEXT   NOT NULL,
  kickoff_at                TIMESTAMPTZ NOT NULL,
  status                    TEXT   NOT NULL DEFAULT 'scheduled'
                              CHECK (status IN ('scheduled', 'in_progress', 'finished', 'cancelled', 'postponed')),
  result                    JSONB,          -- {homeScore: int, awayScore: int} — preenchido ao fim do tempo normal
  espn_match_id             TEXT,           -- ID na ESPN para polling de resultado
  football_data_match_id    INTEGER,        -- ID no football-data.org (fallback)
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_matches_championship_id ON matches (championship_id);
CREATE INDEX idx_matches_kickoff_at      ON matches (kickoff_at);
CREATE INDEX idx_matches_status          ON matches (status);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER matches_set_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  matches            IS 'Partidas de futebol com kickoff e resultado (apenas tempo normal — Regra 9)';
COMMENT ON COLUMN matches.result     IS 'Resultado ao fim do tempo normal. NULL enquanto não finalizado.';
COMMENT ON COLUMN matches.updated_at IS 'Atualizado automaticamente pelo trigger set_updated_at';
