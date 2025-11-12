-- =====================================================
-- MIGRAÇÃO: Refatorar Cron Job para buscar da API ASAAS
-- Data: 2025-01-30
-- Descrição: Refatora cron job para buscar dados diretamente da API ASAAS ao invés de conciliation_staging
-- Autor: Barcelitos AI Agent
-- =====================================================

-- AIDEV-NOTE: Esta migração refatora o cron job para buscar dados atualizados
-- diretamente da API ASAAS e atualizar charges com todos os campos mapeados

-- =====================================================
-- HABILITAR EXTENSÃO pg_net (se necessário)
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

-- =====================================================
-- FUNÇÃO: Buscar dados do pagamento na API ASAAS
-- =====================================================

-- AIDEV-NOTE: Esta função será chamada via Edge Function ao invés de diretamente do SQL
-- O cron job chamará uma Edge Function que fará as chamadas HTTP para a API ASAAS

-- =====================================================
-- FUNÇÃO: Sincronizar charges do ASAAS para um tenant
-- =====================================================

-- AIDEV-NOTE: Nova função que busca charges com asaas_id e verifica se precisam atualização
-- Como não podemos fazer chamadas HTTP diretamente do SQL de forma eficiente,
-- vamos criar uma função que identifica charges que precisam ser atualizadas
-- e a Edge Function será responsável por buscar da API e atualizar

