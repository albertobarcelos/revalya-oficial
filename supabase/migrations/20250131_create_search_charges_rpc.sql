-- =====================================================
-- MIGRAÇÃO: Criar função RPC para busca eficiente de charges
-- Data: 2025-01-31
-- Descrição: Função RPC para buscar charges com filtros complexos,
--            especialmente quando há muitos customers correspondentes
-- Autor: Barcelitos AI Agent
-- =====================================================

-- AIDEV-NOTE: Função RPC para busca eficiente de charges
-- Esta função resolve o problema de URLs muito longas quando há muitos customers
-- Fazendo a busca diretamente no banco com JOINs otimizados

CREATE OR REPLACE FUNCTION search_charges(
  p_tenant_id UUID,
  p_search_term TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_type TEXT DEFAULT NULL,
  p_customer_id UUID DEFAULT NULL,
  p_contract_id UUID DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 10
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_total INTEGER;
  v_offset INTEGER;
  v_search_pattern TEXT;
  v_cleaned_search TEXT;
BEGIN
  -- AIDEV-NOTE: Validar tenant_id
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id é obrigatório';
  END IF;

  -- AIDEV-NOTE: Validar acesso do usuário ao tenant
  -- Verificar se o usuário autenticado tem acesso ao tenant através de tenant_users
  IF NOT EXISTS (
    SELECT 1 
    FROM tenant_users tu
    WHERE tu.tenant_id = p_tenant_id
      AND tu.user_id = auth.uid()
      AND tu.active = true
  ) THEN
    RAISE EXCEPTION 'Acesso negado ao tenant';
  END IF;

  -- AIDEV-NOTE: Calcular offset para paginação
  v_offset := (p_page - 1) * p_limit;

  -- AIDEV-NOTE: Preparar termo de busca
  IF p_search_term IS NOT NULL AND LENGTH(TRIM(p_search_term)) > 0 THEN
    v_search_pattern := '%' || LOWER(TRIM(p_search_term)) || '%';
    v_cleaned_search := REGEXP_REPLACE(p_search_term, '[^0-9]', '', 'g');
  END IF;

  -- AIDEV-NOTE: Buscar total de registros (sem paginação)
  SELECT COUNT(*) INTO v_total
  FROM charges c
  LEFT JOIN customers cust ON c.customer_id = cust.id
  WHERE c.tenant_id = p_tenant_id
    AND (
      -- Filtro de status
      (p_status IS NULL OR 
       (p_status = 'PENDING' AND c.status = 'PENDING' AND c.data_vencimento >= CURRENT_DATE) OR
       (p_status = 'OVERDUE' AND c.status = 'PENDING' AND c.data_vencimento < CURRENT_DATE) OR
       (p_status != 'PENDING' AND p_status != 'OVERDUE' AND c.status = p_status))
    )
    AND (p_type IS NULL OR c.tipo = p_type)
    AND (p_customer_id IS NULL OR c.customer_id = p_customer_id)
    AND (p_contract_id IS NULL OR c.contract_id = p_contract_id)
    AND (p_start_date IS NULL OR c.data_vencimento >= p_start_date)
    AND (p_end_date IS NULL OR c.data_vencimento <= p_end_date)
    AND (
      -- Busca: campos diretos da charge OU dados do customer
      v_search_pattern IS NULL OR
      c.descricao ILIKE v_search_pattern OR
      c.asaas_id ILIKE v_search_pattern OR
      cust.name ILIKE v_search_pattern OR
      cust.company ILIKE v_search_pattern OR
      (v_cleaned_search IS NOT NULL AND LENGTH(v_cleaned_search) >= 3 AND 
       cust.cpf_cnpj::TEXT ILIKE '%' || v_cleaned_search || '%')
    );

  -- AIDEV-NOTE: Buscar dados paginados
  WITH filtered_charges AS (
    SELECT 
      c.id,
      c.status,
      c.valor,
      c.tipo,
      c.data_vencimento,
      c.data_pagamento,
      c.descricao,
      c.asaas_id,
      c.metadata,
      c.created_at,
      c.updated_at,
      c.customer_id,
      c.contract_id,
      c.tenant_id,
      cust.id AS cust_id,
      cust.name AS cust_name,
      cust.company AS cust_company,
      cust.email AS cust_email,
      cust.phone AS cust_phone,
      cust.cpf_cnpj AS cust_cpf_cnpj,
      cont.id AS cont_id,
      cont.contract_number AS cont_contract_number
    FROM charges c
    LEFT JOIN customers cust ON c.customer_id = cust.id
    LEFT JOIN contracts cont ON c.contract_id = cont.id
    WHERE c.tenant_id = p_tenant_id
      AND (
        -- Filtro de status
        (p_status IS NULL OR 
         (p_status = 'PENDING' AND c.status = 'PENDING' AND c.data_vencimento >= CURRENT_DATE) OR
         (p_status = 'OVERDUE' AND c.status = 'PENDING' AND c.data_vencimento < CURRENT_DATE) OR
         (p_status != 'PENDING' AND p_status != 'OVERDUE' AND c.status = p_status))
      )
      AND (p_type IS NULL OR c.tipo = p_type)
      AND (p_customer_id IS NULL OR c.customer_id = p_customer_id)
      AND (p_contract_id IS NULL OR c.contract_id = p_contract_id)
      AND (p_start_date IS NULL OR c.data_vencimento >= p_start_date)
      AND (p_end_date IS NULL OR c.data_vencimento <= p_end_date)
      AND (
        -- Busca: campos diretos da charge OU dados do customer
        v_search_pattern IS NULL OR
        c.descricao ILIKE v_search_pattern OR
        c.asaas_id ILIKE v_search_pattern OR
        cust.name ILIKE v_search_pattern OR
        cust.company ILIKE v_search_pattern OR
        (v_cleaned_search IS NOT NULL AND LENGTH(v_cleaned_search) >= 3 AND 
         cust.cpf_cnpj::TEXT ILIKE '%' || v_cleaned_search || '%')
      )
    ORDER BY c.data_vencimento DESC, c.created_at DESC
    LIMIT p_limit
    OFFSET v_offset
  )
  SELECT json_build_object(
    'data', COALESCE(
      json_agg(
        json_build_object(
          'id', id,
          'status', status,
          'valor', valor,
          'tipo', tipo,
          'data_vencimento', data_vencimento,
          'data_pagamento', data_pagamento,
          'descricao', descricao,
          'asaas_id', asaas_id,
          'metadata', metadata,
          'created_at', created_at,
          'updated_at', updated_at,
          'customer_id', customer_id,
          'contract_id', contract_id,
          'tenant_id', tenant_id,
          'customers', CASE 
            WHEN cust_id IS NOT NULL THEN json_build_object(
              'id', cust_id,
              'name', cust_name,
              'company', cust_company,
              'email', cust_email,
              'phone', cust_phone,
              'cpf_cnpj', cust_cpf_cnpj
            )
            ELSE NULL
          END,
          'contracts', CASE
            WHEN cont_id IS NOT NULL THEN json_build_object(
              'id', cont_id,
              'contract_number', cont_contract_number
            )
            ELSE NULL
          END
        )
      ),
      '[]'::json
    ),
    'total', v_total
  ) INTO v_result
  FROM filtered_charges;

  -- AIDEV-NOTE: Retornar resultado ou objeto vazio se não houver dados
  RETURN COALESCE(v_result, json_build_object('data', '[]'::json, 'total', 0));
END;
$$;

-- AIDEV-NOTE: Comentário para documentação
COMMENT ON FUNCTION search_charges IS 'Função RPC para busca eficiente de charges com filtros complexos. Resolve problema de URLs muito longas quando há muitos customers correspondentes.';

-- AIDEV-NOTE: Garantir que a função seja acessível via RLS
GRANT EXECUTE ON FUNCTION search_charges TO authenticated;
GRANT EXECUTE ON FUNCTION search_charges TO anon;

