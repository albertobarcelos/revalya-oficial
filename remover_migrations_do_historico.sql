-- =====================================================
-- Script SQL: Remover Migrations do Histórico
-- Data: 2025-12-21
-- Descrição: Remove migrations de teste do histórico do banco
--            Execute este script no SQL Editor do Supabase
--            Tanto no projeto develop quanto no main
-- =====================================================

BEGIN;

-- Migrations de teste para remover
-- Ajuste a lista conforme necessário
DO $$
DECLARE
  migration_version TEXT;
  versions_to_remove TEXT[] := ARRAY[
    '20251220202812',  -- test_fluxo_develop_main
    '20251220224743'   -- rollback_test_fluxo_develop_main
  ];
  removed_count INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'REMOVENDO MIGRATIONS DO HISTÓRICO';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- Verificar quais migrations existem no histórico
  RAISE NOTICE 'Migrations no histórico antes da remoção:';
  FOR migration_version IN 
    SELECT version::TEXT 
    FROM supabase_migrations.schema_migrations 
    WHERE version::TEXT = ANY(versions_to_remove)
    ORDER BY version
  LOOP
    RAISE NOTICE '  - %', migration_version;
  END LOOP;
  
  RAISE NOTICE '';
  
  -- Remover migrations do histórico
  DELETE FROM supabase_migrations.schema_migrations 
  WHERE version::TEXT = ANY(versions_to_remove);
  
  GET DIAGNOSTICS removed_count = ROW_COUNT;
  
  -- Verificar resultado
  IF removed_count > 0 THEN
    RAISE NOTICE '✅ % migrations removidas do histórico', removed_count;
  ELSE
    RAISE NOTICE 'ℹ️  Nenhuma migration encontrada para remover';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Migrations restantes no histórico:';
  FOR migration_version IN 
    SELECT version::TEXT 
    FROM supabase_migrations.schema_migrations 
    WHERE version::TEXT = ANY(versions_to_remove)
    ORDER BY version
  LOOP
    RAISE NOTICE '  ⚠️  % (ainda existe)', migration_version;
  END LOOP;
  
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- =====================================================
-- INSTRUÇÕES:
-- =====================================================
-- 1. Execute este script no SQL Editor do Supabase
-- 2. Execute PRIMEIRO no projeto develop
-- 3. Depois de fazer merge para main, execute no projeto main também
-- 4. Isso garante que o histórico do banco fique sincronizado com o Git
-- =====================================================

