-- =====================================================
-- Migration: Migrar payment_gateways para tenant_integrations
-- Data: 2025-12-30
-- Descrição: Migra todos os dados de payment_gateways para tenant_integrations
--            e atualiza todas as foreign keys relacionadas
-- =====================================================

-- AIDEV-NOTE: Esta migration migra completamente payment_gateways para tenant_integrations
-- Seguindo o padrão unificado de integrações do sistema

BEGIN;

-- =====================================================
-- PASSO 1: Criar tabela temporária para mapeamento de IDs
-- =====================================================

CREATE TEMP TABLE payment_gateway_id_mapping (
  old_id UUID,
  new_id INTEGER,
  integration_type TEXT
);

-- =====================================================
-- PASSO 2: Migrar dados de payment_gateways para tenant_integrations
-- =====================================================

INSERT INTO tenant_integrations (
  tenant_id,
  integration_type,
  is_active,
  environment,
  config,
  webhook_url,
  webhook_token,
  last_sync_at,
  created_at,
  updated_at,
  created_by
)
SELECT 
  pg.tenant_id,
  LOWER(pg.provider) as integration_type, -- AIDEV-NOTE: Converter provider para integration_type
  COALESCE(pg.is_active, true) as is_active,
  CASE 
    WHEN pg.environment IS NOT NULL THEN LOWER(pg.environment)
    ELSE 'production'
  END as environment,
  jsonb_build_object(
    'api_key', pg.api_key,
    'api_secret', pg.api_secret,
    'settings', COALESCE(pg.settings, '{}'::jsonb)
  ) as config,
  pg.webhook_url,
  pg.webhook_token,
  pg.last_sync_at,
  COALESCE(pg.created_at, NOW()) as created_at,
  COALESCE(pg.updated_at, NOW()) as updated_at,
  pg.created_by
FROM payment_gateways pg
WHERE pg.tenant_id IS NOT NULL
  AND pg.provider IS NOT NULL
ON CONFLICT (tenant_id, integration_type, environment) 
DO UPDATE SET
  is_active = EXCLUDED.is_active,
  config = EXCLUDED.config,
  updated_at = NOW();

-- =====================================================
-- PASSO 3: Criar mapeamento de IDs antigos para novos
-- =====================================================

INSERT INTO payment_gateway_id_mapping (old_id, new_id, integration_type)
SELECT 
  pg.id as old_id,
  ti.id as new_id,
  LOWER(pg.provider) as integration_type
FROM payment_gateways pg
INNER JOIN tenant_integrations ti 
  ON ti.tenant_id = pg.tenant_id
  AND ti.integration_type = LOWER(pg.provider)
  AND ti.environment = CASE 
    WHEN pg.environment IS NOT NULL THEN LOWER(pg.environment)
    ELSE 'production'
  END;

-- =====================================================
-- PASSO 4: Atualizar foreign keys em contract_billings
-- =====================================================
-- AIDEV-NOTE: Criar coluna temporária INTEGER, atualizar valores, depois substituir

DO $$
BEGIN
  -- Adicionar coluna temporária
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contract_billings' 
    AND column_name = 'payment_gateway_id_temp'
  ) THEN
    ALTER TABLE contract_billings ADD COLUMN payment_gateway_id_temp INTEGER;
    
    -- Atualizar valores usando mapeamento
    UPDATE contract_billings cb
    SET payment_gateway_id_temp = mapping.new_id
    FROM payment_gateway_id_mapping mapping
    WHERE cb.payment_gateway_id = mapping.old_id
      AND cb.tenant_id IN (
        SELECT tenant_id FROM tenant_integrations ti 
        WHERE ti.id = mapping.new_id
      );
    
    -- Remover coluna antiga e renomear
    ALTER TABLE contract_billings DROP COLUMN payment_gateway_id;
    ALTER TABLE contract_billings RENAME COLUMN payment_gateway_id_temp TO payment_gateway_id;
  END IF;
END $$;

-- =====================================================
-- PASSO 6: Atualizar foreign keys em contract_billing_payments
-- =====================================================

DO $$
BEGIN
  -- Adicionar coluna temporária
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contract_billing_payments' 
    AND column_name = 'payment_gateway_id_temp'
  ) THEN
    ALTER TABLE contract_billing_payments ADD COLUMN payment_gateway_id_temp INTEGER;
    
    -- Atualizar valores usando mapeamento
    UPDATE contract_billing_payments cbp
    SET payment_gateway_id_temp = mapping.new_id
    FROM payment_gateway_id_mapping mapping
    WHERE cbp.payment_gateway_id = mapping.old_id
      AND cbp.tenant_id IN (
        SELECT tenant_id FROM tenant_integrations ti 
        WHERE ti.id = mapping.new_id
      );
    
    -- Remover coluna antiga e renomear
    ALTER TABLE contract_billing_payments DROP COLUMN payment_gateway_id;
    ALTER TABLE contract_billing_payments RENAME COLUMN payment_gateway_id_temp TO payment_gateway_id;
  END IF;
END $$;

