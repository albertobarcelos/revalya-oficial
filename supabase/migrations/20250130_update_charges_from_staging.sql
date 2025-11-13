-- =====================================================
-- MIGRAÇÃO: Atualizar charges com dados de conciliation_staging
-- Data: 2025-01-30
-- Descrição: Atualiza charges existentes com dados adicionais de conciliation_staging
-- Autor: Barcelitos AI Agent
-- =====================================================

-- AIDEV-NOTE: Esta migração atualiza charges com dados faltantes de conciliation_staging
-- Fazendo match pelo asaas_id (ex: pay_co8kv4y96498wchr)

-- =====================================================
-- ADICIONAR COLUNAS SE NÃO EXISTIREM
-- =====================================================

-- AIDEV-NOTE: Verificar e adicionar coluna pdf_url se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'charges' 
    AND column_name = 'pdf_url'
  ) THEN
    ALTER TABLE charges ADD COLUMN pdf_url TEXT;
    RAISE NOTICE 'Coluna pdf_url adicionada à tabela charges';
  ELSE
    RAISE NOTICE 'Coluna pdf_url já existe na tabela charges';
  END IF;
END $$;

-- =====================================================
-- FUNÇÃO: Atualizar charges com dados de conciliation_staging
-- =====================================================

CREATE OR REPLACE FUNCTION update_charges_from_staging()
RETURNS JSON AS $$
DECLARE
  v_staging_record RECORD;
  v_charge_id UUID;
  v_total_processed INTEGER := 0;
  v_total_updated INTEGER := 0;
  v_total_skipped INTEGER := 0;
  v_total_errors INTEGER := 0;
  v_error_messages TEXT[] := ARRAY[]::TEXT[];
  v_update_count INTEGER;
BEGIN
  -- AIDEV-NOTE: Processar registros de conciliation_staging que têm asaas_id
  FOR v_staging_record IN
    SELECT 
      cs.id_externo,
      cs.tenant_id,
      cs.invoice_number,
      cs.barcode,
      cs.pix_key,
      cs.pdf_url,
      cs.invoice_url,
      cs.asaas_customer_id,
      cs.data_pagamento,
      cs.valor_pago,
      cs.valor_liquido,
      cs.taxa_juros,
      cs.taxa_multa,
      cs.valor_desconto,
      cs.transaction_receipt_url,
      cs.origem
    FROM conciliation_staging cs
    WHERE cs.origem = 'ASAAS'
      AND cs.id_externo IS NOT NULL
      AND cs.tenant_id IS NOT NULL
    ORDER BY cs.created_at ASC
  LOOP
    BEGIN
      -- AIDEV-NOTE: Buscar charge pelo asaas_id
      SELECT id INTO v_charge_id
      FROM charges
      WHERE tenant_id = v_staging_record.tenant_id
        AND asaas_id = v_staging_record.id_externo
      LIMIT 1;
      
      IF v_charge_id IS NULL THEN
        -- AIDEV-NOTE: Charge não encontrada, pular
        v_total_skipped := v_total_skipped + 1;
        CONTINUE;
      END IF;
      
      -- AIDEV-NOTE: Preparar dados para atualização (apenas campos não nulos)
      -- Usar COALESCE para atualizar apenas se o valor em staging não for NULL
      UPDATE charges
      SET 
        external_invoice_number = COALESCE(
          NULLIF(v_staging_record.invoice_number, ''),
          external_invoice_number
        ),
        barcode = COALESCE(
          NULLIF(v_staging_record.barcode, ''),
          barcode
        ),
        pix_key = COALESCE(
          NULLIF(v_staging_record.pix_key, ''),
          pix_key
        ),
        pdf_url = COALESCE(
          NULLIF(v_staging_record.pdf_url, ''),
          pdf_url
        ),
        invoice_url = COALESCE(
          NULLIF(v_staging_record.invoice_url, ''),
          invoice_url
        ),
        data_pagamento = COALESCE(
          v_staging_record.data_pagamento::DATE,
          data_pagamento
        ),
        payment_value = COALESCE(
          v_staging_record.valor_pago,
          payment_value
        ),
        net_value = COALESCE(
          v_staging_record.valor_liquido,
          net_value
        ),
        interest_rate = COALESCE(
          v_staging_record.taxa_juros,
          interest_rate
        ),
        fine_rate = COALESCE(
          v_staging_record.taxa_multa,
          fine_rate
        ),
        discount_value = COALESCE(
          v_staging_record.valor_desconto,
          discount_value
        ),
        transaction_receipt_url = COALESCE(
          NULLIF(v_staging_record.transaction_receipt_url, ''),
          transaction_receipt_url
        ),
        origem = COALESCE(
          NULLIF(v_staging_record.origem, ''),
          origem
        ),
        external_customer_id = COALESCE(
          NULLIF(v_staging_record.asaas_customer_id, ''),
          external_customer_id
        ),
        updated_at = NOW()
      WHERE id = v_charge_id
        AND tenant_id = v_staging_record.tenant_id;
      
      GET DIAGNOSTICS v_update_count = ROW_COUNT;
      
      IF v_update_count > 0 THEN
        v_total_updated := v_total_updated + 1;
      ELSE
        v_total_skipped := v_total_skipped + 1;
      END IF;
      
      v_total_processed := v_total_processed + 1;
      
    EXCEPTION WHEN OTHERS THEN
      v_total_errors := v_total_errors + 1;
      v_error_messages := array_append(
        v_error_messages,
        format('Erro ao atualizar charge para asaas_id %s: %s', 
          v_staging_record.id_externo, SQLERRM)
      );
      v_total_processed := v_total_processed + 1;
    END;
  END LOOP;
  
  -- AIDEV-NOTE: Atualizar customer_asaas_id nos customers vinculados
  -- Buscar customers que têm charges do ASAAS mas não têm customer_asaas_id
  UPDATE customers c
  SET customer_asaas_id = cs.asaas_customer_id
  FROM charges ch
  INNER JOIN conciliation_staging cs ON ch.asaas_id = cs.id_externo
    AND ch.tenant_id = cs.tenant_id
  WHERE c.id = ch.customer_id
    AND c.tenant_id = ch.tenant_id
    AND c.customer_asaas_id IS NULL
    AND cs.asaas_customer_id IS NOT NULL
    AND cs.origem = 'ASAAS';
  
  -- AIDEV-NOTE: Retornar resultado da atualização
  RETURN json_build_object(
    'success', true,
    'total_processed', v_total_processed,
    'total_updated', v_total_updated,
    'total_skipped', v_total_skipped,
    'total_errors', v_total_errors,
    'errors', v_error_messages
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- EXECUTAR ATUALIZAÇÃO
-- =====================================================

DO $$
DECLARE
  v_result JSON;
BEGIN
  RAISE NOTICE 'Iniciando atualização de charges com dados de conciliation_staging...';
  v_result := update_charges_from_staging();
  RAISE NOTICE 'Atualização concluída: %', v_result;
END $$;

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON FUNCTION update_charges_from_staging() IS 
'Atualiza charges existentes com dados adicionais de conciliation_staging, fazendo match pelo asaas_id. Atualiza invoice_number, barcode, pix_key, pdf_url, invoice_url, data_pagamento, valor_pago, net_value, interest_rate, fine_rate, discount_value, transaction_receipt_url, origem, external_customer_id e customer_asaas_id.';

