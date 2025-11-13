-- =====================================================
-- MIGRAÇÃO: Migração de conciliation_staging para charges
-- Data: 2025-01-30
-- Descrição: Migra todos os dados de conciliation_staging para charges
-- Autor: Barcelitos AI Agent
-- =====================================================

-- AIDEV-NOTE: Esta migração unifica o fluxo de cobranças do ASAAS
-- criando charges diretamente ao invés de usar conciliation_staging

-- =====================================================
-- FUNÇÃO AUXILIAR: Mapear status_externo para status
-- =====================================================

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
    WHEN 'received_in_cash' THEN 'RECEIVED'
    WHEN 'awaiting_risk_analysis' THEN 'PENDING'
    WHEN 'deleted' THEN 'PENDING'
    WHEN 'failed' THEN 'PENDING'
    WHEN 'processing' THEN 'PENDING'
    WHEN 'created' THEN 'PENDING'
    WHEN 'checkout_viewed' THEN 'PENDING'
    WHEN 'anticipaded' THEN 'RECEIVED'
    ELSE 'PENDING'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- FUNÇÃO AUXILIAR: Mapear payment_method para tipo
-- =====================================================

CREATE OR REPLACE FUNCTION map_payment_method_to_tipo(payment_method TEXT)
RETURNS TEXT AS $$
BEGIN
  IF payment_method IS NULL THEN
    RETURN 'BOLETO';
  END IF;
  
  RETURN CASE UPPER(payment_method)
    WHEN 'PIX' THEN 'PIX'
    WHEN 'BOLETO' THEN 'BOLETO'
    WHEN 'BANK_SLIP' THEN 'BOLETO'
    WHEN 'CREDIT_CARD' THEN 'CREDIT_CARD'
    WHEN 'CASH' THEN 'CASH'
    WHEN 'TRANSFER' THEN 'PIX'
    ELSE 'BOLETO'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- FUNÇÃO: Buscar ou criar customer
-- =====================================================

CREATE OR REPLACE FUNCTION find_or_create_customer_from_staging(
  p_tenant_id UUID,
  p_asaas_customer_id TEXT,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_customer_document TEXT,
  p_customer_phone TEXT
)
RETURNS UUID AS $$
DECLARE
  v_customer_id UUID;
  v_document_bigint BIGINT;
  v_document_cleaned TEXT;
