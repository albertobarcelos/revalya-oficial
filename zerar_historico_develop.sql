-- =====================================================
-- Script SQL: Zerar Histórico de Migrations (DEVELOP)
-- Data: 2025-12-21
-- Descrição: Limpa completamente o histórico de migrations
--            para permitir reaplicação automática pelo Supabase
-- 
-- ⚠️ ATENÇÃO: Execute APENAS no projeto DEVELOP
-- ⚠️ NÃO execute em produção/main sem autorização
-- =====================================================

BEGIN;

-- =====================================================
-- PASSO 1: Fazer Backup (Segurança)
-- =====================================================
DO $$
BEGIN
  -- Criar backup do histórico atual
  DROP TABLE IF EXISTS supabase_migrations.schema_migrations_backup;
  
  CREATE TABLE supabase_migrations.schema_migrations_backup AS
  SELECT * FROM supabase_migrations.schema_migrations;
  
  RAISE NOTICE '✅ Backup criado: schema_migrations_backup';
END $$;

-- =====================================================
-- PASSO 2: Mostrar Estado Atual
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
  RAISE NOTICE 'ESTADO ATUAL DO HISTÓRICO';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total de migrations no histórico: %', total_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Migrations que serão removidas:';
  
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
-- PASSO 3: Limpar Histórico
-- =====================================================
-- AIDEV-NOTE: Remover TODAS as migrations do histórico
-- O Supabase reaplicará automaticamente todas as migrations do Git
DELETE FROM supabase_migrations.schema_migrations;

-- =====================================================
-- PASSO 4: Verificar Resultado
-- =====================================================
DO $$
DECLARE
  remaining_count INTEGER;
  backup_count INTEGER;
BEGIN
  -- Verificar se está limpo
  SELECT COUNT(*) INTO remaining_count
  FROM supabase_migrations.schema_migrations;
  
  -- Verificar backup
  SELECT COUNT(*) INTO backup_count
  FROM supabase_migrations.schema_migrations_backup;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESULTADO';
  RAISE NOTICE '========================================';
  
  IF remaining_count = 0 THEN
    RAISE NOTICE '✅ SUCESSO: Histórico zerado!';
    RAISE NOTICE '';
    RAISE NOTICE 'Backup criado com % migrations', backup_count;
    RAISE NOTICE '';
    RAISE NOTICE 'PRÓXIMOS PASSOS:';
    RAISE NOTICE '1. Faça push das migrations para develop (se necessário)';
    RAISE NOTICE '2. O Supabase detectará automaticamente o histórico vazio';
    RAISE NOTICE '3. Todas as migrations do Git serão reaplicadas automaticamente';
    RAISE NOTICE '4. Aguarde 2-5 minutos para sincronização';
    RAISE NOTICE '5. Verifique o resultado executando:';
    RAISE NOTICE '   SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '⚠️  ATENÇÃO: Ainda existem % migrations no histórico.', remaining_count;
    RAISE NOTICE 'Verifique o que aconteceu.';
    RAISE NOTICE '';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- =====================================================
-- INSTRUÇÕES:
-- =====================================================
-- 1. Execute este script no SQL Editor do Supabase (projeto DEVELOP)
-- 2. O script cria um backup automático antes de limpar
-- 3. Após executar, o Supabase reaplicará todas as migrations do Git
-- 4. Aguarde a sincronização automática (2-5 minutos)
-- 5. Verifique o resultado
-- 
-- ⚠️ IMPORTANTE:
-- - Execute APENAS em develop primeiro
-- - Não execute em main/produção sem testar antes
-- - Certifique-se de que todas as migrations estão no Git
-- =====================================================

