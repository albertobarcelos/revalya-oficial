-- =====================================================
-- Script SQL: Limpar Histórico de Migrations (Develop)
-- Data: 21/12/2025
-- Descrição: Remove todas as migrations do histórico para resolver
--            o erro "Remote migration versions not found"
-- 
-- ⚠️ ATENÇÃO: Este script DELETA todas as migrations do histórico.
-- Isso permite que a integração nativa do Supabase reaplique todas
-- as migrations que estão no Git.
-- 
-- Execute este script no SQL Editor do Supabase (projeto develop)
-- =====================================================

BEGIN;

-- Mostrar migrations que serão removidas
DO $$
DECLARE
  migration_record RECORD;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count
  FROM supabase_migrations.schema_migrations;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATIONS QUE SERÃO REMOVIDAS: %', total_count;
  RAISE NOTICE '========================================';
  
  IF total_count > 0 THEN
    FOR migration_record IN 
      SELECT version, name 
      FROM supabase_migrations.schema_migrations 
      ORDER BY version
    LOOP
      RAISE NOTICE '  - % : %', migration_record.version, migration_record.name;
    END LOOP;
  ELSE
    RAISE NOTICE 'Nenhuma migration encontrada no histórico.';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

-- AIDEV-NOTE: Remover todas as migrations do histórico
-- A integração nativa do Supabase reaplicará todas as migrations do Git
DELETE FROM supabase_migrations.schema_migrations;

-- Verificar resultado
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count
  FROM supabase_migrations.schema_migrations;
  
  IF remaining_count = 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ SUCESSO: Todas as migrations foram removidas do histórico.';
    RAISE NOTICE '';
    RAISE NOTICE 'PRÓXIMOS PASSOS:';
    RAISE NOTICE '1. Faça commit e push das migrations para a branch develop';
    RAISE NOTICE '2. A integração nativa do Supabase detectará as migrations no Git';
    RAISE NOTICE '3. As migrations serão aplicadas automaticamente na próxima sincronização';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  ATENÇÃO: Ainda existem % migrations no histórico.', remaining_count;
    RAISE NOTICE 'Verifique se há algum problema com a exclusão.';
    RAISE NOTICE '';
  END IF;
END $$;

COMMIT;

-- =====================================================
-- OBSERVAÇÕES IMPORTANTES:
-- =====================================================
-- 1. Este script remove TODAS as migrations do histórico
-- 2. Isso NÃO afeta os dados ou estrutura do banco
-- 3. Apenas remove o registro de que as migrations foram aplicadas
-- 4. A integração nativa do Supabase reaplicará as migrations do Git
-- 5. Certifique-se de que todas as migrations estão no Git antes de executar
-- =====================================================

