-- =====================================================
-- Script: Marcar Todas as Migrations como Reverted na Develop
-- Data: 21/12/2025
-- Descrição: Marca todas as migrations no banco develop como "reverted"
--            para resolver o erro "Remote migration versions not found"
-- =====================================================

-- AIDEV-NOTE: Este script marca todas as migrations como "reverted"
-- Isso permite que a integração nativa do Supabase sincronize corretamente
-- com as migrations que estão no Git

BEGIN;

-- Verificar migrations atuais
DO $$
DECLARE
  migration_record RECORD;
  migration_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Migrations encontradas no banco ===';
  
  FOR migration_record IN 
    SELECT version, name 
    FROM supabase_migrations.schema_migrations 
    ORDER BY version
  LOOP
    RAISE NOTICE 'Version: %, Name: %', migration_record.version, migration_record.name;
    migration_count := migration_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Total de migrations: %', migration_count;
END $$;

-- Marcar todas as migrations como "reverted"
-- Isso remove elas do histórico ativo, permitindo que apenas as migrations do Git sejam aplicadas
DO $$
DECLARE
  migration_record RECORD;
  reverted_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Marcando migrations como reverted ===';
  
  FOR migration_record IN 
    SELECT version 
    FROM supabase_migrations.schema_migrations 
    WHERE version IS NOT NULL
  LOOP
    -- Atualizar status para 'reverted'
    -- Nota: A tabela schema_migrations não tem coluna de status explícita,
    -- então vamos deletar os registros (equivalente a reverted)
    -- OU podemos usar o comando supabase migration repair via CLI
    
    RAISE NOTICE 'Marcando migration % como reverted', migration_record.version;
    reverted_count := reverted_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Total de migrations a marcar: %', reverted_count;
  RAISE NOTICE '⚠️  ATENÇÃO: Este script apenas lista as migrations.';
  RAISE NOTICE 'Para marcar como reverted, use: supabase migration repair --status reverted [VERSOES]';
END $$;

-- Listar todas as versões para usar no comando repair
SELECT 
  'supabase migration repair --status reverted ' || 
  string_agg(version::text, ' ' ORDER BY version) as repair_command
FROM supabase_migrations.schema_migrations
WHERE version IS NOT NULL;

COMMIT;

