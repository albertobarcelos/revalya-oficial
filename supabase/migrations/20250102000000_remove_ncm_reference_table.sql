-- =====================================================
-- MIGRATION: Remover tabelas ncm_reference e cest_reference
-- =====================================================
-- 
-- AIDEV-NOTE: NCM agora é validado via API FocusNFe
-- CEST não possui API pública confiável, campo será apenas formatado
-- Não há necessidade de tabelas locais
-- 
-- Data: 2025-01-02
-- =====================================================

-- AIDEV-NOTE: Remover foreign keys ncm_id e cest_id da tabela products se existirem
DO $$ 
BEGIN
  -- Remover ncm_id
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'ncm_id'
  ) THEN
    ALTER TABLE products DROP CONSTRAINT IF EXISTS products_ncm_id_fkey;
    ALTER TABLE products DROP COLUMN ncm_id;
    RAISE NOTICE 'Coluna ncm_id removida da tabela products';
  END IF;

  -- Remover cest_id
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'cest_id'
  ) THEN
    ALTER TABLE products DROP CONSTRAINT IF EXISTS products_cest_id_fkey;
    ALTER TABLE products DROP COLUMN cest_id;
    RAISE NOTICE 'Coluna cest_id removida da tabela products';
  END IF;
END $$;

-- AIDEV-NOTE: Remover tabelas se existirem
DROP TABLE IF EXISTS ncm_reference CASCADE;
DROP TABLE IF EXISTS cest_reference CASCADE;

-- AIDEV-NOTE: Comentário explicativo
COMMENT ON TABLE products IS 
'Tabela de produtos. NCM validado via API FocusNFe (Edge Function validate-ncm). CEST é apenas formatado (não há API pública confiável).';

