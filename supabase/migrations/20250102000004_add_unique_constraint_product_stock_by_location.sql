-- =====================================================
-- MIGRATION: Adicionar constraint UNIQUE em product_stock_by_location
-- =====================================================
--
-- AIDEV-NOTE: Esta migration adiciona uma constraint UNIQUE nas colunas
-- (tenant_id, product_id, storage_location_id) para permitir o uso de
-- ON CONFLICT na função calculate_stock_balance.
-- Isso garante que cada combinação de tenant, produto e local de estoque
-- seja única na tabela.
--
-- Data: 2025-01-02
-- =====================================================

-- AIDEV-NOTE: Verificar se a constraint já existe antes de criar
DO $$
BEGIN
  -- Verificar se a constraint UNIQUE não existe
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints tc
    WHERE tc.table_name = 'product_stock_by_location'
      AND tc.constraint_type = 'UNIQUE'
      AND tc.constraint_name = 'unique_product_stock_by_location'
  ) THEN
    -- Adicionar constraint UNIQUE
    ALTER TABLE product_stock_by_location
    ADD CONSTRAINT unique_product_stock_by_location
    UNIQUE (tenant_id, product_id, storage_location_id);
    
    RAISE NOTICE 'Constraint UNIQUE unique_product_stock_by_location criada com sucesso';
  ELSE
    RAISE NOTICE 'Constraint UNIQUE unique_product_stock_by_location já existe';
  END IF;
END $$;

-- AIDEV-NOTE: Comentário na constraint
COMMENT ON CONSTRAINT unique_product_stock_by_location ON product_stock_by_location IS
'Constraint UNIQUE que garante que cada combinação de tenant, produto e local de estoque seja única.
Necessária para o funcionamento correto do ON CONFLICT na função calculate_stock_balance.';

