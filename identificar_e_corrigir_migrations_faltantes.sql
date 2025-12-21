-- =====================================================
-- Script SQL: Identificar e Corrigir Migrations Faltantes
-- Data: 21/12/2025
-- Descrição: Identifica migrations no banco que não estão no Git
--            e marca como reverted ou remove do histórico
-- 
-- Execute este script no SQL Editor do Supabase (projeto develop)
-- =====================================================

BEGIN;

-- =====================================================
-- PASSO 1: IDENTIFICAR MIGRATIONS NO BANCO
-- =====================================================
DO $$
DECLARE
  migration_record RECORD;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count
  FROM supabase_migrations.schema_migrations;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATIONS NO BANCO DE DADOS';
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
-- PASSO 2: LISTAR MIGRATIONS QUE DEVEM ESTAR NO GIT
-- =====================================================
-- As migrations abaixo são as que estão no repositório Git
-- Se alguma migration do banco não estiver nesta lista,
-- ela será marcada como reverted ou removida

-- Migrations esperadas no Git (atualizado em 21/12/2025):
-- 20240101000000_initial_schema.sql
-- 20250127_simplify_avatar_system.sql
-- 20251125_120000_add_bank_history_balance_adjust_triggers.sql
-- 20251126_120000_add_payables_triggers_bank_history.sql
-- 20251127_120000_create_bank_operation_history.sql
-- 20251128_120000_create_get_bank_statement_rpc.sql
-- 20251212_120000_allow_public_read_tenant_invites_by_token.sql
-- 20251213_120000_remove_tenant_invites_updated_at_trigger.sql
-- 20251213120001_add_api_key_encryption.sql
-- 20251213120002_update_functions_to_use_vault.sql
-- 20251214_120000_add_focusnfe_integration.sql
-- 20251215161709_update_default_templates_tags.sql
-- 20251220111401_functions_triggers_policies.sql
-- 20251220202811_fix_migration_audit_log_policies.sql
-- 20251220202812_test_fluxo_develop_main.sql
-- 20251221022558_fix_tenant_users_foreign_keys_develop.sql
-- 20251221023114_sync_all_foreign_keys_from_main.sql
-- 20251221024204_create_invites_table.sql
-- 20251221024205_fix_create_reseller_with_invite_permission_check.sql
-- 20251221024436_create_invites_table.sql
-- 20251221025023_sync_profiles_table_and_data_from_main.sql
-- 20251221025309_fix_customers_foreign_keys_develop.sql
-- 20251221025400_remove_migration_audit_log_table.sql

-- =====================================================
-- PASSO 3: OPÇÃO A - REMOVER TODAS AS MIGRATIONS DO HISTÓRICO
-- =====================================================
-- ⚠️ ATENÇÃO: Isso remove TODAS as migrations do histórico.
-- A integração nativa do Supabase reaplicará todas as migrations
-- que estão no Git na próxima sincronização.
-- 
-- DESCOMENTE AS LINHAS ABAIXO SE QUISER USAR ESTA OPÇÃO:

-- DELETE FROM supabase_migrations.schema_migrations;

-- =====================================================
-- PASSO 4: OPÇÃO B - REMOVER APENAS MIGRATIONS ESPECÍFICAS
-- =====================================================
-- Se você souber quais migrations específicas estão causando problema,
-- pode removê-las individualmente. Exemplo:

-- DELETE FROM supabase_migrations.schema_migrations 
-- WHERE version IN ('20251220202812', 'outra_version_aqui');

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count
  FROM supabase_migrations.schema_migrations;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESULTADO';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migrations restantes no histórico: %', remaining_count;
  
  IF remaining_count = 0 THEN
    RAISE NOTICE '✅ Todas as migrations foram removidas.';
    RAISE NOTICE 'A integração nativa reaplicará as migrations do Git.';
  ELSE
    RAISE NOTICE '⚠️  Ainda existem migrations no histórico.';
    RAISE NOTICE 'Se o erro persistir, remova as migrations restantes.';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- =====================================================
-- INSTRUÇÕES:
-- =====================================================
-- 1. Execute este script no SQL Editor do Supabase (projeto develop)
-- 2. Revise a lista de migrations no banco (PASSO 1)
-- 3. Escolha uma opção:
--    - OPÇÃO A: Descomente a linha DELETE para remover todas
--    - OPÇÃO B: Remova migrations específicas manualmente
-- 4. Execute novamente o script
-- 5. Faça commit e push das migrations para develop
-- 6. A integração nativa reaplicará as migrations do Git
-- =====================================================

