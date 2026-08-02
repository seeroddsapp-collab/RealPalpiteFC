-- Adiciona modalidade 'dupla_chance' (1X / 12 / X2) à tabela pools
ALTER TABLE pools
  DROP CONSTRAINT IF EXISTS pools_modality_check,
  ADD CONSTRAINT pools_modality_check
    CHECK (modality IN ('dupla_chance_resultado', 'dupla_chance', 'total_de_gols', 'placar_exato'));
