-- =====================================================
-- MIGRATION: Adicionar Foreign Key entre product_stock_by_location e storage_locations
-- =====================================================
--
-- AIDEV-NOTE: Esta migration adiciona a foreign key necessária para que o Supabase
-- possa fazer o join automático entre product_stock_by_location e storage_locations.
-- Sem essa foreign key, o Supabase não consegue identificar a relação entre as tabelas.
--
-- Data: 2025-01-02
-- =====================================================

-- AIDEV-NOTE: Verificar se a foreign key já existe antes de criar
DO $$
BEGIN
  -- Verificar se a foreign key não existe
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'product_stock_by_location'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'storage_location_id'
  ) THEN
    -- Adicionar foreign key
    ALTER TABLE product_stock_by_location
    ADD CONSTRAINT fk_product_stock_storage_location
    FOREIGN KEY (storage_location_id) 
    REFERENCES storage_locations(id) 
    ON DELETE RESTRICT 
    ON UPDATE CASCADE;
    
    RAISE NOTICE 'Foreign key fk_product_stock_storage_location criada com sucesso';
  ELSE
    RAISE NOTICE 'Foreign key fk_product_stock_storage_location já existe';
  END IF;
END $$;

-- AIDEV-NOTE: Adicionar índice para melhorar performance das queries
CREATE INDEX IF NOT EXISTS idx_product_stock_storage_location_id 
ON product_stock_by_location(storage_location_id);

-- AIDEV-NOTE: Adicionar foreign key para product_id também (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'product_stock_by_location'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'product_id'
  ) THEN
    ALTER TABLE product_stock_by_location
    ADD CONSTRAINT fk_product_stock_product
    FOREIGN KEY (product_id) 
    REFERENCES products(id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;
    
    RAISE NOTICE 'Foreign key fk_product_stock_product criada com sucesso';
  ELSE
    RAISE NOTICE 'Foreign key fk_product_stock_product já existe';
  END IF;
END $$;

-- AIDEV-NOTE: Adicionar índice para product_id também
CREATE INDEX IF NOT EXISTS idx_product_stock_product_id 
ON product_stock_by_location(product_id);

-- AIDEV-NOTE: Comentários nas foreign keys
COMMENT ON CONSTRAINT fk_product_stock_storage_location ON product_stock_by_location IS
'Foreign key para storage_locations. Permite join automático no Supabase.';

COMMENT ON CONSTRAINT fk_product_stock_product ON product_stock_by_location IS
'Foreign key para products. Permite join automático no Supabase.';

