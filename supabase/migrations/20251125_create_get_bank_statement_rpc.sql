-- =====================================================
-- RPC: get_bank_statement
-- Data: 2025-11-25
-- Descrição: Consolida operações por conta, ordena por data e calcula saldo acumulado
-- Autor: Sistema Revalya
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_bank_statement(
  p_tenant_id UUID,
  p_bank_acount_id UUID DEFAULT NULL,
  p_start DATE DEFAULT NULL,
  p_end DATE DEFAULT NULL,
  p_operation_type bank_operation_type DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  bank_acount_id UUID,
  operation_type bank_operation_type,
  amount NUMERIC(18,2),
  operation_date TIMESTAMPTZ,
  description TEXT,
  category TEXT,
  document_reference TEXT,
  running_balance NUMERIC(18,2)
)
AS $$
/*
  Retorna o extrato consolidado de operações bancárias para um tenant,
  com filtros por conta, período e tipo de operação, incluindo saldo acumulado
  após cada transação.

  Observações:
  - O saldo acumulado é calculado com base em soma de CREDIT (+) e DEBIT (-).
  - O cálculo considera um saldo inicial (operações anteriores a p_start).
  - Ordenação final: do mais recente para o mais antigo.
*/
DECLARE
  v_initial_balance NUMERIC(18,2);
BEGIN
  -- Saldo inicial (operações anteriores ao início do período)
  SELECT COALESCE(SUM(CASE WHEN boh.operation_type = 'CREDIT' THEN boh.amount ELSE -boh.amount END), 0)
  INTO v_initial_balance
  FROM public.bank_operation_history boh
  WHERE boh.tenant_id = p_tenant_id
    AND (p_bank_acount_id IS NULL OR boh.bank_acount_id = p_bank_acount_id)
    AND (p_start IS NOT NULL AND boh.operation_date::date < p_start);

  RETURN QUERY
  WITH base AS (
    SELECT
      boh.id,
      boh.bank_acount_id,
      boh.operation_type,
      boh.amount,
      boh.operation_date,
      boh.description,
      boh.category,
      boh.document_reference,
      CASE WHEN boh.operation_type = 'CREDIT' THEN boh.amount ELSE -boh.amount END AS signed_amount
    FROM public.bank_operation_history boh
    WHERE boh.tenant_id = p_tenant_id
      AND (p_bank_acount_id IS NULL OR boh.bank_acount_id = p_bank_acount_id)
      AND (p_operation_type IS NULL OR boh.operation_type = p_operation_type)
      AND (p_start IS NULL OR boh.operation_date::date >= p_start)
      AND (p_end IS NULL OR boh.operation_date::date <= p_end)
  ), acc AS (
    SELECT
      id,
      bank_acount_id,
      operation_type,
      amount,
      operation_date,
      description,
      category,
      document_reference,
      signed_amount,
      v_initial_balance + SUM(signed_amount) OVER (ORDER BY operation_date ASC, id ASC) AS running_balance
    FROM base
  )
  SELECT
    id,
    bank_acount_id,
    operation_type,
    amount,
    operation_date,
    description,
    category,
    document_reference,
    running_balance
  FROM acc
  ORDER BY operation_date DESC, id DESC;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

COMMENT ON FUNCTION public.get_bank_statement(UUID, UUID, DATE, DATE, bank_operation_type)
IS 'Extrato bancário consolidado por conta, com filtros e saldo acumulado.';