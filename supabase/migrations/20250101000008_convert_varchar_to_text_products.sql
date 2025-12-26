-- =====================================================
-- MIGRATION: Converter todas as colunas VARCHAR/CHARACTER VARYING para TEXT na tabela products
-- =====================================================
-- 
-- AIDEV-NOTE: Esta migration converte todas as colunas VARCHAR/CHARACTER VARYING
-- para TEXT na tabela products, seguindo a recomendação PostgreSQL:
-- https://wiki.postgresql.org/wiki/Don't_Do_This#Don.27t_use_varchar.28n.29_by_default
--
-- Razões para usar TEXT ao invés de VARCHAR:
-- 1. TEXT não tem limite de tamanho (VARCHAR tem limite arbitrário)
-- 2. Performance idêntica (PostgreSQL trata ambos da mesma forma internamente)
-- 3. Mais flexível para crescimento futuro
-- 4. Evita problemas de truncamento de dados
--
-- Data: 2025-01-01
-- =====================================================

-- AIDEV-NOTE: Converter colunas VARCHAR/CHARACTER VARYING para TEXT
-- Usando ALTER COLUMN TYPE com USING para conversão segura

-- name: CHARACTER VARYING(255) -> TEXT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
      AND column_name = 'name'
      AND data_type = 'character varying'
  ) THEN
    ALTER TABLE products 
    ALTER COLUMN name TYPE TEXT 
    USING name::TEXT;
    
    RAISE NOTICE 'Coluna name convertida de VARCHAR para TEXT';
  END IF;
END $$;

-- description: TEXT (já deve estar como TEXT, mas garantir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
      AND column_name = 'description'
      AND data_type = 'character varying'
  ) THEN
    ALTER TABLE products 
    ALTER COLUMN description TYPE TEXT 
    USING description::TEXT;
    
    RAISE NOTICE 'Coluna description convertida de VARCHAR para TEXT';
  END IF;
END $$;

-- code: CHARACTER VARYING(50) -> TEXT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
      AND column_name = 'code'
      AND data_type = 'character varying'
  ) THEN
    ALTER TABLE products 
    ALTER COLUMN code TYPE TEXT 
    USING code::TEXT;
    
    RAISE NOTICE 'Coluna code convertida de VARCHAR para TEXT';
  END IF;
END $$;

-- sku: CHARACTER VARYING(50) -> TEXT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
      AND column_name = 'sku'
      AND data_type = 'character varying'
  ) THEN
    ALTER TABLE products 
    ALTER COLUMN sku TYPE TEXT 
    USING sku::TEXT;
    
    RAISE NOTICE 'Coluna sku convertida de VARCHAR para TEXT';
  END IF;
END $$;

-- AIDEV-NOTE: Criar função para validar formato JSONB (CHECK constraint não aceita subquery)
-- Esta função será usada na constraint de validação do barcode
CREATE OR REPLACE FUNCTION validate_barcode_format(barcode_value JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF barcode_value IS NULL THEN
    RETURN TRUE;
  END IF;
  
  IF jsonb_typeof(barcode_value) != 'array' THEN
    RETURN FALSE;
  END IF;
  
  RETURN (
    SELECT bool_and(
      jsonb_typeof(elem) = 'object' AND
      elem ? 'unit' AND
      elem ? 'code' AND
      jsonb_typeof(elem->'unit') = 'string' AND
      jsonb_typeof(elem->'code') = 'string'
    )
    FROM jsonb_array_elements(barcode_value) AS elem
  );
END;
$$;

-- barcode: Converter para JSONB (pode estar como VARCHAR ou TEXT)
-- AIDEV-NOTE: JSONB permite múltiplos códigos de barras por produto
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
      AND column_name = 'barcode'
      AND data_type IN ('character varying', 'text')
  ) THEN
    -- AIDEV-NOTE: Converter dados existentes de VARCHAR/TEXT para JSONB
    RAISE NOTICE 'Convertendo barcode para JSONB...';
    
    -- Converter dados existentes
    UPDATE products
    SET barcode = CASE 
      WHEN barcode IS NULL THEN NULL::jsonb
      WHEN barcode::text LIKE '[%' THEN barcode::jsonb -- Já é JSONB (string)
      ELSE jsonb_build_array(
        jsonb_build_object('unit', 'un', 'code', barcode::text)
      )::jsonb
    END
    WHERE barcode IS NOT NULL;
    
    -- Alterar tipo da coluna
    ALTER TABLE products 
    ALTER COLUMN barcode TYPE JSONB 
    USING CASE 
      WHEN barcode IS NULL THEN NULL::jsonb
      WHEN barcode::text LIKE '[%' THEN barcode::jsonb -- Já é JSONB (string)
      ELSE jsonb_build_array(
        jsonb_build_object('unit', 'un', 'code', barcode::text)
      )::jsonb
    END;
    
    -- AIDEV-NOTE: Adicionar constraint usando a função de validação
    ALTER TABLE products
    DROP CONSTRAINT IF EXISTS check_barcode_format;
    
    ALTER TABLE products
    ADD CONSTRAINT check_barcode_format 
    CHECK (validate_barcode_format(barcode));
    
    -- Comentário
    COMMENT ON COLUMN products.barcode IS 
    'Códigos de barras do produto em formato JSONB.
    Formato: [{"unit": "un", "code": "3307"}, {"unit": "un", "code": "7896010006360"}]
    Permite múltiplos códigos de barras por produto, cada um associado a uma unidade.';
    
    RAISE NOTICE 'Coluna barcode convertida para JSONB com sucesso';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
      AND column_name = 'barcode'
      AND data_type = 'jsonb'
  ) THEN
    RAISE NOTICE 'Coluna barcode já está como JSONB';
    -- AIDEV-NOTE: Garantir que a constraint existe mesmo se a coluna já for JSONB
    ALTER TABLE products
    DROP CONSTRAINT IF EXISTS check_barcode_format;
    
    ALTER TABLE products
    ADD CONSTRAINT check_barcode_format 
    CHECK (validate_barcode_format(barcode));
  END IF;
END $$;

-- supplier: CHARACTER VARYING(100) -> TEXT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
      AND column_name = 'supplier'
      AND data_type = 'character varying'
  ) THEN
    ALTER TABLE products 
    ALTER COLUMN supplier TYPE TEXT 
    USING supplier::TEXT;
    
    RAISE NOTICE 'Coluna supplier convertida de VARCHAR para TEXT';
  END IF;
END $$;

-- unit_of_measure: CHARACTER VARYING(10) -> TEXT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
      AND column_name = 'unit_of_measure'
      AND data_type = 'character varying'
  ) THEN
    ALTER TABLE products 
    ALTER COLUMN unit_of_measure TYPE TEXT 
    USING unit_of_measure::TEXT;
    
    RAISE NOTICE 'Coluna unit_of_measure convertida de VARCHAR para TEXT';
  END IF;
END $$;

-- image_url: TEXT (já deve estar como TEXT, mas garantir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
      AND column_name = 'image_url'
      AND data_type = 'character varying'
  ) THEN
    ALTER TABLE products 
    ALTER COLUMN image_url TYPE TEXT 
    USING image_url::TEXT;
    
    RAISE NOTICE 'Coluna image_url convertida de VARCHAR para TEXT';
  END IF;
END $$;

-- Comentário
COMMENT ON TABLE products IS 
'Tabela de produtos. Todas as colunas de texto usam TEXT ao invés de VARCHAR(n) 
conforme recomendação PostgreSQL (wiki.postgresql.org Don''t Do This).
Coluna barcode usa JSONB para permitir múltiplos códigos de barras por produto.';

