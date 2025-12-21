-- =====================================================
-- Script SQL: Limpar Histórico de Migrations
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
  RAISE NOTICE 'MIGRATIONS NO HISTÓRICO: %', total_count;
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
    RAISE NOTICE 'Nenhuma migration encontrada.';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

-- AIDEV-NOTE: Remover todas as migrations do histórico
-- Isso permite que a integração nativa reaplique todas as migrations do Git
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
    RAISE NOTICE '✅ SUCESSO: Histórico limpo!';
    RAISE NOTICE '';
    RAISE NOTICE 'PRÓXIMOS PASSOS:';
    RAISE NOTICE '1. Faça commit e push das migrations para develop';
    RAISE NOTICE '2. O Supabase reaplicará automaticamente as migrations do Git';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Ainda existem % migrations no histórico.', remaining_count;
    RAISE NOTICE '';
  END IF;
END $$;

COMMIT;

