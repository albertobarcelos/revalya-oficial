-- =====================================================
-- Migration: Rollback Teste de Fluxo Develop → Main
-- Data: 2025-12-20
-- Descrição: Remove tudo que foi criado pela migration de teste
--            20251220202812_test_fluxo_develop_main.sql
-- =====================================================

BEGIN;

-- Remover RLS Policies
DROP POLICY IF EXISTS "migration_audit_log_select_policy" ON public.migration_audit_log;
DROP POLICY IF EXISTS "migration_audit_log_insert_policy" ON public.migration_audit_log;

-- Remover índices
DROP INDEX IF EXISTS public.idx_migration_audit_log_version;
DROP INDEX IF EXISTS public.idx_migration_audit_log_environment;

-- Remover tabela
DROP TABLE IF EXISTS public.migration_audit_log;

-- Remover migration do histórico (se existir)
DELETE FROM supabase_migrations.schema_migrations 
WHERE version = '20251220202812';

COMMIT;

