-- =====================================================
-- MIGRAÇÃO: Sincronização Automática de Charges
-- Data: 2025-01-09
-- Descrição: Sincroniza charges com conciliation_staging via pg_cron (a cada 1 hora)
-- Autor: Barcelitos AI Agent
-- =====================================================

-- AIDEV-NOTE: Função auxiliar para mapear status_externo (minúsculas) para status (MAIÚSCULAS)
-- Replica a lógica da Edge Function mapExternalStatusToChargeStatus
CREATE OR REPLACE FUNCTION map_external_status_to_charge_status(status_externo TEXT)
RETURNS TEXT AS $$
BEGIN
  IF status_externo IS NULL THEN
    RETURN 'PENDING';
  END IF;
  
  RETURN CASE LOWER(status_externo)
    WHEN 'pending' THEN 'PENDING'
    WHEN 'received' THEN 'RECEIVED'
    WHEN 'overdue' THEN 'OVERDUE'
    WHEN 'confirmed' THEN 'CONFIRMED'
    WHEN 'refunded' THEN 'REFUNDED'
    WHEN 'created' THEN 'PENDING'
    WHEN 'deleted' THEN 'PENDING'
    WHEN 'checkout_viewed' THEN 'PENDING'
    WHEN 'anticipaded' THEN 'RECEIVED'  -- Mantém o typo do constraint
    ELSE 'PENDING'  -- Default seguro
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- AIDEV-NOTE: Função principal de sincronização para um tenant específico
-- Replica a lógica da Edge Function sync-charges-from-staging
CREATE OR REPLACE FUNCTION sync_charges_from_staging_for_tenant(p_tenant_id UUID)
RETURNS JSON AS $$
DECLARE
  v_total_found INTEGER := 0;
  v_processed INTEGER := 0;
  v_updated INTEGER := 0;
  v_skipped INTEGER := 0;
  v_errors INTEGER := 0;
  v_movement RECORD;
  v_charge_id UUID;
  v_mapped_status TEXT;
  v_needs_update BOOLEAN;
  v_current_status TEXT;
  v_current_payment_value NUMERIC;
BEGIN
  -- AIDEV-NOTE: Buscar movimentações que podem ser sincronizadas
  -- Critério: têm charge_id OU têm id_externo que corresponde a asaas_id em charges
  FOR v_movement IN
    SELECT 
      cs.id as movement_id,
      cs.tenant_id,
      cs.id_externo,
      cs.status_externo,
      cs.valor_cobranca,
      cs.charge_id
    FROM conciliation_staging cs
    WHERE cs.tenant_id = p_tenant_id
      AND cs.origem = 'ASAAS'
      AND cs.deleted_flag = false
      AND cs.status_externo IS NOT NULL
    ORDER BY cs.created_at DESC
  LOOP
    v_total_found := v_total_found + 1;
    
    BEGIN
      -- AIDEV-NOTE: Buscar charge vinculada
      -- Prioridade: charge_id direto > asaas_id correspondente
      v_charge_id := v_movement.charge_id;
      
      IF v_charge_id IS NULL AND v_movement.id_externo IS NOT NULL THEN
        -- Buscar charge pelo asaas_id
        SELECT c.id INTO v_charge_id
        FROM charges c
        WHERE c.tenant_id = p_tenant_id
          AND c.asaas_id = v_movement.id_externo
        LIMIT 1;
      END IF;
      
      IF v_charge_id IS NULL THEN
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;
      
      -- AIDEV-NOTE: Verificar se precisa atualizar
      SELECT 
        c.status,
        c.payment_value
      INTO 
        v_current_status,
        v_current_payment_value
      FROM charges c
      WHERE c.id = v_charge_id
        AND c.tenant_id = p_tenant_id;
      
      IF v_current_status IS NULL THEN
        -- Charge não encontrada (pode ter sido deletada)
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;
      
      -- Verificar se precisa atualizar
      v_mapped_status := map_external_status_to_charge_status(v_movement.status_externo);
      
      v_needs_update := FALSE;
      
      -- Verificar status
      IF v_current_status != v_mapped_status THEN
        v_needs_update := TRUE;
      END IF;
      
      -- Verificar payment_value
      IF (v_current_payment_value IS DISTINCT FROM v_movement.valor_cobranca 
          AND v_movement.valor_cobranca IS NOT NULL) THEN
        v_needs_update := TRUE;
      END IF;
      
      IF NOT v_needs_update THEN
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;
      
      -- AIDEV-NOTE: Atualizar charge
      UPDATE charges
      SET 
        status = v_mapped_status,
        payment_value = COALESCE(v_movement.valor_cobranca, payment_value),
        updated_at = NOW() - INTERVAL '3 hours'  -- UTC-3 (horário de Brasília)
      WHERE id = v_charge_id
        AND tenant_id = p_tenant_id;
      
      IF FOUND THEN
        v_updated := v_updated + 1;
      ELSE
        v_skipped := v_skipped + 1;
      END IF;
      
      v_processed := v_processed + 1;
      
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      -- AIDEV-NOTE: Log do erro (pode ser expandido para tabela de logs)
      RAISE WARNING 'Erro ao processar movimentação %: %', v_movement.movement_id, SQLERRM;
    END;
  END LOOP;
  
  -- AIDEV-NOTE: Retornar estatísticas em formato JSON
  RETURN json_build_object(
    'tenant_id', p_tenant_id,
    'total_found', v_total_found,
    'processed', v_processed,
    'updated', v_updated,
    'skipped', v_skipped,
    'errors', v_errors,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- AIDEV-NOTE: Função wrapper para processar todos os tenants ativos
CREATE OR REPLACE FUNCTION sync_charges_from_staging_all_tenants()
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
      v_result := sync_charges_from_staging_for_tenant(v_tenant.id);
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
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- AIDEV-NOTE: Habilitar extensão pg_cron (se ainda não estiver habilitada)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- AIDEV-NOTE: Remover cron job existente (se houver) para evitar duplicação
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'sync-charges-from-staging-hourly'
  ) THEN
    PERFORM cron.unschedule('sync-charges-from-staging-hourly');
  END IF;
END $$;

-- AIDEV-NOTE: Agendar execução a cada 1 hora
-- Formato cron: '0 * * * *' = todo minuto 0 de cada hora (a cada 1 hora)
SELECT cron.schedule(
  'sync-charges-from-staging-hourly',
  '0 * * * *',  -- A cada 1 hora (minuto 0 de cada hora)
  $$
  SELECT sync_charges_from_staging_all_tenants();
  $$
);

-- AIDEV-NOTE: Comentários de documentação
COMMENT ON FUNCTION map_external_status_to_charge_status(TEXT) IS 
'Mapeia status_externo (minúsculas) para status (MAIÚSCULAS) conforme constraint da tabela charges.';

COMMENT ON FUNCTION sync_charges_from_staging_for_tenant(UUID) IS 
'Sincroniza charges com conciliation_staging para um tenant específico. Atualiza status e payment_value.';

COMMENT ON FUNCTION sync_charges_from_staging_all_tenants() IS 
'Processa sincronização de charges para todos os tenants ativos. Executado automaticamente via pg_cron a cada 1 hora.';

