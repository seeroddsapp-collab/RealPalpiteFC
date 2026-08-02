-- Adiciona URLs dos escudos dos times à tabela matches (vindos da ESPN)
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS home_team_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS away_team_logo_url TEXT;
