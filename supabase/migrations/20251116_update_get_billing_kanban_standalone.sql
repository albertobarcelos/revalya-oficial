-- =====================================================
-- MIGRAÇÃO: ATUALIZAR FUNÇÃO get_billing_kanban PARA INCLUIR FATURAMENTOS AVULSOS
-- Data: 2025-11-16
-- Descrição: Modifica função get_billing_kanban para incluir períodos avulsos via UNION
-- Autor: Sistema Revalya
-- =====================================================

-- AIDEV-NOTE: Criar ou substituir função get_billing_kanban para incluir períodos avulsos
-- A função retorna dados unificados de contract_billing_periods e standalone_billing_periods
CREATE OR REPLACE FUNCTION get_billing_kanban(p_tenant_id UUID)
RETURNS TABLE (
  id UUID,
  contract_id UUID,
  customer_id UUID,
  customer_name TEXT,
  contract_number TEXT,
  amount NUMERIC,
  amount_planned NUMERIC,
  amount_billed NUMERIC,
  bill_date DATE,
  billed_at TIMESTAMP WITH TIME ZONE,
  period_start DATE,
  period_end DATE,
  billing_status TEXT,
  priority TEXT,
  kanban_column TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- AIDEV-NOTE: Configurar contexto de tenant para segurança
  PERFORM set_tenant_context_simple(p_tenant_id);

  -- AIDEV-NOTE: Retornar dados unificados de períodos de contrato e períodos avulsos
  RETURN QUERY
  WITH contract_periods AS (
    -- Períodos de faturamento de contratos
    SELECT 
      cbp.id,
      cbp.contract_id,
      cont.customer_id,  -- AIDEV-NOTE: Corrigido - customer_id está em contracts (cont), não em contract_services (c)
      COALESCE(cust.name, 'Cliente Desconhecido') as customer_name,
      cont.contract_number,
      COALESCE(cbp.amount_planned, 0) as amount,
      cbp.amount_planned,
      cbp.amount_billed,
      cbp.bill_date,
      cbp.billed_at,
      cbp.period_start,
      cbp.period_end,
      cbp.status::TEXT as billing_status,
      CASE 
        WHEN cbp.status = 'DUE_TODAY' THEN 'high'
        WHEN cbp.status = 'LATE' THEN 'high'
        WHEN cbp.status = 'PENDING' THEN 'medium'
        ELSE 'low'
      END as priority,
      CASE 
        WHEN cbp.status = 'DUE_TODAY' THEN 'Faturar Hoje'
        WHEN cbp.status = 'BILLED' THEN 'Faturados no Mês'
        WHEN cbp.status = 'LATE' THEN 'Faturamento Pendente'  -- AIDEV-NOTE: contract_billing_periods usa 'LATE'
        WHEN cbp.status = 'PENDING' THEN 'Faturamento Pendente'
        WHEN cont.final_date < CURRENT_DATE THEN 'Contratos a Renovar'  -- AIDEV-NOTE: Corrigido - usar cont em vez de c
        ELSE 'Faturamento Pendente'
      END as kanban_column
    FROM contract_billing_periods cbp
    INNER JOIN contracts cont ON cont.id = cbp.contract_id
    INNER JOIN customers cust ON cust.id = cont.customer_id
    WHERE cbp.tenant_id = p_tenant_id
      AND cbp.status IN ('PENDING', 'DUE_TODAY', 'LATE', 'BILLED')  -- AIDEV-NOTE: contract_billing_periods usa 'LATE', não 'OVERDUE'
  ),
  standalone_periods AS (
    -- Períodos de faturamento avulso
    SELECT 
      sbp.id,
      sbp.contract_id, -- Pode ser NULL
      sbp.customer_id,
      COALESCE(cust.name, 'Cliente Desconhecido') as customer_name,
      'Faturamento Avulso' as contract_number,
      COALESCE(sbp.amount_planned, 0) as amount,
      sbp.amount_planned,
      sbp.amount_billed,
      sbp.bill_date,
      sbp.billed_at,
      sbp.bill_date as period_start, -- Usa bill_date como period_start para avulsos
      sbp.due_date as period_end, -- Usa due_date como period_end para avulsos
      sbp.status::TEXT as billing_status,
      CASE 
        WHEN sbp.status = 'DUE_TODAY' THEN 'high'
        WHEN sbp.status = 'OVERDUE' THEN 'high'
        WHEN sbp.status = 'PENDING' THEN 'medium'
        ELSE 'low'
      END as priority,
      CASE 
        WHEN sbp.status = 'DUE_TODAY' THEN 'Faturar Hoje'
        WHEN sbp.status = 'BILLED' THEN 'Faturados no Mês'
        WHEN sbp.status = 'OVERDUE' THEN 'Faturamento Pendente'
        WHEN sbp.status = 'PENDING' THEN 'Faturamento Pendente'
        ELSE 'Faturamento Pendente'
      END as kanban_column
    FROM standalone_billing_periods sbp
    INNER JOIN customers cust ON cust.id = sbp.customer_id
    WHERE sbp.tenant_id = p_tenant_id
      AND sbp.status IN ('PENDING', 'DUE_TODAY', 'OVERDUE', 'BILLED')
  )
  -- AIDEV-NOTE: UNION ALL para combinar ambos os tipos de períodos
  SELECT * FROM contract_periods
  UNION ALL
  SELECT * FROM standalone_periods
  ORDER BY 
    CASE kanban_column
      WHEN 'Faturar Hoje' THEN 1
      WHEN 'Faturamento Pendente' THEN 2
      WHEN 'Faturados no Mês' THEN 3
      WHEN 'Contratos a Renovar' THEN 4
      ELSE 5
    END,
    bill_date ASC;
END;
$$;

-- AIDEV-NOTE: Comentário na função
COMMENT ON FUNCTION get_billing_kanban(UUID) IS 'Retorna dados unificados do Kanban de Faturamento incluindo períodos de contratos e faturamentos avulsos';

