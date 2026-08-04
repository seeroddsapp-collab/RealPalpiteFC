--- Funções atômicas de saldo — evitam race conditions em operações concorrentes.
-- Todas usam UPDATE com WHERE condicional + RETURNING, garantindo atomicidade no Postgres.

-- Debita `p_amount` do saldo apenas se o usuário tiver fundos suficientes.
-- Retorna o novo saldo, ou NULL se saldo insuficiente (0 linhas afetadas).
CREATE OR REPLACE FUNCTION debit_balance(p_user_id UUID, p_amount NUMERIC)
RETURNS NUMERIC AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  UPDATE users
  SET virtual_balance = virtual_balance - p_amount
  WHERE id = p_user_id AND virtual_balance >= p_amount
  RETURNING virtual_balance INTO v_new_balance;
  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Credita `p_amount` ao saldo do usuário incondicionalmente.
-- Retorna o novo saldo.
CREATE OR REPLACE FUNCTION credit_balance(p_user_id UUID, p_amount NUMERIC)
RETURNS NUMERIC AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  UPDATE users
  SET virtual_balance = virtual_balance + p_amount
  WHERE id = p_user_id
  RETURNING virtual_balance INTO v_new_balance;
  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Confirma um depósito PIX somente se ainda estiver pendente (idempotente).
-- Retorna a linha atualizada, ou vazio se já foi confirmado/falhou.
CREATE OR REPLACE FUNCTION confirm_pix_deposit(p_deposit_id UUID, p_confirmed_at TIMESTAMPTZ)
RETURNS SETOF pix_deposits AS $$
BEGIN
  RETURN QUERY
  UPDATE pix_deposits
  SET status = 'confirmed', confirmed_at = p_confirmed_at
  WHERE id = p_deposit_id AND status = 'pending'
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
