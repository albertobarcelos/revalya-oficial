-- =====================================================
-- Script: Remover Policies migration_audit_log
-- Data: 2025-12-21
-- Descrição: Remove policies da tabela migration_audit_log
--            para permitir que a migration seja reaplicada
--            Execute este script no SQL Editor do Supabase (projeto develop)
-- =====================================================

BEGIN;

-- AIDEV-NOTE: Remover todas as policies relacionadas à migration_audit_log
-- Isso permite que a migration 20251220202812 seja reaplicada sem erro
DO $$
BEGIN
  -- Remover todas as policies relacionadas
  DROP POLICY IF EXISTS "migration_audit_log_select_policy" ON public.migration_audit_log;
  DROP POLICY IF EXISTS "migration_audit_log_insert_policy" ON public.migration_audit_log;
  DROP POLICY IF EXISTS "migration_audit_log_update_policy" ON public.migration_audit_log;
  DROP POLICY IF EXISTS "migration_audit_log_delete_policy" ON public.migration_audit_log;
  
  RAISE NOTICE '✅ Policies da tabela migration_audit_log removidas com sucesso';
END $$;

-- AIDEV-NOTE: Remover a migration problemática do histórico
-- Isso permite que ela seja reaplicada após correção no GitHub
DELETE FROM supabase_migrations.schema_migrations 
WHERE version = '20251220202812';

-- Verificar se foi removida
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations 
    WHERE version = '20251220202812'
  ) THEN
    RAISE NOTICE '✅ Migration 20251220202812 removida do histórico';
  ELSE
    RAISE NOTICE '⚠️  Migration 20251220202812 ainda está no histórico';
  END IF;
END $$;

COMMIT;

-- =====================================================
-- INSTRUÇÕES:
-- 1. Execute este script no SQL Editor do Supabase (projeto develop)
-- 2. Corrija a migration 20251220202812_test_fluxo_develop_main.sql no GitHub
--    (use o padrão idempotente conforme documentado em SOLUCAO_ERRO_POLICY_MIGRATION_AUDIT_LOG.md)
-- 3. Faça novo merge da branch para develop
-- =====================================================