BEGIN
  -- AIDEV-NOTE: Primeiro tentar buscar por asaas_customer_id
  IF p_asaas_customer_id IS NOT NULL THEN
    SELECT id INTO v_customer_id
    FROM customers
    WHERE tenant_id = p_tenant_id
      AND customer_asaas_id = p_asaas_customer_id
    LIMIT 1;
    
    IF v_customer_id IS NOT NULL THEN
      RETURN v_customer_id;
    END IF;
  END IF;
  
  -- AIDEV-NOTE: Se não encontrou por asaas_id, tentar por documento
  -- Converter documento TEXT para BIGINT (remover formatação)
  IF p_customer_document IS NOT NULL THEN
    -- AIDEV-NOTE: Remover formatação (pontos, traços, espaços) e tentar converter
    v_document_cleaned := REGEXP_REPLACE(p_customer_document, '[^0-9]', '', 'g');
    
    IF v_document_cleaned != '' THEN
      BEGIN
        v_document_bigint := CAST(v_document_cleaned AS BIGINT);
        
        -- AIDEV-NOTE: Buscar por documento convertido
        SELECT id INTO v_customer_id
        FROM customers
        WHERE tenant_id = p_tenant_id
          AND cpf_cnpj = v_document_bigint
        LIMIT 1;
        
        IF v_customer_id IS NOT NULL THEN
          -- AIDEV-NOTE: Atualizar customer_asaas_id se não tiver
          UPDATE customers
          SET customer_asaas_id = p_asaas_customer_id
          WHERE id = v_customer_id
            AND customer_asaas_id IS NULL;
          
          RETURN v_customer_id;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- AIDEV-NOTE: Se não conseguir converter, continuar sem buscar por documento
        v_document_bigint := NULL;
      END;
    END IF;
  END IF;
  
  -- AIDEV-NOTE: Se não encontrou, criar novo customer
  -- Converter documento para BIGINT se possível, senão usar NULL
  IF p_customer_document IS NOT NULL AND v_document_bigint IS NULL THEN
    v_document_cleaned := REGEXP_REPLACE(p_customer_document, '[^0-9]', '', 'g');
    IF v_document_cleaned != '' THEN
      BEGIN
        v_document_bigint := CAST(v_document_cleaned AS BIGINT);
      EXCEPTION WHEN OTHERS THEN
        v_document_bigint := NULL;
      END;
    END IF;
  END IF;
  
  INSERT INTO customers (
    tenant_id,
    customer_asaas_id,
    name,
    email,
    phone,
    cpf_cnpj,
    created_at,
    updated_at
  ) VALUES (
    p_tenant_id,
    p_asaas_customer_id,
    COALESCE(p_customer_name, 'Cliente não identificado'),
    p_customer_email,
    p_customer_phone,
    v_document_bigint,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_customer_id;
  
  RETURN v_customer_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNÇÃO PRINCIPAL: Migrar dados de conciliation_staging para charges
-- =====================================================

CREATE OR REPLACE FUNCTION migrate_conciliation_staging_to_charges()
RETURNS JSON AS $$
DECLARE
  v_staging_record RECORD;
  v_customer_id UUID;
  v_charge_id UUID;
  v_existing_charge_id UUID;
  v_mapped_status TEXT;
  v_mapped_tipo TEXT;
  v_total_processed INTEGER := 0;
  v_total_created INTEGER := 0;
  v_total_skipped INTEGER := 0;
  v_total_errors INTEGER := 0;
  v_error_messages TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- AIDEV-NOTE: Processar apenas registros com origem = 'ASAAS'
  -- Ignorar registros que já têm charge_id vinculado (já foram migrados)
  FOR v_staging_record IN
    SELECT 
      cs.id,
      cs.tenant_id,
      cs.id_externo,
      cs.valor_cobranca,
      cs.status_externo,
      cs.data_vencimento,
      cs.contrato_id,
      cs.asaas_customer_id,
      cs.customer_name,
      cs.customer_email,
      cs.customer_document,
      cs.customer_phone,
      cs.payment_method,
      cs.observacao,
      cs.external_reference,
      cs.charge_id,
      cs.created_at,
      cs.updated_at
    FROM conciliation_staging cs
    WHERE cs.origem = 'ASAAS'
      AND cs.id_externo IS NOT NULL
      AND cs.tenant_id IS NOT NULL
      AND (cs.charge_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM charges c 
        WHERE c.id = cs.charge_id 
        AND c.tenant_id = cs.tenant_id
      ))
    ORDER BY cs.created_at ASC
  LOOP
    BEGIN
      -- AIDEV-NOTE: Verificar se já existe charge com mesmo asaas_id
      SELECT id INTO v_existing_charge_id
      FROM charges
      WHERE tenant_id = v_staging_record.tenant_id
        AND asaas_id = v_staging_record.id_externo
      LIMIT 1;
      
      IF v_existing_charge_id IS NOT NULL THEN
        -- AIDEV-NOTE: Atualizar charge_id no staging para referência futura
        UPDATE conciliation_staging
        SET charge_id = v_existing_charge_id
        WHERE id = v_staging_record.id;
        
        v_total_skipped := v_total_skipped + 1;
        CONTINUE;
      END IF;
      
      -- AIDEV-NOTE: Buscar ou criar customer
      v_customer_id := find_or_create_customer_from_staging(
        v_staging_record.tenant_id,
        v_staging_record.asaas_customer_id,
        v_staging_record.customer_name,
        v_staging_record.customer_email,
        v_staging_record.customer_document,
        v_staging_record.customer_phone
      );
      
      IF v_customer_id IS NULL THEN
        RAISE EXCEPTION 'Não foi possível criar ou encontrar customer para staging_id: %', v_staging_record.id;
      END IF;
      
      -- AIDEV-NOTE: Mapear status e tipo
      v_mapped_status := map_external_status_to_charge_status(v_staging_record.status_externo);
      v_mapped_tipo := map_payment_method_to_tipo(v_staging_record.payment_method);
      
      -- AIDEV-NOTE: Garantir data_vencimento válida
      IF v_staging_record.data_vencimento IS NULL THEN
        v_staging_record.data_vencimento := CURRENT_DATE;
      END IF;
      
      -- AIDEV-NOTE: Garantir valor válido
      IF v_staging_record.valor_cobranca IS NULL OR v_staging_record.valor_cobranca <= 0 THEN
        v_staging_record.valor_cobranca := 0;
      END IF;
      
      -- AIDEV-NOTE: Criar charge
      INSERT INTO charges (
        tenant_id,
        customer_id,
        contract_id,
        asaas_id,
        valor,
        status,
        tipo,
        data_vencimento,
        descricao,
        created_at,
        updated_at
      ) VALUES (
        v_staging_record.tenant_id,
        v_customer_id,
        v_staging_record.contrato_id,
        v_staging_record.id_externo,
        v_staging_record.valor_cobranca,
        v_mapped_status,
        v_mapped_tipo,
        v_staging_record.data_vencimento,
        COALESCE(v_staging_record.observacao, 'Migrado de conciliation_staging'),
        COALESCE(v_staging_record.created_at, NOW()),
        COALESCE(v_staging_record.updated_at, NOW())
      )
      RETURNING id INTO v_charge_id;
      
      -- AIDEV-NOTE: Atualizar staging com charge_id
      UPDATE conciliation_staging
      SET charge_id = v_charge_id
      WHERE id = v_staging_record.id;
      
      v_total_created := v_total_created + 1;
      v_total_processed := v_total_processed + 1;
      
    EXCEPTION WHEN OTHERS THEN
      v_total_errors := v_total_errors + 1;
      v_error_messages := array_append(
        v_error_messages,
        format('Erro ao processar staging_id %s: %s', v_staging_record.id, SQLERRM)
      );
      v_total_processed := v_total_processed + 1;
    END;
  END LOOP;
  
  -- AIDEV-NOTE: Retornar resultado da migração
  RETURN json_build_object(
    'success', true,
    'total_processed', v_total_processed,
    'total_created', v_total_created,
    'total_skipped', v_total_skipped,
    'total_errors', v_total_errors,
    'errors', v_error_messages
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CONSTRAINT UNIQUE PARA tenant_id,asaas_id
-- =====================================================

-- AIDEV-NOTE: Criar índice único parcial (PostgreSQL não suporta WHERE em UNIQUE constraint)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'charges_tenant_asaas_unique' 
    AND tablename = 'charges'
  ) THEN
    CREATE UNIQUE INDEX charges_tenant_asaas_unique 
    ON charges (tenant_id, asaas_id) 
    WHERE asaas_id IS NOT NULL;
    
    RAISE NOTICE 'Índice unique criado para tenant_id,asaas_id';
  ELSE
    RAISE NOTICE 'Índice unique já existe para tenant_id,asaas_id';
  END IF;
END $$;

-- =====================================================
-- EXECUTAR MIGRAÇÃO
-- =====================================================

DO $$
DECLARE
  v_result JSON;
BEGIN
  RAISE NOTICE 'Iniciando migração de conciliation_staging para charges...';
  v_result := migrate_conciliation_staging_to_charges();
  RAISE NOTICE 'Migração concluída: %', v_result;
END $$;

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON FUNCTION migrate_conciliation_staging_to_charges() IS 
'Migra todos os dados de conciliation_staging para charges. Cria customers se necessário e mantém conciliation_staging intacto para rollback.';

COMMENT ON FUNCTION find_or_create_customer_from_staging(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) IS 
'Busca customer por asaas_customer_id ou documento. Se não encontrar, cria novo customer.';

