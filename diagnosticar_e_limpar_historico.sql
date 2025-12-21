-- =====================================================
-- Script SQL: Diagnosticar e Limpar Histórico de Migrations
-- Execute este script no SQL Editor do Supabase (projeto develop)
-- =====================================================

BEGIN;

-- =====================================================
-- PASSO 1: DIAGNOSTICAR - Ver todas as migrations no histórico
-- =====================================================
DO $$
DECLARE
  migration_record RECORD;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count
  FROM supabase_migrations.schema_migrations;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNÓSTICO: Migrations no Histórico';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total: % migrations', total_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Lista completa:';
  
  FOR migration_record IN 
    SELECT version, name 
    FROM supabase_migrations.schema_migrations 
    ORDER BY version
  LOOP
    RAISE NOTICE '  - % : %', migration_record.version, migration_record.name;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- PASSO 2: REMOVER - Migrations que foram removidas do Git
-- =====================================================
-- Migrations de teste que foram removidas do Git
DELETE FROM supabase_migrations.schema_migrations 
WHERE version IN (
  '20251220202812',  -- test_fluxo_develop_main
  '20251220224743'   -- rollback_test_fluxo_develop_main
);

-- =====================================================
-- PASSO 3: VERIFICAR RESULTADO
-- =====================================================
DO $$
DECLARE
  removed_count INTEGER;
  remaining_count INTEGER;
BEGIN
  -- Contar quantas foram removidas
  GET DIAGNOSTICS removed_count = ROW_COUNT;
  
  -- Verificar se ainda existem
  SELECT COUNT(*) INTO remaining_count
  FROM supabase_migrations.schema_migrations 
  WHERE version IN ('20251220202812', '20251220224743');
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESULTADO DA LIMPEZA';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migrations removidas: %', removed_count;
  
  IF remaining_count = 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ SUCESSO: Histórico limpo!';
    RAISE NOTICE '';
    RAISE NOTICE 'O erro "Remote migration versions not found" deve ser resolvido.';
    RAISE NOTICE 'Faça um novo push ou aguarde a próxima sincronização do Supabase.';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Ainda existem % migrations no histórico.', remaining_count;
    RAISE NOTICE 'Verifique manualmente.';
    RAISE NOTICE '';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- =====================================================
-- INSTRUÇÕES:
-- =====================================================
-- 1. Execute este script no SQL Editor do Supabase (projeto develop)
-- 2. Revise a lista de migrations mostrada no PASSO 1
-- 3. O script remove automaticamente as migrations de teste
-- 4. Após executar, o Supabase deve sincronizar corretamente
-- 5. Se ainda houver erro, pode haver outras migrations no banco
--    que não estão no Git - verifique a lista do PASSO 1
-- =====================================================

