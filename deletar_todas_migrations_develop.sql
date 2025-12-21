-- =====================================================
-- Script SQL: Deletar Todas as Migrations do Histórico (Develop)
-- Data: 21/12/2025
-- Descrição: Remove todas as migrations do histórico para resolver
--            o erro "Remote migration versions not found"
-- 
-- ⚠️ ATENÇÃO: Este script DELETA todas as migrations do histórico.
-- Isso permite que a integração nativa reaplique todas as migrations
-- que estão no Git. Use apenas se tiver certeza de que as migrations
-- locais estão corretas e completas.
-- =====================================================

BEGIN;

-- Verificar quantas migrations existem
DO $$
DECLARE
  migration_count INTEGER;
  migration_record RECORD;
BEGIN
  SELECT COUNT(*) INTO migration_count
  FROM supabase_migrations.schema_migrations;
  
  RAISE NOTICE '=== Migrations encontradas no banco: % ===', migration_count;
  
  IF migration_count > 0 THEN
    RAISE NOTICE 'Listando migrations que serão deletadas:';
    FOR migration_record IN 
      SELECT version, name 
      FROM supabase_migrations.schema_migrations 
      ORDER BY version
    LOOP
      RAISE NOTICE '  - Version: %, Name: %', migration_record.version, migration_record.name;
    END LOOP;
  ELSE
    RAISE NOTICE 'Nenhuma migration encontrada no banco.';
  END IF;
END $$;

-- DELETAR TODAS AS MIGRATIONS DO HISTÓRICO
-- ⚠️ ATENÇÃO: Isso remove todas as migrations do histórico.
-- A integração nativa do Supabase reaplicará todas as migrations que estão no Git.
DELETE FROM supabase_migrations.schema_migrations;

-- Verificar resultado
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count
  FROM supabase_migrations.schema_migrations;
  
  IF remaining_count = 0 THEN
    RAISE NOTICE '✅ Todas as migrations foram removidas do histórico.';
    RAISE NOTICE 'A integração nativa do Supabase reaplicará as migrations do Git.';
  ELSE
    RAISE NOTICE '⚠️  Ainda existem % migrations no histórico.', remaining_count;
  END IF;
END $$;

COMMIT;

-- =====================================================
-- INSTRUÇÕES PÓS-EXECUÇÃO:
-- =====================================================
-- 1. Após executar este script, faça commit e push das migrations para develop
-- 2. A integração nativa do Supabase detectará as migrations no Git
-- 3. As migrations serão aplicadas automaticamente na próxima sincronização
-- =====================================================

