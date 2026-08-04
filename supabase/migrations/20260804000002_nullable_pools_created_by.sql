-- Pools globais não têm dono: created_by passa a ser nullable.
-- Pools privadas continuam referenciando o usuário criador.
ALTER TABLE pools ALTER COLUMN created_by DROP NOT NULL;