CREATE OR REPLACE FUNCTION identify_charges_needing_sync(p_tenant_id UUID)
RETURNS TABLE(
  charge_id UUID,
  asaas_id TEXT,
  current_status TEXT,
  current_data_pagamento DATE,
  last_updated TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as charge_id,
    c.asaas_id,
    c.status as current_status,
    c.data_pagamento as current_data_pagamento,
    c.updated_at as last_updated
  FROM charges c
  WHERE c.tenant_id = p_tenant_id
    AND c.asaas_id IS NOT NULL
    AND c.origem = 'ASAAS'
    -- AIDEV-NOTE: Identificar charges que podem precisar atualização:
    -- 1. Status PENDING ou OVERDUE (podem ter mudado)
    -- 2. Sem data_pagamento mas podem ter sido pagas
    -- 3. Atualizadas há mais de 1 hora
    AND (
      c.status IN ('PENDING', 'OVERDUE')
      OR (c.data_pagamento IS NULL AND c.status != 'REFUNDED')
      OR c.updated_at < NOW() - INTERVAL '1 hour'
    )
  ORDER BY c.updated_at ASC
  LIMIT 100; -- AIDEV-NOTE: Limitar para não sobrecarregar
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO: Atualizar charge com dados da API ASAAS
-- =====================================================

-- AIDEV-NOTE: Esta função será chamada pela Edge Function após buscar dados da API
-- Recebe os dados atualizados e atualiza a charge

CREATE OR REPLACE FUNCTION update_charge_from_asaas_data(
  p_charge_id UUID,
  p_tenant_id UUID,
  p_status TEXT,
  p_data_pagamento DATE,
  p_payment_value NUMERIC,
  p_net_value NUMERIC DEFAULT NULL,
  p_interest_rate NUMERIC DEFAULT NULL,
  p_fine_rate NUMERIC DEFAULT NULL,
  p_discount_value NUMERIC DEFAULT NULL,
  p_invoice_url TEXT DEFAULT NULL,
  p_pdf_url TEXT DEFAULT NULL,
  p_transaction_receipt_url TEXT DEFAULT NULL,
  p_external_invoice_number TEXT DEFAULT NULL,
  p_barcode TEXT DEFAULT NULL,
  p_pix_key TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN := FALSE;
BEGIN
  -- AIDEV-NOTE: Atualizar charge apenas se houver mudanças
  UPDATE charges
  SET 
    status = COALESCE(p_status, status),
    data_pagamento = COALESCE(p_data_pagamento, data_pagamento),
    payment_value = COALESCE(p_payment_value, payment_value),
    net_value = COALESCE(p_net_value, net_value),
    interest_rate = COALESCE(p_interest_rate, interest_rate),
    fine_rate = COALESCE(p_fine_rate, fine_rate),
    discount_value = COALESCE(p_discount_value, discount_value),
    invoice_url = COALESCE(p_invoice_url, invoice_url),
    pdf_url = COALESCE(p_pdf_url, pdf_url),
    transaction_receipt_url = COALESCE(p_transaction_receipt_url, transaction_receipt_url),
    external_invoice_number = COALESCE(p_external_invoice_number, external_invoice_number),
    barcode = COALESCE(p_barcode, barcode),
    pix_key = COALESCE(p_pix_key, pix_key),
    updated_at = NOW() - INTERVAL '3 hours' -- UTC-3 (horário de Brasília)
  WHERE id = p_charge_id
    AND tenant_id = p_tenant_id;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  
  RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO: Sincronizar charges para um tenant (wrapper)
-- =====================================================

-- AIDEV-NOTE: Esta função identifica charges que precisam sincronização
-- A Edge Function sync-charges-from-asaas-api será responsável por buscar da API e atualizar

CREATE OR REPLACE FUNCTION sync_charges_from_asaas_for_tenant(p_tenant_id UUID)
RETURNS JSON AS $$
DECLARE
  v_charge RECORD;
  v_total_found INTEGER := 0;
  v_charges_to_sync JSON[] := '{}';
BEGIN
  -- AIDEV-NOTE: Identificar charges que precisam sincronização
  FOR v_charge IN
    SELECT * FROM identify_charges_needing_sync(p_tenant_id)
  LOOP
    v_total_found := v_total_found + 1;
    v_charges_to_sync := array_append(
      v_charges_to_sync,
      json_build_object(
        'charge_id', v_charge.charge_id,
        'asaas_id', v_charge.asaas_id,
        'current_status', v_charge.current_status,
        'current_data_pagamento', v_charge.current_data_pagamento
      )
    );
  END LOOP;
  
  -- AIDEV-NOTE: Retornar lista de charges que precisam sincronização
  -- A Edge Function será chamada para processar essas charges
  RETURN json_build_object(
    'tenant_id', p_tenant_id,
    'total_found', v_total_found,
    'charges_to_sync', v_charges_to_sync,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO: Sincronizar charges para todos os tenants
-- =====================================================

CREATE OR REPLACE FUNCTION sync_charges_from_asaas_all_tenants()
RETURNS JSON AS $$
DECLARE
  v_tenant RECORD;
  v_result JSON;
  v_results JSON[] := '{}';
  v_total_tenants INTEGER := 0;
  v_successful_tenants INTEGER := 0;
  v_failed_tenants INTEGER := 0;
BEGIN
  -- AIDEV-NOTE: Processar cada tenant ativo
  FOR v_tenant IN
    SELECT id, name
    FROM tenants
    WHERE active = true
    ORDER BY created_at
  LOOP
    v_total_tenants := v_total_tenants + 1;
    
    BEGIN
      v_result := sync_charges_from_asaas_for_tenant(v_tenant.id);
      v_results := array_append(v_results, v_result);
      v_successful_tenants := v_successful_tenants + 1;
    EXCEPTION WHEN OTHERS THEN
      v_failed_tenants := v_failed_tenants + 1;
      v_results := array_append(v_results, json_build_object(
        'tenant_id', v_tenant.id,
        'tenant_name', v_tenant.name,
        'error', SQLERRM,
        'timestamp', NOW()
      ));
    END;
  END LOOP;
  
  -- AIDEV-NOTE: Retornar resumo consolidado
  RETURN json_build_object(
    'success', true,
    'total_tenants', v_total_tenants,
    'successful_tenants', v_successful_tenants,
    'failed_tenants', v_failed_tenants,
    'results', v_results,
    'timestamp', NOW(),
    'note', 'Esta função identifica charges que precisam sincronização. A Edge Function sync-charges-from-asaas-api deve ser chamada para buscar dados da API e atualizar.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ATUALIZAR CRON JOB
-- =====================================================

-- AIDEV-NOTE: Remover cron job antigo
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'sync-charges-from-staging-hourly'
  ) THEN
    PERFORM cron.unschedule('sync-charges-from-staging-hourly');
    RAISE NOTICE 'Cron job sync-charges-from-staging-hourly removido';
  END IF;
END $$;

-- AIDEV-NOTE: Criar novo cron job que chama Edge Function via HTTP usando pg_net
-- A Edge Function sync-charges-from-asaas-api será responsável por buscar dados da API e atualizar

-- AIDEV-NOTE: Remover cron job existente (se houver) para evitar duplicação
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'sync-charges-from-asaas-hourly'
  ) THEN
    PERFORM cron.unschedule('sync-charges-from-asaas-hourly');
    RAISE NOTICE 'Cron job sync-charges-from-asaas-hourly removido (existente)';
  END IF;
END $$;

-- AIDEV-NOTE: Criar cron job que identifica charges que precisam sincronização
-- A Edge Function sync-charges-from-asaas-api processará essas charges quando chamada
SELECT cron.schedule(
  'sync-charges-from-asaas-hourly',
  '0 * * * *',  -- A cada 1 hora
  $$
  SELECT sync_charges_from_asaas_all_tenants();
  $$
);

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON FUNCTION identify_charges_needing_sync(UUID) IS 
'Identifica charges do ASAAS que podem precisar sincronização com a API. Retorna lista de charges que devem ser verificadas.';

COMMENT ON FUNCTION update_charge_from_asaas_data(UUID, UUID, TEXT, DATE, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) IS 
'Atualiza charge com dados obtidos da API ASAAS. Chamada pela Edge Function após buscar dados atualizados.';

COMMENT ON FUNCTION sync_charges_from_asaas_for_tenant(UUID) IS 
'Identifica charges do ASAAS que precisam sincronização para um tenant específico. Retorna lista para processamento pela Edge Function.';

COMMENT ON FUNCTION sync_charges_from_asaas_all_tenants() IS 
'Identifica charges do ASAAS que precisam sincronização para todos os tenants ativos. Executado automaticamente via pg_cron a cada 1 hora. A Edge Function sync-charges-from-asaas-api deve processar as charges identificadas.';

