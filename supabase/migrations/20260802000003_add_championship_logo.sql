-- Adiciona URL do logo (escudo) do campeonato, preenchido pelo sync da ESPN
ALTER TABLE championships
  ADD COLUMN IF NOT EXISTS logo_url TEXT;
