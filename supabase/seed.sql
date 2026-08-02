-- ============================================================
-- SEED — Dados iniciais para teste do MVP
-- Execute no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/rczxqhvtqnpbtvzkjpml/sql/new
-- ============================================================

-- 1. Campeonatos
INSERT INTO championships (id, name, espn_code, football_data_code, modalities, is_active)
VALUES
  (gen_random_uuid(), 'Brasileirao Serie A', 'bra.1', 2013, ARRAY['dupla_chance_resultado','total_de_gols','placar_exato'], true),
  (gen_random_uuid(), 'Copa Libertadores',   'conmebol.libertadores', 2001, ARRAY['dupla_chance_resultado','total_de_gols','placar_exato'], true),
  (gen_random_uuid(), 'Premier League',       'eng.1', 2021, ARRAY['dupla_chance_resultado','total_de_gols','placar_exato'], true)
ON CONFLICT DO NOTHING;

-- 2. Partidas (kickoff_at no futuro para ficarem abertas)
-- Pega o ID do Brasileirao
WITH champ AS (
  SELECT id FROM championships WHERE name = 'Brasileirao Serie A' LIMIT 1
)
INSERT INTO matches (id, championship_id, home_team, away_team, kickoff_at, status)
SELECT
  gen_random_uuid(),
  champ.id,
  home,
  away,
  kickoff,
  'scheduled'
FROM champ,
(VALUES
  ('Flamengo',   'Palmeiras',  NOW() + INTERVAL '2 days'),
  ('Atletico MG','Botafogo',   NOW() + INTERVAL '3 days'),
  ('Sao Paulo',  'Fluminense', NOW() + INTERVAL '4 days')
) AS t(home, away, kickoff)
ON CONFLICT DO NOTHING;

-- 3. Pools abertas (uma de cada modalidade para a primeira partida)
WITH match1 AS (
  SELECT m.id
  FROM matches m
  JOIN championships c ON c.id = m.championship_id
  WHERE c.name = 'Brasileirao Serie A'
    AND m.home_team = 'Flamengo'
  LIMIT 1
),
admin AS (
  SELECT id FROM users LIMIT 1
)
INSERT INTO pools (id, match_id, modality, tier_brl, type, status, goal_threshold, created_by)
SELECT
  gen_random_uuid(),
  match1.id,
  mod,
  tier,
  'global',
  'open',
  threshold,
  admin.id
FROM match1, admin,
(VALUES
  ('dupla_chance_resultado', 10.00, NULL),
  ('dupla_chance',           10.00, NULL),
  ('total_de_gols',          10.00, 2.5),
  ('placar_exato',           25.00, NULL)
) AS t(mod, tier, threshold)
ON CONFLICT DO NOTHING;