-- =====================================================
-- PASSO 7: Atualizar foreign keys em finance_entries (se existir)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'finance_entries' 
    AND column_name = 'payment_gateway_id'
  ) THEN
    -- Adicionar coluna temporária
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'finance_entries' 
      AND column_name = 'payment_gateway_id_temp'
    ) THEN
      ALTER TABLE finance_entries ADD COLUMN payment_gateway_id_temp INTEGER;
      
      -- Atualizar valores usando mapeamento
      UPDATE finance_entries fe
      SET payment_gateway_id_temp = mapping.new_id
      FROM payment_gateway_id_mapping mapping
      WHERE fe.payment_gateway_id = mapping.old_id
        AND fe.tenant_id IN (
          SELECT tenant_id FROM tenant_integrations ti 
          WHERE ti.id = mapping.new_id
        );
      
      -- Remover coluna antiga e renomear
      ALTER TABLE finance_entries DROP COLUMN payment_gateway_id;
      ALTER TABLE finance_entries RENAME COLUMN payment_gateway_id_temp TO payment_gateway_id;
    END IF;
  END IF;
END $$;

-- =====================================================
-- PASSO 8: Remover constraints de foreign key antigas
-- =====================================================

-- Remover foreign key de contract_billings
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'contract_billings_payment_gateway_id_fkey'
    AND table_name = 'contract_billings'
  ) THEN
    ALTER TABLE contract_billings 
    DROP CONSTRAINT contract_billings_payment_gateway_id_fkey;
  END IF;
END $$;

-- Remover foreign key de contract_billing_payments
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'contract_billing_payments_payment_gateway_id_fkey'
    AND table_name = 'contract_billing_payments'
  ) THEN
    ALTER TABLE contract_billing_payments 
    DROP CONSTRAINT contract_billing_payments_payment_gateway_id_fkey;
  END IF;
END $$;

-- Remover foreign key de finance_entries (se existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'finance_entries_payment_gateway_id_fkey'
    AND table_name = 'finance_entries'
  ) THEN
    ALTER TABLE finance_entries 
    DROP CONSTRAINT finance_entries_payment_gateway_id_fkey;
  END IF;
END $$;

-- =====================================================
-- PASSO 9: Criar novas foreign keys apontando para tenant_integrations
-- =====================================================

-- Foreign key em contract_billings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'contract_billings_payment_gateway_id_fkey'
    AND table_name = 'contract_billings'
  ) THEN
    ALTER TABLE contract_billings
    ADD CONSTRAINT contract_billings_payment_gateway_id_fkey
    FOREIGN KEY (payment_gateway_id) 
    REFERENCES tenant_integrations(id) 
    ON DELETE SET NULL;
  END IF;
END $$;

-- Foreign key em contract_billing_payments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'contract_billing_payments_payment_gateway_id_fkey'
    AND table_name = 'contract_billing_payments'
  ) THEN
    ALTER TABLE contract_billing_payments
    ADD CONSTRAINT contract_billing_payments_payment_gateway_id_fkey
    FOREIGN KEY (payment_gateway_id) 
    REFERENCES tenant_integrations(id) 
    ON DELETE SET NULL;
  END IF;
END $$;

-- Foreign key em finance_entries (se existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'finance_entries' 
    AND column_name = 'payment_gateway_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'finance_entries_payment_gateway_id_fkey'
      AND table_name = 'finance_entries'
    ) THEN
      ALTER TABLE finance_entries
      ADD CONSTRAINT finance_entries_payment_gateway_id_fkey
      FOREIGN KEY (payment_gateway_id) 
      REFERENCES tenant_integrations(id) 
      ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- =====================================================
-- PASSO 10: Remover RLS policies antigas de payment_gateways
-- =====================================================

-- Remover todas as policies de payment_gateways
DO $$
DECLARE
  policy_name TEXT;
BEGIN
  FOR policy_name IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'payment_gateways'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON payment_gateways', policy_name);
  END LOOP;
END $$;

-- =====================================================
-- PASSO 11: Remover índices de payment_gateways
-- =====================================================

DROP INDEX IF EXISTS idx_payment_gateways_tenant_id;
DROP INDEX IF EXISTS idx_payment_gateways_provider;
DROP INDEX IF EXISTS idx_payment_gateways_code;
DROP INDEX IF EXISTS idx_payment_gateways_is_active;

-- =====================================================
-- PASSO 12: Remover a tabela payment_gateways
-- =====================================================

DROP TABLE IF EXISTS payment_gateways CASCADE;

-- =====================================================
-- PASSO 13: Limpar tabela temporária
-- =====================================================

DROP TABLE IF EXISTS payment_gateway_id_mapping;

COMMIT;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- AIDEV-NOTE: Verificar se a migração foi bem-sucedida
DO $$
DECLARE
  migrated_count INTEGER;
  total_billings INTEGER;
BEGIN
  -- Contar integrações migradas
  SELECT COUNT(*) INTO migrated_count
  FROM tenant_integrations
  WHERE integration_type IN ('asaas', 'cora', 'itau', 'omie', 'nfse_io', 'focusnfe');
  
  -- Contar billings com gateway válido
  SELECT COUNT(*) INTO total_billings
  FROM contract_billings
  WHERE payment_gateway_id IS NOT NULL;
  
  RAISE NOTICE 'Migração concluída: % integrações migradas, % billings com gateway válido', 
    migrated_count, total_billings;
END $$;

