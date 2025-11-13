-- AIDEV-NOTE: Migration para vincular charges existentes aos contratos dos customers
-- Prioriza contratos ACTIVE, depois DRAFT, ordenando por mais recente

CREATE OR REPLACE FUNCTION link_existing_charges_to_contracts()
RETURNS TABLE(
  charges_updated BIGINT,
  charges_skipped BIGINT
) AS $$
DECLARE
  v_updated_count BIGINT := 0;
  v_skipped_count BIGINT := 0;
  v_charge_record RECORD;
  v_contract_id UUID;
BEGIN
  -- AIDEV-NOTE: Processar charges sem contract_id mas com customer_id
  FOR v_charge_record IN
    SELECT 
      c.id,
      c.tenant_id,
      c.customer_id,
      c.asaas_id,
      c.status
    FROM charges c
    WHERE c.contract_id IS NULL
      AND c.customer_id IS NOT NULL
      AND c.origem = 'ASAAS'
    ORDER BY c.created_at DESC
  LOOP
    -- AIDEV-NOTE: Buscar contrato do customer, priorizando ACTIVE e mais recente
    SELECT ct.id INTO v_contract_id
    FROM contracts ct
    WHERE ct.tenant_id = v_charge_record.tenant_id
      AND ct.customer_id = v_charge_record.customer_id
      AND ct.status IN ('ACTIVE', 'DRAFT')
    ORDER BY 
      CASE WHEN ct.status = 'ACTIVE' THEN 1 ELSE 2 END,
      ct.created_at DESC
    LIMIT 1;

    -- AIDEV-NOTE: Se encontrou contrato, vincular
    IF v_contract_id IS NOT NULL THEN
      UPDATE charges
      SET 
        contract_id = v_contract_id,
        updated_at = NOW() - INTERVAL '3 hours' -- UTC-3 (horário de Brasília)
      WHERE id = v_charge_record.id
        AND tenant_id = v_charge_record.tenant_id;
      
      v_updated_count := v_updated_count + 1;
      
      -- AIDEV-NOTE: Log para auditoria (apenas primeiras 10 para não poluir)
      IF v_updated_count <= 10 THEN
        RAISE NOTICE 'Charge % vinculada ao contrato % (customer: %)', 
          v_charge_record.asaas_id, 
          v_contract_id, 
          v_charge_record.customer_id;
      END IF;
    ELSE
      v_skipped_count := v_skipped_count + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_updated_count, v_skipped_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- AIDEV-NOTE: Executar a função para vincular charges existentes
DO $$
DECLARE
  v_result RECORD;
BEGIN
  SELECT * INTO v_result FROM link_existing_charges_to_contracts();
  
  RAISE NOTICE 'Vinculação concluída: % charges vinculadas, % puladas (sem contrato disponível)', 
    v_result.charges_updated, 
    v_result.charges_skipped;
END $$;

