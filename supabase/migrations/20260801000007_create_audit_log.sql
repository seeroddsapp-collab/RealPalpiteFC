-- Log de auditoria para intervenções manuais de admin em resultados
-- Regra 11: toda correção manual passa por este log (quem, quando, o quê, motivo).

CREATE TABLE audit_log (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id         UUID        NOT NULL REFERENCES users (id),
  pool_id          UUID        NOT NULL REFERENCES pools (id),
  previous_result  JSONB       NOT NULL,  -- resultado antes da intervenção
  new_result       JSONB       NOT NULL,  -- resultado aplicado pelo admin
  reason           TEXT        NOT NULL,  -- justificativa obrigatória
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_pool_id    ON audit_log (pool_id);
CREATE INDEX idx_audit_log_admin_id   ON audit_log (admin_id);
CREATE INDEX idx_audit_log_created_at ON audit_log (created_at DESC);

COMMENT ON TABLE  audit_log              IS 'Registro imutável de intervenções manuais em resultados (Regra 11). Nunca deletar ou atualizar linhas.';
COMMENT ON COLUMN audit_log.admin_id     IS 'ID do admin que realizou a intervenção (referencia users.id).';
COMMENT ON COLUMN audit_log.reason       IS 'Justificativa obrigatória — campo exigido pelo painel admin.';
