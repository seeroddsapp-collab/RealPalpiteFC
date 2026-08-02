-- Campeonatos/competições disponíveis no sistema

CREATE TABLE championships (
  id                    UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT    NOT NULL,
  espn_code             TEXT,              -- ex: bra.1, arg.1, conmebol.libertadores
  football_data_code    INTEGER,           -- ex: 2013 (Série A), 2021 (Premier League)
  modalities            TEXT[]  NOT NULL DEFAULT '{}', -- modalidades disponíveis neste campeonato
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_championships_is_active ON championships (is_active);

COMMENT ON TABLE  championships                   IS 'Campeonatos disponíveis para criação de pools';
COMMENT ON COLUMN championships.espn_code         IS 'Código do campeonato na ESPN (fonte primária de dados)';
COMMENT ON COLUMN championships.football_data_code IS 'ID do campeonato no football-data.org (fonte de fallback)';
COMMENT ON COLUMN championships.modalities        IS 'Modalidades habilitadas: dupla_chance_resultado, total_de_gols, placar_exato';
