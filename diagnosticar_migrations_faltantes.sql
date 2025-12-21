-- =====================================================
-- Script SQL: Diagnosticar Migrations Faltantes
-- Data: 21/12/2025
-- Descrição: Identifica exatamente quais migrations estão no banco
--            mas não estão no repositório Git
-- 
-- Execute este script no SQL Editor do Supabase (projeto develop)
-- =====================================================

BEGIN;

-- =====================================================
-- PASSO 1: Listar TODAS as migrations no banco
-- =====================================================
DO $$
DECLARE
  migration_record RECORD;
  total_count INTEGER;
  versions_list TEXT := '';
BEGIN
  SELECT COUNT(*) INTO total_count
  FROM supabase_migrations.schema_migrations;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNÓSTICO DE MIGRATIONS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Total de migrations no banco: %', total_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Lista completa de migrations no banco:';
  RAISE NOTICE '----------------------------------------';
  
  FOR migration_record IN 
    SELECT version, name 
    FROM supabase_migrations.schema_migrations 
    ORDER BY version
  LOOP
    RAISE NOTICE 'Version: % | Name: %', migration_record.version, migration_record.name;
    IF versions_list != '' THEN
      versions_list := versions_list || ', ';
    END IF;
    versions_list := versions_list || quote_literal(migration_record.version);
  END LOOP;
  
  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE '';
  RAISE NOTICE 'Versões (para uso em scripts):';
  RAISE NOTICE '%', versions_list;
  RAISE NOTICE '';
END $$;

-- =====================================================
-- PASSO 2: Comparar com migrations esperadas no Git
-- =====================================================
-- Migrations que DEVEM estar no Git (baseado no repositório local):
-- 
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
-- PASSO 3: SOLUÇÃO - Remover todas as migrations do histórico
-- =====================================================
-- ⚠️ ATENÇÃO: Descomente a linha abaixo para executar a remoção
-- Isso permitirá que a integração nativa reaplique todas as migrations do Git

-- DELETE FROM supabase_migrations.schema_migrations;

-- =====================================================
-- PASSO 4: Verificar resultado (após executar DELETE)
-- =====================================================
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count
  FROM supabase_migrations.schema_migrations;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESULTADO';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migrations restantes: %', remaining_count;
  RAISE NOTICE '';
  
  IF remaining_count = 0 THEN
    RAISE NOTICE '✅ Histórico limpo com sucesso!';
    RAISE NOTICE '';
    RAISE NOTICE 'PRÓXIMOS PASSOS:';
    RAISE NOTICE '1. Faça commit e push de TODAS as migrations para develop';
    RAISE NOTICE '2. A integração nativa do Supabase reaplicará as migrations';
    RAISE NOTICE '3. O merge deve funcionar corretamente';
  ELSE
    RAISE NOTICE '⚠️  Ainda existem migrations no histórico.';
    RAISE NOTICE 'Execute o DELETE acima para removê-las.';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- =====================================================
-- INSTRUÇÕES DE USO:
-- =====================================================
-- 1. Execute este script no SQL Editor do Supabase (projeto develop)
-- 2. Revise a lista de migrations mostrada no PASSO 1
-- 3. Se houver migrations que não estão no Git, descomente a linha DELETE
-- 4. Execute o script novamente para limpar o histórico
-- 5. Faça commit e push de todas as migrations para develop
-- 6. A integração nativa reaplicará as migrations do Git
-- =====================================================

